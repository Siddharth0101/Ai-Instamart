import test from "node:test";
import assert from "node:assert/strict";
import { FoodGateway, foodOfferIdentity, resolveFoodAddress } from "../src/server/integrations/food";
import { SwiggyGateway, SwiggyGatewayError, type OAuthState, type SwiggyOAuthStorage } from "../src/server/integrations/swiggy";
import { SwiggyAddressesSchema } from "../src/server/integrations/swiggy-schemas";

const addressData={
  addresses:[{id:"food-home",addressLine:"Synthetic Food address",phoneNumber:"0000000000",addressTag:"Home"}],
  pagination:{page:1,pageSize:10,total:1,totalPages:1,hasMore:false},
  resolution:{defaultAddressId:"food-home",resolutionSource:"ranked_saved_address",needsUserClarification:false,candidateAddressIds:["food-home"]},
};
const item={name:"Fixture biryani",price:249,isVeg:true,menu_item_id:"menu-1",inStock:1,restaurant_id:"restaurant-1",restaurant_name:"Fixture restaurant",imageUrl:"https://images.example.test/biryani.jpg"};
const searchData={items:[item],query:"biryani",totalItems:1,hasMore:false};
const restaurantsData={restaurants:[{id:"restaurant-1",name:"Fixture restaurant",cuisines:["Biryani","North Indian"],avgRating:4.3,costForTwo:"₹500 for two",areaName:"Synthetic area",distanceKm:2.5,deliveryTimeMinutes:35,availabilityStatus:"OPEN",imageUrl:"https://media-assets.swiggy.com/swiggy/image/upload/fixture.jpg"}],dishes:[],query:"biryani",hasMore:false,totalRestaurants:1};
const menuData={restaurant:{id:"restaurant-1",name:"Fixture restaurant",isOpen:true,deliveryTime:35},categories:[],totalCategories:0,page:1,pageSize:1,hasMore:false};
type RecordedCall={name:string;arguments:Record<string,unknown>};
function storage(initial:OAuthState|null={version:1,ownerId:"owner-food",tokens:{access_token:"fixture-food-token",token_type:"Bearer"},tokensExpiresAt:Date.now()+3600000}):SwiggyOAuthStorage{
  let state=initial;
  return {read:async()=>state?structuredClone(state):null,write:async value=>{state=value?structuredClone(value):null;},update:async change=>{state=change(state?structuredClone(state):null);}};
}
const tools=[
  {name:"get_addresses",inputSchema:{type:"object" as const,properties:{page:{type:"integer"}},additionalProperties:false}},
  {name:"search_menu",inputSchema:{type:"object" as const,properties:{query:{type:"string"},addressId:{type:"string"},vegFilter:{type:"integer"},offset:{type:"integer"}},required:["query","addressId"],additionalProperties:false}},
  {name:"search_restaurants",inputSchema:{type:"object" as const,properties:{query:{type:"string"},addressId:{type:"string"},offset:{type:"integer"}},required:["query","addressId"],additionalProperties:false}},
  {name:"get_restaurant_menu",inputSchema:{type:"object" as const,properties:{restaurantId:{type:"string"},addressId:{type:"string"},page:{type:"integer"},pageSize:{type:"integer"}},required:["restaurantId","addressId"],additionalProperties:false}},
  {name:"place_food_order",inputSchema:{type:"object" as const,properties:{}}},
];
function fixture(options:{responses?:Record<string,unknown>;publishedTools?:unknown[];onCall?:(call:RecordedCall)=>unknown}={}){
  const calls:RecordedCall[]=[];
  const network=(async(input,init)=>{
    assert.equal(new URL(String(input)).pathname,"/food","Food uses only its official endpoint");
    if(init?.method==="GET")return new Response(null,{status:405});
    if(init?.method==="DELETE")return new Response(null,{status:200});
    assert.equal(new Headers(init?.headers).get("authorization"),"Bearer fixture-food-token");
    const request=JSON.parse(String(init?.body));
    if(request.method==="notifications/initialized")return new Response(null,{status:202});
    let result:unknown;
    if(request.method==="initialize")result={protocolVersion:"2025-11-25",capabilities:{tools:{}},serverInfo:{name:"fixture-food",version:"1"}};
    else if(request.method==="tools/list")result={tools:options.publishedTools??tools};
    else if(request.method==="tools/call"){
      const call=request.params as RecordedCall;calls.push(call);
      const responses={get_addresses:addressData,search_menu:searchData,search_restaurants:restaurantsData,get_restaurant_menu:menuData,...options.responses};
      const data=options.onCall?options.onCall(call):responses[call.name as keyof typeof responses];
      assert.notEqual(data,undefined,`Unexpected tool ${call.name}`);
      result={structuredContent:{success:true,data},content:[]};
    }else throw new Error(`Unexpected method ${request.method}`);
    return new Response(JSON.stringify({jsonrpc:"2.0",id:request.id,result}),{headers:{"content-type":"application/json"}});
  }) as typeof fetch;
  return {calls,network};
}
const common={ownerId:"owner-food",callbackUrl:"http://localhost:3000/api/integrations/swiggy-food/callback"};

test("Food address resolution does not treat a ranked multi-address default as consent",()=>{
  const single=SwiggyAddressesSchema.parse(addressData);
  assert.equal(resolveFoodAddress(single),"food-home");
  const multiple={...single,pagination:{...single.pagination,total:2},addresses:[...single.addresses,{id:"food-work",addressLine:"Synthetic work",phoneNumber:"0000000000"}]};
  assert.equal(resolveFoodAddress(multiple),null);
  assert.equal(resolveFoodAddress(multiple,"food-work"),"food-work");
  assert.equal(resolveFoodAddress(multiple,"instamart-address"),null);
  assert.equal(resolveFoodAddress({...multiple,resolution:{...multiple.resolution,resolutionSource:"user_selected_address"}}),"food-home");
});

test("Food discovery uses returned address, restaurant and dish IDs and makes no writes",async()=>{
  const {calls,network}=fixture();
  const gateway=new FoodGateway({...common,storage:storage(),fetch:network});
  try{
    const result=await gateway.searchMeals({query:" biryani ",itemId:"plan-biryani",vegetarianOnly:true});
    assert.equal(result.status,"ready");assert.equal(result.offers.length,1);
    const offer=result.offers[0];
    assert.equal(offer.itemId,"plan-biryani");assert.equal(offer.name,"Fixture biryani");
    assert.equal(offer.provider,"swiggy_food");assert.equal(offer.restaurant,"Fixture restaurant");
    assert.equal(offer.priceMinor,null,"unspecified provider money units are never guessed");
    assert.equal(offer.available,true);assert.equal(offer.etaMinutes,35);
    assert.deepEqual(JSON.parse(Buffer.from(offer.providerItemId,"base64url").toString()),["restaurant-1","menu-1"]);
    assert.deepEqual(calls.map(call=>call.name),["get_addresses","search_menu","get_restaurant_menu"]);
    assert.deepEqual(calls[1].arguments,{query:"biryani",addressId:"food-home",vegFilter:1});
    assert.deepEqual(calls[2].arguments,{restaurantId:"restaurant-1",addressId:"food-home",pageSize:1});
    assert.ok(!result.notices.some(notice=>notice.includes("not connected")),"checkout is available, so discovery no longer says otherwise");
    assert.equal("phoneNumber" in result.addresses[0],false);
    assert.equal("checkout" in gateway,false);assert.equal("callTool" in gateway,false);
  }finally{await gateway.close();}
});

test("Food result identities include restaurant and menu IDs and never synthesize missing identifiers",()=>{
  assert.notEqual(foodOfferIdentity(item)!.id,foodOfferIdentity({...item,restaurant_id:"restaurant-2"})!.id);
  assert.equal(foodOfferIdentity({...item,menu_item_id:undefined}),null);
  assert.equal(foodOfferIdentity({...item,restaurant_id:undefined}),null);
});

test("Food search follows only advancing provider offsets and never invents pagination",async()=>{
  const {calls,network}=fixture({onCall:call=>{
    if(call.name==="get_addresses")return addressData;
    if(call.name==="get_restaurant_menu")return menuData;
    return {...searchData,items:[{...item,menu_item_id:call.arguments.offset===10?"menu-2":"menu-1"}],hasMore:true,nextOffset:10};
  }});
  const gateway=new FoodGateway({...common,storage:storage(),fetch:network});
  try{
    const first=await gateway.searchMeals({query:"biryani",itemId:"meal",limit:30});
    assert.equal(first.hasMore,true);assert.equal(first.nextOffset,10);
    const second=await gateway.searchMeals({query:"biryani",itemId:"meal",limit:30,offset:first.nextOffset!});
    assert.notEqual(first.offers[0].id,second.offers[0].id);
    assert.equal(second.hasMore,false);assert.equal(second.nextOffset,null,"repeated provider cursor stops here");
    assert.ok(second.notices.some(notice=>/next page/i.test(notice)));
    assert.deepEqual(calls.filter(call=>call.name==="search_menu").map(call=>call.arguments.offset),[undefined,10]);
    assert.ok(calls.every(call=>["get_addresses","search_menu","get_restaurant_menu"].includes(call.name)));
    await assert.rejects(gateway.searchMeals({query:"biryani",itemId:"meal",offset:-1}));
  }finally{await gateway.close();}
});

test("a shared dish remains independently selectable for separate task items",async()=>{
  const {network}=fixture();
  const gateway=new FoodGateway({...common,storage:storage(),fetch:network});
  try{
    const first=await gateway.searchMeals({query:"biryani",itemId:"adults-meal"});
    const second=await gateway.searchMeals({query:"biryani",itemId:"children-meal"});
    assert.notEqual(first.offers[0].id,second.offers[0].id);
    assert.equal(first.offers[0].providerItemId,second.offers[0].providerItemId);
  }finally{await gateway.close();}
});

test("an already-cancelled Food task makes no provider requests",async()=>{
  const controller=new AbortController();controller.abort();let requests=0;
  const gateway=new FoodGateway({...common,storage:storage(),fetch:async()=>{requests++;throw new Error("Unexpected network");}});
  await assert.rejects(gateway.searchMeals({query:"biryani",itemId:"meal",signal:controller.signal}));
  assert.equal(requests,0);
});

test("multiple addresses require a Food address choice before searching",async()=>{
  const {calls,network}=fixture({responses:{get_addresses:{...addressData,addresses:[...addressData.addresses,{id:"food-work",addressLine:"Synthetic work",phoneNumber:"0000000000"}],pagination:{...addressData.pagination,total:2}}}});
  const gateway=new FoodGateway({...common,storage:storage(),fetch:network});
  try{
    const result=await gateway.searchMeals({query:"biryani",itemId:"meal"});
    assert.equal(result.status,"needs_address");assert.equal(result.offers.length,0);
    assert.deepEqual(calls.map(call=>call.name),["get_addresses"]);
    const invalid=await gateway.searchMeals({query:"biryani",itemId:"meal",addressId:"instamart-address"});
    assert.equal(invalid.status,"needs_address");assert.deepEqual(calls.map(call=>call.name),["get_addresses","get_addresses"]);
  }finally{await gateway.close();}
});

test("Food saved-address pagination validates an explicitly selected later-page address",async()=>{
  const {calls,network}=fixture({onCall:call=>{
    if(call.name==="get_addresses")return call.arguments.page===2?{...addressData,addresses:[{id:"food-work",addressLine:"Synthetic work",phoneNumber:"0000000000"}],pagination:{...addressData.pagination,page:2,total:2,totalPages:2}}:{...addressData,pagination:{...addressData.pagination,total:2,totalPages:2,hasMore:true}};
    if(call.name==="search_menu")return searchData;
    return menuData;
  }});
  const gateway=new FoodGateway({...common,storage:storage(),fetch:network,priceUnit:"rupees"});
  try{
    const result=await gateway.searchMeals({query:"biryani",itemId:"meal",addressId:"food-work"});
    assert.equal(result.addressId,"food-work");assert.equal(result.offers[0].priceMinor,24900);
    assert.deepEqual(calls[1],{name:"get_addresses",arguments:{page:2}});
    assert.equal(calls[2].arguments.addressId,"food-work");
  }finally{await gateway.close();}
});

test("Food discovery omits absent IDs, unknown stock, unknown dietary status and closed restaurants",async()=>{
  const items=[{...item,menu_item_id:undefined},{...item,inStock:undefined},{...item,isVeg:undefined},item];
  const {calls,network}=fixture({responses:{search_menu:{...searchData,items,totalItems:4},get_restaurant_menu:{...menuData,restaurant:{...menuData.restaurant,isOpen:false}}}});
  const gateway=new FoodGateway({...common,storage:storage(),fetch:network});
  try{
    const result=await gateway.searchMeals({query:"biryani",itemId:"meal",vegetarianOnly:true});
    assert.equal(result.offers.length,0);assert.ok(result.notices.some(notice=>notice.includes("Closed")));
    assert.equal(calls.filter(call=>call.name==="get_restaurant_menu").length,1);
  }finally{await gateway.close();}
});

test("Food malformed provider output fails closed rather than using a mock catalog",async()=>{
  const {network}=fixture({responses:{search_menu:{...searchData,items:[{...item,price:"₹249"}]}}});
  const gateway=new FoodGateway({...common,storage:storage(),fetch:network});
  try{await assert.rejects(gateway.searchMeals({query:"biryani",itemId:"meal"}),error=>error instanceof SwiggyGatewayError&&error.code==="SWIGGY_SCHEMA_MISMATCH");}
  finally{await gateway.close();}
});

test("Food discovered input schema drift blocks incompatible tool calls",async()=>{
  const {calls,network}=fixture({publishedTools:tools.map(tool=>tool.name==="search_menu"?{...tool,inputSchema:{...tool.inputSchema,required:["query","addressId","unknownNewRequiredField"]}}:tool)});
  const gateway=new FoodGateway({...common,storage:storage(),fetch:network});
  try{
    await assert.rejects(gateway.searchMeals({query:"biryani",itemId:"meal"}),error=>error instanceof SwiggyGatewayError&&error.code==="SWIGGY_INPUT_SCHEMA_MISMATCH");
    assert.deepEqual(calls.map(call=>call.name),["get_addresses"]);
  }finally{await gateway.close();}
});

test("Food missing account access, unsupported capabilities and invalid inputs never invent offers",async()=>{
  let requests=0;
  const disconnected=new FoodGateway({...common,storage:storage(null),fetch:async()=>{requests++;throw new Error("No network expected");}});
  assert.equal((await disconnected.readiness()).connected,false);
  await assert.rejects(disconnected.searchMeals({query:"biryani",itemId:"meal"}),error=>error instanceof SwiggyGatewayError&&error.code==="SWIGGY_NOT_CONNECTED");
  await assert.rejects(disconnected.searchMeals({query:" ",itemId:"meal"}));
  assert.equal(requests,0);
  const {calls,network}=fixture({publishedTools:tools.filter(tool=>tool.name!=="search_menu")});
  const connected=new FoodGateway({...common,storage:storage(),fetch:network});
  try{
    await assert.rejects(connected.searchMeals({query:"biryani",itemId:"meal"}),error=>error instanceof SwiggyGatewayError&&error.code==="SWIGGY_CAPABILITY_UNAVAILABLE");
    assert.deepEqual(calls.map(call=>call.name),["get_addresses"]);
  }finally{await connected.close();}
});

test("Food gateway cannot invoke Instamart reads or writes, even with valid-looking cart input",async()=>{
  let requests=0;
  const gateway=new SwiggyGateway({...common,service:"food",storage:storage(),fetch:async()=>{requests++;throw new Error("No network expected");}});
  await assert.rejects(gateway.getCart(),/not available/);
  await assert.rejects(gateway.setCartQuantity({addressId:"food-home",skuId:"sku",spinId:"spin",quantity:1,expectedFingerprint:"0".repeat(64)}),/not available/);
  await assert.rejects(gateway.checkout(),/not available/);
  assert.equal(requests,0);
  assert.throws(()=>new FoodGateway({...common,storage:storage(),baseUrl:"https://mcp.swiggy.com/im"}),/official Swiggy Food/);
});

test("Food does not accept a restaurant menu whose returned identity differs from the requested ID",async()=>{
  const {network}=fixture({responses:{get_restaurant_menu:{...menuData,restaurant:{...menuData.restaurant,id:"unexpected-restaurant"}}}});
  const gateway=new FoodGateway({...common,storage:storage(),fetch:network});
  try{await assert.rejects(gateway.searchMeals({query:"biryani",itemId:"meal"}),error=>error instanceof SwiggyGatewayError&&error.code==="SWIGGY_SCHEMA_MISMATCH");}
  finally{await gateway.close();}
});

test("restaurant discovery presents real restaurant cards without prefetching dishes or menus",async()=>{
  const {calls,network}=fixture();
  const gateway=new FoodGateway({...common,storage:storage(),fetch:network});
  try{
    const result=await gateway.searchRestaurants({query:" biryani ",itemId:"meal"});
    assert.equal(result.status,"ready");assert.equal(result.addressId,"food-home");
    assert.deepEqual(result.restaurants,[{id:"restaurant-1",provider:"swiggy_food",name:"Fixture restaurant",cuisines:["Biryani","North Indian"],rating:4.3,etaMinutes:35,costForTwo:"₹500 for two",area:"Synthetic area",distanceKm:2.5,isOpen:true,imageUrl:"https://media-assets.swiggy.com/swiggy/image/upload/fixture.jpg"}]);
    assert.deepEqual(calls.map(call=>call.name),["get_addresses","search_restaurants"]);
    assert.deepEqual(calls[1].arguments,{query:"biryani",addressId:"food-home"});
  }finally{await gateway.close();}
});

test("restaurant discovery preserves closed and unknown status without inventing openness or IDs",async()=>{
  const first=restaurantsData.restaurants[0];
  const {network}=fixture({responses:{search_restaurants:{...restaurantsData,restaurants:[first,{...first,id:"closed",availabilityStatus:"CLOSED"},{...first,id:"unavailable",availabilityStatus:"UNAVAILABLE"},{...first,id:"unknown",availabilityStatus:undefined,avgRating:9,imageUrl:"https://arbitrary-tracker.example/pixel"},{...first,id:undefined},{...first}]}}});
  const gateway=new FoodGateway({...common,storage:storage(),fetch:network});
  try{
    const result=await gateway.searchRestaurants({query:"biryani",itemId:"meal"});
    assert.deepEqual(result.restaurants.map(value=>[value.id,value.isOpen]),[["restaurant-1",true],["closed",false],["unavailable",false],["unknown",null]]);
    assert.equal(result.restaurants[3].rating,null);assert.equal(result.restaurants[3].imageUrl,undefined);
    assert.ok(result.notices.some(value=>value.includes("restaurant ID")));
    assert.ok(result.notices.some(value=>value.includes("Opening status")));
  }finally{await gateway.close();}
});

test("restaurant pagination uses only advancing numeric provider offsets",async()=>{
  const {calls,network}=fixture({onCall:call=>call.name==="get_addresses"?addressData:{...restaurantsData,hasMore:true,nextOffset:"10"}});
  const gateway=new FoodGateway({...common,storage:storage(),fetch:network});
  try{
    const first=await gateway.searchRestaurants({query:"biryani",itemId:"meal"});
    assert.equal(first.hasMore,true);assert.equal(first.nextOffset,10);
    const next=await gateway.searchRestaurants({query:"biryani",itemId:"meal",offset:"10"});
    assert.equal(next.hasMore,false);assert.equal(next.nextOffset,null);
    assert.deepEqual(calls.filter(call=>call.name==="search_restaurants").map(call=>call.arguments.offset),[undefined,10]);
  }finally{await gateway.close();}
  const opaque=fixture({responses:{search_restaurants:{...restaurantsData,hasMore:true,nextOffset:"opaque-provider-cursor"}}});
  const other=new FoodGateway({...common,storage:storage(),fetch:opaque.network});
  try{
    const result=await other.searchRestaurants({query:"biryani",itemId:"meal"});
    assert.equal(result.hasMore,false);assert.ok(result.notices.some(value=>value.includes("usable next page")));
  }finally{await other.close();}
});

test("restaurant list requires a valid owner Food address and cancellation prevents all calls",async()=>{
  const {calls,network}=fixture({responses:{get_addresses:{...addressData,addresses:[...addressData.addresses,{id:"food-work",addressLine:"Synthetic work",phoneNumber:"0000000000"}],pagination:{...addressData.pagination,total:2}}}});
  const gateway=new FoodGateway({...common,storage:storage(),fetch:network});
  try{
    assert.equal((await gateway.searchRestaurants({query:"biryani",itemId:"meal"})).status,"needs_address");
    assert.equal((await gateway.searchRestaurants({query:"biryani",itemId:"meal",addressId:"another-owner-address"})).status,"needs_address");
    assert.ok(calls.every(call=>call.name==="get_addresses"));
    const controller=new AbortController();controller.abort();
    const before=calls.length;
    await assert.rejects(gateway.searchRestaurants({query:"biryani",itemId:"meal",signal:controller.signal}));
    await assert.rejects(gateway.getMenu({restaurantId:"restaurant-1",itemId:"meal",addressId:"food-home",signal:controller.signal}));
    assert.equal(calls.length,before);
  }finally{await gateway.close();}
});

const menuItems=[
  {id:"meal-available",name:"Paneer biryani",price:249,inStock:1,isVeg:true,imageUrl:"https://media-assets.swiggy.com/fixture.jpg"},
  {id:"meal-unknown",name:"Unknown stock",price:149},
  {id:"meal-sold-out",name:"Sold out",price:199,inStock:0},
];
const categoryMenu={...menuData,pageSize:5,categories:[{title:"Biryani",categoryId:"category-biryani",items:menuItems,totalItems:20,hasMoreItems:true},{title:"Sides",subcategories:[{title:"Raita",items:[{id:"raita-1",name:"Raita",inStock:1,isVeg:true,hasAddons:true}]}],totalSubcategories:2}],totalCategories:3,hasMore:true};

test("opening a restaurant returns sections, actual item identities and category pagination",async()=>{
  const {calls,network}=fixture({responses:{get_restaurant_menu:categoryMenu}});
  const gateway=new FoodGateway({...common,storage:storage(),fetch:network,priceUnit:"rupees"});
  try{
    const result=await gateway.getMenu({restaurantId:"restaurant-1",itemId:"plan-meal",addressId:"food-home"});
    assert.equal(result.restaurantId,"restaurant-1");assert.equal(result.restaurant.isOpen,true);
    assert.deepEqual(result.sections.map(section=>section.title),["Biryani","Sides / Raita"]);
    assert.equal(result.sections[0].hasMoreItems,true);assert.equal(result.sections[0].totalItems,20);
    assert.deepEqual(result.sections[0].items.map(offer=>[offer.available,offer.selectable]),[[true,true],[false,false],[false,false]]);
    const offer=result.sections[0].items[0];
    assert.equal(offer.priceMinor,24900);assert.equal(offer.itemId,"plan-meal");
    assert.deepEqual(JSON.parse(Buffer.from(offer.providerItemId,"base64url").toString()),["restaurant-1","meal-available"]);
    assert.equal(result.nextPage,2);assert.equal(result.hasMore,true);
    assert.ok(result.notices.some(value=>value.includes("compact preview")));
    assert.ok(result.notices.some(value=>value.includes("additional subcategories")));
    assert.ok(result.notices.some(value=>value.includes("sizes or add-ons")));
    assert.deepEqual(calls.map(call=>call.name),["get_addresses","get_restaurant_menu"]);
    assert.deepEqual(calls[1].arguments,{restaurantId:"restaurant-1",addressId:"food-home",page:1,pageSize:5});
  }finally{await gateway.close();}
});

test("menu dish shortlists are scoped to plan item and duplicate items within a category collapse",async()=>{
  const {network}=fixture({responses:{get_restaurant_menu:{...categoryMenu,categories:[{title:"Biryani",items:[menuItems[0],menuItems[0]]}]}}});
  const gateway=new FoodGateway({...common,storage:storage(),fetch:network});
  try{
    const first=await gateway.getMenu({restaurantId:"restaurant-1",itemId:"adults-meal",addressId:"food-home"});
    const next=await gateway.getMenu({restaurantId:"restaurant-1",itemId:"children-meal",addressId:"food-home"});
    assert.equal(first.sections[0].items.length,1);
    assert.notEqual(first.sections[0].items[0].id,next.sections[0].items[0].id);
    assert.equal(first.sections[0].items[0].providerItemId,next.sections[0].items[0].providerItemId);
    assert.equal(first.sections[0].items[0].priceMinor,null);
  }finally{await gateway.close();}
});

test("closed or unknown restaurant menus remain readable with selection disabled",async()=>{
  for(const isOpen of [false,undefined]){
    const {network}=fixture({responses:{get_restaurant_menu:{...categoryMenu,restaurant:{...categoryMenu.restaurant,isOpen}}}});
    const gateway=new FoodGateway({...common,storage:storage(),fetch:network});
    try{
      const result=await gateway.getMenu({restaurantId:"restaurant-1",itemId:"meal",addressId:"food-home"});
      assert.ok(result.sections.flatMap(section=>section.items).every(offer=>!offer.available&&!offer.selectable));
      assert.ok(result.notices.some(value=>/closed|confirmed/.test(value)));
    }finally{await gateway.close();}
  }
});

test("menu followups reject address, restaurant identity, page identity and malformed provider output",async()=>{
  const variants=[
    {...categoryMenu,restaurant:{...categoryMenu.restaurant,id:"other-restaurant"}},
    {...categoryMenu,page:2},
    {...categoryMenu,categories:[{title:"Biryani",items:[{name:"Missing real ID",inStock:1}]}]},
  ];
  for(const response of variants){
    const {network}=fixture({responses:{get_restaurant_menu:response}});
    const gateway=new FoodGateway({...common,storage:storage(),fetch:network});
    try{await assert.rejects(gateway.getMenu({restaurantId:"restaurant-1",itemId:"meal",addressId:"food-home"}),error=>error instanceof SwiggyGatewayError&&error.code==="SWIGGY_SCHEMA_MISMATCH");}
    finally{await gateway.close();}
  }
  const {calls,network}=fixture();
  const gateway=new FoodGateway({...common,storage:storage(),fetch:network});
  try{
    await assert.rejects(gateway.getMenu({restaurantId:"restaurant-1",itemId:"meal",addressId:"invalid-food-address"}),error=>error instanceof SwiggyGatewayError&&error.code==="SWIGGY_FOOD_ADDRESS_REQUIRED");
    assert.deepEqual(calls.map(call=>call.name),["get_addresses"]);
    await assert.rejects(gateway.getMenu({restaurantId:"restaurant-1",itemId:"meal",addressId:"food-home",page:0}));
    await assert.rejects(gateway.getMenu({restaurantId:"restaurant-1",itemId:"meal",addressId:"food-home",pageSize:9}));
  }finally{await gateway.close();}
});

test("menu pagination advances category pages and stops an empty provider page",async()=>{
  const {calls,network}=fixture({onCall:call=>call.name==="get_addresses"?addressData:{...categoryMenu,page:call.arguments.page,categories:call.arguments.page===2?[]:categoryMenu.categories}});
  const gateway=new FoodGateway({...common,storage:storage(),fetch:network});
  try{
    const result=await gateway.getMenu({restaurantId:"restaurant-1",itemId:"meal",addressId:"food-home",page:2,pageSize:8});
    assert.equal(result.hasMore,false);assert.equal(result.nextPage,null);
    assert.ok(result.notices.some(value=>value.includes("usable next menu page")));
    assert.deepEqual(calls[1].arguments,{restaurantId:"restaurant-1",addressId:"food-home",page:2,pageSize:8});
  }finally{await gateway.close();}
});

test("restaurant and menu discovery respect live tool capability and input schema drift",async()=>{
  const missing=fixture({publishedTools:tools.filter(tool=>tool.name!=="search_restaurants")});
  const gateway=new FoodGateway({...common,storage:storage(),fetch:missing.network});
  try{
    await assert.rejects(gateway.searchRestaurants({query:"biryani",itemId:"meal"}),error=>error instanceof SwiggyGatewayError&&error.code==="SWIGGY_CAPABILITY_UNAVAILABLE");
    assert.deepEqual(missing.calls.map(call=>call.name),["get_addresses"]);
  }finally{await gateway.close();}
  const drift=fixture({publishedTools:tools.map(tool=>tool.name==="get_restaurant_menu"?{...tool,inputSchema:{...tool.inputSchema,required:["restaurantId","addressId","newUnknownField"]}}:tool)});
  const other=new FoodGateway({...common,storage:storage(),fetch:drift.network});
  try{
    await assert.rejects(other.getMenu({restaurantId:"restaurant-1",itemId:"meal",addressId:"food-home"}),error=>error instanceof SwiggyGatewayError&&error.code==="SWIGGY_INPUT_SCHEMA_MISMATCH");
    assert.deepEqual(drift.calls.map(call=>call.name),["get_addresses"]);
  }finally{await other.close();}
});

test("vegetarian menu preferences only show provider-labelled vegetarian dishes without sending invented tool arguments",async()=>{
  const {calls,network}=fixture({responses:{get_restaurant_menu:{...categoryMenu,categories:[{title:"Biryani",items:[menuItems[0],{...menuItems[0],id:"chicken",name:"Chicken biryani",isVeg:false},menuItems[1]]}]}}});
  const gateway=new FoodGateway({...common,storage:storage(),fetch:network});
  try{
    const result=await gateway.getMenu({restaurantId:"restaurant-1",itemId:"meal",addressId:"food-home",vegetarianOnly:true});
    assert.deepEqual(result.sections[0].items.map(item=>item.name),["Paneer biryani"]);
    assert.ok(result.notices.some(notice=>notice.includes("does not verify vegan, Jain, or allergen suitability")));
    assert.equal("vegetarianOnly"in calls[1].arguments,false);
  }finally{await gateway.close();}
});

test("menu images accept provider HTTPS assets and omit third-party, insecure, and credential-bearing URLs",async()=>{
  const urls=["http://media-assets.swiggy.com/insecure.jpg","https://user:pass@media-assets.swiggy.com/private.jpg","https://media-assets.swiggy.com.evil.example/image.jpg","https://res.cloudinary.com/other-account/image.jpg","https://res.cloudinary.com/swiggy/image/upload/valid.jpg","https://images.swiggy.com/valid.jpg"];
  const {network}=fixture({responses:{get_restaurant_menu:{...categoryMenu,categories:[{title:"Images",items:urls.map((imageUrl,index)=>({...menuItems[0],id:`image-${index}`,imageUrl}))}]}}});
  const gateway=new FoodGateway({...common,storage:storage(),fetch:network});
  try{
    const result=await gateway.getMenu({restaurantId:"restaurant-1",itemId:"meal",addressId:"food-home"});
    assert.deepEqual(result.sections[0].items.map(item=>item.imageUrl),[undefined,undefined,undefined,undefined,urls[4],urls[5]]);
  }finally{await gateway.close();}
});

test("restaurant and menu reads require connected owner credentials before any provider call",async()=>{
  let requests=0;
  const gateway=new FoodGateway({...common,storage:storage(null),fetch:async()=>{requests++;throw new Error("No network expected");}});
  await assert.rejects(gateway.searchRestaurants({query:"biryani",itemId:"meal"}),error=>error instanceof SwiggyGatewayError&&error.code==="SWIGGY_NOT_CONNECTED");
  await assert.rejects(gateway.getMenu({restaurantId:"restaurant-1",itemId:"meal",addressId:"food-home"}),error=>error instanceof SwiggyGatewayError&&error.code==="SWIGGY_NOT_CONNECTED");
  assert.equal(requests,0);
});

test("Food checkout accepts the documented cart payment summary without an order tool name", async () => {
  const cart = {
    addressId: "food-home",
    data: {
      restaurant: { id: "restaurant-1", name: "Fixture restaurant" },
      items: [{ menu_item_id: "menu-1", name: "Fixture biryani", quantity: 1, subtotal: 249, total: 249, final_price: 249, in_stock: true }],
      pricing: { item_total: 249, delivery_charge: 35, taxes_and_charges: 12, to_pay: 296 },
    },
    paymentOptions: { allMethods: [{ id: "Cash", displayName: "Cash on delivery" }], paymentAmount: "₹296" },
  };
  const f = fixture({
    responses: { get_food_cart: cart },
    publishedTools: [{ name: "get_food_cart", inputSchema: { type: "object", properties: { addressId: { type: "string" } }, required: ["addressId"], additionalProperties: false } }],
  });
  const gateway = new FoodGateway({ ...common, storage: storage(), fetch: f.network, priceUnit: "rupees" });
  try {
    const result = await gateway.getCart({ addressId: "food-home" });
    assert.equal(result.payableText, "₹296");
    assert.equal(result.pricing.toPay, 296);
    assert.equal(result.lines[0].menuItemId, "menu-1");
    assert.equal(result.lines[0].inStock, true);
  } finally { await gateway.close(); }
});

test("the live Swiggy cart is read: null when empty, numeric IDs, stock as 1, a restaurant named without an ID, the address without its suffix",async()=>{
  const composite="daj39ic1d96rur8kv400__AbGr8gSXfdoLYGzCf0Ctg9",base="daj39ic1d96rur8kv400";
  const cartTool={name:"get_food_cart",inputSchema:{type:"object" as const,properties:{addressId:{type:"string"},restaurantName:{type:"string"}},required:["addressId"],additionalProperties:false}};
  let reply:unknown={data:null,addressId:base};
  const {calls,network}=fixture({publishedTools:[...tools,cartTool],onCall:call=>call.name==="get_food_cart"?reply:undefined});
  const gateway=new FoodGateway({...common,storage:storage(),fetch:network,priceUnit:"rupees"});
  const empty=await gateway.getCart({addressId:composite});
  assert.deepEqual(empty.lines,[]);assert.equal(empty.addressId,composite,"the chosen address ID is kept for later checks");
  reply={addressId:base,statusCode:0,data:{cart_id:98765,result:"ok",restaurant:{name:"Raj Restaurant",deliverySubtitle:"30 mins"},items:[{menu_item_id:123456,name:"Laccha Paratha",quantity:1,subtotal:80,total:80,final_price:80,in_stock:1,is_veg:1,variants:[],addons:[],imageUrl:"https://images.example.test/p.jpg",valid_addons:[]}],item_count:1,pricing:{item_total:80,delivery_charge:0,taxes_and_charges:21.98,to_pay:101.98},offers:{}}};
  const cart=await gateway.getCart({addressId:composite,restaurantName:"Raj Restaurant (Ad)",restaurantId:"native-raj"});
  assert.equal(cart.lines[0].menuItemId,"123456");assert.equal(cart.lines[0].inStock,true);
  assert.deepEqual(cart.restaurant,{id:"native-raj",name:"Raj Restaurant"});
  assert.equal(calls.at(-1)?.arguments.restaurantName,"Raj Restaurant","the sponsored tag is not sent to Swiggy");
  const other=await gateway.getCart({addressId:composite,restaurantName:"Truffles",restaurantId:"native-truffles"});
  assert.equal(other.restaurant?.id,"","a cart from another restaurant stays unidentified, so checkout asks before replacing it");
  reply={data:null,addressId:"someone-elses-address"};
  await assert.rejects(gateway.getCart({addressId:composite}),{code:"CART_ADDRESS_CHANGED"});
});

test("Food payment preflight failure is not an unknown submitted order", async () => {
  const f = fixture();
  const gateway = new FoodGateway({ ...common, storage: storage(), fetch: f.network });
  try {
    const result = await gateway.placeOrder({ addressId: "food-home", payment: { id: "cod", kind: "cod", label: "Cash", providerMethodId: "Cash" } });
    assert.equal(result.state, "failed");
    assert.match(result.message, /not submitted/);
    assert.ok(!f.calls.some(call => call.name === "place_food_order"));
  } finally { await gateway.close(); }
});

test("a malformed response after Food submission remains unknown and is never retried", async () => {
  const f = fixture({
    publishedTools: [...tools, { name: "get_payment_options", inputSchema: { type: "object", properties: { addressId: { type: "string" } }, required: ["addressId"] } }],
    responses: {
      get_payment_options: { placeOrderToolName: "place_food_order", allMethods: [{ id: "Cash", enabled: true }], cod: { id: "Cash", available: true, displayName: "Cash" } },
      place_food_order: { unexpected: "response" },
    },
  });
  const gateway = new FoodGateway({ ...common, storage: storage(), fetch: f.network });
  try {
    const result = await gateway.placeOrder({ addressId: "food-home", payment: { id: "cod", kind: "cod", label: "Cash", providerMethodId: "Cash" } });
    assert.equal(result.state, "outcome_unknown");
    assert.equal(f.calls.filter(call => call.name === "place_food_order").length, 1);
  } finally { await gateway.close(); }
});
