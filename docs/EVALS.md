# Voice agent evaluations

The assistant's understanding now comes from a model, so it is checked two ways.

## Scripted agent tests (offline, every `npm test`)

[`tests/voice-agent.test.ts`](../tests/voice-agent.test.ts) drives the real tools, store and Swiggy Food fixture with a scripted model (`MockLanguageModelV4` from `ai/test`). The script decides which tools are called; the test checks what the code then does: the order flow from address to placed order, the consent rules, the goodbye guard, filters that report what is shown, cart edits by name, unclear addresses, the tools offered per step, rate-limit recovery, reply cleanup and language mirroring. No network is used.

## Live agent evals (opt-in, uses Groq)

```bash
npm run evals:agent                         # all scenarios
npm run evals:agent -- --list
npm run evals:agent -- --case hinglish-order
npm run evals:agent -- --pace 6000          # longer gap between turns
```

[`scripts/evaluate-agent.ts`](../scripts/evaluate-agent.ts) runs each conversation in [`evals/agent-scenarios.ts`](../evals/agent-scenarios.ts) through the real agent and Groq model, against the development fixture and an in-memory store. Nothing reaches Swiggy or ElevenLabs, and no real order can be placed. The key is read from `.env.local` when it is not already set.

Each turn is graded on the resulting state, not on wording: open menu, restaurant cart lines, reviewed total, order state, delivery address, number of restaurants listed, the script of the reply, and whether listening stops. A turn that fell back to a generic reply (model error or rate limit) fails. Expectations are written by hand from what the customer should end up with.

Turns are paced four seconds apart by default, roughly the time a spoken reply and the next sentence take; back-to-back turns would mostly measure Groq's per-minute limit. The run prints every turn with its reply and time, and writes `output/evals/agent-latest.json`. It exits with code 1 when any scenario fails.

Model output varies between runs. Treat one failing turn as a lead to investigate, and compare reports before and after a prompt or tool change.

## Adding a scenario

1. Write the conversation a real customer would have; keep it synthetic.
2. Under each turn, state the outcome a customer should end up with (menu, cart, total, order, address, language).
3. Run it with `--case`, and fix the agent rather than loosening the expectation.
