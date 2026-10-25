import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { AddressRequestSchema,ConfirmRequestSchema,PaymentRequestSchema,QuoteRequestSchema,SessionRequestSchema } from "../../../lib/contracts";
import { bootstrap,confirmQuote,createOwner,createQuote,gateway,getAttempt,getCurrentAttempt,getOwner,getView,selectAddress,selectPayment,startSession,verifySwiggyConnection } from "../../../server/service";
import { appOrigin } from "../../../server/origin";
import { canonicalFingerprint,equalSecret,fingerprint,opaqueId } from "../../../server/crypto";
import { AppError } from "../../../server/errors";
import { transaction } from "../../../server/store";
import { createRealtimeTranscriptionToken,speechToTextSettings,synthesizeSpeech } from "../../../server/voice";
import { assistant,foodGateway,foodAddresses,selectFoodAddress,AssistantSpeechSchema } from "../../../server/assistant-service";
import { greet, runVoiceTurn } from "../../../server/voice-agent";
import { fixtureEnabled } from "../../../server/integrations/food-fixture";
import { GROCERY_RAILS } from "../../../lib/grocery-catalog";
import { clearCheckouts, syncInstamart } from "../../../server/instamart-flow";
import { chooseFoodPayment,foodState,placeFoodOrder,refreshFoodOrder,resetFoodOrder,startFoodCheckout,syncFoodCart,trackFoodOrder } from "../../../server/food-flow";
import { AssistantTurnSchema,AssistantSelectSchema,AssistantCartLineSchema,AssistantVersionSchema,AssistantMoreSchema,AssistantRestaurantSchema,AssistantMenuSelectSchema } from "../../../lib/assistant-contracts";

export const runtime="nodejs";
export const dynamic="force-dynamic";
// Cookies are shared by every port on a host, so the development test store keeps its own: otherwise running it beside the real app signs each one out of the other.
const COOKIE=fixtureEnabled()?"saycart_fixture_owner":"saycart_owner";
const getRoutes=new Set(["bootstrap","session","assistant","assistant/food-addresses","food/state","attempt/current","integrations/swiggy/diagnostics","integrations/swiggy/verification","integrations/swiggy/connect","integrations/swiggy/callback","integrations/swiggy-food/connect","integrations/swiggy-food/callback"]);
const postRoutes=new Set(["session","address","payment","quote","confirm","integrations/swiggy/disconnect","assistant/turn","assistant/greet","assistant/grocery-home","assistant/browse","assistant/cart-line","food/sync","instamart/sync","food/checkout","food/payment","food/order","food/order/refresh","food/order/reset","food/order/track","assistant/search","assistant/more","assistant/select","assistant/cart","assistant/reset","assistant/stop","assistant/voice/token","assistant/restaurant","assistant/restaurants/more","assistant/restaurants/back","assistant/menu/more","assistant/menu/select","assistant/speech","assistant/food-address","integrations/swiggy-food/disconnect"]);
const buckets=new Map<string,{count:number;until:number}>();
function limit(owner:string,path:string) {
  const category=path.startsWith("attempt/")?"attempt":path;
  const now=Date.now(),key=`${owner}:${category}`;let bucket=buckets.get(key);
  if(!bucket||bucket.until<now){bucket={count:0,until:now+60000};buckets.set(key,bucket);}
  // Conversation voice reconnects when on-screen vocabulary changes, so its token budget is larger.
  if(++bucket.count>(path==="assistant/voice/token"?30:path==="assistant/turn"?20:60))throw new AppError("RATE_LIMITED","Please wait a moment before trying again.",429);
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
      if(path==="assistant")return json(await assistant.get(ownerId));
      if(path==="food/state")return json(await foodState(ownerId));
      if(path==="assistant/food-addresses")return json(await foodAddresses(ownerId));
      if(path==="integrations/swiggy-food/connect"){
        const provider=foodGateway(ownerId);
        try{const result=await provider.beginAuthorization();return NextResponse.redirect(result.authorizationUrl??`${appOrigin()}/?connected=food`,{status:303,headers:{"Cache-Control":"no-store","X-Request-Id":requestId}});}finally{await provider.close();}
      }
      if(path==="integrations/swiggy-food/callback"){
        const code=request.nextUrl.searchParams.get("code"),state=request.nextUrl.searchParams.get("state");
        if(!code||!state)throw new AppError("OAUTH_FAILED","Swiggy Food authorization was not completed. Start the connection again.",400);
        const provider=foodGateway(ownerId);try{await provider.completeAuthorization(code,state);}finally{await provider.close();}
        return NextResponse.redirect(`${appOrigin()}/?connected=food`,{status:303,headers:{"Cache-Control":"no-store","X-Request-Id":requestId}});
      }
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
    const bytes=await boundedBytes(request,path==="assistant/turn"?640*1024:16*1024),input=JSON.parse(new TextDecoder().decode(bytes));
    if(path==="assistant/voice/token"){
      z.strictObject({}).parse(input);await assistant.get(ownerId);
      // Single-use speech credentials are never written into idempotency storage.
      return json({...await createRealtimeTranscriptionToken(request.signal),...speechToTextSettings()});
    }
    if(path==="assistant/speech"){
      const data=AssistantSpeechSchema.parse(input),text=await assistant.speechText(ownerId,data.messageId,data.expectedVersion),speech=await synthesizeSpeech(text,request.signal);
      await assistant.speechText(ownerId,data.messageId,data.expectedVersion);
      return new NextResponse(speech.audio,{headers:{"Content-Type":speech.contentType,"Cache-Control":"no-store","X-Request-Id":requestId,"X-Assistant-Message-Id":data.messageId}});
    }
    const result=await once(ownerId,path,key,input,async()=>{
      // Upstream model errors stay in the server log; the page only needs the state and the spoken fallback.
      if(path==="assistant/turn"){const {degraded:_degraded,trace:_trace,...turn}=await runVoiceTurn(ownerId!,AssistantTurnSchema.parse(input),request.signal);return {body:turn};}
      // The page sends these whenever its dishes or groceries change, so the Swiggy app shows them too.
      if(path==="food/sync"){const data=z.strictObject({replaceExisting:z.boolean().optional()}).parse(input);return {body:await syncFoodCart(ownerId!,request.signal,data.replaceExisting??false)};}
      if(path==="instamart/sync"){z.strictObject({}).parse(input);return {body:await syncInstamart(ownerId!,request.signal)};}
      if(path==="food/checkout"){const data=z.strictObject({replaceExisting:z.boolean().optional()}).parse(input);return {body:await startFoodCheckout(ownerId!,request.signal,data.replaceExisting??false)};}
      if(path==="food/payment")return {body:await chooseFoodPayment(ownerId!,z.strictObject({paymentId:z.string().min(1).max(300)}).parse(input).paymentId)};
      // Tapping "Place order" on the reviewed total is the customer's explicit consent for that exact review.
      if(path==="food/order")return {body:await placeFoodOrder(ownerId!,z.strictObject({quoteId:z.string().min(1).max(200)}).parse(input).quoteId)};
      if(path==="food/order/reset"){const data=z.strictObject({attemptId:z.string().min(1).max(200),confirmedNoOrderOrPayment:z.literal(true)}).parse(input);return {body:await resetFoodOrder(ownerId!,data.attemptId)};}
      if(path==="food/order/refresh"){z.strictObject({}).parse(input);return {body:await refreshFoodOrder(ownerId!)};}
      if(path==="food/order/track"){z.strictObject({}).parse(input);return {body:await trackFoodOrder(ownerId!)};}
      // The Instamart home rails are fixed searches; clients cannot choose provider queries here.
      if(path==="assistant/grocery-home")return {body:await assistant.groceryHome(ownerId!,{rails:GROCERY_RAILS,expectedVersion:AssistantVersionSchema.parse(input).expectedVersion})};
      if(path==="assistant/greet")return {body:await greet(ownerId!,AssistantVersionSchema.parse(input).expectedVersion)};
      if(path==="assistant/browse"){const data=z.strictObject({query:z.string().trim().min(1).max(200),route:z.enum(["restaurant","instamart"]),expectedVersion:z.number().int().nonnegative()}).parse(input);return {body:await assistant.browse(ownerId!,data)};}
      if(path==="assistant/search")return {body:await assistant.search(ownerId!,AssistantVersionSchema.parse(input).expectedVersion)};
      if(path==="assistant/more")return {body:await assistant.more(ownerId!,AssistantMoreSchema.parse(input))};
      if(path==="assistant/restaurant")return {body:await assistant.openRestaurant(ownerId!,AssistantRestaurantSchema.parse(input))};
      if(path==="assistant/restaurants/more")return {body:await assistant.moreRestaurants(ownerId!,AssistantVersionSchema.parse(input).expectedVersion)};
      if(path==="assistant/restaurants/back")return {body:await assistant.backRestaurants(ownerId!,AssistantVersionSchema.parse(input).expectedVersion)};
      if(path==="assistant/menu/more")return {body:await assistant.moreMenu(ownerId!,AssistantVersionSchema.parse(input).expectedVersion)};
      if(path==="assistant/menu/select")return {body:await assistant.selectMenuOffer(ownerId!,AssistantMenuSelectSchema.parse(input))};
      if(path==="assistant/select")return {body:await assistant.select(ownerId!,AssistantSelectSchema.parse(input))};
      if(path==="assistant/cart-line")return {body:await assistant.setCartLine(ownerId!,AssistantCartLineSchema.parse(input))};
      if(path==="assistant/cart")return {body:await assistant.prepare(ownerId!,AssistantVersionSchema.parse(input).expectedVersion)};
      if(path==="assistant/reset")return {body:await assistant.reset(ownerId!,AssistantVersionSchema.parse(input).expectedVersion)};
      if(path==="assistant/stop")return {body:await assistant.stop(ownerId!,AssistantVersionSchema.parse(input).expectedVersion)};
      if(path==="assistant/food-address"){
        const data=z.strictObject({addressId:z.string().min(1).max(300),expectedVersion:z.number().int().nonnegative()}).parse(input);
        return {body:await selectFoodAddress(ownerId!,data.addressId,data.expectedVersion)};
      }
      if(path==="integrations/swiggy-food/disconnect"){
        z.strictObject({}).parse(input);const provider=foodGateway(ownerId!);try{await provider.disconnect();}finally{await provider.close();}return {body:{disconnected:true}};
      }
      if(path==="session")return {body:await startSession(ownerId!,SessionRequestSchema.parse(input).mode),status:201};
      if(path==="address"){const data=AddressRequestSchema.parse(input);return {body:await selectAddress(ownerId!,data.sessionId,data.addressId)};}
      if(path==="payment"){const data=PaymentRequestSchema.parse(input);return {body:await selectPayment(ownerId!,data.sessionId,data.paymentMethodId)};}
      if(path==="quote"){const data=QuoteRequestSchema.parse(input);return {body:{quote:await createQuote(ownerId!,data.sessionId,data.expectedCartRevision)}};}
      if(path==="confirm"){const data=ConfirmRequestSchema.parse(input),attempt=await confirmQuote(ownerId!,data.quoteId,data.challenge);if(attempt.state==="complete"){await assistant.clearOrderedGroceries(ownerId!);await clearCheckouts(ownerId!);}return {body:{attempt},status:attempt.state==="complete"?201:202};}
      if(path==="integrations/swiggy/disconnect"){z.strictObject({}).parse(input);await gateway(ownerId!).disconnect();return {body:{disconnected:true}};}
      throw new AppError("NOT_FOUND","This route does not exist.",404);
    });
    return json(result.body,result.status);
  }catch(error){const mapped=publicError(error);return json({error:{code:mapped.code,message:mapped.message}},mapped.status);}
}
export const GET=handle;
export const POST=handle;
