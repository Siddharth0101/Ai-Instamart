import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RestaurantBrowser } from "../src/components/restaurant-browser";
import { AssistantViewSchema, type AssistantView } from "../src/lib/assistant-contracts";

function fixture(menu = false): AssistantView {
  const restaurant = {
    id: "restaurant_opaque", provider: "swiggy_food", name: "Kitchen & Co", cuisines: ["North Indian", "Biryani"],
    rating: null, etaMinutes: null, costForTwo: null, area: "Indiranagar", isOpen: true,
  };
  return AssistantViewSchema.parse({
    id: "ui_owner", version: 3, messages: [], task: {}, questions: [], suggestions: [], offers: [],
    providers: [
      { id: "swiggy_food", name: "Swiggy Food", status: "connected", message: "Connected" },
      { id: "zomato", name: "Zomato", status: "access_required", message: "Approved custom-app access is required." },
    ],
    restaurantBrowser: {
      itemId: "biryani", restaurants: [restaurant], selectedRestaurantId: menu ? restaurant.id : null, hasMore: true,
      menu: menu ? {
        restaurantId: restaurant.id, restaurant, hasMore: false, notices: ["Customizations must be confirmed with the restaurant."],
        sections: [{ id: "mains", title: "Main course", hasMoreItems: true, totalItems: 18, items: [{
          id: "menu_offer", itemId: "biryani", provider: "swiggy_food", providerItemId: "native_dish_1", name: "Vegetable Biryani",
          restaurant: "Kitchen & Co", unit: "serving", priceMinor: null, available: true, maxQuantity: 4,
          description: "Aromatic rice with vegetables.",
        }] }],
      } : null,
    },
    status: "needs_choice", notices: [], updatedAt: "2026-10-23T10:00:00Z",
  });
}

function render(view: AssistantView) {
  return renderToStaticMarkup(createElement(RestaurantBrowser, {
    view, busy: false,
    onRestaurant: () => {}, onBack: () => {}, onMoreRestaurants: () => {}, onMoreMenu: () => {}, onAdd: () => {}, onConnect: () => {},
  }));
}

function addButton(html: string): string {
  const button = html.match(/<button\b[^>]*class="sc-rb-add[^\"]*"[^>]*>[\s\S]*?<\/button>/)?.[0];
  assert.ok(button, "Menu item must have an ADD control");
  return button;
}

test("restaurant directory exposes a real clickable menu without invented rating, price, or delivery estimates", () => {
  const html = render(fixture());
  assert.match(html, /aria-label="Open Kitchen &amp; Co menu"/);
  assert.match(html, /North Indian, Biryani/);
  assert.match(html, /Indiranagar/);
  assert.doesNotMatch(html, /sc-rb-rating|₹0|\d+ min|for two/);
  assert.doesNotMatch(html, /Vegetable Biryani/);
  assert.match(html, /What’s on your mind\?/);
  assert.match(html, /aria-label="Quick filters"/);
  assert.doesNotMatch(html, /Choose a food app/, "the unavailable Zomato toggle is gone");
});

test("menu exposes sections and honest price, preview, and customization limits", () => {
  const html = render(fixture(true));
  assert.match(html, /aria-label="Kitchen &amp; Co menu"/);
  assert.match(html, /Main course/);
  assert.match(html, /Vegetable Biryani/);
  assert.match(html, /Price confirmed by restaurant/);
  assert.match(html, /Showing 1 of 18 dishes in Main course/);
  assert.match(html, /Customizations must be confirmed/);
  assert.doesNotMatch(addButton(html), /disabled/);
  assert.doesNotMatch(html, /₹0|Added to bag|allergen-free/);
});

test("closed and unconfirmed restaurants remain browsable but cannot add dishes to a plan", () => {
  for (const isOpen of [false, null]) {
    const view = fixture(true);
    view.restaurantBrowser!.menu!.restaurant.isOpen = isOpen;
    const html = render(view);
    assert.match(html, /Vegetable Biryani/);
    assert.match(addButton(html), /disabled/);
    assert.match(html, isOpen === false ? /Restaurant currently closed/ : /Restaurant availability not confirmed/);
  }
});

test("menu quantity comes from the saved native dish and keeps removal available when stock disappears", () => {
  const view = fixture(true);
  const offer = view.restaurantBrowser!.menu!.sections[0].items[0];
  view.offers.push({ ...offer, id: "saved_offer", itemId: "saved_item" });
  view.task.items.push({ id: "saved_item", label: offer.name, query: offer.name, quantity: 3, route: "restaurant", status: "selected", selectedOfferId: "saved_offer" });
  offer.available = false;
  const html = render(view);
  assert.match(html, /aria-label="Vegetable Biryani quantity">3<\/output>/);
  const remove = html.match(/<button\b[^>]*aria-label="Remove Vegetable Biryani from cart"[^>]*>/)?.[0];
  assert.ok(remove);
  assert.doesNotMatch(remove, /disabled/);
  assert.match(html.match(/<button\b[^>]*aria-label="Increase Vegetable Biryani quantity"[^>]*>/)?.[0] ?? "", /disabled/);
});

test("a prepared dish is locked and points to the bag instead of enabling a duplicate add", () => {
  const view = fixture(true);
  const offer = view.restaurantBrowser!.menu!.sections[0].items[0];
  view.offers.push({ ...offer, id: "saved_offer", itemId: "saved_item" });
  view.task.items.push({ id: "saved_item", label: offer.name, query: offer.name, quantity: 2, route: "restaurant", status: "added", selectedOfferId: "saved_offer" });
  const html = render(view);
  assert.match(html, /In your bag — edit it there/);
  assert.match(addButton(html), /disabled/);
  assert.doesNotMatch(html, /Remove Vegetable Biryani/);
});

test("Zomato access requirements render without borrowing another provider's menu", () => {
  const view = fixture();
  view.restaurantBrowser!.restaurants = [];
  view.restaurantBrowser!.restaurants.push({ id: "zomato_unavailable", provider: "zomato", name: "Unavailable placeholder", cuisines: [], rating: null, etaMinutes: null, costForTwo: null, area: null, isOpen: null, distanceKm: null });
  const html = render(view);
  assert.match(html, /Zomato needs developer access/);
  assert.match(html, /https:\/\/forms.eternal.com\/form\/ja8hap2tpm\//);
  assert.doesNotMatch(html, /sc-rb-place-copy|Unavailable placeholder|Vegetable Biryani|Live availability/);
  assert.doesNotMatch(html, />Connect Zomato</);
});
