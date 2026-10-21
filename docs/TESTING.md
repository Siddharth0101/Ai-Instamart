# Test and acceptance plan

## Executable checks · local pilot

Run `npm run typecheck`, `npm test`, and `npm run build`. With the local server running, `node scripts/smoke.mjs` checks the live-only API using a separate unconnected owner and never changes a live cart/order. Tests cover strict Zod schemas, Groq JSON Schema/usage through mocked transport, ambiguity/negation/quantities, hooks and stopped turns, owner isolation, quote expiry/change/challenge, concurrent deduplication, durable ambiguous-outcome gates, encrypted credential ownership, genuine MCP SDK OAuth PKCE/callback and JSON-RPC mocks, and bounded voice adapter responses.

These checks do not connect a real Swiggy account, place real orders, download models or prove real transcription/synthesis quality. Production API routes/voice confirmation and payment flows in the broader plan below are not all implemented. Account smoke tests and speech evaluations remain required before enabling their live behavior.


**Status, 21 October 2026:** testing resumed at the user’s request. TypeScript, all **108 automated tests**, the production build and local HTTP smoke pass. Brave recovery and an isolated synthetic shopping flow were checked on desktop and a 390 × 844 emulated viewport. The broader cases below remain release targets; live speech and purchases were not tested. Results and limits are in [VERIFICATION.md](VERIFICATION.md).

## Test boundaries

Use deterministic, synthetic provider fixtures by default. Automated tests must not reach live checkout. Inject fixture providers directly into `createShoppingService` in tests; HTTP callers cannot choose a fixture provider or demo mode.

Separate read-only live MCP smoke tests from mutation tests. Require deliberate operator action for any live cart change. A live checkout test is a real purchase unless the provider explicitly confirms otherwise; it requires the same current review and user confirmation as the product flow.

The selected browser stack is [ElevenLabs inline dictation, optional Kokoro replies, and Groq reasoning](OPEN_SOURCE_STACK.md). ElevenLabs is the only transcription provider; obsolete batch STT cases were removed. Token-adapter tests use mocked responses; actual microphone capture and recognition quality remain unverified. Automated tests use synthetic audio, model responses, and provider fixtures; live Groq requests are separate smoke tests consuming the account's allowance.

## Unit coverage

| Area | Required cases |
| --- | --- |
| Intent parsing | Search, add, update, remove, review, clarification, unsupported request |
| Model validation | Reject semantically wrong IDs/quantities even when strict JSON Schema is satisfied; no model-generated checkout authority |
| Quantities | Distinguish number of packs from pack size; reject zero/negative/invalid amounts |
| Product resolution | Missing brand, multiple sizes, unavailable match, stale selection |
| Cart operations | Preserve pre-existing items, use complete replacement payload, validate resulting cart |
| Money | Normalize provider units explicitly; integer paise arithmetic and complete bill totals |
| Quote binding | Owner/session/cart/address/payment/amount mismatch and 120-second expiry |
| Confirmation | Dedicated current confirmation accepted; stale/ambiguous/model-created approval and old transcript rebound to new quote rejected |
| Checkout attempts | Concurrent different quotes/keys across app instances, same-key replay, reconnect during unknown outcome, reconciliation |
| Status mapping | Pending payment, confirmed, partial result, failure, and unknown provider status |

## Adapter and server integration coverage

- OAuth callback state/PKCE handling, refresh failure, disconnected connection, and cross-user token isolation.
- Callback issuer/redirect/app-session binding and replay rejection; multi-user provider-account identity and shared-account coordination before wider purchasing.
- Dynamic tool discovery and schema validation; missing/changed tools fail with an actionable message.
- Paginated address discovery and explicit address selection.
- Existing remote cart contents, external cart edits, and full-cart replacement semantics.
- Provider timeouts, authentication errors, rate limits, malformed responses, and temporary unavailability.
- Live total or payment availability changing between review and submission.
- Persisted checkout attempt before dispatch; process restart with an in-flight or unknown attempt.
- No automatic checkout retry after an ambiguous response; local replay does not dispatch again.
- Pending payment proceeds through the appropriate verified provider flow before order success is announced.
- Status GETs do not mutate commerce state; payment confirmation verifies successful payment and uses the original attempt's references without dispatching checkout again, even if its original quote has since expired.
- Per-order multi-store partial success without reordering successful items.
- Ownership, CSRF, origin, schema, audio/text size, and rate-limit checks.
- Owner-only full delivery address in final review; masked routine views and safe, owned speech output.
- Prompt injection in a product description or provider message cannot invoke checkout or reveal credentials.
- Logs omit tokens, full addresses, raw audio, and unnecessary transcript text.
- Groq authentication failures, missing model access, truncated/refused responses, timeouts, and quota exhaustion dispatch no new model-inferred shopping action; honor `Retry-After` without paid fallback or duplicate action. Prior completed operations remain visible, and deterministic review/status/reconciliation flows do not require a model call.
- Strict structured-intent requests do not attach streaming, tools, or a remote MCP connection. MCP execution remains in the validated application service.
- Missing local speech assets, service crashes, readiness failures, and oversized input return recoverable errors; no hosted speech fallback occurs silently.
- Groq context excludes credentials, full delivery addresses, payment secrets, and unnecessary history; local speech endpoints are not browser/public APIs.
- Deterministic checkout summary text matches the immutable live quote; speech generation cannot amend its facts.
- Actual browser MIME decoding, downmix/resampling, service paths, API model/voice mapping, and output sample rates agree end to end; no relabel-only conversion.
- Speech workers load/warm models once, bound queues, and become ready only after a successful generation/transcription smoke check. Kokoro-FastAPI diagnostics and temporary-file options do not retain customer text/audio.
- Stop/supersede during STT, Groq, TTS, and playback rejects stale turn versions before new inferred actions and drops stale audio. A commerce action already dispatched still gets reconciled; stopping a turn never reports it cancelled remotely.
- Stop can address pending input before the server turn ID arrives, invalidates a delayed unaccepted input, and cannot stop a newer turn when an old stop request arrives late. Session creation and stop responses expose the version needed for subsequent input.

## End-to-end scenarios

| Scenario | Expected result |
| --- | --- |
| Clear request | Product options, chosen quantities, correct live cart, review, explicit confirmation, accurate result |
| Ambiguous “two milk” | Ask about pack size/brand as needed before selecting products |
| User correction | Correct transcript or quantity without duplicating the earlier action |
| Unavailable item | Offer available choices and wait for selection; no silent substitution |
| Existing cart | Show and preserve existing items; clear only on a deliberate request |
| Address change | Refresh product/cart validity and invalidate any earlier quote |
| Bill changes | Present updated bill and require a new confirmation |
| Microphone denied or speech fails | Visible explanation and working text flow |
| Speech playback | Assistant speech cannot trigger its own shopping/confirmation actions |
| Double confirmation or slow network | One local attempt; uncertain provider outcome reconciled before another submission |
| Payment pending | Show payment instructions/status; no premature success announcement |
| Multi-store partial success | Report each result and avoid resubmitting already successful orders |
| Stop/cancel command | Stop listening or pending local action; do not claim to cancel a submitted order |
| Session/connection expiry | Re-authenticate safely; do not silently replay a pending mutation |

## Voice evaluation

Build a versioned, consented or synthetic set of at least 30 English shopping utterances covering brands, sizes, quantities, corrections, and negation. Include quiet and noisy samples and multiple speakers. Add separate Hindi/Hinglish sets before promising those languages.

Measure intent and slot correctness, clarification frequency, cart accuracy after correction, time to first feedback, and time to a complete review. Record processing/network/provider latency separately so bottlenecks are visible. Do not report accuracy or latency targets as achieved without measured results.

Test silence and background noise for false transcription, grocery brands and negation for action correctness, and rupee amounts/pack units for intelligible spoken output. Measure cold/warm STT and TTS latency, Groq round-trip time and token consumption, and peak speech-worker memory under contention. Available RAM and deployment performance have not been established; do not reuse local-LLM memory assumptions for this hosted-reasoning design.

## Component selection before model lock

The [repository review](REFERENCE_ARCHITECTURES.md) justifies the service boundaries; it does not rank model accuracy. Keep model/runtime candidates replaceable until the following comparison is recorded:

| Layer | Compare | Evidence |
| --- | --- | --- |
| STT model | Current ElevenLabs Scribe v2 Realtime; future open alternatives only if replacement is being evaluated | Same grocery audio; exact brand/variant, quantity, unit, negation, and correction extraction; clarification and final-cart correctness |
| Mac STT runtime | Candidates in SPEECH_ALTERNATIVES.md on a matched decoding configuration | Same files, precision/decoding settings, cold/warm timings, peak memory; do not compare unlike model sizes as runtime speed |
| English TTS | Kokoro and Pocket TTS fixed voices | Same approved 5–20-word replies; grocery names, rupees, quantities, omissions/repetition, first playable audio, total time, memory, and listener intelligibility |
| Later Hindi/Hinglish | Separate ASR/TTS sets; include Kokoro Hindi and a multilingual challenger | Actual code-switched grocery phrases and pronunciations; English performance does not establish Hindi quality |

Use at least the 30 English requests above, including multiple speakers and noise conditions. Keep the audio, reference transcript/intent, hardware/software/model revisions, parameters, and raw results fixed and recorded for each run. Compare first-playable-audio latency at the browser as well as engine timing. Report sample size and failure cases; do not promote author benchmark numbers to project results.

Final-cart correctness must meet the existing release gate after clarification. Any test that changes a requested count/unit/negation or speaks a wrong purchase amount without correction blocks selection. Once correctness gates pass, use measured latency, intelligibility, memory, and deployment support to select the default and document the tradeoff. All comparisons remain unexecuted until the app and models are available.

## Release gates

1. The documented setup starts the app from a clean checkout; lint, type checks, build, and relevant automated tests pass.
2. The English evaluation set completes at least 90% of supported requests with the correct final cart, allowing necessary clarification. Document failures and sample composition.
3. Every authorization, stale-confirmation, duplicate-submission, and unknown-outcome case blocks unsafe submission in the test matrix. No fabricated identifiers, prices, or success messages.
4. The full fixture-based end-to-end suite passes without live commerce credentials or network calls.
5. A read-only authorized MCP smoke test verifies the actual selected account/address integration. Any live mutation or purchase verification is separately documented and explicitly authorized.
6. Production access/configuration, provider schemas, privacy disclosures, retention/deletion behavior, and operational ownership are reviewed before public use.

Record observed results, commands, fixture versions, and known limitations in each implementation change. Passing a fixture test does not prove live-provider compatibility.
