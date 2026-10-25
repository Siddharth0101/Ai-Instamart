import type { SessionView } from "../lib/contracts";
import { seal, unseal } from "./crypto";
import { AppError } from "./errors";
import { read, transaction, write } from "./store";
import { SwiggyGateway, swiggyCartAddressMatches, type OAuthState } from "./integrations/swiggy";
import { appOrigin } from "./origin";
import { createShoppingService, type ShoppingProvider, type ShoppingRuntime } from "./shopping";
import { fixtureEnabled } from "./integrations/food-fixture";
import { instamartFixture } from "./integrations/instamart-fixture";
import { normalizeSwiggyCart } from "./integrations/swiggy-mapping";
export { createShoppingService, type Owner, type CheckoutDispatcher } from "./shopping";

export function gateway(ownerId:string) {
  return new SwiggyGateway({ownerId,callbackUrl:`${appOrigin()}/api/integrations/swiggy/callback`,storage:{
    async read(){const value=await read<string>(ownerId,"oauth","swiggy");return value?unseal<OAuthState>(value,ownerId):null;},
    async write(value){if(value)await write(ownerId,"oauth","swiggy",seal(value,ownerId));else await transaction(tx=>tx.remove(ownerId,"oauth","swiggy"));},
    async update(change){await transaction(async tx=>{const value=await tx.get<string>(ownerId,"oauth","swiggy");const next=change(value?unseal<OAuthState>(value,ownerId):null);if(next)await tx.put(ownerId,"oauth","swiggy",seal(next,ownerId));else await tx.remove(ownerId,"oauth","swiggy");});}
  }});
}
// PGlite runs in one process. Retain owner ordering and cancellation across Next
// module reloads so a refreshed module cannot mistake running work for an orphan.
const globals=globalThis as typeof globalThis & {saycartShoppingRuntime?:ShoppingRuntime};
const runtime=globals.saycartShoppingRuntime??={ownerQueues:new Map()};
/** Instamart for one owner: the live account, or the development store. */
export const instamartProvider=(ownerId:string):ShoppingProvider=>fixtureEnabled()?instamartFixture(ownerId):gateway(ownerId);
const shopping=createShoppingService({provider:instamartProvider,runtime});
export const {createOwner,getOwner,getView,bootstrap,startSession,updateCart,selectAddress,selectPayment,createQuote,confirmQuote,getAttempt,getCurrentAttempt,rememberProducts}=shopping;
async function session(ownerId:string,sessionId:string){const s=await read<SessionView>(ownerId,"session",sessionId);if(!s)throw new AppError("NOT_FOUND","This session could not be found.",404);return s;}
/** Live, read-only acceptance check. Never calls a cart/order mutation. */
export async function verifySwiggyConnection(ownerId:string) {
  const owner=await getOwner(ownerId);
  if(!owner?.sessionId)throw new AppError("NO_SESSION","Start a Swiggy session first.",422);
  const current=await session(ownerId,owner.sessionId);
  if(current.mode!=="live"||!current.addressId||!current.addresses.some(a=>a.id===current.addressId))throw new AppError("ADDRESS_REQUIRED","Select a saved Swiggy address before running the live checks.",422);
  const addressId=current.addressId,provider=gateway(ownerId);
  const safeCode=(error:unknown)=>error instanceof Error&&"code" in error&&typeof error.code==="string"?error.code:"READ_FAILED";
  const diagnose=async(input:Parameters<SwiggyGateway["diagnoseRead"]>[0])=>{try{return await provider.diagnoseRead(input);}catch(error){return {called:false,code:safeCode(error)};}};
  try{
    const readiness=await provider.readiness();
    const capabilities=await provider.discoverTools();
    const addresses=await provider.getAddresses({explicitAddressId:addressId});
    const selected=addresses.addresses.find(a=>a.id===addressId);
    const resolved=addresses.resolution.verifiedAddressId??addresses.resolution.selectedAddressId;
    if(!selected||addresses.resolution.needsUserClarification||(typeof resolved==="string"&&resolved!==addressId))throw new AppError("ADDRESS_CHANGED","The selected address could not be verified. Refresh and select it again.",409);
    const checks:Record<string,unknown>={
      connection:{ok:readiness.connected,endpoint:"https://mcp.swiggy.com/im"},
      tools:{ok:true,names:capabilities.map(t=>t.name)},
      addresses:{ok:true,count:addresses.addresses.length,selectedAddressVerified:true,label:current.addresses.find(a=>a.id===addressId)?.label},
    };
    try{
      const result=await provider.searchProducts({addressId,query:"milk"});
      checks.search={ok:true,query:"milk",productCount:result.products.length,variantCount:result.products.reduce((count,p)=>count+p.variations.length,0),priceUnit:"INR",normalizedCurrencyUnit:"paise",priceEvidence:await provider.inspectProductPrices({addressId,query:"milk"})};
    }catch(error){checks.search={ok:false,code:safeCode(error),diagnostic:await diagnose({name:"search_products",args:{addressId,query:"milk"}})};}
    try{
      const result=await provider.getCart();
      const normalized=normalizeSwiggyCart(result,0);
      checks.cart={ok:true,lineCount:result.items.length,hasBill:!!result.billBreakdown,selectedAddressMatches:swiggyCartAddressMatches(result,addressId),remoteCartChanged:false,cartTotalAmount:result.cartTotalAmount,bill:result.billBreakdown,normalizedTotals:normalized.totals};
    }catch(error){checks.cart={ok:false,code:safeCode(error),diagnostic:await diagnose({name:"get_cart",args:{}})};}
    try{
      const result=await provider.getPaymentOptions();
      checks.paymentOptions={ok:true,methodCount:result.allMethods.length,requiresExplicitOrderConfirmation:true};
    }catch(error){checks.paymentOptions={ok:false,code:safeCode(error),diagnostic:await diagnose({name:"get_payment_options",args:{}})};}
    await write(ownerId,"verification","swiggy",{checkedAt:new Date().toISOString(),checks});
    return {checkedAt:new Date().toISOString(),readOnly:true,checks};
  }finally{await provider.close();}
}
