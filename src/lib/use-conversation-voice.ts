"use client";
import { useEffect, useRef, useState } from "react";
import { createConversationVoiceController, initialVoiceState, type VoiceCue, type VoiceState } from "./conversation-voice-controller";
import { browserVoiceTransport, type BrowserVoiceOptions } from "./browser-voice";
import { fakeMicConnect, fakeMicEnabled } from "./fake-voice";
export type { ConversationVoicePhase } from "./conversation-voice-controller";

// [from Hz, to Hz, offset s, duration s]: soft sine earcons, quiet enough to sit under speech.
const CUES: Record<VoiceCue, Array<[number, number, number, number]>> = {
  start: [[587, 587, 0, 0.07], [880, 880, 0.07, 0.07]],
  heard: [[784, 698, 0, 0.09]],
  error: [[330, 196, 0, 0.24]],
};
function cuePlayer() {
  let context: AudioContext | null = null;
  const audio = () => {
    if ((!context || context.state === "closed") && typeof AudioContext !== "undefined") context = new AudioContext();
    return context;
  };
  return {
    /** Inside a user gesture, so later cues are allowed to sound. */
    prime() { try { const ctx = audio(); if (ctx?.state === "suspended") void ctx.resume().catch(() => undefined); } catch { /* Cues are optional. */ } },
    play(kind: VoiceCue) {
      try {
        const ctx = audio();
        if (!ctx) return;
        // A suspended clock would play the tone late, out of step with the voice state.
        if (ctx.state !== "running") { void ctx.resume().catch(() => undefined); return; }
        const now = ctx.currentTime + 0.01;
        for (const [from, to, offset, duration] of CUES[kind]) {
          const at = now + offset, oscillator = ctx.createOscillator(), gain = ctx.createGain();
          oscillator.type = "sine"; oscillator.frequency.setValueAtTime(from, at);
          if (to !== from) oscillator.frequency.exponentialRampToValueAtTime(to, at + duration);
          gain.gain.setValueAtTime(0.0001, at);
          gain.gain.exponentialRampToValueAtTime(0.045, at + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
          oscillator.connect(gain); gain.connect(ctx.destination);
          oscillator.onended = () => { try { oscillator.disconnect(); gain.disconnect(); } catch { /* Already released. */ } };
          oscillator.start(at); oscillator.stop(at + duration + 0.02);
        }
      } catch { /* Cues are optional. */ }
    },
    close() { const ctx = context; context = null; try { void ctx?.close().catch(() => undefined); } catch { /* Already closed. */ } },
  };
}

/** Only completed utterances (or typed voice-panel text) reach the shared, versioned assistant turn API. */
export function useConversationVoice(options:BrowserVoiceOptions){
  const callbacks=useRef(options);callbacks.current=options;
  const [state,setState]=useState<VoiceState>({...initialVoiceState});
  const [inputSource,setInputSource]=useState<"elevenlabs"|null>(null);
  const cues=useRef<ReturnType<typeof cuePlayer>|null>(null);
  const controller=useRef<ReturnType<typeof createConversationVoiceController>|null>(null);
  const unlock=useRef<()=>void>(()=>{});
  if(!controller.current){
    const transport=browserVoiceTransport(()=>callbacks.current,setInputSource);
    const sound=cues.current=cuePlayer();
    unlock.current=()=>{transport.unlock();sound.prime();};
    controller.current=createConversationVoiceController({
      options:()=>callbacks.current,
      unavailableReason:()=>fakeMicEnabled()?null:typeof navigator==="undefined"||!navigator.mediaDevices?.getUserMedia?"Microphone access needs a secure browser page. Open the local app URL; tapping works meanwhile.":null,
      connect:fakeMicEnabled()?fakeMicConnect():transport.connect,play:transport.play,unlock:()=>{transport.unlock();sound.prime();},cue:kind=>sound.play(kind),onState:setState,
    });
  }
  useEffect(()=>{
    const voice=controller.current!,sound=cues.current;
    // Fetch the speech SDK while the page is idle, so the first tap on Talk to order connects without waiting for it.
    const warm=()=>{void import("@elevenlabs/client").catch(()=>undefined);};
    const idle=typeof requestIdleCallback==="function"?requestIdleCallback(warm,{timeout:4000}):setTimeout(warm,2500);
    // Hiding the tab pauses the microphone; coming back resumes only a conversation the tab paused, never a manual pause.
    let hiddenPause=false;
    const hide=()=>{
      const current=voice.getState();
      if(document.hidden){if(current.active&&!current.muted){hiddenPause=true;voice.pause();}}
      else if(hiddenPause){hiddenPause=false;if(current.active&&current.muted&&!current.error)voice.resume();}
    };
    const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"){hiddenPause=false;voice.pause();}};
    document.addEventListener("visibilitychange",hide);document.addEventListener("keydown",escape);
    return ()=>{if(typeof cancelIdleCallback==="function"&&typeof requestIdleCallback==="function")cancelIdleCallback(idle as number);else clearTimeout(idle as ReturnType<typeof setTimeout>);voice.end();sound?.close();document.removeEventListener("visibilitychange",hide);document.removeEventListener("keydown",escape);};
  },[]);
  // Voice can start without a tap; audio playback may then wait for the first touch, which calls this.
  return {...state,inputSource,...controller.current,unlock:()=>unlock.current()};
}
