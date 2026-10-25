import assert from 'node:assert/strict';
import test from 'node:test';
import {createElement,type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {VoicePanel} from '../src/components/voice-panel';
import {initialVoiceState,type VoiceState} from '../src/lib/conversation-voice-controller';
const render=(state:Partial<VoiceState>={},props:Partial<ComponentProps<typeof VoicePanel>>={})=>renderToStaticMarkup(createElement(VoicePanel,{voice:{...initialVoiceState,...state},available:true,busy:false,onStart:()=>{},onPause:()=>{},onResume:()=>{},onEnd:()=>{},onInterrupt:()=>{},...props}));
test('voice mode is one small orb: no transcript, captions, typing box or settings footer',()=>{
 const html=render({active:true,phase:'listening',partial:'open restaurant two',transcript:[{id:'user:1',role:'user',text:'Open restaurant two'},{id:'assistant:a',role:'assistant',text:'Here is the menu.'}]});
 assert.match(html,/Listening/);assert.match(html,/Stop listening/);assert.match(html,/Pause listening/);
 assert.doesNotMatch(html,/open restaurant two|Open restaurant two|Here is the menu|transcript|>Type<|Sound on|<input/i);
});
test('the orb action follows the phase: start, pause, interrupt, resume',()=>{
 assert.match(render(),/aria-label="Start talking"/);assert.match(render(),/Tap to talk/);
 assert.match(render({active:true,phase:'thinking'}),/aria-label="Interrupt\. You can also just speak\."/);
 assert.match(render({active:true,phase:'speaking'}),/Speaking/);
 assert.match(render({active:true,muted:true,phase:'paused'}),/aria-label="Resume listening"/);
});
test('errors show one plain line and the orb offers a retry',()=>{
 const html=render({active:true,muted:true,phase:'paused',error:'Allow microphone access for this site in your browser, then resume.'});
 assert.match(html,/role="alert"/);assert.match(html,/Allow microphone access/);assert.match(html,/Try voice again/);
 assert.match(render({error:'Voice disconnected.'}),/Try voice again/);
});
test('spoken replies stay off screen; only a captions-only reply is shown',()=>{
 const transcript=[{id:'assistant:a',role:'assistant' as const,text:'Here are the restaurants.'}];
 assert.doesNotMatch(render({active:true,phase:'listening',outputSource:'server',transcript}),/Here are the restaurants/);
 const caption=render({active:true,phase:'listening',outputSource:'captions',transcript});
 assert.match(caption,/Here are the restaurants/);
 assert.match(caption,/aria-describedby=/);
 assert.doesNotMatch(caption,/<input|<textarea|contenteditable/i);
 const paused=render({active:true,muted:true,phase:'paused',outputSource:'captions',transcript,error:'Allow microphone access, then resume.'});
 assert.match(paused,/Allow microphone access/);
 assert.doesNotMatch(paused,/Here are the restaurants/);
});
test('unavailable voice, order updates and scrolling are named in the single status line',()=>{
 const off=render({}, {available:false});assert.match(off,/Voice unavailable/);assert.match(off,/disabled=""/);assert.doesNotMatch(off,/secret key|ElevenLabs/);
 assert.match(render({active:true,muted:true,phase:'paused'},{busy:true}),/Working…/);
 const scrolling=render({active:true,phase:'listening'},{scrolling:'down'});assert.match(scrolling,/Scrolling down/);assert.match(scrolling,/Stop scrolling/);
 assert.doesNotMatch(render({active:true,phase:'listening'},{inline:true}),/Stop listening|id="voice-panel"/);
});
test('the voice dock exposes the cart count and amount without a text entry control',()=>{
 const html=render({active:true,phase:'listening'},{cart:{count:2,totalMinor:42500,onOpen:()=>{}}});
 assert.match(html,/aria-label="Open cart, 2 items, ₹425"/);
 assert.doesNotMatch(html,/<input|<textarea|contenteditable/i);
 assert.doesNotMatch(render({active:true,phase:'listening'},{inline:true,cart:{count:2,totalMinor:42500,onOpen:()=>{}}}),/Open cart/);
});
