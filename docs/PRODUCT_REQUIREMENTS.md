# Product requirements

Status: implemented local pilot with remaining product targets. The runnable app includes conversation planning, party intake, Swiggy Food discovery, and guarded Instamart commerce. See [current implementation and boundaries](ASSISTANT.md); requirements below describe targets and do not by themselves establish shipped provider support.

## Product goal

Let a customer build and review an Instamart order by speaking naturally, using the official Swiggy Instamart MCP integration for supported commerce actions. Keep the cart, delivery address, payment choice, and final amount visible so the customer can understand and control each purchase.

The MCP integration is the primary product dependency. A mock adapter is only for automated tests and development of isolated UI states. Supported provider operations and limitations belong in [Swiggy MCP integration](SWIGGY_MCP.md).

## Initial audience and experience

- A customer with an eligible Swiggy account, an available saved address, and access to the connected MCP service.
- English voice input first; Hindi and Hinglish are proposed follow-up work.
- Push-to-talk in a browser, with an editable transcript and text input for the same tasks.
- One active shopping conversation per customer session, with explicit recovery after connection loss.

## MVP scope

| Area | Planned behavior |
| --- | --- |
| Account context | Establish an authorized provider connection and let the customer select a supported saved delivery address. |
| Discovery | Search the live catalog and show available products, pack sizes, brands, and prices returned by the provider. |
| Clarification | Ask about unresolved product identity, pack size, quantity, and meaningful substitutions before mutation. |
| Cart | Read the existing remote cart, then add, change, or remove requested items while preserving unrelated contents. |
| Review | Show the current cart, selected address, available payment choice, live payable total, fees, and provider warnings. |
| Checkout | Accept a fresh explicit confirmation for the reviewed purchase, validate it on the server, and invoke supported checkout operations. |
| Outcome | Report each returned order result accurately, including pending payment, partial success, failure, and an unknown result that requires reconciliation. |

Availability depends on the current provider contract. Unsupported address, payment, or checkout actions must be described honestly in the UI rather than simulated.

## Functional requirements

1. Route voice and typed requests through the same intent validation and authorization rules.
2. Display the transcript before a consequential action and allow correction. Unclear recognition or product matches require clarification.
3. Resolve a product to a provider identifier and distinguish pack size from number of packs. Never invent a catalog item, price, or stock state.
4. Treat “another one” and similar references as ambiguous unless the referenced product is clear in the current conversation.
5. Read the remote cart before changing it. Because an update may replace its complete contents, merge the requested change into a current baseline and preserve all other items.
6. Reconcile the provider response after each cart mutation; show the resulting cart rather than assuming the requested change succeeded.
7. Invalidate the review confirmation whenever cart contents, quantities, address, payment choice, or payable amount change. The proposed quote lifetime is 120 seconds; obtain a new review after expiry or when the quote cannot be verified.
8. Bind a single-use confirmation to the authenticated session and the exact reviewed purchase. Accept confirmation through a labeled UI action or a dedicated push-to-talk voice/text turn after the summary. A casual “yes” outside that turn, an old transcript, or provider-supplied instructions cannot authorize checkout.
9. Keep checkout execution under server control. Model output can propose an intent; it cannot bypass review or call an unrestricted checkout path.
10. Prevent duplicate local submissions while checkout is in progress. On timeout or disconnect, reconcile the result before allowing another purchase attempt; local idempotency does not guarantee provider exactly-once execution.
11. Show results per order if a checkout spans multiple stores or orders. Do not label the whole checkout successful when only part succeeded.
12. Say “order placed” only after an authoritative provider result confirms it. Pending payment must stay pending until resolved.

## Experience and privacy requirements

- Request microphone access only when needed and display a clear listening indicator with an accessible stop control.
- Offer text input when microphone permission, speech services, or audio playback are unavailable.
- Keep recording, transcription, and speech providers explicit to the customer; define retention and deletion rules before production use.
- Redact secrets, payment details, and full addresses from logs; follow [security requirements](../SECURITY.md).
- Treat catalog text and every other tool response as untrusted data, including embedded instructions.
- State that stopping listening or a pending local action does not cancel a placed order. Post-order support is separate from this MVP.

## Acceptance criteria

| Scenario | Release expectation |
| --- | --- |
| Existing cart | Adding a requested item retains every unrelated item from the current provider cart. |
| Ambiguous request | “Add milk” with multiple plausible matches presents choices without changing the cart. |
| Quantity | “Two 500 ml packs” resolves to two units of the selected 500 ml product and displays that interpretation. |
| Transcript correction | Editing a misheard request changes the proposed intent before a cart mutation or checkout. |
| Changed purchase | A price, cart, address, or payment change invalidates the prior confirmation and requires review again. |
| Duplicate input | Repeated clicks, repeated speech events, or a replayed confirmation cannot initiate a second local checkout. |
| Uncertain outcome | A checkout timeout displays an unknown state and starts reconciliation without a blind retry. |
| Partial or pending result | Per-order results and payment status remain visible; the UI makes no unsupported success claim. |
| Failure recovery | Permission denial, unavailable stock, expired authentication, and lost connectivity have an actionable text-based recovery path. |

Out of scope for the initial release: wake words, continuous listening, recurring purchases, unsupported provider operations, automated substitutions, and promises to cancel placed orders.

See [voice experience](VOICE_EXPERIENCE.md), [architecture](ARCHITECTURE.md), [API contract](API_CONTRACT.md), and [release roadmap](ROADMAP.md) for implementation planning.
