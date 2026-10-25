import {after,test} from "node:test";
import assert from "node:assert/strict";
import {createAssistantService,type AssistantDependencies} from "../src/server/assistant";
import {RestaurantCardSchema,MealOfferSchema,type ProviderState} from "../src/lib/assistant-contracts";
import {opaqueId} from "../src/server/crypto";
import {database,write} from "../src/server/store";
process.env.DATA_DIR="memory://";
const providers:ProviderState[]=[{id:"swiggy_food",name:"Swiggy Food",status:"connected",message:"Test fixture"}];
const card=RestaurantCardSchema.parse({id:"opaque-one",provider:"swiggy_food",name:"Fixture Kitchen",isOpen:true});
const offer=(id:string,name:string,available=true)=>MealOfferSchema.parse({id,itemId:"biryani",provider:"swiggy_food",providerItemId:`native-${id}`,name,restaurant:card.name,unit:"serving",priceMinor:15000,available,selectable:available,maxQuantity:5});
async function fixture(override:Partial<AssistantDependencies>={}){
  const owner=opaqueId("restaurant-test");await write(owner,"owner",owner,{csrfToken:"test",sessionId:null});
  const calls={list:0,menu:0,prepare:0,search:0,pages:[] as number[]};
  const deps:AssistantDependencies={providers:async()=>providers,
    search:async()=>{calls.search++;return {offers:[],notices:[]};},
    restaurants:async(_owner,_task,item,_signal,previous)=>{calls.list++;return {restaurants:[previous?{...card,id:"opaque-two",name:"Other Kitchen"}:card],context:{itemId:item.id,query:item.query,addressId:"verified-food-home",restaurantIds:Object.fromEntries([previous?["opaque-two","native-two"]:["opaque-one","native-one"]]),nextOffset:previous?null:10,seenOffsets:[0],nextMenuPage:null,seenMenuPages:[]},notices:[]};},
    menu:async(_owner,context,restaurant,_signal,page=1)=>{calls.menu++;calls.pages.push(page);assert.ok(context.restaurantIds[restaurant.id]);return {menu:{restaurantId:restaurant.id,restaurant,sections:[{id:`section-${page}`,title:page===1?"Biryani":"Sides",items:page===1?[offer("dish-one","Veg biryani"),offer("dish-two","Chicken biryani"),offer("sold-out","Unavailable dish",false)]:[offer("side-one","Raita")],hasMoreItems:false,totalItems:null}],hasMore:page===1,notices:[]},nextPage:page===1?2:null};},
    prepare:async()=>{calls.prepare++;throw new Error("Never purchase in discovery tests");},...override};
  const service=createAssistantService(deps),initial=await service.get(owner);
  const view=await service.browse(owner,{query:"Biryani",route:"restaurant",expectedVersion:initial.version});
  return {owner,service,view,calls};
}
test("food category lists restaurants and fetches only a clicked menu; reload retains private trusted context",async()=>{
  const f=await fixture();assert.equal(f.calls.list,1);assert.equal(f.calls.search,0);assert.equal(f.calls.menu,0);assert.equal(f.view.offers.length,0);
  assert.equal(f.view.restaurantBrowser?.restaurants[0].id,card.id);assert.equal(f.view.restaurantBrowser?.menu,null);
  assert.equal("restaurantContext" in f.view,false);
  const view=await f.service.openRestaurant(f.owner,{restaurantId:card.id,expectedVersion:f.view.version});
  assert.equal(f.calls.menu,1);assert.equal(view.restaurantBrowser?.menu?.sections[0].items.length,3);
  const saved=await f.service.get(f.owner);assert.deepEqual(saved.restaurantBrowser,view.restaurantBrowser);
  assert.equal(f.calls.prepare,0);
});
test("menu selection saves multiple separate dishes, sets absolute quantities and removes local choices without losing menu",async()=>{
  const f=await fixture();let view=await f.service.openRestaurant(f.owner,{restaurantId:card.id,expectedVersion:f.view.version});
  view=await f.service.selectMenuOffer(f.owner,{offerId:"dish-one",quantity:2,expectedVersion:view.version});
  assert.equal(view.task.items.length,1);assert.equal(view.task.items[0].label,"Veg biryani");
  view=await f.service.selectMenuOffer(f.owner,{offerId:"dish-two",quantity:1,expectedVersion:view.version});assert.equal(view.task.items.length,2);
  view=await f.service.selectMenuOffer(f.owner,{offerId:"dish-one",quantity:3,expectedVersion:view.version});assert.equal(view.task.items.length,2);assert.equal(view.task.items[0].quantity,3);
  view=await f.service.selectMenuOffer(f.owner,{offerId:"dish-one",quantity:0,expectedVersion:view.version});assert.equal(view.task.items[0].selectedOfferId,null);assert.ok(view.restaurantBrowser?.menu);
  view=await f.service.selectMenuOffer(f.owner,{offerId:"dish-two",quantity:0,expectedVersion:view.version});assert.equal(view.task.items.length,1);assert.ok(view.restaurantBrowser?.menu);
  assert.equal(f.calls.prepare,0);
});
test("forged restaurant/menu IDs, stale versions, unavailable stock and excessive quantities never become selections",async()=>{
  const f=await fixture();await assert.rejects(f.service.openRestaurant(f.owner,{restaurantId:"native-one",expectedVersion:f.view.version}),{code:"RESTAURANT_UNAVAILABLE"});assert.equal(f.calls.menu,0);
  let view=await f.service.get(f.owner);view=await f.service.openRestaurant(f.owner,{restaurantId:card.id,expectedVersion:view.version});
  for(const [offerId,quantity,code] of [["invented",1,"OFFER_UNAVAILABLE"],["sold-out",1,"OFFER_UNAVAILABLE"],["dish-one",6,"QUANTITY_LIMIT"]] as const){await assert.rejects(f.service.selectMenuOffer(f.owner,{offerId,quantity,expectedVersion:view.version}),{code});view=await f.service.get(f.owner);}
  await assert.rejects(f.service.selectMenuOffer(f.owner,{offerId:"dish-one",quantity:1,expectedVersion:0}),{code:"PLAN_CHANGED"});assert.equal(view.task.items[0].selectedOfferId,null);assert.equal(f.calls.prepare,0);
});
test("restaurant and menu pagination use saved cursors, then back preserves selected dishes",async()=>{
  const f=await fixture();let view=await f.service.moreRestaurants(f.owner,f.view.version);assert.equal(view.restaurantBrowser?.restaurants.length,2);assert.equal(view.restaurantBrowser?.hasMore,false);
  view=await f.service.openRestaurant(f.owner,{restaurantId:card.id,expectedVersion:view.version});
  view=await f.service.moreMenu(f.owner,view.version);assert.deepEqual(f.calls.pages,[1,2]);assert.equal(view.restaurantBrowser?.menu?.sections.length,2);assert.equal(view.restaurantBrowser?.menu?.hasMore,false);
  view=await f.service.selectMenuOffer(f.owner,{offerId:"side-one",quantity:1,expectedVersion:view.version});
  view=await f.service.backRestaurants(f.owner,view.version);assert.equal(view.restaurantBrowser?.menu,null);assert.equal(view.restaurantBrowser?.restaurants.length,2);assert.equal(view.task.items[0].label,"Raita");assert.equal(f.calls.prepare,0);
});
test("menu result identity mismatch is rejected and one owner cannot read another menu",async()=>{
  const f=await fixture({menu:async()=>({menu:{restaurantId:"wrong",restaurant:card,sections:[],hasMore:false,notices:[]},nextPage:null})});
  await assert.rejects(f.service.openRestaurant(f.owner,{restaurantId:card.id,expectedVersion:f.view.version}),{code:"MENU_CHANGED"});
  const other=opaqueId("other");await write(other,"owner",other,{csrfToken:"test"});const fresh=await f.service.get(other);
  await assert.rejects(f.service.openRestaurant(other,{restaurantId:card.id,expectedVersion:fresh.version}),{code:"SEARCH_CHANGED"});assert.equal((await f.service.get(f.owner)).restaurantBrowser?.menu,null);
});
test("a saved closed menu is readable but no dish can be selected",async()=>{
  const closed={...card,isOpen:false};const f=await fixture({menu:async()=>({menu:{restaurantId:card.id,restaurant:closed,sections:[{id:"s",title:"Menu",items:[offer("dish-one","Biryani")],hasMoreItems:false,totalItems:null}],hasMore:false,notices:[]},nextPage:null})});
  const view=await f.service.openRestaurant(f.owner,{restaurantId:card.id,expectedVersion:f.view.version});assert.equal(view.restaurantBrowser?.menu?.restaurant.isOpen,false);
  await assert.rejects(f.service.selectMenuOffer(f.owner,{offerId:"dish-one",quantity:1,expectedVersion:view.version}),{code:"OFFER_UNAVAILABLE"});
});

after(async()=>{await (await database()).close();});
