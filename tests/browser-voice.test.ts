import assert from "node:assert/strict";
import test from "node:test";
import { browserVoiceTransport, type BrowserVoiceOptions } from "../src/lib/browser-voice";
import type { VoiceHandlers } from "../src/lib/conversation-voice-controller";

const options: BrowserVoiceOptions = {csrfToken:"test-csrf",sttAvailable:true,ttsAvailable:true,onFinal:async()=>null,onError:()=>{},onInterrupt:()=>{}};
const handlers: VoiceHandlers = {partial:()=>{},committed:()=>{},error:()=>{},close:()=>{}};
const flush = async () => { for(let i=0;i<15;i++) await Promise.resolve(); };
function sdkFixture() {
  const listeners = new Map<string, (data: {text?:string; error?:string; message_type?:string})=>void>();
  const counts = {closed:0,muted:0,unmuted:0};
  const sdk = {
    Scribe:{connect:()=>({on:(event:string,fn:(data:{text?:string})=>void)=>listeners.set(event,fn),mute:()=>counts.muted++,unmute:()=>counts.unmuted++,close:()=>counts.closed++})},
    CommitStrategy:{VAD:"vad"},RealtimeEvents:{SESSION_STARTED:"started",PARTIAL_TRANSCRIPT:"partial",COMMITTED_TRANSCRIPT:"committed",ERROR:"error",CLOSE:"close"},
  } as unknown as typeof import("@elevenlabs/client");
  return {sdk,counts,emit:(event:string,data={})=>listeners.get(event)?.(data)};
}

test("ElevenLabs credential rejection is visible and the next attempt retries ElevenLabs", async t => {
  const paths:string[]=[]; let sdkLoads=0;
  t.mock.method(globalThis,"fetch",async (url:unknown)=>{paths.push(String(url));return Response.json({error:{message:"Replace the key ID with the secret API key."}},{status:503});});
  const transport=browserVoiceTransport(()=>options,()=>{},async()=>{sdkLoads++;throw new Error("should not load");});
  for(let i=0;i<2;i++) await assert.rejects(transport.connect(new AbortController().signal,handlers),/secret API key/);
  assert.deepEqual(paths,["/api/assistant/voice/token","/api/assistant/voice/token"]);
  assert.equal(sdkLoads,0);
});

test("realtime partials and final words reach the UI, and closed capture ignores late speech", async t => {
  t.mock.method(globalThis,"fetch",async()=>Response.json({token:"fixture-single-use"}));
  const fixture=sdkFixture();const partials:string[]=[];const finals:string[]=[];const sources:string[]=[];
  const transport=browserVoiceTransport(()=>options,source=>sources.push(source),async()=>fixture.sdk);
  const pending=transport.connect(new AbortController().signal,{...handlers,partial:text=>partials.push(text),committed:text=>finals.push(text)});
  await flush();fixture.emit("started");const capture=await pending;t.after(capture.close);
  fixture.emit("partial",{text:"restaurant"});fixture.emit("committed",{text:"restaurant two"});
  capture.unmute();capture.mute();capture.close();fixture.emit("committed",{text:"late speech"});
  assert.deepEqual(partials,["restaurant"]);assert.deepEqual(finals,["restaurant two"]);assert.deepEqual(sources,["elevenlabs"]);
  assert.equal(fixture.counts.closed,1);assert.equal(fixture.counts.unmuted,1);
});

test("ending during microphone setup closes the ElevenLabs connection", async t => {
  t.mock.method(globalThis,"fetch",async()=>Response.json({token:"fixture-single-use"}));
  const fixture=sdkFixture();const abort=new AbortController();
  const transport=browserVoiceTransport(()=>options,()=>{},async()=>fixture.sdk);
  const pending=transport.connect(abort.signal,handlers);await flush();abort.abort();
  await assert.rejects(pending,/stopped/i);assert.equal(fixture.counts.closed,1);
});

test("TTS failure returns the actionable ElevenLabs error without browser speech fallback", async t => {
  const paths:string[]=[];
  t.mock.method(globalThis,"fetch",async (url:unknown,init?:RequestInit)=>{paths.push(String(url));assert.deepEqual(JSON.parse(String(init?.body)),{messageId:"reply",expectedVersion:4});return Response.json({error:{message:"The secret key needs text-to-speech access."}},{status:503});});
  const transport=browserVoiceTransport(()=>options,()=>{});
  await assert.rejects(transport.play({id:"reply",version:4,text:"private saved reply"},new AbortController().signal,()=>{}),/text-to-speech access/);
  assert.deepEqual(paths,["/api/assistant/speech"]);
});

test("audio playback releases its object URL and player when ended or aborted", async t => {
  const previous = Object.getOwnPropertyDescriptor(globalThis,"Audio");
  let player: FakeAudio | undefined;
  class FakeAudio {
    src="";onended:(()=>void)|null=null;onerror:(()=>void)|null=null;pauses=0;
    constructor(url:string){this.src=url;player=this;}
    play(){return Promise.resolve();} pause(){this.pauses++;}
  }
  Object.defineProperty(globalThis,"Audio",{value:FakeAudio,configurable:true,writable:true});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,"Audio",previous);else Reflect.deleteProperty(globalThis,"Audio");});
  let revoked=0;
  t.mock.method(URL,"createObjectURL",()=>"blob:fixture");t.mock.method(URL,"revokeObjectURL",()=>{revoked++;});
  t.mock.method(globalThis,"fetch",async()=>new Response(new Uint8Array(64),{headers:{"content-type":"audio/mpeg"}}));
  const transport=browserVoiceTransport(()=>options,()=>{});
  for(const finish of ["ended","aborted"]){
    const abort=new AbortController();const sources:string[]=[];
    const playback=await transport.play({id:"reply",version:1},abort.signal,source=>sources.push(String(source)));
    assert.deepEqual(sources,["server"]);
    if(finish==="ended")player!.onended!();else abort.abort();
    await playback.done;playback.stop();
    assert.equal(player!.src,"");assert.equal(player!.pauses,1);
  }
  assert.equal(revoked,2);
});
