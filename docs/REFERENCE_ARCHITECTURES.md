# Reference architectures

Reviewed: **18–19 October 2026**. This is a static source review of public repositories at the commits below, except the explicitly unpinned VideoSDK example. We did not run these reference applications, connect their accounts, benchmark their voice pipelines, or verify their live checkout. SayCart is a runnable live-only pilot; its separate observed results are in [VERIFICATION.md](VERIFICATION.md).

These projects are useful references for the same product flow; their existence does not establish that their stack is universally best or ready for production. Our selected design is in [ARCHITECTURE.md](ARCHITECTURE.md), component choices in [OPEN_SOURCE_STACK.md](OPEN_SOURCE_STACK.md), and the evidence required before accepting implementation in [TESTING.md](TESTING.md).

## Swiggy Voice Order

Repository: `shekhartata/swiggy-voice-order`

Reviewed `main` commit: `0864459b75dca3fe4b2dc6f9b98da91412c85aaa`.

### Actual source flow

```text
Browser MediaRecorder or native Capacitor recorder
  → Next.js /api/voice → OpenAI whisper-1 transcription
  → Next.js /api/agent → bounded gpt-5.4 tool loop
  → official MCP SDK with Streamable HTTP → Swiggy /im
  → assistant text → /api/tts → OpenAI tts-1 MP3 → browser audio
```

The transcription route forces English. The client submits conversation history to the agent route; the server discovers MCP tools, converts their schemas into model functions, and executes requested calls for at most ten rounds. The speech providers and business orchestration are separate modules.

Source evidence:

- [Browser audio capture and upload](https://github.com/shekhartata/swiggy-voice-order/blob/0864459b75dca3fe4b2dc6f9b98da91412c85aaa/src/components/VoiceMicButton.tsx#L47-L66).
- [Whisper route and forced English language](https://github.com/shekhartata/swiggy-voice-order/blob/0864459b75dca3fe4b2dc6f9b98da91412c85aaa/src/app/api/voice/route.ts#L24-L28).
- [Model request and direct tool execution](https://github.com/shekhartata/swiggy-voice-order/blob/0864459b75dca3fe4b2dc6f9b98da91412c85aaa/src/lib/agent/orchestrator.ts#L85-L179).
- [Shared token file and module-global OAuth flow](https://github.com/shekhartata/swiggy-voice-order/blob/0864459b75dca3fe4b2dc6f9b98da91412c85aaa/src/lib/auth.ts#L12-L67).

### Patterns adopted and limits

Adopt the separation between capture, transcription, orchestration, commerce transport, and synthesis. Retain bounded orchestration and a server-owned MCP adapter, while using ElevenLabs live dictation for the browser, using optional local Kokoro and Groq structured intent.

Do not copy its shared `.swiggy-auth.json` account storage or its module-global pending OAuth flow. Its system prompt requests explicit purchase confirmation, but the executor has no per-order server confirmation check. Client-supplied history and model output cannot be the authority for our checkout. Its English-only transcription setting is also unsuitable as a default for Hindi/Hinglish evaluation.

## Kitchen Copilot

Repository: `shauraya-mohan/Swiggy-MCP`

Reviewed `main` commit: `b5994a3c1c0f810c562dbbc036a3e118f8069216`.

### Actual source flow

```text
Next.js mints a short-lived OpenAI Realtime secret
  → browser WebRTC: microphone up, native generated audio down
  → model function-call events on the data channel
  → browser tool bridge → Next.js /api/tools
  → unified mock/real router → Swiggy MCP
  → function-call output to the model and tool-result cards to the UI
```

This is a native audio Realtime architecture, rather than separate local STT and TTS. Its session configuration defaults to manual push-to-talk. `.env.example` selects mock commerce and disables live purchase mutations. Real-mode OAuth uses browser-specific HttpOnly cookies, rather than one shared token file.

Source evidence:

- [WebRTC microphone, events, and ephemeral-secret connection](https://github.com/shauraya-mohan/Swiggy-MCP/blob/b5994a3c1c0f810c562dbbc036a3e118f8069216/lib/agent/realtime-client.ts#L148-L232).
- [Browser confirmation gate followed by tool dispatch](https://github.com/shauraya-mohan/Swiggy-MCP/blob/b5994a3c1c0f810c562dbbc036a3e118f8069216/lib/agent/live-provider.ts#L275-L344).
- [Server router: validation, mock dispatch, and live mutation switch](https://github.com/shauraya-mohan/Swiggy-MCP/blob/b5994a3c1c0f810c562dbbc036a3e118f8069216/lib/mcp/router.ts#L67-L118).
- [Checkout preview reconstructed from visible cards](https://github.com/shauraya-mohan/Swiggy-MCP/blob/b5994a3c1c0f810c562dbbc036a3e118f8069216/lib/agent/pending-mutation.ts#L152-L182).

### Patterns adopted and limits

Adopt a single commerce router, consistent error envelopes, explicit environment controls, and product/cart views driven by tool results. Use contract fixtures for repeatable development and testing. Live product mode must fail visibly if Swiggy is unavailable; it must not silently switch to a mock catalog.

Adapt the confirmation sheet into a server-enforced purchase gate. The reference awaits consent in browser React code; its server router checks the global live mutation switch but does not require a quote-bound approval record. Enabling that switch is not evidence of approval for an individual order. Its preview also sums visible card prices and assumes Cash on Delivery; our summary must come from the fresh complete provider quote, including quantities, fees, address, and selected available payment method.

## Swiggy Voice AI Agent with VideoSDK

Repository: `DeepBhupatkar/swiggy-voice-ai-agent-videosdk-mcp`, source reviewed **19 October 2026** on `main` without a recorded commit pin. This reference can change; it is weaker reproducibility evidence than the pinned reviews above.

The [agent source](https://github.com/DeepBhupatkar/swiggy-voice-ai-agent-videosdk-mcp/blob/main/swiggy-voice-ai-agent-videosdk-mcp/swiggy_agent_one.py) builds `Pipeline(stt=DeepgramSTT(), llm=GoogleLLM(), tts=CartesiaTTS())` and connects commerce through MCP. It demonstrates the same separation of speech recognition, model reasoning, speech synthesis, and commerce tools. Those hosted providers are different from our selected stack; the example does not establish an entirely free or self-hosted system.

SayCart adopts the stage separation with inline ElevenLabs dictation, structured Groq intent, optional Kokoro, and a server-owned Swiggy adapter. Our transcript review, cart validation and quote-bound confirmation remain application controls. We reviewed source only and copied no application code.

## Local speech with Groq: a matching voice pipeline

Repository: `fizznix/local-voice-agent`, reviewed commit `9975a4b604c37fc475ff81815afdf1ecea8f21ac`.

Its [agent implementation](https://github.com/fizznix/local-voice-agent/blob/9975a4b604c37fc475ff81815afdf1ecea8f21ac/agent.py) records until an RMS silence threshold, transcribes with MLX Whisper, calls Groq with text/history, and launches Kokoro through a subprocess before playback. It times the stages separately. There is no commerce/MCP layer in this source.

Adopt the local-speech/hosted-reasoning boundary and separate latency measurements. Our browser now uses explicit click-to-start live dictation; keep models resident, bound history/retries, and use typed intent. This reference's global history, recursive microphone retry, per-reply TTS subprocess, and historical Groq model ID are not our implementation defaults. Its [license](https://github.com/fizznix/local-voice-agent/blob/9975a4b604c37fc475ff81815afdf1ecea8f21ac/LICENSE) is MIT.

## Existing speech server: Kokoro-FastAPI

Repository: `remsky/Kokoro-FastAPI`, reviewed commit `ebd4ec9cc97b258b25afc39444a5e1701055db50`.

The [startup lifecycle](https://github.com/remsky/Kokoro-FastAPI/blob/ebd4ec9cc97b258b25afc39444a5e1701055db50/api/src/main.py#L59) warms a reusable model. Its [manager](https://github.com/remsky/Kokoro-FastAPI/blob/ebd4ec9cc97b258b25afc39444a5e1701055db50/api/src/inference/model_manager.py#L52) manages model lifetime; its [speech route](https://github.com/remsky/Kokoro-FastAPI/blob/ebd4ec9cc97b258b25afc39444a5e1701055db50/api/src/routers/openai_compatible.py#L260) supports chunked output and client disconnect handling. This supplies an existing service boundary for Kokoro-82M rather than requiring our own synthesis server.

Select this service as the integration baseline, subject to testing and a pinned release during scaffolding. Keep it private, configure diagnostic text logging and temporary-file behavior, and expose only the required speech capability through our authenticated app. Its source [configuration](https://github.com/remsky/Kokoro-FastAPI/blob/ebd4ec9cc97b258b25afc39444a5e1701055db50/api/src/core/config.py) has broader web/development features and an all-interface bind default. The generic health route alone is not evidence of a warmed generation path. The wrapper's [license](https://github.com/remsky/Kokoro-FastAPI/blob/ebd4ec9cc97b258b25afc39444a5e1701055db50/LICENSE) is Apache 2.0; model/dependency notices remain separate.

## Turn handling and future realtime orchestration

The MIT-licensed `pguso/voice-agents-from-scratch` at `4c215bd4acd3247d87fa296326e005392938f0a4` [preloads speech models and groups output into sentences](https://github.com/pguso/voice-agents-from-scratch/blob/4c215bd4acd3247d87fa296326e005392938f0a4/06_real_time_systems/turn_taking/turn_taking.py#L208). It also has playback cancellation, but the helper buffers an entire sentence before playing. Borrow model reuse, explicit turn state, and sentence units; do not infer a production browser or commerce system from this desktop tutorial.

Pipecat at `a2cb3d60205f7555e2affe54e729ccd918360f8d` supplies a [Groq voice pipeline](https://github.com/pipecat-ai/pipecat/blob/a2cb3d60205f7555e2affe54e729ccd918360f8d/examples/voice/voice-groq.py) and a [local Kokoro adapter](https://github.com/pipecat-ai/pipecat/blob/a2cb3d60205f7555e2affe54e729ccd918360f8d/src/pipecat/services/kokoro/tts.py). The Groq example uses cloud speech, while our selected dictation provider is ElevenLabs. Borrow adapter boundaries, connection cleanup, and stage metrics. Defer the additional realtime pipeline until continuous audio/interruption is required; no reviewed official example assembles our exact complete stack.

The public `l0cut15/hermes-voice-assistant` at `58b463f67a0f041c0db1d6e5af0e29fecc048d83` is a hardware push-to-talk reference using whisper.cpp and an [existing Kokoro service](https://github.com/l0cut15/hermes-voice-assistant/blob/58b463f67a0f041c0db1d6e5af0e29fecc048d83/servers/kokoro-tts/docker-compose.yml). It is an ESP32 client, not a browser shopping app. The inspected STT client/launcher paths disagree, and playback is buffered; verify contracts directly rather than inheriting endpoint or streaming assumptions. No license grant was detected in its reviewed tree.

## Decisions for this repository

| Reference pattern | Treatment | Our design |
| --- | --- | --- |
| Separate voice stages in Swiggy Voice Order | Adopted, providers replaced | Server token → browser/ElevenLabs live audio → editable field → explicit submission → Groq intent → approved text → optional private Kokoro. |
| Model function-call loop | Adapted | Groq GPT-OSS 20B returns strict structured intent; no tools are attached to that request. Next.js validates and selects allowed commerce actions. |
| Server MCP boundary | Adopted | Only the Next.js backend holds credentials and calls official Instamart MCP through its adapter. |
| Kitchen Copilot mock/real router and result cards | Adapted | Provider adapters and contract fixtures share normalized results; cards show authoritative backend state. Fixture providers are confined to isolated tests; the app API/UI has no mock mode. |
| Purchase confirmation UI | Adapted | PostgreSQL stores immutable quotes, explicit confirmation, checkout attempts, deduplication, and unresolved outcomes; backend checks precede dispatch. |
| Account and conversation storage | Replaced | User-scoped server sessions and encrypted provider credentials; no shared account file and no client-authored tool history as authority. |
| Native Realtime WebRTC transport | Deferred | Push-to-talk request/response first; assess streaming and interruption only when requirements justify the added transport. |
| Existing Kokoro HTTP service | Adopted with configuration review | Run Kokoro-FastAPI privately behind our TTS adapter; verify readiness, model reuse, output formats, disconnects, and logging. |
| Local speech plus Groq in the desktop voice reference | Adapted | Keep the same data boundary; use user-scoped web state, strict intent, bounded orchestration, and server-controlled MCP. |
| Sentence output and playback cancellation | Adapted | Speak only approved text; tag work by turn/version, discard stale output, and reconcile any already-dispatched commerce action. |

The speech processes perform speech work only. Next.js remains the single business backend; PostgreSQL owns durable application state. The hosted Groq connection means this is a hybrid system, not a fully self-hosted one. Component quality, Hindi/Hinglish accuracy, latency, and quota behavior still require the acceptance checks in [TESTING.md](TESTING.md).

## Reuse boundary

Neither reviewed Swiggy prototype's recursive tree contained a `LICENSE` or `COPYING` file, and GitHub repository metadata reported no detected license. Public visibility alone is not an identified code reuse grant. Use those and the unlicensed hardware example as architectural references; resolve licensing or permission before copying code. Preserve the licenses/notices of any licensed dependency we adopt. The VideoSDK example below is also an architectural reference only; no application code was copied. These source reviews do not verify SayCart’s controls or establish real speech quality.
