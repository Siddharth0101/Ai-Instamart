# Security and privacy plan

**Status:** local pilot with owner-scoped browser cookies, CSRF/origin checks, strict Zod requests, authenticated token encryption, bounded speech adapters, versioned turns, immutable quote confirmation and durable checkout claims. Synthetic commerce is enabled. Live purchases, production app sign-in/shared deployment, credential rotation and retention/deletion are not implemented. The broader requirements below remain release gates; do not interpret them as evidence that every planned control has shipped.

## Authorized connections

Keep application sign-in separate from the user's Swiggy OAuth authorization. Bind each provider connection to one authenticated application user. Enforce ownership on every session, cart view, quote, checkout attempt, and order request; a supplied identifier is not proof of access.

Use the official OAuth flow described in [SWIGGY_MCP.md](docs/SWIGGY_MCP.md). Keep access/refresh tokens and PKCE verifiers server-side, bind callback state to the initiating app session and trusted issuer, and validate the exact redirect URI. Encrypt credentials at rest, support revocation/disconnection, and never send secrets to the intent model, browser, analytics, or logs.

Use secure, HTTP-only session cookies, appropriate SameSite settings, origin checks, and CSRF protection for cookie-authenticated mutations. Require HTTPS for deployed traffic and callbacks.

## Voice and customer data

Ask for microphone permission when the user starts voice input. Display the listening state and a stop control. Avoid background or always-on recording. Always provide a text alternative.

The selected pipeline processes audio with local whisper.cpp and synthesizes approved text with local Kokoro. It sends necessary transcript text and compact context to Groq Cloud for intent processing. Minimize/redact that context; do not include OAuth tokens, full delivery addresses, payment secrets, or unnecessary history. Swiggy receives the required commerce operations. This is a hybrid architecture; do not claim all data stays on-device. See [the selected stack](docs/OPEN_SOURCE_STACK.md).

The default design does not retain raw audio after transcription. Buffer it only for processing and clear temporary data after completion or failure. Keep speech inference endpoints on loopback locally or private authenticated networking when deployed; browsers call only the app API. Check Groq data controls and applicable retention exceptions before launch, and describe the hosted processing accurately in the privacy notice. Do not promise unconditional zero retention.

Use Kokoro-FastAPI behind the private TTS adapter. Review its pinned version's diagnostic text logging, temporary audio/download behavior, and optional web/debug/tuning/upload routes; disable or isolate unneeded features and verify no customer text or address enters logs. An upstream development default is not a deployment policy.

Keep `GROQ_API_KEY` server-side. Allowlist the configured Groq endpoint/model and bound input, output, request count, and retries. Quota exhaustion must not activate paid services, change the account plan, or silently forward data to another provider.

Keep conversation text only for the active session by default. Persist structured cart/quote/attempt information needed for correctness and recovery. Redact personal details from diagnostic events. Define deletion, retention periods, backup expiry, and user-facing disclosures before accepting public users; do not claim that deletion controls exist until implemented.

Use masked addresses in routine UI and diagnostics. During final review, show the full selected delivery address to its authenticated owner so they can confirm it. Do not expose it to other sessions or users.

## Model and tool boundaries

- Treat user transcripts, product descriptions, and provider messages as untrusted input.
- Validate intent output against a narrow schema and an allowlist of shopping operations.
- Resolve IDs from authenticated provider results and verify their current context.
- Keep the MCP endpoint and OAuth destinations constrained by trusted discovery/configuration and explicit validation; do not fetch arbitrary model-supplied URLs.
- Prevent provider content from changing instructions, enabling tools, or confirming purchases.
- Expose only authorized read/cart capabilities to the intent layer. Keep checkout behind a separate server policy.

Limit audio size/duration, text length, request rates, concurrent operations, and session lifetime. Derive exact limits during implementation and test rejection behavior.

## Checkout controls

Require a fresh review of items, total with fees, delivery address, and chosen available payment method. Record a deliberate confirmation action or a dedicated voice/text confirmation turn bound to that exact quote. A model-generated boolean, an old approval, or an unrelated “yes” cannot authorize checkout.

Expire quotes after the proposed 120 seconds and invalidate them when relevant state changes. The client requires a fresh confirmation capture after the summary; server-created transcript records must follow that summary and bind to its quote/challenge, so old transcript records cannot be reattached as approval. Re-fetch provider state before submission and request renewed confirmation if it differs. Use a durable, atomic checkout gate across app instances, quotes, and reconnects; persist attempts before sending a mutating provider call. Verify stable provider-account identity and shared-account coordination before multi-user purchasing; until then, restrict live purchasing to a controlled single-user pilot.

Never blindly retry a timed-out checkout or automatically enable a provider duplicate override. Reconcile uncertain results. A local deduplication key cannot guarantee that an external provider executes only once. Report payment-pending, partial multi-order success, and unknown outcomes distinctly.

Do not capture payment credentials, card details, OTPs, or UPI PINs through conversation. Keep payment authorization within the official provider/payment flow. The assistant must not claim order cancellation support without a verified provider capability.

## Reporting a problem

No dedicated security contact has been configured yet. Report suspected problems privately to the repository owner through an available private channel, without posting credentials or customer data publicly. The owner should configure a contact and response process before public release.

If a secret is exposed, revoke or rotate it, disconnect affected sessions as appropriate, remove the exposure, and investigate access. Deleting a committed value alone does not revoke it. Record incident details without copying the secret into the report.
