import type { VoiceCapture, VoiceHandlers } from "./conversation-voice-controller";

/**
 * Development-only microphone stand-in (open the app with `?fakeMic=1`). It replaces the
 * speech-to-text connection only: `window.saycartVoice.say(text)` delivers the words as live
 * partials and then a committed transcript, exactly as the realtime connection does.
 */
export function fakeMicEnabled() {
  return process.env.NODE_ENV !== "production" && typeof location !== "undefined" && new URLSearchParams(location.search).has("fakeMic");
}

export function fakeMicConnect() {
  let live: { handlers: VoiceHandlers; muted: boolean } | null = null;
  const target = window as typeof window & { saycartVoice?: { say(text: string): Promise<boolean>; ready(): boolean } };
  target.saycartVoice = {
    ready: () => !!live && !live.muted,
    async say(text: string) {
      if (!live || live.muted) return false;
      const words = text.split(/\s+/);
      for (let count = 1; count <= words.length; count += 2) { live.handlers.partial(words.slice(0, count).join(" ")); await new Promise(done => setTimeout(done, 40)); }
      live.handlers.committed(text);
      return true;
    },
  };
  return async (signal: AbortSignal, handlers: VoiceHandlers): Promise<VoiceCapture> => {
    signal.throwIfAborted();
    const entry = { handlers, muted: true };
    live = entry;
    return {
      ready: Promise.resolve(),
      mute: () => { entry.muted = true; },
      unmute: () => { entry.muted = false; },
      close: () => { if (live === entry) live = null; },
      level: () => (entry.muted ? 0 : 0.15),
    };
  };
}
