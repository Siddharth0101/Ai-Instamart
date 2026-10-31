import { isLikelyEcho, joinSegments, meaningfulSpeech, sameWords, sanitizeKeyterms } from "./voice-text";

/** The voice lifecycle is independent of React and never owns shopping state. */
export type VoiceReply = { silent?: boolean; id: string; version: number; text?: string; speech?: string };
export type VoiceContext = { keyterms: string[]; previousText?: string };
export type ConversationVoicePhase = "idle" | "connecting" | "listening" | "transcribing" | "thinking" | "speaking" | "paused";
export type VoiceOutputSource = "server" | "captions" | null;
export type VoiceTranscriptEntry = { id: string; role: "user" | "assistant"; text: string };
/** `partial` is everything heard in the current utterance so far (merged VAD segments plus the live partial). */
export type VoiceState = { active: boolean; muted: boolean; phase: ConversationVoicePhase; partial: string; outputSource: VoiceOutputSource; transcript: VoiceTranscriptEntry[]; error: string | null };
export type VoiceOptions = {
  csrfToken: string;
  sttAvailable: boolean;
  ttsAvailable: boolean;
  onFinal: (text: string) => Promise<VoiceReply | null>;
  onInterrupt: () => void | Promise<void>;
  onError: (message: string) => void;
  /** On-screen vocabulary and the last assistant text, read whenever a microphone connection opens. */
  context?: () => VoiceContext;
  /** Default true; false shows replies as captions without text-to-speech. */
  speakReplies?: boolean;
  /** Default true; the user can talk over a reply. */
  bargeIn?: boolean;
};
export type VoiceCue = "start" | "heard" | "error";
export type VoiceCapture = { ready: Promise<void>; mute(): void; unmute(): void; close(): void; level?(): number };
export type VoicePlayback = { done: Promise<void>; stop(): void };
export type VoiceHandlers = { processing?():void; partial(text: string): void; committed(text: string): void; error(message: string): void; close(): void };
export type VoiceDependencies = {
  options(): VoiceOptions;
  unavailableReason(): string | null;
  connect(signal: AbortSignal, handlers: VoiceHandlers, context: VoiceContext): Promise<VoiceCapture>;
  play(reply: VoiceReply, signal: AbortSignal, source: (source: VoiceOutputSource) => void): Promise<VoicePlayback>;
  /** Called synchronously inside user gestures so later replies may play audio. */
  unlock?(): void;
  cue?(kind: VoiceCue): void;
  onState(state: VoiceState): void;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
  endOfTurnMs?: number;
  stablePartialMs?: number;
};
export const initialVoiceState: VoiceState = { active: false, muted: false, phase: "idle", partial: "", outputSource: null, transcript: [], error: null };

type Connection = { abort: AbortController; result: Promise<VoiceCapture | null>; signature: string; retryable: boolean; opened: VoiceCapture | null };
type TimerName = "idle" | "end" | "stable";
// Retrying cannot fix exhausted allowance, rejected credentials or a blocked microphone.
const FATAL = /allowance|quota|rate.?limit|authori[sz]|permission|api.?key|secret key|microphone access|no microphone|another app|account setup|terms/i;
const DISCONNECTED = "The microphone disconnected. Your conversation is kept; resume; tapping still works.";

export function createConversationVoiceController(deps: VoiceDependencies) {
  let state: VoiceState = { ...initialVoiceState };
  let epoch = 0, transcriptId = 0, captureEpoch = 0, retries = 1, cued = false;
  let lastReply: VoiceReply | null = null, speaking: VoiceReply | null = null;
  let capture: VoiceCapture | null = null, captureSignature = "", pending: Connection | null = null;
  let pendingSpeech: AbortController | null = null, playback: VoicePlayback | null = null;
  let segments: string[] = [], livePartial = "";
  const timers: Record<TimerName, ReturnType<typeof setTimeout> | null> = { idle: null, end: null, stable: null };
  const later = deps.setTimer ?? setTimeout;
  const clear = deps.clearTimer ?? clearTimeout;
  // The provider already waits for a second of silence before committing. A small
  // merge window handles adjacent segments without adding another long pause.
  const endOfTurnMs = deps.endOfTurnMs ?? 350, stablePartialMs = deps.stablePartialMs ?? 2500;
  const update = (patch: Partial<VoiceState>) => { state = { ...state, ...patch }; deps.onState({ ...state }); };
  const append = (entry: VoiceTranscriptEntry) => {
    if (!state.transcript.some(line => line.id === entry.id)) update({ transcript: [...state.transcript, entry].slice(-60) });
  };
  const current = (value: number) => value === epoch;
  const listening = () => state.active && !state.muted;
  const bargeIn = () => deps.options().bargeIn !== false;
  const heard = () => joinSegments(segments, livePartial).slice(0, 2000);
  const cue = (kind: VoiceCue) => { try { deps.cue?.(kind); } catch { /* Cues are decorative. */ } };
  const unlock = () => { try { deps.unlock?.(); } catch { /* Best effort; playback reports its own failure. */ } };
  function disarm(name: TimerName) { const id = timers[name]; if (id !== null) clear(id); timers[name] = null; }
  function arm(name: TimerName, delay: number, run: () => void) { disarm(name); timers[name] = later(() => { timers[name] = null; run(); }, delay); }
  function resetUtterance() { segments = []; livePartial = ""; disarm("end"); disarm("stable"); }
  function armIdle() {
    arm("idle", 60_000, () => {
      if (state.phase !== "listening") return;
      const message = "Paused after a quiet minute. Tap the mic when you want to continue.";
      pause(); update({ error: message }); deps.options().onError(message);
    });
  }
  function context(): VoiceContext {
    try { const value = deps.options().context?.(); return value && Array.isArray(value.keyterms) ? value : { keyterms: [] }; }
    catch { return { keyterms: [] }; }
  }
  const signatureOf = (value: VoiceContext) => sanitizeKeyterms(value.keyterms).join("\n");
  function stopSpeech() { pendingSpeech?.abort(); pendingSpeech = null; playback?.stop(); playback = null; speaking = null; }
  function closeCapture() {
    ++captureEpoch;
    const previous = capture, connecting = pending; capture = null; pending = null; captureSignature = "";
    connecting?.abort.abort(); connecting?.opened?.close();
    previous?.close();
  }
  function stopWork() { ++epoch; disarm("idle"); resetUtterance(); stopSpeech(); closeCapture(); }
  function fail(message: string) {
    if (!state.active && state.phase === "idle") return;
    stopWork();
    update(state.active ? { muted: true, phase: "paused", error: message } : { phase: "idle", error: message });
    deps.options().onError(message); cue("error");
  }
  function pause() {
    if (!state.active) { if (state.phase !== "idle") { stopWork(); update({ phase: "idle" }); } return; }
    stopWork(); update({ muted: true, phase: "paused" });
  }
  function end() { stopWork(); retries = 1; cued = false; update({ ...initialVoiceState, transcript: state.transcript, partial: state.partial }); }
  function muteCapture() {
    try { capture?.mute(); }
    catch { closeCapture(); }
  }
  function openForBargeIn() {
    try { capture?.unmute(); }
    catch { closeCapture(); }
  }
  /** At most one microphone connection exists: opening one always closes the previous capture first. */
  function connectCapture(retryable: boolean): Connection {
    closeCapture();
    const id = captureEpoch, abort = new AbortController(), vocabulary = context();
    const live = () => id === captureEpoch && listening();
    const entry: Connection = { abort, signature: signatureOf(vocabulary), retryable, opened: null, result: Promise.resolve(null) };
    const handlers: VoiceHandlers = {
      partial: text => { if (live()) hear(text, false); },
      processing: () => { if (live() && state.phase === "listening") { disarm("idle"); disarm("end"); disarm("stable"); update({ phase: "transcribing" }); } },
      committed: text => { if (live()) hear(text, true); },
      error: message => { if (live()) lost(message); },
      close: () => { if (live()) lost(DISCONNECTED); },
    };
    entry.result = (async () => {
      try {
        const connection = await deps.connect(abort.signal, handlers, vocabulary);
        if (!live() || abort.signal.aborted) { connection.close(); return null; }
        entry.opened = connection;
        await connection.ready;
        if (!live() || abort.signal.aborted) return null;
        capture = connection; captureSignature = entry.signature; entry.opened = null;
        if (pending === entry) pending = null;
        if (state.phase === "speaking" && bargeIn()) openForBargeIn();
        return connection;
      } catch (error) {
        if (!live() || abort.signal.aborted) return null;
        // listen() clears the pending entry before handling its error, so release
        // a capture that opened but failed readiness while it is still reachable.
        entry.opened?.close(); entry.opened = null;
        throw error instanceof Error ? error : new Error("The microphone could not start. Check browser permission; tapping still works.");
      }
    })();
    void entry.result.catch(() => undefined); // Observed later by listen().
    pending = entry;
    return entry;
  }
  /** On-screen vocabulary changed since the capture opened: reconnect while the reply plays. */
  function refreshContext() {
    const open = capture ? captureSignature : pending?.signature;
    if (open !== undefined && signatureOf(context()) !== open) connectCapture(true);
  }
  function lost(message: string) {
    if (FATAL.test(message) || retries <= 0) { fail(message); return; }
    retries--;
    if (livePartial) { segments.push(livePartial); livePartial = ""; }
    disarm("end"); disarm("stable");
    const hearing = state.phase === "listening" || state.phase === "transcribing" || state.phase === "connecting";
    connectCapture(true);
    // While a reply is in flight or playing, its own listen() picks up the new connection.
    if (hearing) { const value = ++epoch; disarm("idle"); update({ phase: "connecting" }); void listen(value, false); }
  }
  function finishTurn() { if (state.phase === "listening" && listening()) { const text = heard(); if (text) void submit(text); } }
  function hear(raw: string, final: boolean) {
    const text = typeof raw === "string" ? raw.trim().slice(0, 2000) : "";
    if (state.phase === "transcribing") { if (final) void submit(joinSegments(segments, text)); return; }
    if (state.phase === "speaking") {
      if (!bargeIn() || !meaningfulSpeech(text, final) || isLikelyEcho(text, [speaking?.text, speaking?.speech])) return;
      ++epoch; stopSpeech(); update({ phase: "listening" }); armIdle();
    } else if (state.phase !== "listening") return;
    if (final) {
      livePartial = ""; disarm("stable");
      if (text) { segments.push(text); armIdle(); }
      if (segments.length) arm("end", endOfTurnMs, finishTurn);
    } else {
      if (sameWords(text, segments.at(-1))) return; // A late partial repeating the committed segment.
      const changed = text !== livePartial;
      livePartial = text;
      if (text) { disarm("end"); armIdle(); if (changed) arm("stable", stablePartialMs, finishTurn); }
      else { disarm("stable"); if (segments.length && timers.end === null) arm("end", endOfTurnMs, finishTurn); }
    }
    update({ partial: heard() });
  }
  async function listen(value: number, fresh = true) {
    if (!current(value)) return;
    stopSpeech();
    if (fresh) resetUtterance(); else { disarm("end"); disarm("stable"); }
    while (!capture) {
      if (!current(value) || !listening()) return;
      const entry = pending ?? connectCapture(false);
      if (state.phase !== "connecting") update({ phase: "connecting", partial: heard() });
      try { await entry.result; }
      catch (error) {
        if (!current(value)) return;
        if (pending === entry) pending = null;
        const message = error instanceof Error ? error.message : "The microphone could not start. Check browser permission; tapping still works.";
        if (entry.retryable && retries > 0 && !FATAL.test(message)) { retries--; connectCapture(true); continue; }
        fail(message); return;
      }
    }
    if (!current(value)) return;
    const live = capture;
    try {
      live.unmute();
      if (!current(value) || capture !== live) return; // A reentrant microphone error already took over.
      update({ phase: "listening", partial: heard() });
      armIdle();
      if (segments.length && !livePartial) arm("end", endOfTurnMs, finishTurn);
      if (!cued) { cued = true; cue("start"); }
    } catch { if (current(value)) fail("The microphone could not resume. Your conversation is kept; try again; tapping still works."); }
  }
  async function settle(value: number) {
    if (!current(value)) return;
    if (listening()) await listen(value);
    else { stopSpeech(); update({ phase: state.active ? "paused" : "idle" }); }
  }
  async function say(reply: VoiceReply, value: number) {
    if (!current(value)) return;
    if (reply.text?.trim()) append({ id: `assistant:${reply.id}`, role: "assistant", text: reply.text });
    stopSpeech(); resetUtterance(); disarm("idle");
    if (reply.silent) { await settle(value); return; }
    lastReply = reply;
    const live = listening(), cleared = live ? { partial: "" } : {};
    if (live) { muteCapture(); refreshContext(); }
    if (deps.options().speakReplies === false || !deps.options().ttsAvailable) { update({ outputSource: "captions", ...cleared }); await settle(value); return; }
    update({ phase: "thinking", ...cleared });
    const abort = new AbortController(); pendingSpeech = abort;
    try {
      const next = await deps.play(reply, abort.signal, source => { if (current(value) && !abort.signal.aborted) update({ outputSource: source }); });
      if (!current(value) || abort.signal.aborted) { next.stop(); return; }
      // Sound may have been turned off while the reply audio was being fetched.
      if (deps.options().speakReplies === false || !deps.options().ttsAvailable) {
        next.stop(); pendingSpeech = null;
        update({ outputSource: "captions" });
        await settle(value); return;
      }
      playback = next; speaking = reply; update({ phase: "speaking" });
      if (listening() && bargeIn()) openForBargeIn();
      await next.done;
      if (!current(value) || abort.signal.aborted) return;
      playback = null; pendingSpeech = null; speaking = null;
      await settle(value);
    } catch (error) {
      if (current(value) && !abort.signal.aborted) {
        // An output failure does not invalidate the microphone or the completed order turn.
        // Release any audio first, then keep the conversation usable through captions.
        const message = error instanceof Error ? error.message : "Audio could not play. The reply is shown on screen.";
        stopSpeech(); update({ outputSource: "captions", error: message });
        deps.options().onError(message); cue("error");
        await settle(value);
      }
    }
  }
  async function submit(raw: string, typed = false) {
    const text = raw.trim().slice(0, 2000);
    if (!text) return;
    if (typed ? state.phase === "thinking" : !listening() || (state.phase !== "listening" && state.phase !== "transcribing")) return;
    // Flip phase before awaiting anything: duplicate final events cannot submit twice.
    const value = ++epoch;
    stopSpeech(); resetUtterance(); disarm("idle"); muteCapture();
    update({ phase: "thinking", partial: "", error: null });
    append({ id: `user:${++transcriptId}`, role: "user", text });
    if (!typed) { retries = 1; cue("heard"); }
    try {
      const reply = await deps.options().onFinal(text);
      // A paused microphone must not hide a request that already finished.
      if (reply) {
        if (!reply.silent) lastReply = reply;
        if (reply.text?.trim()) append({ id: `assistant:${reply.id}`, role: "assistant", text: reply.text });
      }
      if (!current(value)) return;
      if (reply) await say(reply, value); else await retryable(value, "That didn't go through. Please say it again.");
    } catch (error) { if (current(value)) await retryable(value, error instanceof Error && error.message.trim() ? error.message : "That didn't go through. Please say it again."); }
  }
  /** A failed request is not a microphone failure: explain it and keep listening, so a rephrase just works. */
  async function retryable(value: number, message: string) {
    update({ error: message }); deps.options().onError(message); cue("error");
    await settle(value);
  }
  function start() {
    unlock();
    if (state.active && !state.muted) return;
    const options = deps.options();
    const reason = !options.sttAvailable ? "Live voice needs a speech-to-text connection. Tapping still works." : !options.csrfToken ? "The app is still connecting. Try the microphone again in a moment." : deps.unavailableReason();
    if (reason) { update({ error: reason }); options.onError(reason); return; }
    stopWork(); retries = 1; cued = false;
    update({ active: true, muted: false, phase: "connecting", partial: "", outputSource: null, error: null });
    void listen(epoch);
  }
  function resume() { start(); }
  async function interrupt() {
    if (!listening() && state.phase !== "thinking" && state.phase !== "speaking") return;
    const value = ++epoch;
    disarm("idle"); resetUtterance(); stopSpeech();
    // Interrupting a stuck startup retries it; otherwise the open microphone is kept.
    if (state.phase === "connecting") closeCapture(); else muteCapture();
    update({ phase: "thinking" });
    try {
      await deps.options().onInterrupt();
      await settle(value);
    } catch { if (current(value)) fail("The current reply could not be interrupted. Your conversation is kept; resume to continue."); }
  }
  async function speak(reply: VoiceReply) {
    if (!listening()) return;
    await say(reply, ++epoch);
  }
  async function replay() {
    if (!lastReply || state.phase === "thinking") return;
    unlock();
    const value = ++epoch; update({ error: null });
    await say(lastReply, value);
  }
  /** Typed text inside voice mode; works with or without a microphone session. */
  async function submitText(text: string) {
    unlock();
    await submit(typeof text === "string" ? text : "", true);
  }
  function sendNow() { if (state.phase === "listening" && listening()) { const text = heard(); if (text) void submit(text); } }
  function level() {
    if (state.phase !== "listening" && state.phase !== "speaking") return 0;
    try { const value = capture?.level?.() ?? 0; return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0; }
    catch { return 0; }
  }
  return { start, end, pause, resume, interrupt, speak, replay, submitText, sendNow, level, getState: () => ({ ...state }) };
}
