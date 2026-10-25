import type { Attempt, Quote, SessionView } from "../lib/contracts";
import { assistant, instamartSession, syncInstamartBag } from "./assistant-service";
import { AppError } from "./errors";
import { confirmQuote, createQuote, getOwner, getView, selectPayment } from "./service";
import { read, transaction, write } from "./store";

/** The Instamart total the customer last heard; "confirm" means exactly this review. */
export type InstamartReview = { quote: Quote; createdAt: string; turn: number };
export type InstamartState = { session: SessionView | null; review: InstamartReview | null };
/** Which checkout a spoken "pay with cash" or "confirm" refers to. */
export type ActiveCheckout = "restaurant" | "instamart";

const live = (review: InstamartReview | null) => review && Date.parse(review.quote.expiresAt) > Date.now() ? review : null;
const forget = (ownerId: string) => transaction(tx => tx.remove(ownerId, "assistant_context", "instamart_review"));
async function remember(ownerId: string, quote: Quote) {
  const review: InstamartReview = { quote, createdAt: new Date().toISOString(), turn: (await assistant.get(ownerId)).version };
  await write(ownerId, "assistant_context", "instamart_review", review);
  return review;
}

export async function instamartState(ownerId: string, session?: SessionView): Promise<InstamartState> {
  const owner = await getOwner(ownerId);
  const current = session ?? (owner?.sessionId ? await getView(ownerId, owner.sessionId).catch(() => null) : null);
  return { session: current, review: live(await read<InstamartReview>(ownerId, "assistant_context", "instamart_review")) };
}
/** The live Instamart review, without touching the provider. */
export const instamartReview = async (ownerId: string) => live(await read<InstamartReview>(ownerId, "assistant_context", "instamart_review"));
export const activeCheckout = async (ownerId: string) => (await read<{ value: ActiveCheckout }>(ownerId, "assistant_context", "active_checkout"))?.value ?? null;
/** A fresh start leaves no Instamart review or active checkout behind; the bag stays as it is, no longer following this cart. */
export const clearCheckouts = (ownerId: string) => transaction(async tx => { await tx.remove(ownerId, "assistant_context", "instamart_review"); await tx.remove(ownerId, "assistant_context", "active_checkout"); await tx.remove(ownerId, "assistant_context", "instamart_share"); });
export const setActiveCheckout = (ownerId: string, value: ActiveCheckout) => write(ownerId, "assistant_context", "active_checkout", { value });

/** Brings the Instamart bag up to date with the chosen groceries and reads the live bill; with a payment already chosen, also reviews the total. */
export async function prepareInstamartBag(ownerId: string) {
  await forget(ownerId);
  const view = await assistant.get(ownerId);
  const result = await assistant.prepare(ownerId, view.version);
  const review = result.quote ? await remember(ownerId, result.quote) : null;
  await setActiveCheckout(ownerId, "instamart");
  return { session: result.session, review };
}

/** Where the groceries in this cart stand in the Instamart bag. */
export type InstamartSync = { state: "synced" | "empty" | "skipped"; message: string | null };
/** Mirrors the groceries chosen here into the Instamart bag as they change, as dishes go into the Swiggy Food cart. A failure leaves them saved here. */
export async function syncInstamart(ownerId: string, signal?: AbortSignal): Promise<{ session: SessionView | null; sync: InstamartSync }> {
  try {
    const { session, empty } = await syncInstamartBag(ownerId, signal);
    // A total reviewed for another bag no longer stands.
    const review = await instamartReview(ownerId);
    if (session && review && review.quote.cart.revision !== session.cart.revision) await forget(ownerId);
    return { session, sync: { state: empty ? "empty" : "synced", message: null } };
  } catch (error) {
    if (signal?.aborted) throw error;
    const known = error instanceof Error && "code" in error ? error : null;
    return { session: null, sync: { state: "skipped", message: known?.message ?? "Instamart didn’t answer. Your groceries are saved here and go to the bag at checkout." } };
  }
}

/** A spoken payment choice ("cash", "Swiggy Money") for the Instamart bag, then the exact total to confirm. */
export async function chooseInstamartPayment(ownerId: string, paymentId: string) {
  await forget(ownerId);
  const session = await instamartSession(ownerId);
  const chosen = await selectPayment(ownerId, session.sessionId, paymentId);
  const review = await remember(ownerId, await createQuote(ownerId, chosen.sessionId, chosen.cart.revision));
  await setActiveCheckout(ownerId, "instamart");
  return { session: chosen, review };
}

/** Places exactly the reviewed Instamart order. Consent is checked by the caller. */
export async function placeInstamartOrder(ownerId: string, quoteId?: string): Promise<{ attempt: Attempt }> {
  const review = live(await read<InstamartReview>(ownerId, "assistant_context", "instamart_review"));
  if (!review || (quoteId && review.quote.id !== quoteId)) throw new AppError("QUOTE_EXPIRED", "Review a fresh Instamart total before ordering.", 409);
  const attempt = await confirmQuote(ownerId, review.quote.id, review.quote.challenge);
  await forget(ownerId);
  if (attempt.state === "complete") await assistant.clearOrderedGroceries(ownerId);
  return { attempt };
}
