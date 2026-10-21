import { z } from "zod";

// These are deliberately provider DTOs, separate from our public API contracts.
// Unexpected optional provider fields are retained; required field drift fails closed.
const id = z.string().min(1).max(300);
const money = z.number().finite().nonnegative();
export const SwiggyAddressesSchema = z.object({
  addresses: z.array(z.object({id, addressLine:z.string(), phoneNumber:z.string(), addressCategory:z.string().optional(), addressTag:z.string().optional()}).passthrough()),
  pagination:z.object({page:z.number().int().positive(),pageSize:z.number().int().positive(),total:z.number().int().nonnegative(),totalPages:z.number().int().nonnegative(),hasMore:z.boolean()}).passthrough(),
  resolution:z.object({defaultAddressId:id.optional(),resolutionSource:z.enum(["explicit_user_address","user_selected_address","ranked_saved_address","requested_address_not_found","no_saved_address"]),needsUserClarification:z.boolean(),candidateAddressIds:z.array(id)}).passthrough()
}).passthrough();
export const SwiggySearchSchema = z.object({
  nextOffset:z.string(),
  products:z.array(z.object({displayName:z.string(),brand:z.string(),inStock:z.boolean(),isAvail:z.boolean(),productId:id,parentProductId:id,
    variations:z.array(z.object({spinId:id,skuId:id,quantityDescription:z.string(),imageUrl:z.string().optional(),displayName:z.string(),brandName:z.string(),price:z.object({mrp:money,offerPrice:money}).passthrough(),isInStockAndAvailable:z.boolean(),maxQuantity:z.number().int().nonnegative().optional()}).passthrough())
  }).passthrough())
}).passthrough();
// Nonempty live carts return storeId as an integer despite the published string
// shape. Preserve it as an opaque ID; never interpret it as a price or quantity.
const storeId=z.union([id,z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).transform(String)]).nullish();
export const SwiggyCartItemSchema = z.object({spinId:id,storeId,skuId:id,productId:id,itemName:z.string(),itemVariant:z.string().optional(),quantity:z.number().int().positive(),isInStockAndAvailable:z.boolean(),mrp:money,discountedFinalPrice:money,maxQuantity:z.number().int().nonnegative().optional()}).passthrough();
export const SwiggyCartSchema = z.object({
  selectedAddress:z.string().optional(),
  selectedAddressDetails:z.object({id,address:z.string(),area:z.string(),name:z.string(),mobile:z.string()}).passthrough().optional(),
  cartTotalAmount:z.string(),items:z.array(SwiggyCartItemSchema),
  billBreakdown:z.object({lineItems:z.array(z.object({label:z.string(),value:z.string()}).passthrough()),toPay:z.object({label:z.string(),value:z.string()}).passthrough()}).passthrough(),
  cartId:id.optional(),addressWarning:z.string().optional(),cartAbsent:z.boolean().optional(),
  unserviceableItems:z.array(SwiggyCartItemSchema).optional(),cartWarning:z.object({statusCode:z.number(),message:z.string()}).passthrough().optional()
}).passthrough();
const method=z.object({id,groupName:z.string().optional(),displayName:z.string().optional(),kind:z.enum(["intent","qr"]).optional(),enabled:z.boolean().optional()}).passthrough();
const availableMethod=z.object({available:z.boolean(),id,displayName:z.string()}).passthrough();
export const SwiggyPaymentOptionsSchema = z.object({
  platforms:z.object({mobile:z.object({groupName:z.string(),methods:z.array(method)}).passthrough().optional(),desktop:z.object({groupName:z.string(),methods:z.array(method)}).passthrough().optional()}).passthrough().optional(),
  cod:availableMethod.optional(),swiggyMoney:availableMethod.optional(),reservePay:availableMethod.optional(),
  agenticPaymentEligible:z.boolean().optional(),allMethods:z.array(method),paymentAmount:z.string().nullable().optional(),placeOrderToolName:z.literal("checkout")
}).passthrough();
export type SwiggyAddresses = z.infer<typeof SwiggyAddressesSchema>;
export type SwiggySearch = z.infer<typeof SwiggySearchSchema>;
export type SwiggyCart = z.infer<typeof SwiggyCartSchema>;
export type SwiggyPaymentOptions = z.infer<typeof SwiggyPaymentOptionsSchema>;

export const SwiggyReadArguments = {
  get_addresses:z.strictObject({page:z.number().int().positive().optional(),pageSize:z.number().int().min(1).max(10).optional(),selectedAddressId:id.optional(),explicitAddressId:id.optional()}),
  search_products:z.strictObject({addressId:id,query:z.string().trim().min(1).max(200),offset:z.number().int().nonnegative().optional()}),
  get_cart:z.strictObject({}),
  get_payment_options:z.strictObject({})
};
export type SwiggyReadTool = keyof typeof SwiggyReadArguments;

// Build the envelopes once; every cart/address/search result follows this shape.
const mcpResultSchema=z.object({isError:z.boolean().optional(),structuredContent:z.unknown().optional(),content:z.array(z.object({type:z.string(),text:z.string().optional()}).passthrough()).optional()}).passthrough();
const successEnvelopeSchema=z.object({success:z.boolean(),data:z.unknown().optional()}).passthrough();
function hasFailureMarker(value:unknown):boolean{
  if(!value||typeof value!=="object"||Array.isArray(value))return false;
  const object=value as Record<string,unknown>;
  return Object.hasOwn(object,"error")||Object.hasOwn(object,"errors")||object.isError===true||object.success===false;
}

/** Validate direct MCP structured data or one JSON envelope; never scrape prose. */
export function parseSwiggyToolResult<T>(result:unknown,schema:z.ZodType<T>):T {
  const mcp=mcpResultSchema.parse(result);
  if(mcp.isError) throw new Error("SWIGGY_TOOL_FAILED");
  let raw=mcp.structuredContent;
  if(raw===undefined){
    const texts=mcp.content?.filter(x=>x.type==="text"&&typeof x.text==="string")??[];
    if(texts.length!==1||texts[0].text!.length>2_000_000) throw new Error("SWIGGY_UNSUPPORTED_RESPONSE");
    try{raw=JSON.parse(texts[0].text!);}catch{throw new Error("SWIGGY_UNSUPPORTED_RESPONSE");}
  }
  // The live MCP server returns direct structuredContent alongside human-readable
  // Markdown. Documentation/older servers wrap JSON in {success,data}. Explicit
  // failure markers always win, even if other fields happen to fit our DTO.
  if(raw&&typeof raw==="object"&&!Array.isArray(raw)){
    const value=raw as Record<string,unknown>;
    if(hasFailureMarker(value))throw new Error("SWIGGY_TOOL_FAILED");
    if(Object.hasOwn(value,"success")){
      const envelope=successEnvelopeSchema.safeParse(value);
      if(!envelope.success)throw new Error("SWIGGY_UNSUPPORTED_RESPONSE");
      raw=envelope.data.data;
    }
  }
  if(hasFailureMarker(raw))throw new Error("SWIGGY_TOOL_FAILED");
  const parsed=schema.safeParse(raw);
  if(!parsed.success) throw Object.assign(new Error("SWIGGY_SCHEMA_MISMATCH"),{schemaIssues:parsed.error.issues.slice(0,20).map(issue=>({path:issue.path.map(part=>typeof part==="number"?part:typeof part==="string"&&/^[A-Za-z_$][A-Za-z_$-]{0,79}$/.test(part)?part:"[redacted]"),code:issue.code,...("expected" in issue&&typeof issue.expected==="string"?{expected:issue.expected}:{})}))});
  return parsed.data;
}
