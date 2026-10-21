import { z } from "zod";
import { parseSwiggyToolResult } from "./swiggy-schemas";

const id=z.string().min(1).max(300);
const message=z.string().max(4000);
const money=z.number().finite().nonnegative();

/** The payment ID is a returned picker choice, never model-supplied tool arguments. */
export const SwiggyCheckoutInputSchema=z.strictObject({
  addressId:id,expectedFingerprint:z.string().regex(/^[a-f0-9]{64}$/),paymentMethodId:id
});
export type SwiggyCheckoutInput=z.infer<typeof SwiggyCheckoutInputSchema>;

const delivery={addressId:id.optional(),cartTotal:money.optional(),deliveryAddress:z.string().optional(),deliveryLabel:z.string().optional()};
const pending=z.object({
  orderId:id,transactionId:id,paasId:id,upiIntentUrl:z.string().max(8000),bridgeUrl:z.string().max(8000),
  isQrFlow:z.boolean(),pollingIntervalInMs:z.number().int().positive(),maxTimeToPollForInMs:z.number().int().positive(),
  paymentMethod:z.literal("UPI"),status:z.literal("PENDING_PAYMENT"),message:message.optional(),...delivery
}).passthrough();
const multiple=z.object({
  orders:z.array(z.object({orderId:id.optional(),status:z.string().min(1).max(100).optional(),error:message.optional()}).passthrough()).min(1).max(100),
  orderCount:z.number().int().positive().max(100),successCount:z.number().int().nonnegative(),failureCount:z.number().int().nonnegative(),
  allSucceeded:z.boolean(),paymentMethod:z.string().min(1).max(300),cartTotal:money.optional(),message:message.optional()
}).passthrough().superRefine((value,context)=>{
  if(value.orders.length!==value.orderCount||value.successCount+value.failureCount!==value.orderCount||value.allSucceeded!==(value.successCount===value.orderCount)){
    context.addIssue({code:"custom",message:"Inconsistent multi-store checkout totals."});
  }
});
const single=z.object({orderId:id,status:z.string().min(1).max(100),paymentMethod:z.string().min(1).max(300),message:message.optional(),...delivery}).passthrough()
  .refine(value=>value.status!=="PENDING_PAYMENT","Pending UPI checkout requires its complete payment fields.");
export const SwiggyCheckoutResponseSchema=z.union([pending,multiple,single]);

export type SwiggyCheckoutResult={
  state:"complete"|"payment_pending"|"failed"|"outcome_unknown";
  message:string;
  results:Array<{orderId:string;state:string;message:string}>;
  paymentUrl?:string;
};

const completed=new Set(["SUCCESS","SUCCEEDED","CONFIRMED","PLACED","ORDER_PLACED","ORDER_CONFIRMED","COMPLETED"]);
const failed=new Set(["FAILED","FAILURE","REJECTED","CANCELLED","CANCELED","PAYMENT_FAILED","ORDER_FAILED"]);
function orderState(status:string|undefined):"complete"|"failed"|"outcome_unknown"{
  const normalized=status?.toUpperCase();
  return normalized&&completed.has(normalized)?"complete":normalized&&failed.has(normalized)?"failed":"outcome_unknown";
}

/** Only a provider HTTPS link on these known official web origins may reach the browser. */
export function trustedSwiggyPaymentUrl(value:string):string|undefined{
  try{
    const url=new URL(value);
    if(url.protocol!=="https:"||url.username||url.password||url.port||!["swiggy.com","www.swiggy.com","mcp.swiggy.com","mcp-staging.swiggy.com"].includes(url.hostname))return undefined;
    return url.href;
  }catch{return undefined;}
}

function responseMessage(result:unknown):string|undefined{
  if(!result||typeof result!=="object")return undefined;
  const mcp=result as Record<string,unknown>;
  let payload=mcp.structuredContent;
  if(payload===undefined&&Array.isArray(mcp.content)){
    const texts=mcp.content.filter(value=>value&&typeof value==="object"&&(value as Record<string,unknown>).type==="text");
    const text=texts.length===1?(texts[0] as Record<string,unknown>).text:undefined;
    if(typeof text==="string"&&text.length<=2_000_000)try{payload=JSON.parse(text);}catch{return undefined;}
  }
  if(payload&&typeof payload==="object"){
    const parsed=message.safeParse((payload as Record<string,unknown>).message);
    if(parsed.success&&parsed.data.trim())return parsed.data;
  }
  return undefined;
}

/** Unknown provider statuses never become an invented successful purchase. */
export function normalizeSwiggyCheckoutResult(result:unknown):SwiggyCheckoutResult{
  const data=parseSwiggyToolResult(result,SwiggyCheckoutResponseSchema);
  const providerMessage=responseMessage(result)??data.message;
  if("status" in data&&data.status==="PENDING_PAYMENT"){
    // The schema union also accepts extra fields on single results; re-parse
    // here to keep incomplete pending payloads from becoming actionable links.
    const payment=pending.parse(data);
    const paymentUrl=trustedSwiggyPaymentUrl(payment.bridgeUrl);
    return {state:"payment_pending",message:providerMessage||"Payment is pending. Complete payment through Swiggy and check the order before trying again.",
      results:[{orderId:payment.orderId,state:payment.status,message:providerMessage||"Payment is pending."}],...(paymentUrl?{paymentUrl}:{})};
  }
  if("orders" in data){
    const group=multiple.parse(data);
    const results=group.orders.map(order=>({orderId:order.orderId??"",state:order.status??(order.error?"failed":"outcome_unknown"),message:order.error??providerMessage??"Review this store's order status in Swiggy."}));
    const allKnownComplete=group.allSucceeded&&group.orders.every(order=>Boolean(order.orderId)&&!order.error&&(order.status===undefined||orderState(order.status)==="complete"));
    const allKnownFailed=group.successCount===0&&group.orders.every(order=>order.error!==undefined||orderState(order.status)==="failed");
    return {state:allKnownComplete?"complete":allKnownFailed?"failed":"outcome_unknown",results,
      message:providerMessage||(allKnownComplete?"Instamart order placed successfully.":allKnownFailed?"Swiggy reported that the orders failed.":"The stores returned different or unrecognized outcomes. Review each order in Swiggy before placing another order.")};
  }
  const order=single.parse(data);
  const state=orderState(order.status);
  return {state,results:[{orderId:order.orderId,state:order.status,message:providerMessage??order.status}],
    message:providerMessage||(state==="complete"?"Instamart order placed successfully.":state==="failed"?"Swiggy reported that this order failed.":"Swiggy returned an unrecognized order status. Check the order in Swiggy before trying again.")};
}
