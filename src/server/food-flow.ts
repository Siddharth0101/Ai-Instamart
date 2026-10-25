import type { Attempt, Quote } from "../lib/contracts";
import type { FoodCheckout } from "../lib/food-checkout-contracts";
import { assistant, foodCheckout, foodOrdering } from "./assistant-service";
import { AppError } from "./errors";
import { read, transaction, write } from "./store";
import { UPI_WINDOW_MS, type Owner } from "./shopping";
import { setActiveCheckout } from "./instamart-flow";

/** The total the customer last saw and heard. "Confirm" always means this exact review, never a newer one. */
export type FoodReview = { quote: Quote; createdAt: string; turn: number };
/** What was ordered, for the order screen and "order it again". */
export type FoodOrderSummary = { restaurant: string; lines: { name: string; quantity: number }[]; totalMinor: number; payment: string; address: string; placedAt: string };
/** Swiggy's latest delivery status. Stage: 0 confirmed, 1 preparing, 2 on the way, 3 delivered, -1 cancelled. */
export type FoodTracking = { orderId: string; status: string; stage: -1 | 0 | 1 | 2 | 3; etaText: string | null; message: string | null; terminal: boolean; checkedAt: string };
export type FoodState = { checkout: FoodCheckout | null; review: FoodReview | null; attempt: Attempt | null; order: FoodOrderSummary | null; tracking: FoodTracking | null };

export function trackingStage(status: string, terminal: boolean): FoodTracking["stage"] {
  const text = status.toLowerCase();
  if (/cancel/.test(text)) return -1;
  if (terminal || /\bdelivered\b/.test(text)) return 3;
  if (/out for delivery|on the way|picked|dispatch|rider|partner|arriving|en route/.test(text)) return 2;
  if (/prepar|cooking|kitchen/.test(text)) return 1;
  return 0;
}

const live = (review: FoodReview | null) => review && Date.parse(review.quote.expiresAt) > Date.now() ? review : null;

export async function foodState(ownerId: string): Promise<FoodState> {
  const [record, review, owner] = await Promise.all([
    read<{ checkout: FoodCheckout }>(ownerId, "food_checkout", "current"),
    read<FoodReview>(ownerId, "assistant_context", "food_review"),
    read<Owner>(ownerId, "owner", ownerId),
  ]);
  const order = owner?.latestAttemptId?.startsWith("food_attempt") ? await read<{ attempt: Attempt; quoteId: string; createdAt: string }>(ownerId, "food_attempt", owner.latestAttemptId) : null;
  const [placed, tracking] = order ? await Promise.all([read<{ quote: Quote }>(ownerId, "food_quote", order.quoteId), read<FoodTracking>(ownerId, "assistant_context", "food_tracking")]) : [null, null];
  const summary: FoodOrderSummary | null = placed ? { restaurant: placed.quote.cart.lines[0]?.product.brand ?? "Swiggy", lines: placed.quote.cart.lines.map(line => ({ name: line.product.name, quantity: line.quantity })), totalMinor: placed.quote.cart.totals.totalMinor, payment: placed.quote.payment.label, address: placed.quote.address.label, placedAt: order!.createdAt } : null;
  const orderId = order?.attempt.results[0]?.orderId;
  // An Instamart order has no live tracking here. An unknown outcome stays on screen until resolved; a waiting UPI payment only
  // within its payment window (an older one lapsed on Swiggy's side); a placed or failed order for an hour.
  const grocery = owner?.latestAttemptId && !order ? await read<{ attempt: Attempt; createdAt: string }>(ownerId, "attempt", owner.latestAttemptId) : null;
  const age = grocery ? Date.now() - Date.parse(grocery.createdAt) : Infinity;
  const recentGrocery = grocery && (["submitted", "outcome_unknown"].includes(grocery.attempt.state) || age < (grocery.attempt.state === "payment_pending" ? UPI_WINDOW_MS : 60 * 60_000)) ? grocery.attempt : null;
  return { checkout: record?.checkout ?? null, review: live(review), attempt: order?.attempt ?? recentGrocery, order: summary, tracking: tracking && orderId && tracking.orderId === orderId ? tracking : null };
}

async function remember(ownerId: string, quote: Quote) {
  const view = await assistant.get(ownerId);
  const review: FoodReview = { quote, createdAt: new Date().toISOString(), turn: view.version };
  await write(ownerId, "assistant_context", "food_review", review);
  return review;
}
const forget = (ownerId: string) => transaction(tx => tx.remove(ownerId, "assistant_context", "food_review"));
/** A finished order or a fresh start leaves no open checkout behind. */
export const clearFoodCheckout = (ownerId: string) => transaction(async tx => { await tx.remove(ownerId, "assistant_context", "food_review"); await tx.remove(ownerId, "food_checkout", "current"); });

/** Sync the cart to Swiggy, read the live bill and payment choices; with a payment already chosen, also review the total. */
export async function startFoodCheckout(ownerId: string, signal?: AbortSignal, replaceExisting = false) {
  await forget(ownerId);
  const checkout = await foodCheckout.prepare(ownerId, await assistant.get(ownerId), signal, replaceExisting);
  const review = checkout.paymentMethodId ? await remember(ownerId, await foodCheckout.quote(ownerId)) : null;
  await setActiveCheckout(ownerId, "restaurant");
  return { ...(await foodState(ownerId)), checkout, review };
}

/** Where the dishes in this cart stand in the customer's Swiggy app cart. */
export type FoodSync = { state: "synced" | "empty" | "conflict" | "skipped"; message: string | null };
/** Mirrors the dishes chosen here into the Swiggy app cart, so they show there as groceries do in the Instamart bag. A failure leaves the dishes saved here. */
export async function syncFoodCart(ownerId: string, signal?: AbortSignal, replaceExisting = false): Promise<FoodState & { sync: FoodSync }> {
  let sync: FoodSync;
  try {
    const checkout = await foodCheckout.sync(ownerId, signal, replaceExisting);
    // A total reviewed for other dishes no longer stands.
    const review = await read<FoodReview>(ownerId, "assistant_context", "food_review");
    if (review && review.quote.cart.revision !== checkout?.cart.revision) await forget(ownerId);
    sync = { state: checkout ? "synced" : "empty", message: null };
  } catch (error) {
    if (signal?.aborted) throw error;
    const known = error instanceof Error && "code" in error ? error as Error & { code: string } : null;
    sync = { state: known?.code === "EXISTING_FOOD_CART" ? "conflict" : "skipped", message: known?.message ?? "Swiggy didn’t answer. Your dishes are saved here and go to Swiggy at checkout." };
  }
  return { ...(await foodState(ownerId)), sync };
}

export async function chooseFoodPayment(ownerId: string, paymentId: string) {
  await forget(ownerId);
  const checkout = await foodCheckout.selectPayment(ownerId, paymentId);
  const review = await remember(ownerId, await foodCheckout.quote(ownerId));
  await setActiveCheckout(ownerId, "restaurant");
  return { ...(await foodState(ownerId)), checkout, review };
}

/** Places exactly the reviewed order. Callers decide consent; this only refuses a missing or expired review. */
export async function placeFoodOrder(ownerId: string, quoteId?: string) {
  const review = live(await read<FoodReview>(ownerId, "assistant_context", "food_review"));
  if (!review || (quoteId && review.quote.id !== quoteId)) throw new AppError("QUOTE_EXPIRED", "Review a fresh total before ordering.", 409);
  const attempt = await foodCheckout.confirm(ownerId, review.quote.id, review.quote.challenge);
  await forget(ownerId);
  if (attempt.state === "complete") { await assistant.clearRestaurantCart(ownerId); await clearFoodCheckout(ownerId); }
  return { ...(await foodState(ownerId)), attempt };
}

export async function refreshFoodOrder(ownerId: string) {
  const owner = await read<Owner>(ownerId, "owner", ownerId);
  if (!owner?.latestAttemptId) throw new AppError("NOT_FOUND", "There is no order to check yet.", 404);
  if (!owner.latestAttemptId.startsWith("food_attempt")) return foodState(ownerId);
  const before = await read<{ attempt: Attempt }>(ownerId, "food_attempt", owner.latestAttemptId);
  const attempt = await foodCheckout.refreshAttempt(ownerId, owner.latestAttemptId);
  // A UPI payment that just succeeded completes the order: the dishes leave the cart once.
  if (attempt.state === "complete" && before?.attempt.state !== "complete") { await assistant.clearRestaurantCart(ownerId); await clearFoodCheckout(ownerId); }
  return { ...(await foodState(ownerId)), attempt };
}

export async function resetFoodOrder(ownerId: string, attemptId: string) {
  await foodCheckout.resetUnconfirmed(ownerId, attemptId);
  return foodState(ownerId);
}

/** Where a placed order is now, from Swiggy's live tracking. Nothing here is guessed. */
export async function trackFoodOrder(ownerId: string) {
  const state = await refreshFoodOrder(ownerId);
  const orderId = state.attempt?.results[0]?.orderId;
  if (state.attempt?.state !== "complete" || !orderId || !state.attempt.id.startsWith("food_attempt")) return { ...state, tracking: null };
  const provider = foodOrdering(ownerId);
  try {
    const live = await provider.trackOrder({ orderId });
    const tracking: FoodTracking = { orderId, status: live.status, stage: trackingStage(live.status, live.terminal), etaText: live.etaText, message: live.message, terminal: live.terminal, checkedAt: new Date().toISOString() };
    await write(ownerId, "assistant_context", "food_tracking", tracking);
    return { ...state, tracking };
  } finally { await provider.close(); }
}
