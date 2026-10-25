import { z } from "zod";
import { SwiggyPaymentOptionsSchema } from "./swiggy-schemas";

// Official Food reference, checked 24 October 2026. Every dispatch is also
// checked against this account's discovered MCP input schema.
const id = z.string().min(1).max(300);
const amount = z.number().finite().nonnegative();
// The live cart sends some IDs as numbers and stock as 1/0; both are read as the documented string and boolean.
const looseId = z.union([id, z.number().int().nonnegative()]).transform(value => String(value));
const looseFlag = z.union([z.boolean(), z.number(), z.string()]).transform(value => value === true || value === 1 || value === "1" || value === "true");
const selection = z.object({ id: looseId.optional(), name: z.string().optional(), group_id: looseId.optional(), groupId: looseId.optional(), variation_id: looseId.optional(), variationId: looseId.optional(), price: amount.optional(), quantity: z.number().int().nonnegative().optional() }).passthrough();
export const FoodPaymentOptionsSchema = SwiggyPaymentOptionsSchema.extend({ placeOrderToolName: z.literal("place_food_order"), addressId: id.optional() });
// get_food_cart embeds PaymentOptionsView, not the get_payment_options response.
// Its documented summary has no placeOrderToolName (the full response requires it).
const FoodCartPaymentOptionsSchema = FoodPaymentOptionsSchema.omit({ placeOrderToolName: true });
export const FoodCartDataSchema = z.object({
  cart_id: looseId.nullish(), result: z.string().optional(),
  restaurant: z.object({ id: looseId.optional(), name: z.string().optional() }).passthrough().nullable().optional(),
  items: z.array(z.object({ menu_item_id: looseId, name: z.string(), quantity: z.number().int().positive(), subtotal: amount, total: amount, final_price: amount, in_stock: looseFlag.nullish(), is_veg: z.union([z.boolean(), z.string(), z.number()]).optional(), variants: z.array(selection).optional(), addons: z.array(selection).optional() }).passthrough()).max(100).optional(),
  item_count: z.number().int().nonnegative().optional(),
  pricing: z.object({ item_total: amount, delivery_charge: amount, taxes_and_charges: amount, to_pay: amount }).passthrough().optional(),
  offers: z.object({ coupon_discount: amount.optional(), coupon_applied: z.string().nullable().optional() }).passthrough().optional(),
}).passthrough();
// Swiggy sends `data: null` for an empty cart.
export const FoodCartResponseSchema = z.object({ data: FoodCartDataSchema.nullish(), addressId: id, paymentOptions: FoodCartPaymentOptionsSchema.nullable().optional(), gpoError: z.string().optional() }).passthrough();
const updateResponse = z.object({ data: FoodCartDataSchema.nullish(), statusCode: z.number().optional(), statusMessage: z.string().optional() }).passthrough();
export const FoodPlaceResponseSchema = z.union([
  z.object({ normalizedStatus: z.literal("success"), status: z.string(), orderId: id.nullable(), totalAmount: z.union([amount, z.string()]).nullable(), estimatedDelivery: z.string().nullable(), message: z.string().optional() }).passthrough(),
  z.object({ normalizedStatus: z.literal("pending"), status: z.literal("PENDING_PAYMENT"), orderId: id, paasId: id, transactionId: id, upiIntentUrl: z.string(), bridgeUrl: z.string(), isQrFlow: z.boolean(), pollingIntervalInMs: z.number().int().positive(), maxTimeToPollForInMs: z.number().int().positive(), paymentMethod: z.literal("UPI"), totalAmount: amount.optional(), addressId: id, cartId: id.nullable(), lat: z.number().finite().min(-90).max(90), lng: z.number().finite().min(-180).max(180) }).passthrough(),
]);
const confirmContext = { orderId: id, addressId: id, lat: z.number().finite().min(-90).max(90), lng: z.number().finite().min(-180).max(180), cartId: id.optional() };
export const FoodOrderingArguments = {
  get_food_cart: z.strictObject({ addressId: id, restaurantName: z.string().min(1).max(300).optional() }),
  update_food_cart: z.strictObject({ restaurantId: id, addressId: id, restaurantName: z.string().min(1).max(300).optional(), cartItems: z.array(z.strictObject({ menu_item_id: id, quantity: z.number().int().min(0).max(99) })).min(1).max(30) }),
  flush_food_cart: z.strictObject({}),
  get_payment_options: z.strictObject({ addressId: id }),
  place_food_order: z.strictObject({ addressId: id, paymentMethod: z.string().min(1).max(300), intentApp: id.optional(), generateUPIQR: z.boolean().optional(), noteToRestaurant: z.string().max(500).optional() }),
  check_payment_status: z.strictObject({ paasId: id, orderId: id.optional(), addressId: id.optional(), cartId: id.optional(), lat: z.number().finite().optional(), lng: z.number().finite().optional() }),
  confirm_order: z.strictObject(confirmContext),
  get_food_orders: z.strictObject({ addressId: id, orderCount: z.number().int().min(1).max(15).optional() }),
  get_food_delivery_status: z.strictObject({ orderId: id }),
};
export const FoodOrderingResponses = {
  get_food_cart: FoodCartResponseSchema,
  update_food_cart: updateResponse,
  flush_food_cart: z.object({ statusCode: z.number().optional(), statusMessage: z.string().optional(), success: z.boolean().optional(), message: z.string().optional() }).passthrough(),
  get_payment_options: FoodPaymentOptionsSchema,
  place_food_order: FoodPlaceResponseSchema,
  check_payment_status: z.object({ paasId: id, status: z.string(), terminal: z.boolean(), isTerminalSuccess: z.boolean(), isTerminalFailure: z.boolean(), confirmed: z.boolean().optional(), orderId: id.optional() }).passthrough(),
  confirm_order: z.object({ orderId: id, result: z.string(), orderStatus: z.string().optional() }).passthrough(),
  get_food_orders: z.object({ orders: z.array(z.object({ orderId: id, restaurantName: z.string(), orderTotal: z.string(), orderStatus: z.string(), orderedTime: z.string() }).passthrough()).max(100) }).passthrough(),
  get_food_delivery_status: z.object({ orderId: id, deliveryBy: z.number().finite().nullable(), serverNow: z.number().finite(), etaText: z.string().optional(), cancelled: z.boolean().optional(), delivered: z.boolean().optional(), statusText: z.string().optional(), pollIntervalSec: z.number().positive() }).passthrough(),
};
export type FoodOrderingTool = keyof typeof FoodOrderingArguments;
