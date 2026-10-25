/** Normalized Swiggy Food cart, payment and order shapes. Provider payloads never cross this boundary. */
export type FoodCartLine = { menuItemId: string; name: string; quantity: number; inStock: boolean; isVeg: boolean | null; total: number | null; variants: string[]; addons: string[] };
// Amounts are Swiggy's numeric values as reported (never summed locally). `payableText` is the provider-formatted amount.
export type FoodCartPricing = { itemTotal: number | null; deliveryCharge: number | null; taxesAndCharges: number | null; toPay: number | null; couponDiscount: number };
export type FoodCart = {
  cartId: string | null;
  addressId: string;
  restaurant: { id: string; name: string } | null;
  lines: FoodCartLine[];
  itemCount: number;
  pricing: FoodCartPricing;
  payableText: string | null;
  fingerprint: string;
  statusMessage: string | null;
};
export type FoodCartItemInput = { menuItemId: string; quantity: number };
export type FoodPaymentKind = "cod" | "swiggy_money" | "upi_qr" | "upi_app";
// `id` is an app-local opaque choice id ("cod", "swiggy_money", "upi_qr", "upi_app:<provider method id>").
export type FoodPaymentOption = { id: string; kind: FoodPaymentKind; label: string; providerMethodId: string | null };
export type FoodConfirmContext = { orderId: string; addressId: string; lat: number; lng: number; cartId: string | null };
export type FoodPlaceResult =
  | { state: "complete"; orderId: string | null; message: string; totalText: string | null; etaText: string | null }
  | { state: "payment_pending"; orderId: string; paasId: string; paymentUrl: string | null; upiUrl: string | null; isQrFlow: boolean; pollingIntervalMs: number; maxPollMs: number; confirm: FoodConfirmContext; message: string; totalText: string | null }
  | { state: "failed"; message: string }
  | { state: "outcome_unknown"; message: string };
export type FoodPaymentStatus = { terminal: boolean; success: boolean; failure: boolean; confirmed: boolean; status: string; orderId: string | null };
export type FoodConfirmResult = { result: "success" | "failed" | "pending" | "unknown"; orderId: string; orderStatus: string | null };
export type FoodOrderSummary = { orderId: string; status: string; restaurantName: string | null; placedAt: string | null; totalText: string | null };
export type FoodTracking = { orderId: string; status: string; etaText: string | null; message: string | null; terminal: boolean };

/** Every mutating call validates its arguments against the live MCP input schema before dispatch. */
export interface FoodOrderingGateway {
  /** `restaurantId`: the restaurant the cart is expected to hold; Swiggy's live cart names it without an ID. */
  getCart(input: { addressId: string; restaurantName?: string; restaurantId?: string; signal?: AbortSignal }): Promise<FoodCart>;
  /** update_food_cart with the complete desired item list for one restaurant, then a fresh get_food_cart read. */
  replaceCart(input: { restaurantId: string; restaurantName?: string; addressId: string; items: FoodCartItemInput[]; signal?: AbortSignal }): Promise<FoodCart>;
  clearCart(input?: { signal?: AbortSignal }): Promise<void>;
  getPaymentOptions(input: { addressId: string; signal?: AbortSignal }): Promise<FoodPaymentOption[]>;
  /** Not idempotent. Never retried by the gateway; ambiguous transport failures return `outcome_unknown`. */
  placeOrder(input: { addressId: string; payment: FoodPaymentOption; noteToRestaurant?: string; signal?: AbortSignal }): Promise<FoodPlaceResult>;
  checkPayment(input: { paasId: string; orderId?: string; addressId?: string; cartId?: string | null; lat?: number; lng?: number; signal?: AbortSignal }): Promise<FoodPaymentStatus>;
  confirmOrder(input: FoodConfirmContext & { signal?: AbortSignal }): Promise<FoodConfirmResult>;
  recentOrders(input: { addressId: string; signal?: AbortSignal }): Promise<FoodOrderSummary[]>;
  trackOrder(input: { orderId: string; signal?: AbortSignal }): Promise<FoodTracking>;
}
