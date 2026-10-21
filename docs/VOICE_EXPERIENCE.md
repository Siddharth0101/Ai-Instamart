# Voice experience

Status: inline live dictation implemented, updated 20 October 2026. Browser behavior, account access and Hindi/Hinglish accuracy remain unvalidated after the request to skip testing.

The current microphone pipeline uses ElevenLabs `scribe_v2_realtime` through its official browser SDK and a server-minted single-use token. Partial and committed words appear directly in the product search, category search or assistant field. Stop commits the remaining audio with a bounded wait; discard restores the previous draft. Only the user’s separate Search or Send action submits the text. Groq structured intent and optional private Kokoro output remain independent. Component choices are in [OPEN_SOURCE_STACK.md](OPEN_SOURCE_STACK.md); earlier observations and unverified final edits are in [VERIFICATION.md](VERIFICATION.md). The obsolete batch transcription route was removed. The broader conversational cases below include future targets.

## Interaction principles

- Use click-to-start dictation beside the intended text field, with a visible microphone state. Do not listen continuously or require a wake word.
- Keep the conversation and cart visible together. Speech should help the customer inspect the purchase.
- Show an editable transcript and a text field that supports the same actions as voice.
- Ask one focused clarification at a time. Present concise product choices with brand, pack size, price, and availability when provided.
- Separate cart changes from purchase authorization. “Add it” adds the resolved item; it never means “place my order.”

## Conversation states

| State | Visible behavior and next step |
| --- | --- |
| Ready | Show the selected address and current cart; offer microphone and text input. |
| Listening | Show elapsed time, stop/discard controls, and partial words in the originating field. Committed words replace the provisional segment. |
| Interpreting | Show recognized text and the proposed action; allow correction before execution. |
| Clarifying | Ask for the missing product, pack, quantity, or selection. Do not mutate the cart yet. |
| Updating cart | Show the specific pending change and prevent duplicate local submissions. |
| Cart updated | Display the reconciled provider cart and a short explanation of what changed. |
| Reviewing | Show fresh items, address, payment choice, fees, and payable total; ask for explicit purchase confirmation. |
| Placing order | Show progress for the confirmed purchase. Keep repeated input from initiating another checkout. |
| Resolving outcome | Reconcile a timeout or disconnect; explain that the purchase result is still unknown. |
| Result | Show each order's authoritative status and any remaining payment or recovery step. |

Stopping dictation commits its final audio and retains editable text; discarding restores the original draft. No listening state submits a shopping action. Stopping an action before dispatch can discard the local proposal. Once a provider operation has been dispatched, the UI must report its actual outcome; a local stop is not a promise of remote cancellation.

## Example: selecting a product

Customer: “Add two packs of milk.”

Assistant: “Which milk would you like?”

The UI displays live search results, including each result's brand and pack size. The assistant may read a small number of choices; the customer can select any visible result by voice or touch.

Customer: “The 500 ml one from that brand.”

If the reference identifies a unique product, the UI shows “Add 2 × [selected product], 500 ml each.” If multiple results still match, ask another clarification. A cart update reports success only after the returned cart reflects the change.

Product names and amounts in examples are illustrative. Runtime choices must come from provider data.

## Example: reviewing a purchase

Customer: “Checkout.”

Assistant: “Review your items, delivery address, payment method, and total on screen.”

The review shows the full current purchase. Offer a clear confirmation control such as “Place order for [live total].” The current implementation accepts only the explicit UI confirmation control, bound to the reviewed quote. A dedicated fresh voice/text confirmation flow is a future design requirement; an earlier transcript or model response cannot authorize checkout.

The implemented quote lifetime is 120 seconds. If it expires or anything material changes, the assistant explains and presents a new review. An earlier “yes” cannot approve the changed purchase. A request to change the address or payment choice returns to the relevant selection step.

## Error and recovery language

| Situation | Intended response |
| --- | --- |
| Unclear transcription | “I heard [transcript]. Please edit it or try again.” |
| Several product matches | “Which of these products did you mean?” |
| Stock changed | Explain which item changed and offer available choices without selecting a substitute automatically. |
| Authentication expired | Ask the customer to reconnect, then refresh the cart before continuing. |
| Checkout timed out | “The order result is still unknown. Check your order in Swiggy.” Keep the durable gate; refreshing saved status does not imply provider polling. |
| Payment pending | Show the provider's pending status and supported next step; do not announce a completed order. |
| Some orders succeeded | List the successful, failed, pending, or unknown results separately before proposing any next action. |

## Accessibility and validation

Controls need accessible labels, keyboard operation, visible focus, and status announcements for assistive technology. Do not make sound, color, or a spoken message the only way to understand a state. Let the customer mute speech output without losing functionality.

Evaluate recognition using catalog names across categories, accents, background noise, quantities, pack sizes, and self-corrections. Measure clarification and completion rates on a documented test set before release; Hindi and Hinglish need their own evaluated set before being advertised.

Provider capability details live in [Swiggy MCP integration](SWIGGY_MCP.md); checkout rules live in [product requirements](PRODUCT_REQUIREMENTS.md) and the [API contract](API_CONTRACT.md).
