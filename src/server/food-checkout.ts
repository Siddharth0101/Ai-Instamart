import type { AssistantView } from "../lib/assistant-contracts";
import { AttemptSchema, QuoteSchema, type Address, type Attempt, type Cart, type Quote } from "../lib/contracts";
import { FoodCheckoutSchema, type FoodCheckout } from "../lib/food-checkout-contracts";
import type { FoodCart, FoodOrderingGateway, FoodPaymentOption, FoodPlaceResult } from "./integrations/food-ordering-types";
import { decodeFoodOfferIdentity } from "./integrations/food";
import { equalSecret, fingerprint, opaqueId } from "./crypto";
import { AppError } from "./errors";
import { read, transaction, write } from "./store";
import type { Owner } from "./shopping";

type Provider = FoodOrderingGateway & { close(): Promise<void> };
type Record = { checkout: FoodCheckout; remote: FoodCart; selection: string; payment: FoodPaymentOption | null };
type Review = { quote: Quote; remoteFingerprint: string; selection: string; payment: FoodPaymentOption; consumed: boolean };
type PendingPayment = Extract<FoodPlaceResult, { state: "payment_pending" }>;
type Order = { attempt: Attempt; quoteId: string; createdAt: string; pending?: PendingPayment };

/** Only restaurant dishes belong to this checkout; Instamart groceries in the same cart are a separate order. */
const dishes = (view: AssistantView) => view.task.items.filter(i => i.selectedOfferId && view.offers.find(o => o.id === i.selectedOfferId)?.provider !== "instamart");
function selectionStamp(view: AssistantView, addressId: string) {
  return fingerprint({ addressId, items: dishes(view).map(i => ({ offer: i.selectedOfferId, quantity: i.quantity })).sort((a, b) => a.offer!.localeCompare(b.offer!)) });
}

/** Provider totals are authoritative. A missing price blocks checkout instead of becoming zero. */
export function foodCartView(remote: FoodCart, revision: number, unit: "rupees" | "paise" = "rupees"): Cart {
  const minor = (value: number | null) => {
    if (value === null || !Number.isFinite(value) || value < 0) throw new AppError("FOOD_BILL_UNAVAILABLE", "Swiggy has not returned a complete bill. Refresh your cart before checkout.", 422);
    return Math.round(value * (unit === "rupees" ? 100 : 1));
  };
  const itemsMinor = minor(remote.pricing.itemTotal), totalMinor = minor(remote.pricing.toPay);
  const feesMinor = minor(remote.pricing.deliveryCharge ?? 0) + minor(remote.pricing.taxesAndCharges ?? 0);
  const discountMinor = minor(remote.pricing.couponDiscount);
  const currency = (value: number) => `₹${(value / 100).toFixed(2)}`;
  return {
    revision,
    lines: remote.lines.map(line => ({ quantity: line.quantity, product: { id: line.menuItemId, name: line.name, brand: remote.restaurant?.name ?? "Swiggy Food", unit: [...line.variants, ...line.addons].join(", ").slice(0, 100) || "serving", priceMinor: Math.round(minor(line.total) / line.quantity), currency: "INR", available: line.inStock } })),
    totals: { itemsMinor, feesMinor, discountMinor, totalMinor, currency: "INR" },
    bill: { lineItems: [{ label: "Items", value: currency(itemsMinor) }, ...(remote.pricing.deliveryCharge !== null ? [{ label: "Delivery", value: currency(minor(remote.pricing.deliveryCharge)) }] : []), ...(remote.pricing.taxesAndCharges !== null ? [{ label: "Taxes and charges", value: currency(minor(remote.pricing.taxesAndCharges)) }] : []), ...(discountMinor ? [{ label: "Discount", value: `−${currency(discountMinor)}` }] : [])], toPay: { label: "Total to pay", value: remote.payableText ?? currency(totalMinor) } },
  };
}

export function createFoodCheckoutService(options: {
  provider(owner: string): Provider;
  address(owner: string): Promise<Address>;
  selection(owner: string): Promise<AssistantView>;
  priceUnit?: "rupees" | "paise";
}) {
  const queues = new Map<string, Promise<unknown>>();
  async function serial<T>(owner: string, work: () => Promise<T>) {
    const task = (queues.get(owner) ?? Promise.resolve()).catch(() => {}).then(work);
    queues.set(owner, task);
    try { return await task; } finally { if (queues.get(owner) === task) queues.delete(owner); }
  }
  async function withProvider<T>(owner: string, work: (provider: Provider) => Promise<T>) {
    const provider = options.provider(owner);
    try { return await work(provider); } finally { await provider.close(); }
  }
  async function owned(owner: string) {
    const value = await read<Record>(owner, "food_checkout", "current");
    if (!value) throw new AppError("FOOD_CART_REQUIRED", "Prepare your restaurant cart first.", 422);
    return value;
  }
  async function gate(owner: string) {
    const lock = await read<{ attemptId: string }>(owner, "checkout_gate", "swiggy_food");
    if (!lock) return;
    const order = await read<Order>(owner, "food_attempt", lock.attemptId);
    throw new AppError("CHECKOUT_UNRESOLVED", order?.attempt.state === "outcome_unknown"
      ? "Swiggy did not confirm the previous checkout. Open Order to check it, or reset it after verifying no order or payment exists in Swiggy."
      : "A restaurant order is awaiting payment or confirmation. Open Order to check its status before starting another order.", 409);
  }
  async function save(owner: string, provider: Provider, remote: FoodCart, address: Address, selection: string, previous?: Record | null) {
    if (remote.addressId !== address.id || !remote.restaurant || !remote.lines.length) throw new AppError("FOOD_CART_CHANGED", "The restaurant cart or delivery address changed. Prepare your choices again.", 409);
    if (remote.lines.some(l => !l.inStock)) throw new AppError("FOOD_UNAVAILABLE", "A dish is no longer available. Change your choices before checkout.", 422);
    const payments = await provider.getPaymentOptions({ addressId: address.id });
    const payment = payments.find(p => p.id === previous?.payment?.id) ?? null;
    const cart = foodCartView(remote, (previous?.checkout.cart.revision ?? 0) + (previous?.remote.fingerprint === remote.fingerprint ? 0 : 1), options.priceUnit);
    const checkout = FoodCheckoutSchema.parse({ cart, address, restaurant: remote.restaurant, payments: payments.map(p => ({ id: p.id, label: p.label })), paymentMethodId: payment?.id ?? null });
    const record = { checkout, remote, selection, payment };
    await write(owner, "food_checkout", "current", record);
    return record;
  }
  async function refresh(owner: string, provider: Provider) {
    const prior = await owned(owner), address = await options.address(owner);
    if (address.id !== prior.checkout.address.id) throw new AppError("FOOD_ADDRESS_CHANGED", "The address changed. Prepare your restaurant cart again.", 409);
    return save(owner, provider, await provider.getCart({ addressId: address.id, restaurantName: prior.checkout.restaurant.name, restaurantId: prior.checkout.restaurant.id }), address, prior.selection, prior);
  }
  /** Puts exactly the chosen dishes in the Swiggy app cart. `replaceExisting` is the customer's answer to "your Swiggy app cart has other dishes; replace them?". */
  async function fill(owner: string, provider: Provider, view: AssistantView, signal?: AbortSignal, replaceExisting = false) {
      await gate(owner);
      const address = await options.address(owner), selection = selectionStamp(view, address.id);
      const selected = dishes(view).map(item => ({ item, offer: view.offers.find(o => o.id === item.selectedOfferId) }));
      if (!selected.length) throw new AppError("EMPTY_CART", "Choose a restaurant dish first.", 422);
      if (selected.some(s => !s.offer || s.offer.provider !== "swiggy_food" || !s.offer.available || !s.offer.selectable)) throw new AppError("FOOD_SELECTION_INVALID", "Choose available dishes from one Swiggy restaurant. Instamart items use a separate checkout.", 422);
      const lines = selected.map(({ item, offer }) => ({ ...decodeFoodOfferIdentity(offer!.providerItemId), quantity: item.quantity }));
      if (new Set(lines.map(l => l.restaurantId)).size !== 1) throw new AppError("ONE_RESTAURANT_REQUIRED", "Swiggy accepts one restaurant per order. Remove the dishes from the other restaurant, then checkout.", 422);
      const items = [...new Set(lines.map(l => l.menuItemId))].map(menuItemId => ({ menuItemId, quantity: lines.filter(l => l.menuItemId === menuItemId).reduce((n, l) => n + l.quantity, 0) }));
      if (items.some(i => i.quantity < 1 || i.quantity > 99)) throw new AppError("INVALID_QUANTITY", "Choose between 1 and 99 of each dish.", 422);
      const prior = await read<Record>(owner, "food_checkout", "current");
      const restaurantId = lines[0].restaurantId, restaurantName = selected[0].offer!.restaurant ?? undefined;
      let baseline = await provider.getCart({ addressId: address.id, restaurantName, restaurantId });
      const sameItems = (cart: FoodCart) => cart.restaurant?.id === restaurantId && cart.lines.length === items.length && items.every(i => cart.lines.some(l => l.menuItemId === i.menuItemId && l.quantity === i.quantity));
      // A Swiggy cart still holding exactly what this app last put there is ours to change, also for another restaurant.
      const ours = !!prior && prior.remote.fingerprint === baseline.fingerprint;
      if (baseline.lines.length && !sameItems(baseline) && (!ours || baseline.restaurant?.id !== restaurantId)) {
        // Dishes the customer put in the Swiggy app themselves are never overwritten silently.
        if (!ours && !replaceExisting) throw new AppError("EXISTING_FOOD_CART", `Your Swiggy app cart already has ${baseline.itemCount} ${baseline.itemCount === 1 ? "item" : "items"} from ${baseline.restaurant?.name ?? "another restaurant"}. Replace them with this order?`, 409);
        await provider.clearCart({ signal });
        baseline = await provider.getCart({ addressId: address.id, restaurantName, restaurantId });
      }
      signal?.throwIfAborted();
      let remote = baseline;
      if (!sameItems(remote)) {
        try { remote = await provider.replaceCart({ restaurantId, restaurantName, addressId: address.id, items, signal }); }
        catch (error) { remote = await provider.getCart({ addressId: address.id, restaurantName, restaurantId }); if (!sameItems(remote)) throw error; }
      }
      if (!sameItems(remote)) throw new AppError("FOOD_CART_CHANGED", "Swiggy changed the dishes or quantities. Refresh your choices before checkout.", 409);
      const record = await save(owner, provider, remote, address, selection, prior);
      return record.checkout;
  }
  async function prepare(owner: string, view: AssistantView, signal?: AbortSignal, replaceExisting = false) {
    return serial(owner, () => withProvider(owner, provider => fill(owner, provider, view, signal, replaceExisting)));
  }
  /**
   * Keeps the Swiggy app cart in step with the dishes chosen here, as the Instamart bag does for groceries. With no dishes
   * left it empties the Swiggy cart, but only while that still holds what this app put there. Null: no dishes here.
   */
  async function sync(owner: string, signal?: AbortSignal, replaceExisting = false) {
    return serial(owner, async () => {
      // Read inside the queue, so the last sync always mirrors the latest choices.
      const view = await options.selection(owner), prior = await read<Record>(owner, "food_checkout", "current");
      if (!dishes(view).length) {
        if (!prior) return null;
        await gate(owner);
        await withProvider(owner, async provider => {
          const remote = await provider.getCart({ addressId: prior.checkout.address.id, restaurantName: prior.checkout.restaurant.name, restaurantId: prior.checkout.restaurant.id, signal });
          if (remote.lines.length && remote.fingerprint === prior.remote.fingerprint) await provider.clearCart({ signal });
        });
        await transaction(tx => tx.remove(owner, "food_checkout", "current"));
        return null;
      }
      // Local choices cannot prove the provider cart is still there: it may have
      // been cleared or edited in Swiggy since our last sync. Read it in fill
      // before reporting success, retaining the existing-cart conflict check.
      return withProvider(owner, provider => fill(owner, provider, view, signal, replaceExisting));
    });
  }
  const get =(owner: string) => serial(owner, () => withProvider(owner, async provider => (await refresh(owner, provider)).checkout));
  async function selectPayment(owner: string, paymentId: string) {
    return serial(owner, () => withProvider(owner, async provider => {
      await gate(owner);
      const record = await refresh(owner, provider), payments = await provider.getPaymentOptions({ addressId: record.checkout.address.id });
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) throw new AppError("INVALID_PAYMENT", "Choose a payment method available for this restaurant cart.", 422);
      record.payment = payment; record.checkout.paymentMethodId = payment.id;
      await write(owner, "food_checkout", "current", record);
      return record.checkout;
    }));
  }
  async function quote(owner: string) {
    return serial(owner, () => withProvider(owner, async provider => {
      await gate(owner);
      const record = await refresh(owner, provider);
      if (!record.payment) throw new AppError("PAYMENT_REQUIRED", `Choose a payment method: ${record.checkout.payments.map(p => p.label).join(", ") || "refresh Swiggy payment options"}.`, 422);
      if (selectionStamp(await options.selection(owner), record.checkout.address.id) !== record.selection) throw new AppError("FOOD_SELECTION_CHANGED", "Your choices changed. Prepare your restaurant cart again before reviewing.", 409);
      const q = QuoteSchema.parse({ id: opaqueId("food_quote"), sessionId: "swiggy_food", cart: record.checkout.cart, address: record.checkout.address, payment: { id: record.payment.id, label: record.payment.label }, expiresAt: new Date(Date.now() + 120_000).toISOString(), challenge: opaqueId("challenge"), summary: `${record.checkout.restaurant.name}. ${record.checkout.cart.lines.map(l => `${l.quantity} ${l.product.name}`).join(", ")}. Deliver to ${record.checkout.address.reviewAddressText}. Total ${record.checkout.cart.bill!.toPay.value}. ${record.payment.label}.` });
      const review: Review = { quote: q, remoteFingerprint: record.remote.fingerprint, selection: record.selection, payment: record.payment, consumed: false };
      await transaction(async tx => { await tx.put(owner, "food_quote", q.id, review); await tx.put(owner, "quote", q.id, review); });
      return q;
    }));
  }
  async function persistOrder(owner: string, order: Order) {
    await transaction(async tx => {
      await tx.put(owner, "food_attempt", order.attempt.id, order);
      await tx.put(owner, "attempt", order.attempt.id, order);
      await tx.put(owner, "food_quote_attempt", order.quoteId, order);
      const account = await tx.get<Owner>(owner, "owner", owner);
      if (account) await tx.put(owner, "owner", owner, { ...account, latestAttemptId: order.attempt.id });
      if (order.attempt.state === "complete" || order.attempt.state === "failed") await tx.remove(owner, "checkout_gate", "swiggy_food");
    });
    return order.attempt;
  }
  async function confirm(owner: string, quoteId: string, challenge: string) {
    return serial(owner, () => withProvider(owner, async provider => {
      const stored = await read<Review>(owner, "food_quote", quoteId);
      if (!stored) throw new AppError("NOT_FOUND", "This restaurant review could not be found.", 404);
      if (!equalSecret(stored.quote.challenge, challenge)) throw new AppError("CONFIRMATION_REQUIRED", "Use the current reviewed order to confirm.", 403);
      const existing = await read<Order>(owner, "food_quote_attempt", quoteId);
      if (existing) return existing.attempt;
      if (stored.consumed || Date.parse(stored.quote.expiresAt) <= Date.now()) throw new AppError("QUOTE_EXPIRED", "Review a fresh restaurant total before ordering.", 409);
      await gate(owner);
      const record = await refresh(owner, provider), selected = await options.selection(owner);
      if (record.remote.fingerprint !== stored.remoteFingerprint || record.payment?.id !== stored.payment.id || selectionStamp(selected, record.checkout.address.id) !== stored.selection) throw new AppError("QUOTE_CHANGED", "Your restaurant cart, address, or payment changed. Review the fresh total before ordering.", 409);
      const order: Order = { attempt: { id: opaqueId("food_attempt"), state: "submitted", message: "Submitting your approved restaurant order.", results: [] }, quoteId, createdAt: new Date().toISOString() };
      await transaction(async tx => {
        if (await tx.get(owner, "checkout_gate", "swiggy_food")) throw new AppError("CHECKOUT_UNRESOLVED", "Check your existing restaurant order before ordering again.", 409);
        const claimed = await tx.get<Review>(owner, "food_quote", quoteId);
        if (!claimed || claimed.consumed) throw new AppError("CHECKOUT_UNRESOLVED", "This restaurant review was already submitted.", 409);
        claimed.consumed = true;
        await tx.put(owner, "food_quote", quoteId, claimed); await tx.put(owner, "quote", quoteId, claimed);
        await tx.put(owner, "checkout_gate", "swiggy_food", { attemptId: order.attempt.id });
        await tx.put(owner, "food_quote_attempt", quoteId, order);
        await tx.put(owner, "food_attempt", order.attempt.id, order); await tx.put(owner, "attempt", order.attempt.id, order);
        const account = await tx.get<Owner>(owner, "owner", owner);
        if (account) await tx.put(owner, "owner", owner, { ...account, latestAttemptId: order.attempt.id });
      });
      try {
        const placed = await provider.placeOrder({ addressId: stored.quote.address.id, payment: stored.payment });
        const pay = placed.state === "payment_pending" ? { ...(placed.paymentUrl ? { paymentUrl: placed.paymentUrl } : {}), ...(placed.upiUrl ? { upiUrl: placed.upiUrl } : {}), payBy: new Date(Date.parse(order.createdAt) + placed.maxPollMs).toISOString() } : {};
        order.attempt = AttemptSchema.parse({ id: order.attempt.id, state: placed.state, message: placed.message, results: "orderId" in placed && placed.orderId ? [{ orderId: placed.orderId, state: placed.state, message: placed.message }] : [], ...pay });
        if (placed.state === "payment_pending") order.pending = placed;
      } catch { order.attempt.state = "outcome_unknown"; order.attempt.message = "Swiggy may have received this order. Check its status before attempting another order."; }
      return persistOrder(owner, order);
    }));
  }
  async function refreshAttempt(owner: string, id: string) {
    return serial(owner, () => withProvider(owner, async provider => {
      if (await read(owner, "food_checkout_reset", id)) throw new AppError("CHECKOUT_RESET", "This checkout was reset. Start a fresh checkout from your cart.", 409);
      const order = await read<Order>(owner, "food_attempt", id);
      if (!order) throw new AppError("NOT_FOUND", "This restaurant order could not be found.", 404);
      if (order.attempt.state === "complete" || order.attempt.state === "failed") return order.attempt;
      if (order.pending) {
        const status = await provider.checkPayment({ paasId: order.pending.paasId, ...order.pending.confirm });
        const expired = Date.now() >= Date.parse(order.createdAt) + order.pending.maxPollMs;
        if (status.failure) { order.attempt.state = "failed"; order.attempt.message = "The UPI payment failed, so Swiggy did not place this order. Choose a payment method to try again."; }
        else if (status.success) {
          const confirmed = status.confirmed ? { result: "success", orderId: status.orderId ?? order.pending.orderId } : await provider.confirmOrder(order.pending.confirm);
          if (confirmed.result === "success") { order.attempt.state = "complete"; order.attempt.message = `Your restaurant order ${confirmed.orderId} is confirmed.`; }
          else if (confirmed.result === "failed") { order.attempt.state = "failed"; order.attempt.message = "Swiggy could not confirm the order. Check payment or refund details in Swiggy."; }
        }
        // Swiggy's other end states (cancelled, cart changed, refund started) also mean the order was not placed.
        else if (status.terminal) { order.attempt.state = "failed"; order.attempt.message = /cancel/i.test(status.status) ? "Swiggy cancelled this payment, so the order was not placed." : /cart/i.test(status.status) ? "Your Swiggy cart changed before payment, so the order was not placed. Review the cart and try again." : /refund/i.test(status.status) ? "Swiggy has started a refund for this payment; the order was not placed." : `Swiggy ended this payment (${status.status}); the order was not placed.`; }
        // The payment window has closed with nothing paid: Swiggy asks for one confirm_order, which settles the order (and reconciles a late payment on its side).
        else if (expired) {
          const settled = await provider.confirmOrder(order.pending.confirm).catch(() => null);
          if (settled?.result === "success") { order.attempt.state = "complete"; order.attempt.message = `Your restaurant order ${settled.orderId} is confirmed.`; }
          else if (settled?.result === "failed") { order.attempt.state = "failed"; order.attempt.message = "The payment time ran out and Swiggy confirmed the order failed. You can try checkout again."; }
          else { order.attempt.state = "outcome_unknown"; order.attempt.message = "The payment window ended, but Swiggy has not confirmed the outcome. Check status again before another order."; }
        }
        if (order.attempt.state !== "payment_pending") { delete order.attempt.paymentUrl; delete order.attempt.upiUrl; delete order.attempt.payBy; }
      } else if (order.attempt.results[0]?.orderId) {
        const status = await provider.trackOrder({ orderId: order.attempt.results[0].orderId });
        order.attempt.message = status.message ?? `Order status: ${status.status}${status.etaText ? `. ${status.etaText}` : ""}.`;
      } else if (order.attempt.state === "outcome_unknown") {
        const review = await read<Review>(owner, "food_quote", order.quoteId);
        if (!review) throw new AppError("NOT_FOUND", "The previous checkout review is unavailable. Check your Swiggy orders before resetting it.", 409);
        const recent = await provider.recentOrders({ addressId: review.quote.address.id });
        // No order ID means history cannot be matched reliably. Show the actual
        // history instead of silently returning the same unresolved record.
        const latest = recent[0];
        order.attempt.message = `Swiggy returned no order ID for this checkout. ${latest ? `Latest Swiggy order: ${latest.restaurantName ?? "restaurant"}, ${latest.status}${latest.placedAt ? ` (${latest.placedAt})` : ""}.` : "Swiggy returned no recent orders."} Check your Swiggy orders and payments; if this checkout created neither, reset it to continue.`;
      }
      order.attempt.results = order.attempt.results.map(result => ({ ...result, state: order.attempt.state, message: order.attempt.message }));
      return persistOrder(owner, order);
    }));
  }
  async function resetUnconfirmed(owner: string, id: string) {
    return serial(owner, () => transaction(async tx => {
      const order = await tx.get<Order>(owner, "food_attempt", id);
      const lock = await tx.get<{ attemptId: string }>(owner, "checkout_gate", "swiggy_food");
      if (!order || lock?.attemptId !== id || order.attempt.state !== "outcome_unknown" || order.pending || order.attempt.results.length)
        throw new AppError("RESET_NOT_ALLOWED", "Only an unconfirmed checkout with no order or payment reference can be reset. Check the current order status.", 409);
      // Keep the ambiguous attempt for audit; resetting is not cancellation and
      // never reuses its consumed quote or submits another order.
      await tx.put(owner, "food_checkout_reset", id, { attemptId: id, resetAt: new Date().toISOString(), reason: "Customer verified no order or payment in Swiggy" });
      await tx.remove(owner, "checkout_gate", "swiggy_food");
      await tx.remove(owner, "food_checkout", "current");
      await tx.remove(owner, "assistant_context", "food_review");
      await tx.remove(owner, "assistant_context", "food_tracking");
      const account = await tx.get<Owner>(owner, "owner", owner);
      if (account?.latestAttemptId === id) await tx.put(owner, "owner", owner, { ...account, latestAttemptId: null });
    }));
  }
  return { prepare, sync, get, selectPayment, quote, confirm, refreshAttempt, resetUnconfirmed };
}
