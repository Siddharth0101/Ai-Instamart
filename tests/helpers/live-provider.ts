import { createShoppingService, type ShoppingProvider } from "../../src/server/shopping";
import type { SessionView } from "../../src/lib/contracts";
import { normalizeSwiggyProducts } from "../../src/server/integrations/swiggy-mapping";
import { swiggyCartFingerprint, swiggyVariantId } from "../../src/server/integrations/swiggy";
import type { SwiggyCart } from "../../src/server/integrations/swiggy-schemas";

export const milkId=swiggyVariantId("sku-milk","spin-milk"),breadId=swiggyVariantId("sku-bread","spin-bread");
export function fixtureService(){
  const accounts=new Map<string,{quantities:Map<string,number>;writes:number;checkouts:number;connected:boolean;addressId:string}>();
  function account(owner:string){let value=accounts.get(owner);if(!value){value={quantities:new Map(),writes:0,checkouts:0,connected:true,addressId:"address-a"};accounts.set(owner,value);}return value;}
  function cart(owner:string):SwiggyCart{
    const current=account(owner),items=[...current.quantities].filter(([,q])=>q>0).map(([key,quantity])=>({skuId:`sku-${key}`,spinId:`spin-${key}`,productId:`product-${key}`,itemName:`Fixture ${key}`,itemVariant:key==="milk"?"500 ml":"400 g",quantity,isInStockAndAvailable:true,mrp:key==="milk"?100:50,discountedFinalPrice:key==="milk"?100:50}));
    const subtotal=items.reduce((sum,item)=>sum+item.quantity*item.discountedFinalPrice,0),fees=items.length?25:0;
    return {selectedAddress:current.addressId,cartTotalAmount:`₹${subtotal+fees}.00`,items,billBreakdown:{lineItems:[{label:"Item total",value:`₹${subtotal}.00`},...(fees?[{label:"Delivery fee",value:"₹25.00"}]:[])],toPay:{label:"To pay",value:`₹${subtotal+fees}.00`}}};
  }
  const provider=(owner:string):ShoppingProvider=>({
    readiness:async()=>({connected:account(owner).connected,mappingVerified:true,reason:"Isolated test transport"}),
    close:async()=>{},
    getAddresses:async()=>({addresses:[{id:"address-a",addressLine:"Synthetic test delivery address",phoneNumber:"0000000000",addressTag:"Sector 48 fixture"}],pagination:{page:1,pageSize:10,total:1,totalPages:1,hasMore:false},resolution:{defaultAddressId:"address-a",resolutionSource:"explicit_user_address",needsUserClarification:false,candidateAddressIds:["address-a"]}}),
    searchProducts:async({query})=>({nextOffset:"",products:["milk","bread"].filter(key=>query.toLowerCase().includes(key)).map(key=>({displayName:`Fixture ${key}`,brand:"Fixture",inStock:true,isAvail:true,productId:`product-${key}`,parentProductId:`parent-${key}`,variations:[{skuId:`sku-${key}`,spinId:`spin-${key}`,displayName:`Fixture ${key}`,brandName:"Fixture",quantityDescription:key==="milk"?"500 ml":"400 g",price:{mrp:key==="milk"?100:50,offerPrice:key==="milk"?100:50},isInStockAndAvailable:true}]}))}),
    getCart:async()=>structuredClone(cart(owner)),
    getPaymentOptions:async()=>({allMethods:[{id:"Cash",displayName:"Cash on delivery",enabled:true}],cod:{id:"Cash",displayName:"Cash on delivery",available:true},placeOrderToolName:"checkout"}),
    setCartQuantity:async input=>{const current=account(owner);if(swiggyCartFingerprint(cart(owner))!==input.expectedFingerprint)throw new Error("CART_CHANGED");current.writes++;const key=input.skuId.replace(/^sku-/,"");if(input.quantity)current.quantities.set(key,input.quantity);else current.quantities.delete(key);current.addressId=input.addressId;return cart(owner);},
    checkout:async()=>{account(owner).checkouts++;return {state:"complete",message:"Fixture order accepted",results:[{orderId:"fixture-order",state:"complete",message:"Test transport"}]};},
  });
  const service=createShoppingService({provider});
  return {service,account,cart,provider};
}

/** The assistant owns discovery; the commerce service only remembers its validated results. */
export async function rememberSearch(service:ReturnType<typeof createShoppingService>, provider:(owner:string)=>ShoppingProvider, owner:string, view:SessionView, query:string) {
  assertAddress(view.addressId);
  const connection=provider(owner);
  try {
    const products=normalizeSwiggyProducts(await connection.searchProducts({addressId:view.addressId,query}));
    await service.rememberProducts(owner,view.sessionId,view.addressId,products);
    return service.getView(owner,view.sessionId);
  } finally { await connection.close(); }
}
function assertAddress(address:string|null):asserts address is string {if(!address)throw new Error("Fixture search requires an explicitly selected address");}
