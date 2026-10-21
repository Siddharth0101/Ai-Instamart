import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { AddressRequestSchema,CartRequestSchema,ConfirmRequestSchema,PaymentRequestSchema,QuoteRequestSchema,RealtimeTokenRequestSchema,SearchRequestSchema,SessionRequestSchema,SpeechRequestSchema,StopRequestSchema,TurnRequestSchema } from "../../../lib/contracts";
import { bootstrap,confirmQuote,conversation,createOwner,createQuote,gateway,getAttempt,getCurrentAttempt,getOwner,getView,searchCatalog,selectAddress,selectPayment,speechText,startSession,stopTurn,updateCart,verifySwiggyConnection } from "../../../server/service";
import { appOrigin } from "../../../server/origin";
import { canonicalFingerprint,equalSecret,fingerprint,opaqueId } from "../../../server/crypto";
import { AppError } from "../../../server/errors";
import { transaction } from "../../../server/store";
import { createRealtimeTranscriptionToken,synthesizeSpeech } from "../../../server/voice";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const COOKIE="saycart_owner";
const getRoutes=new Set(["bootstrap","session","attempt/current","integrations/swiggy/diagnostics","integrations/swiggy/verification","integrations/swiggy/connect","integrations/swiggy/callback"]);
const postRoutes=new Set(["session","turn","search","cart","address","payment","stop","quote","confirm","transcribe/token","speech","integrations/swiggy/disconnect"]);
const buckets=new Map<string,{count:number;until:number}>();
function limit(owner:string,path:string) {
  const category=path.startsWith("attempt/")?"attempt":path;
  const now=Date.now(),key=`${owner}:${category}`;let bucket=buckets.get(key);
  if(!bucket||bucket.until<now){bucket={count:0,until:now+60000};buckets.set(key,bucket);}
  if(++bucket.count>(path==="transcribe/token"?8:path==="turn"?20:60))throw new AppError("RATE_LIMITED","Please wait a moment before trying again.",429);
  if(buckets.size>10000)for(const [id,b]of buckets)if(b.until<now)buckets.delete(id);
}
async function boundedBytes(request:Request,max:number) {
  if(Number(request.headers.get("content-length"))>max)throw new AppError("BODY_TOO_LARGE","This request is too large.",413);
  const reader=request.body?.getReader();if(!reader)return new Uint8Array();let length=0;const chunks:Uint8Array[]=[];
  try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>max){await reader.cancel();throw new AppError("BODY_TOO_LARGE","This request is too large.",413);}chunks.push(value);}}finally{reader.releaseLock();}
  const result=new Uint8Array(length);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}return result;
}
type CachedResponse={hash:string;hashVersion?:2;state:"pending"|"complete";body?:unknown;status?:number};
async function once(owner:string,path:string,key:string,input:unknown,fn:()=>Promise<{body:unknown;status?:number}>) {
  const id=`${path}:${key}`,hash=canonicalFingerprint(input);
  const existing=await transaction(async tx=>{
    const found=await tx.get<CachedResponse>(owner,"idempotency",id);
    if(found){if(found.hash!==(found.hashVersion===2?hash:fingerprint(input)))throw new AppError("IDEMPOTENCY_CONFLICT","This request key was already used for different input.",409);return found;}
    await tx.put(owner,"idempotency",id,{hash,hashVersion:2,state:"pending"});return null;
  });
  if(existing){if(existing.state==="pending")throw new AppError("REQUEST_IN_PROGRESS","This request is still in progress. Refresh its status before retrying.",409);return {body:existing.body,status:existing.status};}
  try{const result=await fn();await transaction(tx=>tx.put(owner,"idempotency",id,{hash,hashVersion:2,state:"complete",...result}));return result;}
  catch(error){const mapped=publicError(error);const result={body:{error:{code:mapped.code,message:mapped.message}},status:mapped.status};await transaction(tx=>tx.put(owner,"idempotency",id,{hash,hashVersion:2,state:"complete",...result}));return result;}
}
function publicError(error:unknown):{code:string;message:string;status:number} {
  if(error instanceof z.ZodError)return {code:"INVALID_INPUT",message:"The request did not match the required format.",status:400};
  if(error instanceof AppError)return error;
  if(error instanceof SyntaxError)return {code:"INVALID_JSON",message:"Send a valid JSON request.",status:400};
  if(error instanceof Error && "code" in error && "status" in error && typeof error.code==="string" && typeof error.status==="number" && error.status>=400 && error.status<600)return {code:error.code,message:error.message,status:error.status};
  return {code:"SERVICE_UNAVAILABLE",message:"The service could not finish this request. Check the configured services and try again.",status:503};
}
async function handle(request:NextRequest,context:{params:Promise<{path:string[]}>}) {
  const requestId=opaqueId("req"),path=(await context.params).path.join("/");let cookie:string|undefined;
  const json=(body:unknown,status=200)=>{
    const response=NextResponse.json(typeof body==="object"&&body!==null?{...body,requestId}:{data:body,requestId},{status,headers:{"Cache-Control":"no-store","X-Request-Id":requestId}});
    if(cookie)response.cookies.set(COOKIE,cookie,{httpOnly:true,sameSite:"lax",secure:new URL(appOrigin()).protocol==="https:",path:"/",maxAge:60*60*24*30});return response;
  };
  try {
    // NextURL canonicalizes numeric loopback hosts to localhost. Check the actual
    // Host against configured origin instead; never construct callback URLs from it.
    if(request.headers.get("host")!==new URL(appOrigin()).host)throw new AppError("UNTRUSTED_ORIGIN","Use the configured app URL to open SayCart.",403);
    if(request.method!=="GET"&&request.method!=="POST")throw new AppError("METHOD_NOT_ALLOWED","This method is not supported.",405);
    // Unknown paths must not allocate rate buckets or persisted idempotency rows.
    const supported=request.method==="GET"?getRoutes.has(path)||/^attempt\/[^/]+$/.test(path):postRoutes.has(path);
    if(!supported)throw new AppError("NOT_FOUND","This route does not exist.",404);
    let ownerId=request.cookies.get(COOKIE)?.value;
    let owner=ownerId&&/^owner_[\w-]{24}$/.test(ownerId)?await getOwner(ownerId):null;
    if(!owner||!ownerId){if(path!=="bootstrap"||request.method!=="GET")throw new AppError("UNAUTHORIZED","Refresh the page to begin a local session.",401);const created=await createOwner();ownerId=created.id;owner=created.owner;cookie=ownerId;}
    limit(ownerId,path);
    if(request.method==="GET") {
      if(path==="bootstrap")return json(await bootstrap(ownerId));
      if(path==="session"){if(!owner.sessionId)throw new AppError("NO_SESSION","Connect Swiggy to begin.",404);return json(await getView(ownerId,owner.sessionId));}
      if(path==="attempt/current")return json({attempt:await getCurrentAttempt(ownerId)});
      if(path==="integrations/swiggy/diagnostics"){
        const provider=gateway(ownerId);
        try{return json(await provider.diagnoseConnection());}finally{await provider.close();}
      }
      if(path==="integrations/swiggy/verification")return json(await verifySwiggyConnection(ownerId));
      if(/^attempt\/[^/]+$/.test(path))return json({attempt:await getAttempt(ownerId,path.split("/")[1])});
      if(path==="integrations/swiggy/connect"){
        const result=await gateway(ownerId).beginAuthorization();
        return NextResponse.redirect(result.authorizationUrl||`${appOrigin()}/?connected=1`,{status:303,headers:{"Cache-Control":"no-store","X-Request-Id":requestId}});
      }
      if(path==="integrations/swiggy/callback"){
        const code=request.nextUrl.searchParams.get("code"),state=request.nextUrl.searchParams.get("state");
        if(!code||!state)throw new AppError("OAUTH_FAILED","Swiggy authorization was not completed. Start the connection again.",400);
        await gateway(ownerId).completeAuthorization(code,state);
        return NextResponse.redirect(`${appOrigin()}/?connected=1`,{status:303,headers:{"Cache-Control":"no-store","X-Request-Id":requestId}});
      }
      throw new AppError("NOT_FOUND","This route does not exist.",404);
    }
    if(request.headers.get("origin")!==appOrigin()||!equalSecret(request.headers.get("x-csrf-token")||"",owner.csrfToken))throw new AppError("CSRF_REJECTED","Refresh the page before sending this request.",403);
    const key=request.headers.get("idempotency-key");
    if(!key||!/^[-\w]{8,100}$/.test(key))throw new AppError("IDEMPOTENCY_KEY_REQUIRED","Send a unique request key.",400);
    if(!request.headers.get("content-type")?.includes("application/json"))throw new AppError("JSON_REQUIRED","Send JSON using application/json.",415);
    const bytes=await boundedBytes(request,16*1024),input=JSON.parse(new TextDecoder().decode(bytes));
    if(path==="transcribe/token"){
      const data=RealtimeTokenRequestSchema.parse(input);
      if(owner.sessionId!==data.sessionId)throw new AppError("NO_SESSION","Open your shopping session before using voice.",404);
      const session=await transaction(tx=>tx.get<{mode:string}>(ownerId!,"session",data.sessionId));
      if(session?.mode!=="live")throw new AppError("NO_SESSION","Open your shopping session before using voice.",404);
      // A single-use credential must not enter the persisted idempotency cache.
      return json(await createRealtimeTranscriptionToken(request.signal));
    }
    if(path==="speech"){
      const data=SpeechRequestSchema.parse(input),text=await speechText(ownerId,data.sessionId,data.assistantMessageId,data.expectedTurnVersion),speech=await synthesizeSpeech(text,request.signal);
      await speechText(ownerId,data.sessionId,data.assistantMessageId,data.expectedTurnVersion);
      return new NextResponse(speech.audio,{headers:{"Content-Type":speech.contentType,"Cache-Control":"no-store","X-Request-Id":requestId,"X-Assistant-Message-Id":data.assistantMessageId}});
    }
    const result=await once(ownerId,path,key,input,async()=>{
      if(path==="session")return {body:await startSession(ownerId!,SessionRequestSchema.parse(input).mode),status:201};
      if(path==="turn")return {body:await conversation(ownerId!,TurnRequestSchema.parse(input))};
      if(path==="search")return {body:await searchCatalog(ownerId!,SearchRequestSchema.parse(input))};
      if(path==="cart")return {body:await updateCart(ownerId!,CartRequestSchema.parse(input))};
      if(path==="address"){const data=AddressRequestSchema.parse(input);return {body:await selectAddress(ownerId!,data.sessionId,data.addressId)};}
      if(path==="payment"){const data=PaymentRequestSchema.parse(input);return {body:await selectPayment(ownerId!,data.sessionId,data.paymentMethodId)};}
      if(path==="stop"){const data=StopRequestSchema.parse(input);return {body:await stopTurn(ownerId!,data.sessionId,data.expectedTurnVersion)};}
      if(path==="quote"){const data=QuoteRequestSchema.parse(input);return {body:{quote:await createQuote(ownerId!,data.sessionId,data.expectedCartRevision)}};}
      if(path==="confirm"){const data=ConfirmRequestSchema.parse(input),attempt=await confirmQuote(ownerId!,data.quoteId,data.challenge);return {body:{attempt},status:attempt.state==="complete"?201:202};}
      if(path==="integrations/swiggy/disconnect"){z.strictObject({}).parse(input);await gateway(ownerId!).disconnect();return {body:{disconnected:true}};}
      throw new AppError("NOT_FOUND","This route does not exist.",404);
    });
    return json(result.body,result.status);
  }catch(error){const mapped=publicError(error);return json({error:{code:mapped.code,message:mapped.message}},mapped.status);}
}
export const GET=handle;
export const POST=handle;
