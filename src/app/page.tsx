"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AttemptSchema, BootstrapSchema, QuoteSchema, SessionViewSchema, type Attempt, type Cart, type Product, type Quote, type SessionView } from "@/lib/contracts";
import { catalogCategories, composeCatalogQuery, type CatalogCategory } from "@/lib/catalog-search";
import { useInlineDictation, type DictationField } from "@/lib/use-inline-dictation";

type Bootstrap = ReturnType<typeof BootstrapSchema.parse>;
type IconName = "mic" | "arrow" | "bag" | "plus" | "minus" | "close" | "check" | "pin" | "chevron" | "settings" | "volume" | "stop" | "spark" | "refresh" | "external" | "search" | "shield";

const iconPaths: Record<IconName, React.ReactNode> = {
    mic: <><rect x="9" y="2" width="6" height="13" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    bag: <><path d="m5 7-1 14h16L19 7ZM9 8V6a3 3 0 0 1 6 0v2" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    check: <path d="m5 12 4 4L19 6" />,
    pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    chevron: <path d="m8 10 4 4 4-4" />,
    settings: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="9" cy="6" r="2" fill="currentColor" /><circle cx="15" cy="12" r="2" fill="currentColor" /><circle cx="9" cy="18" r="2" fill="currentColor" /></>,
    volume: <><path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" /></>,
    stop: <rect x="5" y="5" width="14" height="14" rx="2" />,
    spark: <><path d="m12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3ZM20 2v4M18 4h4" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 7a7 7 0 0 1 12-2l2 3M4 16l2 3a7 7 0 0 0 12-2" /></>,
    external: <><path d="M14 3h7v7M21 3l-11 11M10 3H3v18h18v-7" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    shield: <><path d="M12 3 3 7v5c0 6 9 10 9 10s9-4 9-10V7Z" /><path d="m8 12 3 3 5-6" /></>,
};

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name]}</svg>;
}

const wholeRupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fractionalRupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const money = (minor: number) => (minor % 100 ? fractionalRupees : wholeRupees).format(minor / 100);
const suggestions = ["Find oat milk", "Show my bag", "Help me review my order"];

function CartBill({ cart, review = false, children }: { cart: Cart; review?: boolean; children?: React.ReactNode }) {
  return <div className={review ? "review-breakdown" : "cart-totals"}>
    {cart.bill ? cart.bill.lineItems.map((line, index) => <div key={`${line.label}-${index}`}><span>{line.label}</span><span>{line.value}</span></div>) : <>
      <div><span>Item total</span><span>{money(cart.totals.itemsMinor)}</span></div>
      <div><span>Delivery & other fees</span><span>{money(cart.totals.feesMinor)}</span></div>
      {cart.totals.discountMinor > 0 && <div className="discount"><span>Savings</span><span>−{money(cart.totals.discountMinor)}</span></div>}
    </>}
    {children}
    <div className={review ? "review-total" : "total"}><strong>{cart.bill?.toPay.label ?? "To pay"}</strong><strong>{cart.bill?.toPay.value ?? money(cart.totals.totalMinor)}</strong></div>
  </div>;
}

function productArt(product: Product): { emoji: string; background: string } {
  const name = product.name.toLowerCase();
  if (/headphone|earphone|earbud|charger|cable|battery|iphone|smartphone|airpod|power bank|speaker/.test(name)) return { emoji: "🎧", background: "#e7e9f0" };
  if (/milk|curd|yogurt/.test(name)) return { emoji: "🥛", background: "#eaf0f4" };
  if (/banana/.test(name)) return { emoji: "🍌", background: "#f9f1ce" };
  if (/apple/.test(name)) return { emoji: "🍎", background: "#f5e7df" };
  if (/egg/.test(name)) return { emoji: "🥚", background: "#f0eadd" };
  if (/bread|toast/.test(name)) return { emoji: "🍞", background: "#f5e8d6" };
  if (/tomato/.test(name)) return { emoji: "🍅", background: "#f4e5db" };
  if (/onion/.test(name)) return { emoji: "🧅", background: "#f0e5ee" };
  if (/rice|atta|flour/.test(name)) return { emoji: "🌾", background: "#edeada" };
  if (/oil/.test(name)) return { emoji: "🫒", background: "#e9eddf" };
  if (/coffee|tea/.test(name)) return { emoji: "☕", background: "#eee3da" };
  if (/potato/.test(name)) return { emoji: "🥔", background: "#f0e8db" };
  if (/shampoo|soap|wash|lotion|cream/.test(name)) return { emoji: "🧴", background: "#e9e6f0" };
  if (/chip|snack|popcorn|biscuit/.test(name)) return { emoji: "🍿", background: "#f8e9d5" };
  if (/juice|cola|soda|drink/.test(name)) return { emoji: "🧃", background: "#f2e9ce" };
  if (/clean|detergent|dishwash/.test(name)) return { emoji: "🧽", background: "#e3efeb" };
  if (/diaper|baby/.test(name)) return { emoji: "🧸", background: "#f4e8e4" };
  if (/dog|cat|pet/.test(name)) return { emoji: "🐾", background: "#ebe9dc" };
  return { emoji: "🛍️", background: "#e8eddf" };
}

function ProductVisual({product, compact=false}:{product:Product;compact?:boolean}) {
  const art=productArt(product);
  const imageUrl=product.imageUrl;
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[imageUrl]);
  return <div className={compact ? "cart-product-art" : "product-art"} style={{background:art.background}} aria-hidden="true">{imageUrl && !failed ? <img src={imageUrl} alt="" referrerPolicy="no-referrer" loading="lazy" decoding="async" onError={()=>setFailed(true)} /> : <span>{art.emoji}</span>}{!compact && <><span className="art-caption">{product.brand || "Instamart find"}</span>{!product.available && <span className="unavailable-tag">Out of stock</span>}</>}</div>;
}

const ProductGrid = memo(function ProductGrid({products, quantities, disabled, onChange}: {
  products: Product[];
  quantities: ReadonlyMap<string, number>;
  disabled: boolean;
  onChange: (productId: string, quantity: number) => void;
}) {
  return <div className="product-grid">{products.map(product=>{const quantity=quantities.get(product.id)??0;return <article className={`product-card ${!product.available?"unavailable":""}`} key={product.id}><ProductVisual product={product}/><div className="product-info"><span className="product-brand">{product.brand||"INSTAMART"}</span><h3>{product.name}</h3><p className="product-pack">{product.unit}</p><div className="product-card-bottom"><div className="product-price"><strong>{money(product.priceMinor)}</strong>{!!product.mrpMinor&&product.mrpMinor>product.priceMinor&&<del>{money(product.mrpMinor)}</del>}</div>{quantity?<div className="quantity-control"><button disabled={disabled} aria-label={`Remove one ${product.name} ${product.unit}`} onClick={()=>onChange(product.id,quantity-1)}><Icon name="minus" size={13}/></button><span>{quantity}</span><button disabled={disabled||!product.available||quantity>=(product.maxQuantity??99)} aria-label={`Add one ${product.name} ${product.unit}`} onClick={()=>onChange(product.id,quantity+1)}><Icon name="plus" size={13}/></button></div>:<button className="add-button" disabled={disabled||!product.available} aria-label={`Add ${product.name} ${product.unit}`} onClick={()=>onChange(product.id,1)}>{product.available?"ADD":"Sold out"}{product.available&&<Icon name="plus" size={14}/>}</button>}</div></div></article>})}</div>;
});

function DictationClock({startedAt}: {startedAt: number}) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const update = () => setSeconds(Math.min(60, Math.floor((Date.now() - startedAt) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [startedAt]);
  return <span className="dictation-clock" aria-hidden="true"> · {seconds}s</span>;
}

function trapDialogFocus(event: React.KeyboardEvent<HTMLElement>) {
  if (event.key !== "Tab") return;
  const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]'))
    .filter(element => element.getClientRects().length > 0);
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}

class RequestError extends Error {
  constructor(message: string, readonly code: string, readonly requestId?: string) { super(message); }
}

export default function Home() {
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [session, setSession] = useState<SessionView | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [searchText,setSearchText]=useState("");
  const [categoryText,setCategoryText]=useState("");
  const [categoryScope,setCategoryScope]=useState<{categoryId:string;query:string;addressId:string|null} | null>(null);
  const [sort,setSort]=useState("relevance");
  const [availableOnly,setAvailableOnly]=useState(false);
  const [assistantOpen,setAssistantOpen]=useState(false);
  const [bagOpen,setBagOpen]=useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [spokenReplies, setSpokenReplies] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speechPending, setSpeechPending] = useState(false);
  const [now, setNow] = useState(Date.now());
  const csrf = useRef("");
  const audio = useRef<HTMLAudioElement | null>(null);
  const audioUrl = useRef<string | null>(null);
  const turnAbort = useRef<AbortController | null>(null);
  const transcript = useRef<HTMLTextAreaElement | null>(null);
  const messagesEnd = useRef<HTMLDivElement | null>(null);
  const reviewClose = useRef<HTMLButtonElement | null>(null);
  const drawerClose = useRef<HTMLButtonElement | null>(null);
  const bagClose=useRef<HTMLButtonElement | null>(null);
  const searchInput=useRef<HTMLInputElement | null>(null);
  const categoryInput=useRef<HTMLInputElement | null>(null);
  const turnSequence = useRef(0);
  const playbackSequence = useRef(0);
  const speechAbort = useRef<AbortController | null>(null);
  const busyRef = useRef<string | null>(null);
  const spokenRepliesRef = useRef(false);
  const initializeSequence = useRef(0);
  const dictation=useInlineDictation({
    sessionId:session?.sessionId??null,
    csrfToken:bootstrap?.csrfToken??"",
    onText:(field,value)=>{if(field==="search")setSearchText(value);else if(field==="category")setCategoryText(value);else setText(value);},
    onError:setError,
  });

  // Product cards keep a stable handler while each action reads the latest
  // committed session/revision. Dictation updates need not redraw the catalog.
  const cartAction = useRef(changeCart);
  useLayoutEffect(() => { cartAction.current = changeCart; });
  const onQuantityChange = useCallback((productId: string, quantity: number) => {
    void cartAction.current(productId, quantity);
  }, []);

  const request = useCallback(async <T,>(url: string, options: { body?: unknown; method?: string; signal?: AbortSignal } = {}): Promise<T> => {
    const method = options.method ?? (options.body === undefined ? "GET" : "POST");
    const response = await fetch(url, {
      method, credentials: "same-origin", signal: AbortSignal.any([...(options.signal ? [options.signal] : []), AbortSignal.timeout(120_000)]),
      headers: {
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(method === "GET" ? {} : { "X-CSRF-Token": csrf.current, "Idempotency-Key": crypto.randomUUID() }),
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    }).catch((error: unknown) => {
      if (options.signal?.aborted) throw error;
      throw new RequestError(
        error instanceof Error && error.name === "TimeoutError"
          ? "This request took too long. Refresh your bag or order status before repeating an action."
          : "Could not reach SayCart. Check your connection, then refresh your bag or order status.",
        "CONNECTION_INTERRUPTED",
      );
    });
    const data = await response.json().catch(() => {
      throw new RequestError("The shopping service could not return a response. Refresh to check the latest status.", "INVALID_RESPONSE");
    });
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new RequestError("The shopping service sent an unexpected response. Refresh to check the latest status.", "INVALID_RESPONSE");
    if (!response.ok) {
      const code = data.error?.code ?? "REQUEST_FAILED";
      if (code === "SWIGGY_RECONNECT_REQUIRED" || code === "SWIGGY_NOT_CONNECTED") {
        setBootstrap(previous => previous ? { ...previous, connected: false } : previous);
        setSession(previous => previous ? { ...previous, connected: false } : previous);
      }
      throw new RequestError(data.error?.message ?? "Something went wrong. Please try again.", code, data.requestId);
    }
    const { requestId: _requestId, ...payload } = data;
    try {
      let validated: unknown = payload;
      if (url === "/api/bootstrap") validated = BootstrapSchema.parse(payload);
      else if (["/api/session", "/api/search", "/api/turn", "/api/cart", "/api/address", "/api/payment", "/api/stop"].includes(url)) validated = SessionViewSchema.parse(payload);
      else if (url === "/api/quote") validated = { quote: QuoteSchema.parse(payload.quote) };
      else if (url === "/api/attempt/current") validated = { attempt: AttemptSchema.nullable().parse(payload.attempt) };
      else if (url === "/api/confirm" || url.startsWith("/api/attempt/")) validated = { attempt: AttemptSchema.parse(payload.attempt) };
      if (payload.csrfToken) csrf.current = payload.csrfToken;
      return validated as T;
    } catch { throw new RequestError("The shopping service sent an unexpected response. Refresh to check the latest status.", "INVALID_RESPONSE"); }
  }, []);

  const initialize = useCallback(async (signal?: AbortSignal) => {
    const sequence = ++initializeSequence.current;
    setInitializing(true);
    setError(null);
    try {
      const data = await request<Bootstrap>("/api/bootstrap", { signal });
      if (sequence !== initializeSequence.current) return;
      csrf.current = data.csrfToken;
      setBootstrap(data);
      const [view, current] = await Promise.allSettled([
        data.sessionId ? request<SessionView>("/api/session", { signal }) : null,
        request<{ attempt: Attempt | null }>("/api/attempt/current", { signal }),
      ]);
      if (sequence !== initializeSequence.current) return;
      // A failed order-status read must not discard a successfully loaded session,
      // and a failed session refresh must not discard a recovered order attempt.
      if (view.status === "fulfilled") setSession(view.value);
      if (current.status === "fulfilled") setAttempt(current.value.attempt);
      if (view.status === "rejected") throw view.reason;
      if (current.status === "rejected") throw current.reason;
    } catch (e) { if (!signal?.aborted && sequence === initializeSequence.current) setError(e instanceof Error ? e.message : "Could not reach the shopping service."); }
    finally { if (!signal?.aborted && sequence === initializeSequence.current) setInitializing(false); }
  }, [request]);

  useEffect(() => {
    const controller = new AbortController();
    void initialize(controller.signal);
    return () => { ++initializeSequence.current; controller.abort(); };
  }, [initialize]);
  useEffect(()=>{
    if(categoryScope && (categoryScope.query!==session?.search?.query || categoryScope.addressId!==session?.addressId)) {
      setCategoryScope(null);
      setCategoryText("");
    }
  },[categoryScope,session?.search?.query,session?.addressId]);
  useEffect(() => {
    if (!quote) return;
    reviewClose.current?.focus();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const close = (event: KeyboardEvent) => { if (event.key === "Escape" && busy !== "checkout") setQuote(null); };
    document.addEventListener("keydown", close);
    return () => { clearInterval(timer); document.removeEventListener("keydown", close); };
  }, [quote, busy]);
  useEffect(() => {
    if (!drawer) return;
    drawerClose.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setDrawer(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [drawer]);
  useEffect(()=>{
    if(!bagOpen)return;
    bagClose.current?.focus();
    const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setBagOpen(false);};
    document.addEventListener("keydown",close);
    return()=>document.removeEventListener("keydown",close);
  },[bagOpen]);
  const modalOpen = drawer || !!quote || bagOpen;
  useLayoutEffect(() => {
    if (!modalOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [modalOpen]);
  useEffect(() => () => {
    ++playbackSequence.current;
    ++turnSequence.current;
    audio.current?.pause();
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    turnAbort.current?.abort();
    speechAbort.current?.abort();
  }, []);

  function stopPlayback() {
    ++playbackSequence.current;
    speechAbort.current?.abort();
    speechAbort.current = null;
    audio.current?.pause();
    audio.current = null;
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = null;
    setPlaying(false);
    setSpeechPending(false);
  }

  async function speak(view: SessionView) {
    const message = [...view.messages].reverse().find(item => item.role === "assistant");
    if (!spokenRepliesRef.current || !bootstrap?.capabilities.tts || !message) return;
    stopPlayback();
    const sequence = playbackSequence.current;
    const controller = new AbortController();
    speechAbort.current = controller;
    setSpeechPending(true);
    try {
      const response = await fetch("/api/speech", { method: "POST", credentials: "same-origin", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(120_000)]), headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf.current, "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ sessionId: view.sessionId, assistantMessageId: message.id, expectedTurnVersion: view.turnVersion }) });
      if (!response.ok) throw new Error("Voice reply is unavailable. Your reply is shown below.");
      const blob = await response.blob();
      if (sequence !== playbackSequence.current) return;
      audioUrl.current = URL.createObjectURL(blob);
      const player = new Audio(audioUrl.current);
      audio.current = player;
      player.onended = () => { if (sequence === playbackSequence.current) stopPlayback(); };
      player.onerror = () => { if (sequence === playbackSequence.current) stopPlayback(); };
      await player.play();
      if (sequence !== playbackSequence.current) { player.pause(); return; }
      setPlaying(true);
    } catch (e) {
      if (sequence === playbackSequence.current) {
        stopPlayback();
        if (!(e instanceof Error && e.name === "AbortError")) setError(e instanceof Error ? e.message : "Could not play the voice reply.");
      }
    } finally { if (sequence === playbackSequence.current) setSpeechPending(false); }
  }

  // React state updates are deferred; the ref also rejects two clicks in the same tick.
  function beginWork(activity: string) {
    if (busyRef.current || initializing || !bootstrap) return false;
    busyRef.current = activity;
    setBusy(activity);
    stopDictation();
    stopPlayback();
    return true;
  }

  function finishWork() { busyRef.current = null; setBusy(null); }

  async function recoverSession(sequence?: number) {
    const [view, current] = await Promise.allSettled([
      request<SessionView>("/api/session"),
      request<{ attempt: Attempt | null }>("/api/attempt/current"),
    ]);
    if (sequence !== undefined && sequence !== turnSequence.current) return;
    // Recover each available result without replacing the original error or draft.
    if (view.status === "fulfilled") setSession(view.value);
    if (current.status === "fulfilled") setAttempt(current.value.attempt);
  }

  async function startSession() {
    if (!beginWork("session")) return;
    setError(null);
    try {
      const view = await request<SessionView>("/api/session", { body: { mode: "live" } });
      setSession(view); setQuote(null);
      if (!view.connected) {
        window.location.assign("/api/integrations/swiggy/connect");
        return;
      }
      const current = await request<{ attempt: Attempt | null }>("/api/attempt/current");
      setAttempt(current.attempt);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not start your shopping session."); }
    finally { finishWork(); }
  }

  async function searchCatalog(query:string,loadMore=false,scope?:{category:CatalogCategory;text:string}) {
    if(!session||!shoppingReady||!query.trim()||!beginWork(loadMore?"more":"search"))return;
    setError(null); setQuote(null);
    if(!loadMore&&!scope)setSearchText(query);
    if(!loadMore){setSort("relevance");setAvailableOnly(false);}
    const sequence=++turnSequence.current,controller=new AbortController();turnAbort.current=controller;
    try {
      const view=await request<SessionView>("/api/search",{body:{sessionId:session.sessionId,query:query.trim(),loadMore,expectedTurnVersion:session.turnVersion,expectedCartRevision:session.cart.revision},signal:controller.signal});
      if(sequence===turnSequence.current){
        setSession(view);
        if(!loadMore){
          setCategoryScope(scope ? {categoryId:scope.category.id,query:view.search?.query??query,addressId:view.addressId} : null);
          setCategoryText(scope?.text??"");
          if(scope)requestAnimationFrame(()=>{if(sequence===turnSequence.current)categoryInput.current?.focus();});
        }
      }
    } catch(error){if(sequence===turnSequence.current&&error instanceof Error&&error.name!=="AbortError"){setError(error.message);await recoverSession(sequence);}}
    finally{if(sequence===turnSequence.current){finishWork();turnAbort.current=null;}}
  }

  async function searchCategory(category:CatalogCategory,text:string) {
    try {
      await searchCatalog(composeCatalogQuery(text,category),false,{category,text});
    } catch(error) {
      setError(error instanceof Error?error.message:"Try a shorter search.");
    }
  }

  async function searchAllCategories() {
    if(categoryText.trim()) {
      await searchCatalog(categoryText.trim());
    } else {
      setCategoryScope(null);
      setCategoryText("");
    }
    searchInput.current?.focus();
  }

  async function sendTurn(event?: React.FormEvent) {
    event?.preventDefault();
    if (!session || !shoppingReady || !text.trim() || !beginWork("turn")) return;
    setError(null); setQuote(null);
    const sequence = ++turnSequence.current;
    const controller = new AbortController();
    turnAbort.current = controller;
    try {
      const view = await request<SessionView>("/api/turn", { body: { sessionId: session.sessionId, text: text.trim(), expectedTurnVersion: session.turnVersion, expectedCartRevision: session.cart.revision, displayedProductIds: visibleProducts.slice(0, 20).map(product => product.id) }, signal: controller.signal });
      if (sequence !== turnSequence.current) return;
      setSession(view); setText("");
      void speak(view);
    } catch (e) {
      if (sequence === turnSequence.current && e instanceof Error && e.name !== "AbortError") {
        setError(e.message);
        await recoverSession(sequence);
      }
    }
    finally { if (sequence === turnSequence.current) { finishWork(); turnAbort.current = null; } }
  }

  async function stopTurn() {
    stopPlayback();
    if (!session) return;
    const interrupted = ["turn","search","more"].includes(busyRef.current ?? "");
    ++turnSequence.current;
    turnAbort.current?.abort();
    if (!interrupted) return;
    busyRef.current = "stop"; setBusy("stop");
    try { setSession(await request<SessionView>("/api/stop", { body: { sessionId: session.sessionId, expectedTurnVersion: session.turnVersion } })); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not stop this turn. Refresh to check its status."); await recoverSession(); }
    finally { finishWork(); turnAbort.current = null; }
  }

  async function changeCart(productId: string, quantity: number) {
    if (!session || !shoppingReady || !beginWork("cart")) return;
    setError(null); setQuote(null);
    try { setSession(await request<SessionView>("/api/cart", { body: { sessionId: session.sessionId, productId, quantity, expectedCartRevision: session.cart.revision } })); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not update your cart."); await recoverSession(); }
    finally { finishWork(); }
  }

  async function refreshCart() {
    if (!session || !beginWork("refresh")) return;
    setError(null); setQuote(null);
    try { setSession(await request<SessionView>("/api/session")); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not refresh your Instamart bag."); }
    finally { finishWork(); }
  }

  async function selectOption(kind: "address" | "payment", id: string) {
    if (!session || !beginWork(kind)) return;
    setError(null); setQuote(null);
    try { setSession(await request<SessionView>(`/api/${kind}`, { body: { sessionId: session.sessionId, [kind === "address" ? "addressId" : "paymentMethodId"]: id } })); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save your selection."); await recoverSession(); }
    finally { finishWork(); }
  }

  async function reviewOrder() {
    if (!session || !beginWork("quote")) return;
    setError(null); setNow(Date.now());
    try { const result = await request<{ quote: Quote }>("/api/quote", { body: { sessionId: session.sessionId, expectedCartRevision: session.cart.revision } }); setNow(Date.now()); setBagOpen(false); setQuote(result.quote); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not prepare your order review."); await recoverSession(); }
    finally { finishWork(); }
  }

  async function confirmOrder() {
    if (!quote || Date.parse(quote.expiresAt) <= Date.now() || !beginWork("checkout")) return;
    setError(null);
    try {
      const result = await request<{ attempt: Attempt }>("/api/confirm", { body: { quoteId: quote.id, challenge: quote.challenge } });
      setAttempt(result.attempt); setQuote(null);
      setSession(await request<SessionView>("/api/session"));
    } catch (e) {
      setQuote(null);
      setError(e instanceof RequestError ? e.message : "We could not read the order result. Check the order status before placing another order.");
      await recoverSession();
    } finally { finishWork(); }
  }

  async function refreshAttempt() {
    if (!attempt || !beginWork("status")) return;
    setError(null);
    try { const result = await request<{ attempt: Attempt }>(`/api/attempt/${encodeURIComponent(attempt.id)}`); setAttempt(result.attempt); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not check your order status."); }
    finally { finishWork(); }
  }

  function stopDictation() { dictation.cancel(); }

  function openBag() {
    stopDictation();
    stopPlayback();
    setBagOpen(true);
  }

  function openDetails() {
    stopDictation();
    stopPlayback();
    setDrawer(true);
  }

  function toggleAssistant() {
    if (assistantOpen) {
      if(dictation.field==="assistant")stopDictation();
      stopPlayback();
    }
    setAssistantOpen(!assistantOpen);
  }

  function toggleDictation(field:DictationField) {
    if(!session||!shoppingReady||busyRef.current)return;
    if(dictation.busy){if(dictation.field===field)dictation.finish();return;}
    stopPlayback();setError(null);
    const input=field==="search"?searchInput.current:field==="category"?categoryInput.current:transcript.current;
    const value=field==="search"?searchText:field==="category"?categoryText:text;
    const limit=field==="assistant"?2000:field==="category"&&activeCategory?200-activeCategory.scopeTerm.length-1:200;
    const from=input?.selectionStart,to=input?.selectionEnd;
    input?.focus({preventScroll:true});
    void dictation.start(field,value,limit,from,to);
  }

  function voiceButton(field:DictationField) {
    const active=dictation.busy&&dictation.field===field;
    const label=!bootstrap?.capabilities.realtimeStt?"Live dictation needs an ElevenLabs key":active?(dictation.phase==="connecting"?"Cancel microphone connection":"Finish dictation"):`Dictate ${field==="assistant"?"your request":field==="category"?"category search":"product search"}`;
    return <button className={`search-mic inline-mic ${active?"active":""}`} type="button" aria-label={label} title={label} aria-pressed={active} disabled={!shoppingReady||!bootstrap?.capabilities.realtimeStt||!!busy||(dictation.busy&&!active)||(active&&dictation.phase==="finishing")} onClick={()=>toggleDictation(field)}>{active&&(dictation.phase==="connecting"||dictation.phase==="finishing")?<span className="loader"/>:<Icon name={active?"stop":"mic"} size={20}/>}</button>;
  }

  function voiceStatus(field:DictationField) {
    if(dictation.field!==field||!dictation.message)return null;
    return <div id={`${field}-dictation-status`} className={`inline-voice-status ${dictation.busy?"live":""}`}><span><span role="status">{dictation.phase==="listening"&&<span className="listening-dot" aria-hidden="true"/>}{dictation.message}</span>{dictation.phase==="listening"&&dictation.startedAt!==null&&<DictationClock startedAt={dictation.startedAt}/>}</span>{dictation.busy&&<button type="button" className="text-button" onClick={()=>dictation.cancel(true)}>Discard</button>}</div>;
  }

  const cartCount = session?.cart.lines.reduce((count, line) => count + line.quantity, 0) ?? 0;
  const shoppingReady = !!session?.connected && !!session.addressId;
  const orderPending = attempt && ["submitted", "payment_pending", "outcome_unknown"].includes(attempt.state);
  const canReview = shoppingReady && !!cartCount && !!session?.paymentMethodId && !busy && !orderPending;
  const quoteSeconds = quote ? Math.max(0, Math.ceil((Date.parse(quote.expiresAt) - now) / 1000)) : 0;

  const selectedAddress=session?.addresses.find(item=>item.id===session.addressId);
  const activeCategory=categoryScope?.query===session?.search?.query&&categoryScope?.addressId===session?.addressId
    ? catalogCategories.find(category=>category.id===categoryScope?.categoryId)
    : undefined;
  const visibleProducts=useMemo(()=>{
    const products=session?.products ?? [];
    const visible=availableOnly?products.filter(product=>product.available):products;
    if(sort==="price-low")return [...visible].sort((a,b)=>a.priceMinor-b.priceMinor);
    if(sort==="price-high")return [...visible].sort((a,b)=>b.priceMinor-a.priceMinor);
    return visible;
  },[session?.products,availableOnly,sort]);
  const cartQuantities=useMemo(()=>new Map(session?.cart.lines.map(line=>[line.product.id,line.quantity]) ?? []),[session?.cart.lines]);
  const catalogProducts=useMemo(()=>new Map(session?.products.map(product=>[product.id,product]) ?? []),[session?.products]);
  const searching=busy==="search" || busy==="more";
  const audioBusy=dictation.busy;
  const blocked=!!busy||audioBusy||!shoppingReady;
  const bagContent=session && <>
    <div className="cart-title"><div><span className="section-kicker">YOUR INSTAMART</span><h2>Shopping bag <span>{cartCount}</span></h2></div><button className="icon-button" aria-label="Refresh Instamart bag" disabled={!!busy||!session.connected} onClick={()=>void refreshCart()}><Icon name="refresh" size={19}/></button></div>
    {bagOpen&&error&&<p className="bag-feedback" role="alert">{error}</p>}
    <div className="bag-address"><Icon name="pin" size={18}/><div><strong>{selectedAddress?.label ?? "Choose a delivery address"}</strong><small>Availability is based on this address</small></div></div>
    {session.cart.lines.length ? <div className="cart-lines">{session.cart.lines.map(line=><div className="cart-line" key={line.product.id}>
      <ProductVisual product={{...line.product,imageUrl:catalogProducts.get(line.product.id)?.imageUrl ?? line.product.imageUrl}} compact/>
      <div className="cart-line-info"><h3>{line.product.name}</h3><p>{line.product.unit}</p><button className="text-button remove-line" disabled={blocked} onClick={()=>void changeCart(line.product.id,0)} aria-label={`Remove ${line.product.name} ${line.product.unit} from bag`}>Remove</button>{!line.product.available&&<span className="stock-warning">Unavailable · remove to continue</span>}<div className="cart-line-bottom"><div className="quantity-control"><button aria-label={`Remove one ${line.product.name} ${line.product.unit} from bag`} disabled={blocked} onClick={()=>void changeCart(line.product.id,line.quantity-1)}><Icon name="minus" size={13}/></button><span>{line.quantity}</span><button aria-label={`Add one ${line.product.name} ${line.product.unit} to bag`} disabled={blocked||!line.product.available||line.quantity>=(line.product.maxQuantity??99)} onClick={()=>void changeCart(line.product.id,line.quantity+1)}><Icon name="plus" size={13}/></button></div><strong>{money(line.product.priceMinor*line.quantity)}</strong></div></div>
    </div>)}</div> : <div className="empty-bag"><span className="empty-bag-icon"><Icon name="bag" size={34}/></span><h3>A little room for everything.</h3><p>Choose a product and its pack size.<br/>Your picks will appear here.</p></div>}
    {!!cartCount&&<><div className="bill-heading">Bill details <span>From Swiggy</span></div><CartBill cart={session.cart}/><details className="payment-options" open={!session.paymentMethodId}><summary><span><b>Payment method</b><small>{session.payments.find(p=>p.id===session.paymentMethodId)?.label ?? "Choose how to pay"}</small></span><Icon name="chevron" size={17}/></summary><div className="payment-choices" role="group" aria-label="Choose payment method">{session.payments.map(payment=><button key={payment.id} className={session.paymentMethodId===payment.id?"selected":""} aria-pressed={session.paymentMethodId===payment.id} disabled={!!busy} onClick={()=>void selectOption("payment",payment.id)}><span className="radio-mark"/>{payment.label}</button>)}{!session.payments.length&&<p>Payment choices are unavailable. Refresh the bag to try again.</p>}</div></details></>}
    <button className="button button-primary checkout-button" disabled={!canReview} onClick={()=>void reviewOrder()}>{busy==="quote"?"Preparing your review…":"Review order"}<Icon name="arrow" size={18}/></button>
    <p className="checkout-note">{cartCount&&!session.paymentMethodId?"Choose a payment method to continue.":orderPending?"Check your existing order in Swiggy first.":"You’ll confirm the full total before ordering."}</p>
  </>;

  return <div className="app-shell">
    <div inert={modalOpen}>
      <a className="skip-link" href="#shopping-main">Skip to shopping</a>
      <header className="site-header"><div className="header-inner">
        <a href="/" className="brand" aria-label="SayCart home"><span className="brand-mark"><Icon name="bag" size={23}/></span>saycart<span className="brand-period">.</span></a>
        {session&&<div className="header-address"><Icon name="pin" size={18}/><div><label htmlFor="delivery-address">Delivering to</label><select id="delivery-address" value={session.addressId??""} disabled={!!busy||!session.connected||!session.addresses.length} onChange={event=>void selectOption("address",event.target.value)}><option value="" disabled>Choose your address</option>{session.addresses.map(address=><option key={address.id} value={address.id}>{address.label}</option>)}</select></div></div>}
        <div className="header-actions"><button className="connection-button" onClick={openDetails} aria-label="Open connection and usage details"><span className={`status-dot ${session?.connected||bootstrap?.connected?"ready":""}`}/><span>{session?.connected||bootstrap?.connected?"Connected to Swiggy":"Connection"}</span><Icon name="settings" size={17}/></button>{session&&<button className="header-bag" onClick={openBag} aria-label={`Open shopping bag, ${cartCount} items`}><Icon name="bag" size={20}/><span>{cartCount}</span></button>}</div>
      </div></header>
      <main id="shopping-main">
        {error&&<div className="error-banner" role="alert"><div><strong>Let’s get this sorted</strong><p>{error}</p></div><button className="icon-button" aria-label="Dismiss message" onClick={()=>setError(null)}><Icon name="close" size={18}/></button></div>}
        {session?.notice&&<div className="setup-banner" role="status"><Icon name="bag" size={19}/><p>{session.notice}</p></div>}
        {initializing?<div className="loading-screen" role="status"><span className="loader"/><p>Opening your shopping space…</p></div>:!session?<section className="welcome-hero"><div><span className="eyebrow">YOUR EVERYDAY, A LITTLE EASIER</span><h1>Say it.<br/>Find it. <em>Cart it.</em></h1><p>From your morning milk to your next pair of headphones. Shop your Instamart account with a little help from your voice.</p><button className="button button-primary" onClick={()=>void (bootstrap?.sessionId && bootstrap.connected ? initialize() : startSession())} disabled={!!busy||!bootstrap}>{busy==="session"?"Connecting…":bootstrap?.sessionId&&bootstrap.connected?"Retry shopping session":bootstrap?.connected?"Start shopping":"Connect Swiggy"}<Icon name="arrow"/></button><small>Use your saved Swiggy address. Review before you order.</small>{!bootstrap&&<button className="text-button" onClick={()=>void initialize()}>Retry connection</button>}</div><div className="welcome-art" aria-hidden="true"><div className="art-tile">🥑</div><div className="art-tile">🎧</div><div className="art-tile">🥛</div><div className="art-tile">🧴</div><span className="voice-sticker"><Icon name="mic"/> A few words. A full bag.</span></div></section>:<>
          {!session.connected?<div className="setup-banner"><Icon name="bag"/><p>Connect your account to browse products available near you.</p><button className="text-button" disabled={!!busy} onClick={()=>void startSession()}>Connect Swiggy <Icon name="arrow" size={16}/></button></div>:!session.addressId?<div className="setup-banner"><Icon name="pin"/><p>{session.addresses.length?"Choose your delivery address at the top to start shopping.":"Add a saved address in Swiggy, then refresh here."}</p>{!session.addresses.length&&<button className="text-button" disabled={!!busy} onClick={()=>void refreshCart()}>Refresh</button>}</div>:null}
          <section className="shop-intro"><div><span className="eyebrow">THE EVERYDAY STORE, WITH A VOICE</span><h1>Big plans. <em>Little errands.</em></h1><p>Find what you need on Instamart. We’ll make the list part easy.</p></div><div className="intro-stamp"><Icon name="spark" size={23}/><span>Your list.<br/><b>Your final say.</b></span></div></section>
          <div className="workspace-grid"><div className="shopping-column">
            <form className={`catalog-search ${dictation.busy&&dictation.field==="search"?"dictating":""}`} role="search" onSubmit={event=>{event.preventDefault();if(dictation.busy){dictation.finish();return;}void searchCatalog(searchText);}}>
              <Icon name="search" size={23}/><label className="sr-only" htmlFor="catalog-query">Search Instamart</label>
              <input ref={searchInput} id="catalog-query" type="search" autoComplete="off" enterKeyHint="search" value={searchText} onChange={event=>setSearchText(event.target.value)} placeholder="Search or speak: milk, skincare, headphones…" maxLength={200} readOnly={audioBusy&&dictation.field==="search"} disabled={!shoppingReady||!!busy||(audioBusy&&dictation.field!=="search")}/>
              {voiceButton("search")}<button className="button button-primary" type="submit" disabled={blocked||!searchText.trim()}>{busy==="search"?<span className="loader light"/>:"Search"}</button>
            </form>
            {voiceStatus("search")}
            <div className="search-context"><span><span className="status-dot ready"/> Live Instamart catalog</span><span>Prices & availability for your address</span></div>
            <section className="category-section" aria-label="Shop by category"><div className="section-heading"><h2>A little of everything</h2><span>Browse, then search your category</span></div><div className="category-grid">{catalogCategories.map(category=><button key={category.id} disabled={blocked} aria-pressed={activeCategory?.id===category.id} onClick={()=>void searchCategory(category,"")}><span style={{background:category.color}} aria-hidden="true">{category.emoji}</span><b>{category.label}</b></button>)}</div></section>
            <section className={`assistant-panel ${assistantOpen?"expanded":""}`}><button className="assistant-toggle" onClick={toggleAssistant} aria-expanded={assistantOpen} aria-controls="assistant-content"><span className="assistant-icon"><Icon name="spark" size={22}/></span><span><strong>A shopping assistant, on your terms.</strong><small>Speak or type a request. Choose the exact product.</small></span><span className="assistant-toggle-label">{assistantOpen?"Close":"Let’s talk"}</span><Icon name="chevron" size={18}/></button>
              {assistantOpen&&<div id="assistant-content">
              <form className={`composer ${dictation.busy&&dictation.field==="assistant"?"dictating":""}`} onSubmit={event=>{event.preventDefault();if(dictation.busy){dictation.finish();return;}void sendTurn();}}>
                <label className="sr-only" htmlFor="shopping-request">Your shopping request</label>
                <textarea id="shopping-request" ref={transcript} value={text} onChange={event=>setText(event.target.value)} placeholder="Type or tap the mic: “Find oat milk”" rows={2} maxLength={2000} readOnly={audioBusy&&dictation.field==="assistant"} disabled={!shoppingReady||!!busy||(audioBusy&&dictation.field!=="assistant")} onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();if(dictation.busy)dictation.finish();else void sendTurn();}}}/>
                {voiceButton("assistant")}<button className="send-button" type="submit" aria-label="Send shopping request" disabled={blocked||!text.trim()}>{busy==="turn"?<span className="loader light"/>:<Icon name="arrow"/>}</button>
              </form>
              {voiceStatus("assistant")}
              <div className="composer-bottom"><span>Speak into this field. Review your words, then send.</span><div className="composer-audio-actions"><button className="icon-button" type="button" disabled={!bootstrap?.capabilities.tts||audioBusy} title={bootstrap?.capabilities.tts?"Toggle spoken replies":"Spoken replies need a speech service"} aria-label="Voice replies" aria-pressed={spokenReplies} onClick={()=>{spokenRepliesRef.current=!spokenRepliesRef.current;setSpokenReplies(spokenRepliesRef.current);stopPlayback();}}><Icon name="volume" size={18}/></button>{(busy==="turn"||playing||speechPending)&&<button className="text-button" onClick={()=>void stopTurn()}><Icon name="stop" size={13}/> Stop {playing||speechPending?"audio":"response"}</button>}</div></div>
              <div className="suggestion-row">{suggestions.map(suggestion=><button key={suggestion} disabled={blocked} onClick={()=>{setText(suggestion);transcript.current?.focus();}}>{suggestion}<Icon name="plus" size={13}/></button>)}</div>
              <div className="conversation" aria-label="Shopping conversation" aria-live="polite">{session.messages.slice(-4).map(message=><div className={`message ${message.role}`} key={message.id}><span>{message.role==="assistant"?<Icon name="spark" size={15}/>:"You"}</span><p>{message.text}</p></div>)}<div ref={messagesEnd}/></div></div>}
            </section>
            <section className="products-section" aria-label="Search results" aria-busy={searching}><div className="section-heading results-heading"><div><span className="section-kicker">YOUR NEXT FIND</span><h2>{session.search?`Results for “${session.search.query}”`:session.products.length?"Your recent finds":"What’s on your list?"}</h2><p role="status">{session.products.length?`${visibleProducts.length} of ${session.products.length} loaded options · choose your pack`:session.search?"No matching products at this address":"Search a product, brand or category to get started."}</p></div></div>
              {activeCategory&&<div className="category-search-panel">
                <div className="category-search-heading"><label htmlFor="category-query">Find something in {activeCategory.label}</label><button className="category-scope" type="button" disabled={blocked} onClick={()=>void searchAllCategories()} aria-label={`Search all Instamart instead of ${activeCategory.label}`}><span aria-hidden="true">{activeCategory.emoji}</span>{activeCategory.label}<Icon name="close" size={13}/></button></div>
                <form className={`category-search-form ${dictation.busy&&dictation.field==="category"?"dictating":""}`} role="search" aria-label={`Search ${activeCategory.label}`} onSubmit={event=>{event.preventDefault();if(dictation.busy){dictation.finish();return;}void searchCategory(activeCategory,categoryText);}}>
                  <Icon name="search" size={20}/><input ref={categoryInput} id="category-query" type="search" autoComplete="off" enterKeyHint="search" value={categoryText} onChange={event=>setCategoryText(event.target.value)} maxLength={200-activeCategory.scopeTerm.length-1} placeholder={activeCategory.id==="snacks"?"Try healthy, spicy, makhana or a brand…":`Search a product, brand or preference…`} aria-describedby="category-search-help" readOnly={audioBusy&&dictation.field==="category"} disabled={!shoppingReady||!!busy||(audioBusy&&dictation.field!=="category")}/>
                  {voiceButton("category")}<button className="button button-primary" type="submit" disabled={blocked}>{busy==="search"?<span className="loader light"/>:"Search"}</button>
                </form>
                {voiceStatus("category")}
                <div className="category-search-footer"><p id="category-search-help">Press Enter or Search to find matching products on Instamart.</p><div>{(categoryText.trim()||session.search?.query!==activeCategory.baseQuery)&&<button className="text-button" disabled={blocked} onClick={()=>void searchCategory(activeCategory,"")}>Reset search</button>}<button className="text-button" disabled={blocked} onClick={()=>void searchAllCategories()}>Search all Instamart <Icon name="arrow" size={13}/></button></div></div>
              </div>}
              {!!session.products.length&&<div className="results-controls"><label className="stock-filter"><input type="checkbox" checked={availableOnly} onChange={event=>setAvailableOnly(event.target.checked)}/> In stock only</label><label className="sort-control">Sort loaded results<select aria-label="Sort products" value={sort} onChange={event=>setSort(event.target.value)}><option value="relevance">Recommended</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label></div>}
              {busy==="search"?<div className="product-grid skeleton-grid" aria-label="Finding products">{Array.from({length:6},(_,i)=><div className="skeleton-card" key={i}><div/><span/><span/></div>)}</div>:visibleProducts.length?<ProductGrid products={visibleProducts} quantities={cartQuantities} disabled={blocked} onChange={onQuantityChange}/>:<div className="products-empty"><span><Icon name="search" size={31}/></span><h3>{availableOnly&&session.products.length?"No in-stock options in these results.":session.search?"Let’s try another search.":"From everyday essentials to little extras."}</h3><p>{session.search?"Try a shorter name or another brand. Stock varies by delivery address.":"Milk, snacks, headphones, home care — search whatever you have in mind."}</p>{availableOnly&&session.products.length>0&&<button className="text-button" onClick={()=>setAvailableOnly(false)}>Show all results</button>}</div>}
              {session.search?.hasMore&&<button className="button button-secondary load-more" disabled={blocked} onClick={()=>void searchCatalog(session.search!.query,true)}>{busy==="more"?"Finding more…":"Load more products"}<Icon name="plus" size={16}/></button>}
              {session.products.length>=500&&<p className="checkout-note">Showing 500 options. Narrow your search for more specific results.</p>}
              {searching&&<button className="text-button stop-search" onClick={()=>void stopTurn()}>Cancel search</button>}
            </section>
          </div><aside className="cart-column">{!bagOpen&&<section className="cart-panel">{bagContent}</section>}<div className="trust-note"><Icon name="shield" size={19}/><p>Real products. Full bill.<br/><strong>Always your confirmation.</strong></p></div></aside></div>
          <button className="mobile-bag-bar" onClick={openBag}><span><Icon name="bag" size={20}/>{cartCount} {cartCount===1?"item":"items"}{cartCount>0&&<b>{money(session.cart.totals.totalMinor)}</b>}</span><strong>View bag <Icon name="arrow" size={17}/></strong></button>
        </>}
        {attempt&&<section className={`order-result ${attempt.state==="complete"?"success":""}`} aria-live="polite"><Icon name={attempt.state==="complete"?"check":"bag"}/><div><span className="section-kicker">LATEST ORDER ATTEMPT</span><h2>{attempt.state==="complete"?"Your order is confirmed.":attempt.state==="outcome_unknown"?"Check your order in Swiggy.":attempt.state==="payment_pending"?"Complete your payment.":attempt.state==="failed"?"This order wasn’t completed.":"Your order request was sent."}</h2><p>{attempt.message}</p>{attempt.paymentUrl&&<a className="button button-secondary" href={attempt.paymentUrl} target="_blank" rel="noreferrer">Complete payment on Swiggy <Icon name="external" size={15}/></a>}{attempt.results.map((result,i)=><p key={i}>{result.orderId?`Order ${result.orderId} · `:""}{result.state}: {result.message}</p>)}{orderPending&&<p className="checkout-note">This is the saved submission status. Check Swiggy for live payment and delivery updates.</p>}</div>{orderPending&&<button className="text-button" disabled={!!busy} onClick={()=>void refreshAttempt()}>Refresh saved status</button>}</section>}
      </main><footer className="site-footer"><span className="footer-brand">saycart.</span><p>A little help with your everyday.</p><span>Independent app · Powered by Swiggy Instamart</span></footer>
    </div>
    {bagOpen&&session&&<div className="modal-backdrop" onClick={event=>{if(event.target===event.currentTarget)setBagOpen(false);}}><section className="bag-modal" role="dialog" aria-modal="true" aria-label="Your shopping bag" onKeyDown={trapDialogFocus}><button ref={bagClose} className="icon-button bag-close" aria-label="Close shopping bag" onClick={()=>setBagOpen(false)}><Icon name="close"/></button>{bagContent}</section></div>}

    {drawer && <div className="modal-backdrop" onClick={event => { if (event.target === event.currentTarget) setDrawer(false); }}><section className="details-drawer" role="dialog" aria-modal="true" aria-labelledby="details-title" onKeyDown={trapDialogFocus}><div className="modal-heading"><div><span className="section-kicker">BEHIND YOUR SHOPPING SPACE</span><h2 id="details-title">Connection & usage</h2></div><button ref={drawerClose} className="icon-button" aria-label="Close connection details" onClick={() => setDrawer(false)}><Icon name="close" /></button></div><div className="service-list"><div><span>Swiggy Instamart</span><strong>{bootstrap?.connected || session?.connected ? "Connected" : "Not connected"}</strong></div><div><span>Groq reasoning</span><strong>{bootstrap?.capabilities.groq ? "Configured" : "Not configured"}</strong></div><div><span>ElevenLabs live dictation</span><strong>{bootstrap?.capabilities.realtimeStt ? "Configured" : "Key needed"}</strong></div><div><span>Spoken replies</span><strong>{bootstrap?.capabilities.tts ? "Configured" : "Not configured"}</strong></div></div><p className="drawer-help">Products, prices and your bag come from your connected Instamart account. Refresh the bag to check changes made in Swiggy.</p>{session && <><h3>Session usage</h3><div className="usage-grid"><div><strong>{session.usage.inputTokens.toLocaleString()}</strong><span>Input tokens</span></div><div><strong>{session.usage.outputTokens.toLocaleString()}</strong><span>Output tokens</span></div><div><strong>{session.usage.totalTokens.toLocaleString()}</strong><span>Total tokens</span></div></div><p className="model-label">{session.usage.model ?? "No model called yet"}</p>{session.trace.length > 0 && <details className="trace-details"><summary>Recent activity <span>{session.trace.length} events</span></summary><div>{session.trace.slice(-15).reverse().map(event => <div className="trace-row" key={event.id}><span className={`status-dot ${event.status === "ok" ? "ready" : "error"}`} /><div><strong>{event.tool}</strong><span>{event.stage}</span></div><span>{Math.round(event.durationMs)} ms</span></div>)}</div></details>}</>}<div className="drawer-actions">{!session?.connected && <button className="button button-primary" disabled={!!busy} onClick={() => { setDrawer(false); void (bootstrap?.sessionId && bootstrap.connected ? initialize() : startSession()); }}>{bootstrap?.sessionId && bootstrap.connected ? "Retry shopping session" : "Connect Swiggy"} <Icon name="external" size={15} /></button>}</div></section></div>}

    {quote && <div className="modal-backdrop"><section className="review-modal" role="dialog" aria-modal="true" aria-labelledby="review-title" onKeyDown={trapDialogFocus}><div className="modal-heading"><div><span className="section-kicker">ONE LAST LOOK</span><h2 id="review-title">All good to go?</h2></div><button ref={reviewClose} className="icon-button" aria-label="Close order review" disabled={busy === "checkout"} onClick={() => setQuote(null)}><Icon name="close" /></button></div><p className="review-intro">Check your items, delivery address and full total before placing this order.</p><div className="review-items">{quote.cart.lines.map(line => <div key={line.product.id}><span>{line.quantity} × {line.product.name}<small>{line.product.unit}</small></span><strong>{money(line.quantity * line.product.priceMinor)}</strong></div>)}</div><div className="review-delivery"><Icon name="pin" size={19} /><div><strong>{quote.address.label}</strong><p>{quote.address.reviewAddressText}</p></div></div><CartBill cart={quote.cart} review><div><span>Payment</span><span>{quote.payment.label}</span></div></CartBill>{quote.summary && <p className="quote-summary">{quote.summary}</p>}<p className={`quote-expiry ${!quoteSeconds ? "expired" : ""}`}>{quoteSeconds ? `This review is valid for ${quoteSeconds}s. Any cart change needs a new review.` : "This review has expired. Close it and review your order again."}</p><button className="button button-primary confirm-button" disabled={!!busy || !quoteSeconds} onClick={() => void confirmOrder()}>{busy === "checkout" ? "Sending your order…" : `Place order · ${money(quote.cart.totals.totalMinor)}`}<Icon name="check" size={18} /></button><p className="checkout-note">Only this button authorizes this order.</p></section></div>}
  </div>;
}
