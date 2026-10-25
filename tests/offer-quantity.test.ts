import { test } from "node:test";
import assert from "node:assert/strict";
import { offerQuantity } from "../src/lib/offer-quantity";

test("the offered quantity respects lower stock even when the plan requested more", () => {
  assert.equal(offerQuantity(10, 3), 3);
  assert.equal(offerQuantity(2, 3), 2);
  assert.equal(offerQuantity(3, 1), 1);
});

test("zero stock cannot become a positive selection", () => {
  assert.equal(offerQuantity(10, 0), null);
  assert.equal(offerQuantity(1, -1), null);
});

test("quantities remain valid for unbounded offers and incomplete local input", () => {
  assert.equal(offerQuantity(70), 70);
  assert.equal(offerQuantity(100), 99);
  assert.equal(offerQuantity(0), 1);
  assert.equal(offerQuantity(Number.NaN), 1);
  assert.equal(offerQuantity(2.9, 2), 2);
});
