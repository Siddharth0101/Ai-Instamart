# Application API

## Implemented local pilot

**Status: 21 October 2026.** The current implementation uses the routes below. [Shared Zod contracts](../src/lib/contracts.ts) define the accepted fields and response models. These are application routes, separate from [Swiggy MCP](SWIGGY_MCP.md).

The browser receives a random HttpOnly, SameSite=Lax owner cookie from bootstrap; this isolates local browser data and is **not production account authentication**. Every POST requires the configured same-origin `Origin`, `X-CSRF-Token`, and `Idempotency-Key` headers. JSON bodies are bounded to 16 KiB. JSON responses include `requestId`; audio and API redirects include `X-Request-Id`. Errors currently contain `error.code` and `error.message`, without a `retryable` field.

Development root-page navigation through the other same-port `localhost` / `127.0.0.1` alias redirects to the configured canonical origin before bootstrap and OAuth. API routes continue to enforce the exact configured Host and POST Origin; this page redirect does not permit alternate API origins.

| Method and implemented route | Request and result |
| --- | --- |
| `GET /api/bootstrap` | Establish/reuse the local owner cookie; return current session ID/mode, CSRF token, provider connection flag, and configured speech/Groq capability flags, including `realtimeStt` for ElevenLabs dictation. Flags indicate configuration, not a completed health check. |
| `POST /api/session` | `{mode: "live"}` → `201` and a complete session view. Demo mode is rejected. Existing live sessions are reused; legacy sample sessions migrate on bootstrap. |
| `GET /api/session` | Current owner-scoped session view. Wait for the owner's request queue, recover any orphaned activity marker, and refresh saved addresses, the actual cart/bill and payment methods when connected. Recovery does not replay interrupted operations or clear checkout gates. |
| `POST /api/search` | `{sessionId, query, expectedTurnVersion, expectedCartRevision, loadMore?}` → live session with normalized products and `{query, hasMore}` search metadata. Read-only commerce search bypasses the LLM. The server owns provider offsets, validates the saved query/address, deduplicates variants, and stores at most 500 results. |
| `POST /api/turn` | `{sessionId, text, expectedTurnVersion, expectedCartRevision, displayedProductIds?}` → updated session view after bounded intent/workflow execution. The UI sends up to 20 displayed IDs in screen order; the server requires unique IDs from the current catalog and uses trusted product data for positional references. An explicit empty list stays empty; omission uses catalog order for older/internal callers. This route cannot approve checkout. |
| `POST /api/cart` | `{sessionId, productId, quantity, expectedCartRevision}` → updated live session. Quantity zero removes that line; stale revisions fail. |
| `POST /api/address` | `{sessionId, addressId}` → updated session after validating a returned saved address. |
| `POST /api/payment` | `{sessionId, paymentMethodId}` → updated live session after validating an offered option. |
| `POST /api/stop` | `{sessionId, expectedTurnVersion}` → updated session with pending work superseded. It does not claim remote cancellation. |
| `POST /api/quote` | `{sessionId, expectedCartRevision}` → `{quote}` with full cart/address/payment summary, 120-second expiry, and quote-specific challenge. The server rechecks the live cart and selected payment. |
| `POST /api/confirm` | `{quoteId, challenge}` → `{attempt}`; `201` on known provider completion, `202` for pending/unknown states. The server validates the quote and persists the attempt/gate before dispatch. |
| `GET /api/attempt/:attemptId` | `{attempt}` for an owner-scoped persisted attempt. This is read-only and does not submit or retry an order. |
| `POST /api/transcribe/token` | Strict `{sessionId}` for the current owner → `{token}` containing a single-use ElevenLabs Realtime Scribe token. Requires owner/session validation, same-origin CSRF protections and a request key. The account key stays server-only; speech tokens are never persisted, logged or replayed from idempotency storage. This route does not transmit audio or invoke shopping. |
| `POST /api/speech` | `{sessionId, assistantMessageId, expectedTurnVersion}` → `audio/wav` from approved stored assistant text. Freshness is checked before and after synthesis. This requires a request key, but does not cache/replay audio by key. |
| `GET /api/integrations/swiggy/connect` | Top-level navigation starts per-owner SDK OAuth discovery/registration/PKCE and redirects to official Swiggy authorization. |
| `GET /api/integrations/swiggy/callback` | Exchanges `code` only after atomically consuming matching, unexpired owner-bound state; stores credentials encrypted and redirects to the app. |
| `POST /api/integrations/swiggy/disconnect` | `{}` → `{disconnected: true}` after removing local credentials. Does not claim remote-session revocation. |

Except speech synthesis and single-use speech-token creation, implemented POST operations persist idempotency records scoped to owner/path/key; reusing a key with different input fails. In-progress records after an interruption require status review rather than blind mutation replay. Local rate limits are per process and are not a distributed production quota service.

Unknown route paths return `404` before allocating rate-limit buckets or persisted request records. Concurrent session-start requests for an owner reuse the same transactionally selected session.

Current checkout confirmation is a deliberate UI button carrying the current quote challenge. Voice/text purchase confirmation events, provider payment polling/finalization, live order history/reconciliation, production sign-in, and the longer route layout below are future work. No route exposes arbitrary MCP calls, filesystem access, or shell execution.

## Additional implemented verification routes

- `GET /api/attempt/current` returns the authenticated browser owner's latest attempt (an unresolved gate takes priority), including after a reload or new session.
- `GET /api/integrations/swiggy/diagnostics` discovers live schemas and probes saved-address reads, returning only redacted shapes.
- `GET /api/integrations/swiggy/verification` requires an owned live session and an explicitly selected returned address. It checks discovery, addresses, a fixed milk search, current cart and payment options, and persists a non-sensitive check summary. It never changes the provider cart or submits checkout.

Idempotency fingerprints ignore JSON object key order while retaining array order; prior stored keys remain supported. Inline dictation uses single-use tokens and has no multipart upload or audio-hashing path. Owned speech synthesis revalidates message ID and turn version after generation, and the browser discards late audio/transcripts after cancellation.

## Proposed production contract

The remaining sections describe the target API and do **not** document currently available routes or implemented capabilities. They retain the richer transcript, payment, reconciliation, and production-authentication design for subsequent work.

## Common rules

- Require an authenticated app session and ownership checks for every resource, including transcript, quote, attempt, and order IDs. Provider commerce calls additionally require the user's connected Swiggy account.
- Use same-origin requests, secure cookie sessions, CSRF protection for cookie-authenticated mutations, and typed request/response validation. OAuth callbacks validate their own state and PKCE binding.
- Require `Idempotency-Key` on application POST mutations. Scope it to user and operation; bind it to the normalized request body. Repeating the same request returns its existing result; reusing a key for a different request returns `409`.
- Represent money as integer minor units plus ISO currency. Use UTC ISO-8601 timestamps and opaque IDs. Provider references are opaque; examples below do not specify provider formats.
- Return a `requestId` on every JSON response; audio and redirects carry an `X-Request-Id` header. Never return OAuth tokens or raw provider errors containing sensitive data.
- Associate conversation work with server-owned `turnId` and monotonic session `turnVersion`. Reject a stale `expectedTurnVersion` before new inferred actions; use the IDs/version to suppress stale transcript, response, and audio playback.

Error shape: `{ "error": { "code": "QUOTE_EXPIRED", "message": "Review a fresh checkout summary.", "retryable": false }, "requestId": "req_01" }`.

Use `400` for invalid input, `401` for missing app authentication, `403` for rejected CSRF/origin, `404` for missing or inaccessible resources, `409` for stale state/key conflicts, `413` for oversized audio, `415` for unsupported media, `422` for unresolved input, `429` for limits, and `502/503` for provider availability failures. A provider connection requiring sign-in returns an actionable `PROVIDER_REAUTH_REQUIRED` code. An uncertain checkout returns an attempt resource with `202`, not a generic failure inviting a retry.

## Routes

| Method and route | Request and behavior |
| --- | --- |
| `POST /api/sessions` | Create an app conversation session; return `201` with session ID, initial `turnVersion: 0`, state, and provider connection status |
| `POST /api/sessions/:sessionId/transcripts` | Multipart audio upload with purpose metadata; return a server-created transcript ID, creation time, and editable text; validate limits/formats before STT; confirmation uploads bind the current quote/challenge |
| `POST /api/sessions/:sessionId/turns` | Accept typed text or an owned transcript ID plus `expectedTurnVersion`; return server turn IDs/version, assistant text, validated intent outcome, clarification choices, and current app cart revision when relevant |
| `POST /api/sessions/:sessionId/stop` | Accept the known `expectedTurnVersion`, supersede pending work where possible, and return current version/affected turn plus any dispatched action references; never claim remote cancellation |
| `POST /api/sessions/:sessionId/speech` | Accept an owned current `assistantTurnId` and `expectedTurnVersion`; synthesize approved text and return supported `audio/*` with `Cache-Control: no-store` and turn metadata; formats/limits selected during scaffolding |
| `GET /api/sessions/:sessionId/addresses` | Fetch paginated saved addresses for selection, including owner-only delivery details |
| `POST /api/sessions/:sessionId/address-selection` | Select a returned `addressId` before discovery; refresh address-dependent data and invalidate earlier product selections, cart snapshots, and quotes |
| `GET /api/sessions/:sessionId/cart` | Fetch live cart and return normalized lines, availability, total breakdown, revision, and fetched timestamp |
| `GET /api/sessions/:sessionId/checkout-options` | Fetch payment choices for the selected address/current cart; return opaque IDs and display labels |
| `POST /api/sessions/:sessionId/checkout-selection` | Select a returned `paymentMethodId`; validate against current provider options and invalidate earlier quotes |
| `POST /api/sessions/:sessionId/quotes` | Accept `expectedCartRevision`; fetch live checkout inputs and issue an immutable quote, complete summary, expiry, and confirmation challenge |
| `POST /api/orders/confirm` | Accept a quote ID and explicit user-confirmation evidence; revalidate, persist the attempt, then submit checkout; return `201` for a known created result or `202` while pending/uncertain |
| `GET /api/checkout-attempts/:attemptId` | Return normalized aggregate state and the full order/payment result array; reconcile through safe provider reads when needed |
| `POST /api/checkout-attempts/:attemptId/payment-confirmation` | Verify successful provider payment and, only if still needed, complete the original order with stored references; never issue another checkout |
| `GET /api/orders/:orderId` | Fetch status for an owned application order result using its stored provider reference |
| `GET /api/integrations/swiggy/connect` | Begin user-bound OAuth/PKCE authorization through a top-level navigation; redirect to the official authorization flow |
| `GET /api/integrations/swiggy/callback` | Validate one-time state, initiating app session, trusted issuer, exact redirect URI, and PKCE binding; exchange the code server-side, persist the encrypted connection, and redirect to the app |
| `POST /api/integrations/swiggy/disconnect` | Revoke access where supported and remove stored provider credentials |

The initial API uses conversation turns for explicit add/remove/quantity requests. It does not expose a general MCP proxy or arbitrary tool-call endpoint. Cart mutation outcomes include the resulting revision; stale revisions require refresh. Polling and reconciliation use bounded rates and do not reissue checkout.

## Conversation input

```json
{
  "input": { "kind": "text", "text": "Add two 500 ml packets of milk" },
  "purpose": "conversation",
  "expectedTurnVersion": 2,
  "expectedCartRevision": 3
}
```

Audio input uses `{ "kind": "transcript", "transcriptId": "tr_01" }`; the server verifies session ownership. Display the returned transcript for correction and require a deliberate submit action before sending a cart-changing turn. Ordinary conversation turns can search, clarify, and edit the cart, but cannot confirm checkout implicitly. Speech synthesis accepts owned assistant turns, never arbitrary client text or a client-supplied fetch URL; audio playback must not feed back into microphone actions.

Decode and normalize uploaded audio against the pinned STT service contract; verify MIME, encoding, channels, sample rate, and duration rather than changing headers alone. A transport-level upload/capture ID lets the UI discard late transcription results. Accepting a new turn atomically advances its session version; serialize or supersede prior work before dispatching another inferred action. Stopping the active turn advances its version and invalidates pending work; the client stops playback immediately. Any already-dispatched commerce action still requires authoritative status reconciliation; its result cannot be hidden or retried simply because the originating turn stopped.

The stop request uses the version known when the pending input was submitted, so it works before the client receives a server turn ID. Atomically accept it only if it matches the current session version or the stored base version of the still-active turn; otherwise return `409` with the current version without stopping a newer turn. Advance the version even if the pending input has not yet been accepted, so that delayed input fails its stale-version check. Return the resulting `turnVersion`, affected turn ID when known, and dispatched commerce references. For example, input submitted at version 2 becomes turn version 3; a stop for its base version 2 invalidates it and returns version 4.

For explicit voice/text confirmation, use `purpose: "confirm_quote"` with `quoteId` and `confirmationChallenge` after the current summary has been issued. The server validates a dedicated affirmative user turn, records its evidence, and returns a `confirmationEventId`. Confirmation audio must be captured/uploaded after summary issuance and bound to that quote/challenge when the transcript is created; an older owned transcript cannot be reattached to a new quote. Consume each confirmation transcript/event once. Ambiguous or negative responses never create evidence. A model-generated turn cannot supply it.

## Quote response

```json
{
  "quote": {
    "id": "quote_01",
    "sessionId": "session_01",
    "cartRevision": 4,
    "lines": [
      { "productRef": "opaque-product-reference", "name": "Milk", "quantity": 2, "unit": "500 ml", "lineTotalMinor": 12400 }
    ],
    "address": { "id": "opaque-address-reference", "label": "Home · Bengaluru", "reviewAddressText": "Flat 12, Example Apartments, Example Road, Bengaluru, Karnataka 560001" },
    "paymentMethod": { "id": "opaque-payment-reference", "label": "Cash on delivery" },
    "totals": { "itemsMinor": 12400, "feesMinor": 2500, "discountMinor": 0, "totalMinor": 14900, "currency": "INR" },
    "expiresAt": "2026-10-17T05:32:00Z",
    "summary": "2 × 500 ml milk. Deliver to Flat 12, Example Apartments, Example Road, Bengaluru, Karnataka 560001. Total ₹149.00 including ₹25.00 fees. Pay cash on delivery."
  },
  "confirmationChallenge": "opaque-single-use-challenge",
  "requestId": "req_02"
}
```

This simplified example uses a synthetic address and illustrative payment option; availability must come from the provider. `reviewAddressText` is owner-only final-review data, not a routine masked label. Include all provider-returned material charges/discounts and payment requirements in the actual summary. The proposed quote lifetime is 120 seconds; the server owns expiry and the immutable snapshot.

## Confirm request and result

```json
{
  "quoteId": "quote_01",
  "confirmation": {
    "kind": "ui_action",
    "challenge": "opaque-single-use-challenge"
  }
}
```

`ui_action` is a labeled user action after displaying the current complete summary. A dedicated voice/text confirmation instead sends `{ "kind": "confirmation_turn", "confirmationEventId": "confirm_01" }`. The server records user/session/quote IDs, challenge binding, summary-issued time, action time, evidence kind, and turn reference where applicable. These are app-owned evidence fields, not provider parameters.

Before calling checkout, verify ownership, freshness, evidence, live cart fingerprint, address, payment method, and exact amount/currency. Atomically claim the durable checkout gate before dispatch; a different quote or key cannot bypass an active attempt. Reconnection does not clear unresolved attempts. Changed inputs return `409 QUOTE_CHANGED`; expiry returns `409 QUOTE_EXPIRED`. Both require a fresh summary and explicit confirmation. Never accept `confirmed: true` from model output as evidence.

```json
{
  "attempt": {
    "id": "attempt_01",
    "quoteId": "quote_01",
    "state": "payment_pending",
    "results": [
      { "orderId": "order_01", "storeRef": "opaque-store-reference", "orderState": "accepted", "paymentState": "pending" }
    ],
    "nextAction": { "kind": "await_payment_status" }
  },
  "requestId": "req_03"
}
```

`results` always remains an array because checkout may involve multiple stores. Map documented provider results to the enums in [DATA_MODEL.md](DATA_MODEL.md); retain raw statuses server-side. Payment pending, partial success, and unknown outcomes remain distinct. Any provider payment action is returned only when actually supplied and validated; do not invent a payment URL.

Payment-status reads remain read-only. If successful payment still requires `confirm_order`, the client invokes the payment-confirmation POST for that owned attempt, or an explicitly configured server worker performs the same operation. Accept no new cart/payment/order identifiers from the client: use stored references, verify live payment success, and skip confirmation if already confirmed. This completes the original authorized purchase; quote expiry gates initial checkout dispatch, not completion of an existing paid attempt. Return an updated attempt or an unresolved state, never place another order to recover payment.

On a timeout, persist `outcome_unknown` and return `202` with the existing attempt ID and status route. A repeated confirmation key returns that attempt. Block further checkout until reconciliation establishes the previous result; do not blindly repeat the provider call or imply that a local key guarantees provider deduplication.
