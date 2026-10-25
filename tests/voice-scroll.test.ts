import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoiceScroller,scrollCommand} from '../src/lib/voice-scroll';

test('scroll commands distinguish direction, immediate stop and unrelated shopping commands',()=>{
  for(const phrase of ['scroll','scroll down','scroll the menu down','please scroll down','neeche scroll karo','नीचे स्क्रॉल करो'])assert.equal(scrollCommand(phrase),'down',phrase);
  for(const phrase of ['scroll up','scroll up the menu','upar scroll karo'])assert.equal(scrollCommand(phrase),'up',phrase);
  for(const phrase of ['stop','stop here','stop now','stop scrolling','ruko','रुको'])assert.equal(scrollCommand(phrase),'stop',phrase);
  for(const phrase of ['stop listening','stop adding biryani','do not scroll down','scroll down and add item two'])assert.equal(scrollCommand(phrase),null,phrase);
});

test('scroll loop reverses, stops at boundaries and ignores frames from stopped runs',()=>{
  let id=0,position=0;const frames=new Map<number,(time:number)=>void>();const changes:string[]=[];
  const scroll=createVoiceScroller({requestFrame:fn=>{frames.set(++id,fn);return id;},cancelFrame:key=>{frames.delete(key);},onChange:direction=>changes.push(direction),move:delta=>{const before=position;position=Math.max(0,Math.min(30,position+delta));return before!==position;}});
  const tick=(time:number)=>{const [key,fn]=frames.entries().next().value!;frames.delete(key);fn(time);};
  scroll.start('down');tick(0);tick(50);assert.equal(position,11);
  const stale=[...frames.values()][0];scroll.start('up');stale(100);assert.equal(position,11);assert.equal(frames.size,1);
  tick(100);tick(150);assert.equal(position,0);tick(200);assert.equal(frames.size,0);assert.equal(changes.at(-1),'stop');
  scroll.start('down');tick(250);tick(300);scroll.stop();assert.equal(frames.size,0);assert.equal(position,11);
  scroll.start('down');tick(350);tick(60351);assert.equal(frames.size,0);assert.equal(changes.at(-1),'stop');
});

test('reduced motion advances one readable page without starting a continuous animation',()=>{
  const moves:number[]=[],changes:string[]=[];
  const scroll=createVoiceScroller({requestFrame:()=>{throw new Error('No animation expected');},cancelFrame:()=>{},move:pixels=>{moves.push(pixels);return true;},onChange:direction=>changes.push(direction),reducedMotion:()=>true,pageSize:()=>420});
  scroll.start('down');scroll.start('up');scroll.start('stop');
  assert.deepEqual(moves,[420,-420]);assert.deepEqual(changes,[]);
});
