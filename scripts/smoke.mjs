// Unconnected-owner HTTP acceptance. Never authorizes or changes a real cart/order.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3000';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname),'Smoke test requires a local app');
const alias=new URL(base);alias.hostname=alias.hostname==='localhost'?'127.0.0.1':'localhost';
if(process.env.TEST_DEV_REDIRECT==='1'){
  const response=await fetch(`${alias.origin}/?connected=1`,{redirect:'manual'});
  assert.equal(response.status,307);assert.equal(response.headers.get('location'),`${base}/?connected=1`);
  assert.equal(response.headers.get('set-cookie'),null,'Redirect must precede owner cookie creation');
  assert.equal((await fetch(`${base}/`,{redirect:'manual'})).status,200,'Canonical page must not redirect again');
}
assert.equal((await fetch(`${alias.origin}/api/bootstrap`)).status,403,'API aliases stay untrusted');
const hostileHostStatus=await new Promise((resolve,reject)=>{
  const send=new URL(base).protocol==='https:'?httpsRequest:httpRequest;
  const req=send(`${base}/api/bootstrap`,{headers:{host:'evil.example'}},response=>{response.resume();resolve(response.statusCode);});
  req.on('error',reject);req.end();
});
assert.equal(hostileHostStatus,403,'Untrusted Host stays rejected');
let cookie='',csrf='';
async function request(path,body,extra={}){
  const response=await fetch(`${base}/api/${path}`,{method:body===undefined?'GET':'POST',headers:{cookie,origin:base,'Content-Type':'application/json','X-CSRF-Token':csrf,'Idempotency-Key':randomUUID(),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
  if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];
  const data=await response.json();assert.equal(typeof data.requestId,'string');return {status:response.status,data};
}
let r=await request('bootstrap');assert.equal(r.status,200);csrf=r.data.csrfToken;
r=await request('session',{mode:'demo'},{origin:alias.origin});assert.equal(r.status,403);
r=await request('session',{mode:'demo'},{origin:'https://evil.example'});assert.equal(r.status,403);
r=await request('session',{mode:'demo'},{'X-CSRF-Token':'bad'});assert.equal(r.status,403);
r=await request('session',{mode:'demo',confirmed:true});assert.equal(r.status,400);
r=await request('session',{mode:'demo'});assert.equal(r.status,400);
r=await request('session',{mode:'live'});assert.equal(r.status,201);let view=r.data;
// A fresh owner has no Instamart account (or, with SAYCART_FIXTURE, an empty development store).
assert.equal(view.mode,'live');assert.equal(typeof view.connected,'boolean');assert.deepEqual(view.products,[]);assert.deepEqual(view.cart.lines,[]);
r=await request('attempt/current');assert.equal(r.status,200);assert.equal(r.data.attempt,null);
// The voice assistant's own boundaries. Nothing below reaches Groq, ElevenLabs or Swiggy:
// every request is rejected, or answered locally, before any model, speech or merchant call.
r=await request('assistant');assert.equal(r.status,200);let plan=r.data;
assert.equal(plan.task.items.length,0);assert.equal(plan.status,'idle');
const sameKey=randomUUID();
const stopped={expectedVersion:plan.version};
r=await request('assistant/stop',stopped,{'Idempotency-Key':sameKey});assert.equal(r.status,200);plan=r.data;
r=await request('assistant/stop',stopped,{'Idempotency-Key':sameKey});assert.equal(r.status,200);assert.equal(r.data.version,plan.version,'A retried request replays its first answer');
r=await request('assistant/stop',{expectedVersion:stopped.expectedVersion+1},{'Idempotency-Key':sameKey});assert.equal(r.status,409,'A reused idempotency key with a different body is refused');
r=await request('assistant/turn',{text:'',expectedVersion:plan.version});assert.equal(r.status,400,'Empty speech never reaches the model');
r=await request('assistant/turn',{text:'show me pizza',expectedVersion:plan.version+5});assert.equal(r.status,409,'A stale screen never reaches the model');
r=await request('assistant/speech',{messageId:'forged-message',expectedVersion:plan.version});assert.ok([404,409].includes(r.status),'Speech only for stored replies');
r=await request('assistant/more',{itemId:'any',expectedVersion:plan.version,offset:999});assert.equal(r.status,400,'Clients cannot supply provider cursors');
r=await request('assistant/select',{offerId:'invented',expectedVersion:plan.version});assert.equal(r.status,422);
r=await request('assistant/cart-line',{offerId:'invented',quantity:2,expectedVersion:plan.version});assert.ok([404,422].includes(r.status));
// Ordering needs a live reviewed total; a forged or missing review is refused before any merchant call.
r=await request('food/state');assert.equal(r.status,200);assert.equal(r.data.review,null);assert.equal(r.data.attempt,null);
r=await request('food/order',{quoteId:'forged-quote'});assert.equal(r.status,409);assert.equal(r.data.error.code,'QUOTE_EXPIRED');
r=await request('food/payment',{paymentId:'cod'});assert.ok(r.status>=400,'Payment needs an open checkout');
r=await request('assistant/reset',{expectedVersion:0});assert.ok([200,409].includes(r.status));
const before=plan.id;
cookie='';r=await request('bootstrap');csrf=r.data.csrfToken;
r=await request('assistant');assert.equal(r.status,200);assert.notEqual(r.data.id,before,'A new browser owner gets its own conversation');
console.log('HTTP smoke passed: origin/Host/CSRF checks, idempotency, stale and forged input rejection before any model, speech or merchant call, order gating and owner isolation. No real cart/order changes.');
