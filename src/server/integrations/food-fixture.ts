import { MealOfferSchema, RestaurantCardSchema, type MealOffer, type ProviderState, type RestaurantCard } from "../../lib/assistant-contracts";
import { createHash } from "node:crypto";
import type { RestaurantContext, RestaurantMenuResult, RestaurantSearchResult } from "../assistant";
import { foodOfferIdentity } from "./food";
import type { FoodCart, FoodOrderingGateway, FoodPaymentOption, FoodPlaceResult } from "./food-ordering-types";

/**
 * Development-only Swiggy Food stand-in, so the voice flow can be exercised end to end without a
 * live account. Enabled with SAYCART_FIXTURE=1 and never outside `next dev` or tests.
 */
export const fixtureEnabled = () => process.env.SAYCART_FIXTURE === "1" && process.env.NODE_ENV !== "production";

type Dish = [name: string, rupees: number, description: string];
const kitchens: Array<{ name: string; cuisines: string[]; rating: number; eta: number; area: string; menu: Record<string, Dish[]> }> = [
  { name: "Meghana Foods", cuisines: ["Biryani", "Andhra"], rating: 4.5, eta: 28, area: "Koramangala", menu: {
    Biryani: [["Chicken Boneless Biryani", 360, "Spicy Andhra-style boneless chicken biryani."], ["Paneer Biryani", 310, "Basmati rice layered with paneer and masala."], ["Veg Biryani", 260, "Seasonal vegetables, saffron rice and raita."]],
    Starters: [["Chilli Chicken", 290, "Crispy chicken tossed with green chillies."], ["Gobi Manchurian", 210, "Cauliflower florets in Indo-Chinese sauce."]],
  } },
  { name: "Behrouz Biryani", cuisines: ["Biryani", "Mughlai"], rating: 4.3, eta: 35, area: "HSR Layout", menu: {
    Biryani: [["Dum Gosht Biryani", 449, "Slow-cooked mutton dum biryani."], ["Subz-e-Biryani", 329, "Royal vegetable biryani."]],
    Kebabs: [["Murgh Tikka", 349, "Charcoal-grilled chicken tikka."], ["Paneer Tikka", 299, "Smoky cottage cheese tikka."]],
  } },
  { name: "Truffles", cuisines: ["Burgers", "American"], rating: 4.4, eta: 25, area: "Indiranagar", menu: {
    Burgers: [["All American Cheese Burger", 249, "Classic beef-style patty with cheddar."], ["Veg Ranch Burger", 199, "Crumb-fried veg patty with ranch."]],
    Sides: [["Peri Peri Fries", 149, "Fries with peri peri seasoning."], ["Chocolate Shake", 179, "Thick chocolate milkshake."]],
  } },
  { name: "Domino's Pizza", cuisines: ["Pizza", "Italian"], rating: 4.1, eta: 30, area: "BTM Layout", menu: {
    Pizza: [["Farmhouse Pizza", 459, "Onion, capsicum, tomato and mushroom."], ["Pepper Barbecue Chicken", 499, "Barbecue chicken with cheese."], ["Margherita", 239, "Classic cheese pizza."]],
    Sides: [["Garlic Breadsticks", 129, "Baked breadsticks with garlic butter."]],
  } },
  { name: "A2B Adyar Ananda Bhavan", cuisines: ["South Indian", "Sweets"], rating: 4.2, eta: 22, area: "Jayanagar", menu: {
    "South Indian": [["Masala Dosa", 120, "Crisp dosa with potato masala."], ["Idli Vada Combo", 99, "Two idlis and a medu vada."], ["Ghee Pongal", 110, "Rice and lentils with ghee and pepper."]],
    Sweets: [["Mysore Pak", 90, "Ghee-rich gram flour sweet."]],
  } },
  { name: "Punjab Grill Express", cuisines: ["North Indian", "Thalis"], rating: 4.0, eta: 40, area: "MG Road", menu: {
    Mains: [["Butter Chicken", 389, "Tandoori chicken in creamy tomato gravy."], ["Paneer Butter Masala", 329, "Paneer in rich makhani gravy."], ["Dal Makhani", 269, "Black lentils simmered overnight."]],
    Breads: [["Butter Naan", 69, "Tandoor naan brushed with butter."], ["Garlic Naan", 79, "Naan with garlic and coriander."]],
  } },
];

const nativeId = (index: number) => `fixture-${index + 1}`;
function card(index: number): RestaurantCard {
  const kitchen = kitchens[index];
  return RestaurantCardSchema.parse({ id: nativeId(index), provider: "swiggy_food", name: kitchen.name, cuisines: kitchen.cuisines, rating: kitchen.rating, etaMinutes: kitchen.eta, costForTwo: "₹400 for two", area: kitchen.area, isOpen: true });
}

export const fixtureAddresses = () => [
  { id: "fixture-home", label: "Home", reviewAddressText: "12, 4th Cross, Koramangala, Bengaluru" },
  { id: "fixture-work", label: "Work", reviewAddressText: "Embassy Tech Village, Bellandur, Bengaluru" },
];

export function fixtureProviders(): ProviderState[] {
  return [
    { id: "instamart", name: "Instamart", status: "connected", message: "Development store: synthetic groceries, bag and checkout." },
    { id: "swiggy_food", name: "Swiggy Food", status: "connected", message: "Development restaurants, cart, payment and tracking." },
    { id: "zomato", name: "Zomato", status: "access_required", message: "Custom-app access is required from Zomato before this connection can be enabled." },
  ];
}

export function fixtureRestaurants(item: { id: string; query: string }, context: RestaurantContext | undefined, addressId: string): RestaurantSearchResult {
  const offset = context?.nextOffset ?? 0, query = item.query.toLowerCase();
  const ranked = kitchens.map((_, index) => index).sort((a, b) => Number(kitchens[b].cuisines.some(c => query.includes(c.toLowerCase()))) - Number(kitchens[a].cuisines.some(c => query.includes(c.toLowerCase()))));
  const page = ranked.slice(offset, offset + 4), next = offset + 4 < ranked.length ? offset + 4 : null;
  const cards = page.map(index => ({ ...card(index), id: `restaurant:fixture:${index + 1}` }));
  return { restaurants: cards, notices: [], context: { itemId: item.id, query: item.query, addressId, restaurantIds: Object.fromEntries(page.map(index => [`restaurant:fixture:${index + 1}`, nativeId(index)])), nextOffset: next, seenOffsets: [offset], nextMenuPage: null, seenMenuPages: [] } };
}

export function fixtureMenu(context: RestaurantContext, restaurant: RestaurantCard): RestaurantMenuResult {
  const index = kitchens.findIndex((_, position) => nativeId(position) === context.restaurantIds[restaurant.id]);
  if (index < 0) throw new Error("Unknown fixture restaurant");
  const sections = Object.entries(kitchens[index].menu).map(([title, dishes], sectionIndex) => ({
    id: `section-${sectionIndex}`, title, hasMoreItems: false, totalItems: dishes.length,
    items: dishes.map(([name, rupees, description], dishIndex): MealOffer => MealOfferSchema.parse({ id: `${restaurant.id}:dish:${sectionIndex}-${dishIndex}`, itemId: context.itemId, provider: "swiggy_food", providerItemId: foodOfferIdentity({ restaurant_id: nativeId(index), menu_item_id: `${sectionIndex}-${dishIndex}` })!.providerItemId, name, restaurant: restaurant.name, unit: "serving", priceMinor: rupees * 100, description, available: true, selectable: true, maxQuantity: 10 })),
  }));
  return { menu: { restaurantId: restaurant.id, restaurant, sections, hasMore: false, notices: [] }, nextPage: null };
}

/** The same kitchens as a Swiggy Food ordering service: an in-memory cart, bill, payment and order lifecycle. */
type FixtureOrder = { orderId: string; paasId: string; kind: FoodPaymentOption["kind"]; placedAt: number; checks: number; ending?: string };
const carts = new Map<string, { restaurantIndex: number; addressId: string; items: { menuItemId: string; quantity: number }[] }>();
const orders = new Map<string, FixtureOrder[]>();
/** A UPI payment counts as made after two status checks or eight seconds (standing in for the customer paying). */
const paidFor = (order: FixtureOrder) => order.kind === "cod" || order.kind === "swiggy_money" || order.checks >= 2 || Date.now() - order.placedAt > 8000;
/** Tests: the owner's latest UPI payment ends in this Swiggy terminal status (for example "CANCELLED") at its next check. */
export function endFixturePayment(owner: string, status: string) { const order = orders.get(owner)?.at(-1); if (order) order.ending = status; }
const payments: FoodPaymentOption[] = [
  { id: "cod", kind: "cod", label: "Cash on delivery", providerMethodId: "COD" },
  { id: "upi_app:phonepe", kind: "upi_app", label: "PhonePe UPI", providerMethodId: "phonepe" },
  { id: "upi_qr:upi_qr", kind: "upi_qr", label: "Scan UPI QR", providerMethodId: "upi_qr" },
  { id: "swiggy_money", kind: "swiggy_money", label: "Swiggy Money", providerMethodId: "SWIGGY_MONEY" },
];
function dishAt(restaurantIndex: number, menuItemId: string) {
  const [section, dish] = menuItemId.split("-").map(Number);
  const entry = Object.values(kitchens[restaurantIndex]?.menu ?? {})[section]?.[dish];
  if (!entry) throw new Error("Unknown fixture dish");
  return { name: entry[0], rupees: entry[1] };
}
function cartView(owner: string, addressId: string): FoodCart {
  const cart = carts.get(owner);
  const empty = !cart || cart.addressId !== addressId || !cart.items.length;
  const lines = empty ? [] : cart.items.map(item => { const dish = dishAt(cart.restaurantIndex, item.menuItemId); return { menuItemId: item.menuItemId, name: dish.name, quantity: item.quantity, inStock: true, isVeg: null, total: dish.rupees * item.quantity, variants: [], addons: [] }; });
  const itemTotal = lines.reduce((sum, line) => sum + (line.total ?? 0), 0), deliveryCharge = empty ? 0 : 35, taxesAndCharges = Math.round(itemTotal * 0.05), toPay = itemTotal + deliveryCharge + taxesAndCharges;
  const restaurant = empty ? null : { id: nativeId(cart.restaurantIndex), name: kitchens[cart.restaurantIndex].name };
  return { cartId: empty ? null : `fixture-cart-${owner.slice(-6)}`, addressId, restaurant, lines, itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    pricing: { itemTotal: empty ? null : itemTotal, deliveryCharge, taxesAndCharges, toPay: empty ? null : toPay, couponDiscount: 0 }, payableText: empty ? null : `₹${toPay}`,
    fingerprint: createHash("sha256").update(JSON.stringify({ addressId, restaurant, lines })).digest("hex"), statusMessage: null };
}
export function fixtureOrdering(owner: string): FoodOrderingGateway & { close(): Promise<void> } {
  return {
    async close() {},
    async getCart({ addressId }) { return cartView(owner, addressId); },
    async replaceCart({ restaurantId, addressId, items }) {
      const restaurantIndex = kitchens.findIndex((_, index) => nativeId(index) === restaurantId);
      if (restaurantIndex < 0) throw new Error("Unknown fixture restaurant");
      items.forEach(item => dishAt(restaurantIndex, item.menuItemId));
      carts.set(owner, { restaurantIndex, addressId, items: items.filter(item => item.quantity > 0) });
      return cartView(owner, addressId);
    },
    async clearCart() { carts.delete(owner); },
    async getPaymentOptions() { return payments; },
    async placeOrder({ addressId, payment }): Promise<FoodPlaceResult> {
      const cart = cartView(owner, addressId);
      if (!cart.lines.length) return { state: "failed", message: "Your Swiggy cart is empty." };
      const order: FixtureOrder = { orderId: `FX${Date.now().toString().slice(-7)}`, paasId: `paas-${Date.now()}`, kind: payment.kind, placedAt: Date.now(), checks: 0 };
      orders.set(owner, [...(orders.get(owner) ?? []), order]);
      if (payment.kind === "cod" || payment.kind === "swiggy_money") { carts.delete(owner); return { state: "complete", orderId: order.orderId, message: "Order placed with Swiggy.", totalText: cart.payableText, etaText: "Arriving in about 30 minutes" }; }
      // Like Swiggy: nothing is pushed to a phone; the customer opens the UPI link (or scans it as a QR) to pay.
      const amount = (cart.pricing.toPay ?? 0).toFixed(2);
      return { state: "payment_pending", orderId: order.orderId, paasId: order.paasId, paymentUrl: null, upiUrl: `upi://pay?pa=saycart.fixture@upi&pn=SayCart%20test%20store&am=${amount}&cu=INR&tr=${order.paasId}`, isQrFlow: payment.kind === "upi_qr", pollingIntervalMs: 3000, maxPollMs: 300000,
        confirm: { orderId: order.orderId, addressId, lat: 12.93, lng: 77.62, cartId: cart.cartId }, message: "Not placed yet. Pay with UPI to place it: scan the QR with PhonePe, Google Pay or any UPI app, or open the payment page. Nothing is sent to your phone on its own.", totalText: cart.payableText };
    },
    async checkPayment({ paasId }) {
      const order = (orders.get(owner) ?? []).find(entry => entry.paasId === paasId);
      if (!order) throw new Error("Unknown fixture payment");
      if (order.ending) return { terminal: true, success: false, failure: false, confirmed: false, status: order.ending, orderId: order.orderId };
      order.checks++;
      const paid = paidFor(order);
      if (paid) carts.delete(owner);
      return { terminal: paid, success: paid, failure: false, confirmed: false, status: paid ? "SUCCESS" : "PENDING", orderId: order.orderId };
    },
    // Like Swiggy: confirming an order whose payment never arrived marks it failed.
    async confirmOrder({ orderId }) { const order = (orders.get(owner) ?? []).find(entry => entry.orderId === orderId), paid = !order || paidFor(order); return { result: paid ? "success" : "failed", orderId, orderStatus: paid ? "PLACED" : "PAYMENT_FAILED" }; },
    async recentOrders() { return (orders.get(owner) ?? []).map(order => ({ orderId: order.orderId, status: "Preparing", restaurantName: null, placedAt: new Date(order.placedAt).toISOString(), totalText: null })); },
    async trackOrder({ orderId }) {
      // A 30-minute delivery replayed in three minutes, so every stage can be seen while testing.
      const order = (orders.get(owner) ?? []).find(entry => entry.orderId === orderId);
      const elapsed = order ? (Date.now() - order.placedAt) / 1000 : 0, minutes = Math.max(1, Math.round(30 * (1 - elapsed / 180)));
      if (elapsed >= 180) return { orderId, status: "Delivered", etaText: null, message: "Your order was delivered. Enjoy your meal!", terminal: true };
      if (elapsed >= 90) return { orderId, status: "Out for delivery", etaText: `About ${minutes} minutes`, message: "Your delivery partner is on the way.", terminal: false };
      if (elapsed >= 30) return { orderId, status: "Preparing", etaText: `About ${minutes} minutes`, message: "The restaurant is preparing your food.", terminal: false };
      return { orderId, status: "Order confirmed", etaText: `About ${minutes} minutes`, message: "The restaurant has accepted your order.", terminal: false };
    },
  };
}

/** Tests only: a Swiggy app cart the customer filled elsewhere, which checkout must not overwrite without asking. */
export function seedFixtureFoodCart(owner: string, restaurantIndex: number, addressId: string, items: { menuItemId: string; quantity: number }[]) {
  carts.set(owner, { restaurantIndex, addressId, items });
}
