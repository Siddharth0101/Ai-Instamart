"use client";

import type { AssistantView, MealOffer } from "@/lib/assistant-contracts";
import type { Address, Attempt, Quote } from "@/lib/contracts";
import type { FoodCheckout } from "@/lib/food-checkout-contracts";
import { useEffect, useMemo, useState } from "react";
import qrcode from "qrcode-generator";
import { offerQuantity } from "@/lib/offer-quantity";
import { onPhone, paymentsFor } from "@/lib/device";
import { Glyph, money } from "./assistant-ui";

type Line = { itemId: string; quantity: number; prepared: boolean; offer: MealOffer };
/** Saved dishes and packs, as cart lines. A plan item without a chosen offer is not in the cart. */
export function cartLines(view: AssistantView | null): Line[] {
  if (!view) return [];
  return view.task.items.flatMap(item => {
    const offer = view.offers.find(entry => entry.id === item.selectedOfferId);
    return offer ? [{ itemId: item.id, quantity: item.quantity, prepared: item.status === "added", offer }] : [];
  });
}
export function cartTotals(lines: Line[]) {
  return { count: lines.reduce((sum, line) => sum + line.quantity, 0), totalMinor: lines.reduce((sum, line) => sum + (line.offer.priceMinor ?? 0) * line.quantity, 0), unknownPrice: lines.some(line => line.offer.priceMinor === null) };
}
const groupName = (offer: MealOffer) => offer.provider === "instamart" ? "Instamart" : offer.restaurant ?? "Restaurant";
/** Where the cart's dishes or groceries stand in the customer's Swiggy app: on their way, there, or held back by what is already in it. */
export type SwiggyCartSync = { state: "syncing" | "synced" | "empty" | "conflict" | "skipped"; message: string | null };

export function CartSummary({ view, busy, swiggy = null, instamart = null, onQuantity, onPrepare, onBrowse, onCheckout, onReplaceSwiggy }: { view: AssistantView; busy: boolean; swiggy?: SwiggyCartSync | null; instamart?: SwiggyCartSync | null; onQuantity: (offer: MealOffer, quantity: number) => void; onPrepare: () => void; onBrowse: () => void; onCheckout: () => void; onReplaceSwiggy?: () => void }) {
  const lines = cartLines(view), totals = cartTotals(lines);
  // Dishes and groceries both reach the Swiggy app as soon as they are added: the Swiggy Food cart and the Instamart bag.
  const where = (line: Line) => {
    const sync = line.offer.provider === "instamart" ? instamart : swiggy, place = line.offer.provider === "instamart" ? "Instamart bag" : "Swiggy cart";
    return (sync?.state === "synced" || (!sync && line.prepared)) ? ` · in your ${place}` : sync?.state === "syncing" ? ` · adding to your ${place}…` : "";
  };
  if (!lines.length) return <div className="sc-cart-empty"><span aria-hidden="true"><Glyph name="bag" size={30}/></span><h3>Your cart is empty</h3><p>Just say what you’d like to eat, or open a restaurant and tap ADD.</p><button type="button" className="sc-button sc-button-primary" onClick={onBrowse}>Browse restaurants<Glyph name="arrow" size={16}/></button></div>;
  const groups = [...new Set(lines.map(line => groupName(line.offer)))];
  const food = lines.filter(line => line.offer.provider !== "instamart"), grocery = lines.filter(line => line.offer.provider === "instamart");
  const restaurants = [...new Set(food.map(line => line.offer.restaurant).filter((name): name is string => !!name))];
  return <div className="sc-cart">
    {groups.map(group => <section className="sc-cart-group" key={group} aria-label={group}>
      <h3>{group}</h3>
      <ul>{lines.filter(line => groupName(line.offer) === group).map(line => {
        const max = offerQuantity(99, line.offer.maxQuantity) ?? 99;
        return <li key={line.itemId} className="sc-cart-line">
          <div><strong>{line.offer.name}</strong><small>{line.offer.priceMinor === null ? "Price at checkout" : `${money(line.offer.priceMinor)} each`}{where(line)}</small></div>
          {line.prepared ? <span className="sc-cart-qty-static">{line.quantity}×</span> : <div className="sc-rb-quantity sc-rb-quantity-saved" role="group" aria-label={`Quantity for ${line.offer.name}`}><button type="button" disabled={busy} aria-label={line.quantity === 1 ? `Remove ${line.offer.name}` : `Decrease ${line.offer.name}`} onClick={() => onQuantity(line.offer, line.quantity - 1)}>−</button><output aria-live="polite">{line.quantity}</output><button type="button" disabled={busy || line.quantity >= max} aria-label={`Increase ${line.offer.name}`} onClick={() => onQuantity(line.offer, line.quantity + 1)}>+</button></div>}
          <b>{line.offer.priceMinor === null ? "—" : money(line.offer.priceMinor * line.quantity)}</b>
        </li>;
      })}</ul>
    </section>)}
    <div className="sc-cart-bill"><div><span>Item total</span><strong>{totals.unknownPrice ? `${money(totals.totalMinor)}+` : money(totals.totalMinor)}</strong></div><p>Delivery fee and taxes are added from Swiggy’s live bill at checkout.</p></div>
    {food.length > 0 && swiggy?.state === "conflict" && <div className="sc-replace-cart" role="alertdialog" aria-label="Replace your Swiggy cart?"><p>{swiggy.message}</p><div><button type="button" className="sc-button sc-button-primary" disabled={busy} onClick={onReplaceSwiggy}>Replace with these dishes</button></div></div>}
    {food.length > 0 && swiggy?.state === "skipped" && swiggy.message && restaurants.length <= 1 && <p className="sc-cart-note">{swiggy.message}</p>}
    {grocery.length > 0 && instamart?.state === "skipped" && instamart.message && <p className="sc-cart-note">{instamart.message}</p>}
    <div className="sc-cart-actions">
      {/* Each checkout reads its live Swiggy bill; groceries and dishes are separate orders. */}
      {grocery.length > 0 && <button type="button" className="sc-button sc-button-primary" disabled={busy} onClick={onPrepare}>{food.length ? "Checkout Instamart" : "Checkout"}<Glyph name="arrow" size={16}/></button>}
      {food.length > 0 && <button type="button" className={`sc-button ${grocery.length ? "sc-button-quiet" : "sc-button-primary"}`} disabled={busy || restaurants.length > 1} onClick={onCheckout}>{grocery.length ? "Checkout food" : "Checkout"}<Glyph name="arrow" size={16}/></button>}
      {restaurants.length > 1 ? <p className="sc-cart-note">Swiggy delivers from one restaurant per order. Remove the dishes from the other restaurant to check out.</p> : <p className="sc-cart-note">Or just say “checkout”. Nothing is ordered until you confirm the final total.</p>}
    </div>
  </div>;
}

export function AddressGate({ addresses, loading, busy, onChoose, onRefresh, groceries = false }: { addresses: Address[]; loading: boolean; busy: boolean; onChoose: (address: Address) => void; onRefresh: () => void; groceries?: boolean }) {
  // The spoken example uses the customer's own address names, which are often not “Home” or “Work”.
  const spoken = addresses.slice(0, 2).map(address => `“${address.label.split(" · ")[0]}”`).join(" or ");
  return <section className="sc-address-gate" aria-labelledby="sc-address-gate-title">
    <span className="sc-address-gate-icon" aria-hidden="true"><Glyph name="pin" size={22}/></span>
    <div>
      <h2 id="sc-address-gate-title">Where should we deliver?</h2>
      <p>{groceries ? "Instamart products, prices and delivery times depend on your address." : "Restaurants, menus and delivery times depend on your address."}{spoken && ` You can also just say ${spoken}, or its number.`}</p>
      {loading ? <p className="sc-address-loading" role="status"><span className="sc-spinner"/>Loading your saved addresses…</p>
        : addresses.length ? <div className="sc-address-options">{addresses.map((address, index) => <button type="button" key={address.id} disabled={busy} onClick={() => onChoose(address)}><span className="voice-item-number">{index + 1}</span><span><strong>{address.label}</strong><small>{address.reviewAddressText}</small></span><Glyph name="arrow" size={16}/></button>)}</div>
        : <div className="sc-address-none"><p>No saved address found in your Swiggy account. Add one in the Swiggy app, then refresh.</p><button type="button" className="sc-button sc-button-quiet" disabled={busy} onClick={onRefresh}><Glyph name="refresh" size={15}/>Refresh addresses</button></div>}
    </div>
  </section>;
}

export function AddressPicker({ addresses, selectedId, loading, busy, onChoose, onConnections }: { addresses: Address[]; selectedId: string | null; loading: boolean; busy: boolean; onChoose: (address: Address) => void; onConnections: () => void }) {
  return <div className="sc-address-picker">
    {loading ? <p className="sc-address-loading" role="status"><span className="sc-spinner"/>Loading your saved addresses…</p>
      : addresses.length ? <div className="sc-address-options">{addresses.map(address => <button type="button" key={address.id} aria-pressed={address.id === selectedId} disabled={busy} onClick={() => onChoose(address)}><Glyph name={address.id === selectedId ? "check" : "pin"} size={17}/><span><strong>{address.label}</strong><small>{address.reviewAddressText}</small></span></button>)}</div>
      : <p className="sc-address-none">No saved Swiggy Food address yet. Connect Swiggy Food and add an address in the Swiggy app.</p>}
    <button type="button" className="sc-link" onClick={onConnections}><Glyph name="link" size={14}/>Manage connections</button>
  </div>;
}

function useCountdown(until: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  // Restart from the real time whenever a new deadline arrives, or the first second shows time counted from when the sheet opened.
  useEffect(() => { if (!until) return; setNow(Date.now()); const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, [until]);
  return until ? Math.max(0, Math.round((Date.parse(until) - now) / 1000)) : 0;
}

/** Phone or computer, known only after the page is in the browser (so server and first render agree). */
function usePhone() {
  const [phone, setPhone] = useState(false);
  useEffect(() => setPhone(onPhone()), []);
  return phone;
}

/** The UPI link as a QR, drawn from the encoder's modules (no injected markup). */
function UpiQr({ value }: { value: string }) {
  const code = useMemo(() => {
    const qr = qrcode(0, "M"); qr.addData(value); qr.make();
    const size = qr.getModuleCount(), cells: string[] = [];
    for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) if (qr.isDark(row, col)) cells.push(`M${col} ${row}h1v1h-1z`);
    return { size, path: cells.join("") };
  }, [value]);
  return <svg className="sc-upi-qr" viewBox={`-3 -3 ${code.size + 6} ${code.size + 6}`} role="img" aria-label="UPI payment QR code" shapeRendering="crispEdges"><rect x={-3} y={-3} width={code.size + 6} height={code.size + 6} fill="#fff"/><path d={code.path} fill="#111"/></svg>;
}

/**
 * A UPI order waiting for payment. Swiggy sends nothing to the phone or the Swiggy app: the customer scans the QR
 * (computer) or opens the UPI app from the link (phone), or uses Swiggy's payment page. The order exists only once paid.
 */
function UpiPending({ attempt, busy, onRefresh }: { attempt: Attempt; busy: boolean; onRefresh: () => void }) {
  const phone = usePhone(), left = useCountdown(attempt.payBy);
  // Any UPI link works as a QR: scanned with the phone, it opens the UPI app.
  const qr = !phone && attempt.upiUrl ? attempt.upiUrl : null;
  const timeUp = !!attempt.payBy && left === 0;
  const how = phone ? (attempt.upiUrl ? "Tap Open UPI app, pay there, then come back here." : "Open the payment page to pay in your UPI app.")
    : qr ? "Scan this QR with PhonePe, Google Pay or any UPI app on your phone." : "Open the payment page and scan its QR with PhonePe or any UPI app on your phone.";
  return <div className="sc-order sc-order-payment_pending sc-upi-pay" role="status" aria-live="polite">
    <h3>Pay to place your order</h3>
    <p>Not placed yet. {how} Nothing is sent to your phone or the Swiggy app on its own.</p>
    {qr && <UpiQr value={qr}/>}
    <div className="sc-upi-actions">
      {phone && attempt.upiUrl && <a className="sc-button sc-button-primary" href={attempt.upiUrl}>Open UPI app<Glyph name="arrow" size={16}/></a>}
      {attempt.paymentUrl && <a className={`sc-button ${qr || (phone && attempt.upiUrl) ? "sc-button-quiet" : "sc-button-primary"}`} href={attempt.paymentUrl} target="_blank" rel="noreferrer">Open payment page<Glyph name="arrow" size={16}/></a>}
    </div>
    {!attempt.upiUrl && !attempt.paymentUrl && <p className="sc-cart-note">Swiggy sent no payment link for this order. Check its status; if it does not go through, order again with Cash on delivery.</p>}
    <p className="sc-cart-note">{timeUp ? "Payment time is up. Checking with Swiggy…" : attempt.payBy ? `Pay within ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}. ` : ""}{timeUp ? "" : <><span className="sc-spinner"/> Waiting for the payment, checking automatically…</>}</p>
    <button type="button" className="sc-link" disabled={busy} onClick={onRefresh}><Glyph name="refresh" size={14}/>Check status</button>
  </div>;
}

/** Live Swiggy bill → payment choice → the exact reviewed total, which only a tap or "confirm order" places. */
export function CheckoutPanel({ checkout, review, busy, onPayment, onPlace, onRefresh }: { checkout: FoodCheckout | null; review: { quote: Quote } | null; busy: boolean; onPayment: (id: string) => void; onPlace: (quoteId: string) => void; onRefresh: () => void }) {
  const left = useCountdown(review?.quote.expiresAt), phone = usePhone();
  if (!checkout) return <div className="sc-cart-empty"><span aria-hidden="true"><Glyph name="bag" size={30}/></span><h3>{busy ? "Preparing your bill…" : "Your bill isn’t ready yet"}</h3><p>{busy ? "Getting your live total and payment options from Swiggy." : "Try getting your bill again to continue to payment."}</p>{!busy && <button type="button" className="sc-button sc-button-primary" onClick={onRefresh}>Get bill<Glyph name="refresh" size={16}/></button>}</div>;
  const bill = (review?.quote.cart ?? checkout.cart);
  return <div className="sc-checkout">
    <section className="sc-checkout-where"><Glyph name="pin" size={18}/><div><strong>{checkout.restaurant.name} → {checkout.address.label}</strong><small>{checkout.address.reviewAddressText}</small></div></section>
    <ul className="sc-checkout-lines">{bill.lines.map(line => <li key={line.product.id}><span>{line.quantity}×</span><strong>{line.product.name}</strong><b>{money(line.product.priceMinor * line.quantity)}</b></li>)}</ul>
    <div className="sc-cart-bill">{(bill.bill?.lineItems ?? []).map((item, index) => <div className="sc-bill-row" key={index}><span>{item.label}</span><span>{item.value}</span></div>)}<div><span>To pay</span><strong>{bill.bill?.toPay.value ?? money(bill.totals.totalMinor)}</strong></div></div>
    <section className="sc-checkout-pay" aria-label="Payment method"><h3>Pay with</h3><div>{paymentsFor(checkout.payments, phone).map(payment => <button type="button" key={payment.id} aria-pressed={checkout.paymentMethodId === payment.id} disabled={busy} onClick={() => onPayment(payment.id)}>{checkout.paymentMethodId === payment.id && <Glyph name="check" size={15}/>}{payment.label}</button>)}</div>{!checkout.payments.length && <p className="sc-cart-note">Swiggy returned no payment methods. Refresh and try again.</p>}</section>
    {review && left > 0 ? <div className="sc-cart-actions"><button type="button" className="sc-button sc-button-primary" disabled={busy} onClick={() => onPlace(review.quote.id)}>Place order · {money(review.quote.cart.totals.totalMinor)}<Glyph name="check" size={16}/></button><p className="sc-cart-note">Or say “confirm order”. This total is held for {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}.</p></div>
      : <div className="sc-cart-actions"><p className="sc-cart-note">{review ? "This total expired. Choose the payment again for a fresh total." : "Choose how to pay to see your final total."}</p><button type="button" className="sc-link" disabled={busy} onClick={onRefresh}><Glyph name="refresh" size={14}/>Refresh bill</button></div>}
  </div>;
}

type OrderSummary = { restaurant: string; lines: { name: string; quantity: number }[]; totalMinor: number; payment: string; address: string; placedAt: string };
type Tracking = { status: string; stage: -1 | 0 | 1 | 2 | 3; etaText: string | null; message: string | null; terminal: boolean };
const stages = [{ label: "Order confirmed", icon: "check" }, { label: "Preparing", icon: "pot" }, { label: "On the way", icon: "bike" }, { label: "Delivered", icon: "home" }] as const;
const stageTitles = ["Order confirmed", "Preparing your food", "On the way to you", "Delivered"];
/** "On the way · 12 min" for the header, from Swiggy's latest status. */
export function orderChipLabel(tracking: Tracking | null, state: Attempt["state"] | undefined) {
  // Nothing waits to be "approved" anywhere: the customer scans the QR or opens the UPI app from the order sheet.
  if (state === "payment_pending") return "Pay to place order";
  if (state !== "complete") return "Order";
  if (!tracking) return "Order placed";
  if (tracking.stage === -1) return "Cancelled";
  const minutes = tracking.etaText?.match(/(\d+)\s*min/)?.[1];
  return `${stages[Math.max(0, tracking.stage)].label}${minutes && tracking.stage < 3 ? ` · ${minutes} min` : ""}`;
}

/** The order after placing it: a live delivery timeline, or the payment, failure or unknown state with a way forward. */
export function OrderPanel({ attempt, order, tracking, busy, onRefresh, onTrack, onReorder, onReset }: { attempt: Attempt | null; order: OrderSummary | null; tracking: Tracking | null; busy: boolean; onRefresh: () => void | Promise<unknown>; onTrack: () => void; onReorder: () => void; onReset?: () => void }) {
  const waiting = attempt?.state === "payment_pending" || attempt?.state === "submitted";
  // Restaurant orders have live Swiggy tracking; an Instamart order shows Instamart's own confirmation.
  const restaurant = attempt?.id.startsWith("food_attempt") ?? false;
  const placed = attempt?.state === "complete" && restaurant, finished = tracking?.terminal ?? false;
  // One status check at a time: Swiggy holds each check open for up to ~19 s, so the next starts 4 s after the last one answers.
  useEffect(() => {
    if (!waiting) return;
    let alive = true, timer = 0;
    const tick = async () => { await onRefresh(); if (alive) timer = window.setTimeout(tick, 4000); };
    timer = window.setTimeout(tick, 4000);
    return () => { alive = false; clearTimeout(timer); };
  }, [waiting, onRefresh]);
  // Live while the sheet is open: at once, then every 15 seconds until delivered or cancelled.
  useEffect(() => { if (!placed || finished) return; onTrack(); const id = setInterval(onTrack, 15_000); return () => clearInterval(id); }, [placed, finished, onTrack]);
  if (!attempt) return <div className="sc-cart-empty"><h3>No order yet</h3><p>Say “checkout” when your cart is ready.</p></div>;
  if (attempt.state === "complete" && !restaurant) return <div className="sc-order sc-order-complete" role="status" aria-live="polite">
    <span className="sc-order-icon" aria-hidden="true"><Glyph name="check" size={28}/></span>
    <h3>Instamart order placed</h3><p>{attempt.message.replace(/^Instamart order placed\.\s*/i, "") || "Placed with Instamart."}</p>
    {attempt.results[0]?.orderId && <small>Order {attempt.results[0].orderId}</small>}
    <p className="sc-cart-note">Track it in the Swiggy app. Say “get me more snacks” to keep shopping.</p>
  </div>;
  if (attempt.state === "payment_pending") return <UpiPending attempt={attempt} busy={busy} onRefresh={onRefresh}/>;
  if (!placed) {
    const title = attempt.state === "failed" ? "Order didn’t go through" : attempt.state === "outcome_unknown" ? "Checking your order" : "Placing your order…";
    return <div className={`sc-order sc-order-${attempt.state}`} role="status" aria-live="polite">
      <span className="sc-order-icon" aria-hidden="true"><Glyph name={attempt.state === "failed" ? "close" : "clock"} size={28}/></span>
      <h3>{title}</h3><p>{attempt.message}</p>
      {attempt.paymentUrl && <a className="sc-button sc-button-primary" href={attempt.paymentUrl} target="_blank" rel="noreferrer">Pay in app<Glyph name="arrow" size={16}/></a>}
      {waiting && <p className="sc-cart-note"><span className="sc-spinner"/> Checking automatically…</p>}
      <button type="button" className="sc-link" disabled={busy} onClick={onRefresh}><Glyph name="refresh" size={14}/>Check status</button>
      {restaurant && attempt.state === "outcome_unknown" && !attempt.results.length && onReset && <div className="sc-cart-actions"><p className="sc-cart-note">Check Orders and payments in Swiggy first. Reset only if this checkout created no order and you have not paid. Reset keeps your dishes and does not cancel a Swiggy order.</p><button type="button" className="sc-button sc-button-quiet" disabled={busy} onClick={onReset}>No order or payment in Swiggy — reset checkout</button></div>}
    </div>;
  }
  const stage = tracking?.stage ?? 0, cancelled = stage === -1;
  return <div className={`sc-track ${cancelled ? "is-cancelled" : ""}`}>
    <header className="sc-track-head" role="status" aria-live="polite">
      <span className="sc-track-icon" aria-hidden="true"><Glyph name={cancelled ? "close" : stages[stage].icon} size={26}/></span>
      <div><h3>{cancelled ? "Order cancelled" : stageTitles[stage]}</h3><p>{cancelled ? tracking?.message ?? "Swiggy cancelled this order." : stage === 3 ? tracking?.message ?? "Enjoy your meal!" : tracking?.etaText ? `Arriving in ${tracking.etaText.replace(/^about/i, "about")}` : "Getting the latest status from Swiggy…"}</p></div>
    </header>
    {!cancelled && <ol className="sc-track-steps" aria-label="Delivery progress">{stages.map((entry, index) => <li key={entry.label} className={index < stage ? "is-done" : index === stage ? "is-current" : ""} aria-current={index === stage ? "step" : undefined}><span aria-hidden="true"><Glyph name={entry.icon} size={16}/></span><small>{entry.label}</small></li>)}</ol>}
    {tracking?.message && stage > 0 && stage < 3 && <p className="sc-track-message">{tracking.message}</p>}
    {order && <section className="sc-track-summary" aria-label="What you ordered">
      <div className="sc-track-route"><strong>{order.restaurant}</strong><Glyph name="arrow" size={14}/><span>{order.address}</span></div>
      <ul>{order.lines.map(line => <li key={line.name}><span>{line.quantity}×</span>{line.name}</li>)}</ul>
      <div className="sc-track-paid"><span>{order.payment}</span><strong>{money(order.totalMinor)}</strong></div>
      {attempt.results[0]?.orderId && <small>Order {attempt.results[0].orderId}</small>}
    </section>}
    <div className="sc-track-actions">
      {(finished || cancelled) && order ? <button type="button" className="sc-button sc-button-primary" disabled={busy} onClick={onReorder}><Glyph name="repeat" size={16}/>Order this again</button>
        : <button type="button" className="sc-link" disabled={busy} onClick={onTrack}><Glyph name="refresh" size={14}/>Refresh status</button>}
      <p className="sc-cart-note">{finished || cancelled ? "Or say “order it again”." : "Updates on its own. You can also ask “where is my order?”"}</p>
    </div>
  </div>;
}
