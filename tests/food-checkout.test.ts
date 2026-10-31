import { after, test } from "node:test";
import assert from "node:assert/strict";
import { AssistantViewSchema } from "../src/lib/assistant-contracts";
import { createFoodCheckoutService } from "../src/server/food-checkout";
import { foodOfferIdentity } from "../src/server/integrations/food";
import { fixtureOrdering, seedFixtureFoodCart } from "../src/server/integrations/food-fixture";
import { opaqueId } from "../src/server/crypto";
import { database } from "../src/server/store";

process.env.DATA_DIR = "memory://";

function fixture(customization: "addons" | "variants" | null = null) {
  const owner = opaqueId("food-checkout-test"), address = { id: "fixture-home", label: "Home", reviewAddressText: "Synthetic test address" };
  const identity = foodOfferIdentity({ restaurant_id: "fixture-1", menu_item_id: "0-0" })!;
  const view = AssistantViewSchema.parse({
    id: owner, version: 1, messages: [], task: { items: [{ id: "dish", label: "Chicken Boneless Biryani", query: "biryani", quantity: 1, route: "restaurant", selectedOfferId: identity.id }] },
    questions: [], suggestions: [], offers: [{ ...identity, itemId: "dish", provider: "swiggy_food", name: "Chicken Boneless Biryani", restaurant: "Meghana Foods", unit: "serving", priceMinor: 36000, available: true, selectable: true }],
    providers: [], status: "selected", notices: [], updatedAt: new Date().toISOString(),
  });
  seedFixtureFoodCart(owner, 0, address.id, [{ menuItemId: "0-0", quantity: 1 }]);
  let extra = customization;
  const calls = { clear: 0, replace: 0 };
  const service = createFoodCheckoutService({
    address: async () => address, selection: async () => view,
    provider: () => {
      const provider = fixtureOrdering(owner);
      const getCart: typeof provider.getCart = async input => {
        const cart = await provider.getCart(input);
        if (extra) {
          cart.lines = cart.lines.map(line => ({ ...line, [extra!]: [extra === "addons" ? "Extra cheese" : "Family size"] }));
          cart.fingerprint = `${cart.fingerprint}:${extra}`;
        }
        return cart;
      };
      return {
        ...provider, getCart,
        async clearCart(input) { calls.clear++; extra = null; await provider.clearCart(input); },
        async replaceCart(input) { calls.replace++; await provider.replaceCart(input); return getCart(input); },
      };
    },
  });
  return { owner, service, calls, customize: (value: typeof customization) => { extra = value; } };
}

test("an identical plain Food cart is retained without a provider mutation", async () => {
  const f = fixture();
  const checkout = await f.service.sync(f.owner);
  assert.equal(checkout?.cart.lines.length, 1);
  assert.deepEqual(f.calls, { clear: 0, replace: 0 });
});

test("matching dish IDs and quantities do not silently adopt preexisting customizations", async () => {
  for (const customization of ["addons", "variants"] as const) {
    const f = fixture(customization);
    await assert.rejects(f.service.sync(f.owner), { code: "EXISTING_FOOD_CART" });
    assert.deepEqual(f.calls, { clear: 0, replace: 0 });
    const checkout = await f.service.sync(f.owner, undefined, true);
    assert.equal(checkout?.cart.lines[0].product.unit, "serving");
    assert.deepEqual(f.calls, { clear: 1, replace: 1 });
  }
});

test("customizations added in Swiggy after synchronization require replacement consent", async () => {
  const f = fixture();
  await f.service.sync(f.owner);
  f.customize("addons");
  await assert.rejects(f.service.sync(f.owner), { code: "EXISTING_FOOD_CART" });
  assert.deepEqual(f.calls, { clear: 0, replace: 0 });
});

after(async () => { await (await database()).close(); });
