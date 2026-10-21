# Source review · 21 October 2026

This review covered the storefront and inline dictation lifecycle, shared contracts, Groq/LangGraph intent handling, application routes, shopping persistence and the Swiggy MCP adapter. It used source inspection only. No tests, typechecks, builds, benchmarks, app-browser checks or live speech/shopping calls were run, as requested.

## Changes from the review

| Finding | Change |
| --- | --- |
| Transcription punctuation in “Add the first one, please.” was treated as a multi-product request. | Ignore bounded leading/trailing courtesy clauses for this guard. Product-list separators and conjunctions still request clarification. |
| “Yoga mat” matched the Hindi negation word `mat`. | Exempt explicit English mat product compounds while retaining separate negations and corrections. |
| A server interruption could leave a persisted request permanently active. | Session refresh waits for the owner's request queue, clears orphaned activity, advances the turn version and reloads the provider cart. It does not replay the interrupted operation or clear checkout gates. |
| Concurrent initial requests could create two sessions for one owner. | Check and create the current session in one database transaction. |
| Next.js module reloads could discard the owner queue and cancellation controllers. | Retain the production runtime across module reloads, alongside the existing single-process database. Injected service factories remain isolated by default. |
| Unsupported API paths could allocate rate-limit entries and persist idempotency records. | Reject unknown paths before session lookup, rate-limit allocation or request persistence. |
| Local price sorting or availability filtering could make “the first one” refer to a different product on the server. | Send a bounded list of displayed product IDs; resolve them against trusted session products and use that order for positional references. Preserve the complete catalog and pagination state. |

## Reference implementations inspected

Discovery used Brave Search. Public source was read through the GitHub connector after the terminal download was unavailable. None of these reference applications was executed, and no application source was copied.

| Source | What the inspected code establishes | SayCart decision |
| --- | --- | --- |
| [Swiggy Voice Order MCP client](https://github.com/shekhartata/swiggy-voice-order/blob/0864459b75dca3fe4b2dc6f9b98da91412c85aaa/src/lib/mcp-client.ts) | Official TypeScript MCP SDK, Streamable HTTP, bearer authentication and cleanup after tool calls. | Retain the SDK boundary, owner-scoped credentials, schema validation and explicit cleanup. Reuse a connection within a shopping operation rather than reconnecting for every tool call. |
| [Swiggy VideoSDK voice agent](https://github.com/DeepBhupatkar/swiggy-voice-ai-agent-videosdk-mcp/blob/main/swiggy-voice-ai-agent-videosdk-mcp/swiggy_agent_one.py) | Independent Deepgram STT, Google LLM, Cartesia TTS, VAD/turn detection and MCP servers supplied to the agent. | Retain separate speech, reasoning and commerce responsibilities. Inline dictation does not require adding a room/telephony runtime. This reference uses different providers. |
| [ElevenLabs Scribe connection](https://github.com/elevenlabs/packages/blob/main/packages/client/src/scribe/connection.ts) | Partial/committed events, microphone track muting, explicit commit and microphone/socket cleanup. | Keep the installed official client, bounded final-commit wait and stale-event suppression. No SDK upgrade was made. |
| [Vercel Commerce search input](https://github.com/vercel/commerce/blob/main/components/layout/navbar/search.tsx) | A submitted free-text query determines commerce search navigation. | Keep explicit Search/Enter submission and provider search without an extra model request for each keystroke. |

The Swiggy Voice Order link is commit-pinned. The VideoSDK file was read from `main` with blob SHA `b39a495d7cdde50da2f641f2a102d3d04c9905d1`; the ElevenLabs connection file had blob SHA `9ab7a56c968a69476cbb9ad52c2582df13594b77`. These blob hashes identify the inspected file contents, not repository commits. The Vercel `main` link is unpinned.

## Performance decisions retained

- Direct product search bypasses Groq; submitted assistant requests use bounded context and one structured intent call.
- The compiled graph, Groq client, per-operation MCP connection and tool-schema validators are reused within their existing ownership boundaries.
- Dictation loads the SDK on demand; its clock updates independently and the catalog component is memoized.
- Default relevance order reuses the catalog array. Availability filtering runs only when selected, and price sorting copies the array before sorting so session data is never reordered in place.
- Catalog results, message history, traces, provider pages, audio duration and response sizes remain bounded.
- Cart and checkout reads that detect stale prices, quantities or addresses remain in place. Removing them solely to reduce request counts would change correctness guarantees.

Source review cannot establish recognition accuracy, service availability, end-to-end performance or a passing runtime. It does not establish that this is the fastest possible implementation. The user will perform runtime testing; historical observations and remaining limits are in [VERIFICATION.md](VERIFICATION.md).
