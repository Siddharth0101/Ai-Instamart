import { z } from "zod";

export const ModeSchema = z.literal("live");
export const ProductSchema = z.strictObject({
  id: z.string().min(1).max(300), name: z.string().min(1).max(250), brand: z.string().max(150),
  unit: z.string().min(1).max(100), priceMinor: z.number().int().nonnegative(),
  currency: z.literal("INR"), available: z.boolean(),
  imageUrl: z.string().url().optional(),
  mrpMinor: z.number().int().nonnegative().optional(), maxQuantity: z.number().int().min(0).max(99).optional()
});
export const TotalsSchema = z.strictObject({
  itemsMinor: z.number().int().nonnegative(), feesMinor: z.number().int().nonnegative(),
  discountMinor: z.number().int().nonnegative(), totalMinor: z.number().int().nonnegative(), currency: z.literal("INR")
});
export const CartSchema = z.strictObject({
  revision: z.number().int().nonnegative(),
  lines: z.array(z.strictObject({ product: ProductSchema, quantity: z.number().int().min(1).max(99) })).max(100),
  totals: TotalsSchema,
  bill: z.strictObject({lineItems:z.array(z.strictObject({label:z.string(),value:z.string()})),toPay:z.strictObject({label:z.string(),value:z.string()})}).optional()
});
export const AddressSchema = z.strictObject({id:z.string(), label:z.string(), reviewAddressText:z.string()});
export const PaymentSchema = z.strictObject({id:z.string(), label:z.string()});
export const UsageSchema = z.strictObject({inputTokens:z.number().int().nonnegative(),outputTokens:z.number().int().nonnegative(),totalTokens:z.number().int().nonnegative(),model:z.string().nullable()});
export const TraceEventSchema = z.strictObject({id:z.string(),stage:z.string(),tool:z.string(),status:z.enum(["ok","error"]),durationMs:z.number().nonnegative(),timestamp:z.string()});
export const MessageSchema = z.strictObject({id:z.string(),role:z.enum(["user","assistant"]),text:z.string()});
export const AgentIntentSchema = z.strictObject({
  action:z.enum(["search","set_quantity","show_cart","review_checkout","clarify"]),
  query:z.string().max(200).nullable(),productId:z.string().max(300).nullable(),
  quantity:z.number().int().min(0).max(99).nullable(),reply:z.string().min(1).max(1500)
});
export const SessionViewSchema = z.strictObject({
  sessionId:z.string(), mode:ModeSchema, turnVersion:z.number().int().nonnegative(),
  messages:z.array(MessageSchema),products:z.array(ProductSchema),cart:CartSchema,
  addresses:z.array(AddressSchema),addressId:z.string().nullable(),payments:z.array(PaymentSchema),paymentMethodId:z.string().nullable(),
  usage:UsageSchema,trace:z.array(TraceEventSchema),csrfToken:z.string(),connected:z.boolean(),notice:z.string().optional(),
  search:z.strictObject({query:z.string().min(1).max(200),hasMore:z.boolean()}).optional()
});
export const QuoteSchema = z.strictObject({
  id:z.string(),sessionId:z.string(),cart:CartSchema,address:AddressSchema,payment:PaymentSchema,
  expiresAt:z.string(),challenge:z.string(),summary:z.string()
});
export const AttemptSchema = z.strictObject({
  id:z.string(),state:z.enum(["submitted","payment_pending","outcome_unknown","failed","complete"]),message:z.string(),
  results:z.array(z.strictObject({orderId:z.string(),state:z.string(),message:z.string()})),
  paymentUrl:z.string().url().optional()
});
export const BootstrapSchema = z.object({sessionId:z.string().nullable(),mode:ModeSchema.nullable(),connected:z.boolean(),csrfToken:z.string(),capabilities:z.object({groq:z.boolean(),realtimeStt:z.boolean().default(false),tts:z.boolean()})});
export const RealtimeTokenRequestSchema = z.strictObject({sessionId:z.string().min(1).max(200)});
export const RealtimeTokenSchema = z.object({token:z.string().min(1).max(8192)});
export const SessionRequestSchema = z.strictObject({mode:ModeSchema});
export const TurnRequestSchema = z.strictObject({sessionId:z.string().min(1),text:z.string().trim().min(1).max(2000),expectedTurnVersion:z.number().int().nonnegative(),expectedCartRevision:z.number().int().nonnegative(),displayedProductIds:z.array(z.string().min(1).max(300)).max(20).optional()});
export const SearchRequestSchema = z.strictObject({sessionId:z.string().min(1),query:z.string().trim().min(1).max(200),expectedTurnVersion:z.number().int().nonnegative(),expectedCartRevision:z.number().int().nonnegative(),loadMore:z.boolean().optional()});
export const CartRequestSchema = z.strictObject({sessionId:z.string().min(1),productId:z.string().min(1).max(300),quantity:z.number().int().min(0).max(99),expectedCartRevision:z.number().int().nonnegative()});
export const AddressRequestSchema = z.strictObject({sessionId:z.string().min(1),addressId:z.string().min(1)});
export const PaymentRequestSchema = z.strictObject({sessionId:z.string().min(1),paymentMethodId:z.string().min(1)});
export const QuoteRequestSchema = z.strictObject({sessionId:z.string().min(1),expectedCartRevision:z.number().int().nonnegative()});
export const ConfirmRequestSchema = z.strictObject({quoteId:z.string().min(1),challenge:z.string().min(1)});
export const SpeechRequestSchema = z.strictObject({sessionId:z.string().min(1),assistantMessageId:z.string().min(1),expectedTurnVersion:z.number().int().nonnegative()});
export const StopRequestSchema = z.strictObject({sessionId:z.string().min(1),expectedTurnVersion:z.number().int().nonnegative()});
export type Mode=z.infer<typeof ModeSchema>;
export type TurnRequest=z.infer<typeof TurnRequestSchema>;
export type SearchRequest=z.infer<typeof SearchRequestSchema>;
export type Product=z.infer<typeof ProductSchema>;
export type Cart=z.infer<typeof CartSchema>;
export type Address=z.infer<typeof AddressSchema>;
export type Payment=z.infer<typeof PaymentSchema>;
export type Usage=z.infer<typeof UsageSchema>;
export type TraceEvent=z.infer<typeof TraceEventSchema>;
export type AgentIntent=z.infer<typeof AgentIntentSchema>;
export type Message=z.infer<typeof MessageSchema>;
export type SessionView=z.infer<typeof SessionViewSchema>;
export type Quote=z.infer<typeof QuoteSchema>;
export type Attempt=z.infer<typeof AttemptSchema>;
