import { after, test } from "node:test";
import assert from "node:assert/strict";
import { verifySwiggyConnection } from "../src/server/service";
import { fixtureService, milkId, breadId, rememberSearch } from "./helpers/live-provider";
import { createAssistantService } from "../src/server/assistant";
const fixtures=fixtureService();
const {createOwner,startSession,selectAddress,selectPayment,updateCart,createQuote,confirmQuote,getCurrentAttempt,getView}=fixtures.service;
import { database,read,write } from "../src/server/store";
import { AgentIntentSchema,SessionViewSchema } from "../src/lib/contracts";
import { canonicalFingerprint,seal,unseal } from "../src/server/crypto";
process.env.DATA_DIR="memory://";
async function basket(){
  const {id}=await createOwner();let view=await startSession(id,"live");
  view=await selectAddress(id,view.sessionId,"address-a");
  view=await rememberSearch(fixtures.service,fixtures.provider,id,view,"milk");
  view=await updateCart(id,{sessionId:view.sessionId,productId:milkId,quantity:2,expectedCartRevision:view.cart.revision});
  view=await selectPayment(id,view.sessionId,"Cash");
  return {owner:id,view};
}
test("Zod contracts reject invented actions, fields, and invalid quantities",()=>{
  assert.equal(AgentIntentSchema.safeParse({action:"checkout",query:null,productId:null,quantity:null,reply:"Paid"}).success,false);
  assert.equal(AgentIntentSchema.safeParse({action:"set_quantity",query:null,productId:milkId,quantity:-1,reply:"Update",confirmed:true}).success,false);
});
test("owner boundaries protect conversations and checkout summaries",async()=>{
  const {owner,view}=await basket(),other=await createOwner();
  await assert.rejects(getView(other.id,view.sessionId),{code:"NOT_FOUND"});
  const quote=await createQuote(owner,view.sessionId,view.cart.revision);
  await assert.rejects(confirmQuote(other.id,quote.id,quote.challenge),{code:"NOT_FOUND"});
  assert.equal(SessionViewSchema.safeParse(view).success,true);
});
test("quote confirmation requires challenge and unchanged complete snapshot",async()=>{
  const {owner,view}=await basket(),quote=await createQuote(owner,view.sessionId,view.cart.revision);
  await assert.rejects(confirmQuote(owner,quote.id,"wrong-challenge"),{code:"CONFIRMATION_REQUIRED"});
  await updateCart(owner,{sessionId:view.sessionId,productId:milkId,quantity:3,expectedCartRevision:view.cart.revision});
  await assert.rejects(confirmQuote(owner,quote.id,quote.challenge),{code:"QUOTE_CHANGED"});
});
test("expired quote cannot dispatch checkout",async()=>{
  const {owner,view}=await basket(),quote=await createQuote(owner,view.sessionId,view.cart.revision);
  const record=await read<{quote:typeof quote;fingerprint:string;consumed:boolean}>(owner,"quote",quote.id);
  assert.ok(record);record.quote.expiresAt=new Date(Date.now()-1).toISOString();await write(owner,"quote",quote.id,record);
  await assert.rejects(confirmQuote(owner,quote.id,quote.challenge),{code:"QUOTE_EXPIRED"});
});
test("a no-op cart edit preserves its revision and reviewed quote",async()=>{
  const {owner,view}=await basket(),quote=await createQuote(owner,view.sessionId,view.cart.revision);
  const unchanged=await updateCart(owner,{sessionId:view.sessionId,productId:milkId,quantity:2,expectedCartRevision:view.cart.revision});
  assert.equal(unchanged.cart.revision,view.cart.revision);
  assert.equal((await confirmQuote(owner,quote.id,quote.challenge)).state,"complete");
});
test("cart edits preserve unrelated item quantities and display order",async()=>{
  const {owner,view}=await basket();
  await rememberSearch(fixtures.service,fixtures.provider,owner,view,"bread");
  const added=await updateCart(owner,{sessionId:view.sessionId,productId:breadId,quantity:3,expectedCartRevision:view.cart.revision});
  const changed=await updateCart(owner,{sessionId:view.sessionId,productId:milkId,quantity:4,expectedCartRevision:added.cart.revision});
  assert.deepEqual(changed.cart.lines.map(l=>[l.product.id,l.quantity]),[[milkId,4],[breadId,3]]);
});
test("concurrent repeated confirmations dispatch a quote once",async()=>{
  const {owner,view}=await basket(),quote=await createQuote(owner,view.sessionId,view.cart.revision);let calls=0;
  const dispatch=async(_:unknown,id:string)=>{calls++;return {id,state:"complete" as const,message:"fixture complete",results:[{orderId:"test-order",state:"complete",message:"fixture"}]};};
  const [a,b]=await Promise.all([confirmQuote(owner,quote.id,quote.challenge,dispatch),confirmQuote(owner,quote.id,quote.challenge,dispatch)]);
  assert.equal(calls,1);assert.equal(a.id,b.id);
  const replay=await confirmQuote(owner,quote.id,quote.challenge,dispatch);assert.equal(replay.state,"complete");assert.equal(calls,1);
});
test("ambiguous checkout holds durable owner gate across new sessions",async()=>{
  const {owner,view}=await basket(),quote=await createQuote(owner,view.sessionId,view.cart.revision);let calls=0;
  const result=await confirmQuote(owner,quote.id,quote.challenge,async()=>{calls++;throw new Error("simulated lost response");});
  assert.equal(result.state,"outcome_unknown");
  await confirmQuote(owner,quote.id,quote.challenge,async()=>{throw new Error("must never retry");});assert.equal(calls,1);
  const next=await createQuote(owner,view.sessionId,view.cart.revision);
  await assert.rejects(confirmQuote(owner,next.id,next.challenge),{code:"CHECKOUT_UNRESOLVED"});
  await startSession(owner,"live");
  assert.ok(await read(owner,"checkout_gate","swiggy"));
  assert.equal((await getCurrentAttempt(owner))?.id,result.id);
  assert.equal((await getCurrentAttempt(owner))?.state,"outcome_unknown");
  assert.equal(await getCurrentAttempt((await createOwner()).id),null);
});
test("most recent completed checkout survives a new conversation",async()=>{
  const {owner,view}=await basket(),quote=await createQuote(owner,view.sessionId,view.cart.revision);
  const attempt=await confirmQuote(owner,quote.id,quote.challenge);
  await startSession(owner,"live");
  assert.equal((await getCurrentAttempt(owner))?.id,attempt.id);
  assert.equal((await getCurrentAttempt(owner))?.state,"complete");
});
test("request fingerprints ignore object key order but retain array order",()=>{
  assert.equal(canonicalFingerprint({a:1,nested:{x:2,y:3}}),canonicalFingerprint({nested:{y:3,x:2},a:1}));
  assert.notEqual(canonicalFingerprint({items:[1,2]}),canonicalFingerprint({items:[2,1]}));
});
test("stale basket revisions are rejected before a provider mutation",async()=>{
  const {owner,view}=await basket();
  const writes=fixtures.account(owner).writes;
  await assert.rejects(updateCart(owner,{sessionId:view.sessionId,productId:milkId,quantity:1,expectedCartRevision:0}),{code:"CART_CHANGED"});
  assert.equal(fixtures.account(owner).writes,writes);
});
test("live commerce rejects products not returned by its provider",async()=>{
  const {id}=await createOwner(),view=await startSession(id,"live");
  await assert.rejects(updateCart(id,{sessionId:view.sessionId,productId:"invented",quantity:1,expectedCartRevision:view.cart.revision}),{code:"ADDRESS_REQUIRED"});
});
test("live verification requires an owned live session and an explicitly selected address",async()=>{
  const {id}=await createOwner();
  await assert.rejects(verifySwiggyConnection(id),{code:"NO_SESSION"});
  await startSession(id,"live");
  await assert.rejects(verifySwiggyConnection(id),{code:"ADDRESS_REQUIRED"});

});
test("stored assistant speech is owned and invalidated by a stop version",async()=>{
  const {id:owner}=await createOwner(),{id:other}=await createOwner();
  const assistant=createAssistantService({providers:async()=>[],search:async()=>({offers:[],notices:[]}),prepare:async()=>{throw new Error("Speech must not prepare a cart");}});
  const view=await assistant.get(owner),message=view.messages.at(-1)!;
  assert.match(await assistant.speechText(owner,message.id,view.version),/What would you like to order/);
  await assert.rejects(assistant.speechText(other,message.id,view.version),{code:"STALE_SPEECH"});
  await assistant.stop(owner,view.version);
  await assert.rejects(assistant.speechText(owner,message.id,view.version),{code:"STALE_SPEECH"});
});
test("OAuth encryption binds credentials to browser owner",()=>{
  process.env.TOKEN_ENCRYPTION_KEY=Buffer.alloc(32,17).toString("base64");
  const value=seal({refresh_token:"synthetic"},"owner-a");
  assert.deepEqual(unseal(value,"owner-a"),{refresh_token:"synthetic"});
  assert.throws(()=>unseal(value,"owner-b"));
});
after(async()=>{await (await database()).close();});
test("an unpaid UPI checkout older than its payment window no longer blocks the next order; a fresh one still does",async()=>{
  const {owner,view}=await basket();
  const held=(createdAt:string)=>({attempt:{id:"attempt_held",state:"payment_pending",message:"Payment is pending.",results:[{orderId:"old",state:"PENDING_PAYMENT",message:"Payment is pending."}]},quoteId:"old-quote",createdAt});
  await write(owner,"attempt","attempt_held",held(new Date().toISOString()));await write(owner,"checkout_gate","swiggy",{attemptId:"attempt_held"});
  const first=await createQuote(owner,view.sessionId,view.cart.revision);
  await assert.rejects(confirmQuote(owner,first.id,first.challenge),{code:"CHECKOUT_UNRESOLVED"},"a payment still inside its window blocks");
  await write(owner,"attempt","attempt_held",held(new Date(Date.now()-7*24*3600_000).toISOString()));
  const next=await createQuote(owner,view.sessionId,view.cart.revision);
  assert.equal((await confirmQuote(owner,next.id,next.challenge)).state,"complete");
  assert.equal((await read<{attempt:{state:string}}>(owner,"attempt","attempt_held"))?.attempt.state,"failed","the lapsed payment is closed as not placed");
});
