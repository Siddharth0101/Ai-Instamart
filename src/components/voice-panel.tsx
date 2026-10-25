"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { VoiceState } from "@/lib/conversation-voice-controller";
import type { ScrollDirection } from "@/lib/voice-scroll";
import { Glyph, money } from "./assistant-ui";

export const voicePhaseLabels = {
  idle: "Tap to talk", connecting: "Connecting…", listening: "Listening",
  transcribing: "Got it", thinking: "Thinking…", speaking: "Speaking", paused: "Paused",
};
type Props = {
  voice: VoiceState; available: boolean; busy: boolean;
  /** Inside a modal sheet the orb sits in the sheet instead of floating over the page. */
  inline?: boolean;
  bargeIn?: boolean;
  scrolling?: ScrollDirection; onStopScroll?(): void;
  level?(): number;
  /** The cart rides in the same pill, so one floating control holds both voice and checkout. */
  cart?: { count: number; totalMinor: number; onOpen(): void };
  /** What the customer could say next; tapping one says it. */
  hints?: string[]; onHint?(text: string): void;
  onStart(): void; onPause(): void; onResume(): void; onEnd(): void; onInterrupt(): void;
};

/** Voice mode is one small orb: the food stays on screen, the conversation stays in the air. */
export function VoicePanel({ voice, available, busy, inline = false, bargeIn = true, scrolling = "stop", onStopScroll, level, cart, hints = [], onHint, onStart, onPause, onResume, onEnd, onInterrupt }: Props) {
  const orb = useRef<HTMLButtonElement>(null);
  const noteId = useId();
  const lastReply = voice.transcript.findLast(line => line.role === "assistant" && !line.id.startsWith("assistant:navigation:"));
  // If speech cannot play, the reply is shown as a caption instead.
  const captionsOnly = voice.outputSource === "captions";
  // An unspoken reply stays readable for a while, then fades: the screen itself keeps the address, cart and checkout prompts.
  const [expiredCaption, setExpiredCaption] = useState<string | null>(null);
  useEffect(() => { if (!captionsOnly || !lastReply) return; const id = lastReply.id, timer = setTimeout(() => setExpiredCaption(id), 10_000); return () => clearTimeout(timer); }, [captionsOnly, lastReply?.id]);
  const caption = captionsOnly && lastReply && expiredCaption !== lastReply.id ? lastReply.text : null;
  useEffect(() => {
    const element = orb.current;
    if (!element || !level || typeof requestAnimationFrame === "undefined") return;
    let frame = 0;
    const tick = () => { element.style.setProperty("--level", (level() || 0).toFixed(3)); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); element.style.removeProperty("--level"); };
  }, [level]);

  // Page work (a tap, a menu loading) shows here too: voice mode hides the page's own progress banners.
  const updating = busy && (voice.phase === "paused" || voice.phase === "idle");
  const live = voice.active && !voice.muted;
  // While still listening, a hiccup fades on its own; a paused microphone keeps its reason visible.
  const [faded, setFaded] = useState<string | null>(null);
  useEffect(() => {
    if (!voice.error) { setFaded(null); return; }
    if (!voice.error || !live) return;
    const timer = setTimeout(() => setFaded(voice.error), 7_000);
    return () => clearTimeout(timer);
  }, [voice.error, live]);
  const phase = !voice.active && voice.phase === "idle" ? "idle" : voice.phase;
  const label = !available ? "Voice unavailable" : updating ? "Working…" : scrolling !== "stop" ? `Scrolling ${scrolling}` : voicePhaseLabels[phase];
  const action = !voice.active || voice.muted ? { run: voice.active ? onResume : onStart, name: voice.error ? "Try voice again" : voice.active ? "Resume listening" : "Start talking" }
    : phase === "thinking" || phase === "speaking" ? { run: onInterrupt, name: bargeIn ? "Interrupt. You can also just speak." : "Interrupt" }
    : { run: onPause, name: "Pause listening" };
  // When a reply could not be spoken, its words matter more than the reason.
  const note = !live && voice.error ? voice.error : caption ?? ((captionsOnly && live) || (live && faded === voice.error) ? null : voice.error);
  // Suggestions only while nothing else is happening: never over a reply, an error or work in progress.
  const quiet = !note && !updating && scrolling === "stop" && (phase === "idle" || phase === "paused" || (phase === "listening" && !voice.partial));
  // Each new screen or turn shows its hints for a few seconds, then they fade so the food stays visible.
  const hintKey = `${hints.join("|")}:${voice.transcript.length}`;
  const [hintsFor, setHintsFor] = useState<string | null>(null);
  useEffect(() => { setHintsFor(hintKey); const timer = setTimeout(() => setHintsFor(null), 8000); return () => clearTimeout(timer); }, [hintKey]);
  const suggestions = available && onHint && quiet && hintsFor === hintKey ? hints.slice(0, inline ? 2 : 3) : [];

  return <aside id={inline ? undefined : "voice-panel"} className={`voice-dock ${inline ? "voice-dock--inline" : ""} voice--${updating ? "thinking" : phase}`} aria-label="Voice assistant">
    {note && <p id={noteId} className={`voice-note ${note === voice.error ? "voice-note--error" : ""}`} role={note === voice.error ? "alert" : "status"} aria-atomic="true">{note}</p>}
    {suggestions.length > 0 && <div className="voice-hints" aria-label="Try saying">{live && <span className="voice-hints-label">Try saying</span>}{suggestions.map(hint => <button type="button" key={hint} className="voice-hint" onClick={() => onHint!(hint)}>“{hint}”</button>)}</div>}
    <div className="voice-pill">
      <button ref={orb} type="button" className="voice-orb" disabled={!available || (updating && voice.muted)} aria-label={action.name} aria-describedby={note ? noteId : undefined} aria-pressed={live} onClick={action.run}>
        <span className="voice-orb-glow" aria-hidden="true"/>
        <span className="voice-orb-core" aria-hidden="true"><Glyph name={phase === "speaking" ? "volume" : "mic"} size={18}/></span>
      </button>
      <span className="voice-label" role="status" aria-live="polite">{label}</span>
      {scrolling !== "stop" && <button type="button" className="voice-chip" onClick={onStopScroll} aria-label="Stop scrolling"><Glyph name="stop" size={13}/></button>}
      {cart && !inline && <button type="button" className="voice-cart" onClick={cart.onOpen} aria-label={`Open cart, ${cart.count} ${cart.count === 1 ? "item" : "items"}, ${money(cart.totalMinor)}`}><Glyph name="bag" size={15}/><span>{cart.count}</span><b>{money(cart.totalMinor)}</b></button>}
      {voice.active && !inline && <button type="button" className="voice-close" onClick={onEnd} aria-label="Stop listening"><Glyph name="close" size={15}/></button>}
    </div>
  </aside>;
}
