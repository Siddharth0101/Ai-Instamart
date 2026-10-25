import { z } from "zod";
import type { AssistantView, MealOffer, ProviderState, ShoppingTask } from "../lib/assistant-contracts";
import { AssistantViewSchema } from "../lib/assistant-contracts";
import type { Address, Product, SessionView, Quote } from "../lib/contracts";
import { createAssistantService, type AssistantSearchResult, type AssistantPage, type PreparationResult, type RestaurantContext, type RestaurantSearchResult, type RestaurantMenuResult } from "./assistant";
import { instamartProvider, getOwner, getView, startSession, rememberProducts, updateCart, createQuote, getCurrentAttempt, selectAddress } from "./service";
import { FoodGateway } from "./integrations/food";
import { fixtureEnabled, fixtureAddresses, fixtureMenu, fixtureOrdering, fixtureProviders, fixtureRestaurants } from "./integrations/food-fixture";
import { createFoodCheckoutService } from "./food-checkout";
import type { OAuthState } from "./integrations/swiggy";
import { normalizeSwiggyProducts } from "./integrations/swiggy-mapping";
import { appOrigin } from "./origin";
import { read, transaction, write } from "./store";
import { fingerprint, seal, unseal } from "./crypto";
import { AppError } from "./errors";

/** Swiggy Food sends whole-rupee prices (checked 25 Oct 2026: a chicken biryani at 338, a veg bowl at 129). SWIGGY_FOOD_PRICE_UNIT=paise overrides it. */
const foodPriceUnit=()=>process.env.SWIGGY_FOOD_PRICE_UNIT==="paise"?"paise" as const:"rupees" as const;
export function foodGateway(ownerId:string){
  const scope=`${ownerId}:swiggy_food`;
  return new FoodGateway({ownerId,callbackUrl:`${appOrigin()}/api/integrations/swiggy-food/callback`,priceUnit:foodPriceUnit(),
    storage:{
      async read(){const value=await read<string>(ownerId,"oauth","swiggy_food");return value?unseal<OAuthState>(value,scope):null;},
      async write(value){await transaction(tx=>value?tx.put(ownerId,"oauth","swiggy_food",seal(value,scope)):tx.remove(ownerId,"oauth","swiggy_food"));},
      async update(change){await transaction(async tx=>{const value=await tx.get<string>(ownerId,"oauth","swiggy_food");const next=change(value?unseal<OAuthState>(value,scope):null);if(next)await tx.put(ownerId,"oauth","swiggy_food",seal(next,scope));else await tx.remove(ownerId,"oauth","swiggy_food");});}
    }
  });
}
async function providers(ownerId:string):Promise<ProviderState[]>{
  if(fixtureEnabled())return fixtureProviders();
  const values=await Promise.allSettled([
    (async()=>{const provider=instamartProvider(ownerId);try{return (await provider.readiness()).connected;}finally{await provider.close();}})(),
    (async()=>{const provider=foodGateway(ownerId);try{return (await provider.readiness()).connected;}finally{await provider.close();}})(),
  ]);
  return [
    {id:"instamart",name:"Instamart",status:values[0].status==="fulfilled"&&values[0].value?"connected":"disconnected",message:"Products, live bag, full bill and confirmed checkout."},
    {id:"swiggy_food",name:"Swiggy Food",status:values[1].status==="fulfilled"&&values[1].value?"connected":"disconnected",message:"Restaurants, menus, cart, payment and live order tracking."},
    {id:"zomato",name:"Zomato",status:"access_required",message:"Custom-app access is required from Zomato before this connection can be enabled."},
  ];
}
async function shoppingSession(ownerId:string):Promise<SessionView>{
  const owner=await getOwner(ownerId);
  if(!owner)throw new AppError("UNAUTHORIZED","Refresh the page to start a session.",401);
  return owner.sessionId?getView(ownerId,owner.sessionId):startSession(ownerId,"live");
}
/** Groceries go where the customer asked food to go: the saved Instamart address with the same name (Home, Work), when there is one. */
export async function instamartSession(ownerId:string,follow=false):Promise<SessionView>{
  const session=await shoppingSession(ownerId);
  if((session.addressId&&!follow)||!session.addresses.length)return session;
  const food=await read<{label?:string}>(ownerId,"assistant_context","food_address"),label=food?.label?.trim().toLowerCase();
  const match=session.addresses.find(address=>!!label&&address.label.split(" · ")[0].trim().toLowerCase()===label)??(!session.addressId&&session.addresses.length===1?session.addresses[0]:undefined);
  return match&&match.id!==session.addressId?selectAddress(ownerId,session.sessionId,match.id):session;
}
const stopped=(signal:AbortSignal)=>{if(signal.aborted)throw new AppError("TURN_STOPPED","Stopped new work. Your plan is saved.",409);};
async function search(ownerId:string,task:ShoppingTask,items:ShoppingTask["items"],signal:AbortSignal,page?:AssistantPage):Promise<AssistantSearchResult>{
  const state=await providers(ownerId),notices:string[]=[],offers:MealOffer[]=[],products:Product[]=[],pages:AssistantPage[]=[];
  if(page&&(!items.some(item=>item.id===page.itemId&&item.query===page.query)||page.nextOffset===null))throw new AppError("SEARCH_CHANGED","Choose a category and search again before loading more results.",409);
  if(page&&state.find(provider=>provider.id===page.provider)?.status!=="connected")throw new AppError("SWIGGY_RECONNECT_REQUIRED","Reconnect the shop and search the category again to load current items.",401);
  const groceryItems=items.filter(item=>item.route==="instamart"),foodItems=items.filter(item=>item.route==="restaurant");
  let session:SessionView|undefined,needsAddress=false;
  if(groceryItems.length&&state.find(provider=>provider.id==="instamart")?.status==="connected"){
    session=await instamartSession(ownerId);
    if(page&&(page.provider!=="instamart"||session.addressId!==page.addressId))throw new AppError("ADDRESS_CHANGED","The delivery address changed. Search again at the current address before loading more items.",409);
    if(!session.addressId){needsAddress=true;notices.push("Choose your saved Instamart delivery address to see available packs.");}
  }
  const foodAddress=await read<{id:string}>(ownerId,"assistant_context","food_address");
  if(page?.provider==="swiggy_food"&&foodAddress&&foodAddress.id!==page.addressId)throw new AppError("ADDRESS_CHANGED","Your Food delivery address changed. Search the category again.",409);
  const jobs=[
    ...groceryItems.map(item=>async()=>{
      stopped(signal);if(!session?.addressId)return;
      const provider=instamartProvider(ownerId);
      try{
        const offset=page?.nextOffset??0;
        const response=await provider.searchProducts({addressId:session.addressId,query:item.query.slice(0,200),...(offset?{offset}:{})});
        stopped(signal);const all=normalizeSwiggyProducts(response),found=all.slice(0,200);products.push(...found);
        const cursor=/^\d+$/.test(response.nextOffset)?Number(response.nextOffset):null;
        const nextOffset=found.length&&cursor!==null&&Number.isSafeInteger(cursor)&&cursor>offset?cursor:null;
        pages.push({itemId:item.id,query:item.query,provider:"instamart",addressId:session.addressId,offset,nextOffset});
        if(all.length>found.length)notices.push("This search page is very large. Narrow your category or use the full Instamart store for more specific matches.");
        offers.push(...found.toSorted((a,b)=>Number(b.available)-Number(a.available)).map(product=>({id:`${item.id}:${product.id}`,itemId:item.id,provider:"instamart" as const,providerItemId:product.id,name:product.name,restaurant:null,unit:product.unit,priceMinor:product.priceMinor,available:product.available,...(product.imageUrl?{imageUrl:product.imageUrl}:{}),...(product.maxQuantity!==undefined?{maxQuantity:product.maxQuantity}:{}),etaMinutes:null,description:product.brand,selectable:product.available})));
      }finally{await provider.close();}
    }),
    ...foodItems.map(item=>async()=>{
      stopped(signal);if(state.find(provider=>provider.id==="swiggy_food")?.status!=="connected"){notices.push("Connect Swiggy Food to search live restaurant dishes. Zomato remains unavailable until app access is approved.");return;}
      const provider=foodGateway(ownerId);
      try{
        const vegetarianOnly=task.dietary.some(value=>/^(?:vegetarian|veg|vegan|jain)$/i.test(value))&&!task.dietary.some(value=>/non.?veg|mixed/i.test(value));
        const result=await provider.searchMeals({query:item.query.slice(0,200),itemId:item.id,...(page?{addressId:page.addressId,offset:page.nextOffset!}:foodAddress?{addressId:foodAddress.id}:{}),vegetarianOnly,limit:50,signal});
        stopped(signal);offers.push(...result.offers.map(offer=>({...offer,id:`${item.id}:${offer.id}`})));notices.push(...result.notices);if(result.status==="needs_address")needsAddress=true;
        if(page&&result.status==="needs_address")throw new AppError("ADDRESS_REQUIRED","Choose a current Food delivery address and search the category again.",422);
        if(result.addressId)pages.push({itemId:item.id,query:item.query,provider:"swiggy_food",addressId:result.addressId,offset:page?.nextOffset??0,nextOffset:result.hasMore?result.nextOffset:null});
      }finally{await provider.close();}
    }),
  ];
  // Bound live sessions and queries; a failed service does not erase other results.
  for(let offset=0;offset<jobs.length;offset+=3){
    stopped(signal);const results=await Promise.allSettled(jobs.slice(offset,offset+3).map(job=>job()));
    for(const result of results)if(result.status==="rejected"){
      if(signal.aborted||page)throw result.reason;
      notices.push(result.reason instanceof AppError?result.reason.message:"Some live results could not be loaded. Your plan is saved; retry the search or reconnect the service.");
    }
  }
  stopped(signal);
  if(session?.addressId&&products.length)await rememberProducts(ownerId,session.sessionId,session.addressId,products.slice(0,500));
  if(foodItems.length&&state.find(provider=>provider.id==="zomato")?.status!=="connected")notices.push("Restaurant results currently come from connected Swiggy Food only; Zomato access is not enabled.");
  return {offers,notices,needsAddress,pages};
}

async function restaurants(ownerId:string,_task:ShoppingTask,item:ShoppingTask["items"][number],signal:AbortSignal,context?:RestaurantContext):Promise<RestaurantSearchResult>{
  const address=await read<{id:string}>(ownerId,"assistant_context","food_address");
  // Restaurants depend on where the food goes: never list them before the customer chooses an address.
  if(!address)return {restaurants:[],context:null,notices:[],needsAddress:true};
  if(fixtureEnabled())return fixtureRestaurants(item,context,address.id);
  if(context&&address.id!==context.addressId)throw new AppError("ADDRESS_CHANGED","Your Food delivery address changed. Search this category again.",409);
  const provider=foodGateway(ownerId);
  try{
    const result=await provider.searchRestaurants({query:item.query.slice(0,200),itemId:item.id,...(context?{addressId:context.addressId,offset:context.nextOffset!}:address?{addressId:address.id}:{}),signal});
    stopped(signal);
    const ids:Record<string,string>={};
    const cards=result.restaurants.map(card=>{const id=`restaurant:${fingerprint({provider:card.provider,nativeId:card.id,address:result.addressId})}`;ids[id]=card.id;return {...card,id};});
    return {restaurants:cards,needsAddress:result.status==="needs_address",notices:result.notices,
      context:result.addressId?{itemId:item.id,query:item.query,addressId:result.addressId,restaurantIds:ids,nextOffset:result.nextOffset,seenOffsets:[context?.nextOffset??0],nextMenuPage:null,seenMenuPages:[]}:null};
  }finally{await provider.close();}
}
async function menu(ownerId:string,context:RestaurantContext,card:import("../lib/assistant-contracts").RestaurantCard,signal:AbortSignal,page=1,task?:ShoppingTask):Promise<RestaurantMenuResult>{
  const native=context.restaurantIds[card.id];
  if(!native||card.provider!=="swiggy_food")throw new AppError("RESTAURANT_UNAVAILABLE","Choose a restaurant from the current list.",422);
  if(fixtureEnabled())return fixtureMenu(context,card);
  const address=await read<{id:string}>(ownerId,"assistant_context","food_address");
  if(address&&address.id!==context.addressId)throw new AppError("ADDRESS_CHANGED","Your Food delivery address changed. Search this category again.",409);
  const provider=foodGateway(ownerId);
  try{
    const vegetarianOnly=!!task?.dietary.some(value=>/^(?:vegetarian|veg|vegan|jain)$/i.test(value))&&!task?.dietary.some(value=>/non.?veg|mixed/i.test(value));
    const result=await provider.getMenu({restaurantId:native,itemId:context.itemId,addressId:context.addressId,page,pageSize:8,vegetarianOnly,signal});stopped(signal);
    if(task?.dietary.some(value=>/vegan|jain|allerg|cross.contact|no nuts|nut.free/i.test(value))){result.sections=result.sections.map(section=>({...section,items:section.items.map(offer=>({...offer,selectable:false}))}));result.notices.push("This menu does not verify your ingredient or allergen restrictions. Confirm suitable dishes with the restaurant before selection.");}
    return {menu:{restaurantId:card.id,restaurant:{...card,...result.restaurant,cuisines:result.restaurant.cuisines.length?result.restaurant.cuisines:card.cuisines,rating:result.restaurant.rating??card.rating,area:result.restaurant.area??card.area,costForTwo:result.restaurant.costForTwo??card.costForTwo,imageUrl:result.restaurant.imageUrl??card.imageUrl,distanceKm:result.restaurant.distanceKm??card.distanceKm,id:card.id},sections:result.sections,hasMore:result.hasMore,notices:result.notices},nextPage:result.nextPage};
  }finally{await provider.close();}
}

/** What SayCart last put in the Instamart bag, per product, for one session and address: a later change moves only that share. */
type BagShare={sessionId:string;addressId:string;quantities:Record<string,number>};
/** Instamart packs chosen in this cart, by Swiggy product. */
function chosenPacks(view:Pick<AssistantView,"task"|"offers">,only:(item:ShoppingTask["items"][number])=>boolean=()=>true){
  const packs=new Map<string,number>();
  for(const item of view.task.items){
    const offer=item.selectedOfferId?view.offers.find(entry=>entry.id===item.selectedOfferId):undefined;
    if(offer?.provider==="instamart"&&only(item))packs.set(offer.providerItemId,(packs.get(offer.providerItemId)??0)+item.quantity);
  }
  return packs;
}
function allergyGate(view:Pick<AssistantView,"task">){
  const dietary=view.task.dietary.filter(value=>!/^(?:none|no allergies|no known allergies|no allergies reported|no known allergies reported)$/i.test(value));
  if(dietary.some(value=>/allerg|cross.contact|no nuts|nut.free/i.test(value)))throw new AppError("DIETARY_VERIFICATION_REQUIRED","These catalog results do not verify allergen or cross-contact suitability. Verify suitable items with the provider before ordering.",422);
}
const bagQueues=new Map<string,Promise<unknown>>();
/**
 * Keeps the Instamart bag in step with the groceries chosen here, as the Swiggy Food cart is with dishes: each change moves
 * only SayCart's own share of a pack, so packs the customer added in the Swiggy app stay. `session` is null when nothing changed.
 */
export async function syncInstamartBag(ownerId:string,signal?:AbortSignal):Promise<{session:SessionView|null;empty:boolean}>{
  const run=(bagQueues.get(ownerId)??Promise.resolve()).catch(()=>{}).then(()=>mirrorGroceries(ownerId,signal));
  bagQueues.set(ownerId,run);
  try{return await run;}finally{if(bagQueues.get(ownerId)===run)bagQueues.delete(ownerId);}
}
async function mirrorGroceries(ownerId:string,signal?:AbortSignal){
  // Read inside the queue, so the last sync always mirrors the latest choices.
  const view=await read<Pick<AssistantView,"task"|"offers">>(ownerId,"assistant","current"),wanted=view?chosenPacks(view):new Map<string,number>();
  const prior=await read<BagShare>(ownerId,"assistant_context","instamart_share");
  if(!prior&&!wanted.size)return {session:null,empty:true};
  const owner=await getOwner(ownerId),stored=owner?.sessionId?await read<{addressId:string|null}>(ownerId,"session",owner.sessionId):null;
  // Already there: a change that left the groceries alone needs no Swiggy round trip.
  if(prior&&prior.sessionId===owner?.sessionId&&prior.addressId===stored?.addressId&&Object.keys(prior.quantities).length===wanted.size&&[...wanted].every(([id,quantity])=>prior.quantities[id]===quantity))return {session:null,empty:!wanted.size};
  if(wanted.size)allergyGate(view!);
  if(signal)stopped(signal);
  let session=await instamartSession(ownerId);
  if(!session.addressId)throw new AppError("ADDRESS_REQUIRED","Choose where to deliver your Instamart order first: say Home or Work.",422);
  // Packs put in the bag before it followed this cart were added on top of it, so they count as SayCart's share.
  const share:Record<string,number>=prior?prior.sessionId===session.sessionId&&prior.addressId===session.addressId?{...prior.quantities}:{}:Object.fromEntries(chosenPacks(view!,item=>item.status==="added"));
  for(const productId of new Set([...wanted.keys(),...Object.keys(share)])){
    if(signal)stopped(signal);
    const live=session.cart.lines.find(line=>line.product.id===productId)?.quantity??0;
    // What the customer added in the Swiggy app is kept; only SayCart's share moves.
    const target=live-Math.min(share[productId]??0,live)+(wanted.get(productId)??0);
    if(target!==live){
      try{session=await updateCart(ownerId,{sessionId:session.sessionId,productId,quantity:target,expectedCartRevision:session.cart.revision});}
      catch(error){
        // Read after an ambiguous edit, never repeat it blindly.
        session=await shoppingSession(ownerId);
        if((session.cart.lines.find(line=>line.product.id===productId)?.quantity??0)!==target)throw error;
      }
    }
    if(wanted.get(productId))share[productId]=wanted.get(productId)!;else delete share[productId];
    await write(ownerId,"assistant_context","instamart_share",{sessionId:session.sessionId,addressId:session.addressId!,quantities:share} satisfies BagShare);
  }
  return {session,empty:!wanted.size};
}
/** Instamart checkout: the bag already follows this cart, so bring it up to date, read the live bill and, with a payment chosen, review the total. */
async function prepare(ownerId:string,view:AssistantView,signal:AbortSignal):Promise<PreparationResult>{
  const selected=view.task.items.filter(item=>item.selectedOfferId).map(item=>({item,offer:view.offers.find(offer=>offer.id===item.selectedOfferId)}));
  if(selected.some(({offer})=>!offer))throw new AppError("STALE_SELECTION","Search again to refresh selected items before preparing the bag.",409);
  const groceries=selected.filter(({offer})=>offer!.provider==="instamart");
  const restaurant=selected.filter(({offer})=>offer!.provider!=="instamart");
  if(!groceries.length)throw new AppError("NO_GROCERIES","Add Instamart items first. Restaurant dishes check out separately: say checkout.",422);
  allergyGate(view);
  stopped(signal);
  const session=(await syncInstamartBag(ownerId,signal)).session??await instamartSession(ownerId);
  if(!session.addressId)throw new AppError("ADDRESS_REQUIRED","Choose where to deliver your Instamart order first: say Home or Work.",422);
  const notices:string[]=[];
  if(view.task.eventDate||view.task.serveBy)notices.push("This bag uses current stock and delivery availability. Your event plan is saved, but no future delivery or stock reservation has been booked.");
  if(restaurant.length)notices.push("Only your Instamart items are in this bill. Your restaurant dishes check out separately.");
  if(view.task.budgetMinor!==null&&session.cart.totals.totalMinor>view.task.budgetMinor){
    notices.push("The refreshed complete provider bill is above your budget. Review or adjust the bag before checkout.");
    return {session,addedOfferIds:[],notices};
  }
  const quote=session.paymentMethodId?await createQuote(ownerId,session.sessionId,session.cart.revision):undefined;
  // Nothing is locked: the bag keeps following quantity changes made here.
  return {session,...(quote?{quote}:{}),addedOfferIds:[],notices};
}
async function narration(ownerId:string,kind:"review"|"order"|"settings",quoteId?:string){
  if(kind==="settings"){
    const owner=await getOwner(ownerId);const session=owner?.sessionId?await getView(ownerId,owner.sessionId):null;
    const food=await read<{id:string;label?:string}>(ownerId,"assistant_context","food_address");
    return `Delivery settings saved.${food?.label?` Swiggy Food address: ${food.label}.`:""}${session?` Instamart address: ${session.addresses.find(a=>a.id===session.addressId)?.label??"not selected"}. Payment: ${session.payments.find(p=>p.id===session.paymentMethodId)?.label??"not selected"}.`:""} Say “review my choices” to continue.`;
  }
  if(kind==="order"){const attempt=await getCurrentAttempt(ownerId);return attempt?`${attempt.message}${attempt.paymentUrl?" Complete payment in the provider app using the link on screen.":""}`:"No order has been submitted.";}
  const record=quoteId?await read<{quote:Quote;consumed:boolean}>(ownerId,"quote",quoteId):null;
  if(!record||record.consumed||Date.parse(record.quote.expiresAt)<=Date.now())throw new AppError("STALE_REVIEW","Get a fresh checkout review before ordering.",409);
  const q=record.quote;
  return `Final total ₹${(q.cart.totals.totalMinor/100).toFixed(2)}, including fees. Deliver to ${q.address.label}, ${q.address.reviewAddressText}. Payment: ${q.payment.label}. ${q.cart.lines.slice(0,4).map(l=>`${l.quantity} ${l.product.name}`).join(", ")}.${q.cart.lines.length>4?` Plus ${q.cart.lines.length-4} other lines shown in your review.`:""} Check the full bill on screen. To approve this exact order, say “place this order”. A simple yes will not place it.`;
}
export const assistant=createAssistantService({providers,search,restaurants,menu,prepare,narration,foodAddresses:ownerId=>foodAddresses(ownerId),more:(ownerId,task,item,page,signal)=>search(ownerId,task,[item],signal,page)});

export async function foodAddresses(ownerId:string):Promise<{addresses:Address[];selectedAddressId:string|null}>{
  if(fixtureEnabled()){const selected=await read<{id:string}>(ownerId,"assistant_context","food_address");return {addresses:fixtureAddresses(),selectedAddressId:selected?.id??null};}
  const provider=foodGateway(ownerId);
  try{
    if(!(await provider.readiness()).connected)return {addresses:[],selectedAddressId:null};
    const addresses:Address[]=[];
    for(let page=1;page<=10;page++){
      const response=await provider.getAddresses({page,pageSize:10});
      addresses.push(...response.addresses.map(address=>({id:address.id,label:address.addressTag||address.addressCategory||"Saved Food address",reviewAddressText:address.addressLine})));
      if(!response.pagination.hasMore)break;
    }
    const selected=await read<{id:string}>(ownerId,"assistant_context","food_address");
    return {addresses,selectedAddressId:selected&&addresses.some(address=>address.id===selected.id)?selected.id:null};
  }finally{await provider.close();}
}
export async function selectFoodAddress(ownerId:string,addressId:string,expectedVersion:number){
  const available=await foodAddresses(ownerId);
  if(!available.addresses.some(address=>address.id===addressId))throw new AppError("INVALID_ADDRESS","Choose a current saved Swiggy Food address.",422);
  await transaction(async tx=>{
    const state=await tx.get<AssistantView&{active?:unknown;browseCursors?:Array<AssistantPage&{buffer:MealOffer[];seenOffsets:number[]}>}>(ownerId,"assistant","current");
    if(!state||state.version!==expectedVersion||state.active)throw new AppError("PLAN_CHANGED","Your plan changed. Refresh it before selecting the address.",409);
    state.version++;state.offers=state.offers.filter(offer=>offer.provider==="instamart");
    state.task.items=state.task.items.map(item=>item.route==="restaurant"?{...item,status:"planned",selectedOfferId:null}:item);
    state.browseCursors=state.browseCursors?.filter(cursor=>cursor.provider==="instamart");
    state.browsePages=(state.browsePages??[]).filter(page=>state.browseCursors?.some(cursor=>cursor.itemId===page.itemId));
    state.restaurantBrowser=null;state.proposal=null;state.presentation=null;state.questions=state.questions.filter(question=>question.id!=="food_address");
    state.status="ready";state.updatedAt=new Date().toISOString();
    await tx.put(ownerId,"assistant_context","food_address",{id:addressId,label:available.addresses.find(a=>a.id===addressId)?.label});
    await tx.put(ownerId,"assistant","current",{...AssistantViewSchema.parse(state),browseCursors:state.browseCursors??[]});
  });
  // The Instamart bag follows the same choice when an address of that name exists; nothing breaks if it doesn't.
  if((await providers(ownerId)).some(provider=>provider.id==="instamart"&&provider.status==="connected"))await instamartSession(ownerId,true).catch(()=>undefined);
  return assistant.get(ownerId);
}
export const AssistantSpeechSchema=z.object({messageId:z.string().min(1).max(200),expectedVersion:z.number().int().nonnegative()});

/** Restaurant checkout: the live Swiggy Food cart, bill, payment and order for the chosen address. */
/** Swiggy Food ordering for one owner: the live account, or the development fixture. */
export const foodOrdering=(ownerId:string)=>fixtureEnabled()?fixtureOrdering(ownerId):foodGateway(ownerId);
export const foodCheckout=createFoodCheckoutService({
  provider:foodOrdering,
  async address(ownerId){
    const selected=await read<{id:string}>(ownerId,"assistant_context","food_address");
    if(!selected)throw new AppError("ADDRESS_REQUIRED","Choose where to deliver first.",422);
    const address=(await foodAddresses(ownerId)).addresses.find(entry=>entry.id===selected.id);
    if(!address)throw new AppError("ADDRESS_CHANGED","Your saved delivery address changed. Choose it again.",409);
    return address;
  },
  selection:ownerId=>assistant.get(ownerId),
  priceUnit:foodPriceUnit(),
});
