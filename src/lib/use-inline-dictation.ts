"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeConnection } from "@elevenlabs/client";
import { RealtimeTokenSchema } from "./contracts";

export type DictationField = "search" | "category" | "assistant";
type Phase = "idle" | "connecting" | "listening" | "finishing";
type Options = {
  sessionId: string | null;
  csrfToken: string;
  onText: (field: DictationField, text: string) => void;
  onError: (message: string) => void;
};
type Capture = {
  field: DictationField;
  original: string;
  prefix: string;
  suffix: string;
  maxLength: number;
  committed: string[];
  partial: string;
  phase: Phase;
  connection?: RealtimeConnection;
  abort: AbortController;
  timers: Set<ReturnType<typeof setTimeout>>;
  settle?: ReturnType<typeof setTimeout>;
  commitSent: boolean;
  heardSpeech: boolean;
};

function voiceError(kind: string, detail = "") {
  if (/auth|unauthorized|forbidden/.test(kind)) return "ElevenLabs rejected the speech key. Check its speech-to-text permissions on the server.";
  if (/quota|rate|resource/.test(kind)) return "ElevenLabs has reached its current allowance. Your text is kept; you can continue by typing.";
  if (/unaccepted_terms/.test(kind)) return "Open ElevenLabs to finish the account setup before using live dictation.";
  if (/insufficient_audio/.test(kind)) return "No speech was heard. Tap the mic and try again.";
  if (/permission|denied|notallowed/i.test(detail)) return "Allow microphone access for this site in Brave, then tap the mic again.";
  if (/notfound|requested device|no microphone/i.test(detail)) return "No microphone was found. Connect one or type your request.";
  if (/notreadable|could not start|trackstart/i.test(detail)) return "The microphone could not start. Check whether another app is using it.";
  return "Live dictation stopped. Your text is kept; check your connection or continue typing.";
}

/** One microphone connection, with partial text written into its originating field. */
export function useInlineDictation(options: Options) {
  const callbacks = useRef(options);
  const current = useRef<Capture | null>(null);
  const [state, setState] = useState<{field:DictationField|null;phase:Phase;startedAt:number|null;message:string}>({field:null,phase:"idle",startedAt:null,message:""});
  useEffect(()=>{callbacks.current=options;},[options]);

  function dispose(capture: Capture) {
    if(current.current===capture)current.current=null;
    capture.abort.abort();
    capture.timers.forEach(clearTimeout);
    capture.timers.clear();
    capture.connection?.close();
  }

  function complete(capture: Capture, message = "Text ready. Edit it or submit when you’re ready.") {
    if(current.current!==capture)return;
    dispose(capture);
    setState(previous=>({...previous,phase:"idle",message}));
  }

  function fail(capture: Capture, message: string) {
    if(current.current!==capture)return;
    complete(capture,message);
    callbacks.current.onError(message);
  }

  function later(capture:Capture, callback:()=>void, delay:number) {
    const timer=setTimeout(()=>{
      capture.timers.delete(timer);
      if(current.current===capture)callback();
    },delay);
    capture.timers.add(timer);
    return timer;
  }

  function showText(capture: Capture) {
    const spoken=[...capture.committed,capture.partial].filter(Boolean).join(" ");
    // Empty revisions can retract an earlier interim hypothesis.
    if(!spoken){callbacks.current.onText(capture.field,capture.original);return;}
    const left=capture.prefix&&!/\s$/u.test(capture.prefix)?" ":"";
    const right=capture.suffix&&!/^\s/u.test(capture.suffix)?" ":"";
    const room=Math.max(0,capture.maxLength-capture.prefix.length-capture.suffix.length-left.length-right.length);
    if(!room){complete(capture,"This field is full. Review the text before continuing.");return;}
    const bounded=spoken.slice(0,room).replace(/[\uD800-\uDBFF]$/u,"");
    callbacks.current.onText(capture.field,`${capture.prefix}${left}${bounded}${right}${capture.suffix}`);
    if(spoken.length>room)complete(capture,"This field is full. Review the text before continuing.");
  }

  function settleAfterFinal(capture:Capture) {
    if(current.current!==capture||capture.phase!=="finishing"||!capture.commitSent)return;
    if(capture.settle){clearTimeout(capture.settle);capture.timers.delete(capture.settle);}
    // Allow already-sent audio/commit events to drain before closing the socket.
    capture.settle=later(capture,()=>complete(capture),800);
  }

  function finish() {
    const capture=current.current;
    if(!capture || capture.phase==="finishing")return;
    if(capture.phase==="connecting" || !capture.connection){complete(capture,"Dictation cancelled. Your draft is kept.");return;}
    capture.phase="finishing";
    setState(previous=>({...previous,phase:"finishing",message:"Finishing the last words…"}));
    try { capture.connection.mute(); }
    catch { complete(capture,"Your draft is kept. Tap the mic when you’re ready.");return; }
    // The SDK's 4096-sample buffer is ~256 ms at 16 kHz. Muting first and
    // allowing one final buffer avoids cutting off the last spoken word.
    later(capture,()=>{
      try { capture.commitSent=true;capture.connection?.commit(); }
      catch { fail(capture,"The voice connection ended. Your text is kept; check the last words."); }
    },350);
    later(capture,()=>complete(capture,capture.partial?"Text kept. Please check the last few words before submitting.":capture.committed.length?undefined:"No speech was heard. Tap the mic to try again."),6000);
  }

  function cancel(restoreDraft=false) {
    const capture=current.current;
    if(!capture)return;
    if(restoreDraft)callbacks.current.onText(capture.field,capture.original);
    complete(capture,restoreDraft?"Dictation discarded. Your previous draft is restored.":"Dictation stopped. Your text is kept.");
  }

  async function start(field:DictationField,value:string,maxLength:number,selectionStart?:number|null,selectionEnd?:number|null) {
    if(current.current){if(current.current.field===field)finish();return;}
    const rejectStart=(message:string)=>{
      setState({field,phase:"idle",startedAt:null,message});
      options.onError(message);
    };
    if(!options.sessionId||!options.csrfToken){rejectStart("Refresh your shopping session before using voice.");return;}
    if(!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof AudioContext==="undefined" || typeof AudioWorkletNode==="undefined") {
      rejectStart("Live dictation needs microphone access on localhost or HTTPS. You can still type here.");return;
    }
    const from=Math.max(0,Math.min(selectionStart??value.length,value.length));
    const to=Math.max(from,Math.min(selectionEnd??from,value.length));
    if(value.length-(to-from)>=maxLength){rejectStart("This field is full. Select or clear some text before dictating.");return;}
    const capture:Capture={field,original:value,prefix:value.slice(0,from),suffix:value.slice(to),maxLength,committed:[],partial:"",phase:"connecting",abort:new AbortController(),timers:new Set(),commitSent:false,heardSpeech:false};
    current.current=capture;
    setState({field,phase:"connecting",startedAt:null,message:"Connecting… allow microphone access if asked."});
    later(capture,()=>fail(capture,"The microphone connection took too long. Allow access in Brave and try again."),30_000);
    try {
      const [sdk,response]=await Promise.all([
        import("@elevenlabs/client"),
        fetch("/api/transcribe/token",{method:"POST",credentials:"same-origin",cache:"no-store",signal:capture.abort.signal,headers:{"Content-Type":"application/json","X-CSRF-Token":options.csrfToken,"Idempotency-Key":crypto.randomUUID()},body:JSON.stringify({sessionId:options.sessionId})})
      ]);
      if(current.current!==capture)return;
      const result=await response.json().catch(()=>{throw new Error("Could not read the voice-session response. Refresh and try again.");});
      if(!response.ok)throw new Error(typeof result?.error?.message==="string"?result.error.message:"ElevenLabs could not start dictation.");
      const {token}=RealtimeTokenSchema.parse(result);
      if(current.current!==capture)return;
      const connection=sdk.Scribe.connect({
        token,modelId:"scribe_v2_realtime",commitStrategy:sdk.CommitStrategy.MANUAL,noVerbatim:false,
        microphone:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1,workletPaths:{scribeAudioProcessor:"/vendor/elevenlabs/scribe-audio-processor.js"}}
      });
      capture.connection=connection;
      connection.on(sdk.RealtimeEvents.SESSION_STARTED,()=>{
        if(current.current!==capture||capture.phase!=="connecting")return;
        capture.timers.forEach(clearTimeout);capture.timers.clear();
        capture.phase="listening";
        // Session acknowledgement may precede microphone permission.
        setState({field,phase:"listening",startedAt:Date.now(),message:"Voice connected. Allow microphone access, then speak."});
        later(capture,finish,60_000);
      });
      connection.on(sdk.RealtimeEvents.PARTIAL_TRANSCRIPT,data=>{
        if(current.current!==capture || typeof data.text!=="string")return;
        capture.partial=data.text.trim();
        if(capture.partial&&!capture.heardSpeech){
          capture.heardSpeech=true;
          if(capture.phase==="listening")setState(previous=>({...previous,message:"Listening — tap the mic to finish."}));
        }
        showText(capture);
        // A newer partial means the pending final must still be awaited.
        if(capture.partial&&capture.settle){clearTimeout(capture.settle);capture.timers.delete(capture.settle);capture.settle=undefined;}
      });
      connection.on(sdk.RealtimeEvents.COMMITTED_TRANSCRIPT,data=>{
        if(current.current!==capture || typeof data.text!=="string")return;
        if(data.text.trim())capture.committed.push(data.text.trim());
        capture.partial="";
        showText(capture);
        settleAfterFinal(capture);
      });
      connection.on(sdk.RealtimeEvents.ERROR,data=>{
        if(current.current===capture)fail(capture,voiceError(data.message_type,data.error));
      });
      connection.on(sdk.RealtimeEvents.CLOSE,()=>{
        if(current.current===capture)complete(capture,"Dictation ended. Review your text before submitting.");
      });
    } catch(error) {
      if(current.current===capture)fail(capture,error instanceof Error&&error.name!=="ZodError"?error.message:"ElevenLabs returned an unexpected voice-session response.");
    }
  }

  useEffect(()=>{
    const stopWhenHidden=()=>{if(document.hidden)cancel();};
    const stopOnLeave=()=>cancel();
    document.addEventListener("visibilitychange",stopWhenHidden);
    const stopOnEscape=(event:KeyboardEvent)=>{
      if(event.key==="Escape"&&current.current){event.preventDefault();cancel();}
    };
    window.addEventListener("pagehide",stopOnLeave);
    document.addEventListener("keydown",stopOnEscape);
    return()=>{
      document.removeEventListener("visibilitychange",stopWhenHidden);
      window.removeEventListener("pagehide",stopOnLeave);
      document.removeEventListener("keydown",stopOnEscape);
      if(current.current)dispose(current.current);
    };
  },[]);
  useEffect(()=>{cancel();},[options.sessionId]);

  return {...state,busy:state.phase!=="idle",start,finish,cancel};
}
