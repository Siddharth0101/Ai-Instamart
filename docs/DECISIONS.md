# Design decisions

## Implementation decisions · 20 October 2026

- **Zod 4** owns structured input/output, TypeScript types, and Groq JSON Schema. Schema validity is followed by server semantic checks.
- **One orchestration runtime:** LangGraph state nodes, LangChain tool wrappers, official Groq SDK, and official MCP SDK. Google ADK is deferred to avoid overlapping workflow ownership. Development shell/glob/grep/read/write tools are not shopping-agent permissions.
- **Local PGlite persistence:** embedded PostgreSQL makes the pilot runnable without a daemon. It replaces the earlier Prisma proposal for this build. Shared PostgreSQL, production authentication and migrations remain a release gate.
- **Live-only commerce:** the UI and API use connected Swiggy data. Synthetic providers are confined to tests. Direct catalog search and deterministic cart/review controls do not use LLM tokens; the assistant uses configured Groq reasoning.
- **Checkout human confirmation:** this implementation uses explicit UI review/confirm, immutable quotes and durable business-state gates. Voice confirmation and persistent LangGraph interrupts/checkpoint resume are not shipped.
- **Observed boundary:** official OAuth, live catalog/cart/bill/payment mapping and explicit review are implemented. Earlier account checks reached review without placing an order. Purchase completion, recovery and final edits remain unverified; testing stopped at the user’s request.


**Status:** design record with implementation updates above. Earlier decisions below describe broader release targets where labeled proposed.

## D-001: Official Instamart MCP is the commerce integration

**Status: confirmed product direction.** The user selected Swiggy Instamart MCP for product discovery, cart operations, and ordering. Use the official, authorized connection described in [SWIGGY_MCP.md](SWIGGY_MCP.md). Test fixtures support verification. Browser scraping and an invented Swiggy REST API are outside this design.

## D-002: Start with one full-stack TypeScript application

**Status: selected implementation target.** Use Next.js pages and route handlers, with domain logic behind server modules. Run narrow private speech inference services alongside it; Next.js remains the only business backend and the only MCP executor. Revisit a realtime transport or separate worker if accepted requirements need one.

## D-003: Start with push-to-talk and text fallback

**Status: selected implementation target.** Explicit recording sessions simplify the interaction and make listening visible. Show transcripts and support correction. Start with English, then evaluate Hindi and Hinglish with separate test sets. Use inline ElevenLabs dictation and optional Kokoro as described in D-008.

## D-004: Keep action authority in server code

**Status: proposed implementation rule.** The intent component produces typed candidates. Server code validates user/session ownership, selected product identifiers, allowed operations, and current state. Provider or product text cannot grant tool permissions. Checkout is a distinct server operation with confirmation evidence.

## D-005: Use a short-lived checkout quote

**Status: proposed.** Bind each quote to its owner, session, provider cart fingerprint, full bill, address, and selected payment method. The initial expiry is **120 seconds**, configurable after measurement. Any relevant change invalidates confirmation; expiry alone does not guarantee the provider's price is unchanged. Re-fetch before submission.

## D-006: Record attempts and reconcile uncertainty

**Status: proposed.** Persist checkout attempts, app-local deduplication keys, and provider results in PostgreSQL. The current local pilot uses PGlite transactions; the originally proposed Prisma deployment remains deferred. A timeout can mean the provider acted without our receiving a response. Mark it unknown and reconcile before another checkout. Local deduplication does not promise provider-side exactly-once execution.

Use a durable user/provider checkout gate across quotes, app instances, and reconnects. Verify stable provider-account identity and account-scoped coordination before multi-user purchasing; a controlled single-user pilot is the limit until then.

## D-007: Separate application state from provider state

**Status: proposed.** Our API uses normalized states and integer paise for INR amounts. Preserve provider identifiers and statuses separately; validate and translate provider responses at the adapter boundary. Do not infer payment success from a generic successful tool response.

## D-008: Inline ElevenLabs dictation with Groq reasoning

**Status: implemented, updated 20 October 2026.** Following the user’s provider and UX choice, use ElevenLabs `scribe_v2_realtime` to put partial/final words directly into the originating input. A protected server route mints single-use tokens; the account key stays private. Unused batch transcription and local audio decoding have been removed. Optional Kokoro-82M with English `af_heart` supplies spoken replies. Use Groq `openai/gpt-oss-20b` for bounded structured intent within the account’s allowance. This replaces the provisional local Ollama/Qwen direction in favor of the user's hosted reasoning choice. See [OPEN_SOURCE_STACK.md](OPEN_SOURCE_STACK.md) for official sources and alternatives.

Keep a Groq adapter behind the server boundary. Use non-streaming strict JSON Schema intent extraction without attached tools/MCP; the app validates and executes actions separately. Free-plan exhaustion returns an actionable state without upgrading or falling back to a paid provider. Inline audio goes directly to ElevenLabs; necessary submitted transcript/context goes to Groq for intent. The complete system is not offline or entirely self-hosted.

One neutral clip succeeded through hosted turbo transcription; that is not a comparative benchmark and does not verify ElevenLabs credentials or live microphone capture. Measure grocery accuracy, pronunciation, latency, resource usage, and quota consumption before release. This choice does not assert a universally best model.

**Replacement condition, 20 October 2026:** switch to an open alternative only when equivalent or better for this application's live dictation. The [source and benchmark review](SPEECH_ALTERNATIVES.md) found credible Voxtral Realtime, Nemotron 3.5, Qwen3-ASR and WhisperLiveKit candidates, but no established equivalence for this app's Hinglish/product-name/hardware conditions. Retain the current provider; no runtime, dependency or credential changes were made for this review.

## D-009: Use source-reviewed voice patterns and an existing TTS service

**Status: selected implementation target, 18 October 2026.** The [reference architecture review](REFERENCE_ARCHITECTURES.md) verifies comparable Swiggy/MCP web flows, a local-speech/Groq desktop pipeline, reusable speech-server lifecycle, and realtime framework examples. Adopt adapter separation, server-owned MCP, authoritative result cards, model warmup/reuse, explicit turn versions, cancellation boundaries, and per-stage timing.

Use upstream Kokoro-FastAPI as the self-hosted TTS integration baseline instead of building a custom synthesis server. Keep its deployment/configuration in `services/kokoro/` and expose only approved speech through the app. Pin a tested service release and model artifacts during scaffolding. Keep open ASR alternatives as research and Kokoro as an optional output candidate; the [matched comparison](TESTING.md) determines the eventual model/voice settings. These are source-review conclusions, not measured performance results.

## Decisions still needed

| Decision | Evidence needed |
| --- | --- |
| Tested local speech artifacts and settings | Pin engine/model revisions; measure grocery accuracy, pronunciation, formats, and resource use |
| Groq account setup and tested API/SDK version | Verify model access, account limits, structured intent behavior, retry handling, and data controls |
| Runtime, framework, and dependency versions | Supported versions verified during scaffolding |
| Application sign-in method | How users authenticate to this app separately from Swiggy OAuth |
| Hosting and secret storage | HTTPS callback support, encryption/rotation, operational ownership |
| Data retention periods | Product need, selected providers, deletion implementation, and pre-release review |
| Public repository license | Owner selection before distributing code under a license |

Add a new entry or revise the affected decision when these choices become concrete. Update the architecture and development guide in the same change.
