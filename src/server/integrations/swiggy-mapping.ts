import { CartSchema, ProductSchema, type Cart, type Payment, type Product } from "../../lib/contracts";
import { SwiggyGatewayError, swiggyVariantId } from "./swiggy";
import { type SwiggyCart, type SwiggyPaymentOptions, type SwiggySearch } from "./swiggy-schemas";

/** Numeric item prices in the Instamart view are INR rupees, never paise. */
export const SWIGGY_ITEM_PRICE_UNIT = "INR" as const;

function mappingError(code:string,message:string):never { throw new SwiggyGatewayError(code,message); }

/** Convert decimal rupees without floating-point multiplication or rounding. */
export function swiggyRupeesToMinor(value:number|string,allowNegative=false):number {
  if(typeof value==="number"&&!Number.isFinite(value))return mappingError("SWIGGY_PRICE_UNVERIFIED","Swiggy returned an invalid item price. Refresh before shopping.");
  let decimal=String(value).trim().replace(/\u00a0/g," ");
  if(/^free$/i.test(decimal))return 0;
  // Accept only a single, explicit amount; never pick a number out of prose,
  // crossed-out prices, ranges, exponential notation, or a different currency.
  decimal=decimal.replace(/\u2212/g,"-");
  const match=/^(-)?\s*(?:₹|INR|Rs\.?)?\s*(-)?\s*((?:\d+|\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})+,\d{3})(?:\.\d{1,2})?)\s*(?:INR)?$/i.exec(decimal);
  if(!match||match[1]&&match[2])return mappingError("SWIGGY_PRICE_UNVERIFIED","Swiggy returned a money format this app cannot verify. Refresh before shopping.");
  const negative=!!(match[1]||match[2]);
  if(negative&&!allowNegative)return mappingError("SWIGGY_PRICE_UNVERIFIED","Swiggy returned a negative payable or item amount. Refresh before shopping.");
  const [whole,fraction=""]=match[3].replace(/,/g,"").split(".");
  const minor=BigInt(whole)*100n+BigInt(fraction.padEnd(2,"0"));
  if(minor>BigInt(Number.MAX_SAFE_INTEGER))return mappingError("SWIGGY_PRICE_UNVERIFIED","Swiggy returned an amount outside this app's supported range.");
  return Number(minor)*(negative?-1:1);
}

function checkedSum(values:number[]):number {
  const sum=values.reduce((total,value)=>total+BigInt(value),0n);
  if(sum>BigInt(Number.MAX_SAFE_INTEGER)||sum<BigInt(Number.MIN_SAFE_INTEGER))return mappingError("SWIGGY_BILL_UNVERIFIED","Swiggy returned a bill outside this app's supported range.");
  return Number(sum);
}

export function safeProductImage(value:unknown):string|undefined {
  if(typeof value!=="string")return undefined;
  try {const url=new URL(value);return url.protocol==="https:"&&!url.username&&!url.password&&(!url.port||url.port==="443")&&(url.hostname==="media-assets.swiggy.com"||(url.hostname==="res.cloudinary.com"&&url.pathname.startsWith("/swiggy/")))?url.href:undefined;}catch{return undefined;}
}

export function normalizeSwiggyProducts(search:SwiggySearch):Product[] {
  const found=new Map<string,Product>();
  for(const family of search.products){
    for(const variant of family.variations){
      const product=ProductSchema.parse({
        id:swiggyVariantId(variant.skuId,variant.spinId),
        name:variant.displayName.trim()||family.displayName.trim(),
        brand:variant.brandName.trim()||family.brand.trim(),
        unit:variant.quantityDescription.trim()||"Pack size not provided",priceMinor:swiggyRupeesToMinor(variant.price.offerPrice),currency:"INR",
        mrpMinor:swiggyRupeesToMinor(variant.price.mrp),
        ...(safeProductImage(variant.imageUrl)?{imageUrl:safeProductImage(variant.imageUrl)}:{}),
        ...(variant.maxQuantity===undefined?{}:{maxQuantity:Math.min(99,variant.maxQuantity)}),
        available:family.inStock&&family.isAvail&&variant.isInStockAndAvailable&&variant.maxQuantity!==0
      });
      const previous=found.get(product.id);
      if(previous&&JSON.stringify(previous)!==JSON.stringify(product))return mappingError("SWIGGY_VARIANT_AMBIGUOUS","Swiggy returned conflicting details for a product variant. Search again before choosing it.");
      found.set(product.id,product);
    }
  }
  return [...found.values()];
}

export function swiggyCartAddressId(cart:SwiggyCart):string|null {
  // selectedAddress may be human-readable text. Only the structured ID is safe
  // for account-address matching; older fixtures/providers return an ID there.
  return cart.selectedAddressDetails?.id??cart.selectedAddress??null;
}

function billLabel(value:string):string { return value.trim().toLowerCase().replace(/\s+/g," "); }
function isItemsLabel(value:string):boolean { return /^(?:item\(?s?\)?(?: total| subtotal)?|items(?: total| subtotal)?|subtotal)(?:\s*\(\d+(?: items?)?\))?$/.test(value); }
function isDiscountLabel(value:string):boolean { return /\b(?:discount|coupon|promotion|promotional)\b/.test(value); }
function isChargeLabel(value:string):boolean { return /\b(?:delivery|handling|platform|packaging|packing|small cart|surge|rain|convenience|service|fee|fees|charge|charges|tax|taxes|gst|tip|donation|round off|rounding)\b/.test(value); }

/** Keep the full provider bill; aggregates are accepted only after reconciliation. */
export function normalizeSwiggyCart(raw:SwiggyCart,revision:number):Cart {
  const ids=new Set<string>();
  const lines=raw.items.map(item=>{
    const id=swiggyVariantId(item.skuId,item.spinId);
    if(ids.has(id))return mappingError("SWIGGY_VARIANT_AMBIGUOUS","Swiggy returned multiple cart lines for the same variant. Review this cart in Swiggy before editing it here.");
    ids.add(id);
    return {product:ProductSchema.parse({id,name:item.itemName,brand:"",unit:item.itemVariant?.trim()||"Pack size not provided",priceMinor:swiggyRupeesToMinor(item.discountedFinalPrice),mrpMinor:swiggyRupeesToMinor(item.mrp),...(item.maxQuantity===undefined?{}:{maxQuantity:Math.min(99,item.maxQuantity)}),currency:"INR",available:item.isInStockAndAvailable&&item.maxQuantity!==0}),quantity:item.quantity};
  });
  const itemsMinor=checkedSum(lines.map(line=>checkedSum(Array.from({length:line.quantity},()=>line.product.priceMinor))));
  const totalMinor=swiggyRupeesToMinor(raw.billBreakdown.toPay.value);
  if(swiggyRupeesToMinor(raw.cartTotalAmount)!==totalMinor)return mappingError("SWIGGY_BILL_UNVERIFIED","Swiggy returned conflicting payable totals. Refresh the cart before reviewing it.");
  let sawItems=false;const fees:number[]=[],discounts:number[]=[];
  for(const line of raw.billBreakdown.lineItems){
    const amount=swiggyRupeesToMinor(line.value,true),label=billLabel(line.label);
    if(isItemsLabel(label)){
      if(sawItems||amount!==itemsMinor)return mappingError("SWIGGY_BILL_UNVERIFIED","Swiggy's item subtotal differs from the returned cart prices. Review this cart in Swiggy before checkout.");
      sawItems=true;
    }else if(isDiscountLabel(label)){
      discounts.push(Math.abs(amount));
    }else if(amount<0){
      // A provider-signed bill credit is unambiguous, regardless of its label.
      discounts.push(-amount);
    }else if(isChargeLabel(label)){
      fees.push(amount);
    }else{
      return mappingError("SWIGGY_BILL_UNVERIFIED","Swiggy returned a bill component this app cannot classify. Review this cart in Swiggy before checkout.");
    }
  }
  if(lines.length&&!sawItems)return mappingError("SWIGGY_BILL_UNVERIFIED","Swiggy did not return a verifiable item subtotal. Refresh the cart before reviewing it.");
  const feesMinor=checkedSum(fees),discountMinor=checkedSum(discounts);
  if(checkedSum([itemsMinor,feesMinor,-discountMinor])!==totalMinor)return mappingError("SWIGGY_BILL_UNVERIFIED","Swiggy's bill does not reconcile with its payable total. Refresh the cart before reviewing it.");
  return CartSchema.parse({revision,lines,totals:{itemsMinor,feesMinor,discountMinor,totalMinor,currency:"INR"},bill:structuredClone(raw.billBreakdown)});
}

export type SwiggyPaymentSelection={paymentMethod:string;intentApp?:string;generateUPIQR?:boolean};

function paymentSelections(options:SwiggyPaymentOptions):Map<string,{label:string;selection:SwiggyPaymentSelection}> {
  const result=new Map<string,{label:string;selection:SwiggyPaymentSelection}>();
  for(const method of options.allMethods){
    if(method.enabled===false)continue;
    let selection:SwiggyPaymentSelection|undefined;
    if(method.id===options.cod?.id){
      if(!options.cod.available)continue;
      selection={paymentMethod:options.cod.id};
    }else if(method.id===options.swiggyMoney?.id){
      if(!options.swiggyMoney.available)continue;
      selection={paymentMethod:"SwiggyPay"};
    }else{
      const mobile=options.platforms?.mobile?.methods.find(choice=>choice.id===method.id&&choice.enabled!==false);
      const desktop=options.platforms?.desktop?.methods.find(choice=>choice.id===method.id&&choice.enabled!==false);
      const group=method.groupName??(mobile?options.platforms?.mobile?.groupName:desktop?options.platforms?.desktop?.groupName:undefined);
      const kind=method.kind??mobile?.kind??desktop?.kind;
      if(group!=="UPI")continue;
      if(kind==="qr")continue; // Requires an explicit runtime QR instruction.
      else if(kind==="intent"||mobile&&!desktop)selection={paymentMethod:group,intentApp:method.id};
      else if(desktop&&!mobile)continue;
    }
    if(!selection)continue;
    const label=method.displayName?.trim()||options.cod?.id===method.id&&options.cod.displayName.trim()||options.swiggyMoney?.id===method.id&&options.swiggyMoney.displayName.trim()||method.id;
    const entry={label,selection},previous=result.get(method.id);
    if(previous&&JSON.stringify(previous)!==JSON.stringify(entry))return mappingError("SWIGGY_PAYMENT_AMBIGUOUS","Swiggy returned conflicting payment choices. Refresh payment options before checkout.");
    result.set(method.id,entry);
  }
  return result;
}

export function normalizeSwiggyPayments(options:SwiggyPaymentOptions):Payment[] {
  return [...paymentSelections(options)].map(([id,{label}])=>({id,label}));
}

/** Resolve checkout fields exclusively from the current provider payment list. */
export function swiggyPaymentSelection(options:SwiggyPaymentOptions,id:string):SwiggyPaymentSelection {
  const method=paymentSelections(options).get(id);
  if(!method)return mappingError("PAYMENT_UNAVAILABLE","That payment method is not available for the current Swiggy cart. Choose a returned payment option.");
  return {...method.selection};
}
