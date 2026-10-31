import { randomUUID } from "node:crypto";
import { AssistantViewSchema, ShoppingTaskSchema, type AssistantView, type MealOffer, type ProviderState, type ShoppingTask, type RestaurantCard, type RestaurantMenu } from "../lib/assistant-contracts";
import type { Quote, SessionView } from "../lib/contracts";
import { GROCERY_RAILS } from "../lib/grocery-catalog";
import { AppError } from "./errors";
import { opaqueId } from "./crypto";
import { read, transaction } from "./store";
import { speakable } from "./speech-text";

export type AssistantPage={itemId:string;query:string;provider:"instamart"|"swiggy_food";addressId:string;offset:number;nextOffset:number|null};
type BrowseCursor=AssistantPage & {buffer:MealOffer[];seenOffsets:number[]};
export type RestaurantContext={itemId:string;query:string;addressId:string;restaurantIds:Record<string,string>;nextOffset:number|null;seenOffsets:number[];nextMenuPage:number|null;seenMenuPages:number[]};
export type RestaurantSearchResult={restaurants:RestaurantCard[];context:RestaurantContext|null;notices:string[];needsAddress?:boolean};
export type RestaurantMenuResult={menu:RestaurantMenu;nextPage:number|null};
type StoredAssistant=AssistantView & {rejectedProposalIds?:string[];restaurantContext?:RestaurantContext|null;active?:{id:string;baseVersion:number;kind:string};browseCursors?:BrowseCursor[]};
export type AssistantSearchResult={offers:MealOffer[];notices:string[];needsAddress?:boolean;pages?:AssistantPage[]};
export type PreparationResult={session:SessionView;quote?:Quote;addedOfferIds:string[];notices:string[]};
export interface AssistantDependencies {
  providers(ownerId:string):Promise<ProviderState[]>;
  search(ownerId:string,task:ShoppingTask,items:ShoppingTask["items"],signal:AbortSignal):Promise<AssistantSearchResult>;
  more?(ownerId:string,task:ShoppingTask,item:ShoppingTask["items"][number],page:AssistantPage,signal:AbortSignal):Promise<AssistantSearchResult>;
  restaurants?(ownerId:string,task:ShoppingTask,item:ShoppingTask["items"][number],signal:AbortSignal,context?:RestaurantContext):Promise<RestaurantSearchResult>;
  menu?(ownerId:string,context:RestaurantContext,restaurant:RestaurantCard,signal:AbortSignal,page?:number,task?:ShoppingTask):Promise<RestaurantMenuResult>;
  prepare(ownerId:string,view:AssistantView,signal:AbortSignal):Promise<PreparationResult>;
  narration?(ownerId:string,kind:"review"|"order"|"settings",quoteId?:string):Promise<string>;
  /** Saved Swiggy Food delivery addresses; restaurants are never searched before one is chosen. */
  foodAddresses?(ownerId:string):Promise<{addresses:{id:string;label:string;reviewAddressText:string}[];selectedAddressId:string|null}>;
}
type Runtime={queues:Map<string,Promise<unknown>>;controllers:Map<string,{id:string;controller:AbortController}>};
const globals=globalThis as typeof globalThis & {saycartAssistantRuntime?:Runtime};
const runtime=globals.saycartAssistantRuntime??={queues:new Map(),controllers:new Map()};
const message=(role:"user"|"assistant",text:string,speech?:string)=>({id:opaqueId("message"),role,text,...(speech?{speech}:{}),createdAt:new Date().toISOString()});
/** A status line from a search; page reloads repeat searches, and the same line twice in a row only crowds the agent's short history. */
const say=(state:{messages:Array<{role:string;text:string}>},text:string)=>{const last=state.messages.at(-1);if(last?.role!=="assistant"||last.text!==text)state.messages.push(message("assistant",text));};
const clean=(state:StoredAssistant):AssistantView=>AssistantViewSchema.parse(state);
const stored=(state:StoredAssistant)=>({...clean(state),browseCursors:state.browseCursors??[],restaurantContext:state.restaurantContext??null,rejectedProposalIds:state.rejectedProposalIds??[]});
const unique=(values:string[])=>[...new Set(values.filter(Boolean))].slice(-12);
/** A saved cart ID survives new searches, but its stock and price come from the current aisle or home rails. */
function currentGroceryOffer(state:StoredAssistant,saved:MealOffer):MealOffer{
  const discovery=state.task.discovery;
  if(saved.provider!=="instamart"||discovery?.kind!=="snacks"||discovery.stage!=="items")return saved;
  const itemIds=discovery.itemId?new Set([discovery.itemId]):discovery.categoryId==="home"?new Set(GROCERY_RAILS.flatMap(rail=>{
    const item=state.task.items.findLast(entry=>entry.route==="instamart"&&entry.status!=="added"&&entry.label===rail.label&&entry.query===rail.query);
    return item?[item.id]:[];
  })):null;
  return itemIds?state.offers.findLast(offer=>itemIds.has(offer.itemId)&&offer.provider===saved.provider&&offer.providerItemId===saved.providerItemId)??saved:saved;
}
function refreshGroceryCartOffer(state:StoredAssistant,id:string,current:MealOffer){
  if(current.provider==="instamart")state.offers=state.offers.map(offer=>offer.id===id?{...current,id:offer.id,itemId:offer.itemId}:offer);
}
function syncBrowse(state:StoredAssistant){
  const items=new Set(state.task.items.map(item=>item.id));
  const context=state.restaurantContext;
  if(context&&(!state.task.items.some(item=>item.id===context.itemId&&item.query===context.query&&item.route==="restaurant")||state.task.discovery?.stage==="categories"||(state.task.discovery?.itemId&&state.task.discovery.itemId!==context.itemId))){state.restaurantBrowser=null;state.restaurantContext=null;}
  if(state.restaurantBrowser&&!items.has(state.restaurantBrowser.itemId))state.restaurantBrowser=null;
  state.offers=state.offers.filter(offer=>items.has(offer.itemId)||state.task.items.some(item=>item.selectedOfferId===offer.id));
  state.browseCursors=(state.browseCursors??[]).filter(cursor=>state.task.items.some(item=>item.id===cursor.itemId&&item.query===cursor.query));
  state.browsePages=state.browseCursors.map(cursor=>({itemId:cursor.itemId,loaded:state.offers.filter(offer=>offer.itemId===cursor.itemId).length,hasMore:state.offers.length<200&&(cursor.buffer.length>0||cursor.nextOffset!==null)}));
}
/** A persisted shopping task is independent of commerce login and presentation mode. */
export function createAssistantService(deps:AssistantDependencies){
  async function serial<T>(ownerId:string,work:()=>Promise<T>):Promise<T>{
    const previous=runtime.queues.get(ownerId)??Promise.resolve();
    const current=previous.catch(()=>undefined).then(work);runtime.queues.set(ownerId,current);
    try{return await current;}finally{if(runtime.queues.get(ownerId)===current)runtime.queues.delete(ownerId);}
  }
  async function load(ownerId:string):Promise<StoredAssistant>{
    return transaction(async tx=>{
      const owner=await tx.get(ownerId,"owner",ownerId);
      if(!owner)throw new AppError("UNAUTHORIZED","Refresh the page to start your conversation.",401);
      let state=await tx.get<StoredAssistant>(ownerId,"assistant","current");
      if(!state){
        state={id:opaqueId("assistant"),version:0,messages:[message("assistant","What would you like to order? Name a dish, a restaurant or groceries.")],task:ShoppingTaskSchema.parse({}),questions:[],suggestions:["I want to order food","Show biryani places","Order groceries"],offers:[],providers:[],status:"idle",proposal:null,presentation:null,restaurantBrowser:null,browsePages:[],notices:[],updatedAt:new Date().toISOString()};
        await tx.put(ownerId,"assistant","current",state);
      }
      if(state.active&&!runtime.controllers.has(ownerId)&&Date.now()-Date.parse(state.updatedAt)>180_000){
        const interrupted=state.active.kind;delete state.active;state.version++;
        state.notices=unique([...state.notices,interrupted==="cart"?"Your earlier bag preparation was interrupted. Refresh your bag before preparing it again; completed additions are retained.":"Your saved plan is restored. You can continue where you left off."]);
        state.updatedAt=new Date().toISOString();await tx.put(ownerId,"assistant","current",state);
      }
      state.task=ShoppingTaskSchema.parse(state.task);state.browsePages??=[];state.restaurantBrowser??=null;
      return state;
    });
  }
  async function get(ownerId:string){const state=await load(ownerId);return clean({...state,providers:await deps.providers(ownerId)});}
  function assertVersion(state:StoredAssistant,expected:number){
    if(state.active)throw new AppError("ASSISTANT_BUSY","A request is still running. Stop it or wait for it to finish.",409);
    if(state.version!==expected)throw new AppError("PLAN_CHANGED","This plan changed in another request. Refresh it before continuing.",409);
  }
  async function claim(ownerId:string,expected:number,kind:string,text?:string){
    await load(ownerId);
    const id=opaqueId("work"),controller=new AbortController();
    runtime.controllers.set(ownerId,{id,controller});
    let state:StoredAssistant;
    try{state=await transaction(async tx=>{
      const current=(await tx.get<StoredAssistant>(ownerId,"assistant","current"))!;assertVersion(current,expected);
      current.active={id,baseVersion:expected,kind};current.version++;current.presentation=null;
      if(kind!=="turn")current.proposal=null;
      if(text)current.messages=[...current.messages,message("user",text)].slice(-60);
      current.updatedAt=new Date().toISOString();await tx.put(ownerId,"assistant","current",current);return current;
    });}catch(error){if(runtime.controllers.get(ownerId)?.id===id)runtime.controllers.delete(ownerId);throw error;}
    return {id,controller,state};
  }
  async function finish(ownerId:string,id:string,next:StoredAssistant){
    return transaction(async tx=>{
      const current=(await tx.get<StoredAssistant>(ownerId,"assistant","current"))!;
      if(current.active?.id!==id)throw new AppError("TURN_STOPPED","This request was stopped. Your latest saved plan is available.",409);
      delete next.active;next.updatedAt=new Date().toISOString();next.messages=next.messages.slice(-60);next.notices=unique(next.notices);
      syncBrowse(next);const parsed=clean(next);await tx.put(ownerId,"assistant","current",stored(next));return parsed;
    });
  }
  async function recover(ownerId:string,id:string,error:unknown):Promise<never>{
    await transaction(async tx=>{
      const current=await tx.get<StoredAssistant>(ownerId,"assistant","current");
      if(current?.active?.id===id){delete current.active;current.notices=unique([...current.notices,"Your plan is saved. This request could not finish; review the current state before continuing."]);await tx.put(ownerId,"assistant","current",current);}
    });
    throw error;
  }
  async function searchInto(ownerId:string,state:StoredAssistant,signal:AbortSignal,refresh=false){
    if(state.task.discovery?.stage==="categories"||state.task.pendingInput||
      (state.task.foodIntake&&state.task.kind!=="party"&&(state.task.people===null||(state.task.budgetMinor===null&&!state.task.budgetConfirmed))))return state;
    const priority=(status:string)=>status==="planned"?0:status==="unavailable"?1:2;
    const searchable=state.task.items.filter(item=>item.route!=="undecided"&&item.status!=="added"&&(refresh||item.status!=="selected"));
    const planned=searchable.filter(item=>item.status==="planned");
    const activeItemId=state.task.discovery?.stage==="items"?state.task.discovery.itemId:null;
    let candidates=(activeItemId?searchable.filter(item=>item.id===activeItemId):(planned.length?planned:searchable)).sort((a,b)=>priority(a.status)-priority(b.status)).slice(0,6);
    if(!candidates.length)return state;
    state.providers=await deps.providers(ownerId);
    const restaurantItem=candidates.find(item=>item.route==="restaurant");let foodNeedsAddress=false;
    if(restaurantItem&&deps.restaurants){
      state.restaurantBrowser={itemId:restaurantItem.id,restaurants:[],selectedRestaurantId:null,menu:null,hasMore:false};state.restaurantContext=null;
      if(state.providers.find(provider=>provider.id==="swiggy_food")?.status!=="connected")state.status="needs_connection";
      else{
        const result=await deps.restaurants(ownerId,state.task,restaurantItem,signal);
        if(signal.aborted)throw new AppError("TURN_STOPPED","The restaurant search was stopped.",409);
        state.restaurantBrowser={...state.restaurantBrowser,restaurants:result.restaurants.slice(0,100),hasMore:result.restaurants.length<100&&result.context?.nextOffset!==null&&!!result.context};
        state.restaurantContext=result.context;state.notices=unique([...state.notices,...result.notices,...(result.restaurants.length>100?["Showing the first 100 restaurants. Narrow your category to explore more specific matches."]:[])]);
        foodNeedsAddress=!!result.needsAddress;state.status=foodNeedsAddress?"needs_address":result.restaurants.length?"needs_choice":"blocked";
        state.suggestions=[];
        if(foodNeedsAddress){
          // Food can only be delivered somewhere: ask for the address before showing any restaurant.
          const saved=deps.foodAddresses?(await deps.foodAddresses(ownerId).catch(()=>null))?.addresses??[]:[];
          const labels=saved.map(address=>saved.filter(other=>other.label===address.label).length>1?`${address.label} · ${address.reviewAddressText}`:address.label);
          state.questions=[{id:"food_address",text:saved.length?"Where should I deliver your food?":"Add a delivery address in Swiggy, then choose it here.",options:labels.slice(0,6)}];
          say(state,saved.length?`Before I show restaurants, tell me where to deliver: ${labels.slice(0,4).join(" or ")}?`:"Add a delivery address in your Swiggy app first, then choose it here so I can show restaurants that deliver to you.");
        }else say(state,result.restaurants.length?`I found ${Math.min(100,result.restaurants.length)} restaurants ${restaurantItem.query==="restaurants"?"near you":`for ${restaurantItem.label}`}. Choose a restaurant to open its menu and add dishes to your plan.`:"No restaurants were returned for this search. Try another category or delivery address.");
      }
      // Grocery discovery continues independently for mixed and party plans.
      candidates=candidates.filter(item=>item.route==="instamart");
      if(!candidates.length)return state;
    }
    const connected=candidates.some(item=>state.providers.some(provider=>provider.status==="connected"&&(item.route==="instamart"?provider.id==="instamart":provider.id!=="instamart")));
    if(!connected){state.status="needs_connection";return state;}
    const result=await deps.search(ownerId,state.task,candidates,signal);
    if(signal.aborted)throw new AppError("TURN_STOPPED","The search was stopped.",409);
    const ids=new Set(candidates.map(item=>item.id));
    const previousChoices=new Map(candidates.filter(item=>item.selectedOfferId).map(item=>[item.id,state.offers.find(offer=>offer.id===item.selectedOfferId)]));
    // Reserve room for every plan line, including earlier selected results.
    const kept=state.offers.filter(offer=>!ids.has(offer.itemId));
    let capacity=200-kept.length;
    // The Instamart home shows its rails side by side; each needs enough products to fill a row once pack sizes are grouped.
    const homeRails=state.task.discovery?.kind==="snacks"&&state.task.discovery.categoryId==="home"&&!activeItemId;
    const offers=candidates.flatMap((item,index)=>{
      const limit=Math.max(0,Math.min(item.id===activeItemId?24:homeRails?18:6,capacity-(candidates.length-index-1)*6));
      const available=[...new Map(result.offers.filter(offer=>offer.itemId===item.id).map(offer=>[offer.id,offer])).values()];
      const previous=previousChoices.get(item.id);
      const freshChoice=previous&&available.find(offer=>offer.id===previous.id);
      const authoritative=available.length>0||result.pages?.some(page=>page.itemId===item.id);
      if(previous&&!authoritative){available.unshift(previous);state.notices.push(`Your saved ${item.label} choice is kept, but the shop could not verify it in this refresh. Reconnect or search again before preparing it.`);}
      else if(freshChoice){available.splice(available.indexOf(freshChoice),1);available.unshift(freshChoice);}
      const found=available.slice(0,limit);
      capacity-=found.length;return found;
    });
    state.browseCursors=(state.browseCursors??[]).filter(cursor=>!ids.has(cursor.itemId));
    for(const item of candidates){
      const page=result.pages?.find(page=>page.itemId===item.id&&page.query===item.query);
      const shown=new Set(offers.filter(offer=>offer.itemId===item.id).map(offer=>offer.id));
      const buffer=result.offers.filter(offer=>offer.itemId===item.id&&!shown.has(offer.id)).slice(0,500);
      if(page)state.browseCursors.push({...page,nextOffset:page.nextOffset!==null&&Number.isSafeInteger(page.nextOffset)&&page.nextOffset>page.offset?page.nextOffset:null,buffer,seenOffsets:[page.offset]});
    }
    state.offers=[...kept,...offers];
    syncBrowse(state);
    // Notices a fresh search would repeat if still true (more items to search, no Instamart address yet) are dropped first.
    state.notices=unique([...state.notices.filter(notice=>!/^\d+ more list items? still need a search\.|^Choose your saved Instamart delivery address/.test(notice)),...result.notices]);
    state.task.items=state.task.items.map(item=>{
      if(!ids.has(item.id))return item;
      const previous=previousChoices.get(item.id),choice=offers.find(offer=>offer.id===previous?.id);
      if(previous&&choice?.available&&choice.selectable&&item.quantity<=(choice.maxQuantity??99))return {...item,status:"selected" as const};
      if(previous)state.notices.push(`Your earlier ${item.label} choice needs a new selection from the refreshed options.`);
      return {...item,selectedOfferId:null,status:offers.some(offer=>offer.itemId===item.id)?"needs_choice" as const:"unavailable" as const};
    });
    state.status=result.needsAddress||foodNeedsAddress?"needs_address":state.offers.length?state.task.items.every(item=>item.status==="selected"||item.status==="added")?"selected":"needs_choice":"blocked";
    const remaining=state.task.items.filter(item=>item.route!=="undecided"&&item.status==="planned").length;
    if(remaining)state.notices=unique([...state.notices,`${remaining} more list item${remaining===1?"":"s"} still need a search. Choose “Search remaining items” to continue; your earlier options are kept.`]);
    const returnedIds=new Set(result.offers.map(offer=>offer.id));
    const freshCount=offers.filter(offer=>returnedIds.has(offer.id)).length;
    if(freshCount){
      state.messages=[...state.messages,message("assistant",`I found ${freshCount} live option${freshCount===1?"":"s"} for your plan. Choose the exact items and packs below; I’ll keep the rest of your list together.`)];
      state.suggestions=[];
    }else if(!result.needsAddress)state.messages=[...state.messages,message("assistant","I couldn’t find available options for the items checked in this search. Your other choices are saved. Try a different item or reconnect the relevant shop.")];
    return state;
  }
  /**
   * A spoken "show me biryani places" / "get me chips": one search item for the request, chosen items kept.
   * The agent decides what to search for; this only applies it and runs the provider search.
   */
  async function browse(ownerId:string,input:{query:string;route:"restaurant"|"instamart";expectedVersion:number}){
    return serial(ownerId,async()=>{
      const work=await claim(ownerId,input.expectedVersion,"search");
      try{
        const state=work.state,query=input.query.trim().slice(0,200)||"restaurants";
        const label=query==="restaurants"?"Restaurants near you":query.charAt(0).toUpperCase()+query.slice(1);
        const item={id:randomUUID(),label,query,quantity:1,route:input.route,status:"planned" as const,selectedOfferId:null};
        const kept=state.task.items.filter(entry=>entry.selectedOfferId||entry.status==="added");
        const routes=new Set([...kept.map(entry=>entry.route),input.route]);
        state.task=ShoppingTaskSchema.parse({...state.task,items:[...kept,item],kind:routes.has("instamart")&&routes.has("restaurant")?"mixed":input.route==="instamart"?"packaged":"meal",
          foodIntake:false,pendingInput:null,discovery:{kind:input.route==="instamart"?"snacks":"meal",mealPeriod:"lunch",periodSource:"explicit",categoryId:null,itemId:item.id,stage:"items"}});
        state.offers=state.offers.filter(offer=>kept.some(entry=>entry.selectedOfferId===offer.id));
        state.restaurantBrowser=null;state.restaurantContext=null;state.browseCursors=[];state.questions=[];state.proposal=null;
        await searchInto(ownerId,state,work.controller.signal);
        state.providers=await deps.providers(ownerId);
        return await finish(ownerId,work.id,state);
      }catch(error){return recover(ownerId,work.id,error);}finally{if(runtime.controllers.get(ownerId)?.id===work.id)runtime.controllers.delete(ownerId);}
    });
  }
  /** One voice turn in the conversation: the user's words and the agent's reply; action templates stay out of it. */
  async function recordTurn(ownerId:string,input:{baseCount:number;user:string;reply:string;speech?:string;expectedVersion:number}){
    return serial(ownerId,async()=>{
      const state=await load(ownerId);assertVersion(state,input.expectedVersion);
      const reply=message("assistant",input.reply,input.speech&&input.speech.length<=2000?input.speech:undefined);
      state.messages=[...state.messages.slice(0,Math.min(input.baseCount,state.messages.length)),message("user",input.user),reply].slice(-60);
      state.version++;state.updatedAt=new Date().toISOString();state.providers=await deps.providers(ownerId);
      await transaction(async tx=>{const current=await tx.get<StoredAssistant>(ownerId,"assistant","current");if(!current||current.version!==input.expectedVersion||current.active)throw new AppError("PLAN_CHANGED","Your conversation changed. Try again.",409);await tx.put(ownerId,"assistant","current",stored(state));});
      return {view:clean(state),reply:{id:reply.id,text:reply.text}};
    });
  }
  /** The Instamart home: several product rails searched at once (one search each), keeping whatever is already in the cart. */
  async function groceryHome(ownerId:string,input:{rails:Array<{label:string;query:string}>;expectedVersion:number}){
    return serial(ownerId,async()=>{
      const work=await claim(ownerId,input.expectedVersion,"search");
      try{
        const state=work.state,kept=state.task.items.filter(entry=>entry.selectedOfferId||entry.status==="added");
        const rails=input.rails.map(rail=>({id:randomUUID(),label:rail.label,query:rail.query,quantity:1,route:"instamart" as const,status:"planned" as const,selectedOfferId:null}));
        state.task=ShoppingTaskSchema.parse({...state.task,items:[...kept,...rails],kind:kept.some(entry=>entry.route==="restaurant")?"mixed":"packaged",foodIntake:false,pendingInput:null,
          discovery:{kind:"snacks",mealPeriod:"lunch",periodSource:"explicit",categoryId:"home",itemId:null,stage:"items"}});
        state.offers=state.offers.filter(offer=>kept.some(entry=>entry.selectedOfferId===offer.id));
        state.restaurantBrowser=null;state.restaurantContext=null;state.browseCursors=[];state.questions=[];state.proposal=null;
        await searchInto(ownerId,state,work.controller.signal);
        state.providers=await deps.providers(ownerId);
        return await finish(ownerId,work.id,state);
      }catch(error){return recover(ownerId,work.id,error);}finally{if(runtime.controllers.get(ownerId)?.id===work.id)runtime.controllers.delete(ownerId);}
    });
  }
  /** Something the assistant says on its own (a greeting, a connect prompt), kept in the conversation so later turns know it was said. */
  async function announce(ownerId:string,input:{text:string;speech?:string;expectedVersion:number}){
    return serial(ownerId,async()=>{
      const state=await load(ownerId);assertVersion(state,input.expectedVersion);
      const reply=message("assistant",input.text,input.speech&&input.speech.length<=2000?input.speech:undefined);
      state.messages=[...state.messages,reply].slice(-60);state.version++;state.updatedAt=new Date().toISOString();
      await transaction(async tx=>{const current=await tx.get<StoredAssistant>(ownerId,"assistant","current");if(!current||current.version!==input.expectedVersion||current.active)throw new AppError("PLAN_CHANGED","Your conversation changed. Try again.",409);await tx.put(ownerId,"assistant","current",stored(state));});
      return {view:clean(state),reply:{id:reply.id,text:reply.text}};
    });
  }
  async function search(ownerId:string,expectedVersion:number){
    return serial(ownerId,async()=>{
      const work=await claim(ownerId,expectedVersion,"search");
      try{const next=await searchInto(ownerId,work.state,work.controller.signal,true);next.providers=await deps.providers(ownerId);return finish(ownerId,work.id,next);}
      catch(error){return recover(ownerId,work.id,error);}finally{if(runtime.controllers.get(ownerId)?.id===work.id)runtime.controllers.delete(ownerId);}
    });
  }
  async function more(ownerId:string,input:{itemId:string;expectedVersion:number}){
    return serial(ownerId,async()=>{
      const work=await claim(ownerId,input.expectedVersion,"search");
      try{
        const state=work.state,item=state.task.items.find(item=>item.id===input.itemId);
        const cursor=state.browseCursors?.find(cursor=>cursor.itemId===input.itemId&&cursor.query===item?.query);
        if(!item||!cursor||state.task.discovery?.stage==="categories")throw new AppError("SEARCH_CHANGED","Choose a category and search again before loading more items.",409);
        const capacity=200-state.offers.length;
        if(capacity<=0)throw new AppError("RESULT_LIMIT","You have 200 saved options. Narrow your category or start a new plan to explore more.",422);
        let buffer=cursor.buffer;
        if(!buffer.length){
          if(cursor.nextOffset===null||!deps.more)throw new AppError("NO_MORE_RESULTS","There are no more verified pages for this search.",422);
          const offset=cursor.nextOffset;
          if(cursor.seenOffsets.includes(offset))throw new AppError("INVALID_CURSOR","The shop repeated a search page. Search again to refresh your results.",422);
          const result=await deps.more(ownerId,state.task,item,cursor,work.controller.signal);
          if(work.controller.signal.aborted)throw new AppError("TURN_STOPPED","The search was stopped.",409);
          const ids=new Set(state.offers.map(offer=>offer.id));
          buffer=result.offers.filter(offer=>offer.itemId===item.id&&!ids.has(offer.id)).slice(0,500);
          const page=result.pages?.find(page=>page.itemId===item.id&&page.query===item.query&&page.addressId===cursor.addressId&&page.provider===cursor.provider&&page.offset===offset);
          cursor.nextOffset=page&&buffer.length&&page.nextOffset!==null&&Number.isSafeInteger(page.nextOffset)&&page.nextOffset>offset&&!cursor.seenOffsets.includes(page.nextOffset)?page.nextOffset:null;
          cursor.seenOffsets.push(offset);state.notices=unique([...state.notices,...result.notices]);
        }
        const added=buffer.slice(0,Math.min(24,capacity));cursor.buffer=buffer.slice(added.length);
        state.offers.push(...added);syncBrowse(state);
        if(state.offers.length>=200)state.notices=unique([...state.notices,"You have 200 saved options. Narrow the category or start a new plan to explore another search."]);
        state.messages.push(message("assistant",added.length?`Loaded ${added.length} more live options. Your earlier choices are kept.`:"There are no new verified items on that page. Your earlier choices are kept."));
        return finish(ownerId,work.id,state);
      }catch(error){return recover(ownerId,work.id,error);}finally{if(runtime.controllers.get(ownerId)?.id===work.id)runtime.controllers.delete(ownerId);}
    });
  }
  function selectOfferInto(state:StoredAssistant,input:{offerId:string;quantity?:number}){
      const selected=state.offers.find(item=>item.id===input.offerId),offer=selected&&currentGroceryOffer(state,selected);
      if(!selected||!offer||!offer.available||!offer.selectable)throw new AppError("OFFER_UNAVAILABLE","Choose an available item from your current results.",422);
      const target=state.task.items.find(item=>item.id===selected.itemId);
      if(!target)throw new AppError("PLAN_CHANGED","This item is no longer part of the current plan.",409);
      if(target.status==="added")throw new AppError("ITEM_ALREADY_PREPARED","This item is already in your bag. Manage its quantity there to avoid adding it twice.",409);
      const quantity=input.quantity??target.quantity;
      if(!Number.isInteger(quantity)||quantity<1||quantity>Math.min(99,offer.maxQuantity??99))throw new AppError("QUANTITY_LIMIT","Choose a quantity within the returned purchase limit.",422);
      // "Chips and a cold drink" from one search are two cart lines: a second product gets its own line instead of replacing the first.
      // The same product found again in another aisle or search keeps its one cart line.
      const same=(id:string|null)=>{const held=state.offers.find(other=>other.id===id);return held?.provider===offer.provider&&held.providerItemId===offer.providerItemId;};
      const holder=state.task.items.find(item=>item.selectedOfferId===selected.id)??state.task.items.find(item=>same(item.selectedOfferId));
      if(holder){if(holder.status==="added")throw new AppError("ITEM_ALREADY_PREPARED","This item is already in your bag. Manage its quantity there to avoid adding it twice.",409);holder.quantity=quantity;}
      else if(target.selectedOfferId&&target.selectedOfferId!==selected.id){
        if(state.task.items.length>=30)throw new AppError("PLAN_LIMIT","Your plan has 30 items. Remove an item before adding another.",422);
        state.task.items.push({id:randomUUID(),label:offer.name,query:target.query,quantity,route:target.route,status:"selected",selectedOfferId:selected.id});
      }
      else{target.quantity=quantity;target.selectedOfferId=selected.id;target.status="selected";}
      refreshGroceryCartOffer(state,holder?.selectedOfferId??selected.id,offer);
      state.proposal=null;
  }
  /** Cart steppers: set a saved dish's quantity from any restaurant; 0 removes it. Never touches a provider cart. */
  async function setCartLine(ownerId:string,input:{offerId:string;quantity:number;expectedVersion:number}){
    return serial(ownerId,async()=>{
      const state=await load(ownerId);assertVersion(state,input.expectedVersion);
      const item=state.task.items.find(entry=>entry.selectedOfferId===input.offerId),offer=state.offers.find(entry=>entry.id===input.offerId);
      if(!item||!offer)throw new AppError("OFFER_UNAVAILABLE","That item is no longer in your cart.",422);
      if(item.status==="added")throw new AppError("ITEM_ALREADY_PREPARED","This item is already in your provider bag. Manage it in the bag.",409);
      const current=currentGroceryOffer(state,offer),increasing=input.quantity>item.quantity;
      if(!Number.isInteger(input.quantity)||input.quantity<0||input.quantity>99)throw new AppError("QUANTITY_LIMIT","Choose a quantity within the available limit.",422);
      // Reduced stock must never trap an existing grocery in the cart: decreases
      // and removal stay possible, while increases use the refreshed limits.
      if(increasing&&current.provider==="instamart"&&(!current.available||!current.selectable))throw new AppError("OFFER_UNAVAILABLE","This item is not currently available. You can reduce or remove it from your cart.",422);
      if((current.provider!=="instamart"||increasing)&&input.quantity>Math.min(99,current.maxQuantity??99))throw new AppError("QUANTITY_LIMIT","Choose a quantity within the available limit.",422);
      if(input.quantity===0){
        // A dish chosen from a menu is its own plan item; a searched item keeps its slot so it can be chosen again.
        const context=state.restaurantContext;
        if(context?.itemId===item.id){item.selectedOfferId=null;item.status="needs_choice";item.label=context.query==="restaurants"?"Restaurants near you":context.query;}
        else if((item.route==="restaurant"||item.id!==offer.itemId)&&item.label===offer.name)state.task.items=state.task.items.filter(entry=>entry.id!==item.id);
        else{item.selectedOfferId=null;item.status="needs_choice";}
        // Removing a cart line must not remove the live product from its search
        // results: the customer can add that same card again without a search.
        if(!state.task.items.some(entry=>entry.selectedOfferId===offer.id||entry.id===offer.itemId))state.offers=state.offers.filter(entry=>entry.id!==offer.id||state.restaurantBrowser?.menu?.sections.some(section=>section.items.some(dish=>dish.id===offer.id)));
      }else{item.quantity=input.quantity;refreshGroceryCartOffer(state,offer.id,current);}
      state.version++;state.status=state.task.items.some(entry=>entry.selectedOfferId)?"selected":state.restaurantBrowser?"needs_choice":"ready";
      state.updatedAt=new Date().toISOString();state.providers=await deps.providers(ownerId);
      await transaction(async tx=>{const current=await tx.get<StoredAssistant>(ownerId,"assistant","current");if(!current||current.version!==input.expectedVersion||current.active)throw new AppError("PLAN_CHANGED","Your cart changed. Refresh before editing again.",409);await tx.put(ownerId,"assistant","current",stored(state));});
      return clean(state);
    });
  }
  /** After a confirmed restaurant order the dishes leave the cart; Instamart items are untouched. */
  async function clearRestaurantCart(ownerId:string){
    return serial(ownerId,async()=>{
      const state=await load(ownerId);if(state.active)return clean(state);
      const food=new Set(state.offers.filter(offer=>offer.provider!=="instamart").map(offer=>offer.id));
      state.task.items=state.task.items.filter(item=>!(item.selectedOfferId&&food.has(item.selectedOfferId))||item.id===state.restaurantContext?.itemId).map(item=>item.id===state.restaurantContext?.itemId&&item.selectedOfferId&&food.has(item.selectedOfferId)?{...item,selectedOfferId:null,status:"needs_choice" as const,label:state.restaurantContext.query==="restaurants"?"Restaurants near you":state.restaurantContext.query}:item);
      state.version++;state.updatedAt=new Date().toISOString();
      await transaction(tx=>tx.put(ownerId,"assistant","current",stored(state)));
      return clean(state);
    });
  }
  /** After an Instamart order completes, the groceries it carried leave the cart; the search list stays. The bag follows the cart, so it carried them all. */
  async function clearOrderedGroceries(ownerId:string){
    return serial(ownerId,async()=>{
      const state=await load(ownerId);if(state.active)return clean(state);
      const groceries=new Set(state.offers.filter(offer=>offer.provider==="instamart").map(offer=>offer.id)),browsing=state.task.discovery?.itemId;
      const ordered=(item:typeof state.task.items[number])=>!!item.selectedOfferId&&groceries.has(item.selectedOfferId);
      state.task.items=state.task.items.filter(item=>!ordered(item)||item.id===browsing).map(item=>ordered(item)?{...item,selectedOfferId:null,status:"needs_choice" as const}:item);
      state.version++;state.updatedAt=new Date().toISOString();
      await transaction(tx=>tx.put(ownerId,"assistant","current",stored(state)));
      return clean(state);
    });
  }
  async function select(ownerId:string,input:{offerId:string;quantity?:number;expectedVersion:number}){
    return serial(ownerId,async()=>{
      const state=await load(ownerId);assertVersion(state,input.expectedVersion);
      selectOfferInto(state,input);
      state.version++;state.status=state.task.items.every(item=>item.status==="selected"||item.status==="added")?"selected":"needs_choice";
      state.messages.push(message("assistant","Your choice is saved. Review your plan or choose the next item."));
      state.updatedAt=new Date().toISOString();state.providers=await deps.providers(ownerId);
      await transaction(async tx=>{const current=await tx.get<StoredAssistant>(ownerId,"assistant","current");if(!current||current.version!==input.expectedVersion||current.active)throw new AppError("PLAN_CHANGED","Your plan changed. Refresh before selecting again.",409);await tx.put(ownerId,"assistant","current",stored(state));});return clean(state);
    });
  }
  async function prepare(ownerId:string,expectedVersion:number){
    return serial(ownerId,async()=>{
      const work=await claim(ownerId,expectedVersion,"cart");
      try{
        const result=await deps.prepare(ownerId,clean(work.state),work.controller.signal);
        const ids=new Set(result.addedOfferIds),next=work.state;
        next.task.items=next.task.items.map(item=>ids.has(item.selectedOfferId??"")?{...item,status:"added" as const}:item);
        next.status="prepared";next.notices=unique([...next.notices,...result.notices]);
        next.messages.push(message("assistant",result.quote?"Your Instamart bag is ready. Review the complete bill, address and payment below before confirming.":"Your selected Instamart items are in the bag. Choose an available payment method and review the full total before ordering."));
        next.providers=await deps.providers(ownerId);
        const view=await finish(ownerId,work.id,next);return {view,session:result.session,...(result.quote?{quote:result.quote}:{})};
      }catch(error){return recover(ownerId,work.id,error);}finally{if(runtime.controllers.get(ownerId)?.id===work.id)runtime.controllers.delete(ownerId);}
    });
  }
  async function reset(ownerId:string,expectedVersion:number){return serial(ownerId,async()=>{
    const state=await load(ownerId);assertVersion(state,expectedVersion);
    state.task=ShoppingTaskSchema.parse({timezone:state.task.timezone});state.offers=[];state.questions=[];state.suggestions=["I want to order food","Show biryani places","Order groceries"];
    state.browseCursors=[];state.browsePages=[];state.restaurantBrowser=null;state.restaurantContext=null;
    state.proposal=null;state.presentation=null;state.rejectedProposalIds=[];state.status="idle";state.notices=[];state.version++;state.messages=[message("assistant","Let’s start a new plan. Your existing provider bag and order records are still available.")];state.updatedAt=new Date().toISOString();
    await transaction(async tx=>{const current=await tx.get<StoredAssistant>(ownerId,"assistant","current");if(!current||current.version!==expectedVersion||current.active)throw new AppError("PLAN_CHANGED","Your plan changed. Refresh before starting over.",409);await tx.put(ownerId,"assistant","current",clean(state));});return {...clean(state),providers:await deps.providers(ownerId)};
  });}
  async function stop(ownerId:string,expectedVersion:number){
    let stoppedId:string|undefined;
    await transaction(async tx=>{
      const state=await tx.get<StoredAssistant>(ownerId,"assistant","current");if(!state)return;
      if(state.version!==expectedVersion&&state.active?.baseVersion!==expectedVersion)throw new AppError("PLAN_CHANGED","Refresh the latest plan before stopping another turn.",409);
      stoppedId=state.active?.id;
      const hadCart=state.active?.kind==="cart";delete state.active;state.version++;
      state.notices=unique([...state.notices,hadCart?"Stopped new work. A bag edit already sent may have completed; refresh the bag before continuing.":"Stopped. Your saved plan is ready when you are."]);
      await tx.put(ownerId,"assistant","current",stored(state));
    });
    if(stoppedId&&runtime.controllers.get(ownerId)?.id===stoppedId)runtime.controllers.get(ownerId)?.controller.abort();
    return get(ownerId);
  }
  async function restaurantWork(ownerId:string,expectedVersion:number,work:(state:StoredAssistant,signal:AbortSignal)=>Promise<void>){
    return serial(ownerId,async()=>{
      const job=await claim(ownerId,expectedVersion,"restaurants");
      try{await work(job.state,job.controller.signal);return await finish(ownerId,job.id,job.state);}
      catch(error){return recover(ownerId,job.id,error);}finally{if(runtime.controllers.get(ownerId)?.id===job.id)runtime.controllers.delete(ownerId);}
    });
  }
  function restaurantState(state:StoredAssistant){
    const browser=state.restaurantBrowser,context=state.restaurantContext;
    if(!browser||!context||browser.itemId!==context.itemId||!state.task.items.some(item=>item.id===context.itemId&&item.query===context.query))throw new AppError("SEARCH_CHANGED","Choose your food category again to load current restaurants.",409);
    return {browser,context};
  }
  async function loadRestaurantMenu(ownerId:string,state:StoredAssistant,restaurantId:string,signal:AbortSignal){
      const {browser,context}=restaurantState(state),card=browser.restaurants.find(card=>card.id===restaurantId);
      if(!card||!context.restaurantIds[card.id]||!deps.menu)throw new AppError("RESTAURANT_UNAVAILABLE","Choose a restaurant from your current list.",422);
      const result=await deps.menu(ownerId,context,card,signal,1,state.task);
      if(result.menu.restaurantId!==card.id||result.menu.restaurant.id!==card.id)throw new AppError("MENU_CHANGED","The restaurant returned an unexpected menu. Open it again.",409);
      browser.selectedRestaurantId=card.id;browser.menu=result.menu;
      context.nextMenuPage=result.nextPage;context.seenMenuPages=[1];state.status="needs_choice";
      state.messages.push(message("assistant",`Here is ${card.name}’s menu. Choose dishes and quantities to save them in your plan.`));
  }
  async function openRestaurant(ownerId:string,input:{restaurantId:string;expectedVersion:number}){
    return restaurantWork(ownerId,input.expectedVersion,(state,signal)=>loadRestaurantMenu(ownerId,state,input.restaurantId,signal));
  }
  async function loadMoreRestaurants(ownerId:string,state:StoredAssistant,signal:AbortSignal){
      const {browser,context}=restaurantState(state),offset=context.nextOffset;
      if(!deps.restaurants||offset===null||context.seenOffsets.includes(offset)||browser.restaurants.length>=100)throw new AppError("NO_MORE_RESULTS","There are no more verified restaurant pages. Choose another category to search again.",422);
      const item=state.task.items.find(item=>item.id===context.itemId)!;
      const result=await deps.restaurants(ownerId,state.task,item,signal,context);
      if(!result.context||result.context.addressId!==context.addressId)throw new AppError("ADDRESS_CHANGED","Your delivery address changed. Search the category again.",409);
      browser.restaurants=[...new Map([...browser.restaurants,...result.restaurants].map(card=>[card.id,card])).values()].slice(0,100);
      state.restaurantContext={...result.context,restaurantIds:{...context.restaurantIds,...result.context.restaurantIds},seenOffsets:[...context.seenOffsets,offset],nextMenuPage:context.nextMenuPage,seenMenuPages:context.seenMenuPages};
      browser.hasMore=result.context.nextOffset!==null&&!state.restaurantContext.seenOffsets.includes(result.context.nextOffset)&&browser.restaurants.length<100;
      if(!browser.hasMore)state.restaurantContext.nextOffset=null;
      state.notices=unique([...state.notices,...result.notices]);
  }
  async function moreRestaurants(ownerId:string,expectedVersion:number){
    return restaurantWork(ownerId,expectedVersion,(state,signal)=>loadMoreRestaurants(ownerId,state,signal));
  }
  async function loadMoreMenu(ownerId:string,state:StoredAssistant,signal:AbortSignal){
      const {browser,context}=restaurantState(state),page=context.nextMenuPage;
      const card=browser.restaurants.find(card=>card.id===browser.selectedRestaurantId);
      if(!browser.menu||!card||!deps.menu||page===null||context.seenMenuPages.includes(page))throw new AppError("NO_MORE_RESULTS","No more verified menu pages are available.",422);
      const result=await deps.menu(ownerId,context,card,signal,page,state.task);
      if(result.menu.restaurantId!==card.id)throw new AppError("MENU_CHANGED","The restaurant returned an unexpected menu.",409);
      const existing=browser.menu.sections;
      for(const section of result.menu.sections){const old=existing.find(value=>value.id===section.id);if(old)old.items=[...new Map([...old.items,...section.items].map(offer=>[offer.id,offer])).values()];else existing.push(section);}
      context.seenMenuPages.push(page);context.nextMenuPage=result.nextPage!==null&&!context.seenMenuPages.includes(result.nextPage)?result.nextPage:null;
      browser.menu={...result.menu,sections:existing.slice(0,100),hasMore:context.nextMenuPage!==null&&existing.length<100,notices:unique([...browser.menu.notices,...result.menu.notices])};
      if(!browser.menu.hasMore)context.nextMenuPage=null;
  }
  async function moreMenu(ownerId:string,expectedVersion:number){
    return restaurantWork(ownerId,expectedVersion,(state,signal)=>loadMoreMenu(ownerId,state,signal));
  }
  async function backRestaurants(ownerId:string,expectedVersion:number){
    return restaurantWork(ownerId,expectedVersion,async state=>{const {browser,context}=restaurantState(state);browser.selectedRestaurantId=null;browser.menu=null;context.nextMenuPage=null;context.seenMenuPages=[];});
  }
  function selectMenuInto(state:StoredAssistant,input:{offerId:string;quantity:number}){
      const {browser,context}=restaurantState(state),menu=browser.menu;
      const offer=menu?.sections.flatMap(section=>section.items).find(offer=>offer.id===input.offerId);
      if(!offer)throw new AppError("OFFER_UNAVAILABLE","Choose a dish from the current restaurant menu.",422);
      const matches=state.task.items.filter(item=>{const selected=state.offers.find(value=>value.id===item.selectedOfferId);return selected?.provider===offer.provider&&selected.providerItemId===offer.providerItemId;});
      const existing=matches.find(item=>item.id===context.itemId)??matches[0];
      if(matches.some(item=>item.status==="added"))throw new AppError("ITEM_ALREADY_PREPARED","This dish is already prepared. Review it in your bag.",409);
      if(!Number.isInteger(input.quantity)||input.quantity<0||input.quantity>Math.min(99,offer.maxQuantity??99))throw new AppError("QUANTITY_LIMIT","Choose a quantity within the available limit.",422);
      if(input.quantity===0){
        const ids=new Set(matches.map(item=>item.id)),offerIds=new Set(matches.map(item=>item.selectedOfferId));
        state.task.items=state.task.items.filter(item=>!ids.has(item.id)||item.id===context.itemId);
        const draft=state.task.items.find(item=>ids.has(item.id));if(draft){draft.selectedOfferId=null;draft.status="needs_choice";draft.label=context.query;}
        state.offers=state.offers.filter(value=>!offerIds.has(value.id));return;
      }
      if(menu?.restaurant.isOpen!==true||!offer.available||!offer.selectable)throw new AppError("OFFER_UNAVAILABLE","This dish is not currently confirmed available. Choose another dish or restaurant.",422);
      if(existing){
        const duplicates=new Set(matches.filter(item=>item.id!==existing.id).map(item=>item.id));
        state.task.items=state.task.items.filter(item=>!duplicates.has(item.id));state.offers=state.offers.filter(value=>!duplicates.has(value.itemId));
        existing.quantity=input.quantity;existing.status="selected";state.offers=state.offers.map(value=>value.id===existing.selectedOfferId?{...offer,id:value.id,itemId:existing.id}:value);
      }
      else{
        const draft=state.task.items.find(item=>item.id===context.itemId&&!item.selectedOfferId&&item.status!=="added");
        if(!draft&&state.task.items.length>=30)throw new AppError("PLAN_LIMIT","Your plan has 30 items. Remove a dish before adding another.",422);
        const itemId=draft?.id??opaqueId("dish"),saved={...offer,id:`${itemId}:${offer.id}`,itemId};
        if(draft){draft.label=offer.name;draft.quantity=input.quantity;draft.status="selected";draft.selectedOfferId=saved.id;}
        else state.task.items.push({id:itemId,label:offer.name,query:offer.name,quantity:input.quantity,route:"restaurant",status:"selected",selectedOfferId:saved.id});
        state.offers=state.offers.filter(value=>state.task.items.some(item=>item.selectedOfferId===value.id)).concat(state.offers.filter(value=>!state.task.items.some(item=>item.selectedOfferId===value.id)).slice(0,Math.max(0,199-state.task.items.filter(item=>item.selectedOfferId).length)));state.offers.push(saved);
      }
      state.status="selected";
      state.messages.push(message("assistant",`Saved ${input.quantity} × ${offer.name} from ${offer.restaurant??menu!.restaurant.name} to your plan. Keep browsing the menu or review your choices. Checkout is completed in Swiggy.`));
  }
  async function selectMenuOffer(ownerId:string,input:{offerId:string;quantity:number;expectedVersion:number}){
    return restaurantWork(ownerId,input.expectedVersion,async state=>{selectMenuInto(state,input);state.proposal=null;});
  }
  async function speechText(ownerId:string,messageId:string,expectedVersion:number){
    const state=await load(ownerId),latest=state.messages.at(-1);
    if(state.version!==expectedVersion||latest?.id!==messageId||latest.role!=="assistant")throw new AppError("STALE_SPEECH","Only the latest assistant reply can be played.",409);
    return speakable(latest.speech??latest.text).slice(0,1800);
  }
  return {get,browse,groceryHome,recordTurn,announce,clearRestaurantCart,clearOrderedGroceries,search,more,select,setCartLine,prepare,reset,stop,speechText,openRestaurant,moreRestaurants,moreMenu,backRestaurants,selectMenuOffer};
}
