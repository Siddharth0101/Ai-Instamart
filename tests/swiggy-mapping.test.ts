import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSwiggyCart, normalizeSwiggyProducts, normalizeSwiggyPayments, safeProductImage, swiggyPaymentSelection, swiggyRupeesToMinor } from "../src/server/integrations/swiggy-mapping";
import { fixtureService } from "./helpers/live-provider";
import { parseSwiggyToolResult, SwiggyCartSchema } from "../src/server/integrations/swiggy-schemas";
import { swiggyCartAddressMatches } from "../src/server/integrations/swiggy";

test("INR decimal conversion is exact and rejects ambiguous money strings",()=>{
  for(const [input,expected] of [["₹29.50",2950],["INR 1,234.05",123405],["Rs. 1,23,456.70",12345670],["0",0],["Free",0],[29.5,2950]] as const)assert.equal(swiggyRupeesToMinor(input),expected);
  for(const input of ["$20","₹20-30","Was ₹30 now ₹20","1e3","12.345",-1,Infinity,"9,99"])assert.throws(()=>swiggyRupeesToMinor(input));
});
test("live products preserve each returned SKU/SPIN and pack with explicit INR prices",async()=>{
  const fixture=fixtureService(),raw=await fixture.provider("test").searchProducts({addressId:"address-a",query:"milk"});
  raw.products[0].variations.push({...raw.products[0].variations[0],skuId:"sku-family",spinId:"spin-family",quantityDescription:"1 litre",price:{mrp:200,offerPrice:195.5}});
  const products=normalizeSwiggyProducts(raw);assert.equal(products.length,2);assert.notEqual(products[0].id,products[1].id);assert.equal(products[1].priceMinor,19550);assert.equal(products[1].unit,"1 litre");
});
test("cart mapping retains every provider bill row and verifies the full payable",()=>{
  const fixture=fixtureService();fixture.account("test").quantities.set("milk",2);const raw=fixture.cart("test"),mapped=normalizeSwiggyCart(raw,7);
  assert.equal(mapped.totals.itemsMinor,20000);assert.equal(mapped.totals.feesMinor,2500);assert.equal(mapped.totals.totalMinor,22500);assert.deepEqual(mapped.bill,raw.billBreakdown);assert.equal(mapped.revision,7);
  const mismatch=structuredClone(raw);mismatch.billBreakdown.toPay.value="₹99";assert.throws(()=>normalizeSwiggyCart(mismatch,8));
  const unknown=structuredClone(raw);unknown.billBreakdown.lineItems.push({label:"Unrecognized charge type",value:"₹12"});assert.throws(()=>normalizeSwiggyCart(unknown,8));
  const wrongUnits=structuredClone(raw);wrongUnits.items[0].discountedFinalPrice=10000;assert.throws(()=>normalizeSwiggyCart(wrongUnits,8));
});
test("nonempty live carts accept the provider's null storeId without inventing a store",()=>{
  const fixture=fixtureService();fixture.account("test").quantities.set("milk",1);const raw=fixture.cart("test");raw.items[0].storeId=null;
  const parsed=parseSwiggyToolResult({structuredContent:raw,content:[]},SwiggyCartSchema);assert.equal(parsed.items[0].storeId,null);assert.equal(normalizeSwiggyCart(parsed,1).lines[0].quantity,1);
});
test("nonempty live carts preserve integer store IDs observed from the actual MCP",()=>{
  const fixture=fixtureService();fixture.account("test").quantities.set("milk",1);const raw={...fixture.cart("test"),items:fixture.cart("test").items.map(item=>({...item,storeId:42}))};
  const parsed=parseSwiggyToolResult({structuredContent:raw,content:[]},SwiggyCartSchema);assert.equal(parsed.items[0].storeId,"42");assert.equal(normalizeSwiggyCart(parsed,1).totals.itemsMinor,10000);
});
test("observed Instamart fee rows reconcile decimal fees exactly without estimating delivery",()=>{
  const fixture=fixtureService();fixture.account("test").quantities.set("milk",1);const raw=fixture.cart("test");raw.items[0].mrp=raw.items[0].discountedFinalPrice=30;
  raw.cartTotalAmount="101";raw.billBreakdown={lineItems:[{label:"Item Total",value:"₹30.00"},{label:"Handling Fee",value:"₹12.00"},{label:"Small Cart Fee",value:"₹23.60"},{label:"Delivery Partner Fee",value:"₹35.40"}],toPay:{label:"To Pay",value:"₹101"}};
  const cart=normalizeSwiggyCart(raw,1);assert.deepEqual(cart.totals,{itemsMinor:3000,feesMinor:7100,discountMinor:0,totalMinor:10100,currency:"INR"});assert.deepEqual(cart.bill,raw.billBreakdown);
});
test("cart base address IDs match only the selected saved address's exact composite base",()=>{
  const fixture=fixtureService(),raw=fixture.cart("test");const base="addressabcdefghijklm";
  raw.selectedAddressDetails={id:base,address:"Synthetic",area:"Synthetic",name:"Fixture",mobile:"0000000000"};
  assert.equal(swiggyCartAddressMatches(raw,`${base}__opaqueSuffix`),true);
  assert.equal(swiggyCartAddressMatches(raw,"differentabcdefghijk__opaqueSuffix"),false);
  assert.equal(swiggyCartAddressMatches(raw,`${base}Extra__opaqueSuffix`),false);
  delete raw.selectedAddressDetails;raw.selectedAddress=base;
  assert.equal(swiggyCartAddressMatches(raw,`${base}__opaqueSuffix`),false);
});
test("provider signed credits and unavailable payments cannot create invented totals or methods",async()=>{
  const fixture=fixtureService();fixture.account("test").quantities.set("milk",1);const raw=fixture.cart("test");raw.billBreakdown.lineItems.push({label:"Coupon discount",value:"-₹5.00"});raw.billBreakdown.toPay.value=raw.cartTotalAmount="₹120";
  assert.equal(normalizeSwiggyCart(raw,1).totals.discountMinor,500);
  const payments=await fixture.provider("test").getPaymentOptions();assert.equal(normalizeSwiggyPayments(payments)[0].id,"Cash");assert.deepEqual(swiggyPaymentSelection(payments,"Cash"),{paymentMethod:"Cash"});payments.cod!.available=false;assert.deepEqual(normalizeSwiggyPayments(payments),[]);assert.throws(()=>swiggyPaymentSelection(payments,"Cash"));
});

test("product images are restricted to Swiggy's HTTPS image origins",()=>{
  for(const url of ["https://media-assets.swiggy.com/image/upload/sample.jpg","https://res.cloudinary.com/swiggy/image/upload/sample.jpg"]){
    assert.equal(safeProductImage(url),url);
  }
  for(const url of ["http://media-assets.swiggy.com/sample.jpg","https://media-assets.swiggy.com.evil.example/sample.jpg","https://res.cloudinary.com/another-account/image.jpg","https://username:password@media-assets.swiggy.com/sample.jpg","https://media-assets.swiggy.com:444/sample.jpg","javascript:alert(1)","data:image/png;base64,aaaa","/relative.jpg"]){
    assert.equal(safeProductImage(url),undefined,`Unsafe image accepted: ${url}`);
  }
});

test("catalog mapping preserves image and MRP while respecting each pack's quantity limit",async()=>{
  const fixture=fixtureService(),raw=await fixture.provider("test").searchProducts({addressId:"address-a",query:"milk"});
  const variant=raw.products[0].variations[0];
  variant.imageUrl="https://media-assets.swiggy.com/image/upload/fixture.jpg";variant.maxQuantity=2;variant.price={offerPrice:80,mrp:100};
  let [product]=normalizeSwiggyProducts(raw);assert.equal(product.imageUrl,variant.imageUrl);assert.equal(product.priceMinor,8000);assert.equal(product.mrpMinor,10000);assert.equal(product.maxQuantity,2);assert.equal(product.available,true);
  variant.maxQuantity=0;[product]=normalizeSwiggyProducts(raw);assert.equal(product.available,false);assert.equal(product.maxQuantity,0);
  variant.maxQuantity=200;variant.imageUrl="https://untrusted.example/image.jpg";[product]=normalizeSwiggyProducts(raw);assert.equal(product.maxQuantity,99);assert.equal(product.available,true);assert.equal(product.imageUrl,undefined);
  delete variant.maxQuantity;[product]=normalizeSwiggyProducts(raw);assert.equal(product.maxQuantity,undefined);
});
