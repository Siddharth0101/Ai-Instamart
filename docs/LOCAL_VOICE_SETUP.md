# Voice setup

Updated **20 October 2026**. The app’s microphone controls use **ElevenLabs Scribe v2 Realtime** to transcribe directly into the product search, category search or assistant field. There is no separate recorder step. Optional Kokoro spoken replies are independent of dictation.

## Inline dictation configuration

Set the server-only value in `.env.local`, then restart Next.js:

```dotenv
ELEVENLABS_API_KEY=your-server-side-key
```

The browser never receives this API key. It requests a single-use speech token from the owner/CSRF-protected `POST /api/transcribe/token` route with its session ID. The server uses the account key only to mint that token; it does not log or persist tokens. The browser then streams microphone audio directly to ElevenLabs over its SDK connection. [Client streaming guide](https://elevenlabs.io/docs/eleven-api/guides/how-to/speech-to-text/realtime/client-side-streaming), [token API](https://elevenlabs.io/docs/api-reference/tokens/create).

The installed official `@elevenlabs/client` **1.28.0** SDK is loaded only when dictation starts. Its audio worklet is served from the app’s own `/vendor/elevenlabs/` path, with the upstream MIT notice retained. The model is `scribe_v2_realtime`; the hosted model/service is not an open-source local inference runtime. Usage and access depend on the ElevenLabs account, independently of Groq reasoning usage. [SDK source](https://github.com/elevenlabs/packages/tree/main/packages/client).

In Brave, tap the mic beside the field you want to fill and allow microphone access. Partial and committed words appear in that same field, at the selection/cursor captured when dictation starts. Stop sends a manual commit and briefly waits for final words; review any remaining partial text before submitting. **Discard** restores the draft from before dictation. One session runs at a time, with a 60-second capture limit; closing the page, hiding it or pressing Escape stops capture and keeps the current text. Dictation never automatically searches, sends a shopping request, changes the cart or confirms an order.

Use localhost or HTTPS for microphone access. Permission, account, allowance or connection errors leave typing available and preserve recognized text. Recognition can mishear brands, numbers, accents and mixed-language speech; edit the field before submitting. The configured key and the new browser speech path have **not** been live-validated: no tests, builds, typechecks or provider calls were run for this change, following the request to skip testing. See [verification](VERIFICATION.md).

ElevenLabs is the only transcription provider. The unused batch upload route and local Whisper/ffmpeg adapters have been removed. No local speech model or audio decoder is required for microphone dictation.

The app advertises dictation as configured only when its server key is present. This is not an account health check. The mic controls stay disabled until voice is configured and a connected shopping session has an address. `GROQ_API_KEY` is used separately for shopping intent.

## Optional spoken replies

Leave `KOKORO_URL` blank to use text replies. This does not disable ElevenLabs dictation. If you want spoken replies, install Git, uv and a compatible Python environment before following the optional upstream setup below. These installation commands have not been executed as part of the cleanup.

## Kokoro speech output

The reviewed version is [Kokoro-FastAPI at ebd4ec9](https://github.com/remsky/Kokoro-FastAPI/tree/ebd4ec9cc97b258b25afc39444a5e1701055db50). These commands follow its [native launchers](https://github.com/remsky/Kokoro-FastAPI/blob/ebd4ec9cc97b258b25afc39444a5e1701055db50/start-gpu_mac.sh), [configuration](https://github.com/remsky/Kokoro-FastAPI/blob/ebd4ec9cc97b258b25afc39444a5e1701055db50/docs/configuration.md), and [model download helper](https://github.com/remsky/Kokoro-FastAPI/blob/ebd4ec9cc97b258b25afc39444a5e1701055db50/docker/scripts/download_model.py). The helper checks the model and config SHA-256 values declared in that pinned source. We call its model-only function to avoid downloading the unrelated voice tuner.

From this project root:

```bash
git clone https://github.com/remsky/Kokoro-FastAPI.git .local-data/voice-services/Kokoro-FastAPI
cd .local-data/voice-services/Kokoro-FastAPI
git checkout --detach ebd4ec9cc97b258b25afc39444a5e1701055db50
uv venv --python 3.11
uv pip install -e .
uv run --no-sync python - <<'PY'
import runpy
download = runpy.run_path("docker/scripts/download_model.py")
download["download_model"]("api/src/models/v1_0")
PY
```

For Apple Silicon MPS, set the device and run the already installed service:

```bash
export USE_GPU=true
export DEVICE_TYPE=mps
export PYTORCH_ENABLE_MPS_FALLBACK=1
export PYTHONPATH="$PWD:$PWD/api"
export MODEL_DIR="$PWD/api/src/models"
export VOICES_DIR="$PWD/api/src/voices/v1_0"
export DEFAULT_VOICE=af_heart
export API_LOG_LEVEL=WARNING
export ENABLE_WEB_PLAYER=false
export CORS_ENABLED=false
export ENABLE_DEBUG_ENDPOINTS=false
export ALLOW_DEV_UNLOAD=false
export ENABLE_INNO_TUNER=false
export ALLOW_LOCAL_VOICE_SAVING=false
export ENABLE_VOICE_TAGS=false
export ENABLE_SSML=false
export MAX_INPUT_LENGTH=1800
export MAX_TOTAL_PAUSE_S=0
uv run --no-sync uvicorn api.src.main:app --host 127.0.0.1 --port 8880 --workers 1 --no-access-log
```

For native CPU, install the upstream CPU extra with `uv pip install -e '.[cpu]'`, set `USE_GPU=false` and `DEVICE_TYPE=cpu`, and use the same uvicorn command and private configuration. Docker on Apple Silicon uses CPU; native MPS is a separate deployment. Source pinning does not pin every transitive Python package resolved by `uv pip install`; capture and review the working environment before production deployment.

The service warms its model during startup. Test speech generation, rather than treating `/health` alone as proof of readiness:

```bash
curl --fail http://127.0.0.1:8880/v1/audio/speech \
  -H 'Content-Type: application/json' \
  --data '{"model":"kokoro","voice":"af_heart","input":"Your grocery cart is ready to review.","response_format":"wav","stream":false}' \
  --output /tmp/saycart-voice-check.wav
```

Listen to the generated WAV, then delete it. Our adapter requests complete WAV output, validates its type/header, and limits the response to 8 MB. This MVP waits for the complete response before playback; it does not claim end-to-end audio streaming. Two synthesis jobs per app process may run concurrently.

## Connect optional speech output

After starting Kokoro, set these server-only values and restart Next.js:

```dotenv
KOKORO_URL=http://127.0.0.1:8880
KOKORO_MODEL=kokoro
KOKORO_VOICE=af_heart
```

Keep this service private on loopback. The app sends only approved stored assistant replies to it. It checks the WAV response and bounds its size and duration of the request. An unconfigured service is rejected before making a request.

Microphone audio goes directly to ElevenLabs with a single-use token. Explicitly submitted assistant text and bounded shopping context go to Groq. Direct catalog searches do not call the reasoning model. Groq's token counters do not report ElevenLabs speech usage.

Review [VERIFICATION.md](VERIFICATION.md) for the limits of the current setup. Key permissions, speech allowance, microphone capture and recognition accuracy remain unvalidated because testing was skipped.
