import { after, test } from "node:test";
import assert from "node:assert/strict";
import { verifySwiggyConnection } from "../src/server/service";
import { fixtureService, milkId, breadId } from "./helpers/live-provider";
const fixtures=fixtureService();
const {createOwner,startSession,selectAddress,selectPayment,updateCart,createQuote,confirmQuote,getCurrentAttempt,getView,stopTurn,conversation,speechText}=fixtures.service;
import { database,read,write } from "../src/server/store";
import { AgentIntentSchema,SessionViewSchema } from "../src/lib/contracts";
import { canonicalFingerprint,seal,unseal } from "../src/server/crypto";
process.env.DATA_DIR="memory://";
async function basket(){
  const {id}=await createOwner();let view=await startSession(id,"live");
  view=await selectAddress(id,view.sessionId,"address-a");
  view=await conversation(id,{sessionId:view.sessionId,text:"find milk",expectedTurnVersion:view.turnVersion,expectedCartRevision:view.cart.revision});
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
  const searched=await conversation(owner,{sessionId:view.sessionId,text:"find bread",expectedTurnVersion:view.turnVersion,expectedCartRevision:view.cart.revision});
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
test("stale basket revisions and stopped delayed turns are rejected",async()=>{
  const {owner,view}=await basket();
  await assert.rejects(updateCart(owner,{sessionId:view.sessionId,productId:milkId,quantity:1,expectedCartRevision:0}),{code:"CART_CHANGED"});
  const stopped=await stopTurn(owner,view.sessionId,view.turnVersion);assert.equal(stopped.turnVersion,view.turnVersion+1);
  await assert.rejects(conversation(owner,{sessionId:view.sessionId,text:"add two amul milk",expectedTurnVersion:view.turnVersion,expectedCartRevision:view.cart.revision}),{code:"STALE_TURN"});
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
  const {owner,view}=await basket(),message=view.messages.at(-1)!;
  assert.equal(await speechText(owner,view.sessionId,message.id,view.turnVersion),message.text);
  await stopTurn(owner,view.sessionId,view.turnVersion);
  await assert.rejects(speechText(owner,view.sessionId,message.id,view.turnVersion),{code:"STALE_SPEECH"});
});
test("OAuth encryption binds credentials to browser owner",()=>{
  process.env.TOKEN_ENCRYPTION_KEY=Buffer.alloc(32,17).toString("base64");
  const value=seal({refresh_token:"synthetic"},"owner-a");
  assert.deepEqual(unseal(value,"owner-a"),{refresh_token:"synthetic"});
  assert.throws(()=>unseal(value,"owner-b"));
});
after(async()=>{await (await database()).close();});
