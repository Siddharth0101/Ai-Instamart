# Verification record

Updated **21 October 2026**. Testing resumed at the user’s request. The latest results below supersede the earlier paused-testing status; historical provider observations remain separate.

## Current verification · 21 October 2026

- `npm run typecheck` passes. The voice-test cleanup hook previously failed TypeScript checking; cleanup now uses `afterEach`.
- `npm test` passes **108 tests**, including added coverage for current bag stock/quantity limits, rejected Swiggy credentials, concurrent credential rotation and bounded ElevenLabs single-use token handling.
- `npm run build` passes with the installed Next.js 16.4.2. `TEST_DEV_REDIRECT=1 npm run test:http` passes against the local development server, covering canonical redirects, strict origins/CSRF, schemas, idempotency and owner isolation with a separate unconnected owner. `git diff --check` passes.
- Actual Brave testing reproduced an MCP HTTP 401 during session loading. The gateway now invalidates only the rejected credential version, reports `SWIGGY_RECONNECT_REQUIRED` and never replays the operation. Brave then shows **Connect Swiggy**, reports **Not connected** in the drawer and disables shopping until reconnection. No new account authorization, live bag edit, purchase or payment was performed.
- Brave also exercised an isolated temporary copy with a directly injected synthetic provider, in-memory storage, no copied environment/credentials and a separate `localhost` cookie host. Address selection, Snacks search, `healthy` → `healthy snacks`, empty-result messaging, reset, pagination **12 → 24 → 28**, ascending price sorting, in-stock filtering **24 of 28**, adding products, a two-pack quantity limit, payment selection and the full **₹50 items + ₹25 delivery = ₹75** review worked. A synthetic confirmation produced `qa-order-1`; it could not create a real order or payment.
- The bag’s keyboard focus trap, Escape dismissal and return to its opening control passed in Brave after fixing focus capture timing. The storefront and bag were visually checked in Brave at a **390 × 844** emulated viewport. The isolated flow showed no console errors. Live dictation remained disabled in this fixture.
- Focused frontend failure simulations verified that a failed order-status read retains a successfully loaded session; a session failure offers a read-only retry and preserves visible saved order status; connection rejection disables shopping and offers reconnection. These simulations and synthetic browser flows do not establish real provider catalog or speech compatibility.

Fixes also preserve cart item order during provider replacement, give newer bag stock/limits precedence over retained catalog results, and classify malformed speech-token responses as invalid provider data. The temporary fixture provider and transport diagnostics were not added to the production app.

## Source review · 21 October 2026

The [code review record](CODE_REVIEW.md) documents repository comparisons and fixes for courtesy punctuation, mat product names, interrupted requests, concurrent session creation, module-reload coordination, unsupported API paths and product-order references after UI sorting/filtering. Relevance-order rendering also avoids unnecessary array copying/filtering/sorting. Changed source was inspected, including a second review of request recovery and shared-runtime behavior. No tests, builds, typechecks, benchmarks or live app/provider checks were run; runtime validation is left to the user.

## Inline ElevenLabs change · 20 October 2026

The browser microphone flow was changed to inline ElevenLabs `scribe_v2_realtime` dictation, using the installed official client SDK and owner/CSRF-protected single-use token creation. Partial/committed text targets the originating input; capture is bounded, stop manually commits, and discard restores the previous draft. The SDK worklet is served from the app with its MIT notice. Installed SDK source and official integration documentation informed the implementation.

No tests, typechecks, builds, live token requests, microphone sessions or speech-provider validation were performed for this change. The supplied key is configured privately; its permissions, allowance and successful operation have **not** been validated. Earlier Groq speech results below are historical and do not validate ElevenLabs or the new UI.

## ElevenLabs cleanup · 20 October 2026

Removed unused batch transcription, ffmpeg/temporary-file processing, audio hashing, old recorder styles and the batch-only check script. Obsolete tests were removed and retained TTS fixtures now explicitly configure their service. The catalog uses a memoized component with the latest committed cart-action handler; the dictation timer updates only its own display, and static SVG definitions are reused. These are source-level optimizations, not measured speed improvements.

Private configuration inspection confirmed nonempty ElevenLabs, Groq, OAuth encryption and app-origin settings without printing their values. This does not validate credentials, service availability or microphone behavior. No tests, builds, typechecks, benchmarks, browser sessions or provider calls were run during this cleanup.

## Completed before testing stopped

- The earlier 18 October live-only build passed TypeScript checks, **88 automated tests**, a production Next.js build and local HTTP acceptance checks. Those results predate the latest storefront and voice changes.
- An intermediate version passed **93 automated tests**. Later focused agent/voice and shopping suites passed, along with TypeScript checks, before the stop request. These focused results do not establish a full-suite or production-build pass for the final edits.
- Isolated checks covered strict input/output schemas, ownership, CSRF, idempotency, MCP OAuth/JSON-RPC transport, cart conflicts, provider pagination, stopped turns, quote binding, duplicate confirmations and ambiguous checkout gates. Provider fixtures and mocked speech responses establish control behavior, not live provider or recognition quality.
- Brave used the actual Swiggy MCP connection and the saved **Sector 48 pg** address for live catalog search, cart changes and checkout review. No order, charge or payment was submitted.
- One non-sensitive audio fixture was transcribed through the application API and Groq’s real speech service. Its result and limits are recorded below.

## Actual catalog, cart and review observations

A direct headphones search displayed **20 variants**; **Load more** increased the result set to **27 variants**. This exercised a non-grocery query through the provider’s address-bound catalog and pagination. It does not establish that every category, product or address is available.

One **Hammer 3.5 mm Wired Earphones, 1 Piece** variant was added for ₹79. The provider returned this complete bill:

| Bill line | Amount |
| --- | ---: |
| Item total | ₹79.00 |
| Handling fee | ₹12.00 |
| Small cart fee | ₹23.60 |
| Delivery partner fee | ₹35.40 |
| **To pay** | **₹150.00** |

The review displayed this item, the **Sector 48 pg** address, **Pay on delivery**, the full bill and the quote expiry. The explicit **Place order** control was never pressed. An earlier review attempt encountered a changed/empty remote cart and stopped with `CART_CHANGED`; a subsequent explicit cart edit produced the successful review. No silent checkout retry occurred. When the existing app was opened solely to clean up the temporary item, the bag already showed zero items. No cleanup mutation was needed. No order was placed by us.

Earlier milk checks returned 20 product families and 42 variants, with availability changing between calls. A ₹30 pack produced a ₹101 payable with the same ₹12, ₹23.60 and ₹35.40 fee rows; quantity two produced a ₹60 subtotal and ₹131 payable. Those observations supported the INR-rupee to integer-paise mapping. The earlier milk packs were removed and an empty cart was observed at that time.

Nonempty carts exposed integer store IDs and a saved/composite versus cart/base address-ID difference. The adapter now normalizes integer IDs and uses exact structured address matching. When a write response could not initially be parsed, the application re-read the cart instead of replaying the write. Removing the final line uses the dedicated `clear_cart` operation; other edits preserve unrelated lines.

## Actual hosted speech observation

A generated neutral audio clip saying **“Find headphones on Instamart”** was sent through the application’s authenticated transcription route to Groq using **`whisper-large-v3-turbo`**. The returned transcript was **“Find headphones on Instamart.”** Returned audio duration was **1,638 ms** and the measured request elapsed time was **539 ms** in that single run.

The earlier batch route was later switched to **`whisper-large-v3`** without a live check and has since been removed. The current browser microphone UI instead uses ElevenLabs. The earlier clip does not verify browser microphone capture, real speakers, background noise, product-name accuracy, Hindi/Hinglish recognition, latency under load or account quota behavior. The former Unicode-preservation cases used mocked provider text and were removed with the unused batch adapter. No recognizer guarantees exact words; the UI preserves an editable transcript before submission.

The removed local whisper.cpp adapter was never run with an installed model; optional Kokoro synthesis also remains unvalidated. ElevenLabs configuration was added on 20 October, without validating credentials or making live calls.

## Earlier optimization measurements

These measurements predate the live-only service replacement. The benchmark now injects an isolated provider fixture and performs no network or speech calls; its current timings should not be compared directly with this table. Individual runs are sensitive to system load and are not service-level promises.

| Operation | Samples | Before median / p95 | After median / p95 |
| --- | --- | --- | --- |
| Session read | 100 | 0.88 / 1.32 ms | 0.60 / 0.91 ms |
| Cart edit | 30 | 1.58 / 2.05 ms | 1.26 / 1.61 ms |
| Complete offline search turn | 20 | 8.84 / 10.39 ms | 8.41 / 10.90 ms |

The offline turn tail did not improve in this run. A separate graph-only check with 10 warmup and 100 measured turns took 135 ms before and 116 ms after. Groq, MCP, disk durability and speech inference latency are outside these measurements.

Implemented optimizations include a reused compiled graph and Groq client, bounded model context, skipped writes for unchanged selections, owner-bound MCP/schema reuse, transactional rotating-token ownership, and direct catalog search without LLM tokens. These implementation choices are not end-to-end performance guarantees.

## Remaining verification boundary

No live purchase, charge, UPI completion, order recovery or multi-store purchase was executed. Checkout response handling was exercised with SDK network mocks. Pending/unknown attempts hold a durable gate; automatic payment polling and reconciliation remain unimplemented. The UI directs the user to check Swiggy and labels a local status refresh as such.

The latest UI recovery changes, full automated suite, production build and isolated Brave shopping flow are covered above. Real reconnection/catalog compatibility, the microphone-to-transcript path and broader speech quality still require live verification. Guidance is in [TESTING.md](TESTING.md) and service configuration is in [LOCAL_VOICE_SETUP.md](LOCAL_VOICE_SETUP.md).
