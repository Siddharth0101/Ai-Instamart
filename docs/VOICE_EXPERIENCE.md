# Voice experience

Updated 25 October 2026. SayCart is a voice-first ordering assistant: the customer talks, the screen shows restaurants, dishes and the cart, and the assistant answers out loud. What the agent understands and how it acts is in [ASSISTANT.md](ASSISTANT.md); speech setup is in [LOCAL_VOICE_SETUP.md](LOCAL_VOICE_SETUP.md).

## On screen

- **Voice is on by default.** Listening starts when the page is ready and the header button reads **Stop listening** (or press **Space**). After a pause (that button, a quiet minute, Escape, or a hidden tab) it reads **Resume**, and a tap continues the same conversation.
- **The assistant speaks first** on a new visit: “connect your Swiggy account” when nothing is linked (with a **Connect Swiggy** card on the page), “Home ya Work?” when no address is chosen, otherwise “aaj kya order karna hai?”. Browsers play sound only after a first click or key press, so the first tap anywhere unlocks speech.
- While talking, one small orb shows a one-word state: Listening, Got it, Thinking…, Speaking, Paused, or Scrolling. There is no transcript or chat panel; the page stays restaurants and dishes.
- A cart chip beside the orb shows the item count and total; tapping it opens the cart.
- **“Try saying” chips** above the orb suggest the next useful sentence for the screen; tapping one says it. They fade after a few seconds so the food stays visible.
- **Every change the assistant makes is shown**: a short toast (“Added 2× Peri Peri Fries”) with **Undo**, and the dish is highlighted mid-screen.
- **After an order**, the header shows a live status chip and the page a tracking banner; the order sheet has a delivery timeline with the ETA, refreshing on its own, and **Order again** once delivered.
- **Food delivery** opens like the Swiggy app: “What's on your mind?” cuisine tiles, “Top rated near you”, quick filters and the restaurant list. **Instamart** opens a home with aisle tiles and product rails; an aisle shows numbered product cards with ADD and a stepper, like dishes on a menu, and an aisle bar to hop between aisles. Every tile and rail is a Swiggy search, so the products and prices are Swiggy's own.
- A caption of what was heard fades after a few seconds if it was not spoken.
- Sheets for the cart, delivery address, checkout and order status open when the customer asks for them or when the flow reaches them (checkout opens the bill; placing an order opens its status).
- Everything spoken can also be tapped: restaurant cards, ADD steppers, Pay-with buttons and **Place order**. Taps use the same server actions as voice.

## Conversation rules

- **One turn per sentence.** A committed phrase waits briefly for more speech, so a mid-sentence pause stays one request. Several actions in one sentence (“Truffles kholo aur do fries daal do”) happen in order in one turn.
- **Barge-in.** The microphone stays open while a reply plays. Speaking over the assistant stops playback and starts the next request; echo of the reply itself is ignored.
- **Short answers.** At most two short sentences, in the script of the customer's latest words: Devanagari Hindi, Hinglish in Roman letters, or English. After a search, filter or sort, the reply names the first one or two results.
- **Failures keep the conversation going.** A tool error is explained in one line and listening continues; errors from taps appear inside the open sheet, where the customer is looking. A model failure or rate limit is spoken as a short “sorry, say that again” or “one moment”, never as silence.
- **No surprise purchases.** The total is always spoken before an order can be placed, and the order needs the customer's own confirming words. See [ASSISTANT.md](ASSISTANT.md#ordering-and-consent).
- **Only the customer hangs up.** Listening stops on the customer's goodbye, or after a quiet minute (then **Resume** continues).
- **Scrolling is local.** “Scroll down”, “upar scroll karo” and “ruko” are handled in the browser without a server turn, so a stop acts at once. Touch, wheel, Escape, changing screens or reaching the end also stop it.

## Speech

- **Recognition:** ElevenLabs `scribe_v2_realtime` through its browser SDK and a server-minted single-use token. It gets language hints (English with Hindi by default, so Hinglish is not misheard as Urdu or Punjabi), keyterms from the visible restaurant and dish names, and the latest reply as context.
- **Speech output:** ElevenLabs Flash v2.5 (low latency, Hindi and English in one voice), after prices, symbols, emoji and links are turned into speakable words. If a speech request stalls, one backup request after 2.5 seconds usually answers first.

## Status

25 October 2026 (later): voice on by default with a spoken greeting and a connect prompt, the Party tab removed, a Swiggy-style food front and an Instamart home with aisles and rails, checked in the browser at desktop and 375 px.

25 October 2026: checkout errors now show inside sheets, orders have live tracking, prices are shown, groceries can be ordered by voice, and the Undo toasts, hints and Space shortcut were added and checked in the browser at desktop and phone widths. Real speech recognition was re-verified headlessly with injected audio. See [VERIFICATION.md](VERIFICATION.md).

Earlier:

Verified in the browser with the development fixture, the fake microphone (`?fakeMic=1`), the real Groq agent and real ElevenLabs speech output on 24 October 2026: address, browsing, opening menus by name and number, multi-dish adds, quantity changes and removal, sorting and filtering, panels, checkout, cash and UPI payment, order placement, tracking and goodbye, in Hinglish and English. Real microphone recognition quality, noisy rooms and live Swiggy ordering were not tested in this pass.

## Accessibility

Controls have accessible labels, keyboard operation and visible focus. State changes are announced as status text. Sound and speech are never the only way to understand a state: every spoken result is also visible on screen (cart, bill, order status).
