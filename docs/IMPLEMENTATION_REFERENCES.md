# Implementation references

Reviewed **18–20 October 2026**. References below informed the implementation; their presence does not mean we ran their apps, connected Swiggy accounts, or verified live orders. The fuller source review and licensing boundaries remain in [REFERENCE_ARCHITECTURES.md](REFERENCE_ARCHITECTURES.md).

The [21 October source review](CODE_REVIEW.md) revisits the MCP client, separate voice stages, ElevenLabs connection lifecycle and commerce search patterns, and records the resulting application fixes.

## Repository patterns used

| Reference and revision | Implemented pattern | Our adaptation |
| --- | --- | --- |
| [Swiggy Voice Order: MCP client](https://github.com/shekhartata/swiggy-voice-order/blob/0864459b75dca3fe4b2dc6f9b98da91412c85aaa/src/lib/mcp-client.ts) | A server-owned official MCP SDK client with Streamable HTTP and connection cleanup. | `src/server/integrations/swiggy.ts` narrows the tool surface, validates discovered arguments, checks provider responses, and closes the client in `finally`. Credentials are scoped to the browser owner and encrypted by the app store. |
| [Kitchen Copilot: commerce router](https://github.com/shauraya-mohan/Swiggy-MCP/blob/b5994a3c1c0f810c562dbbc036a3e118f8069216/lib/mcp/router.ts#L67-L118) | Separate explicit fixture/live paths and cards rendered from tool results. | Synthetic transports are confined to tests; the app has one live account workflow. A live failure never substitutes synthetic products. Server checkout confirmation uses a persisted quote and challenge. |
| [Local Voice Agent: Groq and local speech](https://github.com/fizznix/local-voice-agent/blob/9975a4b604c37fc475ff81815afdf1ecea8f21ac/agent.py) | Local speech services around hosted Groq reasoning, with stage timing. | This was an earlier architecture reference. Current inline dictation uses ElevenLabs directly with a server-minted token; Groq intent still receives bounded submitted text and optional Kokoro remains separate. |
| [Kokoro-FastAPI: speech router](https://github.com/remsky/Kokoro-FastAPI/blob/ebd4ec9cc97b258b25afc39444a5e1701055db50/api/src/routers/openai_compatible.py#L260) | Existing resident-model HTTP synthesis service. | `src/server/voice.ts` calls a configured private service. We do not launch a fresh synthesis process for every response. The service still requires installation, model download, and local audio verification. |
| [Voice Agents From Scratch: turn taking](https://github.com/pguso/voice-agents-from-scratch/blob/4c215bd4acd3247d87fa296326e005392938f0a4/06_real_time_systems/turn_taking/turn_taking.py#L208) | Model reuse, explicit turn lifecycle, and playback cancellation. | Versioned server turns reject stale replies; browser audio can stop independently from already-dispatched commerce work. The first UI uses push-to-talk. |
| [Pipecat: Groq voice example](https://github.com/pipecat-ai/pipecat/blob/a2cb3d60205f7555e2affe54e729ccd918360f8d/examples/voice/voice-groq.py) | Stage boundaries and lifecycle metrics. | The app uses ElevenLabs realtime dictation, optional HTTP synthesis and LangGraph for a bounded shopping workflow. Pipecat is a future continuous-audio reference, not an installed runtime dependency. |
| [Hermes: Kokoro service deployment](https://github.com/l0cut15/hermes-voice-assistant/blob/58b463f67a0f041c0db1d6e5af0e29fecc048d83/servers/kokoro-tts/docker-compose.yml) | Existing whisper.cpp/Kokoro service boundary for push-to-talk. | Our client is a browser and our business backend is Next.js. The private Kokoro boundary remains optional; its Whisper STT path is not part of the app. |
| [Swiggy VideoSDK agent](https://github.com/DeepBhupatkar/swiggy-voice-ai-agent-videosdk-mcp/blob/main/swiggy-voice-ai-agent-videosdk-mcp/swiggy_agent_one.py), `main` reviewed 19 October 2026; not commit-pinned | Separate `DeepgramSTT` → `GoogleLLM` → `CartesiaTTS` stages with MCP commerce. | We retain the stage separation with ElevenLabs inline dictation, structured Groq intent, optional Kokoro, and server-enforced cart/checkout controls. Source review only; no code copied and no claim that the provider stack is free. |

The reviewed Swiggy prototypes and Hermes had no detected license grant at these commits. They are architectural references; their source was not copied into this project. Dependency and model licenses are separate and recorded in [OPEN_SOURCE_STACK.md](OPEN_SOURCE_STACK.md).

## Contracts and SDK sources

### Free-text product search within a category

Reviewed **19 October 2026**, after discovery through Brave Search:

- [Vercel Commerce search input](https://github.com/vercel/commerce/blob/main/components/layout/navbar/search.tsx) submits a free-text query; its [search page](https://github.com/vercel/commerce/blob/main/app/search/page.tsx) passes that query to the commerce provider and displays returned products and a query-specific empty state. These `main` references are not commit-pinned. We reviewed the source, did not run the reference app, and copied no application code.
- SayCart adapts that provider-backed search pattern to Swiggy MCP. `src/lib/catalog-search.ts` keeps the category and typed words separate, composes a bounded query such as `healthy snacks`, and avoids appending the same scope phrase twice. `src/app/page.tsx` adds the category search field, reset and search-all controls. The reference uses Shopify and does not establish an identical Swiggy category-refinement implementation.
- Swiggy's [search contract](https://mcp.swiggy.com/builders/docs/reference/instamart/search_products/) accepts a product/category/brand query with an address and pagination offset. It does not expose a category-ID filter in this tool. We send category context as text and let Instamart return relevant products; we do not infer nutrition or silently filter a previously loaded page.
- Searches run on Enter/button submission, without an extra model call or per-keystroke requests. Load more uses the successful server query rather than the edited draft. Failed requests retain the last successful result heading; unrelated search/address changes clear the category context. The new category UI and query helper have not been executed or tested, following the user's instruction to skip testing.

### Other provider and schema sources

- [ElevenLabs client streaming](https://elevenlabs.io/docs/eleven-api/guides/how-to/speech-to-text/realtime/client-side-streaming), [single-use tokens](https://elevenlabs.io/docs/api-reference/tokens/create), and [official client SDK](https://github.com/elevenlabs/packages/tree/main/packages/client): installed version 1.28.0 was source-reviewed for partial/committed transcript events, microphone lifecycle, manual commit and worklet delivery. The app mints tokens server-side and renders words directly into the originating field. This is source review, not a live validation. The SDK worklet is reused with its MIT notice; this is separate from the no-copy policy for unlicensed application references.

- [Zod JSON Schema support](https://zod.dev/json-schema): `src/lib/contracts.ts` owns public request/response shapes and structured intent. Groq receives JSON Schema derived from the same Zod schema, and its returned JSON is validated again.
- [Groq structured outputs](https://console.groq.com/docs/structured-outputs): strict JSON Schema is used for intent extraction. Tool execution happens on the server after validation; it is not attached to the structured-output model request.
- [LangGraph graph API](https://docs.langchain.com/oss/javascript/langgraph/graph-api): `src/server/agent.ts` uses a bounded workflow and tool hooks. A second orchestration framework is unnecessary for this first flow.
- [Official MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk): the installed SDK supplies OAuth discovery/registration/PKCE and Streamable HTTP; `package-lock.json` records the installed version.
- [Swiggy authentication](https://mcp.swiggy.com/builders/docs/start/authenticate/): the adapter limits discovery and credential-bearing requests to the configured official origin, persists rotating tokens, consumes callback state once, and adapts the SDK token form fields to Swiggy's documented JSON token endpoint.
- Published provider shapes inform Zod schemas for [addresses](https://mcp.swiggy.com/builders/docs/reference/instamart/get_addresses/), [search](https://mcp.swiggy.com/builders/docs/reference/instamart/search_products/), [cart](https://mcp.swiggy.com/builders/docs/reference/instamart/get_cart/), and [payment choices](https://mcp.swiggy.com/builders/docs/reference/instamart/get_payment_options/). Required shape changes produce a visible error. Textual success messages cannot substitute for validated data.

No reviewed repository implements our exact complete combination. We combine established component boundaries and add explicit server validation, owner isolation, quote confirmation, and failure handling.

## Verification boundary

`tests/swiggy.test.ts` exercises the genuine MCP SDK against synthetic network responses: dynamic registration, PKCE, callback replay rejection, JSON token exchange, and a JSON-RPC address call. It also checks owner isolation, response schema failures, variant identifiers, and checkout preflight/submission boundaries. These are contract tests, not evidence of provider access.

Account verification and the current limitations are recorded in [VERIFICATION.md](VERIFICATION.md). The gateway supports guarded full-cart replacement and quote-confirmed checkout; automated tests inject network responses instead of purchasing groceries. Removing local credentials through Disconnect does not claim to revoke the user's remote Swiggy session.
