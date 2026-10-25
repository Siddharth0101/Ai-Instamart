// Live voice-agent eval: real Groq turns, the development Swiggy fixture and an in-memory store.
// No speech, no real restaurants, no real orders. Run: npm run evals:agent [-- --case ID] [--pace MS] [--list]
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { AGENT_DATASET_VERSION, agentScenarios, type Expectation } from "../evals/agent-scenarios";

// Only the Groq key is needed from .env.local; storage and Swiggy are always the in-memory fixture.
if (!process.env.GROQ_API_KEY?.trim() && existsSync(".env.local")) process.loadEnvFile(".env.local");
process.env.DATA_DIR = "memory://";
process.env.SAYCART_FIXTURE = "1";

type Check = { label: string; passed: boolean; expected: unknown; actual: unknown };

async function main() {
  const args = process.argv.slice(2), only = args.flatMap((arg, index) => arg === "--case" ? [args[index + 1]] : []);
  const output = args.includes("--output") ? args[args.indexOf("--output") + 1] : "output/evals/agent-latest.json";
  // A spoken reply and the customer's next sentence take a few seconds; back-to-back turns would only measure the rate limit.
  const paceMs = args.includes("--pace") ? Number(args[args.indexOf("--pace") + 1]) : 4000;
  if (args.includes("--list")) { for (const scenario of agentScenarios) console.log(`${scenario.id} — ${scenario.description}`); return; }
  if (process.env.NODE_ENV === "production") throw new Error("Agent evals run only outside production.");
  if (!process.env.GROQ_API_KEY?.trim()) throw new Error("GROQ_API_KEY is required: these evals measure the live model.");
  const [{ assistant, foodAddresses }, { opaqueId }, { database, write }, { runVoiceTurn }] = await Promise.all([
    import("../src/server/assistant-service"), import("../src/server/crypto"), import("../src/server/store"), import("../src/server/voice-agent"),
  ]);
  const selected = agentScenarios.filter(scenario => !only.length || only.includes(scenario.id));
  if (!selected.length) throw new Error(`No scenario matches ${only.join(", ")}.`);
  console.log(`SayCart agent evals ${AGENT_DATASET_VERSION}: ${selected.length} scenarios, model ${process.env.GROQ_AGENT_MODEL || "openai/gpt-oss-120b"}, Swiggy fixture.`);
  const started = performance.now(), results = [];
  let spoken = 0;
  try {
    for (const scenario of selected) {
      const owner = opaqueId(`agent-eval-${scenario.id}-${Date.now()}`);
      await write(owner, "owner", owner, { csrfToken: "eval", sessionId: null });
      const turns = [];
      for (const turn of scenario.turns) {
        // Every turn after the very first waits, including the first turn of the next scenario.
        if (spoken++) await new Promise(resolve => setTimeout(resolve, paceMs));
        let clock = performance.now(), result = await runVoiceTurn(owner, { text: turn.say, expectedVersion: (await assistant.get(owner)).version }), busyRetries = 0;
        // Told "one moment, I'm busy", a customer waits and says it again; so does the eval, once. It is reported, not hidden.
        if (result.degraded && /rate limited/i.test(result.degraded)) {
          console.log(`  … "${turn.say}": every model is rate limited; waiting 20 s and saying it again`);
          await new Promise(resolve => setTimeout(resolve, 20_000));
          busyRetries = 1; clock = performance.now();
          result = await runVoiceTurn(owner, { text: turn.say, expectedVersion: (await assistant.get(owner)).version });
        }
        const ms = Math.round(performance.now() - clock);
        const saved = await foodAddresses(owner).catch(() => null);
        const address = saved?.addresses.find(entry => entry.id === saved.selectedAddressId)?.label ?? null;
        const checks = grade(turn.expect, result, address);
        // A fallback reply is a model failure (often a rate limit), never a pass.
        if (result.degraded) checks.push({ label: "model answered without falling back", passed: false, expected: "a model reply", actual: result.degraded.slice(0, 160) });
        turns.push({ say: turn.say, reply: result.reply.text, tools: result.trace ?? [], ms, busyRetries, passed: checks.every(check => check.passed), checks });
        console.log(`  ${checks.every(check => check.passed) ? "✓" : "✗"} "${turn.say}" → "${result.reply.text}" (${ms} ms)`);
        if (result.trace?.length) console.log(`      tools: ${result.trace.join(" → ")}`);
        for (const check of checks.filter(check => !check.passed)) console.log(`      ${check.label}: expected ${JSON.stringify(check.expected)}, got ${JSON.stringify(check.actual)}`);
      }
      const passed = turns.every(turn => turn.passed);
      console.log(`${passed ? "PASS" : "FAIL"} ${scenario.id} — ${scenario.description}\n`);
      results.push({ id: scenario.id, description: scenario.description, passed, turns });
    }
  } finally { await (await database()).close(); }
  const passed = results.filter(result => result.passed).length;
  const report = { datasetVersion: AGENT_DATASET_VERSION, model: process.env.GROQ_AGENT_MODEL || "openai/gpt-oss-120b", startedAt: new Date().toISOString(), elapsedMs: Math.round(performance.now() - started), passed, total: results.length, results };
  const path = resolve(output); await mkdir(dirname(path), { recursive: true }); await writeFile(path, JSON.stringify(report, null, 2) + "\n");
  console.log(`${passed}/${results.length} scenarios passed. Report: ${path}`);
  if (passed < results.length) process.exitCode = 1;
}

function grade(expect: Expectation, result: Awaited<ReturnType<typeof import("../src/server/voice-agent")["runVoiceTurn"]>>, address: string | null): Check[] {
  const checks: Check[] = [], check = (label: string, expected: unknown, actual: unknown) => checks.push({ label, passed: JSON.stringify(expected) === JSON.stringify(actual), expected, actual });
  const view = result.view;
  const cart = view.task.items.flatMap(item => { const offer = view.offers.find(entry => entry.id === item.selectedOfferId); return offer && offer.provider === "swiggy_food" ? [`${item.quantity}× ${offer.name}`] : []; }).sort();
  if (expect.menu !== undefined) check("open menu", expect.menu, view.restaurantBrowser?.menu?.restaurant.name ?? null);
  if (expect.cart) check("restaurant cart", [...expect.cart].sort(), cart);
  const groceries = view.task.items.flatMap(item => { const offer = view.offers.find(entry => entry.id === item.selectedOfferId); return offer && offer.provider === "instamart" ? [`${item.quantity}× ${offer.name}`] : []; }).sort();
  if (expect.groceries) check("Instamart cart", [...expect.groceries].sort(), groceries);
  if (expect.groceryOrder) check("Instamart order", expect.groceryOrder, result.instamart?.attempt?.state ?? null);
  if (expect.review !== undefined) check("reviewed total waiting", expect.review, !!result.food.review);
  if (expect.order !== undefined) check("order", expect.order, result.food.attempt?.state ?? null);
  if (expect.address) check("delivery address", expect.address, address);
  if (expect.restaurants) checks.push({ label: "restaurants listed", passed: (view.restaurantBrowser?.restaurants.length ?? 0) >= expect.restaurants, expected: `≥ ${expect.restaurants}`, actual: view.restaurantBrowser?.restaurants.length ?? 0 });
  if (expect.language) check("reply script", expect.language, /[ऀ-ॿ]/.test(result.reply.text) ? "Devanagari" : "Roman");
  if (expect.stopsListening !== undefined) check("stops listening", expect.stopsListening, result.effects.some(effect => effect.kind === "stop_listening"));
  return checks;
}

main().catch(error => { console.error(`Agent eval error: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 2; });
