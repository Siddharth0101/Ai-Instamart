import { AttemptSchema, QuoteSchema, SessionViewSchema, ProductSchema, type Product, type Address, type Attempt, type Cart, type Mode, type Quote, type SessionView } from "../lib/contracts";
import { equalSecret, fingerprint, opaqueId } from "./crypto";
import { AppError } from "./errors";
import { read, transaction, write, type StoreTx } from "./store";
import { decodeSwiggyVariantId, swiggyCartFingerprint, swiggyCartAddressMatches, type SwiggyGateway } from "./integrations/swiggy";
import { normalizeSwiggyCart, normalizeSwiggyPayments } from "./integrations/swiggy-mapping";
import type { SwiggyCart } from "./integrations/swiggy-schemas";
import type { SwiggyCheckoutInput, SwiggyCheckoutResult } from "./integrations/swiggy-checkout";

export type Owner = { csrfToken: string; sessionId: string | null; latestAttemptId?: string };
/** How long an unpaid UPI checkout can hold the order gate; Swiggy's own payment window is a few minutes. */
export const UPI_WINDOW_MS = 30 * 60_000;
export const UPI_LAPSED = "This UPI payment was never completed and its time ran out, so Swiggy did not place the order.";
type StoredSession = Omit<SessionView, "csrfToken" | "connected"> & { active?: { id: string; baseVersion: number }; addressSyncAt?: number; remoteFingerprint?: string; searchOffset?: number };
type StoredQuote = { quote: Quote; fingerprint: string; remoteFingerprint: string; consumed: boolean };
type StoredAttempt = { attempt: Attempt; quoteId: string; createdAt: string };
export type ShoppingProvider = Pick<SwiggyGateway, "readiness" | "getAddresses" | "searchProducts" | "getCart" | "getPaymentOptions" | "setCartQuantity" | "close"> & { checkout(input: SwiggyCheckoutInput): Promise<SwiggyCheckoutResult> };
export type CheckoutDispatcher = (quote: Quote, attemptId: string) => Promise<Attempt>;
export type ShoppingRuntime = { ownerQueues: Map<string, Promise<unknown>> };
const welcome = "Your Instamart account is ready. Choose your saved delivery address, then tell me what you need. Review your complete bill before confirming an order.";
const emptyCart = (): Cart => ({ revision: 0, lines: [], totals: { itemsMinor: 0, feesMinor: 0, discountMinor: 0, totalMinor: 0, currency: "INR" } });

/** Provider injection is for isolated tests; HTTP requests cannot choose a provider. */
export function createShoppingService(options: { provider: (ownerId: string) => ShoppingProvider; runtime?: ShoppingRuntime }) {
  const { ownerQueues } = options.runtime ?? { ownerQueues: new Map<string, Promise<unknown>>() };
  async function serial<T>(ownerId: string, work: () => Promise<T>): Promise<T> {
    const previous = ownerQueues.get(ownerId) || Promise.resolve();
    const current = previous.catch(() => {}).then(work);
    ownerQueues.set(ownerId, current);
    try { return await current; } finally { if (ownerQueues.get(ownerId) === current) ownerQueues.delete(ownerId); }
  }
  async function owned(tx: StoreTx, ownerId: string, sessionId: string) {
    const value = await tx.get<StoredSession>(ownerId, "session", sessionId);
    if (!value) throw new AppError("NOT_FOUND", "This session could not be found.", 404);
    if (value.mode !== "live") throw new AppError("SESSION_REPLACED", "Refresh to open your Instamart shopping session.", 409);
    return value;
  }
  const session = (ownerId: string, sessionId: string) => transaction(tx => owned(tx, ownerId, sessionId));
  const getOwner = (ownerId: string) => read<Owner>(ownerId, "owner", ownerId);
  async function createOwner() {
    const id = opaqueId("owner"), owner: Owner = { csrfToken: opaqueId("csrf"), sessionId: null };
    await write(id, "owner", id, owner); return { id, owner };
  }
  function idle(s: StoredSession) { if (s.active) throw new AppError("TURN_IN_PROGRESS", "Wait for the current request, or stop it first.", 409); }
  function revision(s: StoredSession, expected: number) { if (s.cart.revision !== expected) throw new AppError("CART_CHANGED", "Your Instamart bag changed. Refresh it before continuing.", 409); }
  function address(s: StoredSession) {
    if (!s.addressId || !s.addresses.some(a => a.id === s.addressId)) throw new AppError("ADDRESS_REQUIRED", "Choose your saved Swiggy delivery address first.", 422);
    return s.addressId;
  }
  async function connected(provider: ShoppingProvider) {
    if (!(await provider.readiness()).connected) throw new AppError("SWIGGY_NOT_CONNECTED", "Connect your Swiggy account to start shopping.", 401);
  }
  async function saveCart(ownerId: string, sessionId: string, raw: SwiggyCart) {
    const remoteFingerprint = swiggyCartFingerprint(raw);
    return transaction(async tx => {
      const current = await owned(tx, ownerId, sessionId);
      const cart = normalizeSwiggyCart(raw, current.cart.revision + (current.remoteFingerprint === remoteFingerprint ? 0 : 1));
      current.cart = cart; current.remoteFingerprint = remoteFingerprint;
      await tx.put(ownerId, "session", sessionId, current); return current;
    });
  }
  async function refresh(ownerId: string, sessionId: string, provider: ShoppingProvider) {
    let s = await session(ownerId, sessionId);
    if (!(await provider.readiness()).connected) return s;
    if (!s.addressSyncAt || Date.now() - s.addressSyncAt > 60_000) {
      const addresses: Address[] = [];
      for (let page = 1; page <= 10; page++) {
        const result = await provider.getAddresses({ page, pageSize: 10 });
        addresses.push(...result.addresses.map(a => ({ id: a.id, label: [a.addressTag || a.addressCategory || "Saved address", a.addressLine.match(/\bsector[\s-]*\d+\b/i)?.[0]].filter(Boolean).join(" · "), reviewAddressText: a.addressLine })));
        if (!result.pagination.hasMore) break;
        if (page === 10) throw new AppError("ADDRESS_PAGE_LIMIT", "Too many saved addresses. Review them in Swiggy before continuing.", 503);
      }
      s = await transaction(async tx => {
        const current = await owned(tx, ownerId, sessionId); current.addresses = addresses; current.addressSyncAt = Date.now();
        if (current.addressId && !addresses.some(a => a.id === current.addressId)) { current.addressId = null; current.products = []; delete current.search; delete current.searchOffset; current.paymentMethodId = null; }
        await tx.put(ownerId, "session", sessionId, current); return current;
      });
    }
    s = await saveCart(ownerId, sessionId, await provider.getCart());
    let payments: SessionView["payments"] = [], notice: string | undefined;
    if (s.cart.lines.length) {
      try { payments = normalizeSwiggyPayments(await provider.getPaymentOptions()); }
      catch { notice = "Your Instamart bag is current. Payment options could not be refreshed; refresh the bag before checkout."; }
    }
    return transaction(async tx => {
      const current = await owned(tx, ownerId, sessionId); current.payments = payments;
      if (notice) current.notice = notice; else delete current.notice;
      if (!payments.some(p => p.id === current.paymentMethodId)) current.paymentMethodId = null;
      current.messages = current.messages.map(m => m.role === "assistant" && /Live commerce remains disabled|Live shopping needs verified|All products, prices, addresses and orders here are synthetic/.test(m.text) ? { ...m, text: welcome } : m);
      await tx.put(ownerId, "session", sessionId, current); return current;
    });
  }
  async function view(ownerId: string, s: StoredSession, provider: ShoppingProvider): Promise<SessionView> {
    const { active: _active, addressSyncAt: _sync, remoteFingerprint: _fingerprint, searchOffset: _offset, ...data } = s;
    // Drop old metadata from the initial pilot as sessions migrate in place.
    delete (data as Record<string, unknown>).liveAddressSyncAt;
    return SessionViewSchema.parse({ ...data, csrfToken: (await getOwner(ownerId))?.csrfToken || "", connected: (await provider.readiness()).connected });
  }
  async function getView(ownerId: string, sessionId: string) {
    return serial(ownerId, async () => {
      await transaction(async tx => {
        const current = await owned(tx, ownerId, sessionId);
        // This owner queue has drained, so no local request can still own this
        // marker. Recover an interrupted request after a server restart without
        // touching checkout gates or replaying any cart/order operation.
        if (current.active) {
          delete current.active;
          current.turnVersion++;
          current.messages = [...current.messages, { id: opaqueId("msg"), role: "assistant" as const, text: "An earlier request was interrupted. Check your current Instamart bag before continuing." }].slice(-60);
          await tx.put(ownerId, "session", sessionId, current);
        }
      });
      const provider = options.provider(ownerId);
      try { return await view(ownerId, await refresh(ownerId, sessionId, provider), provider); }
      finally { await provider.close(); }
    });
  }
  async function startSession(ownerId: string, mode: Mode) {
    if (mode !== "live") throw new AppError("INVALID_MODE", "Connect Swiggy to use your Instamart account.", 400);
    const sessionId = await transaction(async tx => {
      const owner = await tx.get<Owner>(ownerId, "owner", ownerId); if (!owner) throw new AppError("UNAUTHORIZED", "Refresh to start your shopping session.", 401);
      const existing = owner.sessionId ? await tx.get<StoredSession>(ownerId, "session", owner.sessionId) : null;
      // Two tabs starting together must resolve to the same persisted session.
      if (existing?.mode === "live") return existing.sessionId;
      const id = opaqueId("session");
      const initial: StoredSession = { sessionId: id, mode: "live", turnVersion: 0, messages: [{ id: opaqueId("msg"), role: "assistant", text: welcome }], products: [], cart: emptyCart(), addresses: [], addressId: null, payments: [], paymentMethodId: null, usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, model: null }, trace: [] };
      // A completed synthetic attempt is not an order in the live account. Keep
      // unresolved gates intact rather than erasing uncertain checkout history.
      if (owner.latestAttemptId) { const old = await tx.get<StoredAttempt>(ownerId, "attempt", owner.latestAttemptId); if (old?.attempt.results.some(r => r.orderId.startsWith("demo_order_"))) delete owner.latestAttemptId; }
      await tx.put(ownerId, "session", id, initial); await tx.put(ownerId, "owner", ownerId, { ...owner, sessionId: id });
      return id;
    });
    return getView(ownerId, sessionId);
  }
  async function bootstrap(ownerId: string) {
    let owner = await getOwner(ownerId);
    let s = owner?.sessionId ? await read<{ mode: string; sessionId: string }>(ownerId, "session", owner.sessionId) : null;
    if (s && s.mode !== "live") { s = await startSession(ownerId, "live"); owner = await getOwner(ownerId); }
    const provider = options.provider(ownerId); let isConnected = false;
    try { isConnected = (await provider.readiness()).connected; } catch { /* Unconfigured OAuth storage is an unconnected state. */ } finally { await provider.close(); }
    return { sessionId: s?.sessionId || null, mode: s ? "live" as const : null, csrfToken: owner?.csrfToken || "", connected: isConnected, capabilities: { groq: !!process.env.GROQ_API_KEY, realtimeStt: !!process.env.ELEVENLABS_API_KEY?.trim(), tts: !!process.env.ELEVENLABS_API_KEY?.trim() } };
  }
  async function changeQuantity(ownerId: string, s: StoredSession, provider: ShoppingProvider, productId: string, quantity: number, expectedRevision?: number, turnVersion?: number) {
    await connected(provider); const addressId = address(s);
    const current = await session(ownerId, s.sessionId);
    if (turnVersion === undefined) idle(current); else if (current.turnVersion !== turnVersion || !current.active) throw new AppError("TURN_SUPERSEDED", "This request was stopped. Refresh your bag.", 409);
    if (expectedRevision !== undefined) revision(current, expectedRevision);
    const catalogProduct = current.products.find(p => p.id === productId);
    const cartProduct = current.cart.lines.find(l => l.product.id === productId)?.product;
    // A refreshed bag can carry newer stock and purchase limits than a search
    // result retained on screen. Keep catalog limits when the bag omits them.
    const product = cartProduct || catalogProduct;
    const maxQuantity = cartProduct?.maxQuantity ?? catalogProduct?.maxQuantity ?? 99;
    if (!product) throw new AppError("PRODUCT_UNAVAILABLE", "Choose an available pack from your current search or bag.", 422);
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99) throw new AppError("INVALID_QUANTITY", "Quantity must be between 0 and 99.", 400);
    const baseline = await provider.getCart(), baselineFingerprint = swiggyCartFingerprint(baseline);
    if (baselineFingerprint !== current.remoteFingerprint) { await saveCart(ownerId, s.sessionId, baseline); throw new AppError("CART_CHANGED", "Your Swiggy bag changed elsewhere. Refresh and check it before editing.", 409); }
    if (baseline.items.length && !swiggyCartAddressMatches(baseline, addressId)) throw new AppError("CART_ADDRESS_CHANGED", "Your existing Swiggy bag uses a different address. Select that saved address before editing this bag.", 409);
    // Check stock only after validating freshness: a newer search can show a
    // replenished pack while this session still holds its old unavailable bag.
    if (quantity > 0 && !product.available) throw new AppError("PRODUCT_UNAVAILABLE", "Choose an available pack from your current search or bag.", 422);
    if (quantity > maxQuantity) throw new AppError("QUANTITY_LIMIT", `Swiggy allows up to ${maxQuantity} of this pack.`, 422);
    const { skuId, spinId } = decodeSwiggyVariantId(productId);
    if ((baseline.items.find(l => l.skuId === skuId && l.spinId === spinId)?.quantity || 0) === quantity) return current.cart;
    const beforeDispatch = await session(ownerId, s.sessionId);
    if (turnVersion !== undefined && (beforeDispatch.turnVersion !== turnVersion || !beforeDispatch.active)) throw new AppError("TURN_SUPERSEDED", "This request was stopped.", 409);
    const result = await provider.setCartQuantity({ addressId, skuId, spinId, quantity, expectedFingerprint: baselineFingerprint });
    const saved = await saveCart(ownerId, s.sessionId, result);
    const actual = result.items.find(l => l.skuId === skuId && l.spinId === spinId)?.quantity || 0;
    if (actual !== quantity) throw new AppError("QUANTITY_CHANGED", "Swiggy changed the requested quantity or availability. Your refreshed bag shows what is available.", 409);
    return saved.cart;
  }
  async function updateCart(ownerId: string, input: { sessionId: string; productId: string; quantity: number; expectedCartRevision: number }) {
    return serial(ownerId, async () => { const s = await session(ownerId, input.sessionId), provider = options.provider(ownerId); try { await changeQuantity(ownerId, s, provider, input.productId, input.quantity, input.expectedCartRevision); return view(ownerId, await refresh(ownerId, s.sessionId, provider), provider); } finally { await provider.close(); } });
  }
  async function selectAddress(ownerId: string, sessionId: string, addressId: string) {
    return serial(ownerId, async () => { const provider = options.provider(ownerId); try {
      const s = await refresh(ownerId, sessionId, provider); idle(s);
      if (!s.addresses.some(a => a.id === addressId)) throw new AppError("INVALID_ADDRESS", "Choose a saved Swiggy address.", 422);
      if (s.cart.lines.length) {
        const remote = await provider.getCart();
        if (!swiggyCartAddressMatches(remote, addressId)) throw new AppError("CART_ADDRESS_CHANGED", "Your current bag belongs to another delivery address. Empty it before switching addresses, or change the delivery address in Swiggy and refresh.", 409);
      }
      await transaction(async tx => { const current = await owned(tx, ownerId, sessionId); if (current.addressId !== addressId) { current.addressId = addressId; current.products = []; delete current.search; delete current.searchOffset; current.paymentMethodId = null; current.cart.revision++; } await tx.put(ownerId, "session", sessionId, current); });
      return view(ownerId, await session(ownerId, sessionId), provider);
    } finally { await provider.close(); } });
  }
  async function selectPayment(ownerId: string, sessionId: string, paymentMethodId: string) {
    return serial(ownerId, async () => { const provider = options.provider(ownerId); try {
      const s = await refresh(ownerId, sessionId, provider); idle(s);
      if (!s.payments.some(p => p.id === paymentMethodId)) throw new AppError("INVALID_PAYMENT", "Choose a payment method returned for your current bag.", 422);
      await transaction(async tx => { const current = await owned(tx, ownerId, sessionId); current.paymentMethodId = paymentMethodId; await tx.put(ownerId, "session", sessionId, current); });
      return view(ownerId, await session(ownerId, sessionId), provider);
    } finally { await provider.close(); } });
  }
  function snapshot(s: StoredSession) { return { cart: s.cart, address: s.addresses.find(a => a.id === s.addressId), payment: s.payments.find(p => p.id === s.paymentMethodId) }; }
  async function createQuote(ownerId: string, sessionId: string, expectedCartRevision: number) {
    return serial(ownerId, async () => { const provider = options.provider(ownerId); try {
      await connected(provider); const s = await refresh(ownerId, sessionId, provider); idle(s); revision(s, expectedCartRevision);
      const { cart, address: delivery, payment } = snapshot(s);
      if (!cart.lines.length) throw new AppError("EMPTY_CART", "Add something to your Instamart bag first.", 422);
      if (!delivery || !payment) throw new AppError("CHECKOUT_SELECTION_REQUIRED", "Choose your delivery address and a current payment method first.", 422);
      const remote = await provider.getCart();
      if (!swiggyCartAddressMatches(remote, delivery.id) || swiggyCartFingerprint(remote) !== s.remoteFingerprint) throw new AppError("CART_CHANGED", "Your Swiggy bag or delivery address changed. Refresh before reviewing.", 409);
      const summary = `${cart.lines.map(l => `${l.quantity} × ${l.product.name} (${l.product.unit})`).join(", ")}. Deliver to ${delivery.reviewAddressText}. ${cart.bill?.lineItems.map(l => `${l.label}: ${l.value}`).join(", ") || ""}. Total ₹${(cart.totals.totalMinor / 100).toFixed(2)}. ${payment.label}.`;
      const quote = QuoteSchema.parse({ id: opaqueId("quote"), sessionId, cart, address: delivery, payment, expiresAt: new Date(Date.now() + 120_000).toISOString(), challenge: opaqueId("challenge"), summary });
      await write<StoredQuote>(ownerId, "quote", quote.id, { quote, fingerprint: fingerprint(snapshot(s)), remoteFingerprint: s.remoteFingerprint!, consumed: false }); return quote;
    } finally { await provider.close(); } });
  }
  async function confirmQuote(ownerId: string, quoteId: string, challenge: string, dispatch?: CheckoutDispatcher) {
    return serial(ownerId, async () => {
      const claim = await transaction(async tx => {
        const stored = await tx.get<StoredQuote>(ownerId, "quote", quoteId); if (!stored) throw new AppError("NOT_FOUND", "This checkout review could not be found.", 404);
        // Authenticate every confirmation, including retries of a claimed quote.
        if (!equalSecret(challenge, stored.quote.challenge)) throw new AppError("CONFIRMATION_REQUIRED", "Use the confirmation button on your current order review.", 403);
        const previous = await tx.get<StoredAttempt>(ownerId, "quote_attempt", quoteId); if (previous) return { existing: previous.attempt };
        if (stored.consumed) throw new AppError("CHECKOUT_UNRESOLVED", "This review was already submitted. Check the existing attempt.", 409);
        if (Date.parse(stored.quote.expiresAt) <= Date.now()) throw new AppError("QUOTE_EXPIRED", "This review expired. Review a fresh one.", 409);
        const s = await owned(tx, ownerId, stored.quote.sessionId); idle(s);
        if (fingerprint(snapshot(s)) !== stored.fingerprint) throw new AppError("QUOTE_CHANGED", "Your bag or choices changed. Review a fresh summary.", 409);
        const gate = await tx.get<{ attemptId: string }>(ownerId, "checkout_gate", "swiggy");
        if (gate) {
          // A UPI payment never made lapses on Swiggy's side within minutes; one older than the window no longer blocks new orders.
          const held = await tx.get<StoredAttempt & { createdAt?: string }>(ownerId, "attempt", gate.attemptId);
          if (held?.attempt.state === "payment_pending" && held.createdAt && Date.now() - Date.parse(held.createdAt) > UPI_WINDOW_MS) {
            await tx.put(ownerId, "attempt", gate.attemptId, { ...held, attempt: { ...held.attempt, state: "failed", message: UPI_LAPSED } });
            await tx.remove(ownerId, "checkout_gate", "swiggy");
          } else throw new AppError("CHECKOUT_UNRESOLVED", "A previous checkout is unresolved. Check it in Swiggy before placing another order.", 409);
        }
        const attempt: Attempt = { id: opaqueId("attempt"), state: "submitted", message: "Submitting your reviewed Instamart order.", results: [] };
        const record = { attempt, quoteId, createdAt: new Date().toISOString() };
        const owner = await tx.get<Owner>(ownerId, "owner", ownerId); if (!owner) throw new AppError("UNAUTHORIZED", "Refresh to continue.", 401);
        await tx.put(ownerId, "attempt", attempt.id, record); await tx.put(ownerId, "quote_attempt", quoteId, record); await tx.put(ownerId, "checkout_gate", "swiggy", { attemptId: attempt.id }); await tx.put(ownerId, "quote", quoteId, { ...stored, consumed: true }); await tx.put(ownerId, "owner", ownerId, { ...owner, latestAttemptId: attempt.id });
        return { stored, attempt };
      });
      if (claim.existing) return claim.existing;
      const { stored, attempt } = claim as { stored: StoredQuote; attempt: Attempt }; let result: Attempt;
      const provider = options.provider(ownerId);
      try { result = AttemptSchema.parse(dispatch ? await dispatch(stored.quote, attempt.id) : { id: attempt.id, ...await provider.checkout({ addressId: stored.quote.address.id, paymentMethodId: stored.quote.payment.id, expectedFingerprint: stored.remoteFingerprint }) }); if (result.id !== attempt.id) throw new Error("Attempt identity mismatch"); }
      catch (error) { result = error instanceof Error && "checkoutSubmitted" in error && error.checkoutSubmitted === false
        ? { ...attempt, state: "failed", message: error.message }
        : { ...attempt, state: "outcome_unknown", message: "The checkout result is unknown. Check this attempt in Swiggy. Do not submit the order again." }; }
      finally { await provider.close(); }
      await transaction(async tx => { const record = { attempt: result, quoteId, createdAt: new Date().toISOString() }; await tx.put(ownerId, "attempt", result.id, record); await tx.put(ownerId, "quote_attempt", quoteId, record); if (result.state === "complete" || result.state === "failed") await tx.remove(ownerId, "checkout_gate", "swiggy"); });
      return result;
    });
  }
  async function getAttempt(ownerId: string, attemptId: string) { const record = await read<StoredAttempt>(ownerId, "attempt", attemptId); if (!record) throw new AppError("NOT_FOUND", "This checkout attempt could not be found.", 404); return record.attempt; }
  async function getCurrentAttempt(ownerId: string): Promise<Attempt | null> {
    return transaction(async tx => { const gate = await tx.get<{ attemptId: string }>(ownerId, "checkout_gate", "swiggy"); const id = gate?.attemptId || (await tx.get<Owner>(ownerId, "owner", ownerId))?.latestAttemptId; if (!id) return null; const record = await tx.get<StoredAttempt>(ownerId, "attempt", id); if (!record && gate) throw new AppError("CHECKOUT_UNRESOLVED", "The stored checkout needs reconciliation. New orders remain blocked.", 409); return record?.attempt || null; });
  }
  // Server-only entry point: all products come from validated, address-bound MCP
  // searches. Keep every list item's variants available for later exact selection.
  async function rememberProducts(ownerId:string,sessionId:string,addressId:string,products:Product[]) {
    const trusted=ProductSchema.array().max(500).parse(products);
    return serial(ownerId,()=>transaction(async tx=>{
      const current=await owned(tx,ownerId,sessionId);idle(current);
      if(current.addressId!==addressId)throw new AppError("ADDRESS_CHANGED","Your delivery address changed. Search again for the new address.",409);
      const freshIds=new Set(trusted.map(product=>product.id));
      current.products=[...new Map(trusted.map(product=>[product.id,product])).values(),...current.products.filter(product=>!freshIds.has(product.id))].slice(0,500);
      // An assistant list is not the previous single-query catalog page.
      delete current.search;delete current.searchOffset;
      await tx.put(ownerId,"session",sessionId,current);
    }));
  }
  return { createOwner, getOwner, getView, bootstrap, startSession, updateCart, selectAddress, selectPayment, createQuote, confirmQuote, getAttempt, getCurrentAttempt, rememberProducts };
}
