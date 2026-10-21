# Data model

## Implemented storage · local pilot

The current build uses a transactional PGlite `documents` table keyed by `(owner_id, kind, id)` with JSONB payloads and update time. Kinds include owner, session, OAuth, idempotency, quote, attempt, quote-to-attempt, and checkout gate. Checkout claims and quote consumption are atomic; the remote dispatch happens after the claim commits. OAuth blobs use AES-256-GCM with owner ID as authenticated data. Secrets never appear in browser DTOs.

This is embedded PostgreSQL in one process. The normalized production entities below and originally proposed Prisma migrations are not implemented. Records have no automated retention/deletion job yet; the data directory must remain private. A persisted active turn can be stopped through the versioned stop route after a restart. A persisted submitted/unknown attempt must remain blocked pending verified resolution; there is no automatic resubmission.


The following is the proposed normalized production model for PostgreSQL and Prisma, distinct from the implemented PGlite document store above and from Swiggy’s schema. Provider payload mapping is defined in [SWIGGY_MCP.md](SWIGGY_MCP.md).

## Conventions

Use opaque application IDs, UTC timestamps, and integer minor units for money: `14900` with `currency: "INR"` means ₹149.00. Keep quantities and units explicit; do not use floating-point money. Treat provider IDs as opaque strings and never infer their format.

All user-owned records include `userId` directly or through an enforced parent relationship. Authorization must verify that relationship on every read and write. A provider cart belongs to the connected provider account and may be shared by several app sessions; a session snapshot does not establish exclusive ownership.

## Entities

| Entity | Essential application fields and constraints |
| --- | --- |
| `User` | `id`, app-auth subject, creation timestamp; unique auth subject |
| `ProviderConnection` | `id`, `userId`, provider, verified stable provider-account reference when available, encrypted credentials, granted scopes, token expiry, connection status; unique active connection per user/provider for MVP |
| `OAuthAttempt` | `id`, `userId`, initiating app-session binding, trusted authorization-server identity, exact redirect URI, hashed state, protected PKCE verifier, expiry, consumed timestamp; single-use callback binding |
| `CommerceGate` | Unique user/provider scope, verified provider-account scope for multi-user coordination, active checkout-attempt reference, cart-operation lease/version; durable across credential rotation and reconnection |
| `ConversationSession` | `id`, `userId`, `connectionId`, state, current turn/version, selected address/payment references, timestamps |
| `ConversationTurn` | `id`, `sessionId`, version, base session version supplied with its input, parent input turn when applicable, role, input kind, purpose, processing/superseded state, dispatched action references, redacted text or protected content reference, normalized intent, timestamps; model turns cannot be confirmation evidence |
| `Transcript` | `id`, `sessionId`, source upload reference if retained, text, purpose, server capture/upload timestamps, expiry, consumed timestamp; confirmation inputs additionally bind quote/challenge and must follow summary issuance; language/confidence where available |
| `CartSnapshot` | `id`, `connectionId`, app revision, normalized lines, opaque provider cart reference if supplied, provider fingerprint, fetched timestamp |
| `CheckoutQuote` | `id`, `userId`, `sessionId`, `connectionId`, cart snapshot/fingerprint, selected address/payment snapshot, full total breakdown, currency, summary, state, created/expiry timestamps |
| `ConfirmationEvent` | `id`, quote/user/session IDs, kind, challenge hash, summary-issued timestamp, action timestamp, confirmation turn reference when applicable; immutable and single-use |
| `CheckoutAttempt` | `id`, quote/user/connection IDs, confirmation ID, local deduplication key, request hash, state, start/completion/reconciliation timestamps, redacted failure detail |
| `OrderResult` | `id`, `attemptId`, provider order/store/payment-tracking references if returned, normalized order/payment states, raw provider statuses, totals/currency when known, updated timestamp; payment tracking references remain server-side |
| `PaymentFinalization` | `id`, order-result/attempt references, local deduplication key, request hash, prepared/dispatched timestamps, dispatch/outcome state, reconciliation timestamp; completes only the original paid order |
| `IdempotencyRecord` | user/route/key scope, request hash, processing state, resulting resource ID, expiry; unique scoped key |
| `AuditEvent` | `id`, user/session/quote/attempt references where relevant, event type, redacted metadata, timestamp |

Address and payment snapshots contain only the data needed to compare and present a quote. Return masked address labels in routine views; expose the full provider-returned delivery address only to the authenticated owner during address selection and final review. Exclude it from logs and model context unless needed for an explicitly designed interaction. Persist payment method references or labels only, never card credentials or CVV.

## Normalized application values

These are proposed app enums, not provider values. Preserve the original provider status alongside each mapping. Unrecognized provider values map to `unknown`, with a reconciliation signal.

| Record | States |
| --- | --- |
| Provider connection | `connected`, `reauth_required`, `disconnected` |
| Conversation session | `active`, `awaiting_clarification`, `awaiting_confirmation`, `checkout_in_progress`, `closed` |
| Quote | `ready`, `consumed`, `expired`, `invalidated` |
| Checkout attempt | `prepared`, `submitting`, `accepted`, `payment_pending`, `partially_succeeded`, `failed`, `outcome_unknown`, `reconciling` |
| Order result | `pending`, `accepted`, `fulfilled`, `cancelled`, `failed`, `unknown` |
| Payment result | `not_required`, `pending`, `paid`, `failed`, `unknown` |
| Payment finalization | `prepared`, `submitting`, `confirmed`, `failed`, `outcome_unknown`, `reconciling` |

An accepted order with pending payment is not presented as a fully completed checkout. A multi-store attempt can contain accepted, failed, pending, or unknown results together. Aggregate attempt state follows the whole result set; a single successful result must not hide unresolved results. Use `failed` only when available evidence establishes failure without an unresolved side effect.

## Immutable quote snapshot

Store the exact normalized checkout inputs plus the provider-supplied facts needed for comparison: line identity/variant, quantity/unit, price, stock/availability when supplied, fees, discounts, taxes, final payable amount, address, and payment method. Compute a stable fingerprint over canonicalized values; do not hash display ordering or transient UI labels.

Keep the baseline provider cart fingerprint separately from the app revision. The revision detects stale requests within this app; the fingerprint detects observed provider changes. Neither is a provider lock. A quote expires 120 seconds after creation by default; configuration can change this proposed limit.

## Transactions and uniqueness

1. Before a cart mutation, verify ownership and the expected app revision. Use a durable gate/lease to serialize operations, fetch/compare the live cart, then persist the resulting snapshot. Database transactions cannot make an external MCP call atomic.
2. On confirmation, atomically claim the user/provider gate and a ready, unexpired quote, consume valid confirmation evidence, and create a unique prepared attempt. Enforce at most one checkout attempt per quote and one active attempt per gate across different quotes, keys, sessions, and app instances. Store it before issuing checkout.
3. Enforce a unique local deduplication key per user/operation and bind it to the request hash. A repeated key with the same request returns the existing result; a changed body returns a conflict.
4. After a provider response, persist the entire result array and aggregate state together. If the process ends before this write, the persisted submitting attempt is unresolved and must be reconciled.
5. Block another checkout while an attempt is prepared, submitting, payment pending, partially unresolved, unknown, or reconciling. Reconnecting or replacing credentials must not clear the gate. Release it only after a verified terminal resolution; time expiry alone is not proof that a dispatched purchase failed.

For multi-user ordering, verify a stable provider-account identity and coordinate gates/cart leases for that identity. Do not infer it from an address, token format, or guessed profile field. Until this can be verified, restrict live purchasing to a controlled single-user pilot; user-scoped coordination cannot detect one remote account linked by different app users.

An app transaction or local key never supplies provider-side idempotency. Do not invent an MCP idempotency field. If the provider offers no reliable lookup for an uncertain checkout, retain the unresolved attempt and require a verified resolution instead of retrying blindly.

## Retention and deletion

Define retention periods before launch for audio, transcripts, conversation turns, expired OAuth attempts, quotes, idempotency records, and audit events. Delete raw audio after transcription by default unless a documented feature requires retention. Encrypt credentials and sensitive stored content; keep secrets out of JSON debug payloads and fixtures. Disconnecting revokes provider access where supported and removes stored credentials. Account deletion must cover related app records subject to any explicitly documented retention requirement.
