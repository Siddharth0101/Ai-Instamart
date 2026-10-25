import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createAssistantService, type AssistantDependencies } from "../src/server/assistant";
import { MealOfferSchema, type AssistantView, type ProviderState } from "../src/lib/assistant-contracts";
import { SessionViewSchema } from "../src/lib/contracts";
import { opaqueId } from "../src/server/crypto";
import { database, read, transaction, write } from "../src/server/store";

process.env.DATA_DIR="memory://";
const providers:ProviderState[]=[
  {id:"instamart",name:"Instamart",status:"connected",message:"Fixture discovery"},
  {id:"swiggy_food",name:"Swiggy Food",status:"disconnected",message:"Not connected"},
  {id:"zomato",name:"Zomato",status:"access_required",message:"Access required"},
];
function deferred(){let resolve!:()=>void;const promise=new Promise<void>(done=>{resolve=done;});return {promise,resolve};}
const session=SessionViewSchema.parse({sessionId:"fixture-commerce",mode:"live",turnVersion:0,messages:[],products:[],
  cart:{revision:0,lines:[],totals:{itemsMinor:0,feesMinor:0,discountMinor:0,totalMinor:0,currency:"INR"}},
  addresses:[],addressId:null,payments:[],paymentMethodId:null,usage:{inputTokens:0,outputTokens:0,totalTokens:0,model:null},trace:[],csrfToken:"fixture-csrf",connected:true});
async function fixture(overrides:Partial<AssistantDependencies>={}){
  const ownerId=opaqueId("owner-runtime");await write(ownerId,"owner",ownerId,{csrfToken:"fixture",sessionId:null});
  const calls={search:0,prepare:0};
  const service=createAssistantService({
    providers:async()=>providers,
    search:async(owner,_task,items)=>{calls.search++;return {offers:items.map(item=>MealOfferSchema.parse({id:`${owner}:${item.id}:offer`,itemId:item.id,provider:"instamart",providerItemId:"fixture-sku",name:"Fixture chips",restaurant:null,unit:"50 g",priceMinor:5000,available:true,maxQuantity:3,etaMinutes:null,description:"Fixture",selectable:true})),notices:[]};},
    prepare:async(_owner,view)=>{calls.prepare++;return {session,addedOfferIds:view.task.items.flatMap(item=>item.selectedOfferId?[item.selectedOfferId]:[]),notices:[]};},
    ...overrides,
  });
  return {ownerId,service,calls,initial:await service.get(ownerId)};
}

test("assistant text, searches and selections never prepare a cart without an explicit prepare action",async()=>{
  const f=await fixture();
  let view=await f.service.browse(f.ownerId,{query:"chips",route:"instamart",expectedVersion:f.initial.version});
  assert.equal(f.calls.search,1);assert.equal(f.calls.prepare,0);assert.equal(view.task.items[0].status,"needs_choice");
  view=await f.service.select(f.ownerId,{offerId:view.offers[0].id,expectedVersion:view.version});
  assert.equal(view.task.items[0].status,"selected");assert.equal(f.calls.prepare,0);
  const prepared=await f.service.prepare(f.ownerId,view.version);
  assert.equal(f.calls.prepare,1);assert.equal(prepared.view.task.items[0].status,"added");
});

test("assistant rejects invented offer IDs, stale versions and quantities above returned stock limits",async()=>{
  const f=await fixture();
  const view=await f.service.browse(f.ownerId,{query:"chips",route:"instamart",expectedVersion:0});
  await assert.rejects(f.service.select(f.ownerId,{offerId:"model-invented-sku",expectedVersion:view.version}),{code:"OFFER_UNAVAILABLE"});
  await assert.rejects(f.service.select(f.ownerId,{offerId:view.offers[0].id,quantity:4,expectedVersion:view.version}),{code:"QUANTITY_LIMIT"});
  await assert.rejects(f.service.prepare(f.ownerId,0),{code:"PLAN_CHANGED"});
  assert.equal(f.calls.prepare,0);
  const current=await f.service.get(f.ownerId);assert.equal(current.task.items[0].selectedOfferId,null);
});

test("a stale Stop request cannot cancel a newer active search",async()=>{
  let block=false,captured:AbortSignal|undefined;
  const started=deferred(),release=deferred();
  const f=await fixture({search:async(_owner,_task,items,signal)=>{
    if(block){captured=signal;started.resolve();await release.promise;}
    return {offers:items.map(item=>MealOfferSchema.parse({id:"fixture-offer",itemId:item.id,provider:"instamart",providerItemId:"sku",name:"Chips",unit:"50 g",priceMinor:5000,available:true})),notices:[]};
  }});
  const before=await f.service.browse(f.ownerId,{query:"chips",route:"instamart",expectedVersion:0});block=true;
  const searching=f.service.search(f.ownerId,before.version);await started.promise;
  await assert.rejects(f.service.stop(f.ownerId,0),{code:"PLAN_CHANGED"});
  assert.equal(captured?.aborted,false);
  release.resolve();const result=await searching;assert.equal(result.offers.length,1);
});

test("a valid Stop discards late provider results and prevents subsequent preparation",async()=>{
  const started=deferred(),release=deferred();let signal:AbortSignal|undefined;
  const f=await fixture({search:async(_owner,_task,items,currentSignal)=>{
    signal=currentSignal;started.resolve();await release.promise;
    return {offers:items.map(item=>MealOfferSchema.parse({id:"late-offer",itemId:item.id,provider:"instamart",providerItemId:"sku",name:"Late chips",unit:"50 g",priceMinor:5000,available:true})),notices:[]};
  }});
  const turning=f.service.browse(f.ownerId,{query:"chips",route:"instamart",expectedVersion:0});
  const rejected=assert.rejects(turning,{code:"TURN_STOPPED"});
  await started.promise;const stopped=await f.service.stop(f.ownerId,0);
  assert.equal(signal?.aborted,true);assert.equal(stopped.offers.length,0);
  release.resolve();await rejected;
  const latest=await f.service.get(f.ownerId);assert.equal(latest.offers.length,0);assert.equal(f.calls.prepare,0);
});

test("selection cannot overwrite a newer state committed while providers load",async()=>{
  for(const operation of ["select"] as const){
    const started=deferred(),release=deferred();let hold=false;
    const f=await fixture({providers:async()=>{if(hold){started.resolve();await release.promise;}return providers;}});
    const before=await f.service.browse(f.ownerId,{query:"chips",route:"instamart",expectedVersion:0});hold=true;
    const updating=f.service.select(f.ownerId,{offerId:before.offers[0].id,expectedVersion:before.version});
    const rejected=assert.rejects(updating,{code:"PLAN_CHANGED"});
    await started.promise;
    await transaction(async tx=>{
      const state=(await tx.get<AssistantView>(f.ownerId,"assistant","current"))!;
      state.version++;state.task.title="Newer saved plan";await tx.put(f.ownerId,"assistant","current",state);
    });
    release.resolve();await rejected;
    const persisted=(await read<AssistantView>(f.ownerId,"assistant","current"))!;
    assert.equal(persisted.task.title,"Newer saved plan");assert.equal(persisted.task.items[0].selectedOfferId,null);
  }
});

test("one owner cannot select another owner's returned offer or access their saved plan",async()=>{
  const first=await fixture(),second=await fixture();
  const a=await first.service.browse(first.ownerId,{query:"chips",route:"instamart",expectedVersion:0});
  const b=await second.service.browse(second.ownerId,{query:"chips",route:"instamart",expectedVersion:0});
  assert.notEqual(a.id,b.id);assert.notEqual(a.offers[0].id,b.offers[0].id);
  await assert.rejects(second.service.select(second.ownerId,{offerId:a.offers[0].id,expectedVersion:b.version}),{code:"OFFER_UNAVAILABLE"});
  assert.equal((await first.service.get(first.ownerId)).task.items[0].selectedOfferId,null);
  await assert.rejects(first.service.get("unregistered-owner"),{code:"UNAUTHORIZED"});
});

test("restart recovery preserves the plan and clears only expired orphan work without replaying it",async()=>{
  const f=await fixture();
  const view=await f.service.browse(f.ownerId,{query:"chips",route:"instamart",expectedVersion:0});
  await write(f.ownerId,"assistant","current",{...view,active:{id:"previous-process",baseVersion:view.version,kind:"cart"},updatedAt:new Date(Date.now()-181000).toISOString()});
  const restored=await f.service.get(f.ownerId);
  assert.equal(restored.task.items[0].query,"chips");assert.equal(restored.version,view.version+1);
  assert.equal(f.calls.search,1);assert.equal(f.calls.prepare,0);
  assert.ok(restored.notices.some(notice=>notice.includes("interrupted")));
  const saved=await read<Record<string,unknown>>(f.ownerId,"assistant","current");assert.equal(saved?.active,undefined);
  await write(f.ownerId,"assistant","current",{...restored,active:{id:"recent-process",baseVersion:restored.version,kind:"search"},updatedAt:new Date().toISOString()});
  await f.service.get(f.ownerId);
  await assert.rejects(f.service.search(f.ownerId,restored.version),{code:"ASSISTANT_BUSY"});
});

test("category browsing retains selections and loads buffered then provider pages without cart writes",async()=>{
  let remotePages=0;
  const offer=(index:number,itemId:string)=>MealOfferSchema.parse({id:`category:${index}`,itemId,provider:"instamart",providerItemId:`sku:${index}`,name:`Chips ${index}`,unit:"50g",priceMinor:5000,available:true});
  const page=(itemId:string,query:string)=>({itemId,query,provider:"instamart" as const,addressId:"address-one",offset:0,nextOffset:40});
  const f=await fixture({
    search:async(_owner,_task,items)=>({offers:Array.from({length:40},(_,index)=>offer(index,items[0].id)),pages:[page(items[0].id,items[0].query)],notices:[]}),
    more:async(_owner,_task,item,cursor)=>{remotePages++;assert.equal(cursor.nextOffset,40);return {offers:Array.from({length:20},(_,index)=>offer(index+40,item.id)),pages:[{...page(item.id,item.query),offset:40,nextOffset:null}],notices:[]};},
  });
  let view=await f.service.browse(f.ownerId,{query:"Chips",route:"instamart",expectedVersion:0});
  const itemId=view.task.items[0].id;
  assert.equal(view.offers.length,24);assert.equal(view.browsePages[0].hasMore,true);
  assert.equal("browseCursors" in view,false,"private offsets and page buffers stay server-side");
  view=await f.service.select(f.ownerId,{offerId:view.offers[0].id,expectedVersion:view.version});
  const chosen=view.task.items[0].selectedOfferId;
  view=await f.service.more(f.ownerId,{itemId,expectedVersion:view.version});
  assert.equal(view.offers.length,40);assert.equal(remotePages,0,"buffered choices do not query the provider twice");
  view=await f.service.more(f.ownerId,{itemId,expectedVersion:view.version});
  assert.equal(view.offers.length,60);assert.equal(remotePages,1);
  assert.equal(view.browsePages[0].hasMore,false);assert.equal(view.task.items[0].selectedOfferId,chosen);
  assert.equal(f.calls.prepare,0);
  await assert.rejects(f.service.more(f.ownerId,{itemId:"unknown",expectedVersion:view.version}),{code:"SEARCH_CHANGED"});
  const latest=await f.service.get(f.ownerId);
  await assert.rejects(f.service.more(f.ownerId,{itemId,expectedVersion:latest.version}),{code:"NO_MORE_RESULTS"});
  assert.equal(remotePages,1);
});

test("explicit refresh really researches a selected category and retains only a valid returned choice",async()=>{
  const f=await fixture();
  let view=await f.service.browse(f.ownerId,{query:"Chips",route:"instamart",expectedVersion:0});
  const chosen=view.offers[0].id;
  view=await f.service.select(f.ownerId,{offerId:chosen,expectedVersion:view.version});
  const before=f.calls.search;
  view=await f.service.search(f.ownerId,view.version);
  assert.equal(f.calls.search,before+1,"Refresh is a real provider research request even after selection");
  assert.equal(view.task.items[0].selectedOfferId,chosen);
  const empty=createAssistantService({providers:async()=>providers,search:async(_owner,_task,items)=>({offers:[],pages:items.map(item=>({itemId:item.id,query:item.query,provider:"instamart",addressId:"fixture",offset:0,nextOffset:null})),notices:[]}),prepare:async()=>{throw new Error("No cart write allowed");}});
  view=await empty.search(f.ownerId,view.version);
  assert.equal(view.task.items[0].selectedOfferId,null);assert.equal(view.task.items[0].status,"unavailable");
  assert.ok(view.notices.some(notice=>/new selection/.test(notice)));
  assert.equal(f.calls.prepare,0);
});

after(async()=>{await (await database()).close();});

test("the same product chosen again from another aisle keeps one cart line",async()=>{
  const f=await fixture();
  let view=await f.service.browse(f.ownerId,{query:"chips",route:"instamart",expectedVersion:f.initial.version});
  view=await f.service.select(f.ownerId,{offerId:view.offers[0].id,expectedVersion:view.version});
  view=await f.service.groceryHome(f.ownerId,{rails:[{label:"Munchies",query:"chips"}],expectedVersion:view.version});
  const rail=view.task.items.find(item=>item.label==="Munchies")!,again=view.offers.find(offer=>offer.itemId===rail.id)!;
  view=await f.service.select(f.ownerId,{offerId:again.id,quantity:2,expectedVersion:view.version});
  const lines=view.task.items.filter(item=>item.selectedOfferId);
  assert.equal(lines.length,1);assert.equal(lines[0].quantity,2);assert.equal(f.calls.prepare,0);
});

test("each Instamart home rail keeps up to 18 products",async()=>{
  const offer=(itemId:string,index:number)=>MealOfferSchema.parse({id:`${itemId}:${index}`,itemId,provider:"instamart",providerItemId:`sku:${itemId}:${index}`,name:`Product ${index}`,unit:"1 pc",priceMinor:1000,available:true});
  const f=await fixture({search:async(_owner,_task,items)=>({offers:items.flatMap(item=>Array.from({length:30},(_,index)=>offer(item.id,index))),notices:[]})});
  const view=await f.service.groceryHome(f.ownerId,{rails:[{label:"Daily essentials",query:"milk"},{label:"Munchies",query:"chips"}],expectedVersion:f.initial.version});
  assert.deepEqual(view.task.items.map(item=>view.offers.filter(entry=>entry.itemId===item.id).length),[18,18]);
});
