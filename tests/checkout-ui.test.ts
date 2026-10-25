import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CheckoutPanel } from "../src/components/cart";
import { FoodCartResponseSchema, FoodPaymentOptionsSchema } from "../src/server/integrations/food-ordering-schemas";

test("checkout without a bill has loading feedback and a retry after failure", () => {
  const render = (busy: boolean) => renderToStaticMarkup(createElement(CheckoutPanel, {
    checkout: null, review: null, busy, onPayment: () => {}, onPlace: () => {}, onRefresh: () => {},
  }));
  assert.match(render(true), /Preparing your bill/);
  assert.doesNotMatch(render(true), />Get bill</);
  assert.match(render(false), /Your bill isn’t ready yet/);
  assert.match(render(false), />Get bill</);
  assert.doesNotMatch(render(false), /Preparing your bill/);
});

test("cart summaries do not weaken validation of payment methods or full payment responses", () => {
  assert.equal(FoodCartResponseSchema.safeParse({ addressId: "home", paymentOptions: { allMethods: [{ id: "Cash" }] } }).success, true);
  assert.equal(FoodCartResponseSchema.safeParse({ addressId: "home", paymentOptions: { allMethods: [{}] } }).success, false);
  assert.equal(FoodPaymentOptionsSchema.safeParse({ allMethods: [{ id: "Cash" }] }).success, false);
  assert.equal(FoodPaymentOptionsSchema.safeParse({ allMethods: [{ id: "Cash" }], placeOrderToolName: "checkout" }).success, false);
  assert.equal(FoodPaymentOptionsSchema.safeParse({ allMethods: [{ id: "Cash" }], placeOrderToolName: "place_food_order" }).success, true);
});
