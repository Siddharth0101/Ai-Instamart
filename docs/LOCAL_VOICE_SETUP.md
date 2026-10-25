# ElevenLabs voice setup

Updated **24 October 2026**. SayCart uses **ElevenLabs Scribe v2 Realtime** for speech recognition and **ElevenLabs Flash v2.5** text-to-speech for spoken replies. A Groq-hosted agent (Vercel AI SDK) understands each sentence, acts with tools and writes the reply; see [ASSISTANT.md](ASSISTANT.md). No separate local speech service is required.

## Server settings

Set these values in `.env.local`, then restart Next.js:

```dotenv
ELEVENLABS_API_KEY=your-secret-api-key
# Optional; these are the built-in defaults:
ELEVENLABS_VOICE_ID=JBFqnCBsd6RMkjVDRZzb
ELEVENLABS_TTS_MODEL=eleven_flash_v2_5
ELEVENLABS_STT_LANGUAGE=en
ELEVENLABS_STT_SECONDARY_LANGUAGES=hi
# The voice agent; optional model override (openai/gpt-oss-20b takes over when it is rate limited):
GROQ_API_KEY=your-groq-key
GROQ_AGENT_MODEL=openai/gpt-oss-120b
```

Use the **secret API key**, with **Speech to Text** and **Text to Speech** access. The dashboard's **Copy Key ID** value cannot authenticate API calls. Never use `NEXT_PUBLIC_` for the secret. Configuration presence enables the controls; it does not prove that permissions or allowance are valid. A live check on 24 October 2026 created a Scribe realtime token and generated a short MP3 with the earlier `eleven_multilingual_v2` default. The Flash v2.5 default, language hints and keyterms have not had a live provider check yet; set `ELEVENLABS_TTS_MODEL=eleven_multilingual_v2` to return to the previous voice model.

## Recognition

The server mints single-use transcription tokens through the owner/CSRF-protected `/api/assistant/voice/token` endpoint (30 per minute per owner, because the browser reconnects when the on-screen vocabulary changes). The response is `{token, languageCode, secondaryLanguages}`. Language codes are 2–3 lowercase letters; invalid entries are dropped, at most four secondary codes are sent, and the primary is never repeated. Leaving the variables unset gives English with Hindi; setting `ELEVENLABS_STT_SECONDARY_LANGUAGES=` (empty) pins recognition to the primary language. Without these hints Scribe guesses among about 90 languages and often hears Hinglish as Urdu or Punjabi.

The browser uses the installed official `@elevenlabs/client` SDK and the same-origin audio worklet at `/vendor/elevenlabs/scribe-audio-processor.js`. Microphone audio streams directly to ElevenLabs. Each session also sends:

- **Language hints** from the token response.
- **Keyterms**: up to 50 visible restaurant, dish, option and selected-item names (each at most 20 characters) plus a short food vocabulary, so names on screen are spelled correctly.
- **Context**: the latest assistant reply as `previousText`.
- **No-verbatim mode**, which drops fillers and false starts.

If ElevenLabs rejects these settings, the browser reconnects without keyterms and context, then without language hints. [Client streaming guide](https://elevenlabs.io/docs/eleven-api/guides/how-to/speech-to-text/realtime/client-side-streaming), [token API](https://elevenlabs.io/docs/api-reference/tokens/create).

## Replies and speech

The agent's reply is cleaned for speech on the server: markdown, emoji, list numbering and runaway punctuation are removed and at most three short sentences are kept. A separate `speech` rendering turns symbols into words (₹ and Rs become "rupees", "2 × Biryani" becomes "2 Biryani"; quotes and links are removed).

The `/api/assistant/speech` route accepts a saved assistant message ID and the current conversation version and checks ownership and staleness before and after synthesis. It returns bounded MP3 audio using `mp3_44100_128`, with a 25-second provider timeout, at most two simultaneous speech jobs and an 8 MB response limit. Usually ElevenLabs answers in about half a second; when one request stalls, a single backup request after 2.5 seconds usually answers first and the slow one is cancelled. The secret stays on the server. Each response is downloaded before playback; speech output is not streamed. [TTS API](https://elevenlabs.io/docs/api-reference/text-to-speech/convert).

## Conversation experience

- Tap **Talk to order**. The header button becomes **Stop listening** (or **Resume** while paused) and a single small orb appears at the bottom; nothing else is added to the screen. A browser microphone permission is needed, on localhost or HTTPS.
- The orb shows the state with one word and its animation: listening (reacts to your voice level), thinking, speaking, paused. Tap it to pause, resume or interrupt; **×** closes voice. There is no transcript, caption box, typing field or settings row: the screen stays for restaurants and dishes. Voice mode also hides the hero, search box, filter toolbar and progress banners, since all of these can be spoken.
- After Scribe commits a phrase, the app waits briefly for more speech, so a mid-sentence pause doesn't split one request in two.
- **Barge-in**: while a reply plays, the microphone stays open with browser echo cancellation. Speaking over the reply stops playback and captures the new request; text that matches the reply being played is ignored as echo.
- A reply is shown on screen only when it could not be spoken (TTS unavailable or failed), briefly, above the orb.
- Escape and **×** release the microphone. Hiding the tab pauses it; coming back resumes it, unless you paused it yourself. A quiet minute also pauses it, with a note; **Resume** continues.
- "Scroll down", "scroll up" and "stop" (also नीचे स्क्रॉल करो / रुको) control the page without blocking on TTS.
- A request that fails (for example a stale screen) is explained in one line above the orb and the microphone **keeps listening**, so you can simply rephrase. Microphone or account failures pause it with the reason. Conversation voice never silently switches to another transcription or browser speech.

### What you can say

Anything a customer would say about the order, in English, Hinglish or Hindi: choosing the address, finding and opening restaurants, adding or changing dishes, sorting and filtering, opening the cart, checkout, payment, confirming, tracking and goodbye. The full table is in [ASSISTANT.md](ASSISTANT.md#what-a-customer-can-say). Without `GROQ_API_KEY` only local scrolling works.

### Testing the voice flow without a microphone

For development only (never in a production build):

1. Start a second dev server with fixture restaurants and in-memory data, so your real server and database are untouched:
   `SAYCART_FIXTURE=1 SAYCART_DIST_DIR=.next-fixture DATA_DIR=memory:// APP_ORIGIN=http://127.0.0.1:3001 npx next dev --hostname 127.0.0.1 --port 3001`
2. Open `http://127.0.0.1:3001/?fakeMic=1` and tap **Talk to order**. `?fakeMic=1` replaces only the speech-to-text connection.
3. In the browser console, run `await saycartVoice.say("दूसरा रेस्टोरेंट खोलो")`. The words arrive as live partials and then a committed transcript, exactly as from ElevenLabs. The agent, its replies and the spoken audio are real.

`next dev` may add the fixture build folder to `tsconfig.json`; revert that change before committing.

The fixture's restaurants, addresses and orders are synthetic; nothing reaches Swiggy. `npm run evals:agent` runs the same agent through scripted conversations without a browser ([EVALS.md](EVALS.md)).

## Verification boundaries

Automated tests mock SDK events, model responses and provider responses. They cover partial/final text, retries, duplicate suppression, lifecycle cleanup, server error mapping, language-hint validation, the agent's tools and consent rules, reply cleanup and TTS text cleanup. They do not prove actual microphone permission, audio quality, recognition of names or Hinglish, echo-free barge-in on real speakers, reply quality from a live model, provider allowance or speaker playback. On 24 October 2026 the full spoken flow was exercised in a browser with the fixture server and `?fakeMic=1`, using the live Groq agent and ElevenLabs speech output: address, browsing, opening by name and number, adding, changing and removing dishes in Hindi, Hinglish and English, sorting and filtering, panels, checkout, cash and UPI payment, placing and tracking a fixture order, and goodbye. The real speech path was then exercised in headless Chrome: spoken Hindi commands generated with ElevenLabs were played into the page as its microphone stream, through the unmodified ElevenLabs SDK, realtime `scribe_v2_realtime` transcription and the app ("मुझे खाना order करना है…", "तीसरा रेस्टोरेंट खोलो", "दो Peri Peri Fries और एक Chocolate Shake डाल दो" all completed). A physical microphone, real room acoustics and speaker echo were not tested; neither were Safari or iOS. See [VERIFICATION.md](VERIFICATION.md).
