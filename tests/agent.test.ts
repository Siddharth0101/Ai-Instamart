import assert from "node:assert/strict";
import { test } from "node:test";
import { AgentIntentSchema, type Cart, type Product, type TraceEvent } from "../src/lib/contracts";
import { AgentError, inferDemo, intentJSONSchema, runTurn, validateIntent, type TurnInput } from "../src/server/agent";
import { synthesizeSpeech, VoiceError } from "../src/server/voice";

const milk: Product = { id: "amul-milk-500", name: "Taaza Toned Milk", brand: "Amul", unit: "500 ml", priceMinor: 2900, currency: "INR", available: true };
const otherMilk: Product = { id: "amul-milk-1000", name: "Taaza Toned Milk", brand: "Amul", unit: "1 L", priceMinor: 5800, currency: "INR", available: true };
const emptyCart = (): Cart => ({ revision: 0, lines: [], totals: { itemsMinor: 0, feesMinor: 0, discountMinor: 0, totalMinor: 0, currency: "INR" } });
const input = (text: string, overrides: Partial<TurnInput> = {}): TurnInput => ({ text, mode: "demo", history: [], products: [milk, otherMilk], cart: emptyCart(), ...overrides });
const makeCart = (quantity: number): Cart => ({ revision: 1, lines: quantity ? [{ product: milk, quantity }] : [], totals: { itemsMinor: milk.priceMinor * quantity, feesMinor: 0, discountMinor: 0, totalMinor: milk.priceMinor * quantity, currency: "INR" } });

test("the Groq response schema is closed and every field is required", () => {
  assert.equal(intentJSONSchema.additionalProperties, false);
  assert.deepEqual(new Set(intentJSONSchema.required), new Set(Object.keys(intentJSONSchema.properties ?? {})));
  assert.equal(AgentIntentSchema.safeParse({ action: "checkout", query: null, productId: null, quantity: null, reply: "done" }).success, false);
  assert.equal(AgentIntentSchema.safeParse({ action: "clarify", query: null, productId: null, quantity: null, reply: "Choose a pack", confirmed: true }).success, false);
});

test("ambiguous milk variants never mutate the cart", async () => {
  let mutations = 0;
  const result = await runTurn(input("add two packs of Amul milk"), {
    search: async () => [milk, otherMilk], setQuantity: async () => { mutations++; return makeCart(2); }, record: async () => {},
  });
  assert.equal(result.intent.action, "clarify");
  assert.equal(mutations, 0);
  assert.equal(result.usage.totalTokens, 0);
  assert.equal(result.usage.model, null);
});

test("a resolved cart change runs pre/post hooks and uses the reconciled cart", async () => {
  const events: TraceEvent[] = [];
  const sequence: string[] = [];
  const result = await runTurn(input("add two Amul milk 500 ml"), {
    search: async () => { throw new Error("Unexpected search"); },
    setQuantity: async (id, quantity) => { sequence.push("dispatch"); assert.equal(id, milk.id); assert.equal(quantity, 2); return makeCart(2); },
    record: async (event) => { events.push(event); sequence.push(event.stage); },
  });
  assert.equal(result.cart.lines[0].quantity, 2);
  assert.match(result.message, /2 × Taaza Toned Milk, 500 ml/);
  assert.deepEqual(sequence, ["model", "pre_tool", "dispatch", "post_tool"]);
  assert.deepEqual(result.trace, events);
});

test("add increments the existing pack count while set changes the final count", () => {
  const cart = makeCart(3);
  assert.equal(inferDemo(input("add two Amul milk 500 ml", { cart })).quantity, 5);
  assert.equal(inferDemo(input("set Amul milk 500 ml to two", { cart })).quantity, 2);
  assert.equal(inferDemo(input("remove Amul milk 500 ml", { cart })).quantity, 0);
});

test("an unknown model-selected ID and a mismatched quantity become clarification", () => {
  const intent = { action: "set_quantity" as const, query: null, productId: "made-up-id", quantity: 2, reply: "add" };
  assert.equal(validateIntent(intent, [milk], emptyCart()).action, "clarify");
  assert.equal(validateIntent({ ...intent, productId: milk.id, quantity: 99 }, [milk], emptyCart(), "add two Amul milk 500 ml").action, "clarify");
  assert.equal(validateIntent({ ...intent, productId: milk.id }, [milk, otherMilk], emptyCart(), "add two Amul milk").action, "clarify");
  assert.equal(validateIntent({ ...intent, productId: milk.id }, [milk], emptyCart(), "add two Amul milk 500 ml and bread").action, "clarify");
});

test("a purchase request can only request checkout review", async () => {
  let actions = 0;
  const result = await runTurn(input("place my order now"), {
    search: async () => { actions++; return []; }, setQuantity: async () => { actions++; return emptyCart(); }, record: async () => {},
  });
  assert.equal(result.intent.action, "review_checkout");
  assert.match(result.message, /Review order/);
  assert.equal(actions, 0);
});

test("negation and multiple-item requests cannot silently change the cart", () => {
  assert.equal(inferDemo(input("don't add Amul milk 500 ml")).action, "clarify");
  assert.equal(inferDemo(input("add milk and bananas")).action, "clarify");
  assert.equal(inferDemo(input("yes")).action, "clarify");
});

test("Hindi and Hinglish negation prevents an otherwise matched product mutation", () => {
  const proposed = { action: "set_quantity" as const, query: null, productId: milk.id, quantity: 1, reply: "Add one" };
  for (const text of [
    "Amul milk 500 ml add mat karo",
    "Amul milk 500 ml नहीं add करना",
    "Amul milk 500 ml add nahi karna",
    "Amul milk 500 ml मत add करना",
  ]) {
    assert.equal(validateIntent(proposed, [milk], emptyCart(), text).action, "clarify", text);
  }
});

test("multilingual spoken requests reach interpretation unchanged and search any provider category", async t => {
  const previousKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-key-not-a-credential";
  t.after(() => { if (previousKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = previousKey; });
  for (const [request, query] of [
    ["मुझे wireless headphones चाहिए", "wireless headphones"],
    ["मेरे लिए sunscreen दिखाओ, milk नहीं", "sunscreen"],
    ["Can you order iPhone 17 Pro?", "iPhone 17 Pro"],
  ]) {
    t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      assert.equal(JSON.parse(body.messages[1].content).currentRequest, request);
      return new Response(JSON.stringify({
        model: "openai/gpt-oss-20b",
        choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ action: "search", query, productId: null, quantity: null, reply: "Search the catalog" }) } }],
        usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
      }), { headers: { "Content-Type": "application/json" } });
    });
    let searches = 0;
    const result = await runTurn(input(request, { mode: "live", products: [] }), {
      search: async requested => { searches++; assert.equal(requested, query); return []; },
      setQuantity: async () => { throw new Error("Product discovery must not change the cart"); },
      record: async () => {},
    });
    assert.equal(searches, 1);
    assert.equal(result.intent.action, "search");
    assert.equal(result.cart.lines.length, 0);
    t.mock.restoreAll();
  }
});

test("failed durable pre-tool recording prevents a cart mutation", async () => {
  let dispatched = false;
  await assert.rejects(runTurn(input("add two Amul milk 500 ml"), {
    search: async () => [], setQuantity: async () => { dispatched = true; return makeCart(2); },
    record: async (event) => { if (event.stage === "pre_tool") throw new Error("storage unavailable"); },
  }), /storage unavailable/);
  assert.equal(dispatched, false);
});

test("an already stopped turn never dispatches a tool", async () => {
  const controller = new AbortController();
  controller.abort();
  let dispatched = false;
  await assert.rejects(runTurn(input("add two Amul milk 500 ml", { signal: controller.signal }), {
    search: async () => [], setQuantity: async () => { dispatched = true; return makeCart(2); }, record: async () => {},
  }));
  assert.equal(dispatched, false);
});

test("a provider cart mismatch is recorded and never announced as success", async () => {
  const stages: string[] = [];
  await assert.rejects(runTurn(input("add two Amul milk 500 ml"), {
    search: async () => [], setQuantity: async () => makeCart(1), record: async (event) => { stages.push(event.stage); },
  }), (error: unknown) => error instanceof AgentError && error.code === "CART_RECONCILIATION_FAILED");
  assert.ok(stages.includes("tool_error"));
  assert.ok(!stages.includes("post_tool"));
});

test("live interpretation uses strict Groq JSON schema and exact provider token usage", async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-key-not-a-credential";
  let sent: Record<string, unknown> | undefined;
  globalThis.fetch = async (_url, init) => {
    sent = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({
      id: "test-response", object: "chat.completion", created: 1, model: "openai/gpt-oss-20b",
      choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: JSON.stringify({ action: "search", query: "milk", productId: null, quantity: null, reply: "Find milk" }) } }],
      usage: { prompt_tokens: 143, completion_tokens: 27, total_tokens: 170 },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const result = await runTurn(input("find milk", { mode: "live" }), {
      search: async () => [milk, otherMilk], setQuantity: async () => { throw new Error("Unexpected mutation"); }, record: async () => {},
    });
    assert.deepEqual(result.usage, { inputTokens: 143, outputTokens: 27, totalTokens: 170, model: "openai/gpt-oss-20b" });
    assert.equal(result.products.length, 2);
    assert.equal((sent?.response_format as { json_schema: { strict: boolean } }).json_schema.strict, true);
    assert.equal(sent?.stream, false);
    assert.equal(sent?.tools, undefined);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = previousKey;
  }
});

test("completed model usage is recorded before a later cart tool fails", async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-key-not-a-credential";
  const sequence: string[] = [];
  globalThis.fetch = async () => new Response(JSON.stringify({
    id: "test-response", object: "chat.completion", created: 1, model: "openai/gpt-oss-20b",
    choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: JSON.stringify({ action: "set_quantity", query: null, productId: milk.id, quantity: 2, reply: "Update that item" }) } }],
    usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
  }), { status: 200, headers: { "Content-Type": "application/json" } });
  try {
    await assert.rejects(runTurn(input("add two Amul milk 500 ml", { mode: "live" }), {
      search: async () => [],
      setQuantity: async () => { sequence.push("tool"); throw new Error("Provider unavailable"); },
      record: async () => {},
      recordUsage: async (usage) => { sequence.push("usage"); assert.equal(usage.totalTokens, 120); },
    }), /Provider unavailable/);
    assert.deepEqual(sequence, ["usage", "tool"]);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = previousKey;
  }
});

test("TTS accepts only bounded WAV responses from the configured private service", async () => {
  const previousFetch = globalThis.fetch;
  const previousURL = process.env.KOKORO_URL;
  process.env.KOKORO_URL = "http://127.0.0.1:8880";
  let body: Record<string, unknown> | undefined;
  globalThis.fetch = async (_url, init) => {
    body = JSON.parse(String(init?.body));
    return new Response("not audio", { status: 200, headers: { "Content-Type": "text/plain" } });
  };
  try {
    await assert.rejects(synthesizeSpeech("Here is your cart."), (error: unknown) => error instanceof VoiceError && error.code === "TTS_RESPONSE_INVALID");
    assert.equal(body?.model, "kokoro");
    assert.equal(body?.voice, "af_heart");
    assert.equal(body?.stream, false);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousURL === undefined) delete process.env.KOKORO_URL;
    else process.env.KOKORO_URL = previousURL;
  }
});

test("model context contains the current request once and bounds multilingual payloads without truncating IDs", async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-key-not-a-credential";
  const requests: Record<string, unknown>[] = [];
  globalThis.fetch = async (_url, init) => {
    requests.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({
      model: "openai/gpt-oss-20b", choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ action: "show_cart", query: null, productId: null, quantity: null, reply: "Show cart" }) } }],
      usage: { prompt_tokens: 143, completion_tokens: 27, total_tokens: 170 },
    }), { headers: { "Content-Type": "application/json" } });
  };
  const deps = { search: async () => [], setQuantity: async () => emptyCart(), record: async () => {} };
  try {
    await runTurn(input("find milk", { mode: "live", history: [{ role: "user", text: "find milk" }, { role: "assistant", text: "Choose a pack" }, { role: "user", text: "find milk" }] }), deps);
    const first = JSON.parse((requests[0].messages as { content: string }[])[1].content);
    assert.deepEqual(first.conversation, [{ role: "user", text: "find milk" }, { role: "assistant", text: "Choose a pack" }]);
    assert.equal(first.currentRequest, "find milk");

    const products = Array.from({ length: 100 }, (_, index) => ({ ...milk, id: `${index}-${"x".repeat(290)}`, name: "क".repeat(250), brand: "क".repeat(150), unit: "क".repeat(100) }));
    const text = "क".repeat(2000);
    await runTurn(input(text, { mode: "live", products, history: Array.from({ length: 50 }, () => ({ role: "assistant" as const, text: "क".repeat(500) })) }), deps);
    const encoded = (requests[1].messages as { content: string }[])[1].content;
    const bounded = JSON.parse(encoded);
    assert.ok(Buffer.byteLength(encoded, "utf8") <= 8000);
    assert.equal(bounded.currentRequest, text);
    for (const product of bounded.visibleProducts) assert.ok(products.some((original) => original.id === product.id));
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = previousKey;
  }
});

test("concurrent graph invocations keep dependencies, results and traces isolated", async () => {
  const ids = Array.from({ length: 12 }, (_, index) => `product-${index}`);
  const results = await Promise.all(ids.map(async (id, index) => {
    const product = { ...milk, id, name: `Unique${index}` };
    const events: TraceEvent[] = [];
    const result = await runTurn(input(`find Unique${index}`, { products: [product] }), {
      search: async (query) => {
        assert.equal(query, `unique${index}`);
        await new Promise<void>((resolve) => setTimeout(resolve, (index % 3) * 2));
        return [product];
      },
      setQuantity: async () => { throw new Error("Unexpected mutation"); },
      record: async (event) => { events.push(event); },
    });
    assert.deepEqual(result.products, [product]);
    assert.deepEqual(result.trace, events);
    return result;
  }));
  const traceIds = results.flatMap((result) => result.trace.map((event) => event.id));
  assert.equal(new Set(traceIds).size, traceIds.length);
});

test("stop during durable pre-search recording prevents provider dispatch", async () => {
  const controller = new AbortController();
  let dispatched = false;
  await assert.rejects(runTurn(input("find milk", { signal: controller.signal }), {
    search: async () => { dispatched = true; return []; }, setQuantity: async () => emptyCart(),
    record: async (event) => { if (event.stage === "pre_tool") controller.abort(); },
  }));
  assert.equal(dispatched, false);
});

test("provider failures are classified without exposing upstream details or retrying", async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-key-not-a-credential";
  try {
    for (const [status, code] of [[400, "GROQ_REQUEST_REJECTED"], [401, "GROQ_AUTH_INVALID"], [403, "GROQ_ACCESS_DENIED"], [404, "GROQ_MODEL_UNAVAILABLE"], [429, "GROQ_RATE_LIMITED"], [500, "GROQ_UNAVAILABLE"]] as const) {
      let calls = 0;
      globalThis.fetch = async () => {
        calls++;
        return new Response(JSON.stringify({ error: { message: "sensitive-upstream-detail" } }), { status, headers: { "Content-Type": "application/json" } });
      };
      await assert.rejects(runTurn(input("find milk", { mode: "live" }), {
        search: async () => { throw new Error("Unexpected dispatch"); }, setQuantity: async () => emptyCart(), record: async () => {},
      }), (error: unknown) => error instanceof AgentError && error.code === code && !error.message.includes("sensitive-upstream-detail"));
      assert.equal(calls, 1);
    }
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = previousKey;
  }
});

test("invalid and truncated model responses still record consumed tokens before failing safely", async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-key-not-a-credential";
  try {
    for (const [content, finishReason, code] of [["not JSON", "stop", "MODEL_RESPONSE_INVALID"], ["{}", "length", "MODEL_RESPONSE_INCOMPLETE"], ["{}", "content_filter", "MODEL_RESPONSE_INCOMPLETE"]] as const) {
      let recorded = 0;
      globalThis.fetch = async () => new Response(JSON.stringify({
        model: "openai/gpt-oss-20b", choices: [{ finish_reason: finishReason, message: { content } }],
        usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
      }), { headers: { "Content-Type": "application/json" } });
      await assert.rejects(runTurn(input("find milk", { mode: "live" }), {
        search: async () => { throw new Error("Unexpected dispatch"); }, setQuantity: async () => emptyCart(), record: async () => {},
        recordUsage: async (usage) => { recorded += usage.totalTokens; },
      }), (error: unknown) => error instanceof AgentError && error.code === code);
      assert.equal(recorded, 120);
    }
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = previousKey;
  }
});
