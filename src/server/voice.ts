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

const LANGUAGE_CODE = /^[a-z]{2,3}$/;
/**
 * Scribe language hints. Without them it guesses among ~90 languages and often hears Hinglish
 * as Urdu or Punjabi; secondary codes restrict detection to this set. Clients re-validate them.
 */
export function speechToTextSettings(): { languageCode: string; secondaryLanguages: string[] } {
  const code = (value: string) => value.trim().toLowerCase();
  const primary = code(process.env.ELEVENLABS_STT_LANGUAGE ?? "");
  const languageCode = LANGUAGE_CODE.test(primary) ? primary : "en";
  // Unset means the Hindi default; an explicitly empty value pins recognition to the primary language.
  const secondary = (process.env.ELEVENLABS_STT_SECONDARY_LANGUAGES ?? "hi").split(",").map(code);
  return { languageCode, secondaryLanguages: [...new Set(secondary.filter(value => LANGUAGE_CODE.test(value) && value !== languageCode))].slice(0, 4) };
}

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
      await elevenLabsError(response, "speech-to-text");
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
    throw new VoiceError("ELEVENLABS_UNAVAILABLE","Could not connect to ElevenLabs. Tap the cards and buttons on screen, or try voice again in a moment.",503);
  } finally { realtimeTokenJobs--; }
}

/** Map public error categories, never expose provider payloads or credentials. */
async function elevenLabsError(response: Response, access: "speech-to-text" | "text-to-speech"): Promise<never> {
  let category = "";
  try {
    if (response.headers.get("content-type")?.includes("application/json")) {
      const body = JSON.parse(new TextDecoder().decode(await boundedBytes(response, 16 * 1024)));
      category = typeof body?.detail?.status === "string" ? body.detail.status : "";
    } else await response.body?.cancel();
  } catch { /* Error bodies can be empty or malformed. */ }
  if (category === "api_key_id_used_as_api_key") throw new VoiceError("ELEVENLABS_KEY_ID_CONFIGURED", "ElevenLabs received a key ID instead of a secret API key. Update ELEVENLABS_API_KEY on the server. You can keep browsing and typing.", 503);
  if (/quota_exceeded/.test(category) || response.status === 429) throw new VoiceError("ELEVENLABS_RATE_LIMITED", "ElevenLabs has reached its voice allowance. Try later; tapping works meanwhile.", 429);
  if (/invalid_api_key|missing_permissions|insufficient_permissions/.test(category) || response.status === 401 || response.status === 403) throw new VoiceError("ELEVENLABS_AUTH_INVALID", `The ElevenLabs secret key needs ${access} access. Check the server key and its permissions.`, 503);
  throw new VoiceError(access === "text-to-speech" ? "TTS_UNAVAILABLE" : "ELEVENLABS_UNAVAILABLE", "ElevenLabs voice is temporarily unavailable. Your conversation is kept; try again, or tap the screen meanwhile.", 503);
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

/**
 * Usually ElevenLabs answers in about half a second, but now and then one request stalls for several seconds.
 * A backup request after a short wait answers first in that case; the slower one is cancelled.
 */
async function hedged(request: (abort: AbortSignal) => Promise<Response>, signal?: AbortSignal, after = 2500): Promise<Response> {
  const first = new AbortController(), backup = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<Response>((resolve, reject) => {
    timer = setTimeout(() => request(backup.signal).then(resolve, reject), after);
    // A stopped reply sends no backup request.
    signal?.addEventListener("abort", () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
  });
  try {
    const winner = await Promise.any([request(first.signal).then(response => ({ response, backup: false })), late.then(response => ({ response, backup: true }))]);
    (winner.backup ? first : backup).abort();
    return winner.response;
  } catch (error) { throw error instanceof AggregateError ? error.errors.at(-1) : error; }
  finally { clearTimeout(timer); }
}

// Callers must pass stored assistant text, rather than arbitrary client-supplied speech content.
export async function synthesizeSpeech(text: string, signal?: AbortSignal): Promise<{ audio: ArrayBuffer; contentType: string }> {
  if (signal?.aborted) throw new VoiceError("VOICE_STOPPED", "The voice request was stopped.", 409);
  if (!text.trim() || text.length > 1800) throw new VoiceError("SPEECH_TEXT_INVALID", "The speech response is empty or too long.", 400);
  if (speechJobs >= 2) throw new VoiceError("VOICE_BUSY", "Speech playback is busy. Please try again in a moment.", 429);
  speechJobs++;
  try {
    const key = process.env.ELEVENLABS_API_KEY?.trim();
    if (!key) throw new VoiceError("ELEVENLABS_NOT_CONFIGURED", "Add an ElevenLabs secret API key on the server to enable spoken replies.", 503);
    const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim() || "JBFqnCBsd6RMkjVDRZzb";
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(voiceId)) throw new VoiceError("VOICE_CONFIGURATION_INVALID", "The ElevenLabs voice ID is invalid. Check ELEVENLABS_VOICE_ID on the server.", 503);
    // Flash v2.5 is ElevenLabs' low-latency model and speaks Hindi and English in one voice. Generation time,
    // not the ~128 kbps download, dominates the wait, so the clearer 44.1 kHz output is kept.
    const response = await hedged(abort => fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: "POST", headers: { "Content-Type": "application/json", "xi-api-key": key },
      body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_TTS_MODEL?.trim() || "eleven_flash_v2_5" }),
      signal: AbortSignal.any([AbortSignal.timeout(25_000), abort, ...(signal ? [signal] : [])]), redirect: "error", cache: "no-store",
    }), signal);
    if (!response.ok) await elevenLabsError(response, "text-to-speech");
    const contentType = response.headers.get("content-type")?.split(";")[0] || "";
    if (!["audio/mpeg", "audio/mp3"].includes(contentType)) {
      await response.body?.cancel().catch(() => undefined);
      throw new VoiceError("TTS_RESPONSE_INVALID", "ElevenLabs did not return playable audio.");
    }
    const bytes = await boundedBytes(response, MAX_SPEECH_BYTES);
    const id3 = new TextDecoder().decode(bytes.subarray(0, 3)) === "ID3";
    const frame = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
    if (bytes.length < 16 || (!id3 && !frame)) throw new VoiceError("TTS_RESPONSE_INVALID", "ElevenLabs returned unreadable audio.");
    return { audio: bytes.buffer as ArrayBuffer, contentType: "audio/mpeg" };
  } catch (error) {
    if (error instanceof VoiceError) throw error;
    if (signal?.aborted) throw new VoiceError("VOICE_STOPPED", "The voice request was stopped.", 409);
    throw new VoiceError("TTS_UNAVAILABLE", "ElevenLabs could not speak this reply.", 503);
  } finally { speechJobs--; }
}
