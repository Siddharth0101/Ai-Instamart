# Roadmap

## Current implementation status · 20 October 2026

**Implemented:** pinned Next.js/TypeScript scaffold; shared Zod contracts; Groq structured intent; LangGraph/LangChain workflow with hooks; live all-category search with pagination, product cards, guarded cart and full bill review/confirmation; embedded PostgreSQL state/idempotency/attempt gates; inline ElevenLabs dictation with single-use tokens and partial/final text, plus optional Kokoro spoken replies; official MCP SDK OAuth/discovery and published read schemas; automated tests and local HTTP smoke scripts.

**Outstanding release work:** live purchase/payment completion and partial-order recovery, production sign-in/shared database/retention, comparative speech evaluation and browser microphone/audio acceptance. Earlier real account checks covered search, cart, full bill, payment selection and review without a purchase. Final improvements remain unverified after testing stopped at the user’s request. Voice confirmation and continuous conversation remain later work.

The milestones below retain release gates, not a delivery schedule or a claim that every acceptance criterion has passed. Current implementation status above takes precedence.

The primary integration throughout is the official Swiggy Instamart MCP service. Test doubles support repeatable verification; they are not the first product release. See [integration documentation](SWIGGY_MCP.md) for verified capabilities and unresolved provider questions.

## 1. Confirm the provider contract

Document connection setup, authentication, available tools and schemas, delivery-address selection, catalog behavior, cart replacement semantics, checkout/payment results, and supported reconciliation operations.

Gate:

- Record observed schemas and sanitized examples for every operation the MVP needs.
- Resolve which operations can run against a real account and which can cause live purchases; do not assume a sandbox exists.
- Document unsupported or unverified capabilities, including any gap that blocks safe checkout recovery.
- Record the provider connection and account-state design before implementing purchasing behavior.
- Verify a stable provider-account identity before multi-user purchasing; until then, constrain live purchases to a controlled single-user pilot and document the limitation.

## 2. Build the application foundation

Maintain the TypeScript/Next.js application, server-side MCP adapter, PGlite pilot persistence with shared PostgreSQL deferred, browser-owner sessions with production sign-in deferred, ElevenLabs inline transcription, optional Kokoro spoken replies, and Groq Cloud structured-intent adapter. The baseline is documented in [decisions](DECISIONS.md) and [stack selection](OPEN_SOURCE_STACK.md); current validation limits are recorded in [verification](VERIFICATION.md).

Gate:

- A developer can follow [development instructions](DEVELOPMENT.md) from a clean checkout using documented prerequisites and environment variables.
- Browser code contains no provider credentials; authorization and input-validation checks run on the server.
- Automated adapter tests cover successful responses, malformed tool data, authentication expiry, and network failures without placing live orders.
- Document and verify data retention, secret handling, and log redaction before storing customer data.

## 3. Deliver voice-led cart management

Add push-to-talk, editable transcription, text fallback, live search, product clarification, saved-address selection, and cart operations against the MCP adapter.

Gate:

- Every cart acceptance scenario in [product requirements](PRODUCT_REQUIREMENTS.md) passes, including preserving pre-existing items and distinguishing quantity from pack size.
- Microphone denial, speech failure, keyboard-only use, and reconnect flows complete through text input.
- A documented English evaluation set meets the sample size and cart-accuracy gate in [testing](TESTING.md), and records recognition, clarification, and task-completion results.
- Any real-account mutation check uses an explicitly chosen test account and a reviewed reversible cart change.

## 4. Deliver reviewed checkout and recovery

Implement live purchase review, single-use confirmation, server-controlled checkout, per-order outcomes, and reconciliation after an uncertain result.

Gate:

- All checkout acceptance scenarios pass, including changed totals, stale confirmation, duplicate requests, pending payment, partial success, and unknown outcomes.
- Fault-injection tests demonstrate that a checkout timeout cannot trigger a blind retry or an unsupported success message.
- Supported provider reconciliation behavior is verified and its limits are visible to the customer; unresolved safe-recovery gaps block purchase release.
- Any end-to-end live purchase is separately authorized with its exact cart, address, payment choice, and total. Automated tests never silently purchase goods.

## 5. Pilot, measure, and expand

Run a bounded English pilot, inspect failure reports with personal data removed, and refine clarification and recovery. Propose Hindi/Hinglish support only after the initial flow is reliable.

Gate:

- Define pilot size, task-completion target, acceptable clarification rate, and latency budget before collecting results; publish observed results against those targets.
- The pilot records zero duplicate purchases caused by the application and zero unsupported success claims; any occurrence blocks wider release until corrected and regression-tested.
- Test keyboard and assistive-technology flows, session recovery, and operational incident handling before widening access.
- Each additional language passes its own documented grocery, quantity, accent, and recovery evaluation before release.

Use [testing](TESTING.md) for the verification plan and [security](../SECURITY.md) for release safeguards. Revisit scope when the verified provider contract changes; do not infer capabilities from the roadmap.
