import type { RealtimeConnection } from "@elevenlabs/client";
import type { VoiceCapture, VoiceContext, VoiceHandlers, VoiceOptions, VoicePlayback, VoiceReply, VoiceOutputSource } from "./conversation-voice-controller";
import { fitKeyterms, languageHints, sanitizeKeyterms, trimContextText } from "./voice-text";
export type BrowserVoiceOptions = VoiceOptions;
const headers = (options: BrowserVoiceOptions, type = "application/json") => ({ "Content-Type": type, "X-CSRF-Token": options.csrfToken, "Idempotency-Key": crypto.randomUUID() });
function micError(error: unknown): Error {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  if (/NotAllowed|SecurityError|permission.*denied/i.test(message)) return new Error("Allow microphone access for this site in your browser, then resume. Everything on screen also works by tapping.");
  if (/NotFound|no microphone|Requested device not found/i.test(message)) return new Error("No microphone was found. Connect one, then resume; tapping works meanwhile.");
  if (/NotReadable|TrackStart|Could not start audio source/i.test(message)) return new Error("The microphone could not start. Check whether another app is using it, then resume.");
  return error instanceof Error ? error : new Error("The microphone could not start. Resume; tapping still works.");
}
function voiceError(detail: string) {
  const error = micError(new Error(detail));
  return /quota|rate.?limit|resource.?exhausted/i.test(detail) ? "ElevenLabs voice reached its allowance. Try later; tapping still works."
    : /Allow microphone|No microphone|another app/.test(error.message) ? error.message
    : /unaccepted.?terms/i.test(detail) ? "Open ElevenLabs to finish the account setup before using live voice."
    : /auth|permission|api.key/i.test(detail) ? "ElevenLabs could not authorize voice. Check the server secret key and speech-to-text permissions."
    : "ElevenLabs voice disconnected. Try again; tapping still works.";
}
/** The server refused the session settings (not the user or the network): retry with fewer options. */
class RejectedSettings extends Error { constructor(message: string, readonly hinted: boolean) { super(message); } }
type Plan = { keyterms: string[]; previousText?: string; hints: boolean };
type Meter = { source: MediaStreamAudioSourceNode; analyser: AnalyserNode; samples: Float32Array<ArrayBuffer> };
let silence: string | null = null;
/** 10 ms of 8 kHz 8-bit silence (124 bytes): playing it inside a gesture unlocks later replies. */
function silentWav() {
  if (silence) return silence;
  const samples = 80, bytes = new Uint8Array(44 + samples), view = new DataView(bytes.buffer);
  const ascii = (offset: number, text: string) => { for (let index = 0; index < text.length; index++) bytes[offset + index] = text.charCodeAt(index); };
  ascii(0, "RIFF"); view.setUint32(4, 36 + samples, true); ascii(8, "WAVEfmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true); view.setUint32(28, 8000, true); view.setUint16(32, 1, true); view.setUint16(34, 8, true); ascii(36, "data"); view.setUint32(40, samples, true); bytes.fill(128, 44);
  // A blob: URL, because the page's media-src policy allows 'self' and blob: but not data:.
  return silence = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
}

/** Keep one microphone connection, muted while thinking; replies reuse one unlocked audio element. */
export function browserVoiceTransport(options: () => BrowserVoiceOptions, input: (source: "elevenlabs") => void, loadSdk = () => import("@elevenlabs/client")) {
  let player: HTMLAudioElement | null = null, audioContext: AudioContext | null = null, stopActive: (() => void) | null = null;
  function sharedContext() {
    if (!audioContext && typeof AudioContext !== "undefined") audioContext = new AudioContext();
    return audioContext;
  }
  /** Must run synchronously inside a user gesture (start, typed send, replay). */
  function unlock() {
    try {
      if (!player && typeof Audio !== "undefined") player = new Audio();
      // A reply that is already playing proves the element is unlocked; never cut it off.
      if (player && !stopActive) { player.src = silentWav(); void player.play()?.catch(() => undefined); }
    } catch { /* Best effort: playback reports its own failure. */ }
    try { const context = sharedContext(); if (context?.state === "suspended") void context.resume().catch(() => undefined); }
    catch { /* The level meter simply stays at zero. */ }
  }
  function createMeter(connection: RealtimeConnection): Meter | null {
    const track = connection._mediaStreamTrack, context = sharedContext();
    if (!track || !context || typeof MediaStream === "undefined") return null;
    const source = context.createMediaStreamSource(new MediaStream([track]));
    const analyser = context.createAnalyser(); analyser.fftSize = 512; analyser.smoothingTimeConstant = 0;
    source.connect(analyser);
    if (context.state === "suspended") void context.resume().catch(() => undefined);
    return { source, analyser, samples: new Float32Array(analyser.fftSize) };
  }
  async function connect(signal: AbortSignal, handlers: VoiceHandlers, context: VoiceContext = { keyterms: [] }): Promise<VoiceCapture> {
    signal.throwIfAborted();
    if (!options().sttAvailable) throw new Error("ElevenLabs voice is not configured. Tapping still works.");
    let plan: Plan = { keyterms: fitKeyterms(sanitizeKeyterms(context?.keyterms ?? [])), previousText: trimContextText(context?.previousText), hints: true };
    for (;;) {
      try { return await realtime(signal, handlers, plan); }
      catch (error) {
        if (!(error instanceof RejectedSettings)) throw error;
        // Optional biasing must never cost the user the microphone: drop it first, then the language hints.
        if (plan.keyterms.length || plan.previousText) plan = { keyterms: [], hints: true };
        else if (plan.hints && error.hinted) plan = { keyterms: [], hints: false };
        else throw new Error(error.message);
      }
    }
  }
  async function realtime(signal: AbortSignal, handlers: VoiceHandlers, plan: Plan): Promise<VoiceCapture> {
    const response = await fetch("/api/assistant/voice/token", { method: "POST", credentials: "same-origin", signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)]), headers: headers(options()), body: "{}" });
    const data = await response.json().catch(() => { throw new Error("ElevenLabs could not connect. Try again; tapping still works."); });
    if (!response.ok || typeof data?.token !== "string") throw new Error(data?.error?.message ?? "Realtime voice could not connect.");
    signal.throwIfAborted();
    const sdk = await loadSdk(); signal.throwIfAborted();
    const hints = plan.hints ? languageHints(data) : {}, hinted = !!hints.languageCode;
    let connection: RealtimeConnection;
    try {
      connection = sdk.Scribe.connect({
        token: data.token, modelId: "scribe_v2_realtime", commitStrategy: sdk.CommitStrategy.VAD, vadSilenceThresholdSecs: 1.0, minSpeechDurationMs: 200, filterBackgroundAudio: true, noVerbatim: true, ...hints,
        ...(plan.keyterms.length ? { keyterms: plan.keyterms } : {}), ...(plan.previousText ? { previousText: plan.previousText } : {}),
        microphone: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1, workletPaths: { scribeAudioProcessor: "/vendor/elevenlabs/scribe-audio-processor.js" } },
      });
    } catch { throw new RejectedSettings("ElevenLabs could not start voice with these settings. Try again; tapping still works.", hinted); }
    let closed = false, started = false, established = false, settled = false, meter: Meter | null | undefined, smoothed = 0;
    let resolve!: () => void, reject!: (error: Error) => void;
    const ready = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
    const check = setInterval(() => {
      if (!started || closed) return;
      try { connection.mute(); settled = true; clearInterval(check); clearTimeout(timeout); resolve(); }
      catch { /* Server acknowledgement can precede microphone/worklet setup. */ }
    }, 50);
    const timeout = setTimeout(() => { if (!settled) { settled = true; reject(new Error("The microphone took too long to start. Check browser permission, then resume.")); } }, 30_000);
    const releaseMeter = () => { try { meter?.source.disconnect(); meter?.analyser.disconnect(); } catch { /* Already released. */ } meter = null; };
    const close = () => {
      if (closed) return;
      closed = true; clearInterval(check); clearTimeout(timeout); signal.removeEventListener("abort", close); releaseMeter(); connection.close();
      if (!settled) { settled = true; reject(new Error("Voice was stopped.")); }
    };
    signal.addEventListener("abort", close, { once: true });
    connection.on(sdk.RealtimeEvents.SESSION_STARTED, () => { started = true; });
    connection.on(sdk.RealtimeEvents.PARTIAL_TRANSCRIPT, data => { if (established && !closed && typeof data.text === "string") handlers.partial(data.text); });
    connection.on(sdk.RealtimeEvents.COMMITTED_TRANSCRIPT, data => { if (established && !closed && typeof data.text === "string") handlers.committed(data.text); });
    connection.on(sdk.RealtimeEvents.ERROR, data => {
      if (closed) return;
      const message = voiceError(`${data.message_type ?? ""} ${data.error ?? ""}`);
      if (!established) { if (!settled) { settled = true; reject(data.message_type === "invalid_request" ? new RejectedSettings(message, hinted) : new Error(message)); } }
      else handlers.error(message);
    });
    connection.on(sdk.RealtimeEvents.CLOSE, () => {
      if (closed) return;
      if (established) handlers.close();
      else if (!settled) { settled = true; reject(new Error("Realtime voice disconnected before the microphone was ready.")); }
    });
    try { await ready; signal.throwIfAborted(); }
    catch (error) { close(); throw error instanceof RejectedSettings ? error : micError(error); }
    established = true; input("elevenlabs");
    // A smoothed 0..1 input level for the UI meter; WebAudio failures only ever read as silence.
    const level = () => {
      if (closed) return 0;
      try {
        if (connection.isMuted) { smoothed = 0; return 0; }
        if (meter === undefined) meter = createMeter(connection);
        if (!meter) return 0;
        meter.analyser.getFloatTimeDomainData(meter.samples);
        let sum = 0; for (const sample of meter.samples) sum += sample * sample;
        const rms = Math.sqrt(sum / meter.samples.length);
        // -55 dBFS (room tone) reads as 0 and -5 dBFS (close speech) as 1.
        const target = rms > 0 ? Math.min(1, Math.max(0, (20 * Math.log10(rms) + 55) / 50)) : 0;
        smoothed += (target - smoothed) * (target > smoothed ? 0.6 : 0.15);
        return smoothed;
      } catch { releaseMeter(); return 0; }
    };
    return { ready: Promise.resolve(), mute: () => connection.mute(), unmute: () => connection.unmute(), close, level };
  }
  async function play(reply: VoiceReply, signal: AbortSignal, source: (value: VoiceOutputSource) => void): Promise<VoicePlayback> {
    if (!options().ttsAvailable) {
      source("captions");
      throw new Error("ElevenLabs spoken replies are not configured.");
    }
    const playback = await playServer(reply, signal);
    source("server");
    return playback;
  }
  async function playServer(reply: VoiceReply, signal: AbortSignal): Promise<VoicePlayback> {
    const response = await fetch("/api/assistant/speech", { method: "POST", credentials: "same-origin", signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]), headers: headers(options()), body: JSON.stringify({ messageId: reply.id, expectedVersion: reply.version }) });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error?.message ?? "ElevenLabs could not speak this reply.");
    }
    if (!response.headers.get("content-type")?.startsWith("audio/")) { await response.body?.cancel(); throw new Error("ElevenLabs returned unreadable audio."); }
    const blob = await response.blob(); signal.throwIfAborted();
    stopActive?.(); // Only one reply owns the shared element.
    const url = URL.createObjectURL(blob);
    let audio: HTMLAudioElement;
    try { if (player) { audio = player; audio.src = url; } else audio = new Audio(url); }
    catch (error) { URL.revokeObjectURL(url); throw error; }
    let resolve!: () => void, reject!: (error: Error) => void, settled = false;
    const done = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
    void done.catch(() => undefined); // A playback error can precede audio.play() settling.
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true; if (stopActive === stop) stopActive = null;
      clearTimeout(timeout); signal.removeEventListener("abort", stop); audio.onended = null; audio.onerror = null; audio.pause(); audio.src = ""; URL.revokeObjectURL(url);
      if (error) reject(error); else resolve();
    };
    const stop = () => finish();
    stopActive = stop;
    const timeout = setTimeout(() => finish(new Error("Audio playback took too long. The reply is shown on screen.")), 120_000);
    audio.onended = () => finish(); audio.onerror = () => finish(new Error("Audio could not play. The reply is shown on screen."));
    signal.addEventListener("abort", stop, { once: true });
    try { await Promise.race([audio.play(), done]); signal.throwIfAborted(); }
    catch (error) { finish(); throw error; }
    return { done, stop };
  }
  return { connect, play, unlock };
}
