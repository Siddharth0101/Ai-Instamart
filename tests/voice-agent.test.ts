import { after, test } from "node:test";
import assert from "node:assert/strict";
import { generateText } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { assistant, foodAddresses, selectFoodAddress } from "../src/server/assistant-service";
import { getOwner, getView } from "../src/server/service";
import { GROCERY_RAILS } from "../src/lib/grocery-catalog";
import { opaqueId } from "../src/server/crypto";
import { database, read, write } from "../src/server/store";
import { ModelBusyError, greet, inLanguage, replyLanguage, replyMatches, resilientModel, runVoiceTurn, tidy } from "../src/server/voice-agent";
import { matchSpoken, resolveAddressAnswer, spokenNumber, spokenQuantityFor } from "../src/lib/spoken-match";
import { endFixturePayment, seedFixtureFoodCart } from "../src/server/integrations/food-fixture";
import { foodState, refreshFoodOrder, resetFoodOrder, startFoodCheckout, chooseFoodPayment, syncFoodCart, trackFoodOrder, trackingStage } from "../src/server/food-flow";
import { foodCheckout, foodOrdering } from "../src/server/assistant-service";
import { activeCheckout, prepareInstamartBag, setActiveCheckout, syncInstamart } from "../src/server/instamart-flow";
import { instamartFixture } from "../src/server/integrations/instamart-fixture";
import { decodeSwiggyVariantId, swiggyCartFingerprint } from "../src/server/integrations/swiggy";
import { paymentsFor } from "../src/lib/device";

/** Voice checkout and payment are off for now (customers pay in the Swiggy app); these return when it is back. */
const checkoutPaused = "voice checkout is paused: customers pay in the Swiggy app";

// Real tools, real store, the development Swiggy fixture; only the model's choices are scripted.
process.env.DATA_DIR = "memory://";
process.env.SAYCART_FIXTURE = "1";

type ToolResult = { ok: boolean; outcome?: unknown; error?: string };
type Step = { call: string; input?: Record<string, unknown> } | { say: string | ((results: ToolResult[]) => string) };
const usage = { inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 5, text: 5, reasoning: undefined } };
/** What the tools handed back to the model during this turn, in order. */
const toolResults = (prompt: unknown): ToolResult[] => (prompt as Array<{ role: string; content: unknown }>).flatMap(message => message.role === "tool" ? (message.content as Array<{ output: { value: ToolResult } }>).map(part => part.output.value) : []);
/** One tool call per step, as the live agent runs (parallel tool calls are off). */
function scripted(steps: Step[]) {
  let calls = 0;
  const model = new MockLanguageModelV4({ doGenerate: async options => {
    const step = steps[calls++];
    if (!step) throw new Error("The script ran out of steps.");
    if ("call" in step) return { content: [{ type: "tool-call", toolCallId: `call-${calls}`, toolName: step.call, input: JSON.stringify(step.input ?? {}) }], finishReason: { unified: "tool-calls", raw: undefined }, usage, warnings: [] };
    return { content: [{ type: "text", text: typeof step.say === "function" ? step.say(toolResults(options.prompt)) : step.say }], finishReason: { unified: "stop", raw: undefined }, usage, warnings: [] };
  } });
  return { model, used: () => calls };
}
const text = (value: string): Step => ({ say: value });

async function customer() {
  const owner = opaqueId(`voice-agent-${Math.random()}`);
  await write(owner, "owner", owner, { csrfToken: "test", sessionId: null });
  return Object.assign(async (said: string, steps: Step[]) => {
    const view = await assistant.get(owner), script = scripted(steps);
    const result = await runVoiceTurn(owner, { text: said, expectedVersion: view.version }, undefined, { model: script.model });
    assert.equal(script.used(), steps.length, `"${said}" used every scripted step`);
    return result;
  }, { owner });
}
const cartLines = (view: Awaited<ReturnType<typeof assistant.get>>) => view.task.items.filter(item => item.selectedOfferId).map(item => `${item.quantity}× ${item.label}`);

async function readyToCheckout() {
  const say = await customer();
  const home = await say("ghar pe deliver karo", [{ call: "set_delivery_address", input: { address: "ghar" } }, text("Ghar pe deliver karenge.")]);
  assert.equal(home.reply.text, "Ghar pe deliver karenge.");
  assert.ok(home.view.restaurantBrowser?.restaurants.length, "choosing the address lists nearby restaurants");
  const added = await say("Meghana kholo aur do chicken biryani daal do", [
    { call: "open_restaurant", input: { restaurant: "Meghana" } },
    { call: "update_cart", input: { changes: [{ item: "chicken biryani", action: "add", quantity: 2 }] } },
    text("Do Chicken Boneless Biryani add ho gayi."),
  ]);
  assert.equal(added.view.restaurantBrowser?.menu?.restaurant.name, "Meghana Foods");
  assert.equal(added.view.task.items.find(item => item.selectedOfferId)?.quantity, 2);
  return say;
}
/** Checkout and payment in one turn; the reply states the reviewed total, as the live agent is told to. */
async function review(say: Awaited<ReturnType<typeof customer>>, said = "checkout karo, cash on delivery") {
  let total = "";
  const result = await say(said, [{ call: "checkout" }, { call: "choose_payment", input: { method: "cash" } },
    { say: results => { total = String((results[1].outcome as { total: string }).total); return `Total ${total} hai, cash on delivery. Confirm karein?`; } }]);
  assert.match(total, /^₹[\d,]+/);
  assert.ok(result.food.review, "the total is reviewed and waiting");
  return result;
}

test("paused voice checkout exposes no payment or order tools and preserves the cart for the Swiggy app", async () => {
  const say = await readyToCheckout();
  const before = await assistant.get(say.owner);
  const model = new MockLanguageModelV4({ doGenerate: async options => {
    const tools = options.tools?.flatMap(entry => entry.type === "function" ? [entry] : []) ?? [];
    const names = tools.map(entry => entry.name);
    for (const paused of ["checkout", "choose_payment", "place_order"]) assert.ok(!names.includes(paused), `${paused} must not be callable`);
    assert.ok(names.includes("update_cart"), "shopping remains available");
    const panel = tools.find(entry => entry.name === "show_panel");
    assert.ok(panel);
    assert.doesNotMatch(JSON.stringify(panel.inputSchema), /"checkout"|"review"/, "panels cannot reopen the paused checkout");
    return { content: [{ type: "text", text: "Your items are saved in the Swiggy app. You can pay there." }], finishReason: { unified: "stop", raw: undefined }, usage, warnings: [] };
  } });
  const result = await runVoiceTurn(say.owner, { text: "Checkout with cash and place my order", expectedVersion: before.version }, undefined, { model });
  assert.deepEqual(cartLines(result.view), cartLines(before));
  assert.equal(result.food.review, null);
  assert.equal(result.food.attempt, null);
  assert.equal(await activeCheckout(say.owner), null);
  assert.deepEqual(result.effects, []);
  assert.match(result.reply.text, /Swiggy app/);
});

test("a spoken order goes address → menu → cart → total → yes, and the cart empties once placed", { skip: checkoutPaused }, async () => {
  const say = await readyToCheckout();
  const reviewed = await review(say);
  assert.equal(reviewed.food.attempt, null, "nothing is placed while reviewing");
  assert.ok(reviewed.effects.some(effect => effect.kind === "panel" && effect.panel === "checkout"), "the bill opens on screen");

  const placed = await say("haan", [{ call: "place_order" }, text("Order ho gaya.")]);
  assert.equal(placed.food.attempt?.state, "complete");
  assert.deepEqual(cartLines(placed.view), []);
  assert.ok(placed.effects.some(effect => effect.kind === "panel" && effect.panel === "order"));
});

test("tapped restaurant checkout switches a previous grocery checkout before a spoken payment choice", { skip: checkoutPaused }, async () => {
  const say = await readyToCheckout();
  await setActiveCheckout(say.owner, "instamart");
  const bill = await startFoodCheckout(say.owner);
  assert.ok(bill.checkout?.payments.length);
  assert.equal(bill.review, null);
  assert.equal(await activeCheckout(say.owner), "restaurant");
  const reviewed = await say("pay with cash", [{ call: "choose_payment", input: { method: "cash" } },
    { say: results => `Total ${(results[0].outcome as { total: string }).total}. Confirm order?` }]);
  assert.ok(reviewed.food.review);
  assert.equal(reviewed.food.attempt, null);
  assert.equal(reviewed.instamart, undefined);
  // A payment button must also restore the restaurant context for the next voice turn.
  await setActiveCheckout(say.owner, "instamart");
  const tapped = await chooseFoodPayment(say.owner, bill.checkout!.payments[0].id);
  assert.ok(tapped.review);
  assert.equal(await activeCheckout(say.owner), "restaurant");
});

test("the order is not placed in the same breath as the total: the customer must hear it first", { skip: checkoutPaused }, async () => {
  const say = await readyToCheckout();
  let refusal: ToolResult | undefined;
  const result = await say("cash se pay karke order kar do", [{ call: "checkout" }, { call: "choose_payment", input: { method: "cash" } }, { call: "place_order" },
    { say: results => { refusal = results.at(-1); return "Total sun lijiye, phir confirm kijiye."; } }]);
  assert.equal(refusal?.ok, false);
  assert.match(String(refusal?.error), /not heard the total/);
  assert.equal(result.food.attempt, null);
  assert.ok(result.food.review);
});

test("a bare yes only answers a reply that stated the total; 'confirm order' stands on its own", { skip: checkoutPaused }, async () => {
  const say = await readyToCheckout();
  await review(say);
  await say("aur kya hai menu mein?", [text("Biryani, kebabs aur desserts hain. Aur kuch?")]);
  let refusal: ToolResult | undefined;
  const vague = await say("haan", [{ call: "place_order" }, { say: results => { refusal = results[0]; return "Total ₹815 hai. Order confirm karun?"; } }]);
  assert.equal(refusal?.ok, false, "a yes to some other question never places an order");
  assert.equal(vague.food.attempt, null);
  const placed = await say("confirm order", [{ call: "place_order" }, text("Order ho gaya.")]);
  assert.equal(placed.food.attempt?.state, "complete");
});

/** Checkout with UPI named as "PhonePe", then a yes: Swiggy now waits for the payment. `mobile` is the customer's device. */
async function upiPending(mobile = false) {
  const say = await readyToCheckout();
  const turn = async (said: string, steps: Step[]) => { const view = await assistant.get(say.owner), script = scripted(steps); return runVoiceTurn(say.owner, { text: said, expectedVersion: view.version, mobile }, undefined, { model: script.model }); };
  let payment = "";
  await turn("checkout karo, PhonePe se", [{ call: "checkout" }, { call: "choose_payment", input: { method: "PhonePe" } },
    { say: results => { const outcome = results[1].outcome as { total: string; payment: string }; payment = outcome.payment; return `Total ${outcome.total} hai. Confirm karein?`; } }]);
  let told: unknown;
  // The model repeats the old, wrong story: the reply must not reach the customer.
  const placed = await turn("haan", [{ call: "place_order" }, { say: results => { told = results[0].outcome; return "Order placed! Approve the PhonePe UPI request on your phone."; } }]);
  return { say, payment, placed, told };
}

test("UPI on a computer is a QR to scan: never called placed or a phone request, and confirmed once paid", { skip: checkoutPaused }, async () => {
  const { say, payment, placed, told } = await upiPending();
  assert.equal(payment, "Scan UPI QR", "'PhonePe se' on a computer uses the QR option");
  assert.equal(placed.food.attempt?.state, "payment_pending");
  assert.match(placed.food.attempt?.upiUrl ?? "", /^upi:\/\/pay\?/);
  assert.ok(placed.food.attempt?.payBy && Date.parse(placed.food.attempt.payBy) > Date.now(), "the screen can show the time left to pay");
  assert.equal((told as { placed: boolean }).placed, false);
  assert.doesNotMatch(placed.reply.text, /placed!|approve|request/i);
  assert.match(placed.reply.text, /QR/);
  assert.equal((await refreshFoodOrder(say.owner)).attempt?.state, "payment_pending", "still waiting before the payment arrives");
  const paid = await refreshFoodOrder(say.owner);
  assert.equal(paid.attempt?.state, "complete");
  assert.equal(paid.attempt?.upiUrl, undefined, "the payment link goes once paid");
});

test("UPI on a phone opens the UPI app the customer named", { skip: checkoutPaused }, async () => {
  const { payment, placed } = await upiPending(true);
  assert.equal(payment, "PhonePe UPI");
  assert.equal(placed.food.attempt?.state, "payment_pending");
  assert.match(placed.reply.text, /Open UPI app/);
});

test("an unpaid UPI order is settled when its payment time ends, and a cancelled payment does not stay waiting", { skip: checkoutPaused }, async () => {
  const unpaid = await upiPending();
  const id = unpaid.placed.food.attempt!.id, stored = await read<{ createdAt: string }>(unpaid.say.owner, "food_attempt", id);
  await write(unpaid.say.owner, "food_attempt", id, { ...stored!, createdAt: new Date(Date.now() - 10 * 60_000).toISOString() });
  const expired = await refreshFoodOrder(unpaid.say.owner);
  assert.equal(expired.attempt?.state, "failed");
  assert.match(expired.attempt?.message ?? "", /payment time ran out/);
  assert.equal(expired.attempt?.upiUrl, undefined);
  const cancelled = await upiPending();
  endFixturePayment(cancelled.say.owner, "CANCELLED");
  const ended = await refreshFoodOrder(cancelled.say.owner);
  assert.equal(ended.attempt?.state, "failed");
  assert.match(ended.attempt?.message ?? "", /cancelled this payment/);
});

test("an unknown checkout with no order ID can be checked and explicitly reset without losing dishes", { skip: checkoutPaused }, async () => {
  const say = await readyToCheckout();
  await review(say);
  const state = await foodState(say.owner), id = "food_attempt_reset";
  await write(say.owner, "food_attempt", id, { attempt: { id, state: "outcome_unknown", message: "Unknown", results: [] }, quoteId: state.review!.quote.id, createdAt: new Date().toISOString() });
  await write(say.owner, "checkout_gate", "swiggy_food", { attemptId: id });
  const owner = await read<object>(say.owner, "owner", say.owner);
  await write(say.owner, "owner", say.owner, { ...owner, latestAttemptId: id });
  assert.equal((await syncFoodCart(say.owner)).sync.state, "skipped");
  assert.match((await refreshFoodOrder(say.owner)).attempt!.message, /no order ID/);
  await assert.rejects(resetFoodOrder(say.owner, "food_attempt_wrong"), { code: "RESET_NOT_ALLOWED" });
  const before = cartLines(await assistant.get(say.owner));
  const reset = await resetFoodOrder(say.owner, id);
  assert.equal(reset.attempt, null);
  assert.equal(reset.review, null);
  assert.equal(await read(say.owner, "checkout_gate", "swiggy_food"), null);
  assert.ok(await read(say.owner, "food_attempt", id), "historical evidence is retained");
  assert.deepEqual(cartLines(await assistant.get(say.owner)), before);
  await assert.rejects(foodCheckout.refreshAttempt(say.owner, id), { code: "CHECKOUT_RESET" });
  assert.equal((await syncFoodCart(say.owner)).sync.state, "synced");
  assert.equal((await startFoodCheckout(say.owner)).checkout!.cart.lines.length, 1);
});

test("a pending payment cannot be reset as an unknown checkout", { skip: checkoutPaused }, async () => {
  const { say, placed } = await upiPending();
  await assert.rejects(resetFoodOrder(say.owner, placed.food.attempt!.id), { code: "RESET_NOT_ALLOWED" });
  assert.ok(await read(say.owner, "checkout_gate", "swiggy_food"));
});

test("a waiting Instamart UPI payment from last week is not shown as an order to pay", async () => {
  const say = await customer();
  const record = (createdAt: string) => ({ attempt: { id: "attempt_week", state: "payment_pending", message: "Payment is pending.", results: [] }, quoteId: "q", createdAt });
  await write(say.owner, "attempt", "attempt_week", record(new Date(Date.now() - 7 * 24 * 3600_000).toISOString()));
  await write(say.owner, "owner", say.owner, { csrfToken: "test", sessionId: null, latestAttemptId: "attempt_week" });
  assert.equal((await foodState(say.owner)).attempt, null);
  await write(say.owner, "attempt", "attempt_week", record(new Date().toISOString()));
  assert.equal((await foodState(say.owner)).attempt?.state, "payment_pending", "within its payment window it is still shown");
});

test("UPI choices follow the device: the QR on a computer, the apps on a phone", () => {
  const options = [{ id: "cod" }, { id: "upi_app:phonepe" }, { id: "upi_qr:upi_qr" }, { id: "swiggy_money" }];
  assert.deepEqual(paymentsFor(options, false).map(option => option.id), ["cod", "upi_qr:upi_qr", "swiggy_money"]);
  assert.deepEqual(paymentsFor(options, true).map(option => option.id), ["cod", "upi_app:phonepe", "swiggy_money"]);
  assert.deepEqual(paymentsFor([{ id: "cod" }, { id: "upi_app:phonepe" }], false).map(option => option.id), ["cod", "upi_app:phonepe"], "without a QR option a computer keeps the app; its link still shows as a QR");
});

test("dishes already in the customer's Swiggy app cart are replaced only after they say so", { skip: checkoutPaused }, async () => {
  const say = await readyToCheckout();
  seedFixtureFoodCart(say.owner, 2, "fixture-home", [{ menuItemId: "0-0", quantity: 1 }]);
  let result: ToolResult | undefined;
  await say("checkout karo", [{ call: "checkout" }, { say: results => { result = results[0]; return "Aapke Swiggy cart mein Truffles ka item hai. Replace karun?"; } }]);
  assert.equal(result?.ok, false);
  assert.match(String(result?.error), /already has 1 item from Truffles\. Replace them/);
  // The model asking to replace is not enough: the customer's own words must agree.
  await say("checkout karo", [{ call: "checkout", input: { replaceSwiggyCart: true } }, { say: results => { result = results[0]; return "Pehle bataiye, replace karun?"; } }]);
  assert.equal(result?.ok, false);
  const replaced = await say("haan replace kar do", [{ call: "checkout", input: { replaceSwiggyCart: true } }, text("Bill ready hai.")]);
  assert.equal(replaced.food.checkout?.restaurant.name, "Meghana Foods");
  assert.deepEqual(replaced.food.checkout?.cart.lines.map(line => `${line.quantity}× ${line.product.name}`), ["2× Chicken Boneless Biryani"]);
});

test("dishes reach the Swiggy app cart as they are added, changed and removed, like groceries in the Instamart bag", async () => {
  const say = await readyToCheckout();
  const swiggy = foodOrdering(say.owner), inSwiggy = async () => (await swiggy.getCart({ addressId: "fixture-home" })).lines.map(line => `${line.quantity}× ${line.name}`);
  const added = await syncFoodCart(say.owner);
  assert.equal(added.sync.state, "synced");
  assert.deepEqual(await inSwiggy(), ["2× Chicken Boneless Biryani"]);
  assert.equal(added.review, null, "a synced cart is not a started checkout");
  await say("ek paneer biryani bhi", [{ call: "update_cart", input: { changes: [{ item: "paneer biryani", action: "add" }] } }, text("Done.")]);
  assert.equal((await syncFoodCart(say.owner)).sync.state, "synced");
  assert.deepEqual((await inSwiggy()).sort(), ["1× Paneer Biryani", "2× Chicken Boneless Biryani"]);
  // A dish from another restaurant replaces what this app put there, without asking.
  await say("Truffles kholo, fries daal do aur biryani hata do", [{ call: "back_to_restaurants" }, { call: "open_restaurant", input: { restaurant: "Truffles" } },
    { call: "update_cart", input: { changes: [{ item: "peri peri fries", action: "add" }, { item: "chicken boneless biryani", action: "remove" }, { item: "paneer biryani", action: "remove" }] } }, text("Done.")]);
  assert.equal((await syncFoodCart(say.owner)).sync.state, "synced");
  assert.deepEqual(await inSwiggy(), ["1× Peri Peri Fries"]);
  await say("fries hata do", [{ call: "update_cart", input: { changes: [{ item: "peri peri fries", action: "remove" }] } }, text("Done.")]);
  assert.equal((await syncFoodCart(say.owner)).sync.state, "empty");
  assert.deepEqual(await inSwiggy(), [], "removing every dish empties the Swiggy cart it filled");
});

test("unchanged local dishes recheck Swiggy after its cart was cleared or replaced", async () => {
  const say = await readyToCheckout();
  assert.equal((await syncFoodCart(say.owner)).sync.state, "synced");
  const provider = foodOrdering(say.owner);
  await provider.clearCart({});
  assert.equal((await syncFoodCart(say.owner)).sync.state, "synced");
  assert.deepEqual((await provider.getCart({ addressId: "fixture-home" })).lines.map(line => `${line.quantity}× ${line.name}`), ["2× Chicken Boneless Biryani"]);
  seedFixtureFoodCart(say.owner, 2, "fixture-home", [{ menuItemId: "0-0", quantity: 1 }]);
  assert.equal((await syncFoodCart(say.owner)).sync.state, "conflict");
  assert.deepEqual((await provider.getCart({ addressId: "fixture-home" })).lines.map(line => line.name), ["All American Cheese Burger"]);
});

test("dishes the customer put in the Swiggy app themselves stay until they agree to replace them", async () => {
  const say = await readyToCheckout();
  seedFixtureFoodCart(say.owner, 2, "fixture-home", [{ menuItemId: "0-0", quantity: 1 }]);
  const held = await syncFoodCart(say.owner);
  assert.equal(held.sync.state, "conflict");
  assert.match(String(held.sync.message), /already has 1 item from Truffles\. Replace them/);
  assert.deepEqual((await foodOrdering(say.owner).getCart({ addressId: "fixture-home" })).lines.map(line => line.name), ["All American Cheese Burger"]);
  const replaced = await syncFoodCart(say.owner, undefined, true);
  assert.equal(replaced.sync.state, "synced");
  assert.deepEqual(replaced.checkout?.cart.lines.map(line => `${line.quantity}× ${line.product.name}`), ["2× Chicken Boneless Biryani"]);
  // Their own Swiggy cart is never emptied for them: removing the dishes here after they changed it there leaves it alone.
  seedFixtureFoodCart(say.owner, 2, "fixture-home", [{ menuItemId: "1-0", quantity: 3 }]);
  await say("biryani hata do", [{ call: "update_cart", input: { changes: [{ item: "chicken boneless biryani", action: "remove" }] } }, text("Done.")]);
  assert.equal((await syncFoodCart(say.owner)).sync.state, "empty");
  assert.deepEqual((await foodOrdering(say.owner).getCart({ addressId: "fixture-home" })).lines.map(line => `${line.quantity}× ${line.name}`), ["3× Peri Peri Fries"]);
});

test("a placed order keeps its dishes and live delivery status for the order screen and 'order it again'", { skip: checkoutPaused }, async () => {
  const say = await readyToCheckout();
  await review(say);
  await say("haan", [{ call: "place_order" }, text("Order ho gaya.")]);
  const tracked = await say("order kahan hai?", [{ call: "order_status" }, text("Restaurant ne order accept kar liya hai.")]);
  assert.deepEqual(tracked.food.order?.lines, [{ name: "Chicken Boneless Biryani", quantity: 2 }]);
  assert.equal(tracked.food.order?.restaurant, "Meghana Foods");
  assert.equal(tracked.food.tracking?.stage, 0);
  assert.equal(tracked.food.tracking?.status, "Order confirmed");
});

test("Swiggy's order status words map to delivery stages", () => {
  assert.equal(trackingStage("Preparing", false), 1);
  assert.equal(trackingStage("Out for delivery", false), 2);
  assert.equal(trackingStage("Your delivery partner is on the way", false), 2);
  assert.equal(trackingStage("delivered", true), 3);
  assert.equal(trackingStage("cancelled", true), -1);
});

test("groceries reach the Instamart bag as they are added, changed and removed, and packs added in the Swiggy app stay", async () => {
  const say = await customer();
  await say("ghar pe deliver karo", [{ call: "set_delivery_address", input: { address: "ghar" } }, text("Done.")]);
  await say("chips dikhao", [{ call: "find_groceries", input: { query: "chips" } }, text("Chips mil gaye.")]);
  await say("do Lay's classic daal do", [{ call: "update_cart", input: { changes: [{ item: "Lay's Classic Salted", action: "add", quantity: 2 }] } }, text("Do Lay's add ho gaye.")]);
  const bag = (session: { cart: { lines: { quantity: number; product: { name: string } }[] } } | null | undefined) => session?.cart.lines.map(line => `${line.quantity}× ${line.product.name}`);
  const added = await syncInstamart(say.owner);
  assert.equal(added.sync.state, "synced");
  assert.deepEqual(bag(added.session), ["2× Lay's Classic Salted Chips"]);
  assert.equal((await syncInstamart(say.owner)).session, null, "an unchanged cart needs no Instamart round trip");
  // The customer adds a third pack in the Swiggy app itself.
  const store = instamartFixture(say.owner), raw = await store.getCart(), pack = decodeSwiggyVariantId(added.session!.cart.lines[0].product.id);
  await store.setCartQuantity({ addressId: raw.selectedAddress!, ...pack, quantity: 3, expectedFingerprint: swiggyCartFingerprint(raw) });
  const line = () => assistant.get(say.owner).then(view => ({ view, offerId: view.task.items.find(item => item.selectedOfferId)!.selectedOfferId! }));
  let current = await line();
  await assistant.setCartLine(say.owner, { offerId: current.offerId, quantity: 3, expectedVersion: current.view.version });
  assert.deepEqual(bag((await syncInstamart(say.owner)).session), ["4× Lay's Classic Salted Chips"], "SayCart's two became three; the customer's own pack stays");
  // Checkout reads the bag as it is: nothing is added a second time.
  const checkout = await prepareInstamartBag(say.owner);
  assert.deepEqual(bag(checkout.session), ["4× Lay's Classic Salted Chips"]);
  current = await line();
  assert.equal(current.view.task.items.find(item => item.selectedOfferId)?.status, "selected", "the bag keeps following quantity changes after checkout starts");
  await assistant.setCartLine(say.owner, { offerId: current.offerId, quantity: 0, expectedVersion: current.view.version });
  const removed = await syncInstamart(say.owner);
  assert.equal(removed.sync.state, "empty");
  assert.deepEqual(bag(removed.session), ["1× Lay's Classic Salted Chips"], "removing it here takes out only SayCart's share");
});

test("groceries are ordered by voice too: search, add, Instamart bag, payment, the total heard, then yes", { skip: checkoutPaused }, async () => {
  const say = await customer();
  await say("ghar pe deliver karo", [{ call: "set_delivery_address", input: { address: "ghar" } }, text("Done.")]);
  const both = await say("chips aur cold drink chahiye", [{ call: "find_groceries", input: { query: "chips and cold drink" } }, { call: "update_cart", input: { changes: [{ item: "Lay's India's Magic Masala", action: "add" }, { item: "Coca-Cola", action: "add", quantity: 2 }] } }, text("Dono add ho gaye.")]);
  assert.deepEqual(both.view.task.items.filter(item => item.selectedOfferId).map(item => `${item.quantity}× ${both.view.offers.find(offer => offer.id === item.selectedOfferId)?.name}`), ["1× Lay's India's Magic Masala Chips", "2× Coca-Cola Soft Drink"], "two products from one search are two cart lines");
  await say("ye dono hata do", [{ call: "update_cart", input: { changes: [{ item: "Magic Masala", action: "remove" }, { item: "Coca-Cola", action: "remove" }] } }, text("Hata diye.")]);
  const found = await say("chips dikhao", [{ call: "find_groceries", input: { query: "chips" } }, text("Chips mil gaye.")]);
  assert.ok(found.view.offers.some(offer => offer.provider === "instamart" && offer.name === "Lay's Classic Salted Chips"));
  const added = await say("do Lay's classic daal do", [{ call: "update_cart", input: { changes: [{ item: "Lay's Classic Salted", action: "add", quantity: 2 }] } }, text("Do Lay's add ho gaye.")]);
  assert.deepEqual(added.view.task.items.filter(item => item.selectedOfferId).map(item => item.quantity), [2]);
  let bill: ToolResult | undefined;
  const bag = await say("checkout karo", [{ call: "checkout" }, { say: results => { bill = results[0]; return "Bill ₹74 hai. Cash ya Swiggy Money?"; } }]);
  assert.equal(bill?.ok, true);
  assert.deepEqual((bill?.outcome as { paymentOptions: string[] }).paymentOptions, ["Cash on delivery", "Swiggy Money"]);
  assert.ok(bag.effects.some(effect => effect.kind === "panel" && effect.panel === "bag"));
  assert.equal(bag.instamart?.session?.cart.totals.totalMinor, 7400, "₹40 of chips + ₹9 handling + ₹25 delivery");
  let total = "";
  const reviewed = await say("cash se", [{ call: "choose_payment", input: { method: "cash" } }, { say: results => { total = String((results[0].outcome as { total: string }).total); return `Total ${total} hai. Confirm karein?`; } }]);
  assert.equal(total, "₹74");
  assert.ok(reviewed.instamart?.review);
  assert.ok(reviewed.effects.some(effect => effect.kind === "panel" && effect.panel === "review"));
  const placed = await say("haan", [{ call: "place_order" }, text("Order ho gaya.")]);
  assert.equal(placed.instamart?.attempt?.state, "complete");
  assert.deepEqual(placed.view.task.items.filter(item => item.selectedOfferId), [], "ordered groceries leave the cart");
  assert.equal(placed.instamart?.session?.cart.lines.length, 0, "the page's bag count comes from this session, which is empty once ordered");
  // The order screen reloads its state after placing; the Instamart order must still be there, with no restaurant tracking.
  assert.equal((await foodState(say.owner)).attempt?.state, "complete");
  const tracked = await trackFoodOrder(say.owner);
  assert.equal(tracked.tracking, null);
  assert.match(tracked.attempt?.message ?? "", /Instamart order placed/);
});

test("several groceries in one sentence: products off screen are looked up, and the spoken quantity counts", async () => {
  const say = await customer();
  await say("ghar", [{ call: "set_delivery_address", input: { address: "ghar" } }, text("Done.")]);
  // The model searched only the chips, then added both, and passed 1 for "do coca cola".
  const added = await say("do coca cola aur ek Lay's classic chips daal do", [
    { call: "find_groceries", input: { query: "Lay's classic chips" } },
    { call: "update_cart", input: { changes: [{ item: "Coca-Cola Soft Drink 750 ml", action: "add", quantity: 1 }, { item: "Lay's Classic Salted Chips", action: "add", quantity: 1 }] } },
    text("Do Coca-Cola aur ek Lay's add ho gaye."),
  ]);
  assert.deepEqual(added.view.task.items.filter(item => item.selectedOfferId).map(item => `${item.quantity}× ${added.view.offers.find(offer => offer.id === item.selectedOfferId)?.name}`).sort(), ["1× Lay's Classic Salted Chips", "2× Coca-Cola Soft Drink"]);
});

test("highlighted Instamart products can be added repeatedly and removed without losing their identity", async () => {
  const say = await customer();
  await say("ghar", [{ call: "set_delivery_address", input: { address: "ghar" } }, text("Done.")]);
  const found = await say("show chips", [{ call: "find_groceries", input: { query: "chips" } }, text("Here are the chips.")]);
  const focused = found.view.offers.find(offer => offer.provider === "instamart" && offer.name === "Pringles Original")!;
  assert.ok(focused);
  for (const [action, quantity] of [["add", 1], ["add", 2], ["remove", 0]] as const) {
    const view = await assistant.get(say.owner);
    const script = scripted([{ call: "update_cart", input: { changes: [{ item: "highlighted", action, quantity: 1 }] } }, text("Done.")]);
    const result = await runVoiceTurn(say.owner, { text: `${action} this`, expectedVersion: view.version, focusedId: focused.id }, undefined, { model: script.model });
    assert.match(JSON.stringify(script.model.doGenerateCalls[0].prompt), /Pringles Original[^]*?← highlighted/, "the agent sees which product is highlighted");
    assert.ok(result.trace?.every(entry => !entry.includes("✗")), result.trace?.join("; "));
    assert.deepEqual(result.view.task.items.filter(item => item.selectedOfferId).map(item => `${item.quantity}× ${result.view.offers.find(offer => offer.id === item.selectedOfferId)?.name}`), quantity ? [`${quantity}× Pringles Original`] : []);
  }
});

test("grocery voice references follow displayed order and resolve saved cart IDs to refreshed products", async () => {
  const say = await customer();
  await say("ghar", [{ call: "set_delivery_address", input: { address: "ghar" } }, text("Done.")]);
  const selected = await say("show chips and add Pringles", [{ call: "find_groceries", input: { query: "chips" } }, { call: "update_cart", input: { changes: [{ item: "Pringles Original", action: "add" }] } }, text("Added Pringles.")]);
  const saved = selected.view.offers.find(offer => offer.name === "Pringles Original" && selected.view.task.items.some(item => item.selectedOfferId === offer.id))!;
  const fresh = await say("show chips again", [{ call: "find_groceries", input: { query: "chips" } }, text("Here are the chips.")]);
  const active = fresh.view.offers.filter(offer => offer.itemId === fresh.view.task.discovery?.itemId);
  const refreshed = active.find(offer => offer.providerItemId === saved.providerItemId)!;
  const other = active.find(offer => offer.name === "Lay's Classic Salted Chips")!;
  const hidden = active.find(offer => offer.name.startsWith("Lay's India's Magic Masala"))!;
  assert.ok(refreshed && other && hidden);
  assert.notEqual(saved.id, refreshed.id, "the displayed card is from a new search");
  const script = scripted([{ call: "update_cart", input: { changes: [{ item: "highlighted", action: "add" }, { item: "2", action: "add" }] } }, text("Both added.")]);
  const result = await runVoiceTurn(say.owner, { text: "add this and the second one", expectedVersion: fresh.view.version, visibleOfferIds: ["invented-offer", saved.id, other.id, saved.id], focusedId: saved.id }, undefined, { model: script.model });
  const screen = JSON.stringify(script.model.doGenerateCalls[0].prompt.findLast(message => message.role === "user")?.content);
  assert.match(screen, /1\. Pringles Original[^]*?← highlighted/);
  assert.match(screen, /2\. Lay's Classic Salted Chips/);
  assert.ok(!screen.includes(hidden.name), "hidden products are excluded from the numbered screen");
  assert.ok(result.trace?.every(entry => !entry.includes("✗")), result.trace?.join("; "));
  assert.deepEqual(result.view.task.items.filter(item => item.selectedOfferId).map(item => `${item.quantity}× ${result.view.offers.find(offer => offer.id === item.selectedOfferId)?.name}`).sort(), ["1× Lay's Classic Salted Chips", "2× Pringles Original"]);
});

test("numbered groceries resolve the displayed product before the cart unless the cart panel is open", async () => {
  const say = await customer();
  await say("ghar", [{ call: "set_delivery_address", input: { address: "ghar" } }, text("Done.")]);
  const added = await say("show chips and add Pringles", [{ call: "find_groceries", input: { query: "chips" } }, { call: "update_cart", input: { changes: [{ item: "Pringles Original", action: "add" }] } }, text("Added Pringles.")]);
  const first = added.view.offers.find(offer => offer.name === "Lay's Classic Salted Chips")!;
  const pringles = added.view.offers.find(offer => offer.name === "Pringles Original")!;
  for (const [item, action, quantity, panel, expected, openCart] of [
    ["1", "add", 1, null, ["1× Lay's Classic Salted Chips", "1× Pringles Original"], false],
    ["first", "add", 1, null, ["1× Pringles Original", "2× Lay's Classic Salted Chips"], false],
    ["1", "set", 3, "selection", ["2× Lay's Classic Salted Chips", "3× Pringles Original"], false],
    ["1", "set", 4, null, ["2× Lay's Classic Salted Chips", "4× Pringles Original"], true],
    ["first", "remove", 0, "bag", ["2× Lay's Classic Salted Chips"], false],
  ] as const) {
    const view = await assistant.get(say.owner);
    const script = scripted([...(openCart ? [{ call: "show_panel", input: { panel: "cart" } }] : []), { call: "update_cart", input: { changes: [{ item, action, quantity }] } }, text("Done.")]);
    const result = await runVoiceTurn(say.owner, { text: `${action} the first one`, expectedVersion: view.version, visibleOfferIds: [first.id, pringles.id], panel }, undefined, { model: script.model });
    assert.ok(result.trace?.every(entry => !entry.includes("✗")), result.trace?.join("; "));
    assert.deepEqual(result.view.task.items.filter(entry => entry.selectedOfferId).map(entry => `${entry.quantity}× ${result.view.offers.find(offer => offer.id === entry.selectedOfferId)?.name}`).sort(), expected);
  }
});

test("a grocery search during a turn replaces stale visible IDs with the fresh product list", async () => {
  const say = await customer();
  await say("ghar", [{ call: "set_delivery_address", input: { address: "ghar" } }, text("Done.")]);
  const chips = await say("show chips", [{ call: "find_groceries", input: { query: "chips" } }, text("Here are the chips.")]);
  const script = scripted([{ call: "find_groceries", input: { query: "chocolate" } }, { call: "update_cart", input: { changes: [{ item: "1", action: "add" }] } }, text("Added the first chocolate.")]);
  const result = await runVoiceTurn(say.owner, { text: "show chocolate and add the first one", expectedVersion: chips.view.version, visibleOfferIds: chips.view.offers.map(offer => offer.id) }, undefined, { model: script.model });
  assert.ok(result.trace?.every(entry => !entry.includes("✗")), result.trace?.join("; "));
  assert.deepEqual(result.view.task.items.filter(item => item.selectedOfferId).map(item => result.view.offers.find(offer => offer.id === item.selectedOfferId)?.name), ["Cadbury Dairy Milk Silk"]);
});

test("home grocery cards with saved IDs describe the current rail offer instead of its old cart price", async () => {
  const say = await customer();
  await say("ghar", [{ call: "set_delivery_address", input: { address: "ghar" } }, text("Done.")]);
  const selected = await say("show chips and add Pringles", [{ call: "find_groceries", input: { query: "chips" } }, { call: "update_cart", input: { changes: [{ item: "Pringles Original", action: "add" }] } }, text("Added Pringles.")]);
  const savedId = selected.view.task.items.find(item => item.selectedOfferId)?.selectedOfferId!;
  const home = await say("open Instamart", [{ call: "open_instamart" }, text("Instamart is open.")]);
  const stored = await read<{ offers: Array<{ id: string; priceMinor: number | null }> }>(say.owner, "assistant", "current");
  stored!.offers.find(offer => offer.id === savedId)!.priceMinor = 1;
  await write(say.owner, "assistant", "current", stored);
  const script = scripted([text("This is Pringles Original.")]);
  await runVoiceTurn(say.owner, { text: "what is this", expectedVersion: home.view.version, visibleOfferIds: [savedId], focusedId: savedId }, undefined, { model: script.model });
  const screen = JSON.stringify(script.model.doGenerateCalls[0].prompt.findLast(message => message.role === "user")?.content);
  assert.match(screen, /1\. Pringles Original 107 g — ₹110 ← highlighted/);
});

test("list numbers stand only for items the customer named, and a product added twice in one go is flagged", async () => {
  const say = await customer();
  await say("ghar", [{ call: "set_delivery_address", input: { address: "ghar" } }, text("Done.")]);
  const results: ToolResult[][] = [];
  // "1" is Lay's Classic (named by the customer), so it stands; the model then adds Lay's again by name: flagged, and it adds the Coca-Cola instead.
  const fixed = await say("do coca cola aur ek Lay's classic chips daal do", [
    { call: "find_groceries", input: { query: "coca cola lay's classic chips" } },
    { call: "update_cart", input: { changes: [{ item: "1", action: "add", quantity: 1 }, { item: "Lay's Classic Salted Chips", action: "add", quantity: 1 }] } },
    { call: "update_cart", input: { changes: [{ item: "Coca-Cola", action: "add", quantity: 1 }] } },
    { say: entries => { results.push(entries); return "Do Coca-Cola aur ek Lay's add ho gaye."; } },
  ]);
  assert.equal(results[0][1].ok, false);
  assert.match(String(results[0][1].error), /already added in this request/);
  assert.deepEqual(fixed.view.task.items.filter(item => item.selectedOfferId).map(item => `${item.quantity}× ${fixed.view.offers.find(offer => offer.id === item.selectedOfferId)?.name}`).sort(), ["1× Lay's Classic Salted Chips", "2× Coca-Cola Soft Drink"]);
  // A number pointing at something the customer never named is refused with that item's name, so the model can correct itself.
  let refusal: ToolResult | undefined;
  await say("ek kitkat bhi", [{ call: "find_groceries", input: { query: "chocolate" } }, { call: "update_cart", input: { changes: [{ item: "1", action: "add" }] } }, { say: entries => { refusal = entries[1]; return "Kaunsi chocolate?"; } }]);
  assert.equal(refusal?.ok, false);
  assert.match(String(refusal?.error), /"1" is Cadbury Dairy Milk Silk, which the customer did not name/);
  const english = await say("add two of the first one", [{ call: "update_cart", input: { changes: [{ item: "1", action: "add", quantity: 2 }] } }, text("Done.")]);
  assert.ok(english.trace?.every(entry => !entry.includes("✗")), "a spoken position is still honoured");
});

test("Hindi in Devanagari: a numbered dish the customer named in Hindi is accepted", async () => {
  const say = await customer();
  await say("घर पे डिलीवर करो", [text("घर पर डिलीवरी होगी।")]);
  const added = await say("मेघना फूड्स खोलो और एक पनीर बिरयानी डाल दो", [{ call: "open_restaurant", input: { restaurant: "1" } }, { call: "update_cart", input: { changes: [{ item: "2", action: "add", quantity: 1 }] } }, text("पनीर बिरयानी जोड़ दी।")]);
  assert.equal(added.view.restaurantBrowser?.menu?.restaurant.name, "Meghana Foods");
  assert.deepEqual(added.view.task.items.filter(item => item.selectedOfferId).map(item => `${item.quantity}× ${item.label}`), ["1× Paneer Biryani"]);
  assert.equal(spokenQuantityFor("दो चिकन बिरयानी डाल दो", "Chicken Boneless Biryani"), 2, "Devanagari counts and names are read too");
});

test("with dishes and groceries in the cart, checkout asks which order goes first", { skip: checkoutPaused }, async () => {
  const say = await readyToCheckout();
  await say("chips bhi", [{ call: "find_groceries", input: { query: "chips" } }, { call: "update_cart", input: { changes: [{ item: "Pringles Original", action: "add", quantity: 1 }] } }, text("Pringles add ho gaye.")]);
  let result: ToolResult | undefined;
  await say("checkout karo", [{ call: "checkout" }, { say: results => { result = results[0]; return "Pehle restaurant ya Instamart?"; } }]);
  assert.equal(result?.ok, false);
  assert.match(String(result?.error), /separate orders/);
  const food = await say("restaurant wala pehle", [{ call: "checkout", input: { which: "restaurant" } }, text("Bill ready.")]);
  assert.equal(food.food.checkout?.restaurant.name, "Meghana Foods");
});

test("while a total waits for a yes, the reply cannot say the order is placed", { skip: checkoutPaused }, async () => {
  const say = await readyToCheckout();
  const claimed = await say("pay with cash and place the order", [{ call: "checkout" }, { call: "choose_payment", input: { method: "cash" } }, text("Your order is confirmed for ₹791 with cash on delivery.")]);
  assert.equal(claimed.food.attempt, null);
  assert.equal(claimed.reply.text, 'The total is ₹791 with Cash on delivery. Shall I place the order? Say "confirm order".');
  const placed = await say("haan", [{ call: "place_order" }, text("Your order is placed.")]);
  assert.equal(placed.food.attempt?.state, "complete");
  assert.equal(placed.reply.text, "Your order is placed.", "a real order may say so");
});

test("after only searching, the reply cannot claim anything was added", async () => {
  const say = await customer();
  await say("ghar", [{ call: "set_delivery_address", input: { address: "ghar" } }, text("Done.")]);
  const claimed = await say("chips aur coca cola chahiye", [{ call: "find_groceries", input: { query: "chips coca cola" } }, text("Chips aur Coca-Cola add kar diye.")]);
  assert.equal(claimed.reply.text, "Ye products mil gaye. Kaunsa add karun? Naam ya number boliye.");
  const offered = await say("chips dikhao", [{ call: "find_groceries", input: { query: "chips" } }, text("Ye rahe chips. Kaunsa add karun?")]);
  assert.equal(offered.reply.text, "Ye rahe chips. Kaunsa add karun?", "an offer to add is not a claim");
});

test("only the customer's own goodbye ends listening", async () => {
  const say = await customer();
  const thanks = await say("thanks", [{ call: "stop_listening" }, text("You're welcome!")]);
  assert.deepEqual(thanks.effects, []);
  const bye = await say("ok that's all, bye", [{ call: "stop_listening" }, text("Bye!")]);
  assert.deepEqual(bye.effects, [{ kind: "stop_listening" }]);
});

test("filters report exactly what the screen will show, and an empty match changes nothing", async () => {
  const say = await customer();
  await say("ghar", [{ call: "set_delivery_address", input: { address: "ghar" } }, text("Done.")]);
  let shown: ToolResult | undefined;
  const sorted = await say("top rated pehle", [{ call: "view_controls", input: { sort: "rating", filter: null, openOnly: null } }, { say: results => { shown = results[0]; return "Meghana Foods sabse upar hai."; } }]);
  assert.equal(shown?.ok, true);
  assert.match(String((shown?.outcome as { showing: string[] }).showing[0]), /^Meghana Foods ★4\.5/);
  assert.deepEqual(sorted.effects, [{ kind: "browse", sort: "rating" }]);
  const none = await say("sirf veg", [{ call: "view_controls", input: { filter: "veg" } }, { say: results => { shown = results[0]; return "Koi match nahi."; } }]);
  assert.equal(shown?.ok, false);
  assert.match(String(shown?.error), /find_restaurants/);
  assert.deepEqual(none.effects, [], "an empty filter never blanks the screen");
});

test("dishes can be set and removed by name from the cart, even after leaving the menu", async () => {
  const say = await readyToCheckout();
  const changed = await say("biryani ek kar do aur ek paneer biryani bhi", [
    { call: "update_cart", input: { changes: [{ item: "chicken boneless biryani", action: "set", quantity: 1 }, { item: "paneer biryani", action: "add" }] } },
    { call: "back_to_restaurants" },
    { call: "update_cart", input: { changes: [{ item: "paneer biryani", action: "remove", quantity: null }] } },
    text("Done."),
  ]);
  assert.deepEqual(cartLines(changed.view), ["1× Chicken Boneless Biryani"]);
});

test("a named address is chosen even when the model only asks again", async () => {
  const say = await customer();
  const asked = await say("घर पे डिलीवर करो", [text("डिलीवरी का पता चुनिए—Home या Work?")]);
  assert.ok(asked.view.restaurantBrowser?.restaurants.length, "Home was chosen from the customer's own words and restaurants listed");
  const work = await customer();
  const office = await work("office pe bhejna", [text("Okay.")]);
  assert.ok(office.view.restaurantBrowser?.restaurants.length);
  const none = await customer();
  const unrelated = await none("hello, kya haal hai", [text("Main theek hoon!")]);
  assert.equal(unrelated.view.restaurantBrowser, null, "no address words, no address chosen");
});

test("the agent never picks a delivery address the customer did not name", async () => {
  const say = await customer();
  let result: ToolResult | undefined;
  const thanks = await say("thanks", [{ call: "set_delivery_address", input: { address: "Home" } }, { say: results => { result = results[0]; return "Home or Work?"; } }]);
  assert.equal(result?.ok, false);
  assert.match(String(result?.error), /not said where to deliver/);
  assert.equal(thanks.view.restaurantBrowser, null, "nothing was chosen or searched");
  const hindi = await say("घर पर deliver करो।", [{ call: "set_delivery_address", input: { address: "घर" } }, text("घर पर डिलीवरी होगी।")]);
  assert.ok(hindi.view.restaurantBrowser?.restaurants.length, "the customer's own word for home is enough");
});

test("grocery voice selects the actual Instamart address and returns its session without changing Food", async () => {
  const say = await customer();
  const food = await selectFoodAddress(say.owner, "fixture-home", (await assistant.get(say.owner)).version);
  await assistant.groceryHome(say.owner, { rails: GROCERY_RAILS, expectedVersion: food.version });
  let chosen: ToolResult | undefined;
  const result = await say("deliver to Work", [{ call: "set_delivery_address", input: { address: "Work" } }, { say: entries => { chosen = entries[0]; return String(chosen?.outcome ?? chosen?.error); } }]);
  assert.equal(chosen?.ok, true);
  assert.equal(result.instamart?.session?.addressId, "im-work");
  assert.equal(result.view.task.discovery?.kind, "snacks");
  assert.equal(result.view.restaurantBrowser, null);
  assert.equal((await foodAddresses(say.owner)).selectedAddressId, "fixture-home", "Food's distinct saved address is unchanged");
  assert.match(String(chosen?.outcome), /Work/);
});

test("a named grocery address is selected from Instamart even when the model asks again without a tool", async () => {
  const say = await customer();
  await assistant.groceryHome(say.owner, { rails: GROCERY_RAILS, expectedVersion: (await assistant.get(say.owner)).version });
  const result = await say("deliver to Work", [text("Home or Work?")]);
  assert.equal(result.instamart?.session?.addressId, "im-work");
  assert.equal(result.view.restaurantBrowser, null);
  assert.equal(result.view.task.discovery?.kind, "snacks");
  assert.ok(result.view.offers.length);
  assert.equal((await foodAddresses(say.owner)).selectedAddressId, null, "Food consent was never given");
});

test("grocery voice cannot claim a Work switch while the actual Home bag prevents changing its address", async () => {
  const say = await customer();
  const food = await selectFoodAddress(say.owner, "fixture-home", (await assistant.get(say.owner)).version);
  await assistant.groceryHome(say.owner, { rails: GROCERY_RAILS, expectedVersion: food.version });
  await say("add Pringles", [{ call: "update_cart", input: { changes: [{ item: "Pringles Original", action: "add" }] } }, text("Added Pringles.")]);
  assert.equal((await syncInstamart(say.owner)).session?.addressId, "im-home");
  // Food can have a different selection: its attempted cross-provider mirror must not become grocery consent.
  await selectFoodAddress(say.owner, "fixture-work", (await assistant.get(say.owner)).version);
  const view = await assistant.get(say.owner);
  let refused: ToolResult | undefined;
  const script = scripted([{ call: "set_delivery_address", input: { address: "Work" } }, { say: entries => { refused = entries[0]; return String(refused?.error ?? refused?.outcome); } }]);
  const result = await runVoiceTurn(say.owner, { text: "deliver to Work", expectedVersion: view.version }, undefined, { model: script.model });
  assert.equal(refused?.ok, false);
  assert.match(String(refused?.error), /bag belongs to another delivery address/);
  assert.match(result.reply.text, /Empty it before switching addresses/);
  assert.match(JSON.stringify(script.model.doGenerateCalls[0].prompt), /Delivery address: Home/);
  const owner = await getOwner(say.owner);
  const session = await getView(say.owner, owner!.sessionId!);
  assert.equal(session.addressId, "im-home");
  assert.equal(session.cart.lines.length, 1);
});

test("grocery greetings use Instamart's connection and saved addresses when Food is unavailable", async t => {
  const say = await customer();
  const home = await assistant.groceryHome(say.owner, { rails: GROCERY_RAILS, expectedVersion: (await assistant.get(say.owner)).version });
  const originalGet = assistant.get;
  let instamartConnected = true;
  t.mock.method(assistant, "get", async (owner: string) => {
    const view = await originalGet(owner);
    return { ...view, providers: view.providers.map(provider => provider.id === "swiggy_food" ? { ...provider, status: "disconnected" as const } : provider.id === "instamart" ? { ...provider, status: instamartConnected ? "connected" as const : "disconnected" as const } : provider) };
  });
  const asked = await greet(say.owner, home.version);
  assert.match(asked.reply.text, /Home.*Work/);
  assert.doesNotMatch(asked.reply.text, /Connect Swiggy/i);
  instamartConnected = false;
  const connect = await greet(say.owner, asked.view.version);
  assert.match(connect.reply.text, /Instamart/);
  assert.doesNotMatch(connect.reply.text, /Connect Swiggy/i);
});

test("a missing or unclear address makes the agent ask instead of guessing", async () => {
  const say = await customer();
  let result: ToolResult | undefined;
  await say("Mars pe bhejo", [{ call: "set_delivery_address", input: { address: "Mars" } }, { say: results => { result = results[0]; return "Home ya Work?"; } }]);
  assert.equal(result?.ok, false);
  assert.match(String(result?.error), /Home, Work/);
});

test("a model failure after a rejected tool cannot report that the action was done", async () => {
  const owner = opaqueId(`failed-action-${Math.random()}`);
  await write(owner, "owner", owner, { csrfToken: "test", sessionId: null });
  const script = scripted([{ call: "set_delivery_address", input: { address: "Mars" } }]);
  const result = await runVoiceTurn(owner, { text: "Deliver to Mars", expectedVersion: (await assistant.get(owner)).version }, undefined, { model: script.model });
  assert.ok(result.degraded, "the model failed after the rejected tool");
  assert.equal(result.view.restaurantBrowser, null, "the address was not selected");
  assert.doesNotMatch(result.reply.text, /\bdone\b/i, "attempting a tool does not mean its action succeeded");
});

test("a malformed tool call is sampled again, and a rate-limited model hands the same step to the fallback", async () => {
  const reply = { content: [{ type: "text" as const, text: "ok" }], finishReason: { unified: "stop" as const, raw: undefined }, usage, warnings: [] };
  let attempts = 0;
  const flaky = new MockLanguageModelV4({ doGenerate: async () => { if (attempts++ === 0) throw new Error("tool call validation failed: parameters for tool view_controls did not match schema"); return reply; } });
  assert.equal((await generateText({ model: resilientModel(flaky), prompt: "hi", maxRetries: 0 })).text, "ok");
  assert.equal(attempts, 2);

  let fallbackCalls = 0;
  const limited = new MockLanguageModelV4({ doGenerate: async () => { throw Object.assign(new Error("Rate limit reached: tokens per minute"), { statusCode: 429 }); } });
  const fallback = new MockLanguageModelV4({ doGenerate: async () => { fallbackCalls++; return reply; } });
  assert.equal((await generateText({ model: resilientModel(limited, [fallback]), prompt: "hi", maxRetries: 0 })).text, "ok");
  assert.equal(fallbackCalls, 1);
});

test("when every model is briefly rate limited the step waits; a long limit becomes a short spoken 'one moment'", async () => {
  const reply = { content: [{ type: "text" as const, text: "ok" }], finishReason: { unified: "stop" as const, raw: undefined }, usage, warnings: [] };
  const limit = (seconds: number) => Object.assign(new Error("Rate limit reached for model"), { statusCode: 429, responseHeaders: { "retry-after": String(seconds) } });
  let primaryCalls = 0;
  const recovering = new MockLanguageModelV4({ doGenerate: async () => { if (primaryCalls++ === 0) throw limit(0); return reply; } });
  const busyFallback = new MockLanguageModelV4({ doGenerate: async () => { throw limit(30); } });
  assert.equal((await generateText({ model: resilientModel(recovering, [busyFallback]), prompt: "hi", maxRetries: 0 })).text, "ok");
  assert.equal(primaryCalls, 2, "the model that frees up first gets the step again");

  // A model out of its daily tokens rests: later steps go straight to the next model instead of failing on it again.
  let exhaustedCalls = 0, nextCalls = 0;
  const exhausted = new MockLanguageModelV4({ doGenerate: async () => { exhaustedCalls++; throw Object.assign(new Error("Rate limit reached on tokens per day (TPD). Please try again in 4m49.008s."), { statusCode: 429 }); } });
  const next = new MockLanguageModelV4({ doGenerate: async () => { nextCalls++; return reply; } });
  const chain = resilientModel(exhausted, [next]);
  for (let step = 0; step < 3; step++) assert.equal((await generateText({ model: chain, prompt: "hi", maxRetries: 0 })).text, "ok");
  assert.equal(exhaustedCalls, 1); assert.equal(nextCalls, 3);

  const stuck = new MockLanguageModelV4({ doGenerate: async () => { throw limit(40); } });
  await assert.rejects(generateText({ model: resilientModel(stuck, [busyFallback]), prompt: "hi", maxRetries: 0 }), ModelBusyError);

  const owner = opaqueId(`busy-${Math.random()}`);
  await write(owner, "owner", owner, { csrfToken: "test", sessionId: null });
  const turn = await runVoiceTurn(owner, { text: "pizza dikhao", expectedVersion: (await assistant.get(owner)).version }, undefined, { model: resilientModel(stuck, [busyFallback]) });
  assert.equal(turn.reply.text, "Abhi thoda zyada load hai. Kuch second baad phir boliye.");
  assert.ok(turn.degraded);
});

test("a briefly busy model records nothing and asks the page to retry; tools reach the model without schema clutter", async () => {
  const limit = (seconds: number) => Object.assign(new Error("Rate limit reached for model"), { statusCode: 429, responseHeaders: { "retry-after": String(seconds) } });
  const stuck = new MockLanguageModelV4({ doGenerate: async () => { throw limit(15); } });
  const owner = opaqueId(`retry-${Math.random()}`);
  await write(owner, "owner", owner, { csrfToken: "test", sessionId: null });
  const before = await assistant.get(owner);
  const quiet = await runVoiceTurn(owner, { text: "pizza dikhao", expectedVersion: before.version, retryable: true }, undefined, { model: resilientModel(stuck) });
  assert.ok(quiet.busy && quiet.busy.retryInMs > 10_000 && quiet.busy.retryInMs <= 15_000);
  assert.equal(quiet.reply.text, "", "nothing is spoken");
  assert.equal((await assistant.get(owner)).version, before.version, "nothing is recorded, so the same words can be sent again");
  const last = await runVoiceTurn(owner, { text: "pizza dikhao", expectedVersion: before.version }, undefined, { model: resilientModel(stuck) });
  assert.equal(last.reply.text, "Abhi thoda zyada load hai. Kuch second baad phir boliye.");
  const daily = new MockLanguageModelV4({ doGenerate: async () => { throw Object.assign(new Error("Rate limit reached on tokens per day (TPD). Please try again in 1h12m3s."), { statusCode: 429 }); } });
  const exhausted = await runVoiceTurn(owner, { text: "pizza dikhao", expectedVersion: last.view.version, retryable: true }, undefined, { model: resilientModel(daily) });
  assert.equal(exhausted.reply.text, "Aaj ki free AI limit poori ho gayi hai. Thodi der baad phir try kariye.", "a daily limit is said plainly, not retried");

  let seen: unknown;
  const recorder = new MockLanguageModelV4({ doGenerate: async options => { seen = options.tools; return { content: [{ type: "text" as const, text: "ok" }], finishReason: { unified: "stop" as const, raw: undefined }, usage, warnings: [] }; } });
  await runVoiceTurn(owner, { text: "hello", expectedVersion: exhausted.view.version }, undefined, { model: resilientModel(recorder) });
  const sent = JSON.stringify(seen);
  assert.ok(sent.includes("view_controls") && !sent.includes("$schema") && !sent.includes("additionalProperties"));
});

test("spoken replies are cleaned for speech: no markdown, emoji, list numbers or rambling", () => {
  assert.equal(tidy("**Done!** 🍕 Sorted list: 1. Truffles, 2. Meghana Foods, 3. Domino's Pizza."), "Done! Sorted list: Truffles, Meghana Foods, Domino's Pizza.");
  assert.equal(tidy("Rating 4.5 hai. Total ₹1,117.50 hai..... Confirm?"), "Rating 4.5 hai. Total ₹1,117.50 hai. Confirm?");
  assert.equal(tidy("One. Two. Three. Four."), "One. Two. Three.");
  assert.equal(tidy("Ho gaya। Aur kuch?? Ho gaya।"), "Ho gaya। Aur kuch?");
});

test("replies mirror Devanagari, Hinglish and English, without treating English 'do' as Hindi", () => {
  for (const [said, language] of [
    ["मुझे बिरयानी चाहिए", "Hindi"], ["Show me पनीर dishes please", "Hindi"],
    ["mujhe biryani chahiye", "Hinglish"], ["menu kholo", "Hinglish"], ["theek hai", "Hinglish"], ["cart mein daal do", "Hinglish"], ["do biryani aur ek naan", "Hinglish"],
    ["I want to order food for 2 people", "English"], ["Do you have veg biryani?", "English"], ["do it", "English"], ["Can you do two plates of momos", "English"],
    ["I want chicken chow mein", "English"], ["I want dal makhani", "English"], ["Can you show me the Haldiram Ka Dhaba menu please", "English"], ["500", "English"],
  ] as const) assert.ok(replyLanguage(said).startsWith(language), `${said} → ${replyLanguage(said)}`);
});

test("a reply in the wrong language is rewritten by a small model, and kept when the rewrite fails", async () => {
  const answer = (text: string) => { let calls = 0; return { model: new MockLanguageModelV4({ doGenerate: async () => { calls++; return { content: [{ type: "text" as const, text }], finishReason: { unified: "stop" as const, raw: undefined }, usage, warnings: [] }; } }), calls: () => calls }; };
  const hinglish = replyLanguage("Truffles kholo aur do fries daal do");
  assert.equal(replyMatches("Added 2 Peri Peri Fries to your cart.", hinglish), false);
  assert.equal(replyMatches("2 Peri Peri Fries add kar diye. Aur kuch?", hinglish), true);
  const fixed = answer("2 Peri Peri Fries add kar diye. Aur kuch chahiye?");
  assert.equal(await inLanguage("Added 2 Peri Peri Fries to your cart.", hinglish, fixed.model), "2 Peri Peri Fries add kar diye. Aur kuch chahiye?");
  const stillEnglish = answer("Added two fries.");
  assert.equal(await inLanguage("Added 2 Peri Peri Fries to your cart.", hinglish, stillEnglish.model), "Added 2 Peri Peri Fries to your cart.");
  const unused = answer("never");
  assert.equal(await inLanguage("Ho gaya, aur kuch?", hinglish, unused.model), "Ho gaya, aur kuch?");
  assert.equal(unused.calls(), 0, "a reply already in the right language costs no extra call");
  assert.equal(replyMatches("मेघना फूड्स खुल गया।", replyLanguage("मेघना खोलो")), true);
  assert.equal(replyMatches("Meghana Foods is open.", replyLanguage("मेघना खोलो")), false);
});

test("the number spoken right before a name is that item's quantity", () => {
  assert.equal(spokenQuantityFor("do coca cola aur ek Lay's classic chips daal do", "Coca-Cola Soft Drink"), 2);
  assert.equal(spokenQuantityFor("do coca cola aur ek Lay's classic chips daal do", "Lay's Classic Salted Chips"), 1);
  assert.equal(spokenQuantityFor("दो Chicken Biryani डाल दो।", "Chicken Boneless Biryani"), 2);
  assert.equal(spokenQuantityFor("ek veg biryani aur do chicken biryani", "Chicken Boneless Biryani"), 2);
  assert.equal(spokenQuantityFor("ek veg biryani aur do chicken biryani", "Veg Biryani"), 1);
  assert.equal(spokenQuantityFor("can you add three peri peri fries", "Peri Peri Fries"), 3);
  assert.equal(spokenQuantityFor("do you have coca cola", "Coca-Cola Soft Drink"), null, "English 'do' before 'you' is not a count");
  assert.equal(spokenQuantityFor("chips daal do", "Lay's Classic Salted Chips"), null);
});

test("spoken references resolve list positions, names and saved addresses", () => {
  assert.equal(spokenNumber("teesra wala"), 3);
  assert.equal(spokenNumber("दूसरा"), 2);
  assert.equal(spokenNumber("last one"), -1);
  const entries = [{ id: "a", name: "Meghana Foods" }, { id: "b", name: "Behrouz Biryani" }, { id: "c", name: "Domino's Pizza" }];
  assert.equal(matchSpoken("2", entries)?.id, "b");
  assert.equal(matchSpoken("meghana wala", entries)?.id, "a");
  assert.equal(matchSpoken("dominos pizza", entries)?.id, "c");
  assert.equal(matchSpoken("pasta", entries), null);
  const saved = [{ id: "home", label: "Home", reviewAddressText: "12, 4th Cross, Koramangala" }, { id: "work", label: "Work", reviewAddressText: "Embassy Tech Village, Bellandur" }];
  assert.equal(resolveAddressAnswer("ghar pe bhejo", saved), "home");
  assert.equal(resolveAddressAnswer("office", saved), "work");
  assert.equal(resolveAddressAnswer("Bellandur", saved), "work");
  assert.equal(resolveAddressAnswer("Mars", saved), null);
});

after(async () => { await (await database()).close(); });

test("'Instamart kholo' opens the grocery home, and its products stay one cart line each across visits", async () => {
  const say = await customer();
  await say("ghar", [{ call: "set_delivery_address", input: { address: "ghar" } }, text("Done.")]);
  const home = await say("Instamart kholo", [{ call: "open_instamart" }, text("Instamart khul gaya.")]);
  assert.equal(home.view.task.discovery?.categoryId, "home");
  assert.deepEqual(home.view.task.items.map(item => item.label), ["Daily essentials", "Munchies", "Cold drinks", "Sweet cravings"]);
  assert.equal(home.view.restaurantBrowser, null);
  const named = (view: typeof home.view) => view.task.items.filter(item => item.selectedOfferId).map(item => `${item.quantity}× ${view.offers.find(offer => offer.id === item.selectedOfferId)?.name}`).sort();
  const added = await say("ek Amul milk aur do Lay's classic daal do", [{ call: "update_cart", input: { changes: [{ item: "Amul Taaza Toned Milk", action: "add", quantity: 1 }, { item: "Lay's Classic Salted Chips", action: "add", quantity: 2 }] } }, text("Add ho gaye.")]);
  assert.deepEqual(named(added.view), ["1× Amul Taaza Toned Milk", "2× Lay's Classic Salted Chips"]);
  const again = await say("Instamart home dikhao", [{ call: "open_instamart" }, text("Yeh raha.")]);
  assert.deepEqual(named(again.view), ["1× Amul Taaza Toned Milk", "2× Lay's Classic Salted Chips"], "a second visit keeps the cart");
  const more = await say("ek aur Lay's classic", [{ call: "update_cart", input: { changes: [{ item: "Lay's Classic Salted Chips", action: "add", quantity: 1 }] } }, text("Teen ho gaye.")]);
  assert.deepEqual(named(more.view), ["1× Amul Taaza Toned Milk", "3× Lay's Classic Salted Chips"], "the product found again on the home is the same cart line");
});
