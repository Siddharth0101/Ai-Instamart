import { test } from "node:test";
import assert from "node:assert/strict";
import { AssistantViewSchema } from "../src/lib/assistant-contracts";
import { shouldResumeDiscovery } from "../src/lib/discovery-resume";

const saved=()=>AssistantViewSchema.parse({id:"saved",version:1,messages:[],task:{kind:"packaged",discovery:{kind:"snacks",mealPeriod:"lunch",periodSource:"time",stage:"items",categoryId:"chips",itemId:"chips"},items:[{id:"chips",label:"Chips",query:"chips",route:"instamart",quantity:1,status:"unavailable"}]},questions:[],suggestions:[],offers:[],providers:[{id:"instamart",name:"Instamart",status:"connected",message:"Fixture"}],status:"needs_address",notices:[],updatedAt:"2026-10-23T10:00:00Z"});

test("a connected saved category resumes after delivery selection or login without selecting a product",()=>{
  const view=saved();assert.equal(shouldResumeDiscovery(view),true);
  view.status="needs_connection";assert.equal(shouldResumeDiscovery(view),true);
  view.providers[0].status="disconnected";assert.equal(shouldResumeDiscovery(view),false);
});
test("reload, category navigation, pending clarification and prepared receipts cannot trigger unrelated research",()=>{
  const view=saved();view.status="blocked";assert.equal(shouldResumeDiscovery(view),false);
  view.status="ready";view.task.pendingInput="budget";assert.equal(shouldResumeDiscovery(view,true),false);
  view.task.pendingInput=null;view.task.discovery!.stage="categories";assert.equal(shouldResumeDiscovery(view,true),false);
  view.task.discovery!.stage="items";view.task.items[0].status="added";assert.equal(shouldResumeDiscovery(view,true),false);
});
test("existing results are retained on reload but an explicit address change can refresh them",()=>{
  const view=saved();view.status="ready";view.offers=[{id:"known",itemId:"chips",provider:"instamart",providerItemId:"sku",name:"Known chips",restaurant:null,unit:"50g",priceMinor:5000,available:true,etaMinutes:null,description:"Fixture",selectable:true}];
  assert.equal(shouldResumeDiscovery(view),false);assert.equal(shouldResumeDiscovery(view,true),true);
});
test("the Instamart home resumes its rails once Instamart is connected, and not while it has products",()=>{
  const view=saved();view.task.discovery={...view.task.discovery!,categoryId:"home",itemId:null};view.task.items=[{id:"rail",label:"Daily essentials",query:"milk",route:"instamart",quantity:1,status:"planned",selectedOfferId:null}];
  view.status="needs_connection";view.providers[0].status="disconnected";assert.equal(shouldResumeDiscovery(view),false,"not before connecting");
  view.providers[0].status="connected";assert.equal(shouldResumeDiscovery(view),true,"back from connecting");
  view.offers=[{id:"milk",itemId:"rail",provider:"instamart",providerItemId:"sku",name:"Milk",restaurant:null,unit:"500 ml",priceMinor:2800,available:true,etaMinutes:null,description:"",selectable:true}];
  view.status="ready";assert.equal(shouldResumeDiscovery(view),false,"a reload keeps the rails it has");
});
