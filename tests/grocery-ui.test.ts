import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductCard } from "../src/components/grocery-results";
import { CartSummary, type SwiggyCartSync } from "../src/components/cart";
import { AssistantViewSchema, MealOfferSchema } from "../src/lib/assistant-contracts";

function fixture() {
  const view = AssistantViewSchema.parse({ id: "grocery_ui", version: 1, task: {}, messages: [], questions: [], suggestions: [], offers: [], providers: [], status: "selected", notices: [], updatedAt: "2026-10-26T10:00:00Z" });
  const offer = MealOfferSchema.parse({ id: "milk", itemId: "dairy", provider: "instamart", providerItemId: "native_milk", name: "Milk", restaurant: null, unit: "500 ml", priceMinor: 2800, available: true, maxQuantity: 4 });
  view.offers.push(offer);
  view.task.items.push({ id: "selected_milk", label: "Milk", query: "milk", route: "instamart", quantity: 1, status: "selected", selectedOfferId: offer.id });
  return { view, offer };
}

test("an unavailable selected grocery can still be removed from its product card", () => {
  const { view, offer } = fixture();
  offer.available = false;
  const html = renderToStaticMarkup(createElement(ProductCard, { view, offer, busy: false, onAdd() {}, onQuantity() {} }));
  assert.match(html, /aria-label="Remove Milk"/);
  assert.doesNotMatch(html.match(/<button[^>]*aria-label="Remove Milk"[^>]*>/)?.[0] ?? "", /disabled/);
  assert.match(html.match(/<button[^>]*aria-label="Increase Milk"[^>]*>/)?.[0] ?? "", /disabled/);
});

test("a refreshed grocery card uses current availability, price and quantity limits", () => {
  const { view, offer } = fixture();
  const refreshed = { ...offer, id: "refreshed_milk", itemId: "refreshed_dairy", priceMinor: 3200, maxQuantity: 1, available: false };
  view.offers.push(refreshed);
  const html = renderToStaticMarkup(createElement(ProductCard, { view, offer: refreshed, busy: false, onAdd() {}, onQuantity() {} }));
  assert.match(html, /₹32/);
  assert.match(html, /is-unavailable/);
  assert.match(html.match(/<button[^>]*aria-label="Increase Milk"[^>]*>/)?.[0] ?? "", /disabled/);
  assert.match(html, /aria-label="Remove Milk"/);
});

test("grocery highlighting follows the saved cart identity across refreshed searches", () => {
  const { view, offer } = fixture();
  const refreshed = { ...offer, id: "new_milk", itemId: "new_dairy" };
  const render = (focusedId?: string | null) => renderToStaticMarkup(createElement(ProductCard, { view, offer: refreshed, focusedId, busy: false, onAdd() {}, onQuantity() {} }));
  assert.match(render(offer.id), /is-voice-target/);
  assert.match(render(offer.id), /data-voice-offer="milk"/);
  assert.doesNotMatch(render(), /is-voice-target/);
  assert.doesNotMatch(render("different_product"), /is-voice-target/);
});

test("the cart only claims groceries reached Swiggy after confirmed synchronization", () => {
  for (const state of [null, "syncing", "skipped", "conflict", "empty", "synced"] as const) {
    const { view } = fixture();
    const instamart: SwiggyCartSync | null = state ? { state, message: state === "skipped" ? "Connection unavailable" : null } : null;
    const html = renderToStaticMarkup(createElement(CartSummary, { view, busy: false, instamart, onQuantity() {}, onBrowse() {} }));
    if (state === "synced") assert.match(html, /Your items are already in your Swiggy Instamart bag/);
    else assert.doesNotMatch(html, /Your items are already in your Swiggy/);
  }
});
