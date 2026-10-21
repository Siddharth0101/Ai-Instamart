import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { SwiggyGateway, decodeSwiggyVariantId, swiggyVariantId, swiggyCartFingerprint, type OAuthState, type SwiggyOAuthStorage } from "../src/server/integrations/swiggy";
import { SwiggyAddressesSchema, SwiggyCartSchema, parseSwiggyToolResult } from "../src/server/integrations/swiggy-schemas";

function storage(initial:OAuthState|null=null){
  let state=initial;
  return {
    read:async()=>state?structuredClone(state):null,
    write:async(value:OAuthState|null)=>{state=value?structuredClone(value):null;},
    update:async(change:(value:OAuthState|null)=>OAuthState|null)=>{const next=change(state?structuredClone(state):null);state=next?structuredClone(next):null;}
  } satisfies SwiggyOAuthStorage;
}
const addressData={addresses:[{id:"address-a",addressLine:"Synthetic test address",phoneNumber:"0000000000"}],pagination:{page:1,pageSize:10,total:1,totalPages:1,hasMore:false},resolution:{defaultAddressId:"address-a",resolutionSource:"explicit_user_address",needsUserClarification:false,candidateAddressIds:["address-a"]}};
const cartData={selectedAddress:"address-a",cartTotalAmount:"₹100.00",items:[{skuId:"sku-a",spinId:"spin-a",productId:"product-a",itemName:"Fixture milk",quantity:1,isInStockAndAvailable:true,mrp:100,discountedFinalPrice:100}],billBreakdown:{lineItems:[{label:"Items",value:"₹100.00"}],toPay:{label:"To pay",value:"₹100.00"}}};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json"}});

function oauthNetwork(log:Array<{path:string;body:Record<string,unknown>}>){
  return (async(input,init)=>{
    const url=new URL(String(input));
    if(url.pathname.includes(".well-known/oauth-protected-resource"))return json({resource:"https://mcp.swiggy.com/im",authorization_servers:["https://mcp.swiggy.com/auth"],scopes_supported:["mcp:tools"]});
    if(url.pathname.includes(".well-known/oauth-authorization-server"))return json({issuer:"https://mcp.swiggy.com/auth",authorization_endpoint:"https://mcp.swiggy.com/auth/authorize",token_endpoint:"https://mcp.swiggy.com/auth/token",registration_endpoint:"https://mcp.swiggy.com/auth/register",response_types_supported:["code"],grant_types_supported:["authorization_code","refresh_token"],code_challenge_methods_supported:["S256"],token_endpoint_auth_methods_supported:["none"]});
    if(url.pathname==="/auth/register"){
      const body=JSON.parse(String(init?.body));log.push({path:url.pathname,body});return json({...body,client_id:"fixture-client"},201);
    }
    if(url.pathname==="/auth/token"){
      assert.match(new Headers(init?.headers).get("content-type")!,/application\/json/);
      const body=JSON.parse(String(init?.body));log.push({path:url.pathname,body});
      return json({access_token:"fixture-access-token",refresh_token:"fixture-rotated-token",token_type:"Bearer",expires_in:3600});
    }
    throw new Error(`Unexpected mock request ${url.pathname}`);
  }) as typeof fetch;
}

test("variant keys preserve both provider identifiers and reject malformed keys",()=>{
  const id=swiggyVariantId("sku-1","spin-2");
  assert.deepEqual(decodeSwiggyVariantId(id),{skuId:"sku-1",spinId:"spin-2"});
  assert.throws(()=>decodeSwiggyVariantId("arbitrary-client-id"),/Choose a product/);
});

test("tool responses require an explicit successful JSON envelope and matching Zod data",()=>{
  const schema=z.strictObject({amount:z.number()});
  assert.deepEqual(parseSwiggyToolResult({structuredContent:{success:true,data:{amount:42}}},schema),{amount:42});
  assert.deepEqual(parseSwiggyToolResult({content:[{type:"text",text:JSON.stringify({success:true,data:{amount:42}})}]},schema),{amount:42});
  assert.throws(()=>parseSwiggyToolResult({structuredContent:{success:false,error:{message:"Provider failure"}}},schema),/SWIGGY_TOOL_FAILED/);
  assert.throws(()=>parseSwiggyToolResult({structuredContent:{success:true,data:{amount:"42"}}},schema),/SWIGGY_SCHEMA_MISMATCH/);
  assert.throws(()=>parseSwiggyToolResult({content:[{type:"text",text:"The order succeeded"}]},schema),/SWIGGY_UNSUPPORTED_RESPONSE/);
  assert.throws(()=>parseSwiggyToolResult({isError:true,structuredContent:{success:true,data:{amount:42}}},schema),/SWIGGY_TOOL_FAILED/);
});

test("live direct structured addresses validate while Markdown remains presentation only",()=>{
  const direct={...addressData,totalCount:1,resolution:{...addressData.resolution,resolutionSource:"ranked_saved_address",selectedAddressId:"address-a",verifiedAddressId:"address-a"}};
  const mcp={structuredContent:direct,content:[{type:"text",text:"## Saved addresses\nA formatted provider response; this is not parsed."}]};
  const parsed=parseSwiggyToolResult(mcp,SwiggyAddressesSchema);
  assert.equal(parsed.addresses[0].id,"address-a");assert.equal(parsed.pagination.hasMore,false);
  const schema=z.object({amount:z.number()});
  for(const failure of [{success:false},{error:{message:"synthetic failure"}},{errors:[]},{isError:true}]){
    assert.throws(()=>parseSwiggyToolResult({structuredContent:{amount:42,...failure}},schema),/SWIGGY_TOOL_FAILED/);
    assert.throws(()=>parseSwiggyToolResult({structuredContent:{success:true,data:{amount:42,...failure}}},schema),/SWIGGY_TOOL_FAILED/);
  }
  assert.throws(()=>parseSwiggyToolResult({structuredContent:{amount:"42"},content:[{type:"text",text:'{"success":true,"data":{"amount":42}}'}]},schema),/SWIGGY_SCHEMA_MISMATCH/);
  assert.throws(()=>parseSwiggyToolResult({content:[{type:"text",text:"## Saved addresses\n**Address**: synthetic"}]},schema),/SWIGGY_UNSUPPORTED_RESPONSE/);
});

test("provider origin and callback restrictions reject credential exfiltration",()=>{
  const common={ownerId:"owner-a",callbackUrl:"http://localhost:3000/api/swiggy/callback",storage:storage()};
  assert.throws(()=>new SwiggyGateway({...common,baseUrl:"https://attacker.invalid/im"}),/official Swiggy/);
  assert.throws(()=>new SwiggyGateway({...common,callbackUrl:"http://remote.invalid/callback"}),/HTTPS callback/);
});

test("encrypted storage record cannot be reused by another browser owner",async()=>{
  const gateway=new SwiggyGateway({ownerId:"owner-a",callbackUrl:"http://localhost:3000/callback",storage:storage({version:1,ownerId:"owner-b"})});
  await assert.rejects(gateway.readiness(),/another application session/);
});

test("SDK OAuth registers, uses PKCE and consumes one-time owner-bound callback state",async()=>{
  const persisted=storage();const calls:Array<{path:string;body:Record<string,unknown>}>=[];
  const gateway=new SwiggyGateway({ownerId:"owner-a",callbackUrl:"http://localhost:3000/callback",storage:persisted,fetch:oauthNetwork(calls),now:()=>1_000_000});
  const started=await gateway.beginAuthorization();assert.equal(started.alreadyConnected,false);
  const authorization=new URL(started.authorizationUrl!);
  assert.equal(authorization.origin,"https://mcp.swiggy.com");assert.equal(authorization.searchParams.get("code_challenge_method"),"S256");
  const pending=(await persisted.read())!.pending!;
  assert.ok(pending.verifier);assert.equal(authorization.searchParams.get("state"),pending.state);
  await assert.rejects(gateway.completeAuthorization("fixture-code","wrong-state"),/does not match/);
  await gateway.completeAuthorization("fixture-code",pending.state);
  const after=(await persisted.read())!;assert.equal(after.pending,undefined);assert.equal(after.tokens?.refresh_token,"fixture-rotated-token");assert.equal(after.tokensExpiresAt,4_600_000);
  const exchange=calls.find(x=>x.path==="/auth/token")!.body;
  assert.equal(exchange.code_verifier,pending.verifier);assert.equal(exchange.grant_type,"authorization_code");
  await assert.rejects(gateway.completeAuthorization("fixture-code",pending.state),/expired/);
});

test("expired callback cannot exchange a code",async()=>{
  let requests=0;
  const gateway=new SwiggyGateway({ownerId:"owner-a",callbackUrl:"http://localhost:3000/callback",storage:storage({version:1,ownerId:"owner-a",pending:{state:"expired",verifier:"verifier",expiresAt:1,callbackUrl:"http://localhost:3000/callback"}}),fetch:async()=>{requests++;return json({});},now:()=>2});
  await assert.rejects(gateway.completeAuthorization("code","expired"),/expired/);assert.equal(requests,0);
});

test("concurrent callback requests exchange their code only once",async()=>{
  const persisted=storage();const calls:Array<{path:string;body:Record<string,unknown>}>=[];
  const gateway=new SwiggyGateway({ownerId:"owner-a",callbackUrl:"http://localhost:3000/callback",storage:persisted,fetch:oauthNetwork(calls)});
  await gateway.beginAuthorization();const pending=(await persisted.read())!.pending!;
  const results=await Promise.allSettled([gateway.completeAuthorization("fixture-code",pending.state),gateway.completeAuthorization("fixture-code",pending.state)]);
  assert.equal(results.filter(x=>x.status==="fulfilled").length,1);
  assert.equal(calls.filter(x=>x.path==="/auth/token").length,1);
});

test("a token response arriving after Disconnect cannot restore credentials",async()=>{
  const persisted=storage();const calls:Array<{path:string;body:Record<string,unknown>}>=[];
  const network=oauthNetwork(calls);let disconnectDuringExchange=false;
  const wrapped=(async(input,init)=>{
    const response=await network(input,init);
    if(disconnectDuringExchange&&new URL(String(input)).pathname==="/auth/token")await persisted.update(()=>null);
    return response;
  }) as typeof fetch;
  const gateway=new SwiggyGateway({ownerId:"owner-a",callbackUrl:"http://localhost:3000/callback",storage:persisted,fetch:wrapped});
  await gateway.beginAuthorization();const pending=(await persisted.read())!.pending!;disconnectDuringExchange=true;
  await assert.rejects(gateway.completeAuthorization("fixture-code",pending.state),/connection changed/);
  assert.equal(await persisted.read(),null);
});

test("published address schema passes through genuine SDK MCP transport",async()=>{
  const calls:string[]=[];
  const network=(async(input,init)=>{
    assert.equal(new URL(String(input)).origin,"https://mcp.swiggy.com");
    assert.equal(new Headers(init?.headers).get("authorization"),"Bearer fixture-token");
    if(init?.method==="GET")return new Response(null,{status:405});
    const request=JSON.parse(String(init?.body));calls.push(request.method);
    if(request.method==="notifications/initialized")return new Response(null,{status:202});
    let result:unknown;
    if(request.method==="initialize")result={protocolVersion:"2025-11-25",capabilities:{tools:{}},serverInfo:{name:"fixture-swiggy",version:"1"}};
    else if(request.method==="tools/list")result={tools:[{name:"get_addresses",inputSchema:{type:"object",properties:{},additionalProperties:false}}]};
    else if(request.method==="tools/call")result={content:[{type:"text",text:JSON.stringify({success:true,data:addressData})}]};
    else throw new Error("Unexpected MCP request");
    return json({jsonrpc:"2.0",id:request.id,result});
  }) as typeof fetch;
  const gateway=new SwiggyGateway({ownerId:"owner-a",callbackUrl:"http://localhost:3000/callback",storage:storage({version:1,ownerId:"owner-a",tokens:{access_token:"fixture-token",token_type:"Bearer"},tokensExpiresAt:Date.now()+3600_000}),fetch:network});
  const result=await gateway.getAddresses();assert.equal(result.addresses[0].id,"address-a");
  assert.deepEqual(calls,["initialize","notifications/initialized","tools/list","tools/call"]);
});

test("cart fingerprint changes on quantity or provider total changes",()=>{
  const baseline=SwiggyCartSchema.parse(cartData);const changed=structuredClone(baseline);changed.items[0].quantity=2;
  assert.notEqual(swiggyCartFingerprint(baseline),swiggyCartFingerprint(changed));
  changed.items[0].quantity=1;changed.cartTotalAmount="₹101.00";
  assert.notEqual(swiggyCartFingerprint(baseline),swiggyCartFingerprint(changed));
});

test("cart replacement preserves unrelated products and rejects a stale baseline before writing",async()=>{
  let cart=SwiggyCartSchema.parse({...cartData,items:[...cartData.items,{...cartData.items[0],skuId:"sku-b",spinId:"spin-b",productId:"product-b",quantity:2}]});
  let writes=0;let submitted:Record<string,unknown>|undefined;
  const network=(async(_input,init)=>{
    if(init?.method==="GET")return new Response(null,{status:405});
    const request=JSON.parse(String(init?.body));
    if(request.method==="notifications/initialized")return new Response(null,{status:202});
    let result:unknown;
    if(request.method==="initialize")result={protocolVersion:"2025-11-25",capabilities:{tools:{}},serverInfo:{name:"fixture-swiggy",version:"1"}};
    else if(request.method==="tools/list")result={tools:[{name:"get_cart",inputSchema:{type:"object",properties:{},additionalProperties:false}},{name:"update_cart",inputSchema:{type:"object",properties:{selectedAddressId:{type:"string"},items:{type:"array",items:{type:"object",properties:{skuId:{type:"string"},spinId:{type:"string"},quantity:{type:"integer"}},required:["skuId","spinId","quantity"],additionalProperties:false}}},required:["selectedAddressId","items"],additionalProperties:false}}]};
    else if(request.method==="tools/call"){
      if(request.params.name==="update_cart"){
        writes++;submitted=request.params.arguments;
        const quantities=request.params.arguments.items as Array<{skuId:string;quantity:number}>;
        cart={...cart,items:cart.items.map(item=>({...item,quantity:quantities.find(x=>x.skuId===item.skuId)!.quantity}))};
      }
      result={structuredContent:{success:true,data:cart},content:[]};
    }else throw new Error("Unexpected MCP request");
    return json({jsonrpc:"2.0",id:request.id,result});
  }) as typeof fetch;
  const gateway=new SwiggyGateway({ownerId:"owner-a",callbackUrl:"http://localhost:3000/callback",storage:storage({version:1,ownerId:"owner-a",tokens:{access_token:"fixture-token",token_type:"Bearer"},tokensExpiresAt:Date.now()+3600_000}),fetch:network});
  await assert.rejects(gateway.setCartQuantity({addressId:"address-a",skuId:"sku-a",spinId:"spin-a",quantity:3,expectedFingerprint:"0".repeat(64)}),/cart changed/);
  assert.equal(writes,0);
  const updated=await gateway.setCartQuantity({addressId:"address-a",skuId:"sku-a",spinId:"spin-a",quantity:3,expectedFingerprint:swiggyCartFingerprint(cart)});
  assert.equal(writes,1);assert.deepEqual(submitted,{selectedAddressId:"address-a",items:[{skuId:"sku-a",spinId:"spin-a",quantity:3},{skuId:"sku-b",spinId:"spin-b",quantity:2}]});
  assert.equal(updated.items.find(x=>x.skuId==="sku-b")!.quantity,2);
});

test("checkout without a confirmed review never makes a network request and disconnect removes credentials",async()=>{
  let requests=0;const persisted=storage({version:1,ownerId:"owner-a",tokens:{access_token:"fixture-token",token_type:"Bearer"}});
  const gateway=new SwiggyGateway({ownerId:"owner-a",callbackUrl:"http://localhost:3000/callback",storage:persisted,fetch:async()=>{requests++;return json({});}});
  assert.equal((await gateway.readiness()).connected,true);await assert.rejects(gateway.checkout(),/confirmed order review/);assert.equal(requests,0);
  await gateway.disconnect();assert.equal(await persisted.read(),null);assert.equal((await gateway.readiness()).connected,false);
});

test("removing the sole remaining line uses a guarded clear_cart and verifies the empty result",async()=>{
  let cart=SwiggyCartSchema.parse(cartData),clears=0;
  const network=(async(_input,init)=>{
    if(init?.method==="GET")return new Response(null,{status:405});const request=JSON.parse(String(init?.body));if(request.method==="notifications/initialized")return new Response(null,{status:202});let result:unknown;
    if(request.method==="initialize")result={protocolVersion:"2025-11-25",capabilities:{tools:{}},serverInfo:{name:"fixture",version:"1"}};
    else if(request.method==="tools/list")result={tools:[{name:"get_cart",inputSchema:{type:"object",properties:{},additionalProperties:false}},{name:"clear_cart",inputSchema:{type:"object",properties:{},additionalProperties:false}}]};
    else if(request.method==="tools/call"){
      if(request.params.name==="clear_cart"){clears++;cart={...cart,items:[],cartTotalAmount:"0",billBreakdown:{lineItems:[],toPay:{label:"To Pay",value:"0"}}};result={structuredContent:{verified:true},content:[]};}
      else {assert.equal(request.params.name,"get_cart");result={structuredContent:cart,content:[]};}
    }else throw new Error("Unexpected request");return json({jsonrpc:"2.0",id:request.id,result});
  }) as typeof fetch;
  const gateway=new SwiggyGateway({ownerId:"owner-a",callbackUrl:"http://localhost:3000/callback",storage:storage({version:1,ownerId:"owner-a",tokens:{access_token:"fixture",token_type:"Bearer"},tokensExpiresAt:Date.now()+3600000}),fetch:network});
  try{await assert.rejects(gateway.setCartQuantity({addressId:"address-a",skuId:"sku-a",spinId:"spin-a",quantity:0,expectedFingerprint:"0".repeat(64)}));assert.equal(clears,0);const result=await gateway.setCartQuantity({addressId:"address-a",skuId:"sku-a",spinId:"spin-a",quantity:0,expectedFingerprint:swiggyCartFingerprint(cart)});assert.equal(clears,1);assert.equal(result.items.length,0);}finally{await gateway.close();}
});

const publishedTools=[
  {name:"get_addresses",inputSchema:{$id:"https://mcp.swiggy.com/schemas/get_addresses",type:"object",properties:{},additionalProperties:false}},
  {name:"get_cart",inputSchema:{type:"object",properties:{},additionalProperties:false}},
  {name:"update_cart",inputSchema:{type:"object",properties:{selectedAddressId:{type:"string"},items:{type:"array",items:{type:"object",properties:{skuId:{type:"string"},spinId:{type:"string"},quantity:{type:"integer"}},required:["skuId","spinId","quantity"],additionalProperties:false}}},required:["selectedAddressId","items"],additionalProperties:false}}
];
function mcpNetwork(calls:string[],onCall?:(name:string)=>Response|undefined){
  return (async(_input,init)=>{
    if(init?.method==="GET")return new Response(null,{status:405});
    const request=JSON.parse(String(init?.body));calls.push(request.method+(request.method==="tools/call"?`:${request.params.name}`:""));
    if(request.method==="notifications/initialized")return new Response(null,{status:202});
    let result:unknown;
    if(request.method==="initialize")result={protocolVersion:"2025-11-25",capabilities:{tools:{listChanged:true}},serverInfo:{name:"fixture-swiggy",version:"1"}};
    else if(request.method==="tools/list")result={tools:publishedTools};
    else if(request.method==="tools/call"){
      const response=onCall?.(request.params.name);if(response)return response;
      result={structuredContent:{success:true,data:request.params.name==="get_addresses"?addressData:cartData},content:[]};
    }else throw new Error("Unexpected MCP request");
    return json({jsonrpc:"2.0",id:request.id,result});
  }) as typeof fetch;
}
function connectedStorage(now=Date.now()){
  return storage({version:1,ownerId:"owner-a",flowEpoch:"fixture-connection",tokens:{access_token:"fixture-token",token_type:"Bearer"},tokensExpiresAt:now+3600_000});
}

test("one owner gateway reuses MCP initialization and schemas but fetches each result afresh",async()=>{
  let now=1_000_000;const calls:string[]=[];
  const gateway=new SwiggyGateway({ownerId:"owner-a",callbackUrl:"http://localhost:3000/callback",storage:connectedStorage(now),fetch:mcpNetwork(calls),now:()=>now});
  try{
    await gateway.getAddresses();await gateway.getAddresses();
    assert.equal(calls.filter(x=>x==="initialize").length,1);
    assert.equal(calls.filter(x=>x==="tools/list").length,1);
    assert.equal(calls.filter(x=>x==="tools/call:get_addresses").length,2);
    now+=60_001;await gateway.getAddresses();
    assert.equal(calls.filter(x=>x==="initialize").length,1);
    assert.equal(calls.filter(x=>x==="tools/list").length,2,"expired schemas are rediscovered");
    const exposed=await gateway.discoverTools();exposed.find(x=>x.name==="get_addresses")!.inputSchema.required=["attacker-field"];
    await gateway.getAddresses();
    assert.equal(calls.filter(x=>x==="tools/call:get_addresses").length,4,"caller schema edits cannot mutate the cache");
  }finally{await gateway.close();}
});

test("credential rotation invalidates this gateway's cached client and schemas",async()=>{
  const persisted=connectedStorage();const calls:string[]=[];const authorizations:string[]=[];
  const network=mcpNetwork(calls);
  const gateway=new SwiggyGateway({ownerId:"owner-a",callbackUrl:"http://localhost:3000/callback",storage:persisted,fetch:async(input,init)=>{authorizations.push(new Headers(init?.headers).get("authorization")||"");return network(input,init);}});
  try{
    await gateway.getAddresses();
    await persisted.update(state=>({...state!,tokens:{access_token:"replacement-token",token_type:"Bearer"}}));
    await gateway.getAddresses();
    assert.equal(calls.filter(x=>x==="initialize").length,2);
    assert.equal(calls.filter(x=>x==="tools/list").length,2);
    assert.ok(authorizations.includes("Bearer replacement-token"));
    await gateway.disconnect();await assert.rejects(gateway.getAddresses(),/Connect your Swiggy account/);
    assert.equal(calls.filter(x=>x==="tools/call:get_addresses").length,2);
  }finally{await gateway.close();}
});

test("provider tool-list notifications invalidate the capability cache immediately",async()=>{
  const calls:string[]=[];const mcp=mcpNetwork(calls);let sentNotification=false;
  const gateway=new SwiggyGateway({ownerId:"owner-a",callbackUrl:"http://localhost:3000/callback",storage:connectedStorage(),fetch:async(input,init)=>{
    if(init?.method!=="GET"){
      const request=JSON.parse(String(init?.body));
      if(request.method==="tools/call"&&!sentNotification){
        sentNotification=true;calls.push("tools/call:get_addresses");
        const notification={jsonrpc:"2.0",method:"notifications/tools/list_changed"};
        const response={jsonrpc:"2.0",id:request.id,result:{structuredContent:{success:true,data:addressData},content:[]}};
        return new Response(`event: message\ndata: ${JSON.stringify(notification)}\n\nevent: message\ndata: ${JSON.stringify(response)}\n\n`,{headers:{"content-type":"text/event-stream"}});
      }
    }
    return mcp(input,init);
  }});
  try{await gateway.getAddresses();await gateway.getAddresses();assert.equal(calls.filter(x=>x==="initialize").length,1);assert.equal(calls.filter(x=>x==="tools/list").length,2);}
  finally{await gateway.close();}
});

test("gateway instances never share account-specific capability caches",async()=>{
  const firstCalls:string[]=[],secondCalls:string[]=[];
  const first=new SwiggyGateway({ownerId:"owner-a",callbackUrl:"http://localhost:3000/callback",storage:connectedStorage(),fetch:mcpNetwork(firstCalls)});
  const second=new SwiggyGateway({ownerId:"owner-b",callbackUrl:"http://localhost:3000/callback",storage:storage({version:1,ownerId:"owner-b",tokens:{access_token:"other-token",token_type:"Bearer"}}),fetch:mcpNetwork(secondCalls)});
  try{await first.getAddresses();await second.getAddresses();assert.equal(firstCalls.filter(x=>x==="tools/list").length,1);assert.equal(secondCalls.filter(x=>x==="tools/list").length,1);}
  finally{await Promise.all([first.close(),second.close()]);}
});

test("concurrent gateways refresh a rotating token exactly once through transactional storage",async()=>{
  const now=1_000_000;
  const persisted=storage({version:1,ownerId:"owner-a",flowEpoch:"fixture-flow",clientInformation:{client_id:"fixture-client",issuer:"https://mcp.swiggy.com/auth"},tokens:{access_token:"expired-token",refresh_token:"one-time-token",token_type:"Bearer",issuer:"https://mcp.swiggy.com/auth"},tokensExpiresAt:now-1});
  const oauthCalls:Array<{path:string;body:Record<string,unknown>}>=[],mcpCalls:string[]=[];
  const oauth=oauthNetwork(oauthCalls),mcp=mcpNetwork(mcpCalls);
  const network=(async(input,init)=>{
    const path=new URL(String(input)).pathname;
    if(path==="/im")return mcp(input,init);
    if(path==="/auth/token")await new Promise(resolve=>setTimeout(resolve,35));
    return oauth(input,init);
  }) as typeof fetch;
  const options={ownerId:"owner-a",callbackUrl:"http://localhost:3000/callback",storage:persisted,fetch:network,now:()=>now};
  const first=new SwiggyGateway(options),second=new SwiggyGateway(options);
  try{
    await Promise.all([first.getAddresses(),second.getAddresses()]);
    assert.equal(oauthCalls.filter(x=>x.path==="/auth/token").length,1);
    assert.equal(oauthCalls.find(x=>x.path==="/auth/token")!.body.refresh_token,"one-time-token");
    assert.equal((await persisted.read())!.tokens?.refresh_token,"fixture-rotated-token");
    assert.equal((await persisted.read())!.refreshLease,undefined);
  }finally{await Promise.all([first.close(),second.close()]);}
});

test("refresh after disconnect cannot resurrect even a legacy connection without an epoch",async()=>{
  const now=1_000_000;
  const persisted=storage({version:1,ownerId:"owner-a",clientInformation:{client_id:"fixture-client",issuer:"https://mcp.swiggy.com/auth"},tokens:{access_token:"expired-token",refresh_token:"one-time-token",token_type:"Bearer",issuer:"https://mcp.swiggy.com/auth"},tokensExpiresAt:now-1});
  const calls:Array<{path:string;body:Record<string,unknown>}>=[];const oauth=oauthNetwork(calls);
  const gateway=new SwiggyGateway({ownerId:"owner-a",callbackUrl:"http://localhost:3000/callback",storage:persisted,now:()=>now,fetch:async(input,init)=>{
    const result=await oauth(input,init);if(new URL(String(input)).pathname==="/auth/token")await persisted.update(()=>null);return result;
  }});
  await assert.rejects(gateway.getAddresses(),/connection changed/);assert.equal(await persisted.read(),null);
});

test("an ambiguous refresh is not repeated with its potentially consumed token",async()=>{
  const now=1_000_000;
  const persisted=storage({version:1,ownerId:"owner-a",flowEpoch:"fixture-flow",clientInformation:{client_id:"fixture-client",issuer:"https://mcp.swiggy.com/auth"},tokens:{access_token:"expired-token",refresh_token:"one-time-token",token_type:"Bearer",issuer:"https://mcp.swiggy.com/auth"},tokensExpiresAt:now-1});
  const calls:Array<{path:string;body:Record<string,unknown>}>=[];const oauth=oauthNetwork(calls);
  let refreshes=0;
  const network=(async(input,init)=>{if(new URL(String(input)).pathname==="/auth/token"){refreshes++;throw new Error("synthetic connection loss after submission");}return oauth(input,init);}) as typeof fetch;
  const options={ownerId:"owner-a",callbackUrl:"http://localhost:3000/callback",storage:persisted,fetch:network,now:()=>now};
  const first=new SwiggyGateway(options),second=new SwiggyGateway(options);
  await assert.rejects(first.getAddresses(),/Reconnect/);await assert.rejects(second.getAddresses(),/Reconnect/);
  assert.equal(refreshes,1);assert.equal((await second.readiness()).connected,false);
});

test("a 401 on a submitted cart edit never refreshes or replays the mutation",async()=>{
  const calls:string[]=[];
  const gateway=new SwiggyGateway({ownerId:"owner-a",callbackUrl:"http://localhost:3000/callback",storage:connectedStorage(),fetch:mcpNetwork(calls,name=>name==="update_cart"?json({error:"unauthorized"},401):undefined)});
  await assert.rejects(gateway.setCartQuantity({addressId:"address-a",skuId:"sku-a",spinId:"spin-a",quantity:2,expectedFingerprint:swiggyCartFingerprint(SwiggyCartSchema.parse(cartData))}),/submitted edit may already have reached Swiggy/);
  assert.equal(calls.filter(x=>x==="tools/call:update_cart").length,1);
  assert.equal(calls.filter(x=>x==="initialize").length,1);
});

test("a rejected account token becomes disconnected and can start a new authorization",async()=>{
  const persisted=connectedStorage(),oauthCalls:Array<{path:string;body:Record<string,unknown>}>=[];
  const oauth=oauthNetwork(oauthCalls);let rejected=0;
  const gateway=new SwiggyGateway({ownerId:"owner-a",callbackUrl:"http://localhost:3000/callback",storage:persisted,fetch:async(input,init)=>{
    if(new URL(String(input)).pathname==="/im"){
      rejected++;return json({error:"Do not expose this provider response"},401);
    }
    return oauth(input,init);
  }});
  try{
    assert.equal((await gateway.readiness()).connected,true);
    await assert.rejects(gateway.getAddresses(),error=>error instanceof Error&&"code" in error&&error.code==="SWIGGY_RECONNECT_REQUIRED"&&!error.message.includes("Do not expose"));
    assert.equal(rejected,1,"An unauthorized MCP operation must not be retried");
    assert.equal((await gateway.readiness()).connected,false);
    assert.equal((await persisted.read())!.tokens,undefined);
    const authorization=await gateway.beginAuthorization();
    assert.equal(authorization.alreadyConnected,false);
    assert.equal(new URL(authorization.authorizationUrl!).pathname,"/auth/authorize");
  }finally{await gateway.close();}
});

test("an old request's 401 cannot remove credentials rotated while it was in flight",async()=>{
  const persisted=connectedStorage(),calls:string[]=[];
  const network=mcpNetwork(calls);
  const gateway=new SwiggyGateway({ownerId:"owner-a",callbackUrl:"http://localhost:3000/callback",storage:persisted,fetch:async(input,init)=>{
    if(init?.method==="POST"&&JSON.parse(String(init.body)).method==="tools/call"){
      await persisted.update(value=>({...value!,flowEpoch:"replacement-connection",tokens:{access_token:"replacement-token",token_type:"Bearer"}}));
      return json({error:"Unauthorized old token"},401);
    }
    return network(input,init);
  }});
  try{
    await assert.rejects(gateway.getCart());
    assert.equal((await persisted.read())!.tokens!.access_token,"replacement-token");
    assert.equal((await gateway.readiness()).connected,true);
  }finally{await gateway.close();}
});

test("an old request's 401 cannot cancel an in-flight token refresh",async()=>{
  let now=1_000_000;
  const persisted=storage({version:1,ownerId:"owner-a",flowEpoch:"fixture-flow",clientInformation:{client_id:"fixture-client",issuer:"https://mcp.swiggy.com/auth"},tokens:{access_token:"old-token",refresh_token:"one-time-token",token_type:"Bearer",issuer:"https://mcp.swiggy.com/auth"},tokensExpiresAt:now+120_000});
  const oauthCalls:Array<{path:string;body:Record<string,unknown>}>=[],mcpCalls:string[]=[];
  const oauth=oauthNetwork(oauthCalls),mcp=mcpNetwork(mcpCalls);
  let readStarted!:()=>void,refreshStarted!:()=>void,releaseRead!:()=>void,releaseRefresh!:()=>void;
  const reading=new Promise<void>(resolve=>{readStarted=resolve;}),refreshing=new Promise<void>(resolve=>{refreshStarted=resolve;});
  const readGate=new Promise<void>(resolve=>{releaseRead=resolve;}),refreshGate=new Promise<void>(resolve=>{releaseRefresh=resolve;});
  const network:typeof fetch=async(input,init)=>{
    const path=new URL(String(input)).pathname;
    if(path==="/auth/token"){refreshStarted();await refreshGate;return oauth(input,init);}
    if(path!=="/im")return oauth(input,init);
    if(init?.method==="POST"&&new Headers(init.headers).get("authorization")==="Bearer old-token"&&JSON.parse(String(init.body)).method==="tools/call"){
      readStarted();await readGate;return json({error:"Expired old token"},401);
    }
    return mcp(input,init);
  };
  const options={ownerId:"owner-a",callbackUrl:"http://localhost:3000/callback",storage:persisted,fetch:network,now:()=>now};
  const oldGateway=new SwiggyGateway(options),refreshGateway=new SwiggyGateway(options);
  const rejectedRead=assert.rejects(oldGateway.getAddresses(),{code:"SWIGGY_RECONNECT_REQUIRED"});
  await reading;now+=120_001;
  const refreshedRead=refreshGateway.getAddresses();
  // Observe both outcomes immediately, including the failure reproduced here.
  const refreshedResult=refreshedRead.then(value=>({value}),error=>({error}));
  try{
    await refreshing;releaseRead();await rejectedRead;releaseRefresh();
    const result=await refreshedResult;
    assert.ok("value" in result,"A rejected old request must allow the claimed token refresh to finish");
    assert.equal(oauthCalls.filter(call=>call.path==="/auth/token").length,1);
    assert.equal((await persisted.read())!.tokens?.refresh_token,"fixture-rotated-token");
    assert.equal((await refreshGateway.readiness()).connected,true);
  }finally{releaseRead();releaseRefresh();await refreshedResult;await Promise.all([oldGateway.close(),refreshGateway.close()]);}
});

test("connection diagnostics expose response shape without address, phone or token values",async()=>{
  const calls:string[]=[];const mcp=mcpNetwork(calls);
  const secretAddress="PRIVATE_ADDRESS_VALUE",secretPhone="PRIVATE_PHONE_VALUE",secretToken="PRIVATE_TOKEN_VALUE";
  const gateway=new SwiggyGateway({ownerId:"owner-a",callbackUrl:"http://localhost:3000/callback",storage:connectedStorage(),fetch:async(input,init)=>{
    if(init?.method!=="GET"){
      const request=JSON.parse(String(init?.body));
      if(request.method==="tools/call"){
        calls.push(`tools/call:${request.params.name}`);
        return json({jsonrpc:"2.0",id:request.id,result:{content:[{type:"text",text:JSON.stringify({addresses:[{address:secretAddress,phone:secretPhone,token:secretToken}],"9123456789":secretPhone})}]}});
      }
    }
    return mcp(input,init);
  }});
  try{
    const diagnostic=await gateway.diagnoseConnection();const serialized=JSON.stringify(diagnostic);
    assert.equal(diagnostic.addressProbe.called,true);assert.equal(diagnostic.addressProbe.validationCode,"SWIGGY_SCHEMA_MISMATCH");
    assert.equal(diagnostic.addressProbe.textJson[0].parsed,true);
    for(const secret of [secretAddress,secretPhone,secretToken,"9123456789"])assert.equal(serialized.includes(secret),false);
    assert.equal(calls.filter(x=>x==="tools/call:get_addresses").length,1);
    assert.ok(serialized.includes('"addresses"'));assert.ok(serialized.includes('"phone"'));assert.ok(serialized.includes('"count":1'));
  }finally{await gateway.close();}
});

test("read diagnostics reject arbitrary tools and malformed arguments before network access",async()=>{
  let requests=0;
  const gateway=new SwiggyGateway({ownerId:"owner-a",callbackUrl:"http://localhost:3000/callback",storage:connectedStorage(),fetch:async()=>{requests++;return json({});}});
  for(const invalid of [
    {name:"checkout",args:{}},
    {name:"update_cart",args:{items:[]}},
    {name:"search_products",args:{query:"milk"}},
    {name:"search_products",args:{addressId:"address-a",query:"milk",offset:1}},
    {name:"get_cart",args:{addressId:"address-a"}},
    {name:"get_payment_options",args:{paymentMethodId:"any-method"}}
  ])await assert.rejects(gateway.diagnoseRead(invalid as never),z.ZodError);
  assert.equal(requests,0);
});

test("read diagnostics enforce the discovered provider input schema before calling",async()=>{
  const calls:string[]=[];const mcp=mcpNetwork(calls);
  const gateway=new SwiggyGateway({ownerId:"owner-a",callbackUrl:"http://localhost:3000/callback",storage:connectedStorage(),fetch:async(input,init)=>{
    if(init?.method!=="GET"){
      const request=JSON.parse(String(init?.body));
      if(request.method==="tools/list"){
        calls.push("tools/list");
        return json({jsonrpc:"2.0",id:request.id,result:{tools:[{name:"search_products",inputSchema:{type:"object",properties:{addressId:{type:"string"},query:{type:"string"},newProviderField:{type:"string"}},required:["addressId","query","newProviderField"],additionalProperties:false}}]}});
      }
    }
    return mcp(input,init);
  }});
  try{
    const diagnostic=await gateway.diagnoseRead({name:"search_products",args:{addressId:"address-a",query:"milk"}});
    assert.equal(diagnostic.called,false);assert.equal(diagnostic.validationCode,"SWIGGY_INPUT_SCHEMA_MISMATCH");
    assert.equal(calls.some(x=>x.startsWith("tools/call:")),false);
  }finally{await gateway.close();}
});

test("allowed read diagnostics forward validated arguments and redact every result value",async()=>{
  const calls:string[]=[];const mcp=mcpNetwork(calls);const forwarded:Array<{name:string;arguments:unknown}>=[];
  const gateway=new SwiggyGateway({ownerId:"owner-a",callbackUrl:"http://localhost:3000/callback",storage:connectedStorage(),fetch:async(input,init)=>{
    if(init?.method!=="GET"){
      const request=JSON.parse(String(init?.body));
      if(request.method==="tools/list")return json({jsonrpc:"2.0",id:request.id,result:{tools:[...publishedTools,{name:"search_products",inputSchema:{type:"object",properties:{addressId:{type:"string"},query:{type:"string"}},required:["addressId","query"],additionalProperties:false}},{name:"get_payment_options",inputSchema:{type:"object",properties:{},additionalProperties:false}}]}});
      if(request.method==="tools/call"){
        forwarded.push(request.params);
        const data=request.params.name==="get_cart"?cartData:request.params.name==="get_payment_options"?{allMethods:[],placeOrderToolName:"checkout"}:{products:[{id:"PRIVATE_PRODUCT_VALUE",address:"PRIVATE_ADDRESS_VALUE",phone:"PRIVATE_PHONE_VALUE"}],nextOffset:""};
        return json({jsonrpc:"2.0",id:request.id,result:{structuredContent:data,content:[{type:"text",text:"Markdown presentation is ignored"}]}});
      }
    }
    return mcp(input,init);
  }});
  try{
    const search=await gateway.diagnoseRead({name:"search_products",args:{addressId:"address-a",query:" milk "}});
    assert.equal(search.called,true);assert.equal(search.isError,false);assert.equal(search.validationCode,"SWIGGY_SCHEMA_MISMATCH");
    for(const privateValue of ["PRIVATE_PRODUCT_VALUE","PRIVATE_ADDRESS_VALUE","PRIVATE_PHONE_VALUE"])assert.equal(JSON.stringify(search).includes(privateValue),false);
    const cart=await gateway.diagnoseRead({name:"get_cart",args:{}});assert.equal(cart.validationCode,null);
    const payments=await gateway.diagnoseRead({name:"get_payment_options",args:{}});assert.equal(payments.validationCode,null);
    assert.deepEqual(forwarded,[{name:"search_products",arguments:{addressId:"address-a",query:"milk"}},{name:"get_cart",arguments:{}},{name:"get_payment_options",arguments:{}}]);
  }finally{await gateway.close();}
});
