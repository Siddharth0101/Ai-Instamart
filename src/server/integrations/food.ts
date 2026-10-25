import { createHash } from "node:crypto";
import { z } from "zod";
import { MealOfferSchema, RestaurantCardSchema, type MealOffer, type RestaurantCard, type RestaurantMenu } from "../../lib/assistant-contracts";
import { SwiggyGateway, SwiggyGatewayError, type SwiggyGatewayOptions } from "./swiggy";
import { FoodReadArguments, FoodRestaurantMenuSchema, FoodMenuCategorySchema, type FoodMenuItem } from "./food-schemas";
import type { SwiggyAddresses } from "./swiggy-schemas";
import type { FoodCart, FoodOrderingGateway, FoodPaymentOption, FoodPlaceResult } from "./food-ordering-types";
import type { FoodCartResponseSchema, FoodPaymentOptionsSchema } from "./food-ordering-schemas";

export type FoodGatewayOptions = Omit<SwiggyGatewayOptions,"service"> & {
  /** Set only after checking the deployed provider's numeric price contract.
   * The public reference currently leaves the unit unspecified, so default to
   * an unknown price instead of guessing a rupees/paise conversion.
   */
  priceUnit?:"rupees"|"paise";
};
export type FoodAddress = {id:string;label:string;addressLine:string};
export type FoodSearchResult = {
  status:"ready"|"needs_address";
  offers:MealOffer[];
  addresses:FoodAddress[];
  addressId:string|null;
  notices:string[];
  hasMore:boolean;
  nextOffset:number|null;
};
const inputSchema = z.strictObject({
  query:z.string().trim().min(1).max(200),itemId:z.string().min(1).max(300),
  addressId:z.string().min(1).max(300).optional(),limit:z.number().int().min(1).max(50).default(30),offset:z.number().int().nonnegative().optional(),
  vegetarianOnly:z.boolean().optional(),
});
export type FoodSearchInput = z.input<typeof inputSchema> & {signal?:AbortSignal};
const restaurantInputSchema=z.strictObject({
  query:z.string().trim().min(1).max(200),itemId:z.string().min(1).max(300),
  addressId:z.string().min(1).max(300).optional(),
  offset:z.union([z.number().int().nonnegative().safe(),z.string().regex(/^\d+$/).max(16)]).optional(),
});
const menuInputSchema=z.strictObject({
  restaurantId:z.string().min(1).max(300),itemId:z.string().min(1).max(300),
  addressId:z.string().min(1).max(300),page:z.number().int().min(1).max(1000).default(1),
  pageSize:z.number().int().min(1).max(8).default(5),vegetarianOnly:z.boolean().optional(),
});
export type FoodRestaurantSearchInput=z.input<typeof restaurantInputSchema>&{signal?:AbortSignal};
export type FoodRestaurantSearchResult={
  status:"ready"|"needs_address";restaurants:RestaurantCard[];addressId:string|null;notices:string[];
  hasMore:boolean;nextOffset:number|null;
};
export type FoodMenuInput=z.input<typeof menuInputSchema>&{signal?:AbortSignal};
export type FoodMenuResult=RestaurantMenu&{nextPage:number|null};

function boundedSignal(caller?:AbortSignal):AbortSignal{
  const signal=caller?AbortSignal.any([caller,AbortSignal.timeout(45_000)]):AbortSignal.timeout(45_000);
  signal.throwIfAborted();return signal;
}
/** Images are presentation only. Do not make the customer's browser fetch
 * arbitrary external URLs returned in a provider response. */
function foodImage(value:string|undefined):string|undefined{
  if(!value)return undefined;
  try{
    const url=new URL(value);
    if(url.protocol!=="https:"||url.username||url.password||url.port)return undefined;
    if(url.hostname==="swiggy.com"||url.hostname.endsWith(".swiggy.com")||(url.hostname==="res.cloudinary.com"&&url.pathname.startsWith("/swiggy/")))return url.href;
  }catch{/* Omit an unsafe or malformed image without hiding valid dishes. */}
  return undefined;
}
function rating(value:number|undefined):number|null{return value!==undefined&&value>=0&&value<=5?value:null;}
function nextRestaurantOffset(value:string|number|undefined,current:number):number|null{
  // The output DTO permits strings while the documented tool input is a
  // numeric offset. Numeric strings are interoperable; opaque cursors are not.
  const number=typeof value==="string"&&/^\d+$/.test(value)?Number(value):value;
  return typeof number==="number"&&Number.isSafeInteger(number)&&number>current?number:null;
}
function menuRestaurant(data:z.infer<typeof FoodRestaurantMenuSchema>["restaurant"]):RestaurantCard{
  const imageUrl=foodImage(data.imageUrl);
  return RestaurantCardSchema.parse({id:data.id,provider:"swiggy_food",name:data.name,cuisines:data.cuisines??[],rating:rating(data.avgRating),
    etaMinutes:data.deliveryTime??null,costForTwo:data.costForTwoMessage??null,area:data.areaName??null,
    isOpen:data.isOpen??null,...(imageUrl?{imageUrl}:{})});
}

function publicAddresses(data:SwiggyAddresses):FoodAddress[]{
  return data.addresses.map(address=>({id:address.id,label:address.addressTag||address.addressCategory||"Saved address",addressLine:address.addressLine}));
}
/** A ranked address is a suggestion, never an implicit user choice. */
export function resolveFoodAddress(data:SwiggyAddresses,selectedAddressId?:string):string|null{
  const ids=new Set(data.addresses.map(address=>address.id));
  if(selectedAddressId)return ids.has(selectedAddressId)?selectedAddressId:null;
  const resolution=data.resolution;
  if(!resolution.defaultAddressId||!ids.has(resolution.defaultAddressId)||resolution.needsUserClarification)return null;
  if(data.pagination.total===1||["explicit_user_address","user_selected_address"].includes(resolution.resolutionSource))return resolution.defaultAddressId;
  return null;
}
/** All follow-up identifiers are copied from the same validated provider item. */
export function foodOfferIdentity(item:Pick<FoodMenuItem,"restaurant_id"|"menu_item_id">):{id:string;providerItemId:string}|null{
  if(!item.restaurant_id||!item.menu_item_id)return null;
  const tuple=JSON.stringify([item.restaurant_id,item.menu_item_id]);
  return {id:`swiggy_food:${createHash("sha256").update(tuple).digest("hex")}`,providerItemId:Buffer.from(tuple).toString("base64url")};
}
export function decodeFoodOfferIdentity(value:string):{restaurantId:string;menuItemId:string}{
  try{
    if(value.length>900)throw new Error();
    const [restaurantId,menuItemId]=z.tuple([z.string().min(1).max(300),z.string().min(1).max(300)]).parse(JSON.parse(Buffer.from(value,"base64url").toString("utf8")));
    if(Buffer.from(JSON.stringify([restaurantId,menuItemId])).toString("base64url")!==value)throw new Error();
    return {restaurantId,menuItemId};
  }catch{throw new SwiggyGatewayError("INVALID_FOOD_ITEM","Choose a dish returned by the current restaurant menu.");}
}

export function foodPaymentOptions(data:z.infer<typeof FoodPaymentOptionsSchema>):FoodPaymentOption[]{
  const result:FoodPaymentOption[]=[];
  const available=(id:string)=>data.allMethods.find(method=>method.id===id&&method.enabled!==false);
  if(data.cod?.available&&available(data.cod.id))result.push({id:"cod",kind:"cod",label:data.cod.displayName,providerMethodId:data.cod.id});
  if(data.swiggyMoney?.available&&available(data.swiggyMoney.id))result.push({id:"swiggy_money",kind:"swiggy_money",label:data.swiggyMoney.displayName,providerMethodId:data.swiggyMoney.id});
  for(const method of data.allMethods){
    if(method.enabled===false||method.id===data.cod?.id||method.id===data.swiggyMoney?.id)continue;
    const qr=method.kind==="qr"||data.platforms?.desktop?.methods.some(entry=>entry.id===method.id&&entry.kind==="qr");
    const intent=method.kind==="intent"||data.platforms?.mobile?.methods.some(entry=>entry.id===method.id);
    if(qr)result.push({id:`upi_qr:${method.id}`,kind:"upi_qr",label:method.displayName??"Scan UPI QR",providerMethodId:method.id});
    else if(intent)result.push({id:`upi_app:${method.id}`,kind:"upi_app",label:method.displayName??method.id,providerMethodId:method.id});
  }
  return [...new Map(result.map(option=>[option.id,option])).values()];
}
/** A restaurant name as Swiggy's cart writes it: without the "(Ad)" that marks sponsored places in search, spaces collapsed. */
function plainName(name:string):string{return name.replace(/\s*\(Ad\)\s*$/i,"").replace(/\s+/g," ").trim();}
/** Saved-address IDs carry an opaque `__` suffix that Swiggy's cart, payment and order replies drop (the same rule as Instamart's swiggyCartAddressMatches). */
export function sameAddress(returned:string|null|undefined,requested:string):boolean{
  if(returned===requested)return true;
  const composite=/^([A-Za-z0-9-]{12,100})__[A-Za-z0-9_-]+$/.exec(requested);
  return Boolean(composite&&returned===composite[1]);
}
/** Swiggy's payment page for a pending UPI order. Swiggy calls it an opaque HTTPS link and names no host, so any plain HTTPS address is kept (no credentials or custom port). */
function safePaymentUrl(value:string):string|null{
  try{const url=new URL(value);return url.protocol==="https:"&&!url.username&&!url.password&&!url.port&&url.href.length<=4000?url.href:null;}catch{return null;}
}
/** The UPI link a phone opens to pay (or that a QR encodes); only UPI and the common UPI app schemes. */
function safeUpiUrl(value:string):string|null{
  return /^(?:upi|phonepe|tez|gpay|paytmmp|bhim):\/\/[^\s]+$/i.test(value)&&value.length<=4000?value:null;
}
export function normalizeFoodCart(raw:z.infer<typeof FoodCartResponseSchema>,unit:FoodGatewayOptions["priceUnit"]):FoodCart{
  // A line shows the dish's subtotal, which the bill's item total adds up; Swiggy's per-dish `total` also folds in that dish's charges, already counted under taxes and charges.
  const data=raw.data,p=data?.pricing;
  const lines=(data?.items??[]).map(item=>({menuItemId:item.menu_item_id,name:item.name,quantity:item.quantity,inStock:item.in_stock===true,isVeg:item.is_veg===true||item.is_veg===1||item.is_veg==="1"?true:item.is_veg===false||item.is_veg===0||item.is_veg==="0"?false:null,total:item.subtotal,variants:(item.variants??[]).map(value=>value.name??value.id??"Selected variant"),addons:(item.addons??[]).map(value=>value.name??value.id??"Selected add-on")}));
  const pricing={itemTotal:p?.item_total??null,deliveryCharge:p?.delivery_charge??null,taxesAndCharges:p?.taxes_and_charges??null,toPay:p?.to_pay??null,couponDiscount:data?.offers?.coupon_discount??0};
  const payableText=raw.paymentOptions?.paymentAmount??(p&&unit?`₹${(unit==="paise"?p.to_pay/100:p.to_pay).toFixed(2)}`:null);
  // The live cart names its restaurant without an ID; getCart fills the ID in when the name is the expected restaurant.
  const restaurant=data?.restaurant?.name?{id:data.restaurant.id??"",name:data.restaurant.name}:null;
  // Fingerprint retains complete item customization and raw bill, not only labels.
  const fingerprint=createHash("sha256").update(JSON.stringify({addressId:raw.addressId,restaurant:data?.restaurant?.id??null,items:data?.items??[],pricing:p??null,offers:data?.offers??null,payableText})).digest("hex");
  return {cartId:data?.cart_id??null,addressId:raw.addressId,restaurant,lines,itemCount:data?.item_count??lines.reduce((sum,line)=>sum+line.quantity,0),pricing,payableText,fingerprint,statusMessage:data?.result??null};
}
function priceMinor(price:number|undefined,unit:FoodGatewayOptions["priceUnit"]):number|null{
  if(price===undefined||!unit)return null;
  const converted=unit==="rupees"?Math.round(price*100):price;
  return Number.isSafeInteger(converted)&&converted>=0?converted:null;
}

/** Owner-bound official Food integration.
 * Food credentials and address selection must be stored under `swiggy_food`,
 * separately from Instamart. Only explicit typed methods can reach provider tools.
 */
export class FoodGateway implements FoodOrderingGateway {
  private readonly gateway:SwiggyGateway;
  constructor(private readonly options:FoodGatewayOptions){
    this.gateway=new SwiggyGateway({...options,service:"food"});
  }
  readiness(){return this.gateway.readiness();}
  beginAuthorization(){return this.gateway.beginAuthorization();}
  completeAuthorization(code:string,state:string){return this.gateway.completeAuthorization(code,state);}
  disconnect(){return this.gateway.disconnect();}
  close(){return this.gateway.close();}
  getAddresses(args:z.infer<typeof FoodReadArguments.get_addresses>={}){return this.gateway.getFoodAddresses(args);}

  async getCart(input:Parameters<FoodOrderingGateway["getCart"]>[0]):Promise<FoodCart>{
    const {signal:caller,restaurantId,restaurantName,...rest}=input,signal=boundedSignal(caller);
    const args={...rest,...(restaurantName?{restaurantName:plainName(restaurantName)}:{})};
    const data=await this.gateway.foodOrdering("get_food_cart",args,signal);
    if(!sameAddress(data.addressId,args.addressId))throw new SwiggyGatewayError("CART_ADDRESS_CHANGED","Swiggy returned a cart for another address. Review your delivery address again.");
    // Keep the saved-address ID as chosen, so later checks compare like with like.
    const cart={...normalizeFoodCart(data,this.options.priceUnit),addressId:args.addressId};
    if(cart.restaurant&&!cart.restaurant.id&&restaurantId&&restaurantName&&plainName(cart.restaurant.name).toLowerCase()===plainName(restaurantName).toLowerCase())cart.restaurant={...cart.restaurant,id:restaurantId};
    return cart;
  }
  async replaceCart(input:Parameters<FoodOrderingGateway["replaceCart"]>[0]):Promise<FoodCart>{
    const signal=boundedSignal(input.signal);
    if(!(await this.address(input.addressId,signal)).id)throw new SwiggyGatewayError("SWIGGY_FOOD_ADDRESS_REQUIRED","Choose a current saved Food address before preparing your cart.");
    const args={restaurantId:input.restaurantId,addressId:input.addressId,...(input.restaurantName?{restaurantName:plainName(input.restaurantName)}:{}),cartItems:input.items.map(item=>({menu_item_id:item.menuItemId,quantity:item.quantity}))};
    const response=await this.gateway.foodOrdering("update_food_cart",args,signal);
    if(response.statusCode!==undefined&&response.statusCode!==0&&response.statusCode!==200)throw new SwiggyGatewayError("FOOD_CART_REJECTED",response.statusMessage??"Swiggy could not prepare these dishes. Refresh your menu and try again.");
    const cart=await this.getCart({addressId:input.addressId,restaurantName:input.restaurantName,restaurantId:input.restaurantId,signal});
    const desired=input.items.filter(item=>item.quantity>0);
    if(cart.restaurant?.id!==input.restaurantId||cart.lines.length!==desired.length||cart.lines.some(line=>!desired.some(item=>item.menuItemId===line.menuItemId&&item.quantity===line.quantity)))throw new SwiggyGatewayError("CART_CHANGED","Swiggy returned different cart items or quantities. Review the provider cart before checkout.");
    return cart;
  }
  async clearCart(input:Parameters<FoodOrderingGateway["clearCart"]>[0]={}){await this.gateway.foodOrdering("flush_food_cart",{},boundedSignal(input.signal));}
  async getPaymentOptions(input:Parameters<FoodOrderingGateway["getPaymentOptions"]>[0]){
    const response=await this.gateway.foodOrdering("get_payment_options",{addressId:input.addressId},boundedSignal(input.signal));
    if(response.addressId&&!sameAddress(response.addressId,input.addressId))throw new SwiggyGatewayError("CART_ADDRESS_CHANGED","Payment options belong to another delivery address.");
    return foodPaymentOptions(response);
  }
  async placeOrder(input:Parameters<FoodOrderingGateway["placeOrder"]>[0]):Promise<FoodPlaceResult>{
    try { return await this.submitOrder(input); }
    catch (error) {
      // The gateway converts every failure after place_food_order dispatch to
      // FOOD_ORDER_OUTCOME_UNKNOWN, handled by submitOrder. Other errors happened
      // before submission (payment lookup, auth, schema validation).
      return { state: "failed", message: error instanceof Error ? `Order was not submitted: ${error.message}` : "Order was not submitted. Refresh payment options and try again." };
    }
  }
  private async submitOrder(input:Parameters<FoodOrderingGateway["placeOrder"]>[0]):Promise<FoodPlaceResult>{
    const signal=boundedSignal(input.signal),current=await this.getPaymentOptions({addressId:input.addressId,signal});
    const payment=current.find(option=>option.id===input.payment.id&&option.kind===input.payment.kind&&option.providerMethodId===input.payment.providerMethodId);
    if(!payment)throw new SwiggyGatewayError("PAYMENT_CHANGED","That payment method is no longer available. Review payment choices again.");
    const args={addressId:input.addressId,paymentMethod:payment.kind==="cod"?payment.providerMethodId!:payment.kind==="swiggy_money"?"SwiggyPay":"UPI",...(payment.kind==="upi_app"?{intentApp:payment.providerMethodId!}:{}),...(payment.kind==="upi_qr"?{generateUPIQR:true}:{}),...(input.noteToRestaurant?{noteToRestaurant:input.noteToRestaurant}:{})};
    try{
      const response=await this.gateway.foodOrdering("place_food_order",args,signal);
      if(response.normalizedStatus==="success")return {state:"complete",orderId:response.orderId,message:response.message??"Swiggy order placed successfully.",totalText:response.totalAmount===null?null:String(response.totalAmount),etaText:response.estimatedDelivery};
      if(!sameAddress(response.addressId,input.addressId))return {state:"outcome_unknown",message:"Swiggy returned an order for a different address. Check your Swiggy orders before continuing."};
      return {state:"payment_pending",orderId:response.orderId,paasId:response.paasId,paymentUrl:safePaymentUrl(response.bridgeUrl),upiUrl:safeUpiUrl(response.upiIntentUrl),isQrFlow:response.isQrFlow,pollingIntervalMs:response.pollingIntervalInMs,maxPollMs:response.maxTimeToPollForInMs,confirm:{orderId:response.orderId,addressId:response.addressId,lat:response.lat,lng:response.lng,cartId:response.cartId},message:"Not placed yet. Pay with UPI to place it: scan the QR with PhonePe, Google Pay or any UPI app, or open the payment page. Nothing is sent to your phone on its own.",totalText:response.totalAmount===undefined?null:String(response.totalAmount)};
    }catch(error){if(error instanceof SwiggyGatewayError&&error.code==="FOOD_ORDER_OUTCOME_UNKNOWN")return {state:"outcome_unknown",message:error.message};throw error;}
  }
  async checkPayment(input:Parameters<FoodOrderingGateway["checkPayment"]>[0]){
    const {signal:caller,cartId,...args}=input;
    const data=await this.gateway.foodOrdering("check_payment_status",{...args,...(cartId?{cartId}:{})},boundedSignal(caller));
    if(data.paasId!==input.paasId||(data.orderId&&input.orderId&&data.orderId!==input.orderId))throw new SwiggyGatewayError("PAYMENT_REFERENCE_CHANGED","The payment status does not match this order.");
    return {terminal:data.terminal,success:data.terminal&&data.isTerminalSuccess&&!data.isTerminalFailure,failure:data.terminal&&data.isTerminalFailure,confirmed:data.confirmed===true,status:data.status,orderId:data.orderId??null};
  }
  async confirmOrder(input:Parameters<FoodOrderingGateway["confirmOrder"]>[0]){
    const {signal:caller,cartId,...args}=input;
    const data=await this.gateway.foodOrdering("confirm_order",{...args,...(cartId?{cartId}:{})},boundedSignal(caller));
    if(data.orderId!==input.orderId)throw new SwiggyGatewayError("PAYMENT_REFERENCE_CHANGED","The confirmation does not match this order.");
    const result: "success"|"failed"|"pending"|"unknown"=data.result==="success"?"success":data.result==="failed"?"failed":data.result==="pending"?"pending":"unknown";
    return {result,orderId:data.orderId,orderStatus:data.orderStatus??null};
  }
  async recentOrders(input:Parameters<FoodOrderingGateway["recentOrders"]>[0]){
    const result=await this.gateway.foodOrdering("get_food_orders",{addressId:input.addressId,orderCount:5},boundedSignal(input.signal));
    return result.orders.map(order=>({orderId:order.orderId,status:order.orderStatus,restaurantName:order.restaurantName,placedAt:order.orderedTime,totalText:order.orderTotal}));
  }
  async trackOrder(input:Parameters<FoodOrderingGateway["trackOrder"]>[0]){
    const result=await this.gateway.foodOrdering("get_food_delivery_status",{orderId:input.orderId},boundedSignal(input.signal));
    if(result.orderId!==input.orderId)throw new SwiggyGatewayError("ORDER_REFERENCE_CHANGED","The tracking response does not match this order.");
    return {orderId:result.orderId,status:result.cancelled?"cancelled":result.delivered?"delivered":result.statusText??"in_progress",etaText:result.etaText??null,message:result.statusText??null,terminal:result.cancelled===true||result.delivered===true};
  }

  private async address(selectedAddressId:string|undefined,signal:AbortSignal):Promise<{data:SwiggyAddresses;id:string|null;notice:string|null}>{
    let data=await this.gateway.getFoodAddresses({},signal);
    if(selectedAddressId&&!data.addresses.some(address=>address.id===selectedAddressId)){
      for(let page=2;data.pagination.hasMore&&page<=10;page++){
        signal.throwIfAborted();
        const next=await this.gateway.getFoodAddresses({page},signal);
        data={...next,addresses:[...data.addresses,...next.addresses]};
        if(next.addresses.some(address=>address.id===selectedAddressId))break;
      }
    }
    const id=resolveFoodAddress(data,selectedAddressId);
    const notice=id?null:data.pagination.total===0?"Add a saved delivery address in Swiggy, then refresh Food addresses.":selectedAddressId?"That Food address is no longer available. Choose a current saved Food address.":"Choose a saved Food delivery address before searching restaurants.";
    return {data,id,notice};
  }

  /** Restaurant discovery never fetches menus in the background. The customer
   * chooses a returned restaurant before the application calls getMenu. */
  async searchRestaurants(input:FoodRestaurantSearchInput):Promise<FoodRestaurantSearchResult>{
    const {signal:caller,...raw}=input;
    const args=restaurantInputSchema.parse(raw),signal=boundedSignal(caller);
    const offset=args.offset===undefined?0:Number(args.offset);
    if(!Number.isSafeInteger(offset))throw new SwiggyGatewayError("SWIGGY_INVALID_CURSOR","Choose a restaurant category again to restart this list.");
    const address=await this.address(args.addressId,signal);
    if(!address.id)return {status:"needs_address",restaurants:[],addressId:null,notices:[address.notice!],hasMore:false,nextOffset:null};
    const result=await this.gateway.searchFoodRestaurants({query:args.query,addressId:address.id,...(args.offset===undefined?{}:{offset})},signal);
    const notices:string[]=[],restaurants:RestaurantCard[]=[],seen=new Set<string>();
    for(const restaurant of result.restaurants){
      if(!restaurant.id||seen.has(restaurant.id))continue;
      seen.add(restaurant.id);
      const imageUrl=foodImage(restaurant.imageUrl);
      restaurants.push(RestaurantCardSchema.parse({
        id:restaurant.id,provider:"swiggy_food",name:restaurant.name,cuisines:restaurant.cuisines,
        rating:rating(restaurant.avgRating),etaMinutes:restaurant.deliveryTimeMinutes??null,
        costForTwo:restaurant.costForTwo??null,area:restaurant.areaName??null,distanceKm:restaurant.distanceKm??null,
        isOpen:restaurant.availabilityStatus==="OPEN"?true:["CLOSED","UNAVAILABLE"].includes(restaurant.availabilityStatus??"")?false:null,
        ...(imageUrl?{imageUrl}:{}),
      }));
    }
    if(result.restaurants.some(restaurant=>!restaurant.id))notices.push("Some restaurants were omitted because Swiggy did not supply their restaurant ID.");
    if(restaurants.some(restaurant=>restaurant.isOpen===false))notices.push("Closed and unavailable restaurants are shown for reference; choose an open restaurant to order.");
    if(restaurants.some(restaurant=>restaurant.isOpen===null))notices.push("Opening status is not available for some restaurants. Open a menu to check current availability.");
    if(!restaurants.length)notices.push("No restaurants matched this category for the selected Food address. Try another category or delivery address.");
    const nextOffset=result.hasMore?nextRestaurantOffset(result.nextOffset,offset):null;
    if(result.hasMore&&nextOffset===null)notices.push("Swiggy did not supply a usable next page. Refine the category to explore more restaurants.");
    return {status:"ready",restaurants,addressId:address.id,notices,hasMore:nextOffset!==null,nextOffset};
  }

  /** Read-only, category-paginated menu. Returned dish IDs are suitable for a
   * local shortlist, not proof that customizations or checkout are ready. */
  async getMenu(input:FoodMenuInput):Promise<FoodMenuResult>{
    const {signal:caller,...raw}=input;
    const args=menuInputSchema.parse(raw),signal=boundedSignal(caller);
    const address=await this.address(args.addressId,signal);
    if(!address.id)throw new SwiggyGatewayError("SWIGGY_FOOD_ADDRESS_REQUIRED",address.notice!);
    const result=await this.gateway.getFoodRestaurantMenu({restaurantId:args.restaurantId,addressId:address.id,page:args.page,pageSize:args.pageSize},signal);
    if(result.restaurant.id!==args.restaurantId||result.page!==args.page)throw new SwiggyGatewayError("SWIGGY_SCHEMA_MISMATCH","Swiggy Food returned a menu for a different restaurant or page. Open the restaurant again.");
    const restaurant=menuRestaurant(result.restaurant),notices:string[]=[],sections:RestaurantMenu["sections"]=[];
    let hasUnknownStock=false,hasCustomization=false,hasExtraItems=false,hasDietFiltered=false;
    const addSection=(category:{title:string;categoryId?:string;items:Array<{id:string;name:string;description?:string;price?:number;inStock?:number;isVeg?:boolean;imageUrl?:string;hasVariants?:boolean;hasAddons?:boolean}>;hasMoreItems?:boolean;totalItems?:number},parent:string,index:number)=>{
      const title=parent?`${parent} / ${category.title}`:category.title;
      const id=`swiggy_food:section:${createHash("sha256").update(JSON.stringify([args.restaurantId,category.categoryId??null,title,args.page,index])).digest("hex")}`;
      const items:MealOffer[]=[],seen=new Set<string>();
      for(const item of category.items){
        if(args.vegetarianOnly&&item.isVeg!==true){hasDietFiltered=true;continue;}
        const identity=foodOfferIdentity({restaurant_id:args.restaurantId,menu_item_id:item.id})!;
        if(seen.has(identity.id))continue;seen.add(identity.id);
        const imageUrl=foodImage(item.imageUrl);
        const available=restaurant.isOpen===true&&item.inStock===1;
        const descriptions=[item.isVeg===true?"Vegetarian":item.isVeg===false?"Non-vegetarian":"Dietary details not supplied"];
        if(item.description)descriptions.push(item.description);
        if(item.inStock===undefined){hasUnknownStock=true;descriptions.push("Stock status not supplied");}
        else if(item.inStock===0)descriptions.push("Currently unavailable");
        if(item.hasVariants||item.hasAddons){hasCustomization=true;descriptions.push("Sizes and add-ons need review in Swiggy");}
        if(restaurant.isOpen!==true)descriptions.push(restaurant.isOpen===false?"Restaurant currently closed":"Restaurant opening status needs confirmation");
        items.push(MealOfferSchema.parse({...identity,id:`${identity.id}:${createHash("sha256").update(args.itemId).digest("hex").slice(0,16)}`,
          itemId:args.itemId,provider:"swiggy_food",name:item.name,restaurant:restaurant.name,
          unit:"serving",priceMinor:priceMinor(item.price,this.options.priceUnit),
          ...(imageUrl?{imageUrl}:{}),available,etaMinutes:restaurant.etaMinutes,description:descriptions.join(" · "),selectable:available}));
      }
      const hasMoreItems=category.hasMoreItems===true||(category.totalItems!==undefined&&category.totalItems>category.items.length);
      hasExtraItems ||= hasMoreItems;
      // Provider category totals cover every diet. Do not label that total as
      // the number of vegetarian dishes after applying the local filter.
      sections.push({id,title,items,hasMoreItems,totalItems:args.vegetarianOnly?null:category.totalItems??null});
    };
    for(const [index,category]of result.categories.entries()){
      const nested=z.array(FoodMenuCategorySchema).safeParse(category.subcategories);
      if(nested.success){
        for(const [subIndex,sub]of nested.data.entries())addSection(sub,category.title,index*100+subIndex);
        if(typeof category.totalSubcategories==="number"&&category.totalSubcategories>nested.data.length)notices.push(`${category.title} has additional subcategories beyond this menu preview.`);
      }else addSection(FoodMenuCategorySchema.parse(category),"",index*100);
    }
    if(restaurant.isOpen!==true)notices.push(restaurant.isOpen===false?"This restaurant is currently closed. Choose another open restaurant.":"Swiggy has not confirmed that this restaurant is open. Menu items cannot be selected yet.");
    if(hasUnknownStock)notices.push("Dishes without a confirmed stock status are visible but cannot be selected.");
    if(hasCustomization)notices.push("Some dishes have sizes or add-ons. Review their exact options in Swiggy before ordering.");
    if(hasDietFiltered)notices.push("Only dishes marked vegetarian by Swiggy are shown. Unlabelled and non-vegetarian dishes were omitted; this does not verify vegan, Jain, or allergen suitability.");
    if(hasExtraItems)notices.push("Some categories show a compact preview. Swiggy has more dishes in those categories than shown here.");
    if(sections.some(section=>section.items.some(item=>item.priceMinor===null)))notices.push("Food prices are not verified for this provider response. Confirm current prices in Swiggy before ordering.");
    if(!sections.some(section=>section.items.length))notices.push("This menu page contains no dishes. Choose another restaurant or try again later.");
    const nextPage=result.hasMore&&result.categories.length>0&&result.page<1000?result.page+1:null;
    if(result.hasMore&&nextPage===null)notices.push("Swiggy did not return a usable next menu page. Open the restaurant again to refresh its menu.");
    return {restaurantId:args.restaurantId,restaurant,sections,hasMore:nextPage!==null,nextPage,notices};
  }

  async searchMeals(input:FoodSearchInput):Promise<FoodSearchResult>{
    const {signal:callerSignal,...raw}=input;
    const args=inputSchema.parse(raw);
    const signal=boundedSignal(callerSignal);
    // A selected Food address can be on a later page. Never reuse an Instamart
    // identifier or pass a client-supplied ID without finding it in this account.
    const address=await this.address(args.addressId,signal),addresses=address.data,addressId=address.id;
    if(!addressId){
      return {status:"needs_address",offers:[],addresses:publicAddresses(addresses),addressId:null,notices:[address.notice!],hasMore:false,nextOffset:null};
    }
    const result=await this.gateway.searchFoodMenu({query:args.query,addressId,...(args.offset===undefined?{}:{offset:args.offset}),...(args.vegetarianOnly?{vegFilter:1 as const}:{})},signal);
    const notices:string[]=[];
    const candidates=result.items.filter(item=>foodOfferIdentity(item)&&item.inStock===1&&(!args.vegetarianOnly||item.isVeg===true));
    // Check live restaurant opening status and ETA, never infer these from item
    // stock. Bound restaurant verification for each provider page.
    const allRestaurantIds=[...new Set(candidates.map(item=>item.restaurant_id!))];
    const restaurantIds=allRestaurantIds.slice(0,10);
    const restaurants=new Map<string,{name:string;isOpen?:boolean;deliveryTime?:number}>();
    for(const restaurantId of restaurantIds){
      signal.throwIfAborted();
      const menu=await this.gateway.getFoodRestaurantMenu({restaurantId,addressId,pageSize:1},signal);
      if(menu.restaurant.id!==restaurantId)throw new SwiggyGatewayError("SWIGGY_SCHEMA_MISMATCH","Swiggy Food returned a menu for a different restaurant. Search again.");
      restaurants.set(restaurantId,menu.restaurant);
    }
    const offers:MealOffer[]=[];
    const seen=new Set<string>();
    for(const item of candidates){
      const restaurant=restaurants.get(item.restaurant_id!);
      if(restaurant?.isOpen!==true)continue;
      const identity=foodOfferIdentity(item)!;
      if(seen.has(identity.id))continue;
      seen.add(identity.id);
      const descriptions=[item.isVeg===true?"Vegetarian":item.isVeg===false?"Non-vegetarian":"Dietary details not supplied"];
      if(item.hasVariants||item.hasAddons||item.variations?.length||item.variantsV2?.length||item.addons?.length)descriptions.push("Sizes and add-ons need review before ordering");
      descriptions.push("Delivery fees and taxes are not included");
      const imageUrl=foodImage(item.imageUrl);
      offers.push(MealOfferSchema.parse({
        ...identity,id:`${identity.id}:${createHash("sha256").update(args.itemId).digest("hex").slice(0,16)}`,
        itemId:args.itemId,provider:"swiggy_food",name:item.name,restaurant:restaurant.name,
        unit:"serving",priceMinor:priceMinor(item.price,this.options.priceUnit),
        ...(imageUrl?{imageUrl}:{}),available:true,etaMinutes:restaurant.deliveryTime??null,
        description:descriptions.join(" · "),selectable:true,
      }));
      if(offers.length>=args.limit)break;
    }
    if(result.items.some(item=>!foodOfferIdentity(item)||item.inStock===undefined))notices.push("Some dishes were omitted because Swiggy did not supply an item ID, restaurant ID, or stock status.");
    if(restaurants.size&&[...restaurants.values()].some(restaurant=>restaurant.isOpen!==true))notices.push("Closed restaurants and restaurants without a verified opening status were omitted.");
    if(offers.some(offer=>offer.priceMinor===null))notices.push("Food prices are not verified for this provider response. Confirm current prices in Swiggy before ordering.");
    if(!offers.length)notices.push("No in-stock dishes from verified open restaurants matched. Try another dish or check availability in Swiggy.");
    notices.push("Choose your dishes, then review the live restaurant cart, delivery address and payment before placing the order.");
    if(allRestaurantIds.length>restaurantIds.length||candidates.filter(item=>restaurants.get(item.restaurant_id!)?.isOpen===true).length>args.limit)notices.push("This provider page contains more dishes than can be verified in one search. Narrow the dish or restaurant to see more specific matches.");
    const nextOffset=result.hasMore&&result.items.length&&Number.isSafeInteger(result.nextOffset)&&result.nextOffset!>(args.offset??0)?result.nextOffset!:null;
    if(result.hasMore&&nextOffset===null)notices.push("Swiggy did not supply a usable next page. Refine the category to explore more dishes.");
    return {status:"ready",offers,addresses:publicAddresses(addresses),addressId,notices,hasMore:nextOffset!==null,nextOffset};
  }
}
