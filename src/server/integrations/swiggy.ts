import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import Ajv, { type ValidateFunction } from "ajv";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { auth, type OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import { StreamableHTTPClientTransport, StreamableHTTPError } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { OAuthClientInformationMixed, OAuthTokens, OAuthClientMetadata } from "@modelcontextprotocol/sdk/shared/auth.js";
import { CallToolResultSchema, ToolListChangedNotificationSchema, type Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { normalizeSwiggyCart, swiggyPaymentSelection } from "./swiggy-mapping";
import { normalizeSwiggyCheckoutResult, SwiggyCheckoutInputSchema, type SwiggyCheckoutInput, type SwiggyCheckoutResult } from "./swiggy-checkout";
import {
  SwiggyAddressesSchema, SwiggyCartSchema, SwiggySearchSchema, SwiggyPaymentOptionsSchema,
  SwiggyReadArguments, parseSwiggyToolResult, type SwiggyReadTool, type SwiggyCart
} from "./swiggy-schemas";

export type OAuthState = {
  version:1;
  ownerId:string;
  clientInformation?:OAuthClientInformationMixed;
  tokens?:OAuthTokens;
  tokensExpiresAt?:number;
  flowEpoch?:string;
  /** A crashed/ambiguous refresh requires reconnection; never reuse a rotating token. */
  refreshLease?:{id:string;expiresAt:number};
  pending?:{state:string;verifier?:string;expiresAt:number;callbackUrl?:string};
};
/** Storage must encrypt the complete record and serialize writes for this owner. */
export interface SwiggyOAuthStorage {
  read():Promise<OAuthState|null>;
  write(value:OAuthState|null):Promise<void>;
  /** The application supplies a transactional read/change/write for callback races. */
  update?(change:(value:OAuthState|null)=>OAuthState|null):Promise<void>;
}
export class SwiggyGatewayError extends Error {
  public readonly status:number;
  constructor(public readonly code:string,message:string){
    super(message);this.name="SwiggyGatewayError";
    this.status=code==="INVALID_OAUTH_STATE"?400:code==="OAUTH_OWNER_MISMATCH"?403:
      ["SWIGGY_NOT_CONNECTED","SWIGGY_RECONNECT_REQUIRED","OWNER_REQUIRED"].includes(code)?401:
      ["CART_CHANGED","CART_ADDRESS_CHANGED","SWIGGY_CONNECTION_CHANGED"].includes(code)?409:503;
  }
}
export class CheckoutReviewRequiredError extends SwiggyGatewayError {
  constructor(){super("CHECKOUT_REVIEW_REQUIRED","Checkout requires a fresh confirmed order review.");}
}
type Options={ownerId:string;callbackUrl:string;storage:SwiggyOAuthStorage;baseUrl?:string;fetch?:typeof fetch;now?:()=>number};
type ConnectionGuard={epoch:string|undefined;accessToken:string;refreshToken:string|undefined;leaseId:string};
type ConnectedClient={client:Client;identity:string;tools?:{value:Tool[];expiresAt:number};idleTimer?:ReturnType<typeof setTimeout>};
const variantIdentifiers=z.tuple([z.string().min(1).max(300),z.string().min(1).max(300)]);
const quantityInput=z.strictObject({addressId:z.string().min(1),skuId:z.string().min(1),spinId:z.string().min(1),quantity:z.number().int().min(0).max(99),expectedFingerprint:z.string().length(64)});
const clearCartResult=z.union([z.object({verified:z.literal(true)}).passthrough(),z.object({verified:z.null(),acknowledged:z.literal(true)}).passthrough()]);
const diagnosticReadInput=z.discriminatedUnion("name",[
  z.strictObject({name:z.literal("search_products"),args:SwiggyReadArguments.search_products.pick({addressId:true,query:true})}),
  z.strictObject({name:z.literal("get_cart"),args:SwiggyReadArguments.get_cart}),
  z.strictObject({name:z.literal("get_payment_options"),args:SwiggyReadArguments.get_payment_options})
]);
export type SwiggyDiagnosticRead=z.infer<typeof diagnosticReadInput>;
const responseSchemas:Record<SwiggyReadTool,z.ZodType<unknown>>={get_addresses:SwiggyAddressesSchema,search_products:SwiggySearchSchema,get_cart:SwiggyCartSchema,get_payment_options:SwiggyPaymentOptionsSchema};
type DiagnosticShape={type:string;count?:number;length?:number;properties?:Record<string,DiagnosticShape>;samples?:DiagnosticShape[];truncated?:boolean};
/** Shape only: no scalar content, address, phone, product identifier, or token. */
function diagnosticShape(value:unknown,depth=0,budget={remaining:180}):DiagnosticShape{
  if(--budget.remaining<0||depth>7)return {type:Array.isArray(value)?"array":value===null?"null":typeof value,truncated:true};
  if(value===null)return {type:"null"};
  if(Array.isArray(value))return {type:"array",count:value.length,samples:value.slice(0,2).map(item=>diagnosticShape(item,depth+1,budget))};
  if(typeof value==="string")return {type:"string",length:value.length};
  if(typeof value==="object"){
    const entries=Object.entries(value);const properties:Record<string,DiagnosticShape>={};
    for(const [key,item] of entries.slice(0,35)){
      // Provider IDs sometimes become object keys: retain field names only.
      const field=/^[A-Za-z_$][A-Za-z_$-]{0,79}$/.test(key)?key:"[redacted-key]";
      Object.defineProperty(properties,field,{value:diagnosticShape(item,depth+1,budget),enumerable:true,configurable:true});
    }
    return {type:"object",count:entries.length,properties,...(entries.length>35?{truncated:true}:{})};
  }
  return {type:typeof value};
}
const jsonSchemaTypes=new Set(["object","array","string","number","integer","boolean","null"]);
function diagnosticInput(schema:unknown,depth=0):unknown{
  if(!schema||typeof schema!=="object"||depth>4)return {truncated:true};
  const value=schema as Record<string,unknown>;
  const result:Record<string,unknown>={};
  if(typeof value.type==="string"&&jsonSchemaTypes.has(value.type))result.type=value.type;
  if(Array.isArray(value.required))result.required=value.required.filter(x=>typeof x==="string"&&/^[A-Za-z_$][A-Za-z_$-]{0,79}$/.test(x)).slice(0,35);
  if(value.additionalProperties===false)result.additionalProperties=false;
  if(value.properties&&typeof value.properties==="object")result.properties=Object.fromEntries(Object.entries(value.properties).slice(0,35).filter(([key])=>/^[A-Za-z_$][A-Za-z_$-]{0,79}$/.test(key)).map(([key,item])=>[key,diagnosticInput(item,depth+1)]));
  if(value.items)result.items=diagnosticInput(value.items,depth+1);
  return result;
}
function diagnosticCode(error:unknown):string{
  return error instanceof SwiggyGatewayError?error.code:error instanceof Error&&/^SWIGGY_[A-Z_]+$/.test(error.message)?error.message:"SWIGGY_UNSUPPORTED_RESPONSE";
}

/** Stable identity includes every variant identifier; names are never product keys. */
export function swiggyVariantId(skuId:string,spinId:string):string {
  return Buffer.from(JSON.stringify([skuId,spinId]),"utf8").toString("base64url");
}
export function decodeSwiggyVariantId(value:string):{skuId:string;spinId:string}{
  try{
    if(value.length>900) throw new Error();
    const [skuId,spinId]=variantIdentifiers.parse(JSON.parse(Buffer.from(value,"base64url").toString("utf8")));
    if(swiggyVariantId(skuId,spinId)!==value) throw new Error();
    return {skuId,spinId};
  }catch{throw new SwiggyGatewayError("INVALID_PRODUCT","Choose a product returned by the current search.");}
}
/** No address/customer details are included in diagnostics or tool traces. */
export function swiggyCartFingerprint(cart:SwiggyCart):string {
  return createHash("sha256").update(JSON.stringify({
    address:cart.selectedAddressDetails?.id??cart.selectedAddress??null,
    items:cart.items.map(x=>({sku:x.skuId,spin:x.spinId,store:x.storeId??null,quantity:x.quantity,price:x.discountedFinalPrice,available:x.isInStockAndAvailable,maxQuantity:x.maxQuantity??null})).sort((a,b)=>`${a.sku}:${a.spin}:${a.store}`.localeCompare(`${b.sku}:${b.spin}:${b.store}`)),
    total:cart.cartTotalAmount,bill:cart.billBreakdown
  })).digest("hex");
}

/** Saved-address IDs include an opaque `__` suffix; live cart details return
 * only the base ID. Compare that documented-by-observation structure exactly,
 * never a display label, partial prefix, or fuzzy address text. */
export function swiggyCartAddressMatches(cart:SwiggyCart,selectedAddressId:string):boolean {
  const current=cart.selectedAddressDetails?.id??cart.selectedAddress;
  if(current===selectedAddressId)return true;
  if(!cart.selectedAddressDetails)return false;
  const composite=/^([A-Za-z0-9-]{12,100})__[A-Za-z0-9_-]+$/.exec(selectedAddressId);
  return Boolean(composite&&cart.selectedAddressDetails.id===composite[1]);
}

/**
 * Official MCP SDK transport plus per-browser-owner OAuth. No LLM-facing arbitrary
 * tool proxy, automatic purchase retries, or module-global account credentials.
 */
export class SwiggyGateway {
  private readonly endpoint:URL;
  private readonly callback:URL;
  private readonly now:()=>number;
  private readonly request:typeof fetch;
  private readonly validator=new Ajv({strict:false,allErrors:false,validateFormats:false,addUsedSchema:false});
  private readonly argumentValidators=new WeakMap<Tool,ValidateFunction>();
  // Both the live client and its schema cache belong to this owner-bound gateway.
  // There is no global user-data/token cache. Reuse is bounded by an idle timeout.
  private connection?:ConnectedClient;
  private operations:Promise<void>=Promise.resolve();
  constructor(private readonly options:Options){
    this.endpoint=new URL(options.baseUrl??"https://mcp.swiggy.com/im");
    if(this.endpoint.protocol!=="https:"||!["mcp.swiggy.com","mcp-staging.swiggy.com"].includes(this.endpoint.hostname)||this.endpoint.port||this.endpoint.pathname!=="/im"||this.endpoint.search||this.endpoint.hash||this.endpoint.username||this.endpoint.password){
      throw new SwiggyGatewayError("INVALID_PROVIDER_URL","Use the assigned official Swiggy Instamart MCP endpoint.");
    }
    this.callback=new URL(options.callbackUrl);
    if((this.callback.protocol!=="https:"&&!(this.callback.protocol==="http:"&&["localhost","127.0.0.1","[::1]"].includes(this.callback.hostname)))||this.callback.username||this.callback.password||this.callback.search||this.callback.hash){
      throw new SwiggyGatewayError("INVALID_CALLBACK","Use an exact registered HTTPS callback, or localhost for development.");
    }
    if(!options.ownerId) throw new SwiggyGatewayError("OWNER_REQUIRED","An application session is required.");
    this.now=options.now??Date.now;
    const network=options.fetch??fetch;
    this.request=async(input,init)=>{
      const url=new URL(typeof input==="string"?input:input instanceof URL?input.href:input.url);
      // Discovery metadata may name token/registration URLs: never send secrets to another host.
      if(url.origin!==this.endpoint.origin||url.username||url.password) throw new SwiggyGatewayError("UNTRUSTED_OAUTH_ORIGIN","Swiggy authorization metadata selected an unexpected origin.");
      const signals:AbortSignal[]=[AbortSignal.timeout(25_000)];
      if(init?.signal) signals.push(init.signal);
      const requestInit:RequestInit={...init,redirect:"manual",signal:AbortSignal.any(signals),cache:"no-store"};
      // Swiggy's published token contract requires JSON; the SDK uses OAuth form fields.
      // Translate only this known endpoint, retaining all SDK PKCE/client parameters.
      if(url.pathname==="/auth/token"&&requestInit.body){
        const headers=new Headers(requestInit.headers);
        if(headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")){
          const fields=new URLSearchParams(String(requestInit.body));
          requestInit.body=JSON.stringify(Object.fromEntries(fields));
          headers.set("content-type","application/json");requestInit.headers=headers;
        }
      }
      return network(input,requestInit);
    };
  }
  private ownedState(value:OAuthState|null):OAuthState{
    if(value&&(value.version!==1||value.ownerId!==this.options.ownerId)) throw new SwiggyGatewayError("OAUTH_OWNER_MISMATCH","This Swiggy connection belongs to another application session.");
    return value??{version:1,ownerId:this.options.ownerId};
  }
  private async read():Promise<OAuthState>{return this.ownedState(await this.options.storage.read());}
  private async update(change:(value:OAuthState)=>void,expectedEpoch?:string,connectionGuard?:ConnectionGuard):Promise<void>{
    const apply=(value:OAuthState|null)=>{
      const state=this.ownedState(value);
      if(expectedEpoch!==undefined&&state.flowEpoch!==expectedEpoch)throw new SwiggyGatewayError("SWIGGY_CONNECTION_CHANGED","The Swiggy connection changed during authorization. Start a new connection.");
      if(connectionGuard&&(state.flowEpoch!==connectionGuard.epoch||state.tokens?.access_token!==connectionGuard.accessToken||state.tokens?.refresh_token!==connectionGuard.refreshToken||state.refreshLease?.id!==connectionGuard.leaseId))throw new SwiggyGatewayError("SWIGGY_CONNECTION_CHANGED","The Swiggy connection changed during authorization. Start a new connection.");
      change(state);return state;
    };
    if(this.options.storage.update)await this.options.storage.update(apply);
    else await this.options.storage.write(apply(await this.options.storage.read()));
  }
  private provider(onRedirect:(url:URL)=>void,verifier?:string,expectedEpoch?:string,connectionGuard?:ConnectionGuard):OAuthClientProvider {
    const gateway=this;
    return {
      get redirectUrl(){return gateway.callback;},
      get clientMetadata():OAuthClientMetadata{return {client_name:"SayCart Instamart",redirect_uris:[gateway.callback.href],grant_types:["authorization_code","refresh_token"],response_types:["code"],token_endpoint_auth_method:"none",scope:"mcp:tools"};},
      async state(){const state=await gateway.read();if(!state.pending)throw new SwiggyGatewayError("OAUTH_FLOW_REQUIRED","Start a new Swiggy connection.");return state.pending.state;},
      async clientInformation(){return (await gateway.read()).clientInformation;},
      async saveClientInformation(value){await gateway.update(state=>{state.clientInformation=value;},expectedEpoch,connectionGuard);},
      async tokens(){return (await gateway.read()).tokens;},
      async saveTokens(value){await gateway.update(state=>{state.tokens=value;state.tokensExpiresAt=typeof value.expires_in==="number"?gateway.now()+value.expires_in*1000:undefined;delete state.refreshLease;},expectedEpoch,connectionGuard);},
      async redirectToAuthorization(url){
        if(url.origin!==gateway.endpoint.origin)throw new SwiggyGatewayError("UNTRUSTED_OAUTH_ORIGIN","Unexpected authorization destination.");
        onRedirect(url);
      },
      async saveCodeVerifier(value){await gateway.update(state=>{if(!state.pending)throw new SwiggyGatewayError("OAUTH_FLOW_REQUIRED","Start a new connection.");state.pending.verifier=value;},expectedEpoch,connectionGuard);},
      async codeVerifier(){const value=verifier??(await gateway.read()).pending?.verifier;if(!value)throw new SwiggyGatewayError("OAUTH_FLOW_REQUIRED","The Swiggy connection expired. Start again.");return value;},
      async invalidateCredentials(scope){
        // Do not let SDK recovery start a second refresh/registration flow while
        // this connection's rotating refresh token is held by a lease.
        if(connectionGuard)throw new SwiggyGatewayError("SWIGGY_RECONNECT_REQUIRED","Reconnect your Swiggy account.");
        await gateway.update(state=>{
        if(scope==="all"||scope==="tokens"){delete state.tokens;delete state.tokensExpiresAt;}
        if(scope==="all"||scope==="client")delete state.clientInformation;
        if(scope==="all"||scope==="verifier")delete state.pending;
      },expectedEpoch,connectionGuard);}
    };
  }
  async beginAuthorization():Promise<{authorizationUrl:string|null;alreadyConnected:boolean}>{
    if((await this.read()).tokens?.access_token){
      try{await this.connectedState();return {authorizationUrl:null,alreadyConnected:true};}
      catch(error){if(!(error instanceof SwiggyGatewayError)||!["SWIGGY_RECONNECT_REQUIRED","SWIGGY_NOT_CONNECTED"].includes(error.code))throw error;}
    }
    let redirect:URL|undefined;
    const flowEpoch=randomBytes(32).toString("base64url");
    await this.update(state=>{state.flowEpoch=flowEpoch;delete state.tokens;delete state.tokensExpiresAt;delete state.refreshLease;state.pending={state:flowEpoch,expiresAt:this.now()+10*60_000,callbackUrl:this.callback.href};});
    try{
      const result=await auth(this.provider(url=>{redirect=url;},undefined,flowEpoch),{serverUrl:this.endpoint,scope:"mcp:tools",fetchFn:this.request});
      if(result==="AUTHORIZED"){await this.update(state=>{delete state.pending;},flowEpoch);return {authorizationUrl:null,alreadyConnected:true};}
      if(!redirect)throw new Error("missing_authorization_url");
      return {authorizationUrl:redirect.href,alreadyConnected:false};
    }catch(error){
      if(error instanceof SwiggyGatewayError)throw error;
      throw new SwiggyGatewayError("SWIGGY_AUTH_UNAVAILABLE","Swiggy authorization could not start. Verify access and the exact callback allowlist, then try again.");
    }
  }
  async completeAuthorization(code:string,returnedState:string):Promise<void>{
    let verifier:string|undefined;let flowEpoch:string|undefined;
    await this.update(state=>{
      const pending=state.pending;
      const returnedBytes=Buffer.from(returnedState);const expectedBytes=Buffer.from(pending?.state??"");
      const matches=pending&&returnedBytes.length===expectedBytes.length&&timingSafeEqual(returnedBytes,expectedBytes);
      if(!pending||!matches||pending.expiresAt<=this.now()||!pending.verifier||pending.callbackUrl!==this.callback.href||!code||code.length>4096){
        throw new SwiggyGatewayError("INVALID_OAUTH_STATE","This Swiggy authorization callback expired or does not match this browser. Start a new connection.");
      }
      // Transactionally consume before exchanging: concurrent callbacks cannot both claim it.
      verifier=pending.verifier;flowEpoch=state.flowEpoch;delete state.pending;
    });
    try{
      const result=await auth(this.provider(()=>{},verifier,flowEpoch),{serverUrl:this.endpoint,authorizationCode:code,scope:"mcp:tools",fetchFn:this.request});
      if(result!=="AUTHORIZED")throw new Error("authorization_incomplete");
    }catch(error){
      if(error instanceof SwiggyGatewayError)throw error;
      throw new SwiggyGatewayError("SWIGGY_AUTH_EXCHANGE_FAILED","Swiggy authorization did not complete. Start a new connection.");
    }
  }
  async disconnect():Promise<void>{
    if(this.options.storage.update)await this.options.storage.update(value=>{this.ownedState(value);return null;});
    else {await this.read();await this.options.storage.write(null);}
    await this.close();
  }
  async readiness():Promise<{connected:boolean;mappingVerified:boolean;reason:string}>{
    const state=await this.read();
    const connected=Boolean(state.tokens?.access_token&&(!state.refreshLease||state.refreshLease.expiresAt>this.now())&&(!state.tokensExpiresAt||state.tokensExpiresAt>this.now()||state.tokens.refresh_token));
    return {connected,mappingVerified:true,reason:connected?"Swiggy is connected. Product variants and complete cart bills are validated before shopping and checkout.":"Connect your own Swiggy account to discover available tools."};
  }
  private async connectedState():Promise<OAuthState>{
    // Persisted ownership serializes rotating refresh tokens across gateway objects
    // and server processes. Storage without transactional update fails closed.
    const waitUntil=Date.now()+90_000;let waitInterval=25;
    for(;;){
      const state=await this.read();
      if(!state.tokens?.access_token)throw new SwiggyGatewayError("SWIGGY_NOT_CONNECTED","Connect your Swiggy account first.");
      if(state.refreshLease){
        if(state.refreshLease.expiresAt<=this.now()||Date.now()>=waitUntil)throw new SwiggyGatewayError("SWIGGY_RECONNECT_REQUIRED","A previous Swiggy token refresh could not be verified. Reconnect your account.");
        await new Promise(resolve=>setTimeout(resolve,waitInterval));waitInterval=Math.min(waitInterval*2,250);continue;
      }
      if(!state.tokensExpiresAt||state.tokensExpiresAt>this.now()+60_000)return state;
      if(!state.tokens.refresh_token||!this.options.storage.update)throw new SwiggyGatewayError("SWIGGY_RECONNECT_REQUIRED","Reconnect Swiggy; the account token expired.");
      const guard:ConnectionGuard={epoch:state.flowEpoch,accessToken:state.tokens.access_token,refreshToken:state.tokens.refresh_token,leaseId:randomBytes(24).toString("base64url")};
      let claimed=false;
      await this.options.storage.update(value=>{
        if(!value)return null;
        const current=this.ownedState(value);
        if(current.flowEpoch===guard.epoch&&current.tokens?.access_token===guard.accessToken&&current.tokens?.refresh_token===guard.refreshToken&&!current.refreshLease){current.refreshLease={id:guard.leaseId,expiresAt:this.now()+90_000};claimed=true;}
        return current;
      });
      if(!claimed)continue;
      try{
        const refreshed=await auth(this.provider(()=>{throw new SwiggyGatewayError("SWIGGY_RECONNECT_REQUIRED","Reconnect your Swiggy account.");},undefined,guard.epoch,guard),{serverUrl:this.endpoint,scope:"mcp:tools",fetchFn:this.request});
        if(refreshed!=="AUTHORIZED")throw new SwiggyGatewayError("SWIGGY_RECONNECT_REQUIRED","Reconnect your Swiggy account.");
        const next=await this.read();
        if(!next.tokens?.access_token||next.flowEpoch!==guard.epoch)throw new SwiggyGatewayError("SWIGGY_CONNECTION_CHANGED","The Swiggy connection changed during authorization. Start a new connection.");
        return next;
      }catch(error){
        // Keep an ambiguous refresh claimed. Retrying its old refresh token can
        // invalidate a rotated token even if our network response was lost.
        await this.options.storage.update(current=>{this.ownedState(current);if(current?.refreshLease?.id===guard.leaseId)current.refreshLease.expiresAt=this.now();return current;});
        const current=await this.read();
        if(current.tokens?.access_token!==guard.accessToken||current.flowEpoch!==guard.epoch)throw new SwiggyGatewayError("SWIGGY_CONNECTION_CHANGED","The Swiggy connection changed during authorization. Start a new connection.");
        if(error instanceof SwiggyGatewayError&&error.code==="SWIGGY_CONNECTION_CHANGED")throw error;
        throw new SwiggyGatewayError("SWIGGY_RECONNECT_REQUIRED","Swiggy token refresh could not be verified. Reconnect your account.");
      }
    }
  }
  /** Release this gateway's MCP session without changing the user's credentials. */
  async close():Promise<void>{
    const connection=this.connection;this.connection=undefined;
    if(connection){clearTimeout(connection.idleTimer);await connection.client.close().catch(()=>{});}
  }
  private async withClient<T>(work:(client:Client)=>Promise<T>):Promise<T>{
    // One gateway's reads/edits share a connection and cannot race its idle close.
    const previous=this.operations;let release!:()=>void;
    this.operations=new Promise<void>(resolve=>{release=resolve;});await previous;
    let authorizedState:OAuthState|undefined;
    try{
      if(this.connection)clearTimeout(this.connection.idleTimer);
      const state=await this.connectedState();authorizedState=state;
      const identity=createHash("sha256").update(JSON.stringify([state.flowEpoch,state.tokens!.access_token])).digest("hex");
      if(this.connection?.identity!==identity)await this.close();
      if(!this.connection){
        // No authProvider here: a 401 must never transparently replay a mutation.
        const transport=new StreamableHTTPClientTransport(this.endpoint,{fetch:this.request,requestInit:{headers:{Authorization:`Bearer ${state.tokens!.access_token}`}},reconnectionOptions:{maxRetries:0,initialReconnectionDelay:1000,maxReconnectionDelay:1000,reconnectionDelayGrowFactor:1}});
        const client=new Client({name:"saycart-instamart",version:"0.1.0"});
        const connection:ConnectedClient={client,identity};this.connection=connection;
        client.setNotificationHandler(ToolListChangedNotificationSchema,()=>{connection.tools=undefined;});
        await client.connect(transport);
      }
      return await work(this.connection.client);
    }catch(error){
      await this.close();
      if(error instanceof SwiggyGatewayError)throw error;
      if(error instanceof StreamableHTTPError&&error.code===401&&authorizedState){
        // Do not replay an operation with refreshed credentials: a submitted
        // mutation can be ambiguous. Only invalidate the rejected version;
        // another request may already have connected or started rotating this
        // account. Its refresh lease must remain valid until that exchange ends.
        const rejected=authorizedState;
        const invalidate=(value:OAuthState|null)=>{
          if(!value)return null;
          const current=this.ownedState(value);
          if(current.flowEpoch===rejected.flowEpoch&&current.tokens?.access_token===rejected.tokens?.access_token&&current.tokens?.refresh_token===rejected.tokens?.refresh_token&&!current.refreshLease){
            delete current.tokens;delete current.tokensExpiresAt;delete current.refreshLease;
          }
          return current;
        };
        if(this.options.storage.update)await this.options.storage.update(invalidate);
        else await this.options.storage.write(invalidate(await this.options.storage.read()));
        throw new SwiggyGatewayError("SWIGGY_RECONNECT_REQUIRED","Reconnect your Swiggy account. A submitted edit may already have reached Swiggy; refresh your bag before another edit.");
      }
      throw new SwiggyGatewayError("SWIGGY_REQUEST_FAILED","Swiggy did not return a verified response. Refresh the cart before another edit; a submitted edit may already have reached Swiggy.");
    }finally{
      const connection=this.connection;
      if(connection){connection.idleTimer=setTimeout(()=>{if(this.connection===connection)void this.close();},20_000);connection.idleTimer.unref();}
      release();
    }
  }
  private async tools(client:Client):Promise<Tool[]>{
    const connection=this.connection;
    if(connection?.client===client&&connection.tools&&connection.tools.expiresAt>this.now())return connection.tools.value;
    this.validator.removeSchema();
    const result:Tool[]=[];let cursor:string|undefined;
    for(let page=0;page<10;page++){
      const next=await client.listTools(cursor?{cursor}:{});result.push(...next.tools);cursor=next.nextCursor;
      if(result.length>500)throw new SwiggyGatewayError("SWIGGY_SCHEMA_LIMIT","Swiggy returned too many tool schemas.");
      if(!cursor){if(connection?.client===client)connection.tools={value:result,expiresAt:this.now()+60_000};return result;}
    }
    throw new SwiggyGatewayError("SWIGGY_SCHEMA_LIMIT","Swiggy tool discovery exceeded its page limit.");
  }
  async discoverTools():Promise<Array<{name:string;inputSchema:Tool["inputSchema"];outputSchema?:Tool["outputSchema"]}>>{
    return this.withClient(async client=>structuredClone((await this.tools(client)).filter(tool=>Object.hasOwn(SwiggyReadArguments,tool.name)||tool.name==="update_cart"||tool.name==="clear_cart").map(({name,inputSchema,outputSchema})=>({name,inputSchema,outputSchema}))));
  }
  /** Owner-protected troubleshooting only. Makes one read, returning shapes, never PII. */
  async diagnoseConnection(){
    return this.withClient(async client=>{
      const discovered=await this.tools(client);
      const tools=discovered.map(tool=>({name:tool.name,input:diagnosticInput(tool.inputSchema),hasOutputSchema:Boolean(tool.outputSchema)}));
      return {tools,addressProbe:await this.diagnosticProbe(client,discovered,"get_addresses",{})};
    });
  }
  /** A closed read allowlist, never an arbitrary MCP tool proxy or cart writer. */
  async diagnoseRead(input:SwiggyDiagnosticRead){
    const parsed=diagnosticReadInput.parse(input);
    return this.withClient(async client=>this.diagnosticProbe(client,await this.tools(client),parsed.name,parsed.args));
  }
  private async diagnosticProbe(client:Client,tools:Tool[],name:SwiggyReadTool,args:Record<string,unknown>){
    try{this.validateLiveArguments(tools.find(tool=>tool.name===name),args);}
    catch(error){return {called:false,isError:null,validationCode:diagnosticCode(error),shape:null,textJson:[]};}
    // Generic SDK request deliberately bypasses its provider-declared output
    // validator so malformed real output can be inspected safely by shape.
    const raw=await client.request({method:"tools/call",params:{name,arguments:args}},CallToolResultSchema,{timeout:25_000});
    let validationCode:string|null=null;let validationIssues:unknown=null;
    try{parseSwiggyToolResult(raw,responseSchemas[name]);}catch(error){validationCode=diagnosticCode(error);if(error instanceof Error&&"schemaIssues" in error)validationIssues=error.schemaIssues;}
    const textJson=raw.content.filter(item=>item.type==="text").slice(0,3).map(item=>{
      const text=typeof item.text==="string"?item.text:"";
      if(text.length>2_000_000)return {parsed:false,shape:{type:"string",length:text.length,truncated:true}};
      try{return {parsed:true,shape:diagnosticShape(JSON.parse(text))};}
      catch{return {parsed:false,shape:{type:"string",length:text.length}};}
    });
    return {called:true,isError:raw.isError===true,validationCode,validationIssues,shape:diagnosticShape(raw),textJson};
  }
  private validateLiveArguments(tool:Tool|undefined,args:Record<string,unknown>):void{
    if(!tool)throw new SwiggyGatewayError("SWIGGY_CAPABILITY_UNAVAILABLE","The required Swiggy tool is unavailable to this account.");
    let validate=this.argumentValidators.get(tool);
    if(!validate&&JSON.stringify(tool.inputSchema).length>65_536)throw new SwiggyGatewayError("SWIGGY_SCHEMA_LIMIT","The provider tool schema is too large.");
    try{if(!validate){validate=this.validator.compile(tool.inputSchema);this.argumentValidators.set(tool,validate);}if(!validate(args))throw new Error();}
    catch{throw new SwiggyGatewayError("SWIGGY_INPUT_SCHEMA_MISMATCH","The current Swiggy tool schema differs from this adapter. Update the verified mapping before calling it.");}
  }
  private async call<T>(name:SwiggyReadTool,args:unknown,schema:z.ZodType<T>):Promise<T>{
    const parsed=SwiggyReadArguments[name].parse(args) as Record<string,unknown>;
    return this.withClient(async client=>{
      const tools=await this.tools(client);this.validateLiveArguments(tools.find(tool=>tool.name===name),parsed);
      try{return parseSwiggyToolResult(await client.callTool({name,arguments:parsed},undefined,{timeout:25_000}),schema);}
      catch(error){if(error instanceof Error&&error.message.startsWith("SWIGGY_"))throw new SwiggyGatewayError(error.message,"Swiggy returned an unsuccessful or unrecognized tool response. No fallback catalog was substituted.");throw error;}
    });
  }
  getAddresses(args:z.infer<typeof SwiggyReadArguments.get_addresses>={}){return this.call("get_addresses",args,SwiggyAddressesSchema);}
  searchProducts(args:z.infer<typeof SwiggyReadArguments.search_products>){return this.call("search_products",args,SwiggySearchSchema);}
  /** Read-only developer evidence: catalog prices only, never saved addresses/tokens. */
  async inspectProductPrices(args:z.infer<typeof SwiggyReadArguments.search_products>){
    const parsed=SwiggyReadArguments.search_products.parse(args);
    return this.withClient(async client=>{
      const tools=await this.tools(client);this.validateLiveArguments(tools.find(tool=>tool.name==="search_products"),parsed);
      const raw=CallToolResultSchema.parse(await client.callTool({name:"search_products",arguments:parsed},undefined,{timeout:25_000}));
      const result=parseSwiggyToolResult(raw,SwiggySearchSchema);
      return {samples:result.products.slice(0,3).flatMap(product=>product.variations.slice(0,2).map(variant=>({name:variant.displayName,unit:variant.quantityDescription,price:variant.price}))),displayRows:raw.content.flatMap(item=>item.type==="text"?item.text.split("\n"):[]).filter(line=>line.includes("₹")&&!/address|phone|mobile|token/i.test(line)).slice(0,8).map(line=>line.slice(0,450))};
    });
  }
  getCart(){return this.call("get_cart",{},SwiggyCartSchema);}
  getPaymentOptions(){return this.call("get_payment_options",{},SwiggyPaymentOptionsSchema);}

  /** Root must serialize owner edits. The compare cannot lock Swiggy's external app. */
  async setCartQuantity(input:{addressId:string;skuId:string;spinId:string;quantity:number;expectedFingerprint:string}):Promise<SwiggyCart>{
    const args=quantityInput.parse(input);
    return this.withClient(async client=>{
      const tools=await this.tools(client);
      this.validateLiveArguments(tools.find(tool=>tool.name==="get_cart"),{});
      const baseline=parseSwiggyToolResult(await client.callTool({name:"get_cart",arguments:{}},undefined,{timeout:25_000}),SwiggyCartSchema);
      if(swiggyCartFingerprint(baseline)!==args.expectedFingerprint)throw new SwiggyGatewayError("CART_CHANGED","Your Swiggy cart changed. Refresh and review it before editing.");
      if(baseline.items.length&&!swiggyCartAddressMatches(baseline,args.addressId))throw new SwiggyGatewayError("CART_ADDRESS_CHANGED","Review the existing cart delivery address before replacing its contents.");
      // Instamart resolves stores from the returned SKU/SPIN identities. Its
      // replacement schema takes those identities, not cart-level store fields.
      let matched=false;
      const items=baseline.items.flatMap(item=>{
        const selected=item.skuId===args.skuId&&item.spinId===args.spinId;
        if(selected)matched=true;
        const quantity=selected?args.quantity:item.quantity;
        return quantity>0?[{skuId:item.skuId,spinId:item.spinId,quantity}]:[];
      });
      if(!matched&&args.quantity>0)items.push({skuId:args.skuId,spinId:args.spinId,quantity:args.quantity});
      if(!items.length){
        // Removing the sole remaining line is an explicit empty-cart edit.
        // Swiggy provides a dedicated operation rather than an empty replacement.
        this.validateLiveArguments(tools.find(tool=>tool.name==="clear_cart"),{});
        parseSwiggyToolResult(await client.callTool({name:"clear_cart",arguments:{}},undefined,{timeout:25_000}),clearCartResult);
        return parseSwiggyToolResult(await client.callTool({name:"get_cart",arguments:{}},undefined,{timeout:25_000}),SwiggyCartSchema);
      }
      const replacement={selectedAddressId:args.addressId,items};
      this.validateLiveArguments(tools.find(tool=>tool.name==="update_cart"),replacement);
      parseSwiggyToolResult(await client.callTool({name:"update_cart",arguments:replacement},undefined,{timeout:25_000}),SwiggyCartSchema);
      return parseSwiggyToolResult(await client.callTool({name:"get_cart",arguments:{}},undefined,{timeout:25_000}),SwiggyCartSchema);
    });
  }

  /** Called only after the application durably claims an explicitly confirmed quote. */
  async checkout(input?:SwiggyCheckoutInput):Promise<SwiggyCheckoutResult>{
    if(!input)throw new CheckoutReviewRequiredError();
    let submitted=false;
    try{
      const args=SwiggyCheckoutInputSchema.parse(input);
      return await this.withClient(async client=>{
        const tools=await this.tools(client);
        this.validateLiveArguments(tools.find(tool=>tool.name==="get_cart"),{});
        const cart=parseSwiggyToolResult(await client.callTool({name:"get_cart",arguments:{}},undefined,{timeout:25_000}),SwiggyCartSchema);
        if(!cart.items.length||swiggyCartFingerprint(cart)!==args.expectedFingerprint)throw new SwiggyGatewayError("CART_CHANGED","Your Swiggy bag changed. Review a fresh order summary.");
        if(!swiggyCartAddressMatches(cart,args.addressId))throw new SwiggyGatewayError("CART_ADDRESS_CHANGED","The Swiggy delivery address differs from your reviewed address.");
        if(cart.items.some(item=>!item.isInStockAndAvailable)||cart.unserviceableItems?.length)throw new SwiggyGatewayError("CART_CHANGED","Some items are unavailable. Refresh your Instamart bag.");
        normalizeSwiggyCart(cart,0);
        this.validateLiveArguments(tools.find(tool=>tool.name==="get_payment_options"),{});
        const payments=parseSwiggyToolResult(await client.callTool({name:"get_payment_options",arguments:{}},undefined,{timeout:25_000}),SwiggyPaymentOptionsSchema);
        const selection=swiggyPaymentSelection(payments,args.paymentMethodId);
        if(selection.generateUPIQR)throw new SwiggyGatewayError("PAYMENT_UNAVAILABLE","Choose an available UPI app or another supported method. QR checkout is not available here yet.");
        const checkoutArgs={addressId:args.addressId,...selection};
        this.validateLiveArguments(tools.find(tool=>tool.name==="checkout"),checkoutArgs);
        // No duplicate override, auth replay, timeout retry, or model arguments.
        submitted=true;
        return normalizeSwiggyCheckoutResult(await client.callTool({name:"checkout",arguments:checkoutArgs},undefined,{timeout:25_000}));
      });
    }catch(error){
      if(error instanceof Error&&!submitted)Object.defineProperty(error,"checkoutSubmitted",{value:false});
      throw error;
    }
  }
}
