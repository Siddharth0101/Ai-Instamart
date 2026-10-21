import test from "node:test";
import assert from "node:assert/strict";
import { SwiggyGateway, swiggyCartFingerprint, type OAuthState } from "../src/server/integrations/swiggy";
import { normalizeSwiggyCheckoutResult, trustedSwiggyPaymentUrl } from "../src/server/integrations/swiggy-checkout";
import { fixtureService } from "./helpers/live-provider";

function gatewayFixture(failure?:"401"|"malformed"){
  const f=fixtureService();f.account("owner-a").quantities.set("milk",1);const cart=f.cart("owner-a"),calls:Array<{name:string;args:unknown}>=[];
  let state:OAuthState|null={version:1,ownerId:"owner-a",tokens:{access_token:"fixture",token_type:"Bearer"},tokensExpiresAt:Date.now()+3600000};
  const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{"content-type":"application/json"}});
  const network=(async(_input,init)=>{
    if(init?.method==="GET")return new Response(null,{status:405});
    const request=JSON.parse(String(init?.body));if(request.method==="notifications/initialized")return new Response(null,{status:202});let result:unknown;
    if(request.method==="initialize")result={protocolVersion:"2025-11-25",capabilities:{tools:{}},serverInfo:{name:"fixture",version:"1"}};
    else if(request.method==="tools/list")result={tools:[{name:"get_cart",inputSchema:{type:"object",properties:{},additionalProperties:false}},{name:"get_payment_options",inputSchema:{type:"object",properties:{},additionalProperties:false}},{name:"checkout",inputSchema:{type:"object",properties:{addressId:{type:"string"},paymentMethod:{type:"string"},intentApp:{type:"string"}},required:["addressId","paymentMethod"],additionalProperties:false}}]};
    else if(request.method==="tools/call"){
      const name=request.params.name;calls.push({name,args:request.params.arguments});
      if(name==="checkout"&&failure==="401")return json({error:"fixture unauthorized"},401);
      result={content:[],structuredContent:name==="get_cart"?cart:name==="get_payment_options"?await f.provider("owner-a").getPaymentOptions():failure==="malformed"?{status:"maybe"}:{orderId:"fixture-order",status:"CONFIRMED",paymentMethod:"Cash",message:"Instamart order placed successfully"}};
    }else throw new Error("Unexpected test request");
    return json({jsonrpc:"2.0",id:request.id,result});
  }) as typeof fetch;
  const gateway=new SwiggyGateway({ownerId:"owner-a",callbackUrl:"http://127.0.0.1:3000/callback",storage:{read:async()=>state,write:async value=>{state=value;}},fetch:network});
  return {gateway,cart,calls,input:{addressId:"address-a",paymentMethodId:"Cash",expectedFingerprint:swiggyCartFingerprint(cart)}};
}
test("checkout SDK call includes the exact reviewed address and current payment method once",async()=>{
  const f=gatewayFixture();try{const result=await f.gateway.checkout(f.input);assert.equal(result.state,"complete");assert.equal(result.message,"Instamart order placed successfully");assert.deepEqual(f.calls.filter(c=>c.name==="checkout"),[{name:"checkout",args:{addressId:"address-a",paymentMethod:"Cash"}}]);}finally{await f.gateway.close();}
});
test("checkout preflight rejects changed cart or unavailable payment before submitting",async()=>{
  for(const changes of [{expectedFingerprint:"0".repeat(64)},{paymentMethodId:"invented"}]){const f=gatewayFixture();try{await assert.rejects(f.gateway.checkout({...f.input,...changes}),error=>error instanceof Error&&"checkoutSubmitted" in error&&error.checkoutSubmitted===false);assert.equal(f.calls.filter(c=>c.name==="checkout").length,0);}finally{await f.gateway.close();}}
});
test("submitted checkout failures never retry or mark the result as a safe preflight rejection",async()=>{
  for(const failure of ["401","malformed"] as const){const f=gatewayFixture(failure);try{await assert.rejects(f.gateway.checkout(f.input),error=>error instanceof Error&&!("checkoutSubmitted" in error));assert.equal(f.calls.filter(c=>c.name==="checkout").length,1);}finally{await f.gateway.close();}}
});
test("checkout outcomes preserve partial/unknown results and restrict payment links",()=>{
  const wrap=(data:unknown)=>({structuredContent:data,content:[]});
  assert.equal(normalizeSwiggyCheckoutResult(wrap({orderId:"x",status:"mystery",paymentMethod:"Cash"})).state,"outcome_unknown");
  assert.equal(normalizeSwiggyCheckoutResult(wrap({orders:[{orderId:"a",status:"CONFIRMED"},{error:"Store unavailable"}],orderCount:2,successCount:1,failureCount:1,allSucceeded:false,paymentMethod:"Cash"})).state,"outcome_unknown");
  const pending=normalizeSwiggyCheckoutResult(wrap({orderId:"x",transactionId:"t",paasId:"p",upiIntentUrl:"upi://pay",bridgeUrl:"https://evil.example/pay",isQrFlow:false,pollingIntervalInMs:2000,maxTimeToPollForInMs:30000,paymentMethod:"UPI",status:"PENDING_PAYMENT"}));assert.equal(pending.state,"payment_pending");assert.equal(pending.paymentUrl,undefined);
  assert.equal(trustedSwiggyPaymentUrl("https://www.swiggy.com/payment"),"https://www.swiggy.com/payment");assert.equal(trustedSwiggyPaymentUrl("javascript:alert(1)"),undefined);assert.equal(trustedSwiggyPaymentUrl("https://swiggy.com.evil.example/"),undefined);
});
