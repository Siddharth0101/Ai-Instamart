# Local development

**Status:** live-only local pilot. Shopping uses your connected Swiggy Instamart account. Demo mode is rejected by the API; synthetic providers exist only in isolated tests. See [implementation references](IMPLEMENTATION_REFERENCES.md) and [API status](API_CONTRACT.md).

## Setup

Use Node.js 22.12 or newer. Node 24.16.0 and npm 11.13.0 were used for this build. Dependency versions are pinned in `package.json` and `package-lock.json`.

```bash
npm ci
npm run dev
```

`bun run dev` runs the same development script after dependencies are installed; Node.js is still required. Open **http://127.0.0.1:3000/** in Brave or your browser. The server binds loopback and explicitly uses port 3000. If another server already occupies that port, stop the duplicate before restarting; startup does not silently switch ports.

In development, opening the root page through the other `localhost` / `127.0.0.1` alias on the same configured port redirects to `APP_ORIGIN` before the browser creates a session or starts Swiggy authorization. This keeps the owner cookie and OAuth callback on one host. API Host and POST Origin/CSRF checks still require the exact configured origin; production does not use this alias redirect.

For another port, match `APP_ORIGIN` to the explicit CLI port, for example:

```bash
APP_ORIGIN=http://127.0.0.1:3001 bun run dev --port 3001
```

Open that configured URL. With npm, forward the flag using `npm run dev -- --port 3001` and set the same `APP_ORIGIN`. Run only one server against the default PGlite data directory.

Choose **Connect Swiggy**, complete authorization and select your saved delivery address. Search any product/category available through Instamart for that address, choose the exact variant and edit your live bag. Category shortcuts run real searches. Direct search bypasses the LLM and follows provider pagination through **Load more products**, with at most 500 saved options per query. Review the full provider bill, delivery address and current payment option before confirming an order. Each request handles one product; ambiguous variants need clarification or a product-card selection.

## Configuration

Copy `.env.example` to `.env.local` only when adding services; restart after changes.

| Variable | Actual purpose |
| --- | --- |
| `APP_ORIGIN` | Canonical browser origin and OAuth callback base; default `http://127.0.0.1:3000`. Its port must match the server CLI port. |
| `TOKEN_ENCRYPTION_KEY` | Base64 encoding of 32 random bytes, required before OAuth; keep stable for stored tokens |
| `ELEVENLABS_API_KEY` | Server-only key used to mint single-use tokens for inline Scribe v2 Realtime dictation; never expose it as `NEXT_PUBLIC_` |
| `GROQ_API_KEY` | Server-only key for assistant reasoning; direct catalog search does not need an LLM |
| `GROQ_MODEL` | Default `openai/gpt-oss-20b`; requires strict structured-output support |
| `KOKORO_URL` | Optional private Kokoro-FastAPI base URL, e.g. `http://127.0.0.1:8880`; leave empty unless that service is running |
| `KOKORO_VOICE` / `KOKORO_MODEL` | Defaults `af_heart` / `kokoro` |
| `DATA_DIR` | Private PGlite data directory, default `.local-data/postgres` |

Generate the OAuth storage key locally:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Do not paste keys into chat or commit `.env.local`. Groq uses the account's current allowance; there are no automatic paid/provider/model fallbacks. UI service indicators describe configured adapters, not successful model readiness. Real speech setup and a synthesis/transcription check are in [LOCAL_VOICE_SETUP.md](LOCAL_VOICE_SETUP.md).

## Checks

```bash
npm run typecheck
npm test
npm run build
# Run against an already started local server:
node scripts/smoke.mjs
# Include the development-only localhost/127.0.0.1 page redirect check:
TEST_DEV_REDIRECT=1 node scripts/smoke.mjs
```

To verify configured Groq credentials independently of Swiggy or speech, run:

```bash
node --env-file=.env.local --import tsx scripts/check-groq.mjs
```

This sends one synthetic grocery request through the real Groq SDK, Zod validation, LangGraph and the read-only fixture search tool. It consumes the account's normal model allowance, prints only safe verification/usage metadata, and cannot change a cart or place an order. A real `openai/gpt-oss-20b` check passed on 18 October 2026; account access and limits can change.

Tests use synthetic data and mocked external transports, including genuine MCP SDK OAuth/JSON-RPC calls against mocks. The HTTP smoke uses a separate unconnected owner to cover cookies, CSRF, strict input, rejected demo mode, idempotency, connection prerequisites and owner isolation. Commerce, quote/confirmation and ambiguous outcomes are exercised with injected fixture transports in unit tests. These checks never connect to real commerce.

A model/unit test does not prove real provider connectivity, microphone permissions, speech accuracy, or payment recovery. See [VERIFICATION.md](VERIFICATION.md) for real-account checks and run the shopping-audio evaluation in [TESTING.md](TESTING.md). No model weights are bundled or downloaded by `npm ci`; ElevenLabs dictation needs no local weights.

## Repository map

```text
src/app/                         Next.js UI and API route
src/lib/contracts.ts             Shared Zod input/output schemas and inferred types
src/server/agent.ts              Groq, LangGraph, LangChain tools, validation/hooks
src/lib/use-inline-dictation.ts  ElevenLabs SDK, active field, partial/final text, microphone lifecycle
src/server/voice.ts              Single-use ElevenLabs speech tokens and optional Kokoro output
src/server/integrations/         Official MCP OAuth, transport and provider schemas
src/server/service.ts            OAuth persistence and default live service exports
src/server/shopping.ts           Owned live sessions, cart, quotes, confirmation and attempts
src/server/store.ts              Transactional embedded PostgreSQL documents
src/server/crypto.ts             Owner-bound authenticated token encryption
src/server/catalog.ts            Synthetic data for tests and offline benchmarks only
scripts/smoke.mjs                Local HTTP acceptance check
tests/                          Schema/workflow/checkout/MCP tests
```

## Persistence and deployment boundary

PGlite provides local embedded PostgreSQL without a separate database daemon. This replaces the originally proposed Prisma + external PostgreSQL setup for the pilot. SQL transactions persist records and serialize local claims. The data directory is **single process only**; do not run multiple workers, concurrent dev/start servers against it, serverless instances or replicas. Back up the private data and encryption key together; losing the browser cookie loses access to that browser's session.

The random HTTP-only browser cookie is a local pilot identity, not production app sign-in. Do not publicly deploy this build for customers. Production needs authenticated accounts, shared database migrations/locking, credential rotation, retention/deletion, hardened CSP and deployment configuration, and the live integration/payment gates below.

## Swiggy connection

Set the encryption key and exact origin. The callback is `/api/integrations/swiggy/callback`. Choose **Connect Swiggy** and complete phone/OTP authorization on the official provider page. Callback allowlisting and account access are provider requirements. Disconnect removes local credentials; it does not claim to revoke the provider grant.

The gateway validates discovered inputs and structured responses. Connected sessions fetch saved addresses, normalize every returned product variant into an opaque SKU/SPIN key, refresh the real cart and current payment methods, and retain all provider bill rows. Numeric prices use INR-to-paise conversion; formatted bill subtotals and payable totals must reconcile. A nonempty cart with a different delivery address cannot be overwritten. Fresh fingerprints reject external edits. See [VERIFICATION.md](VERIFICATION.md) for actual account checks and remaining payment limits.

Unknown checkout results hold a durable owner gate; repeated confirmation returns the existing attempt. Automated tests inject a simulated timeout to prove this. Automatic payment polling/reconciliation remains unimplemented: pending or unknown attempts must be checked in Swiggy before another checkout. Real purchases are never used as an automated test. A stored `submitted` result after a crash stays unresolved; do not retry it or delete its gate as recovery.

Use the [roadmap](ROADMAP.md), [Swiggy plan](SWIGGY_MCP.md) and [production architecture](ARCHITECTURE.md) for the next implementation gates.
