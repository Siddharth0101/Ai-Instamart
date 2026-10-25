# Selected voice and AI stack

**Implemented local pilot, updated 20 October 2026.** SayCart uses ElevenLabs Scribe v2 Realtime for inline dictation and Groq structured intent, the official Swiggy Instamart MCP for commerce, and optional self-hosted speech output. The UI and API are live-only; fixture providers are available only to isolated tests. The [verification record](VERIFICATION.md) distinguishes implemented behavior from observed results.

## Current components

| Layer | Selection | Where it runs |
| --- | --- | --- |
| Interface and business backend | Next.js, React and TypeScript | One local Node process |
| Inline speech-to-text | `scribe_v2_realtime`, official `@elevenlabs/client` 1.28.0 | Browser streams to ElevenLabs with a server-minted single-use token |
| Shopping intent | `openai/gpt-oss-20b`, strict JSON Schema | Groq API |
| Contracts and agent | Zod, Vercel AI SDK (`ai`, `@ai-sdk/groq`) | Application server |
| Optional spoken replies | Kokoro-82M / `af_heart` through Kokoro-FastAPI | Private service selected by `KOKORO_URL` |
| Commerce | Official MCP TypeScript SDK and Swiggy Instamart | Application server calls Swiggy |
| Persistence | PGlite, embedded PostgreSQL | Private local directory; one process |

Direct catalog search, quantity buttons and checkout review do not require an LLM call. The assistant interprets natural-language requests; it cannot authorize checkout.

## Speech recognition choice

The [20 October alternatives review](SPEECH_ALTERNATIVES.md) considered Voxtral Realtime, Nemotron 3.5, Qwen3-ASR and WhisperLiveKit. Open alternatives are credible, but equivalence for this app's live mixed-language shopping flow is not established. ElevenLabs remains selected under the user's replace-only-if-equivalent-or-better condition.

The user selected **ElevenLabs** for words to appear directly in the active input while speaking. The official browser SDK exposes partial and committed transcripts; SayCart writes them into the field that started the session, without an extra recorder or automatic submission. The server mints a single-use token with `ELEVENLABS_API_KEY`; the full account key never reaches the browser. Capture is capped at 60 seconds and the SDK is loaded on demand. [Client streaming guide](https://elevenlabs.io/docs/eleven-api/guides/how-to/speech-to-text/realtime/client-side-streaming), [token API](https://elevenlabs.io/docs/api-reference/tokens/create).

The [official SDK](https://github.com/elevenlabs/packages/tree/main/packages/client) is MIT-licensed. Its audio worklet and notice are included under `public/vendor/elevenlabs/` so capture does not load executable worklet code from a third-party CDN. **Scribe is a hosted proprietary service**, not an open-source model or self-hosted inference runtime. Account permission, usage allowance and service costs apply independently of Groq.

The new token flow and live dictation have not been run against the provider or tested in the browser, following the request to skip testing. The key’s presence is configuration, not validation. This selection does not establish perfect recognition or a universally best speech model; product names, numbers, Hindi/Hinglish and background noise still need evaluation.

The unused batch transcription route and Whisper/ffmpeg adapters have been removed. Open model alternatives are recorded in [SPEECH_ALTERNATIVES.md](SPEECH_ALTERNATIVES.md) as research, with no installed inference runtime or fallback provider.

## Optional speech output

Spoken replies use optional [Kokoro-FastAPI](https://github.com/remsky/Kokoro-FastAPI), with [Kokoro-82M weights](https://huggingface.co/hexgrad/Kokoro-82M), both under Apache-2.0. The configured English voice is `af_heart`. Keep `KOKORO_URL` blank unless the private service is running. A missing TTS service does not disable transcription. Source review found resident-model reuse and warmup; local synthesis performance and pronunciation were not measured here. [Official voice notes](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md) describe limited non-English coverage; Hindi support alone does not establish good Hinglish output.

Inline dictation requires `ELEVENLABS_API_KEY`; optional local services do not enable its capability flag.

## Reasoning and structured actions

Groq serves **`openai/gpt-oss-20b`** for bounded structured intent. The model name does not require an OpenAI key. Zod defines the intent schema, produces JSON Schema for the request, and validates the response. Server policy then checks current products, quantities, ambiguity, ownership and permission. [Groq model](https://console.groq.com/docs/model/openai/gpt-oss-20b), [structured outputs](https://console.groq.com/docs/structured-outputs), [Zod JSON Schema](https://zod.dev/json-schema).

The Vercel AI SDK `ToolLoopAgent` owns the agent loop; its tools call the application's own validated actions, never the MCP servers directly, and the server re-checks every reference and every order consent. A second agent runtime is not needed. Shell, glob, grep, read and write remain development tools.

The model receives bounded text and normalized shopping context. It receives no OAuth tokens or payment secrets, and it has no checkout tool. Fresh full provider bills, address/payment selection, immutable two-minute quotes and explicit UI confirmation control purchases independently of model prose.

## Cost and data boundaries

Groq’s free plan is limited hosted access. Check the account’s actual limits and runtime responses; published allowances are not a permanent capacity guarantee. Reasoning tokens and speech usage are different meters. The app does not automatically upgrade plans, switch providers or change models on a quota error. [Groq rate limits](https://console.groq.com/docs/rate-limits).

Inline microphone audio streams directly from the browser to ElevenLabs after a single-use token is obtained from the app. Explicitly submitted assistant text and minimal context go to Groq for intent; merely dictating into a search field does not invoke the reasoning model. Swiggy receives authorized commerce calls. The full system requires internet access and is not entirely self-hosted.

Local speech needs hardware, model storage and compute even without a metered speech API. App hosting and real purchases may incur costs. No production hosting plan, retention schedule or repository license has been selected.

The comparable Swiggy repositories use different hosted speech/model stacks. Their stage boundaries informed this implementation; we did not run their apps or copy their application code. See [reference architectures](REFERENCE_ARCHITECTURES.md) and [implementation references](IMPLEMENTATION_REFERENCES.md). Continuous conversation frameworks such as Pipecat remain future references, not installed dependencies.
