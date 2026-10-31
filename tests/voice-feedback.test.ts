import { test } from "node:test";
import assert from "node:assert/strict";
import { AssistantViewSchema, MealOfferSchema, RestaurantCardSchema, type AssistantView } from "../src/lib/assistant-contracts";
import { cartChanges, describeChanges, undoable, voiceHints } from "../src/lib/voice-feedback";

const dish = (id: string, name: string) => MealOfferSchema.parse({ id, itemId: "menu", provider: "swiggy_food", providerItemId: `native-${id}`, name, restaurant: "Meghana Foods", unit: "serving", priceMinor: 36000, available: true });
const biryani = dish("a", "Chicken Boneless Biryani"), paneer = dish("b", "Paneer Biryani"), veg = dish("c", "Veg Biryani");
const card = RestaurantCardSchema.parse({ id: "r1", provider: "swiggy_food", name: "Meghana Foods", isOpen: true });
function view(cart: Array<[typeof biryani, number]>, menu = true): AssistantView {
  return AssistantViewSchema.parse({
    id: "v", version: 1, messages: [], questions: [], suggestions: [], providers: [], status: "selected", proposal: null, presentation: null, browsePages: [], notices: [], updatedAt: new Date(0).toISOString(),
    task: { items: cart.map(([offer, quantity], index) => ({ id: `i${index}`, label: offer.name, query: offer.name, quantity, route: "restaurant", status: "selected", selectedOfferId: offer.id })) },
    offers: [biryani, paneer, veg],
    restaurantBrowser: { itemId: "menu", provider: "swiggy_food", restaurants: [card], hasMore: false, selectedRestaurantId: menu ? "r1" : null,
      menu: menu ? { restaurantId: "r1", restaurant: card, sections: [{ id: "s", title: "Biryani", items: [biryani, paneer, veg], hasMoreItems: false, totalItems: 3 }], hasMore: false, notices: [] } : null, notices: [] },
  });
}

test("cart changes read as one short line and can be undone while the dishes are reachable", () => {
  const added = cartChanges(view([]), view([[biryani, 2]]));
  assert.equal(describeChanges(added), "Added 2× Chicken Boneless Biryani");
  assert.equal(describeChanges(cartChanges(view([[paneer, 1]]), view([[paneer, 3]]))), "Paneer Biryani: 1 → 3");
  assert.equal(describeChanges(cartChanges(view([[veg, 1]]), view([]))), "Removed Veg Biryani");
  assert.equal(describeChanges(cartChanges(view([[veg, 1]]), view([[biryani, 2], [paneer, 1]]))), "Added 2 items, removed 1");
  assert.deepEqual(cartChanges(view([[biryani, 2]]), view([[biryani, 2]])), []);
  assert.equal(undoable(added), true);
  assert.equal(undoable(cartChanges(view([[veg, 1]], false), view([], false))), false, "a removed dish cannot come back once its menu is closed");
});

test("hints follow the screen: address, menu, cart, checkout and review", () => {
  const base = { addressAsked: false, checkoutOpen: false, reviewReady: false, orderActive: false, savedAddresses: ["Home", "Work"] };
  assert.deepEqual(voiceHints({ ...base, view: null, addressAsked: true }), ["Home", "Deliver to Work"]);
  assert.deepEqual(voiceHints({ ...base, view: view([]) }), ["Add two Chicken Boneless Biryani", "What's popular here?", "Back to restaurants"]);
  assert.ok(voiceHints({ ...base, view: view([[paneer, 1]]) }).includes("Show my cart"));
  assert.deepEqual(voiceHints({ ...base, view: view([], false) }), ["Open Meghana Foods", "Top rated first", "Show pizza places"]);
  assert.deepEqual(voiceHints({ ...base, view: view([[paneer, 1]]), checkoutOpen: true }), ["Pay with cash", "Use PhonePe"]);
  assert.deepEqual(voiceHints({ ...base, view: view([[paneer, 1]]), checkoutOpen: true, reviewReady: true }), ["Confirm order", "Change payment"]);
});
