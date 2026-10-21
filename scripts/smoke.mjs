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
assert.equal(view.mode,'live');assert.equal(view.connected,false);assert.deepEqual(view.products,[]);assert.deepEqual(view.cart.lines,[]);
const sameKey=randomUUID(),payload={sessionId:view.sessionId,expectedTurnVersion:view.turnVersion};
r=await request('stop',payload,{'Idempotency-Key':sameKey});assert.equal(r.status,200);view=r.data;
r=await request('stop',payload,{'Idempotency-Key':sameKey});assert.equal(r.data.turnVersion,view.turnVersion);
r=await request('stop',Object.fromEntries(Object.entries(payload).reverse()),{'Idempotency-Key':sameKey});assert.equal(r.status,200);assert.equal(r.data.turnVersion,view.turnVersion);
r=await request('stop',{...payload,expectedTurnVersion:999},{'Idempotency-Key':sameKey});assert.equal(r.status,409);
r=await request('turn',{sessionId:view.sessionId,text:'find milk',expectedTurnVersion:view.turnVersion,expectedCartRevision:view.cart.revision});assert.equal(r.status,401);assert.equal(r.data.error.code,'SWIGGY_NOT_CONNECTED');
r=await request('attempt/current');assert.equal(r.status,200);assert.equal(r.data.attempt,null);
const firstSessionId=view.sessionId;
cookie='';r=await request('bootstrap');csrf=r.data.csrfToken;
r=await request('stop',{sessionId:firstSessionId,expectedTurnVersion:0});assert.equal(r.status,404);
console.log('HTTP smoke passed: live-only sessions, rejected demo mode, URL/origin/CSRF checks, strict schemas, idempotency and owner isolation. No real cart/order changes.');
