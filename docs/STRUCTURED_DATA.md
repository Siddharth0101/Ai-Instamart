# Structured input and output

The app uses **Zod 4** as its shared contract library. [contracts.ts](../src/lib/contracts.ts) defines runtime schemas and derives TypeScript types with `z.infer`; there is no separately maintained model-response interface.

## Boundary flow

1. The browser sends a bounded request with a server-owned session/version and CSRF token.
2. The route parses a strict Zod request schema. Unknown fields, invalid quantities and malformed IDs are rejected before execution.
3. The agent converts `AgentIntentSchema` with `z.toJSONSchema` and sends it as Groq's strict `json_schema` response format.
4. The returned JSON is parsed with the same Zod schema. Server policy then checks references, availability, quantity semantics, ambiguity and permitted actions.
5. LangChain tools validate their arguments; post hooks validate the resulting product/cart data and record timing/status. A model response cannot authorize checkout.
6. Public session, quote and attempt objects are validated against their output schemas. The browser validates received shapes before rendering. JSON responses include an application `requestId`; the domain schema is validated after removing that envelope field.

Example model intent:

```json
{
  "action": "set_quantity",
  "query": null,
  "productId": "returned-product-id",
  "quantity": 2,
  "reply": "Update the selected pack count."
}
```

`quantity` is the final number of packs. The example identifier belongs only to the synthetic catalog. For a real provider, IDs must come from the current authorized result. Unused model fields are required and nullable so the generated JSON Schema is closed and compatible with strict structured output.

The allowed actions are `search`, `set_quantity`, `show_cart`, `review_checkout`, and `clarify`. There is no purchase action, shell tool, filesystem tool, or arbitrary MCP call available to the model. Checkout uses a separate owner-bound quote/challenge and explicit UI action.

## Runtime state and durability

LangGraph uses the shared intent, product, cart and usage schemas for its per-turn state. The bounded graph is `interpret → policy → optional tool → respond`. Durable sessions, quotes, attempts and gates live in the transactional application store. This build does not claim persistent LangGraph checkpoints or automatic interrupt/resume.

MCP uses separate provider DTO schemas in [swiggy-schemas.ts](../src/server/integrations/swiggy-schemas.ts). Provider shapes and money units must be translated explicitly before becoming application DTOs. Successful JSON parsing alone is not evidence that a price, payment, or order outcome is correct.

## Sources and verification

[Zod JSON Schema](https://zod.dev/json-schema), [Groq structured outputs](https://console.groq.com/docs/structured-outputs), and [LangGraph graph API](https://docs.langchain.com/oss/javascript/langgraph/graph-api) support the library/API choices. [Implementation references](IMPLEMENTATION_REFERENCES.md) preserve the reviewed real repositories and the patterns adapted here.

`tests/agent.test.ts` checks a closed schema with every field required, malformed/untrusted intent handling, Groq request format and actual returned token metrics. `tests/checkout.test.ts` checks that valid structured input cannot bypass ownership, quote freshness or explicit confirmation. `tests/swiggy.test.ts` validates SDK/provider boundaries with synthetic transport responses.
