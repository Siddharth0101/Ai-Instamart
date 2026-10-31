import assert from "node:assert/strict";
import test from "node:test";
import { AssistantViewSchema } from "../src/lib/assistant-contracts";
import { deliveryContext } from "../src/lib/delivery-context";

const home = { id: "im-home", label: "Home", reviewAddressText: "Synthetic home" };
const work = { id: "food-work", label: "Work", reviewAddressText: "Synthetic office" };
const view = () => AssistantViewSchema.parse({ id: "delivery", version: 1, task: { discovery: { kind: "snacks", mealPeriod: "lunch", periodSource: "explicit", stage: "categories", categoryId: null, itemId: null } }, messages: [], questions: [], suggestions: [], offers: [], providers: [{ id: "swiggy_food", name: "Food", status: "connected", message: "Fixture" }, { id: "instamart", name: "Instamart", status: "connected", message: "Fixture" }], status: "ready", notices: [], updatedAt: "2026-10-26T10:00:00Z" });

test("grocery header and picker use the actual bag address when Food points elsewhere", () => {
  const result = deliveryContext(view(), { addresses: [home], addressId: home.id }, [work], work.id);
  assert.equal(result.instamart, true);
  assert.equal(result.selected, home);
  assert.equal(result.selectedId, home.id);
  assert.deepEqual(result.addresses, [home]);
});

test("unselected groceries never borrow a Food address, while Food uses its own address", () => {
  const groceries = view();
  assert.equal(deliveryContext(groceries, { addresses: [home], addressId: null }, [work], work.id).selected, null);
  groceries.task.discovery = null;
  const food = deliveryContext(groceries, { addresses: [home], addressId: home.id }, [work], work.id);
  assert.equal(food.instamart, false);
  assert.equal(food.selected, work);
  assert.deepEqual(food.addresses, [work]);
});
