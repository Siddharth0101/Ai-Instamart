import { createGroq } from "@ai-sdk/groq";
import { ToolLoopAgent, generateText, isStepCount, tool, wrapLanguageModel, type ModelMessage } from "ai";
import { z } from "zod";
import type { AssistantView, MealOffer, RestaurantCard } from "../lib/assistant-contracts";
import { dishMatches, restaurantMatches, sortRestaurants } from "../lib/screen-filter";
import { matchSpoken, nameSaid, normalizeVoice, resolveAddressAnswer, saidPosition, spokenQuantityFor } from "../lib/spoken-match";
import { shouldResumeDiscovery } from "../lib/discovery-resume";
import { paymentsFor } from "../lib/device";
import { assistant, foodAddresses, selectFoodAddress } from "./assistant-service";
import { AppError } from "./errors";
import { chooseFoodPayment, clearFoodCheckout, foodState, placeFoodOrder, startFoodCheckout, trackFoodOrder, type FoodState } from "./food-flow";
import { speakable } from "./speech-text";
import { GROCERY_RAILS } from "../lib/grocery-catalog";
import { activeCheckout, chooseInstamartPayment, clearCheckouts, instamartReview as readInstamartReview, instamartState, placeInstamartOrder, prepareInstamartBag, setActiveCheckout, type ActiveCheckout, type InstamartReview } from "./instamart-flow";
import type { Attempt, SessionView } from "../lib/contracts";

/** What the page should do besides showing the new state: these are the agent's hands on the UI. */
export type AgentEffect =
  | { kind: "panel"; panel: "cart" | "address" | "connections" | "checkout" | "order" | "bag" | "review" | null }
  | { kind: "scroll"; direction: "up" | "down" | "top" | "stop" }
  | { kind: "browse"; query?: string; sort?: "recommended" | "rating" | "delivery"; openOnly?: boolean }
  | { kind: "stop_listening" };
/** `retryable`: when every model is briefly rate limited and nothing was done yet, answer "busy" without recording the turn, so the page can send the same words again. */
/** `mobile`: the customer is on a phone (UPI opens the app) rather than a computer (UPI is a QR to scan). */
export type AgentTurnInput = { text: string; expectedVersion: number; retryable?: boolean; visibleRestaurantIds?: string[]; visibleOfferIds?: string[]; focusedId?: string | null; panel?: string | null; mobile?: boolean };
/** `degraded` is set when the model failed and the customer heard a generic fallback instead; `trace` lists the tools used ("✗" marks a refusal or error). */
export type InstamartTurn = { session: SessionView | null; review: InstamartReview | null; attempt?: Attempt };
export type AgentTurnResult = { view: AssistantView; reply: { id: string; text: string }; effects: AgentEffect[]; food: FoodState; instamart?: InstamartTurn; degraded?: string; trace?: string[]; busy?: { retryInMs: number } };

const rateLimited = (error: unknown) => (error as { statusCode?: number })?.statusCode === 429 || /rate.?limit|tokens per minute/i.test(error instanceof Error ? error.message : "");
/** Groq checks tool arguments against the schema and rejects the whole step when the model slips; a fresh sample usually gets it right. */
const malformedToolCall = (error: unknown) => /tool call validation failed|tool_use_failed|failed to call a function/i.test(error instanceof Error ? error.message : "");
type AgentModel = Extract<Parameters<typeof wrapLanguageModel>[0]["model"], { specificationVersion: "v4" }>;
type CallOptions = Parameters<AgentModel["doGenerate"]>[0];
/** Every model is out of tokens for the moment. Not retried by the SDK: the customer hears a short "one moment" instead of a long silence. */
export class ModelBusyError extends Error { constructor(readonly retryInMs: number) { super("Every agent model is rate limited right now."); this.name = "ModelBusyError"; } }
/** How long until a rate-limited model accepts requests again, from Groq's headers or message ("try again in 4m49s"). */
function retryIn(error: unknown): number {
  const headers = (error as { responseHeaders?: Record<string, string> })?.responseHeaders ?? {};
  const seconds = Number(headers["retry-after"]);
  if (headers["retry-after"] !== undefined && Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const said = /try again in (?:(\d+)h)?(?:(\d+)m)?([\d.]+)(ms|s)/i.exec(error instanceof Error ? error.message : "");
  return said ? Number(said[1] ?? 0) * 3_600_000 + Number(said[2] ?? 0) * 60_000 + Number(said[3]) * (said[4] === "ms" ? 1 : 1000) : 20_000;
}
/** Tool schemas without the `$schema` URL and `additionalProperties` flags: the model needs neither (tools validate their own input), and every step resends them. */
function lean(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(lean);
  if (!schema || typeof schema !== "object") return schema;
  return Object.fromEntries(Object.entries(schema).filter(([key]) => key !== "$schema" && key !== "additionalProperties").map(([key, value]) => [key, lean(value)]));
}
const leanTools = (params: CallOptions): CallOptions => ({ ...params, tools: params.tools?.map(entry => entry.type === "function" ? { ...entry, inputSchema: lean(entry.inputSchema) as typeof entry.inputSchema } : entry) });
/** A resting model is tried again after at most five minutes: daily limits reset, and one failed call costs little. */
const MAX_REST = 5 * 60_000;
const pause = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  const timer = setTimeout(resolve, ms);
  signal?.addEventListener("abort", () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
});
/**
 * The agent's model with same-step recovery. A malformed tool call is sampled once more. When a model's per-minute or
 * per-day allowance runs out, the step moves to the next model, and the exhausted one rests until Groq says it is
 * available again, so later steps don't pay for a failed call. Only when every model rests is a wait of up to 12 seconds
 * absorbed (waiting beats asking the customer to repeat); a longer one becomes ModelBusyError. Tools never run twice: only the model call is repeated.
 */
export function resilientModel(primary: AgentModel, fallbacks: AgentModel[] = [], options: { maxWaitMs?: number; adjust?: (model: AgentModel, params: CallOptions) => CallOptions } = {}) {
  const chain = [primary, ...fallbacks], resting = new Map<AgentModel, number>(), maxWaitMs = options.maxWaitMs ?? 12_000;
  const generate = async (model: AgentModel, params: CallOptions) => {
    const tuned = options.adjust?.(model, params) ?? params;
    try { return await model.doGenerate(tuned); }
    catch (error) { if (!malformedToolCall(error)) throw error; return model.doGenerate(tuned); }
  };
  return wrapLanguageModel({ model: primary, middleware: { specificationVersion: "v4", transformParams: async ({ params }) => leanTools(params), wrapGenerate: async ({ params }) => {
    for (const model of chain) {
      if ((resting.get(model) ?? 0) > Date.now()) continue;
      try { return await generate(model, params); }
      catch (error) { if (!rateLimited(error)) throw error; resting.set(model, Date.now() + Math.min(retryIn(error), MAX_REST)); }
    }
    const [soonest, until] = chain.map(model => [model, resting.get(model) ?? 0] as const).sort((a, b) => a[1] - b[1])[0];
    if (until - Date.now() > maxWaitMs) throw new ModelBusyError(until - Date.now());
    await pause(Math.max(0, until - Date.now()) + 250, params.abortSignal);
    try { return await generate(soonest, params); }
    catch (error) { if (!rateLimited(error)) throw error; const wait = retryIn(error); resting.set(soonest, Date.now() + Math.min(wait, MAX_REST)); throw new ModelBusyError(wait); }
  } } });
}
/** One chain per process, so a model resting after its daily limit stays skipped across turns. */
let groqChain: ReturnType<typeof resilientModel> | null = null;
function groqModel() {
  if (groqChain) return groqChain;
  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
  const ids = [process.env.GROQ_AGENT_MODEL?.trim() || "openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"].filter((id, index, all) => all.indexOf(id) === index);
  const [primary, ...fallbacks] = ids.map(id => groq(id));
  // gpt-oss reasons briefly; Qwen answers directly, which it does well for tool calls.
  return groqChain = resilientModel(primary, fallbacks, { adjust: (model, params) => model.modelId.startsWith("openai/gpt-oss") ? params
    : { ...params, providerOptions: { ...params.providerOptions, groq: { ...params.providerOptions?.groq, reasoningEffort: "none" } } } });
}

/** Consent is read from the customer's own words, never from the model's tool arguments. */
const EXPLICIT_CONFIRM = /\b(?:confirm|place (?:the |my |this )?order|order (?:it|now|kar(?:o|do| do| dijiye)?|place kar(?:o|do)?)|book (?:it|kar(?:o|do)?)|pay (?:now|kar(?:o|do)?))\b|ऑर्डर (?:कर|प्लेस)|कन्फर्म|बुक कर/i;
/** Only the customer's own goodbye ends listening; the model cannot hang up on them. */
const STOP_LISTENING = /\b(?:bye|goodbye|good night|stop listening|stop the mic|that'?s all|thats it|that is all|band karo|band kar do|mic band|voice band|ruk jao|bas itna(?: hi)?|chalo bye|alvida)\b|बंद करो|बस इतना|अलविदा/i;
/** The reply follows the script of the latest words, whatever language earlier turns used. */
export function replyLanguage(text: string) {
  if (/[\u0900-\u097F]/.test(text)) return "Hindi, in Devanagari script";
  return /\b(?:hai|haan|nahi|karo|kar|kholo|dikhao|wala|wali|mujhe|mera|meri|mere|chahiye|daal|ghar|aur|bhai|kya|kitna|kitni|kahan|kab|kaise|tak|pahuncha|hua|hoga|der|abhi|batao|bolo|hata|chalo|achha|theek|bas|ek|teen|karna|dena|lena|daal|dikha|chahiye|wale)\b/i.test(text) ? "Hinglish, in Roman (English) letters" : "English";
}
/** Does the reply already read in the language the customer used? */
export function replyMatches(reply: string, language: string) {
  const devanagari = /[\u0900-\u097F]/.test(reply);
  if (language.startsWith("Hindi")) return devanagari;
  if (language.startsWith("Hinglish")) return !devanagari && /\b(?:hai|hain|ho|hoga|gaya|gayi|gaye|kar|karo|karein|karna|karun|kiya|diya|diye|dijiye|kya|aur|aap|aapka|aapke|ka|ki|ke|mein|se|ko|nahi|haan|chahiye|wala|wali|dekhein|batayein|lijiye|abhi|bhi|toh|par|pe|ab|kuch|sab)\b/i.test(reply);
  return !devanagari;
}
const REWRITE = (language: string) => `Rewrite the shopping assistant's reply in ${language}. Keep the meaning, every number and price, and all restaurant and dish names exactly. Hinglish means Hindi written in Roman letters mixed with English, for example: "Truffles khul gaya, 2 Peri Peri Fries add kar diye. Aur kuch chahiye?". Output only the rewritten reply.`;
let rewriteChain: ReturnType<typeof resilientModel> | null = null;
/** When the agent answers in the wrong language, a fast small model rewrites just the reply; on any failure the original stands. */
export async function inLanguage(reply: string, language: string, model?: AgentModel) {
  if (!reply || replyMatches(reply, language)) return reply;
  try {
    if (!model) {
      const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
      model = rewriteChain ??= resilientModel(groq("qwen/qwen3.8-27b"), [groq("openai/gpt-oss-20b")], { maxWaitMs: 0, adjust: (entry, params) => entry.modelId.startsWith("openai/gpt-oss") ? params : { ...params, providerOptions: { ...params.providerOptions, groq: { ...params.providerOptions?.groq, reasoningEffort: "none" } } } });
    }
    const result = await generateText({ model, system: REWRITE(language), prompt: reply, temperature: 0.2, maxOutputTokens: 160, maxRetries: 0, abortSignal: AbortSignal.timeout(3000) });
    const rewritten = tidy(result.text);
    return rewritten && replyMatches(rewritten, language) ? rewritten : reply;
  } catch { return reply; }
}
const AFFIRMATIVE = /^(?:yes|yeah|yep|sure|ok(?:ay)?|go ahead|do it|haan(?: ji)?|han|ha|haan karo|theek hai|thik hai|bilkul|kar do|हाँ|हां|ठीक है|कर दो)[\s.!]*$/i;

/** The payment option a spoken choice names ("cash", "UPI", "PhonePe se"), or a question listing the options. */
function paymentChoice(method: string, all: { id: string; label: string }[], mobile = false) {
  const said = normalizeVoice(method).replace(/\b(?:cash|nakad)\b/, "cash on delivery").replace(/\bcod\b/, "cash on delivery");
  const options = paymentsFor(all, mobile);
  // On a computer UPI is paid by scanning a QR with the phone, whichever UPI app the customer named.
  const qr = !mobile && /\b(?:upi|phone ?pe|phonepay|g ?pay|google pay|paytm|bhim)\b/.test(said) ? options.find(option => option.id.startsWith("upi_qr")) : undefined;
  if (qr) return qr;
  const choice = matchSpoken(said, options.map(option => ({ id: option.id, name: option.label }))) ?? (/upi/.test(said) ? options.find(option => /upi/i.test(option.label)) ?? null : null);
  if (!choice) throw new AppError("PAYMENT_UNCLEAR", `Which payment method? Options: ${options.map(option => option.label).join(", ") || "none returned yet"}.`, 422);
  return choice;
}
const money = (minor: number | null | undefined) => minor === null || minor === undefined ? "price at checkout" : `₹${(minor / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
function cart(view: AssistantView) {
  return view.task.items.flatMap(item => { const offer = view.offers.find(entry => entry.id === item.selectedOfferId); return offer ? [{ item, offer }] : []; });
}
function restaurantsOnScreen(view: AssistantView, input: AgentTurnInput): RestaurantCard[] {
  const all = view.restaurantBrowser?.restaurants ?? [];
  const visible = (input.visibleRestaurantIds ?? []).map(id => all.find(card => card.id === id)).filter((card): card is RestaurantCard => !!card);
  return visible.length ? visible : all;
}
function dishesOnScreen(view: AssistantView, input: AgentTurnInput): MealOffer[] {
  // A dish listed in two sections is one numbered dish, as on screen.
  const all = [...new Map((view.restaurantBrowser?.menu?.sections.flatMap(section => section.items) ?? []).map(dish => [dish.id, dish] as const)).values()];
  const visible = (input.visibleOfferIds ?? []).map(id => all.find(dish => dish.id === id)).filter((dish): dish is MealOffer => !!dish);
  return visible.length ? visible : all;
}
function groceriesOnScreen(view: AssistantView) {
  const active = view.task.discovery?.kind === "snacks" ? view.task.discovery.itemId : null;
  return view.offers.filter(offer => offer.provider === "instamart" && (!active || offer.itemId === active));
}

/** The numbered screen the customer sees, so "the second one" and "isko" mean the same thing to the agent. */
function describe(view: AssistantView, input: AgentTurnInput, food: FoodState, addressLabel: string | null, savedAddresses: string[], groceries: { review: InstamartReview | null; active: ActiveCheckout | null }): string {
  const lines: string[] = [];
  const asked = view.questions[0]?.id === "food_address";
  // The saved names are listed even before anything is searched, so "ghar pe" can be answered on the very first turn.
  const saved = savedAddresses.length ? savedAddresses : asked ? view.questions[0].options : [];
  lines.push(addressLabel ? `Delivery address: ${addressLabel}.` : `Delivery address: not chosen${saved.length ? ` (saved: ${saved.join(", ")})` : ""}.`);
  const food_ = view.providers.find(provider => provider.id === "swiggy_food");
  if (food_?.status !== "connected") lines.push("Swiggy Food is NOT connected: nothing can be searched or ordered yet. Ask the customer to tap Connect Swiggy on screen (show_panel connections also shows it).");
  const menu = view.restaurantBrowser?.menu;
  if (menu) {
    const inCart = new Map(cart(view).map(({ item, offer }) => [offer.providerItemId, item.quantity]));
    lines.push(`SCREEN: menu of ${menu.restaurant.name}${menu.restaurant.isOpen === false ? " (closed now: cannot order)" : ""}. Dishes:`);
    dishesOnScreen(view, input).slice(0, 40).forEach((dish, index) => lines.push(`${index + 1}. ${dish.name} — ${money(dish.priceMinor)}${dish.available ? "" : " (unavailable)"}${inCart.get(dish.providerItemId) ? ` [in cart ×${inCart.get(dish.providerItemId)}]` : ""}${dish.id === input.focusedId ? " ← highlighted" : ""}`));
    if (menu.hasMore) lines.push("More dishes can be loaded.");
    const others = (view.restaurantBrowser?.restaurants ?? []).filter(card => card.id !== menu.restaurant.id);
    if (others.length) lines.push(`Other restaurants in the list (open_restaurant works from here): ${others.slice(0, 20).map(card => card.name).join("; ")}.`);
  } else if (view.restaurantBrowser?.restaurants.length) {
    lines.push("SCREEN: restaurant list:");
    restaurantsOnScreen(view, input).slice(0, 20).forEach((card, index) => lines.push(`${index + 1}. ${card.name}${card.cuisines.length ? ` (${card.cuisines.slice(0, 3).join(", ")})` : ""}${card.rating ? ` ★${card.rating}` : ""}${card.etaMinutes ? ` ${card.etaMinutes} min` : ""}${card.isOpen === false ? " — closed" : ""}${card.id === input.focusedId ? " ← highlighted" : ""}`));
    if (view.restaurantBrowser.hasMore) lines.push("More restaurants can be loaded.");
  } else if (groceriesOnScreen(view).length) {
    lines.push("SCREEN: Instamart products:");
    groceriesOnScreen(view).slice(0, 20).forEach((offer, index) => lines.push(`${index + 1}. ${offer.name} ${offer.unit} — ${money(offer.priceMinor)}${offer.available ? "" : " (out of stock)"}`));
  } else lines.push(asked ? "SCREEN: choose a delivery address." : "SCREEN: home (nothing listed yet).");
  const lines_ = cart(view);
  lines.push(lines_.length ? `CART: ${lines_.map(({ item, offer }) => `${item.quantity}× ${offer.name} (${offer.restaurant ?? "Instamart"}, ${money(offer.priceMinor === null ? null : offer.priceMinor * item.quantity)})${item.status === "added" ? " in Instamart bag" : ""}`).join("; ")}.` : "CART: empty.");
  // Only a checkout for exactly this cart is "open"; an older bill or order must not read as the current one.
  const foodLines = lines_.filter(({ offer }) => offer.provider === "swiggy_food");
  const current = !!food.checkout && foodLines.length > 0 && food.checkout.restaurant.name === foodLines[0].offer.restaurant
    && food.checkout.cart.lines.length === foodLines.length && foodLines.every(({ item, offer }) => food.checkout!.cart.lines.some(line => line.product.name === offer.name && line.quantity === item.quantity));
  if (food.review && current) lines.push(`ORDER REVIEW READY: total ${money(food.review.quote.cart.totals.totalMinor)} including fees, paying with ${food.review.quote.payment.label}, delivering to ${food.review.quote.address.label}. Waiting for the customer to confirm.`);
  // Dishes reach the Swiggy app cart as they are added; checkout is open only once the customer started it.
  else if (food.checkout && current && groceries.active !== "restaurant") lines.push(`These dishes are in the customer's Swiggy app cart too (bill ${money(food.checkout.cart.totals.totalMinor)}). Checkout has not started.`);
  else if (food.checkout && current) lines.push(`CHECKOUT OPEN: bill ${money(food.checkout.cart.totals.totalMinor)}; payment ${food.checkout.paymentMethodId ? food.checkout.payments.find(payment => payment.id === food.checkout!.paymentMethodId)?.label : `not chosen (options: ${paymentsFor(food.checkout.payments, !!input.mobile).map(payment => payment.label).join(", ")})`}.`);
  if (food.attempt) {
    const waiting = ["payment_pending", "submitted", "outcome_unknown"].includes(food.attempt.state);
    lines.push(waiting ? `ORDER IN PROGRESS: ${food.attempt.state} — ${food.attempt.message}${food.attempt.state === "payment_pending" ? ` NOT placed until paid; ${input.mobile ? "an Open UPI app button" : "a UPI QR"} is on screen, nothing is sent to the phone.` : ""} A new order must wait until this one resolves.`
      : `Previous order (${food.attempt.state === "complete" ? "already placed" : food.attempt.state}, separate from the current cart): ${food.order ? `${food.order.restaurant}: ${food.order.lines.map(line => `${line.quantity}× ${line.name}`).join(", ")}, ${money(food.order.totalMinor)}` : food.attempt.message}${food.tracking ? `. Delivery status: ${food.tracking.status}${food.tracking.etaText ? `, ${food.tracking.etaText}` : ""}` : ""}.`);
  }
  if (groceries.review) lines.push(`INSTAMART ORDER REVIEW READY: total ${money(groceries.review.quote.cart.totals.totalMinor)} with ${groceries.review.quote.payment.label}, delivering to ${groceries.review.quote.address.label}. Waiting for the customer to confirm.`);
  if (groceries.active && (food.checkout || groceries.review)) lines.push(`Checkout in progress: ${groceries.active === "instamart" ? "Instamart groceries" : "restaurant order"}.`);
  if (input.panel) lines.push(`Open panel: ${input.panel}.`);
  return lines.join("\n");
}

const INSTRUCTIONS = `You are SayCart, a friendly voice assistant ordering Swiggy restaurant food and Instamart groceries. The customer talks; you act with tools, then answer out loud.

Acting:
- Do what is asked with tools; several requests in one sentence mean several tool calls, in order.
- Hindi numbers: ek 1, do 2, teen 3, char 4, paanch 5. "Do naan" / "दो नान" means TWO naan.
- "This one" / "isko" is the highlighted entry. Numbers and names refer to the numbered SCREEN lists; pass them to tools as said.
- "X kholo" / "open X": open_restaurant if X is listed (also from a menu); otherwise find_restaurants, then open_restaurant, in the same turn.
- Anything not on screen: find_restaurants for food, find_groceries for groceries. Searching never adds; call update_cart for items the customer named.
- Food needs an address: if none, ask "Home or Work?" (saved names) and call set_delivery_address.
- Use only what tools return; never invent restaurants, dishes, prices, totals or order results. Explain errors simply, with what to do next.

Ordering (real money):
- "Checkout" / "bill dikhao": call checkout, ask how to pay (name the options), call choose_payment, then say the exact total and ask to confirm. Naming a method ("PhonePe se", "cash") always means choose_payment first; never ask "should I switch".
- Restaurant food and Instamart groceries are separate orders; if the cart has both, ask which first.
- A previous order never blocks a new one. "Order it again": open that restaurant and add the same dishes.
- If the Swiggy app cart already has other dishes, ask to replace; only after a yes, call checkout with replaceSwiggyCart true.
- place_order only when the customer clearly agrees to THIS total ("confirm", "haan order kar do"); never on your own.
- UPI is approved in the customer's UPI app; tell them, then you can check the status.

Speaking:
- Spoken aloud: at most two short sentences; no lists, markdown or emojis. "₹249" is fine.
- Reply in the language and script of the customer's LATEST words: English, Hinglish in Roman letters, or Hindi in Devanagari. Keep restaurant and dish names unchanged.
- Warm and quick: say what you did and the natural next step. After a search, filter or sort, name the top one or two results.`;

/**
 * What the assistant says on its own when voice opens: what is missing first (a Swiggy connection, then an address),
 * otherwise a short invitation. Recorded in the conversation and spoken like any reply.
 */
export async function greet(ownerId: string, expectedVersion: number) {
  const view = await assistant.get(ownerId);
  const food = view.providers.find(provider => provider.id === "swiggy_food");
  const saved = food?.status === "connected" ? await foodAddresses(ownerId).catch(() => null) : null;
  const names = saved?.addresses.slice(0, 2).map(address => address.label) ?? [];
  const text = food?.status !== "connected" ? "Namaste! Order karne ke liye pehle apna Swiggy account connect kijiye. Screen par Connect Swiggy dabaiye."
    : saved && !saved.selectedAddressId && names.length ? `Namaste! Kahan deliver karun, ${names.join(" ya ")}?`
    : "Namaste! Boliye, aaj kya order karna hai?";
  return assistant.announce(ownerId, { text, speech: speakable(text), expectedVersion });
}

/** `model` is for tests; the app always talks to Groq. */
export async function runVoiceTurn(ownerId: string, input: AgentTurnInput, abortSignal?: AbortSignal, options: { model?: AgentModel } = {}): Promise<AgentTurnResult> {
  let view = await assistant.get(ownerId);
  if (view.version !== input.expectedVersion) throw new AppError("PLAN_CHANGED", "The screen changed. Say that again.", 409);
  const baseCount = view.messages.length, effects: AgentEffect[] = [], startVersion = view.version;
  let food = await foodState(ownerId), addressLabel: string | null = null, savedAddresses: string[] = [];
  let active = await activeCheckout(ownerId), instamartReview = await readInstamartReview(ownerId), instamartOut: InstamartTurn | undefined;
  /** A search this turn without any cart change: the reply must not claim something was added. */
  let searched = false, cartTouched = false, orderPlaced = false, awaitingUpi = false;
  const refreshAddress = async () => {
    const saved = await foodAddresses(ownerId).catch(() => null), chosen = saved?.addresses.find(address => address.id === saved.selectedAddressId);
    addressLabel = chosen ? `${chosen.label} (${chosen.reviewAddressText})` : null; savedAddresses = saved?.addresses.map(address => address.label) ?? [];
    return saved;
  };
  await refreshAddress();
  const screen = () => describe(view, input, food, addressLabel, savedAddresses, { review: instamartReview, active });
  const panel = (value: Extract<AgentEffect, { kind: "panel" }>["panel"]) => effects.push({ kind: "panel", panel: value });
  /** Every tool returns the outcome plus the fresh screen; failures become words the agent can explain. */
  let actions = 0;
  /** Tools that change what is listed return the fresh screen; the rest return only their outcome, to keep each step small. */
  const run = async (work: () => Promise<string | Record<string, unknown>>, withScreen = false) => {
    actions++;
    try { const outcome = await work(); food = await foodState(ownerId); return withScreen ? { ok: true, outcome, screen: screen() } : { ok: true, outcome, cart: cartSummary() }; }
    catch (error) { if (abortSignal?.aborted) throw error; return { ok: false, error: error instanceof Error ? error.message : "That did not work.", screen: screen() }; }
  };
  /** Save the address, then show what delivers there (resuming an earlier search when there was one). */
  const deliverTo = async (id: string) => {
    view = await selectFoodAddress(ownerId, id, view.version);
    await refreshAddress();
    view = shouldResumeDiscovery(view, true) ? await assistant.search(ownerId, view.version) : await assistant.browse(ownerId, { query: "restaurants", route: "restaurant", expectedVersion: view.version });
    panel(null);
  };
  const cartSummary = () => { const lines = cart(view); return lines.length ? lines.map(({ item, offer }) => `${item.quantity}× ${offer.name}`).join(", ") : "empty"; };

  const tools = {
    set_delivery_address: tool({
      description: "Choose the delivery address from the customer's saved addresses (e.g. 'Home', 'Work', 'ghar', 'the second one').",
      inputSchema: z.object({ address: z.string().describe("The customer's words for the address") }),
      execute: ({ address }) => run(async () => {
        const saved = await foodAddresses(ownerId);
        const id = resolveAddressAnswer(address, saved.addresses);
        if (!id) throw new AppError("ADDRESS_UNCLEAR", `Which address? Saved: ${saved.addresses.map(entry => entry.label).join(", ") || "none — add one in the Swiggy app"}.`, 422);
        // Where to deliver is the customer's choice: their own words must name this address, not just the model's.
        const said = normalizeVoice(input.text), named = normalizeVoice(address);
        if (resolveAddressAnswer(input.text, saved.addresses) !== id && !(named.length >= 3 && said.includes(named))) throw new AppError("ADDRESS_NOT_SAID", `The customer has not said where to deliver yet. Ask: ${saved.addresses.slice(0, 2).map(entry => entry.label).join(" or ")}?`, 409);
        await deliverTo(id);
        return `Delivering to ${addressLabel}.`;
      }, true),
    }),
    find_restaurants: tool({
      description: "Show restaurants near the delivery address, optionally for a dish, cuisine or restaurant name.",
      inputSchema: z.object({ query: z.string().nullish().describe("Dish, cuisine or restaurant; empty for all nearby") }),
      execute: ({ query }) => run(async () => {
        view = await assistant.browse(ownerId, { query: query?.trim() || "restaurants", route: "restaurant", expectedVersion: view.version });
        panel(null); effects.push({ kind: "browse", query: "" }); searched = true;
        return view.questions[0]?.id === "food_address" ? "A delivery address is needed first." : `Showing ${view.restaurantBrowser?.restaurants.length ?? 0} restaurants.`;
      }, true),
    }),
    open_restaurant: tool({
      description: "Open a restaurant's menu from the restaurant list (by list number or name, or 'highlighted').",
      inputSchema: z.object({ restaurant: z.string() }),
      execute: ({ restaurant }) => run(async () => {
        const list = restaurantsOnScreen(view, input);
        const card = /^(?:this|highlighted|is|isko|ye|yeh)$/i.test(restaurant.trim()) ? list.find(entry => entry.id === input.focusedId) : matchSpoken(restaurant, list);
        if (!card) throw new AppError("RESTAURANT_UNCLEAR", `I couldn't tell which restaurant "${restaurant}" is. Say its name or number.`, 422);
        if (view.restaurantBrowser?.menu) view = await assistant.backRestaurants(ownerId, view.version);
        view = await assistant.openRestaurant(ownerId, { restaurantId: card.id, expectedVersion: view.version });
        panel(null); searched = true;
        return `Opened ${card.name}.`;
      }, true),
    }),
    back_to_restaurants: tool({
      description: "Leave the menu and show the restaurant list again.",
      inputSchema: z.object({}),
      execute: () => run(async () => { view = await assistant.backRestaurants(ownerId, view.version); panel(null); return "Showing the restaurant list."; }, true),
    }),
    show_more: tool({
      description: "Load more results of the current list: restaurants, dishes or groceries.",
      inputSchema: z.object({ what: z.enum(["restaurants", "dishes", "groceries"]) }),
      execute: ({ what }) => run(async () => {
        if (what === "dishes") view = await assistant.moreMenu(ownerId, view.version);
        else if (what === "restaurants") view = await assistant.moreRestaurants(ownerId, view.version);
        else { const itemId = view.task.discovery?.itemId; if (!itemId) throw new AppError("NO_LIST", "Search for groceries first.", 422); view = await assistant.more(ownerId, { itemId, expectedVersion: view.version }); }
        return `Loaded more ${what}.`;
      }, true),
    }),
    update_cart: tool({
      description: "Add dishes or groceries to the cart, set an exact quantity, or remove them. Dishes come from the open menu; set/remove also work for anything already in the cart.",
      inputSchema: z.object({ changes: z.array(z.object({
        item: z.string().describe("List number, name, or 'highlighted'"),
        action: z.enum(["add", "set", "remove"]).describe("add = add this many more; set = make the quantity exactly this; remove = take it out"),
        quantity: z.number().int().min(0).max(20).nullish().describe("How many; Hindi 'do' before a dish means 2, 'teen' 3, 'ek' 1"),
      })).min(1).max(8) }),
      execute: ({ changes }) => run(async () => {
        const done: string[] = [], added = new Set<string>();
        for (const change of changes) {
          const lines = cart(view), menuDishes = dishesOnScreen(view, input), groceries = groceriesOnScreen(view);
          const pointing = /^(?:this|highlighted|is|isko|ye|yeh|it)$/i.test(change.item.trim());
          // Adding by a list number the customer never said is the model's guess at the screen: it stands only when that item is one they named.
          const position = /^\d{1,2}$/.test(change.item.trim()) ? Number(change.item.trim()) : null;
          if (change.action === "add" && position && !saidPosition(input.text, position)) {
            const candidate = (view.restaurantBrowser?.menu ? menuDishes : groceries)[position - 1];
            if (!candidate || !nameSaid(candidate.name, input.text)) throw new AppError("ITEM_BY_NAME", `${candidate ? `"${change.item}" is ${candidate.name}, which the customer did not name. If they asked for ${candidate.name}, use that name; otherwise use` : `"${change.item}" is not on screen. Use`} the item names they said.${done.length ? ` Done so far: ${done.join(", ")}.` : ""}`, 422);
          }
          const fromMenu = view.restaurantBrowser?.menu ? (pointing ? menuDishes.find(dish => dish.id === input.focusedId) : matchSpoken(change.item, menuDishes)) : null;
          const fromCart = lines.find(line => line.offer.id === fromMenu?.id || line.offer.providerItemId === fromMenu?.providerItemId) ?? (fromMenu ? undefined : matchSpoken(change.item, lines.map(line => ({ ...line, id: line.offer.id, name: line.offer.name }))) ?? undefined);
          let grocery = !fromMenu && !fromCart ? matchSpoken(change.item, groceries) : null;
          // A grocery named by voice but not on screen ("do coca cola aur ek Lay's") is looked up on Instamart right here.
          if (!fromMenu && !fromCart && !grocery && change.action !== "remove" && !view.restaurantBrowser?.menu && view.providers.some(provider => provider.id === "instamart" && provider.status === "connected")) {
            view = await assistant.browse(ownerId, { query: change.item, route: "instamart", expectedVersion: view.version });
            grocery = matchSpoken(change.item, groceriesOnScreen(view));
          }
          // Two additions landing on the same product in one request means one of them was misread.
          const identity = fromMenu?.providerItemId ?? fromCart?.offer.providerItemId ?? grocery?.providerItemId;
          if (change.action === "add" && identity && added.has(identity)) throw new AppError("ITEM_UNCLEAR", `"${change.item}" is ${fromMenu?.name ?? fromCart?.offer.name ?? grocery?.name} again, already added in this request. Check which product the customer meant.${done.length ? ` Done so far: ${done.join(", ")}.` : ""}`, 422);
          if (change.action === "add" && identity) added.add(identity);
          const current = fromCart?.item.quantity ?? 0;
          // The number the customer actually said before the name wins over a model that defaulted to one.
          const matched = fromMenu?.name ?? fromCart?.offer.name ?? grocery?.name;
          const heard = matched && change.action !== "remove" ? spokenQuantityFor(input.text, matched) : null;
          const quantity = heard && heard > 1 && (change.quantity ?? 1) === 1 ? heard : change.quantity ?? 1;
          const target = change.action === "remove" ? 0 : change.action === "set" ? quantity : current + Math.max(1, quantity);
          if (fromMenu) {
            if (fromMenu.available === false) throw new AppError("OFFER_UNAVAILABLE", `${fromMenu.name} is not available right now.`, 422);
            view = await assistant.selectMenuOffer(ownerId, { offerId: fromMenu.id, quantity: target, expectedVersion: view.version });
            done.push(target ? `${fromMenu.name} ×${target}` : `removed ${fromMenu.name}`); cartTouched = true;
          } else if (fromCart) {
            view = await assistant.setCartLine(ownerId, { offerId: fromCart.offer.id, quantity: target, expectedVersion: view.version });
            done.push(target ? `${fromCart.offer.name} ×${target}` : `removed ${fromCart.offer.name}`); cartTouched = true;
          } else if (grocery && target > 0) {
            view = await assistant.select(ownerId, { offerId: grocery.id, quantity: target, expectedVersion: view.version });
            done.push(`${grocery.name} ×${target}`); cartTouched = true;
          } else throw new AppError("ITEM_UNCLEAR", `I couldn't find "${change.item}" on screen or in the cart.${done.length ? ` Done so far: ${done.join(", ")}.` : ""}`, 422);
        }
        const restaurants = new Set(cart(view).filter(line => line.offer.provider !== "instamart").map(line => line.offer.restaurant));
        return `Cart updated: ${done.join(", ")}.${restaurants.size > 1 ? " Note: the cart now has dishes from more than one restaurant; Swiggy orders one restaurant at a time." : ""}`;
      }),
    }),
    view_controls: tool({
      description: "Filter what is on screen by a word (empty clears), sort restaurants, or show only open ones. Returns exactly what is shown.",
      inputSchema: z.object({ filter: z.string().nullish(), sort: z.enum(["recommended", "rating", "delivery"]).nullish(), openOnly: z.boolean().nullish() }),
      execute: ({ filter, sort, openOnly }) => run(async () => {
        // The same rule the page applies, so the agent can say what is showing instead of guessing.
        const menu = view.restaurantBrowser?.menu, query = filter?.trim() ?? "";
        if (menu) {
          const dishes = menu.sections.flatMap(section => section.items).filter(dish => dishMatches(dish, query));
          if (!dishes.length) throw new AppError("NO_MATCH", `No dish on this menu matches "${query}". Nothing was filtered.`, 422);
          effects.push({ kind: "browse", query });
          return { showing: dishes.slice(0, 12).map(dish => `${dish.name} ${money(dish.priceMinor)}`), count: dishes.length };
        }
        const places = sortRestaurants((view.restaurantBrowser?.restaurants ?? []).filter(card => (!openOnly || card.isOpen === true) && restaurantMatches(card, query)), sort ?? "recommended");
        if (!places.length) throw new AppError("NO_MATCH", `No restaurant on screen matches${query ? ` "${query}"` : ""}${openOnly ? " and is open" : ""}. Nothing was filtered${query ? `; call find_restaurants with "${query}" to search Swiggy for it` : ""}.`, 422);
        effects.push({ kind: "browse", ...(filter != null ? { query } : {}), ...(sort ? { sort } : {}), ...(openOnly != null ? { openOnly } : {}) });
        return { showing: places.slice(0, 8).map(card => `${card.name}${card.rating ? ` ★${card.rating}` : ""}${card.etaMinutes ? ` ${card.etaMinutes} min` : ""}`), count: places.length };
      }),
    }),
    scroll: tool({
      description: "Scroll the page continuously up or down, jump to the top, or stop scrolling.",
      inputSchema: z.object({ direction: z.enum(["up", "down", "top", "stop"]) }),
      execute: ({ direction }) => run(async () => { effects.push({ kind: "scroll", direction }); return direction === "stop" ? "Stopped scrolling." : `Scrolling ${direction}.`; }),
    }),
    show_panel: tool({
      description: "Open a panel (cart, delivery address, connections, checkout, order status, Instamart bag) or close the open one ('none').",
      inputSchema: z.object({ panel: z.enum(["cart", "address", "connections", "checkout", "order", "bag", "none"]) }),
      execute: ({ panel: value }) => run(async () => { panel(value === "none" ? null : value); return value === "none" ? "Closed." : `Showing ${value}.`; }),
    }),
    checkout: tool({
      description: "Start checkout for the restaurant cart or the Instamart groceries: returns the live bill and payment options, or the final total if payment is already chosen. Pass `which` when the cart has both. If the Swiggy app cart holds other dishes it asks first; after a yes, call again with replaceSwiggyCart true.",
      inputSchema: z.object({
        which: z.enum(["restaurant", "instamart"]).nullish().describe("Which order to check out when the cart has both"),
        replaceSwiggyCart: z.boolean().nullish().describe("true only after the customer agreed to replace the dishes already in their Swiggy app cart"),
      }),
      execute: ({ which, replaceSwiggyCart }) => run(async () => {
        const lines = cart(view), dishes = lines.some(line => line.offer.provider === "swiggy_food"), groceries = lines.some(line => line.offer.provider === "instamart");
        const target = which ?? (dishes && groceries ? null : dishes ? "restaurant" : groceries ? "instamart" : null);
        if (!target) throw new AppError(dishes ? "WHICH_CHECKOUT" : "EMPTY_CART", dishes ? "The cart has restaurant dishes and Instamart groceries; they are separate orders. Ask which one to check out first." : "The cart is empty. Add something first.", 422);
        if (target === "instamart") {
          if (!groceries) throw new AppError("EMPTY_CART", "There are no Instamart items in the cart.", 422);
          const result = await prepareInstamartBag(ownerId);
          view = await assistant.get(ownerId); active = "instamart"; instamartReview = result.review; instamartOut = { session: result.session, review: result.review };
          panel(result.review ? "review" : "bag");
          return result.review ? { total: money(result.review.quote.cart.totals.totalMinor), payment: result.review.quote.payment.label, next: "Ask the customer to confirm this total." }
            : { bill: money(result.session.cart.totals.totalMinor), paymentOptions: result.session.payments.map(payment => payment.label), next: "Ask how they want to pay." };
        }
        if (!dishes) throw new AppError("EMPTY_CART", "The restaurant cart is empty. Add a dish first.", 422);
        // Their own Swiggy cart is emptied only on their own words, never on the model's say-so.
        const agreed = !!replaceSwiggyCart && (AFFIRMATIVE.test(input.text.trim()) || /\b(?:replace|haan|han|yes|ok|okay|theek|thik|hata|hatao|clear|remove|empty)\b|हाँ|हां|हटा|बदल/i.test(input.text));
        const state = await startFoodCheckout(ownerId, abortSignal, agreed);
        await setActiveCheckout(ownerId, "restaurant"); active = "restaurant";
        panel("checkout");
        return state.review ? { total: money(state.review.quote.cart.totals.totalMinor), payment: state.review.quote.payment.label, next: "Ask the customer to confirm this total." }
          : { bill: money(state.checkout?.cart.totals.totalMinor), paymentOptions: paymentsFor(state.checkout?.payments ?? [], !!input.mobile).map(payment => payment.label), next: "Ask how they want to pay." };
      }),
    }),
    choose_payment: tool({
      description: "Choose how to pay for the order being checked out (e.g. 'cash', 'COD', 'UPI', 'PhonePe', 'Swiggy Money'). Returns the final total to confirm.",
      inputSchema: z.object({ method: z.string(), which: z.enum(["restaurant", "instamart"]).nullish().describe("Only when it is unclear which order is being paid") }),
      execute: ({ method, which }) => run(async () => {
        const groceriesOnly = cart(view).some(line => line.offer.provider === "instamart") && !cart(view).some(line => line.offer.provider === "swiggy_food");
        const target = which ?? active ?? (food.checkout ? "restaurant" : groceriesOnly ? "instamart" : "restaurant");
        if (target === "instamart") {
          let options = (await instamartState(ownerId)).session?.payments ?? [];
          if (!options.length) options = (await prepareInstamartBag(ownerId)).session.payments;
          const choice = paymentChoice(method, options, !!input.mobile);
          const result = await chooseInstamartPayment(ownerId, choice.id);
          active = "instamart"; instamartReview = result.review; instamartOut = { session: result.session, review: result.review };
          panel("review");
          return { total: money(result.review.quote.cart.totals.totalMinor), payment: result.review.quote.payment.label, address: result.review.quote.address.label, next: "Tell the customer the total and ask them to confirm the order." };
        }
        const options = food.checkout?.payments ?? (await startFoodCheckout(ownerId, abortSignal)).checkout?.payments ?? [];
        const state = await chooseFoodPayment(ownerId, paymentChoice(method, options, !!input.mobile).id);
        await setActiveCheckout(ownerId, "restaurant"); active = "restaurant";
        panel("checkout");
        return { total: money(state.review?.quote.cart.totals.totalMinor), payment: state.review?.quote.payment.label, address: state.review?.quote.address.label, next: "Tell the customer the total and ask them to confirm the order." };
      }),
    }),
    place_order: tool({
      description: "Place the reviewed order (restaurant or Instamart). Only after the customer explicitly confirms the total they just heard.",
      inputSchema: z.object({}),
      execute: () => run(async () => {
        const target = active ?? (instamartReview && !food.review ? "instamart" : "restaurant");
        const review = target === "instamart" ? instamartReview : food.review;
        if (!review) throw new AppError("REVIEW_REQUIRED", "There is no reviewed total yet. Run checkout and choose a payment first.", 409);
        // The customer must have heard this exact total in an earlier reply, then agreed in their own words.
        if (review.turn >= startVersion) throw new AppError("CONFIRMATION_REQUIRED", `Not placed yet: the customer has not heard the total. Tell them it is ${money(review.quote.cart.totals.totalMinor)} with ${review.quote.payment.label} and ask them to confirm.`, 409);
        // A bare "haan" only answers a reply that stated this total; "confirm order" stands on its own.
        const lastReply = view.messages.findLast(message => message.role === "assistant")?.text.replace(/[^\d.]/g, "") ?? "";
        const answersTotal = lastReply.includes(String(Math.floor(review.quote.cart.totals.totalMinor / 100)));
        if (!EXPLICIT_CONFIRM.test(input.text) && !(answersTotal && AFFIRMATIVE.test(input.text.trim()))) throw new AppError("CONFIRMATION_REQUIRED", `Not placed. Ask the customer to say "confirm order" to place it for ${money(review.quote.cart.totals.totalMinor)}.`, 409);
        if (target === "instamart") {
          const { attempt } = await placeInstamartOrder(ownerId, review.quote.id); orderPlaced = true;
          // The fresh session has the emptied bag, so the page stops counting the ordered items.
          view = await assistant.get(ownerId); instamartReview = null; instamartOut = { session: (await instamartState(ownerId)).session, review: null, attempt };
          panel("order");
          return { state: attempt.state, message: attempt.message };
        }
        const state = await placeFoodOrder(ownerId, review.quote.id); orderPlaced = true;
        view = await assistant.get(ownerId);
        panel("order");
        // UPI: Swiggy creates the order only after payment, and pushes nothing to the phone; the screen has the QR or app button.
        if (state.attempt?.state === "payment_pending") { awaitingUpi = true; return { state: "payment_pending", placed: false, howToPay: input.mobile ? "The screen has an Open UPI app button; the customer pays there." : "The screen shows a UPI QR; the customer scans it with PhonePe, Google Pay or any UPI app on their phone.", tell: "Say the order is not placed until the payment succeeds. Nothing is sent to their phone." }; }
        return { state: state.attempt?.state, message: state.attempt?.message };
      }),
    }),
    order_status: tool({
      description: "Check the latest order (restaurant or Instamart): payment status, confirmation and delivery tracking.",
      inputSchema: z.object({}),
      execute: () => run(async () => {
        const state = await trackFoodOrder(ownerId); view = await assistant.get(ownerId); panel("order");
        return { state: state.attempt?.state, message: state.attempt?.message, tracking: state.tracking ? { status: state.tracking.status, eta: state.tracking.etaText, detail: state.tracking.message } : "No live tracking yet" };
      }),
    }),
    open_instamart: tool({
      description: "Open the Instamart home: grocery aisles and product rails (daily essentials, munchies, cold drinks, sweets).",
      inputSchema: z.object({}),
      execute: () => run(async () => { view = await assistant.groceryHome(ownerId, { rails: GROCERY_RAILS, expectedVersion: view.version }); panel(null); searched = true; return "Showing the Instamart home."; }, true),
    }),
    find_groceries: tool({
      description: "Search Instamart for groceries, snacks, drinks or household items.",
      inputSchema: z.object({ query: z.string() }),
      execute: ({ query }) => run(async () => {
        view = await assistant.browse(ownerId, { query, route: "instamart", expectedVersion: view.version }); panel(null); searched = true;
        const found = groceriesOnScreen(view).length;
        return found ? { outcome: `Showing ${found} Instamart products for ${query}.`, next: "Searching adds nothing. If the customer named items or quantities, call update_cart for them now." } : `No Instamart products found for ${query}.`;
      }, true),
    }),
    start_over: tool({
      description: "Clear everything and start a fresh order.",
      inputSchema: z.object({}),
      execute: () => run(async () => { view = await assistant.reset(ownerId, view.version); await clearFoodCheckout(ownerId); await clearCheckouts(ownerId); active = null; instamartReview = null; panel(null); effects.push({ kind: "browse", query: "" }); return "Started fresh."; }, true),
    }),
    stop_listening: tool({
      description: "ONLY when the customer explicitly says goodbye or asks you to stop listening. Never after finishing a task.",
      inputSchema: z.object({}),
      execute: () => run(async () => {
        if (!STOP_LISTENING.test(input.text)) return "Ignored: the customer did not ask to stop. Keep listening.";
        effects.push({ kind: "stop_listening" }); return "Will stop listening after replying.";
      }),
    }),
  };

  // No address yet and the customer just named one ("ghar pe deliver karo", "घर पर", "Work"): choose it before the model runs,
  // so the most basic answer never depends on the model noticing it. Their words are the authority, as in set_delivery_address.
  if (!addressLabel && ADDRESS_CUE.test(input.text)) {
    const saved = await foodAddresses(ownerId).catch(() => null), id = saved ? resolveAddressAnswer(input.text, saved.addresses) : null;
    if (id) { await deliverTo(id); actions++; }
  }
  const history: ModelMessage[] = view.messages.slice(-4).map(message => ({ role: message.role, content: message.text }));
  const agent = new ToolLoopAgent({
    model: options.model ?? groqModel(), instructions: INSTRUCTIONS, tools, stopWhen: isStepCount(8), temperature: 0.3, maxOutputTokens: 700, maxRetries: 1,
    providerOptions: { groq: { reasoningEffort: "low", parallelToolCalls: false } },
  });
  // A voice turn never hangs: past the deadline the customer hears a short fallback instead of silence.
  const started = Date.now();
  const deadline = AbortSignal.timeout(Number(process.env.SAYCART_AGENT_TIMEOUT_MS) || 25_000);
  let text = "", degraded: string | undefined, trace: string[] = [];
  try {
    const result = await agent.generate({ messages: [...history, { role: "user", content: `[Current screen]\n${screen()}\n\n[Customer said]\n${input.text}\n\n(Reply in ${replyLanguage(input.text)}.)` }], abortSignal: abortSignal ? AbortSignal.any([abortSignal, deadline]) : deadline });
    text = result.text;
    trace = result.steps.flatMap(step => step.toolResults.map(entry => `${entry.toolName}(${JSON.stringify(entry.input)})${(entry.output as { ok?: boolean })?.ok === false ? `✗ ${(entry.output as { error?: string }).error ?? ""}` : ""}`));
    if (process.env.NODE_ENV === "development") console.log(`[voice-agent] ${Date.now() - started}ms, ${result.steps.length} steps, ${result.response.modelId}, tools: ${trace.join(" → ") || "none"}, tokens ${result.totalUsage.inputTokens ?? "?"}+${result.totalUsage.outputTokens ?? "?"}`);
  } catch (error) {
    if (abortSignal?.aborted) throw error;
    degraded = error instanceof Error ? error.message : String(error);
    console.error("[voice-agent] turn failed", degraded);
    const busy = error instanceof ModelBusyError ? error.retryInMs : null;
    // A short limit with nothing done yet: say nothing, record nothing; the page waits and sends the same words again.
    if (busy !== null && actions === 0 && input.retryable && busy <= 30_000) return { view, reply: { id: "", text: "" }, effects: [], food, busy: { retryInMs: busy }, degraded };
    text = fallback(input.text, actions > 0, busy);
  }
  // Scripted test models answer exactly as written; the live agent's language is checked and fixed.
  if (searched && !cartTouched && CLAIMS_ADDED.test(text)) text = foundNotAdded(input.text);
  // While a total is still waiting for the customer's yes, no reply may say the order is placed.
  const waiting = orderPlaced ? null : (await foodState(ownerId)).review ?? instamartReview;
  if (waiting && CLAIMS_ORDERED.test(text)) text = confirmTotal(input.text, waiting.quote);
  // An unpaid UPI order is not placed, and no request reaches the phone: such claims are replaced with how to pay.
  if (awaitingUpi && (CLAIMS_ORDERED.test(text) || CLAIMS_PHONE_REQUEST.test(text))) text = payToPlace(input.text, !!input.mobile);
  const cleaned = tidy(text) || fallback(input.text, actions > 0);
  const reply = degraded || options.model ? cleaned : await inLanguage(cleaned, replyLanguage(input.text));
  const recorded = await assistant.recordTurn(ownerId, { baseCount, user: input.text, reply, speech: speakable(reply), expectedVersion: view.version });
  return { view: recorded.view, reply: recorded.reply, effects, food: await foodState(ownerId), ...(instamartOut ? { instamart: instamartOut } : {}), trace, ...(degraded ? { degraded } : {}) };
}

/** Words that answer "where should we deliver": a delivery verb or postposition, or a bare place name. */
const ADDRESS_CUE = /\b(?:deliver|delivery|bhej|bhejo|bhejna|pe|par|address|ghar|home|office|work|daftar)\b|पर|पे|पता|घर|ऑफिस|ऑफ़िस|डिलीवर/i;
/** A finished cart change, as opposed to an offer ("add karun?"). */
const CLAIMS_ADDED = /\b(?:added|add (?:kar )?(?:diye|diya|di|ho gaye|ho gaya|ho gayi)|add kar diy[ae]|daal (?:diye|diya|di)|dal (?:diye|diya|di))\b|जोड़ (?:दिया|दिए|दी)|डाल (?:दिया|दिए|दी)/i;
/** "Your order is confirmed", "order place ho gaya", "ऑर्डर हो गया": a finished order, as opposed to asking to place it. */
const CLAIMS_ORDERED = /\b(?:order (?:is |has been |was )?(?:placed|confirmed)|(?:is |been )confirmed for|placed your order|order (?:ho gaya|place ho gaya|confirm ho gaya|kar diya|place kar diya))\b|ऑर्डर (?:हो गया|प्लेस हो गया|कन्फर्म हो गया)/i;
/** "Approve the request on your phone": Swiggy's UPI flow sends no request; the customer scans the QR or opens the app. */
const CLAIMS_PHONE_REQUEST = /\b(?:request|notification|prompt)\b.*\b(?:on|in) (?:your )?(?:phone|mobile|app)\b|\bapprove\b.*\b(?:phone|app)\b|phone (?:par|pe) (?:request|approve)/i;
function payToPlace(said: string, mobile: boolean) {
  const language = replyLanguage(said);
  if (language.startsWith("Hindi")) return mobile ? "ऑर्डर अभी प्लेस नहीं हुआ। स्क्रीन पर ‘Open UPI app’ दबाकर पेमेंट कीजिए, फिर ऑर्डर कन्फर्म होगा।" : "ऑर्डर अभी प्लेस नहीं हुआ। स्क्रीन वाला QR फ़ोन के PhonePe या किसी UPI ऐप से स्कैन करके पेमेंट कीजिए, फिर ऑर्डर कन्फर्म होगा।";
  if (language.startsWith("Hinglish")) return mobile ? "Order abhi place nahi hua. Screen par 'Open UPI app' dabakar payment kijiye, phir order confirm hoga." : "Order abhi place nahi hua. Screen wala QR phone ke PhonePe ya kisi UPI app se scan karke payment kijiye, phir order confirm hoga.";
  return mobile ? "The order isn't placed yet. Tap Open UPI app on screen to pay, and I'll confirm it once the payment goes through." : "The order isn't placed yet. Scan the QR on screen with PhonePe or any UPI app on your phone, and I'll confirm it once the payment goes through.";
}
function confirmTotal(said: string, quote: { cart: { totals: { totalMinor: number } }; payment: { label: string } }) {
  const total = money(quote.cart.totals.totalMinor), language = replyLanguage(said);
  if (language.startsWith("Hindi")) return `कुल ${total} है, ${quote.payment.label} से। ऑर्डर कर दूँ? “कन्फर्म ऑर्डर” बोलिए।`;
  if (language.startsWith("Hinglish")) return `Total ${total} hai, ${quote.payment.label} se. Order place karun? "Confirm order" boliye.`;
  return `The total is ${total} with ${quote.payment.label}. Shall I place the order? Say "confirm order".`;
}
function foundNotAdded(said: string) {
  const language = replyLanguage(said);
  if (language.startsWith("Hindi")) return "ये प्रोडक्ट्स मिले हैं। कौन सा जोड़ूं? नाम या नंबर बोलिए।";
  if (language.startsWith("Hinglish")) return "Ye products mil gaye. Kaunsa add karun? Naam ya number boliye.";
  return "Here's what I found. Which ones should I add? Say the name or number.";
}
/** `busy` is how long until a model frees up: minutes mean the free daily limit is used up, and the customer is told so plainly. */
function fallback(said: string, acted: boolean, busy: number | null = null) {
  const language = replyLanguage(said), daily = busy !== null && busy > 60_000;
  if (language.startsWith("Hindi")) return acted ? "हो गया। आगे क्या करूं?" : daily ? "आज की फ्री AI लिमिट पूरी हो गई है। थोड़ी देर बाद फिर कोशिश कीजिए।" : busy !== null ? "अभी थोड़ा ज़्यादा लोड है। कुछ सेकंड बाद फिर से बोलिए।" : "माफ़ कीजिए, मैं समझ नहीं पाया। एक बार फिर से बोलिए।";
  if (language.startsWith("Hinglish")) return acted ? "Ho gaya. Aage kya karun?" : daily ? "Aaj ki free AI limit poori ho gayi hai. Thodi der baad phir try kariye." : busy !== null ? "Abhi thoda zyada load hai. Kuch second baad phir boliye." : "Sorry, samajh nahi paaya. Ek baar phir boliye.";
  return acted ? "Done. What would you like next?" : daily ? "Today's free AI limit is used up. Please try again a little later." : busy !== null ? "I'm getting a lot of requests right now. Please try again in a few seconds." : "Sorry, I didn't catch that. Please say it again.";
}

/** Spoken replies are short and clean, whatever the model produced: no markdown, emoji, runaway punctuation or rambling. */
export function tidy(text: string) {
  const clean = text.replace(/[*_`#>]+/g, "").replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}️‍]/gu, "")
    // Spoken lists lose their numbering ("1. Truffles, 2. Meghana"), which would otherwise read as sentence ends.
    .replace(/(^|[\s:,;(])\d{1,2}[.)]\s+(?=\p{L})/gu, "$1")
    .replace(/(?:\s*[.…·]){3,}/g, ". ").replace(/([!?।])(?:\s*\1)+/g, "$1").replace(/([!?।])\s*\.+/g, "$1")
    .replace(/([!?।])(?=\p{L})/gu, "$1 ").replace(/\.(?=\p{Lu}|[ऀ-ॿ])/gu, ". ")
    .replace(/\s+/g, " ").trim();
  // A sentence ends at . ! ? or । followed by a space or the end, so "4.5" and "₹2.50" stay whole.
  const sentences = clean.match(/.+?(?:[.!?।]+(?=\s|$)|$)/g)?.map(entry => entry.trim()).filter(Boolean) ?? [];
  const unique = sentences.filter((entry, index) => sentences.findIndex(other => other.toLowerCase() === entry.toLowerCase()) === index);
  return unique.slice(0, 3).join(" ").slice(0, 360).trim();
}
