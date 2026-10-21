import { RealtimeTokenSchema } from "../lib/contracts";

export class VoiceError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 502) {
    super(message);
    this.name = "VoiceError";
  }
}

const MAX_SPEECH_BYTES = 8 * 1024 * 1024;
let speechJobs = 0;
let realtimeTokenJobs = 0;

// Tokens are returned once to the authenticated browser, never persisted or logged.
export async function createRealtimeTranscriptionToken(signal?: AbortSignal): Promise<{token:string}> {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) throw new VoiceError("ELEVENLABS_NOT_CONFIGURED", "Add ELEVENLABS_API_KEY to the app server to enable live dictation.", 503);
  if (signal?.aborted) throw new VoiceError("VOICE_STOPPED", "Dictation was stopped.", 409);
  if (realtimeTokenJobs >= 2) throw new VoiceError("VOICE_BUSY", "Voice is connecting. Please try again in a moment.", 429);
  realtimeTokenJobs++;
  try {
    const response = await fetch("https://api.elevenlabs.io/v1/single-use-token/realtime_scribe", {
      method:"POST", headers:{"xi-api-key":key}, redirect:"error", cache:"no-store",
      signal:AbortSignal.any([AbortSignal.timeout(15_000),...(signal?[signal]:[])])
    });
    if (!response.ok) {
      await response.body?.cancel().catch(()=>undefined);
      if (response.status===401 || response.status===403) throw new VoiceError("ELEVENLABS_AUTH_INVALID", "The ElevenLabs key needs speech-to-text access. Check the server key and its permissions.", 503);
      if (response.status===429) throw new VoiceError("ELEVENLABS_RATE_LIMITED", "ElevenLabs has reached its current allowance. Try again later or type your request.", 429);
      throw new VoiceError("ELEVENLABS_UNAVAILABLE", "ElevenLabs could not start dictation. You can still type your request.", 503);
    }
    const bytes = await boundedBytes(response,16*1024);
    let payload: unknown;
    try { payload = JSON.parse(new TextDecoder().decode(bytes)); }
    catch { throw new VoiceError("ELEVENLABS_INVALID_RESPONSE", "ElevenLabs could not start a voice session. Try again shortly.", 502); }
    const result = RealtimeTokenSchema.safeParse(payload);
    if (!result.success) throw new VoiceError("ELEVENLABS_INVALID_RESPONSE", "ElevenLabs could not start a voice session. Try again shortly.", 502);
    return result.data;
  } catch(error) {
    if(error instanceof VoiceError)throw error;
    if(signal?.aborted)throw new VoiceError("VOICE_STOPPED","Dictation was stopped.",409);
    throw new VoiceError("ELEVENLABS_UNAVAILABLE","Could not connect to ElevenLabs. You can still type your request.",503);
  } finally { realtimeTokenJobs--; }
}

function speechServiceURL(): string {
  const configured = process.env.KOKORO_URL?.trim();
  if (!configured) throw new VoiceError("TTS_NOT_CONFIGURED", "Spoken replies are not configured. Your text response is still available.", 503);
  let url: URL;
  try { url = new URL(`${configured.replace(/\/+$/, "")}/v1/audio/speech`); }
  catch { throw new VoiceError("VOICE_CONFIGURATION_INVALID", "The local speech service URL is not configured correctly.", 503); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new VoiceError("VOICE_CONFIGURATION_INVALID", "The local speech service URL is not configured correctly.", 503);
  }
  return url.toString();
}

async function boundedBytes(response: Response, limit: number): Promise<Uint8Array> {
  if (Number(response.headers.get("content-length")) > limit) {
    await response.body?.cancel().catch(() => undefined);
    throw new VoiceError("VOICE_RESPONSE_TOO_LARGE", "The speech service returned too much data.");
  }
  if (!response.body) throw new VoiceError("VOICE_EMPTY_RESPONSE", "The speech service returned an empty response.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > limit) throw new VoiceError("VOICE_RESPONSE_TOO_LARGE", "The speech service returned too much data.");
      chunks.push(next.value);
    }
  } finally { await reader.cancel().catch(() => undefined); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

// Callers must pass stored assistant text, rather than arbitrary client-supplied speech content.
export async function synthesizeSpeech(text: string, signal?: AbortSignal): Promise<{ audio: ArrayBuffer; contentType: string }> {
  if (signal?.aborted) throw new VoiceError("VOICE_STOPPED", "The voice request was stopped.", 409);
  if (!text.trim() || text.length > 1800) throw new VoiceError("SPEECH_TEXT_INVALID", "The speech response is empty or too long.", 400);
  if (speechJobs >= 2) throw new VoiceError("VOICE_BUSY", "Speech playback is busy. Please try again in a moment.", 429);
  speechJobs++;
  try {
    const response = await fetch(speechServiceURL(), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.KOKORO_MODEL || "kokoro", input: text, voice: process.env.KOKORO_VOICE || "af_heart", response_format: "wav", speed: 1, stream: false }),
      signal: AbortSignal.any([AbortSignal.timeout(90_000), ...(signal ? [signal] : [])]), redirect: "error", cache: "no-store",
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new VoiceError("TTS_UNAVAILABLE", "Local speech playback is unavailable. Your text response is still available.", 503);
    }
    const contentType = response.headers.get("content-type")?.split(";")[0] || "";
    if (!["audio/wav", "audio/x-wav", "audio/wave"].includes(contentType)) {
      await response.body?.cancel().catch(() => undefined);
      throw new VoiceError("TTS_RESPONSE_INVALID", "The speech service did not return WAV audio.");
    }
    const bytes = await boundedBytes(response, MAX_SPEECH_BYTES);
    if (bytes.length < 44 || new TextDecoder().decode(bytes.subarray(0, 4)) !== "RIFF" || new TextDecoder().decode(bytes.subarray(8, 12)) !== "WAVE") throw new VoiceError("TTS_RESPONSE_INVALID", "The speech service returned invalid audio.");
    return { audio: bytes.buffer as ArrayBuffer, contentType: "audio/wav" };
  } catch (error) {
    if (error instanceof VoiceError) throw error;
    if (signal?.aborted) throw new VoiceError("VOICE_STOPPED", "The voice request was stopped.", 409);
    throw new VoiceError("TTS_UNAVAILABLE", "Local speech playback is unavailable. Your text response is still available.", 503);
  } finally { speechJobs--; }
}
