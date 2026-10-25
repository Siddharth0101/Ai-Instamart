"use client";

import "./marketplace.css";
import "./voice.css";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { VoicePanel } from "@/components/voice-panel";
import { ExploreNavigation } from "@/components/explore-navigation";
import { RestaurantBrowser } from "@/components/restaurant-browser";
import { Glyph, Sheet, money } from "@/components/assistant-ui";
import { GroceryResults } from "@/components/grocery-results";
import { InstamartHome } from "@/components/instamart-home";
import { AddressGate, AddressPicker, CartSummary, CheckoutPanel, OrderPanel, cartLines, cartTotals, orderChipLabel, type SwiggyCartSync } from "@/components/cart";
import { AssistantViewSchema, type AssistantView, type MealOffer, type Presentation } from "@/lib/assistant-contracts";
import { AttemptSchema, BootstrapSchema, QuoteSchema, SessionViewSchema, type Address, type Attempt, type Quote, type SessionView } from "@/lib/contracts";
import type { FoodCheckout } from "@/lib/food-checkout-contracts";
import type { RestaurantVoiceContext, ShoppingVoiceContext } from "@/lib/screen-context";
import { useConversationVoice } from "@/lib/use-conversation-voice";
import { createVoiceScroller, scrollCommand, type ScrollDirection } from "@/lib/voice-scroll";
import { buildVoiceContext } from "@/lib/voice-context";
import { shouldResumeDiscovery } from "@/lib/discovery-resume";
import { onPhone } from "@/lib/device";
import { cartChanges, describeChanges, undoable, voiceHints, type CartChange } from "@/lib/voice-feedback";

type Bootstrap = ReturnType<typeof BootstrapSchema.parse>;
type Surface = "selection" | "connections" | "address" | "checkout" | "order" | "bag" | "review" | null;
type OrderSummary = { restaurant: string; lines: { name: string; quantity: number }[]; totalMinor: number; payment: string; address: string; placedAt: string };
type Tracking = { orderId: string; status: string; stage: -1 | 0 | 1 | 2 | 3; etaText: string | null; message: string | null; terminal: boolean; checkedAt: string };
type FoodState = { checkout: FoodCheckout | null; review: { quote: Quote } | null; attempt: Attempt | null; order: OrderSummary | null; tracking: Tracking | null };
type Toast = { id: number; text: string; changes: CartChange[] };
type AgentEffect = { kind: "panel"; panel: "cart" | "address" | "connections" | "checkout" | "order" | "bag" | "review" | null } | { kind: "scroll"; direction: "up" | "down" | "top" | "stop" } | { kind: "browse"; query?: string; sort?: "recommended" | "rating" | "delivery"; openOnly?: boolean } | { kind: "stop_listening" };
type AgentTurn = { view: unknown; reply: { id: string; text: string }; effects: AgentEffect[]; food: FoodState; busy?: { retryInMs: number }; instamart?: { session: unknown; review: { quote: unknown } | null; attempt?: unknown } };

class ApiError extends Error { constructor(message: string, readonly code?: string) { super(message); } }
function parseView(data: unknown): AssistantView { const value = data as { view?: unknown }; return AssistantViewSchema.parse(value?.view ?? data); }
const panels: Record<Exclude<Extract<AgentEffect, { kind: "panel" }>["panel"], null>, Surface> = { cart: "selection", address: "address", connections: "connections", checkout: "checkout", order: "order", bag: "bag", review: "review" };

/**
 * Sends `send` shortly after `key` settles, so a Swiggy cart follows this one. Only the latest send speaks for the cart on
 * screen; its `status` is null while `key` has changes not yet sent.
 */
function useCartMirror(key: string, enabled: boolean, send: (replaceExisting: boolean) => Promise<{ sync: SwiggyCartSync; apply: () => void }>) {
  const [status, setStatus] = useState<SwiggyCartSync & { key: string } | null>(null);
  const runs = useRef(0);
  const run = useCallback(async (current: string, replaceExisting = false) => {
    const id = ++runs.current;
    setStatus({ key: current, state: "syncing", message: null });
    try { const { sync, apply } = await send(replaceExisting); if (id === runs.current) { apply(); setStatus({ key: current, ...sync }); } }
    catch (error) { if (id === runs.current) setStatus({ key: current, state: "skipped", message: error instanceof Error ? error.message : null }); }
  }, [send]);
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => void run(key), 500);
    return () => window.clearTimeout(timer);
  }, [key, enabled, run]);
  return { status: status?.key === key ? status : null, replace: () => void run(key, true) };
}

/** SayCart: a voice agent orders food; the screen shows what it is doing, and every action also works by tap. */
export default function Home() {
  const [view, setView] = useState<AssistantView | null>(null);
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [session, setSession] = useState<SessionView | null>(null);
  const [bagError, setBagError] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [food, setFood] = useState<FoodState>({ checkout: null, review: null, attempt: null, order: null, tracking: null });
  const [initializing, setInitializing] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [surface, setSurface] = useState<Surface>(null);
  const [now, setNow] = useState(Date.now());
  const [foodAddresses, setFoodAddresses] = useState<Address[]>([]);
  const [foodAddressId, setFoodAddressId] = useState<string | null>(null);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressRefresh, setAddressRefresh] = useState(0);
  const [browseCommand, setBrowseCommand] = useState<{ version: number; action: Presentation } | null>(null);
  const [scrolling, setScrolling] = useState<ScrollDirection>("stop");
  const csrf = useRef("");
  const viewRef = useRef<AssistantView | null>(null);
  const busyRef = useRef<string | null>(null);
  const surfaceRef = useRef<Surface>(null);
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const initializeRef = useRef(0);
  const scroller = useRef<ReturnType<typeof createVoiceScroller> | null>(null);
  // A manual pause/end always wins over automatic resumption after a touch action.
  const voiceIntent = useRef(0);
  const voiceTurnInFlight = useRef(false);
  const touchVoice = useRef<{ intent: number } | null>(null);
  const stopAfterReply = useRef(false);
  const lastError = useRef<string | null>(null);
  const menuVoiceContext = useRef<ShoppingVoiceContext>({});
  const restaurantVoiceContext = useRef<RestaurantVoiceContext>({ visibleRestaurantIds: [] });
  const onMenuVisible = useCallback((context: ShoppingVoiceContext) => { menuVoiceContext.current = context; }, []);
  const onVisibleRestaurants = useCallback((context: RestaurantVoiceContext) => { restaurantVoiceContext.current = context; }, []);
  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => { surfaceRef.current = surface; }, [surface]);

  useEffect(() => {
    const navigation = createVoiceScroller({ requestFrame: callback => window.requestAnimationFrame(callback), cancelFrame: id => window.cancelAnimationFrame(id), onChange: setScrolling, reducedMotion: () => matchMedia("(prefers-reduced-motion: reduce)").matches, pageSize: () => window.innerHeight * .65, move: pixels => {
      const target = document.querySelector<HTMLDialogElement>("dialog[open]") ?? document.scrollingElement;
      if (!target) return false;
      const before = target.scrollTop;
      // Instant steps: the page's smooth scroll-behavior would defer the move, which reads as a boundary.
      target.scrollTo({ top: Math.max(0, Math.min(target.scrollHeight - target.clientHeight, before + pixels)), behavior: "instant" });
      return target.scrollTop !== before;
    } });
    scroller.current = navigation;
    const stop = () => navigation.stop();
    const visibility = () => { stop(); if (document.hidden) voiceIntent.current++; };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") voiceIntent.current++; if (["Escape", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(event.key)) stop(); };
    document.addEventListener("visibilitychange", visibility); document.addEventListener("wheel", stop, { passive: true }); document.addEventListener("touchstart", stop, { passive: true }); document.addEventListener("keydown", key);
    return () => { navigation.stop(); scroller.current = null; document.removeEventListener("visibilitychange", visibility); document.removeEventListener("wheel", stop); document.removeEventListener("touchstart", stop); document.removeEventListener("keydown", key); };
  }, []);
  const stopScrolling = useCallback(() => scroller.current?.stop(), []);
  useEffect(() => { stopScrolling(); }, [surface, view?.restaurantBrowser?.selectedRestaurantId, stopScrolling]);

  const request = useCallback(async (url: string, body?: unknown, signal?: AbortSignal): Promise<unknown> => {
    const response = await fetch(url, {
      method: body === undefined ? "GET" : "POST", credentials: "same-origin", cache: "no-store",
      signal: AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(120_000)]),
      headers: body === undefined ? {} : { "Content-Type": "application/json", "X-CSRF-Token": csrf.current, "Idempotency-Key": crypto.randomUUID() },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json().catch(() => { throw new ApiError("We couldn’t read that response. Please try again."); });
    if (!response.ok) throw new ApiError(data?.error?.message ?? "Something went wrong. Please try again.", data?.error?.code);
    if (data.csrfToken) csrf.current = data.csrfToken;
    if (data && typeof data === "object" && !Array.isArray(data)) { const { requestId: _requestId, ...payload } = data; return payload; }
    return data;
  }, []);
  const commit = useCallback((next: AssistantView) => { viewRef.current = next; setView(next); }, []);
  const loadFood = useCallback(async () => { const state = await request("/api/food/state") as FoodState; setFood(state); return state; }, [request]);
  const loadSession = useCallback(async () => { const data = SessionViewSchema.parse(await request("/api/session")); setSession(data); return data; }, [request]);
  const recover = useCallback(async () => {
    const results = await Promise.allSettled([request("/api/assistant"), loadFood()]);
    if (results[0].status === "fulfilled") commit(parseView(results[0].value));
  }, [request, commit, loadFood]);

  async function act<T>(label: string, work: (signal: AbortSignal) => Promise<T>): Promise<T | null> {
    if (busyRef.current) return null;
    const microphone = voice.getState();
    const resumeAfterTouch = microphone.active && !microphone.muted && !voiceTurnInFlight.current;
    if (resumeAfterTouch) { touchVoice.current = { intent: voiceIntent.current }; voice.pause(); }
    busyRef.current = label; setBusy(label); setError(null); setErrorCode(null); lastError.current = null;
    const abort = new AbortController(); controller.current = abort;
    const current = ++generation.current;
    try { const result = await work(abort.signal); return generation.current === current ? result : null; }
    catch (error) {
      if (generation.current === current && !abort.signal.aborted) {
        const message = error instanceof Error && error.name !== "ZodError" ? error.message : "That didn’t work. Please try again.";
        lastError.current = message; if (!voiceTurnInFlight.current) { setError(message); setErrorCode(error instanceof ApiError ? error.code ?? null : null); }
        await recover().catch(() => {});
      }
      return null;
    } finally {
      if (generation.current === current) {
        busyRef.current = null; setBusy(null); controller.current = null;
        if (resumeAfterTouch) { const pending = touchVoice.current; touchVoice.current = null; if (pending?.intent === voiceIntent.current && !document.hidden) voice.resume(); }
      }
    }
  }

  const initialize = useCallback(async () => {
    const current = ++initializeRef.current;
    setInitializing(true); setError(null);
    try {
      const first = BootstrapSchema.parse(await request("/api/bootstrap"));
      if (current !== initializeRef.current) return;
      csrf.current = first.csrfToken; setBootstrap(first);
      let saved = parseView(await request("/api/assistant")); commit(saved);
      await loadFood();
      if (first.connected) setSession(SessionViewSchema.parse(await request(first.sessionId ? "/api/session" : "/api/session", first.sessionId ? undefined : { mode: "live" })));
      // A first visit lists nearby restaurants (or asks for the address) without waiting to be asked.
      if (current === initializeRef.current && !saved.task.items.length && !saved.restaurantBrowser) { saved = parseView(await request("/api/assistant/browse", { query: "restaurants", route: "restaurant", expectedVersion: saved.version })); commit(saved); }
      else if (current === initializeRef.current && shouldResumeDiscovery(saved)) commit(parseView(await request("/api/assistant/search", { expectedVersion: saved.version })));
    } catch (error) { if (current === initializeRef.current) setError(error instanceof Error && error.name !== "ZodError" ? error.message : "We couldn’t open SayCart. Please retry."); }
    finally { if (current === initializeRef.current) setInitializing(false); }
  }, [request, commit, loadFood]);
  useEffect(() => { void initialize(); return () => { ++initializeRef.current; ++voiceIntent.current; controller.current?.abort(); }; }, [initialize]);
  useEffect(() => { if (view?.restaurantBrowser?.menu) document.getElementById("saycart-main")?.scrollIntoView({ behavior: "instant", block: "start" }); }, [view?.restaurantBrowser?.selectedRestaurantId]);
  useEffect(() => { if (!quote) return; const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, [quote]);

  function applyEffects(effects: AgentEffect[], version: number) {
    for (const effect of effects) {
      if (effect.kind === "panel") { setSurface(effect.panel ? panels[effect.panel] : null); if (effect.panel === "bag") void loadSession().catch(() => {}); }
      else if (effect.kind === "scroll") { if (effect.direction === "top") { stopScrolling(); window.scrollTo({ top: 0, behavior: "smooth" }); } else scroller.current?.start(effect.direction === "stop" ? "stop" : effect.direction); }
      else if (effect.kind === "browse") setBrowseCommand({ version, action: { kind: "browse", ...(effect.query !== undefined ? { query: effect.query } : {}), ...(effect.sort ? { sort: effect.sort } : {}), ...(effect.openOnly !== undefined ? { openOnly: effect.openOnly } : {}) } });
      else if (effect.kind === "stop_listening") stopAfterReply.current = true;
    }
  }
  /** One spoken request: the agent acts with its tools, the page mirrors the result, and the reply is spoken. */
  async function agentTurn(text: string, retryable = false) {
    stopScrolling();
    const before = viewRef.current;
    return act("Thinking", async signal => {
      const result = await request("/api/assistant/turn", {
        text, expectedVersion: viewRef.current!.version, panel: surfaceRef.current, retryable, mobile: onPhone(),
        visibleRestaurantIds: restaurantVoiceContext.current.visibleRestaurantIds, visibleOfferIds: menuVoiceContext.current.visibleOfferIds ?? [],
        focusedId: viewRef.current?.restaurantBrowser?.menu ? menuVoiceContext.current.focusedOfferId ?? null : restaurantVoiceContext.current.focusedRestaurantId ?? null,
      }, signal) as AgentTurn;
      // The model was briefly rate limited before doing anything: nothing changed, and the caller sends the words again.
      if (result.busy) return { view: viewRef.current!, reply: result.reply, busy: result.busy };
      const next = parseView(result.view); commit(next); setFood(result.food);
      // An Instamart bag, total or order from this turn shows in the same sheets a tap would open.
      if (result.instamart) {
        if (result.instamart.session) setSession(SessionViewSchema.parse(result.instamart.session));
        setQuote(result.instamart.review ? QuoteSchema.parse(result.instamart.review.quote) : null); setNow(Date.now());
        if (result.instamart.attempt) { const attempt = AttemptSchema.parse(result.instamart.attempt); setFood(state => ({ ...state, attempt, order: null, tracking: null })); }
      }
      applyEffects(result.effects, next.version);
      // Every cart change the assistant makes is shown, and can be undone with one tap.
      const changes = cartChanges(before, next);
      if (changes.length) setToast({ id: Date.now(), text: describeChanges(changes), changes });
      return { view: next, reply: result.reply };
    });
  }
  /** Hint chips and "Order again" go through the same agent, so the answer is spoken. */
  function say(text: string) { void voice.submitText(text); }

  const voice = useConversationVoice({
    // Read at request time: the token can rotate after bootstrap, and a stale copy is rejected.
    get csrfToken() { return csrf.current; }, sttAvailable: bootstrap?.capabilities.realtimeStt ?? false, ttsAvailable: bootstrap?.capabilities.tts ?? false,
    speakReplies: true,
    context: () => buildVoiceContext(viewRef.current, restaurantVoiceContext.current, menuVoiceContext.current),
    onFinal: async text => {
      voiceTurnInFlight.current = true;
      try {
        // "Scroll down" / "stop" move the page at once, without a round trip.
        const direction = scrollCommand(text);
        if (direction) { scroller.current?.start(direction); return { id: `navigation:${crypto.randomUUID()}`, version: viewRef.current?.version ?? 0, text: direction === "stop" ? "Stopped." : `Scrolling ${direction}.`, silent: true }; }
        // Words spoken while the page is still loading or saving are sent as soon as it is free, not dropped.
        for (const started = Date.now(); (busyRef.current || !viewRef.current) && Date.now() - started < 20_000;) await new Promise(resolve => setTimeout(resolve, 120));
        // A short rate limit is waited out quietly (the orb keeps saying "Thinking…"), then the same words are sent again;
        // only the last try may answer "busy" out loud.
        let turn = await agentTurn(text, true);
        for (let tries = 1; turn?.busy && tries <= 2; tries++) {
          await new Promise(resolve => setTimeout(resolve, Math.min(turn!.busy!.retryInMs + 400, 15_000)));
          turn = await agentTurn(text, tries < 2);
        }
        if (!turn || turn.busy) throw new Error(busyRef.current ? "One moment, I'm still on the last request." : lastError.current ?? "");
        return { id: turn.reply.id, version: turn.view.version, text: turn.reply.text };
      } finally { voiceTurnInFlight.current = false; }
    },
    onInterrupt: async () => { if (busyRef.current === "Thinking") { ++generation.current; controller.current?.abort(); busyRef.current = null; setBusy(null); await recover().catch(() => {}); } },
    onError: () => {},
  });
  useEffect(() => { if (scrollCommand(voice.partial) === "stop") stopScrolling(); }, [voice.partial, stopScrolling]);
  useEffect(() => { if (!voice.active || voice.phase === "paused" || voice.phase === "idle" || voice.error) stopScrolling(); }, [voice.active, voice.phase, voice.error, stopScrolling]);
  useEffect(() => { if (stopAfterReply.current && voice.phase === "listening") { stopAfterReply.current = false; stopVoice(); } }, [voice.phase]);
  // Voice is on by default: listening starts once the app is ready, and the assistant speaks first when something is missing.
  const autoStarted = useRef(false);
  const greeting = useRef<{ id: string; version: number; text: string } | null>(null);
  useEffect(() => {
    if (autoStarted.current || initializing || !view || !(bootstrap?.capabilities.realtimeStt ?? false)) return;
    autoStarted.current = true;
    startVoice();
    let greeted = false;
    try { greeted = sessionStorage.getItem("saycart:greeted") === "1"; sessionStorage.setItem("saycart:greeted", "1"); } catch { /* No storage: greet anyway. */ }
    if (!greeted) void request("/api/assistant/greet", { expectedVersion: view.version }).then(data => {
      const result = data as { view: unknown; reply: { id: string; text: string } }, next = parseView(result.view);
      commit(next); greeting.current = { id: result.reply.id, version: next.version, text: result.reply.text };
    }).catch(() => {});
  });
  // The greeting is spoken as soon as the microphone is live, so it never talks over the connection starting.
  useEffect(() => { if (voice.phase === "listening" && greeting.current) { const reply = greeting.current; greeting.current = null; void voice.speak(reply); } }, [voice.phase]);
  // Browsers allow audio after the first touch or key press; voice that started on its own unlocks playback then.
  useEffect(() => {
    const unlock = () => voice.unlock();
    document.addEventListener("pointerdown", unlock, { once: true, capture: true }); document.addEventListener("keydown", unlock, { once: true, capture: true });
    return () => { document.removeEventListener("pointerdown", unlock, { capture: true }); document.removeEventListener("keydown", unlock, { capture: true }); };
  }, []);
  function pauseVoice() { voiceIntent.current++; stopScrolling(); voice.pause(); }
  function startVoice() { voiceIntent.current++; voice.start(); }
  function stopVoice() { voiceIntent.current++; stopScrolling(); voice.end(); }
  function openSurface(next: Surface) { stopScrolling(); setSurface(next); }

  async function restaurantAction(path: string, label: string, extra: Record<string, unknown> = {}) {
    stopScrolling();
    await act(label, async signal => { commit(parseView(await request(`/api/assistant/${path}`, { ...extra, expectedVersion: viewRef.current!.version }, signal))); });
  }
  async function selectOffer(offer: MealOffer, quantity: number) { await act("Saving", async signal => { commit(parseView(await request("/api/assistant/select", { offerId: offer.id, quantity, expectedVersion: viewRef.current!.version }, signal))); }); }
  async function moreOptions(itemId: string) { await act("Loading more", async signal => { commit(parseView(await request("/api/assistant/more", { itemId, expectedVersion: viewRef.current!.version }, signal))); }); }
  async function cartLine(offer: MealOffer, quantity: number) { await act("Updating your cart", async signal => { commit(parseView(await request("/api/assistant/cart-line", { offerId: offer.id, quantity, expectedVersion: viewRef.current!.version }, signal))); }); }
  async function foodAction(label: string, path: string, body: Record<string, unknown>, open: Surface) {
    await act(label, async signal => {
      if (path === "/api/food/checkout") {
        setFood(current => ({ ...current, checkout: null, review: null }));
        setSurface("checkout");
      }
      const state = await request(path, body, signal) as FoodState;
      // Commit the next step before act resumes the microphone.
      setFood(state); setSurface(open);
      if (open === "order") commit(parseView(await request("/api/assistant", undefined, signal)));
    });
  }
  const refreshOrder = useCallback(() => request("/api/food/order/refresh", {}).then(async state => { setFood(state as FoodState); commit(parseView(await request("/api/assistant"))); }).catch(error => { setError(error instanceof Error ? error.message : "Could not check the order. Try again."); }), [request, commit]);
  const trackOrder = useCallback(() => { void request("/api/food/order/track", {}).then(state => setFood(state as FoodState)).catch(() => {}); }, [request]);
  async function undo(current: Toast) {
    setToast(null);
    await act("Undoing", async signal => {
      for (const change of current.changes) {
        const path = change.after === 0 ? "menu/select" : "cart-line";
        commit(parseView(await request(`/api/assistant/${path}`, { offerId: change.offer.id, quantity: change.before, expectedVersion: viewRef.current!.version }, signal)));
      }
    });
  }
  /** The Instamart front page: aisles plus product rails, each rail one Swiggy search. */
  async function instamartHome() {
    stopScrolling(); setSurface(null);
    await act("Opening Instamart", async signal => { commit(parseView(await request("/api/assistant/grocery-home", { expectedVersion: viewRef.current!.version }, signal))); });
  }
  /** Taps act at once; the assistant is for what needs a conversation. */
  async function browseTo(query: string, route: "restaurant" | "instamart") {
    stopScrolling(); setSurface(null);
    await act(route === "instamart" ? "Finding groceries" : "Finding restaurants", async signal => { commit(parseView(await request("/api/assistant/browse", { query, route, expectedVersion: viewRef.current!.version }, signal))); });
  }
  /** Tapped address: saved at once, then the restaurants (or the groceries on screen) for it. */
  async function chooseAddress(address: Address, groceries = false) {
    setSurface(null);
    const saved = await act("Changing address", async signal => { const next = parseView(await request("/api/assistant/food-address", { addressId: address.id, expectedVersion: viewRef.current!.version }, signal)); commit(next); setFoodAddressId(address.id); return next; });
    if (!saved) return;
    if (groceries) { await act("Finding groceries", async signal => { commit(parseView(await request("/api/assistant/search", { expectedVersion: saved.version }, signal))); }); return; }
    if (shouldResumeDiscovery(saved, true)) await act("Finding restaurants", async signal => { commit(parseView(await request("/api/assistant/search", { expectedVersion: saved.version }, signal))); });
    else if (!saved.restaurantBrowser?.restaurants.length) await browseTo("restaurants", "restaurant");
  }
  /** Instamart's own saved address, for someone who connected Instamart but not Swiggy Food; saved in SayCart only, then the groceries reload. */
  async function chooseGroceryAddress(address: Address) {
    await changeSessionOption("address", address.id);
    await act("Finding groceries", async signal => { commit(parseView(await request("/api/assistant/search", { expectedVersion: viewRef.current!.version }, signal))); });
  }
  /** The Instamart bag with its live bill; a failure is shown in the bag sheet itself. */
  async function openBag() {
    setBagError(null); openSurface("bag");
    try { await loadSession(); } catch (error) { setBagError(error instanceof Error ? error.message : "Instamart did not answer. Try again in a moment."); }
  }
  async function prepareBag() {
    await act("Preparing your bag", async signal => {
      const result = await request("/api/assistant/cart", { expectedVersion: viewRef.current!.version }, signal) as { view: unknown; session?: unknown; quote?: unknown };
      commit(parseView(result)); if (result.session) setSession(SessionViewSchema.parse(result.session));
      if (result.quote) { setQuote(QuoteSchema.parse(result.quote)); setNow(Date.now()); setSurface("review"); } else setSurface("bag");
    });
  }
  async function connect(provider: "instamart" | "swiggy_food") {
    stopVoice();
    if (provider === "swiggy_food") { window.location.assign("/api/integrations/swiggy-food/connect"); return; }
    if (bootstrap?.connected) await act("Opening Instamart", async () => { setSession(SessionViewSchema.parse(await request("/api/session", { mode: "live" }))); commit(parseView(await request("/api/assistant"))); setSurface(null); });
    else window.location.assign("/api/integrations/swiggy/connect");
  }
  async function changeSessionOption(kind: "address" | "payment", id: string) {
    await act(`Saving ${kind}`, async () => {
      let current = session; if (!current) current = SessionViewSchema.parse(await request("/api/session", { mode: "live" }));
      setSession(SessionViewSchema.parse(await request(`/api/${kind}`, { sessionId: current.sessionId, [kind === "address" ? "addressId" : "paymentMethodId"]: id }))); setQuote(null);
    });
  }
  async function reviewBag() {
    if (!session) return;
    await act("Checking the total", async () => { const result = await request("/api/quote", { sessionId: session.sessionId, expectedCartRevision: session.cart.revision }) as { quote: unknown }; setQuote(QuoteSchema.parse(result.quote)); setNow(Date.now()); setSurface("review"); });
  }
  async function confirmBag() {
    if (!quote || Date.parse(quote.expiresAt) <= Date.now()) return;
    const current = quote;
    await act("Placing your order", async () => {
      setQuote(null);
      const result = await request("/api/confirm", { quoteId: current.id, challenge: current.challenge }) as { attempt: unknown };
      setFood(state => ({ ...state, attempt: AttemptSchema.parse(result.attempt) })); setSurface("order"); await recover();
      // The placed bag is empty on Instamart now; without this the header would still count its items.
      await loadSession().catch(() => {});
    });
  }

  const foodConnected = view?.providers.some(provider => provider.id === "swiggy_food" && provider.status === "connected") ?? false;
  const instamartConnected = view?.providers.some(provider => provider.id === "instamart" && provider.status === "connected") ?? false;
  const addressAsked = view?.questions[0]?.id === "food_address";
  useEffect(() => {
    if (!foodConnected) return;
    let valid = true; setAddressesLoading(true);
    void request("/api/assistant/food-addresses").then(data => { if (!valid) return; const result = data as { addresses: Address[]; selectedAddressId: string | null }; setFoodAddresses(result.addresses); setFoodAddressId(result.selectedAddressId); }).catch(() => undefined).finally(() => { if (valid) setAddressesLoading(false); });
    return () => { valid = false; };
  }, [foodConnected, addressAsked, addressRefresh, view?.restaurantBrowser?.itemId, request]);

  // A toast stays long enough to read and undo, then gets out of the way.
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(current => current?.id === toast.id ? null : current), 7000); return () => clearTimeout(timer); }, [toast]);
  // While an order is on its way the header keeps its status current, even with the order sheet closed.
  const tracking = food.attempt?.state === "complete" && food.attempt.id.startsWith("food_attempt") && !food.tracking?.terminal;
  useEffect(() => { if (!tracking || surface === "order") return; trackOrder(); const id = setInterval(trackOrder, 30_000); return () => clearInterval(id); }, [tracking, surface, trackOrder]);
  // Leaving the payment sheet must not leave a completed/expired payment locked
  // forever. Keep one status request in flight while shopping elsewhere.
  const pendingFoodPayment = food.attempt?.id.startsWith("food_attempt") && food.attempt.state === "payment_pending";
  useEffect(() => {
    if (!pendingFoodPayment || surface === "order") return;
    let alive = true, timer = 0;
    const tick = async () => { await refreshOrder(); if (alive) timer = window.setTimeout(tick, 4000); };
    void tick();
    return () => { alive = false; window.clearTimeout(timer); };
  }, [pendingFoodPayment, surface, refreshOrder]);
  // Space starts or pauses the conversation, unless focus is on something Space already operates.
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, a, [contenteditable=true], dialog")) return;
      if (!(bootstrap?.capabilities.realtimeStt ?? false)) return;
      event.preventDefault();
      const state = voice.getState();
      if (state.active && !state.muted) pauseVoice(); else startVoice();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  });

  // Without Swiggy Food, the header shows the Instamart address the groceries use.
  const selectedAddress = foodAddresses.find(address => address.id === foodAddressId) ?? (foodConnected ? null : session?.addresses.find(address => address.id === session.addressId) ?? null);
  const lines = cartLines(view);
  const totals = cartTotals(lines);
  const bagCount = session?.cart.lines.reduce((sum, line) => sum + line.quantity, 0) ?? 0;
  // Dishes and groceries go into the Swiggy app as they are added, changed or removed, by tap or by voice: dishes into the
  // Swiggy Food cart, groceries into the Instamart bag.
  const dishes = lines.filter(line => line.offer.provider !== "instamart").map(line => `${line.offer.providerItemId}×${line.quantity}`).sort().join(" ");
  const packs = lines.filter(line => line.offer.provider === "instamart").map(line => `${line.offer.providerItemId}×${line.quantity}`).sort().join(" ");
  const sendDishes = useCallback(async (replaceExisting: boolean) => {
    const { sync, ...state } = await request("/api/food/sync", replaceExisting ? { replaceExisting } : {}) as FoodState & { sync: SwiggyCartSync };
    // Orders and tracking keep their own updates.
    return { sync, apply: () => setFood(previous => ({ ...previous, checkout: state.checkout, review: state.review })) };
  }, [request]);
  const sendPacks = useCallback(async () => {
    const result = await request("/api/instamart/sync", {}) as { session: unknown; sync: SwiggyCartSync };
    return { sync: result.sync, apply: () => { if (result.session) setSession(SessionViewSchema.parse(result.session)); } };
  }, [request]);
  const swiggyCart = useCartMirror(`${dishes}|${food.attempt?.id ?? ""}:${food.attempt?.state ?? ""}`, foodConnected, sendDishes);
  const instamartBag = useCartMirror(packs, instamartConnected, sendPacks);
  const discovery = view?.task.discovery;
  const groceries = discovery?.kind === "snacks";
  // A newly opened aisle or the Instamart home starts at the top, by tap or by voice, not at the last screen's scroll position.
  const groceryScreen = groceries && !view?.restaurantBrowser ? `${discovery?.categoryId}:${discovery?.itemId}` : null;
  const groceryNeedsAddress = !!groceryScreen && view?.status === "needs_address";
  // Without Swiggy Food, the Instamart session supplies the addresses (and the header's address).
  useEffect(() => { if (!foodConnected && instamartConnected && !session) void loadSession().catch(() => {}); }, [foodConnected, instamartConnected, session, loadSession]);
  useEffect(() => {
    if (!groceryScreen) return;
    // Again after the next layout: smooth scrolling or content settling above can otherwise leave it a little short of the top.
    window.scrollTo({ top: 0, behavior: "instant" }); const frame = requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" }));
    return () => cancelAnimationFrame(frame);
  }, [groceryScreen]);
  const connectedCount = view?.providers.filter(provider => provider.status === "connected").length ?? 0;
  const quoteExpired = quote ? Date.parse(quote.expiresAt) <= now : false;
  const voiceControls = { voice, available: bootstrap?.capabilities.realtimeStt ?? false, busy: initializing || !!busy, scrolling, onStopScroll: stopScrolling, level: voice.level, onStart: startVoice, onPause: pauseVoice, onResume: startVoice, onEnd: stopVoice, onInterrupt: () => void voice.interrupt() };
  const sheetAlert = error && errorCode !== "EXISTING_FOOD_CART" ? <p className="sc-sheet-alert" role="alert"><span>{error}</span>{errorCode === "CHECKOUT_UNRESOLVED" && <button type="button" className="sc-link" onClick={() => { setSurface("order"); void refreshOrder(); }}>Check or reset previous checkout</button>}<button type="button" className="sc-icon" aria-label="Dismiss" onClick={() => setError(null)}><Glyph name="close" size={15}/></button></p> : null;
  const orderLive = food.attempt && food.attempt.state !== "failed";
  const orderDone = food.attempt?.state === "complete" && (food.tracking?.terminal ?? false);
  const reorder = () => { setSurface(null); say("Order my last order again"); };
  const hints = voiceHints({ view, addressAsked: view?.questions[0]?.id === "food_address", checkoutOpen: surface === "checkout", bagOpen: surface === "bag", reviewReady: (!!food.review && surface === "checkout") || (surface === "review" && !!quote), orderActive: !!orderLive && !orderDone, savedAddresses: foodAddresses.map(address => address.label), disconnected: !!view && !foodConnected });
  // Inside checkout sheets the next sentence is the useful hint: "Pay with cash", "Confirm order".
  const sheetHints = surface === "selection" ? (lines.length ? ["Checkout"] : []) : surface === "checkout" || surface === "bag" || surface === "review" ? hints : [];
  const sheetVoice = <><VoicePanel inline {...voiceControls} hints={sheetHints} onHint={text => say(text)}/>{busy && busy !== "Thinking" && <p className="sc-browse-status" role="status"><span className="sc-spinner"/>{busy}…</p>}{sheetAlert}{(surface === "selection" || surface === "checkout") && errorCode === "EXISTING_FOOD_CART" && error && <div className="sc-replace-cart" role="alertdialog" aria-label="Replace your Swiggy cart?"><p>{error}</p><div><button type="button" className="sc-button sc-button-primary" disabled={!!busy} onClick={() => void foodAction("Replacing your Swiggy cart", "/api/food/checkout", { replaceExisting: true }, "checkout")}>Replace and continue</button><button type="button" className="sc-button sc-button-quiet" onClick={() => { setError(null); setErrorCode(null); setSurface("selection"); }}>Keep it</button></div></div>}</>;
  // A paused conversation (quiet minute, Escape, hidden tab) offers to resume, not to stop.
  const listening = voice.active && !voice.muted;

  return <div className={`saycart sc-marketplace sc-voice-mode ${voice.active ? "sc-has-live-voice" : ""}`}>
    <a className="skip-link" href="#saycart-main">Skip to restaurants</a>
    <header className="sc-header">
      <Link className="sc-brand" href="/" aria-label="SayCart home"><span className="sc-brand-icon"><Glyph name="bag" size={22}/></span>saycart<span className="sc-brand-dot">.</span></Link>
      <button className={`sc-delivery-location ${foodConnected && !selectedAddress ? "is-missing" : ""}`} onClick={() => openSurface("address")} aria-label={selectedAddress ? `Delivering to ${selectedAddress.label}. Change address` : "Choose delivery address"}><Glyph name="pin" size={19}/><span><small>{selectedAddress ? "Delivering to" : "Deliver to"}</small><strong>{selectedAddress?.label ?? "Choose address"}<Glyph name="chevron" size={14}/></strong>{selectedAddress && <em>{selectedAddress.reviewAddressText}</em>}</span></button>
      <nav aria-label="Main navigation">
        <button className={`sc-header-button sc-talk-button ${listening ? "is-live" : ""}`} title="Shortcut: Space" disabled={!(bootstrap?.capabilities.realtimeStt ?? false)} onClick={() => { if (listening) stopVoice(); else { setSurface(null); startVoice(); } }} aria-pressed={listening} aria-label={listening ? "Stop listening" : voice.active ? "Resume" : "Talk to order"}><Glyph name={listening ? "close" : "mic"} size={18}/><span>{listening ? "Stop listening" : voice.active ? "Resume" : "Talk to order"}</span></button>
        {orderLive && !orderDone && <button className={`sc-header-button sc-order-chip ${food.tracking ? `stage-${food.tracking.stage}` : ""}`} onClick={() => openSurface("order")} aria-label={`Your order: ${orderChipLabel(food.tracking, food.attempt?.state)}`}><Glyph name={food.tracking?.stage === 2 ? "bike" : food.tracking?.stage === 1 ? "pot" : "clock"} size={18}/><span>{orderChipLabel(food.tracking, food.attempt?.state)}</span></button>}
        <button className="sc-header-button sc-bag-button" aria-label={`Cart, ${totals.count || bagCount} ${(totals.count || bagCount) === 1 ? "item" : "items"}`} onClick={() => { if (!lines.length && bagCount) void openBag(); else openSurface("selection"); }}><Glyph name="bag" size={19}/><span>Cart</span>{(totals.count || bagCount) > 0 && <b>{totals.count || bagCount}</b>}</button>
      </nav>
    </header>
    <nav className="sc-service-nav" aria-label="Explore services">
      <button aria-current={discovery?.kind !== "snacks" ? "page" : undefined} disabled={!!busy} onClick={() => void act("Finding restaurants", async signal => { commit(parseView(await request("/api/assistant/browse", { query: "restaurants", route: "restaurant", expectedVersion: viewRef.current!.version }, signal))); })}><Glyph name="bag" size={19}/>Food delivery</button>
      <button aria-current={discovery?.kind === "snacks" ? "page" : undefined} disabled={!!busy} onClick={() => void instamartHome()}><Glyph name="spark" size={19}/>Instamart</button>
      <button className="sc-service-connections" onClick={() => openSurface("connections")}><span className={`sc-status-dot ${connectedCount ? "connected" : ""}`}/>{connectedCount} connected</button>
    </nav>
    <div className="sc-layout sc-voice-layout">
      {!surface && <VoicePanel {...voiceControls} hints={hints} onHint={text => say(text)} cart={lines.length ? { count: totals.count, totalMinor: totals.totalMinor, onOpen: () => openSurface("selection") } : undefined}/>}
      {toast && !surface && <div className="sc-toast" role="status" aria-live="polite"><Glyph name="check" size={16}/><span>{toast.text}</span>{undoable(toast.changes) && <button type="button" disabled={!!busy} onClick={() => void undo(toast)}><Glyph name="undo" size={14}/>Undo</button>}<button type="button" className="sc-icon" aria-label="Dismiss" onClick={() => setToast(null)}><Glyph name="close" size={14}/></button></div>}
      <main id="saycart-main" className="sc-main">
        {initializing && <div className="sc-loading" role="status"><span className="sc-spinner"/> Opening SayCart…</div>}
        {error && <div className="sc-error" role="alert"><div><strong>A little pause.</strong><p>{error}</p></div><button className="sc-icon" aria-label="Dismiss error" onClick={() => setError(null)}><Glyph name="close" size={17}/></button>{!view && <button className="sc-link" onClick={() => void initialize()}>Try again</button>}</div>}
        {/* Instamart is its own Swiggy connection: its screens ask for it, and the food card stays on the food screens. */}
        {!initializing && view && groceries && !view.restaurantBrowser && !instamartConnected && <section className="sc-connect-card" aria-labelledby="sc-connect-instamart-title"><span aria-hidden="true"><Glyph name="link" size={22}/></span><div><h2 id="sc-connect-instamart-title">Connect Instamart to see groceries</h2><p>Products, prices and delivery come from your own Swiggy Instamart account. You approve every order.</p></div><button type="button" className="sc-button sc-button-primary" onClick={() => void connect("instamart")}>Connect Instamart<Glyph name="arrow" size={16}/></button></section>}
        {!initializing && view && !foodConnected && !(groceries && !view.restaurantBrowser) && <section className="sc-connect-card" aria-labelledby="sc-connect-title"><span aria-hidden="true"><Glyph name="link" size={22}/></span><div><h2 id="sc-connect-title">Connect Swiggy to start ordering</h2><p>SayCart orders from your own Swiggy account: restaurants, menus, prices and delivery all come from Swiggy. You approve every order.</p></div><button type="button" className="sc-button sc-button-primary" onClick={() => void connect("swiggy_food")}>Connect Swiggy<Glyph name="arrow" size={16}/></button></section>}
        {orderLive && !orderDone && food.attempt?.state === "complete" && <button type="button" className="sc-order-banner" onClick={() => openSurface("order")}><span className="sc-order-banner-icon" aria-hidden="true"><Glyph name={food.tracking?.stage === 2 ? "bike" : food.tracking?.stage === 1 ? "pot" : "check"} size={20}/></span><span><strong>{food.order ? `Your order from ${food.order.restaurant}` : food.attempt?.id.startsWith("food_attempt") ? "Your order" : "Your Instamart order"}</strong><small>{food.tracking ? `${food.tracking.status}${food.tracking.etaText ? ` · ${food.tracking.etaText}` : ""}` : food.attempt?.message.replace(/^Instamart order placed\.\s*/i, "") || "Placed with Swiggy"}</small></span><em>Track<Glyph name="arrow" size={14}/></em></button>}
        {orderDone && food.order && !view?.restaurantBrowser?.menu && !lines.length && <section className="sc-reorder" aria-label="Order again"><span aria-hidden="true"><Glyph name="repeat" size={18}/></span><div><strong>Order again from {food.order.restaurant}</strong><small>{food.order.lines.map(line => `${line.quantity}× ${line.name}`).join(", ")} · {money(food.order.totalMinor)}</small></div><button type="button" className="sc-button sc-button-quiet" disabled={!!busy} onClick={reorder}>Order again</button></section>}
        {addressAsked && foodConnected && <AddressGate addresses={foodAddresses} loading={addressesLoading} busy={initializing || !!busy} onChoose={address => void chooseAddress(address)} onRefresh={() => setAddressRefresh(value => value + 1)}/>}
        {!view?.restaurantBrowser?.menu && <ExploreNavigation snacks={discovery?.kind === "snacks"} activeCategory={discovery?.categoryId} busy={initializing || !!busy} showHero={!addressAsked && !view?.restaurantBrowser?.restaurants.length && !groceries} voiceReady={bootstrap?.capabilities.realtimeStt ?? false} listening={listening} onTalk={() => { if (!listening) startVoice(); }} onChoose={text => void browseTo(text === "I want snacks" ? "snacks" : text === "Browse restaurants" ? "restaurants" : text, discovery?.kind === "snacks" ? "instamart" : "restaurant")}/>}
        {busy && busy !== "Thinking" && <div className="sc-browse-status" role="status"><span className="sc-spinner"/>{busy}…</div>}
        {view?.restaurantBrowser && !addressAsked && <RestaurantBrowser onCuisine={label => void browseTo(label, "restaurant")} voiceActive={voice.active && !voice.muted} voiceReply={voice.transcript.findLast(line => line.role === "assistant" && !line.id.startsWith("assistant:navigation:")) ?? null} onMenuVisible={onMenuVisible} voiceCommand={browseCommand} view={view} busy={!!busy} onVisibleChange={onVisibleRestaurants} onRestaurant={restaurantId => void restaurantAction("restaurant", "Opening menu", { restaurantId })} onBack={() => void restaurantAction("restaurants/back", "Showing restaurants")} onMoreRestaurants={() => void restaurantAction("restaurants/more", "Finding more restaurants")} onMoreMenu={() => void restaurantAction("menu/more", "Loading more dishes")} onAdd={(offer, quantity) => void restaurantAction("menu/select", "Updating your cart", { offerId: offer.id, quantity })} onConnect={provider => { if (provider === "swiggy_food") openSurface("connections"); }}/>}
        {/* Instamart searches need a delivery address too; without one the aisles stay empty, so ask right here. */}
        {view && groceryNeedsAddress && (foodConnected || instamartConnected) && <AddressGate groceries addresses={foodConnected ? foodAddresses : session?.addresses ?? []} loading={foodConnected ? addressesLoading : !session} busy={initializing || !!busy} onChoose={address => void (foodConnected ? chooseAddress(address, true) : chooseGroceryAddress(address))} onRefresh={() => foodConnected ? setAddressRefresh(value => value + 1) : void loadSession().catch(() => {})}/>}
        {view && discovery?.kind === "snacks" && !view.restaurantBrowser && (discovery.itemId
          ? <GroceryResults view={view} itemId={discovery.itemId} busy={!!busy} onAdd={offer => void selectOffer(offer, 1)} onQuantity={(offer, quantity) => void cartLine(offer, quantity)} onMore={itemId => void moreOptions(itemId)} onCategory={category => void browseTo(category.query, "instamart")} onHome={() => void instamartHome()}/>
          : <InstamartHome view={view} busy={!!busy} onCategory={category => void browseTo(category.query, "instamart")} onAdd={offer => void selectOffer(offer, 1)} onQuantity={(offer, quantity) => void cartLine(offer, quantity)}/>)}
        <footer className="sc-footer"><span><Glyph name="check" size={13}/> Nothing is ordered until you confirm the final total.</span></footer>
      </main>
    </div>
    {surface === "selection" && view && <Sheet accessory={sheetVoice} title="Your cart" subtitle={lines.length ? `${totals.count} ${totals.count === 1 ? "item" : "items"}${selectedAddress ? ` · delivering to ${selectedAddress.label}` : ""}` : undefined} onClose={() => setSurface(null)}><CartSummary view={view} busy={!!busy} swiggy={swiggyCart.status} instamart={instamartBag.status} onQuantity={(offer, quantity) => void cartLine(offer, quantity)} onPrepare={() => void prepareBag()} onBrowse={() => setSurface(null)} onCheckout={() => void foodAction("Getting your bill", "/api/food/checkout", {}, "checkout")} onReplaceSwiggy={swiggyCart.replace}/></Sheet>}
    {surface === "checkout" && <Sheet accessory={sheetVoice} title={food.review ? "Confirm your order" : "Checkout"} subtitle={food.checkout ? `From ${food.checkout.restaurant.name}` : undefined} onClose={() => setSurface(null)}><CheckoutPanel checkout={food.checkout} review={food.review} busy={!!busy} onPayment={id => void foodAction("Updating payment", "/api/food/payment", { paymentId: id }, "checkout")} onPlace={quoteId => void foodAction("Placing your order", "/api/food/order", { quoteId }, "order")} onRefresh={() => void foodAction("Refreshing your bill", "/api/food/checkout", {}, "checkout")}/></Sheet>}
    {surface === "order" && <Sheet accessory={sheetVoice} title="Your order" onClose={() => setSurface(null)}><OrderPanel attempt={food.attempt} order={food.order} tracking={food.tracking} busy={!!busy} onRefresh={refreshOrder} onTrack={trackOrder} onReorder={reorder} onReset={() => { if (food.attempt) void foodAction("Resetting unconfirmed checkout", "/api/food/order/reset", { attemptId: food.attempt.id, confirmedNoOrderOrPayment: true }, "selection"); }}/></Sheet>}
    {surface === "address" && <Sheet accessory={sheetVoice} title="Delivery address" subtitle="Restaurants and delivery times follow this address." onClose={() => setSurface(null)}><AddressPicker addresses={foodAddresses} selectedId={foodAddressId} loading={addressesLoading} busy={!!busy} onChoose={address => void chooseAddress(address)} onConnections={() => setSurface("connections")}/></Sheet>}
    {surface === "connections" && <Sheet accessory={sheetVoice} title="Your connections" subtitle="Connect Swiggy to order. You approve every order." onClose={() => setSurface(null)}><div className="sc-connection-list">{view?.providers.map(provider => <article key={provider.id}><span className={`sc-provider-monogram ${provider.id}`}>{provider.id === "zomato" ? "z" : "S"}</span><div><h3>{provider.name}</h3><span className={`sc-connection-status ${provider.status === "connected" ? "connected" : ""}`}>{provider.status === "connected" ? "Connected" : provider.status === "access_required" ? "Access required" : provider.status === "unavailable" ? "Unavailable" : "Not connected"}</span><p>{provider.message}</p></div>{provider.status !== "access_required" && provider.status !== "unavailable" && provider.id !== "zomato" && <button className="sc-button sc-button-quiet" disabled={!!busy} onClick={() => void connect(provider.id as "instamart" | "swiggy_food")}>{provider.status === "connected" ? "Refresh" : "Connect"}<Glyph name="arrow" size={14}/></button>}</article>)}</div>{session?.addresses.length ? <label className="sc-field">Instamart delivery address<select value={session.addressId ?? ""} disabled={!!busy} onChange={event => void changeSessionOption("address", event.target.value)}><option value="" disabled>Choose an address</option>{session.addresses.map(address => <option key={address.id} value={address.id}>{address.label} · {address.reviewAddressText}</option>)}</select></label> : null}</Sheet>}
    {surface === "bag" && <Sheet accessory={sheetVoice} title="Your Instamart bag" subtitle="Live totals from Instamart." onClose={() => setSurface(null)}>{session ? <><div className="sc-bag-lines">{session.cart.lines.map(line => <div key={line.product.id}><span className="sc-bag-count">{line.quantity}×</span><div><strong>{line.product.name}</strong><p>{line.product.unit}</p></div><strong>{money(line.product.priceMinor * line.quantity)}</strong></div>)}</div>{!session.cart.lines.length && <div className="sc-bag-empty"><Glyph name="bag" size={35}/><h3>Your bag is empty.</h3><p>Say “get me chips and a cold drink”.</p></div>}{session.payments.length > 0 && <section className="sc-checkout-pay" aria-label="Payment method"><h3>Pay with</h3><div>{session.payments.map(payment => <button type="button" key={payment.id} aria-pressed={session.paymentMethodId === payment.id} disabled={!!busy} onClick={() => void changeSessionOption("payment", payment.id)}>{session.paymentMethodId === payment.id && <Glyph name="check" size={15}/>}{payment.label}</button>)}</div></section>}{session.cart.lines.length > 0 && <><div className="sc-bill"><div><span>Items</span><span>{money(session.cart.totals.itemsMinor)}</span></div><div><span>Delivery & other fees</span><span>{money(session.cart.totals.feesMinor)}</span></div><div className="sc-bill-total"><strong>Current total</strong><strong>{money(session.cart.totals.totalMinor)}</strong></div></div>{!session.paymentMethodId && <p className="sc-cart-note">Choose how to pay to review the final total.</p>}<button className="sc-button sc-button-primary sc-full-width" disabled={!!busy || !session.addressId || !session.paymentMethodId} onClick={() => void reviewBag()}>Review final order<Glyph name="arrow" size={17}/></button></>}</> : instamartConnected
      // Connected but the bag did not load: say why and offer a retry, rather than asking to connect again.
      ? <div className="sc-bag-empty"><Glyph name="bag" size={35}/><h3>{bagError ? "Your bag didn’t load" : "Getting your bag…"}</h3><p>{bagError ?? "Reading your live bag and bill from Instamart."}</p>{bagError && <button className="sc-button sc-button-primary" disabled={!!busy} onClick={() => void openBag()}>Try again<Glyph name="refresh" size={17}/></button>}</div>
      : <div className="sc-bag-empty"><Glyph name="bag" size={35}/><h3>Connect Instamart</h3><p>Connect your account to order groceries.</p><button className="sc-button sc-button-primary" onClick={() => openSurface("connections")}>View connections<Glyph name="arrow" size={17}/></button></div>}</Sheet>}
    {surface === "review" && <Sheet accessory={sheetVoice} title="All good to order?" subtitle="Check the details below." onClose={() => { setSurface(null); setQuote(null); }}>{quote ? <div className="sc-checkout">
      {/* The same review as a restaurant order: where it goes, what is in it, the bill and how it is paid. */}
      <section className="sc-checkout-where"><Glyph name="pin" size={18}/><div><strong>Instamart → {quote.address.label}</strong><small>{quote.address.reviewAddressText}</small></div></section>
      <ul className="sc-checkout-lines">{quote.cart.lines.map(line => <li key={line.product.id}><span>{line.quantity}×</span><strong>{line.product.name}</strong><b>{money(line.product.priceMinor * line.quantity)}</b></li>)}</ul>
      <div className="sc-cart-bill">{(quote.cart.bill?.lineItems ?? [{ label: "Items", value: money(quote.cart.totals.itemsMinor) }, { label: "Delivery & other fees", value: money(quote.cart.totals.feesMinor) }]).map((item, index) => <div className="sc-bill-row" key={index}><span>{item.label}</span><span>{item.value}</span></div>)}<div><span>To pay</span><strong>{money(quote.cart.totals.totalMinor)}</strong></div></div>
      <p className="sc-cart-note">Paying with {quote.payment.label}.</p>
      {quoteExpired ? <button className="sc-button sc-button-primary sc-full-width" disabled={!!busy} onClick={() => void reviewBag()}>Refresh total<Glyph name="refresh" size={17}/></button> : <button className="sc-button sc-button-primary sc-full-width" disabled={!!busy} onClick={() => void confirmBag()}>Confirm & order · {money(quote.cart.totals.totalMinor)}<Glyph name="check" size={17}/></button>}
    </div> : <p className="sc-loading"><span className="sc-spinner"/>Checking…</p>}</Sheet>}
  </div>;
}
