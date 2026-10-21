# Swiggy Instamart MCP integration

**Status: 19 October 2026.** Live-only shopping uses the official MCP SDK with per-owner OAuth/PKCE, encrypted credentials, strict structured responses, real product variants, guarded cart updates and full provider bill display. Demo mode is removed from the application API/UI. Checkout is wired behind immutable review and explicit confirmation; automated tests never submit real purchases. See [verification](VERIFICATION.md) for observed account results and remaining payment limitations.

The user selected the official Swiggy Instamart MCP service as the primary commerce integration. Provider-specific behavior lives in the [server-side adapter](../src/server/integrations/swiggy.ts); the [application API](API_CONTRACT.md) is a separate contract.

## Implemented boundary

- The official SDK handles discovery, dynamic registration, PKCE, token exchange, and refresh. The app binds callback state to its local browser owner, consumes callbacks transactionally, encrypts the complete credential record, and persists rotated refresh tokens. A connection generation guard rejects late credential writes after disconnect/reconnect.
- Credential-bearing requests and authorization redirects are restricted to the configured official provider origin. Phone/OTP entry stays in Swiggy's browser flow. The token request adapter converts SDK form parameters to the JSON body documented by Swiggy.
- `getAddresses`, `searchProducts`, `getCart`, and `getPaymentOptions` validate current discovered input schemas and parse directly validated MCP structured content or explicit successful JSON envelopes against [provider Zod schemas](../src/server/integrations/swiggy-schemas.ts). They do not infer success from prose. The live application exposes saved addresses, catalog search, cart edits and current payment choices.
- A guarded cart edit preserves unrelated baseline lines, compares a fresh fingerprint, checks the selected address, preserves returned SKU/SPIN selections across stores, and re-reads the resulting cart. The application serializes edits per owner.
- The purchase method checks the fresh cart fingerprint, exact address and currently available selected payment, validates discovered checkout arguments, and dispatches once after the application claims a confirmed quote. Unknown outcomes hold a durable gate. Payment polling and automated reconciliation are not implemented; check pending/unknown attempts in Swiggy.
- Disconnect removes local credentials atomically; it does not claim to revoke the remote Swiggy session. The app uses a local browser-owner cookie, not production app sign-in.

[SDK contract tests](../tests/swiggy.test.ts) cover registration/PKCE/exchange, callback replay and concurrency, late token responses after disconnect, owner isolation, validated address calls through real SDK transport, and checkout preflight/submission boundaries. [Implementation references](IMPLEMENTATION_REFERENCES.md) retain the existing-repository patterns used. The remaining sections record provider requirements and the target integration design; capabilities beyond the boundary above remain unimplemented.

## Observed live read results

A later direct headphones query returned 20 variants and pagination increased the displayed set to 27. A ₹79 earphone item reached a ₹150 full-bill review with Sector 48 pg and Pay on delivery; no order was submitted. The bag was already empty when opened for cleanup. These are historical observations, not a promise of current availability. See [verification](VERIFICATION.md) for the speech check and the stop-testing boundary.

The saved **Sector 48 pg** address was explicitly selected in Brave. A milk search returned 20 product families and 42 variants (availability changed between calls). Numeric INR item prices were cross-checked against the real formatted cart subtotal. One ₹30 pack produced the complete ₹101 provider bill: ₹12 handling, ₹23.60 small-cart and ₹35.40 delivery. Current payment options returned ten provider methods; only mapped available choices are offered.

Live testing exposed two differences from the published shape: nonempty carts return integer `storeId` values, and the cart address details return the base ID while saved addresses contain an opaque `__` suffix. The DTO normalizes integer store IDs as opaque strings; address matching accepts only the exact structured base of the selected composite ID. Regression tests cover these cases. No display-label or fuzzy-address matching is used.

The first live response exposed a documentation mismatch: Swiggy sends the address object directly in `structuredContent`, with human-readable Markdown in `content`. The parser now validates this direct object and retains support for explicit success/data envelopes. It never parses Markdown as authoritative data; explicit errors remain rejected. Regression fixtures use synthetic values.

The read-only `/api/integrations/swiggy/verification` route uses the owned session’s selected address and a fixed milk query. `/api/integrations/swiggy/diagnostics` returns response shapes without address/phone/token values. Neither is an arbitrary tool proxy.

## Official endpoint and capabilities

The documented Instamart MCP endpoint is **`https://mcp.swiggy.com/im`**, using streamable HTTP. It is an MCP service, not a REST endpoint to which the browser should send our application DTOs. Discover available tools and their schemas when connecting; do not depend on an advertised tool count. [Instamart reference](https://mcp.swiggy.com/builders/docs/reference/instamart/), [MCP overview](https://mcp.swiggy.com/builders/docs/start/what-is-swiggy-mcp/).

The following is a capability map, not a complete tool argument specification:

| Application need | Documented MCP tools | Application responsibility |
| --- | --- | --- |
| Saved delivery address | `get_addresses` | Handle pagination and explicit selection |
| Product discovery | `search_products` | Resolve product/variant IDs from returned choices |
| Current cart and bill | `get_cart` | Treat live contents and charges as authoritative |
| Add/change/remove items | `update_cart` | Translate the requested edit into a complete cart replacement |
| Clear cart | `clear_cart` | Require a deliberate request; never clear as an initialization step |
| Payment selection | `get_payment_options` | Offer only currently available methods |
| Submit reviewed purchase | `checkout` | Enforce the application confirmation gate first |
| Pending payment | `check_payment_status`, `confirm_order` | Follow the verified payment-state workflow |
| Order lookup and tracking | `get_orders`, `get_order_details`, `track_order`, `get_delivery_status` | Preserve references and report observed status |

Tool names are documented in the [Instamart tool reference](https://mcp.swiggy.com/builders/docs/reference/instamart/). Validate every tool's current input/output schema before implementing its mapping. Address creation/deletion, coupons, and other optional capabilities are outside the first required flow.

## Access and environments

| Environment | Project policy |
| --- | --- |
| Project-owned fixture adapter | Synthetic automated tests and isolated UI development; never a live-order simulation presented as real |
| Local app connected to Swiggy | Localhost describes where our app runs; verify the remote environment and permitted actions |
| Provider staging | Obtain confirmed access and the correct Instamart endpoint/account setup before use |
| Provider production | Enable only after access, callbacks, recovery behavior, and release gates are verified |

Swiggy's quickstart advertises self-serve localhost development, while its access/onboarding page describes invite-based access, a project-owned local stub, allowlisted staging on `mcp-staging.swiggy.com`, and a production onboarding process. The latter describes seeded staging data without real orders. These pages do not establish this repository's access. Confirm the current process and assigned environment before connecting; do not assume the production endpoint is a sandbox. [Developer quickstart](https://mcp.swiggy.com/builders/docs/start/developer/), [access and onboarding](https://mcp.swiggy.com/builders/docs/operate/access/).

## Authorization plan

Swiggy documents OAuth 2.1 with PKCE and dynamic client registration. Use its authorization/resource metadata and the current official authentication instructions. Keep phone/OTP entry in the official browser flow. Derive expiry from token responses, protect refresh tokens, and persist rotated credentials. Do not build against undocumented login endpoints. [Authenticate](https://mcp.swiggy.com/builders/docs/start/authenticate/).

Each customer needs their own delegated Swiggy connection; the developer's account must not serve other customers. Verify callback registration/allowlisting for the deployed origin. [Delegated authorization](https://mcp.swiggy.com/builders/docs/start/enterprise/delegated-auth/).

Proposed application flow:

1. Authenticate the application user and start a short-lived, user-bound OAuth attempt.
2. Validate trusted discovery metadata and complete registration as required by the official flow.
3. Create a PKCE challenge and callback state; keep the verifier protected on the server.
4. Redirect the user to the official authorization page.
5. Validate the one-time callback, exchange the code server-side, and encrypt the user's credentials.
6. Initialize an authenticated MCP client, discover tools, and validate required capabilities.
7. Read the user's addresses, select one explicitly, and fetch the current cart before shopping.

Keep application sign-in distinct from provider authorization. Handle expiry/revocation without silently replaying a mutation. See [SECURITY.md](../SECURITY.md) for application controls.

## Cart mapping

`update_cart` replaces the entire remote cart. Its current reference describes selected variant identifiers such as `skuId` and `spinId`; copy these from live results and the actual tool schema rather than generating them. Surface unavailable, capped, or removed items in the resulting cart. [update_cart reference](https://mcp.swiggy.com/builders/docs/reference/instamart/update_cart/).

Our adapter will read the current cart, apply only the requested edit, and preserve unrelated items. Serialize operations inside this app, compare a fresh baseline before writing, and re-read the result. Removing the sole remaining line uses the documented `clear_cart` tool after checking the same fresh fingerprint; it is never called during initialization. A user may also change the cart through Swiggy. Our app revision/fingerprint checks reduce conflicts but cannot lock an external account or make the provider operation atomic. The official pattern also emphasizes refreshing remote cart state. [Multi-turn cart state](https://mcp.swiggy.com/builders/docs/build/agent-patterns/multi-turn-state/).

Normalize provider prices explicitly into integer paise. Verify units and all bill components against observed responses; do not assume a provider amount is already expressed in paise.

## Checkout and payment

Swiggy's checkout reference requires explicit confirmation after showing the current cart, costs, full selected address, and payment method. Multi-store results can succeed only in part. Checkout can also return `PENDING_PAYMENT`. The duplicate override must not be used as a general retry mechanism. [checkout reference](https://mcp.swiggy.com/builders/docs/reference/instamart/checkout/).

The application's additional controls are specified in [architecture](ARCHITECTURE.md): a proposed 120-second immutable quote, current confirmation evidence, live revalidation, and a persisted local attempt. These are application design choices, not provider guarantees.

Offer only methods returned by `get_payment_options`. Preserve the selected identifiers and translate them according to the live schema; do not infer a payment option or silently choose another method. [Payment options](https://mcp.swiggy.com/builders/docs/reference/instamart/get_payment_options/).

For pending payment, present the provider-supplied action safely and follow its polling interval, terminal flags, and maximum polling window. If the response already says the order is confirmed, do not confirm again. Use `confirm_order` only after successful payment when confirmation is still required. [Payment status](https://mcp.swiggy.com/builders/docs/reference/instamart/check_payment_status/), [order confirmation](https://mcp.swiggy.com/builders/docs/reference/instamart/confirm_order/).

Preserve provider order messages for the authenticated user's result view when required by the current contract. Render text safely; tool content cannot grant action permissions. Keep each order's raw provider status separately from normalized application states. Do not announce a completed purchase merely because a tool response is structurally successful.

## Uncertain outcomes and reconciliation

The production guide states that checkout does not provide server-enforced idempotency. Reconcile an ambiguous placement using the available order/status tools before considering another submission. Safe-read retries and rate-limit handling do not authorize retrying an order-placement mutation. [Ship to production](https://mcp.swiggy.com/builders/docs/build/ship-to-production/).

Our local idempotency keys deduplicate app requests only. After a timeout or process interruption:

1. Keep the persisted attempt in an unknown/reconciling state and hold the durable user/provider checkout gate across reconnects.
2. If order/payment references were returned, refresh their authoritative status.
3. If no reference is known, inspect supported order-history capabilities. Similar items or timestamps alone may be insufficient to attribute an order conclusively.
4. Preserve uncertainty and seek a verified resolution when the evidence is ambiguous. Never label an unresolved attempt failed merely to make retry available.
5. Report each multi-store result separately. Do not re-submit successful parts while recovering other parts.

Placed-order cancellation is outside the MVP. Use the current official support route if the user needs help; do not invent a cancel-order tool or hardcode an unverified contact number.

## Integration completion checklist

- Confirm the assigned environment, access requirements, and callback setup.
- Verify per-user authorization and safe reconnect/disconnect behavior.
- Capture sanitized observed schemas for required tools and map them explicitly.
- Verify address pagination, product variants, existing-cart preservation, money units, and bill components.
- Verify actual payment and per-order result handling, including pending and partial responses.
- Establish what evidence can resolve a timed-out checkout and document any gaps.
- Run fixture fault cases before any separately reviewed live mutation or purchase.

Documentation verification is not connectivity verification. Record actual smoke-test results and unresolved differences here when implementation begins.
