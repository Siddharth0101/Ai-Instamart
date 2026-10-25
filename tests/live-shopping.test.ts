import { after, test } from "node:test";
import assert from "node:assert/strict";
import { fixtureService, milkId, rememberSearch } from "./helpers/live-provider";
import { SessionRequestSchema } from "../src/lib/contracts";
import { database, write, read } from "../src/server/store";
import { createShoppingService } from "../src/server/shopping";
import { normalizeSwiggyProducts } from "../src/server/integrations/swiggy-mapping";
import { swiggyVariantId } from "../src/server/integrations/swiggy";
process.env.DATA_DIR="memory://";
async function ready(){const fixture=fixtureService(),{id}=await fixture.service.createOwner();let view=await fixture.service.startSession(id,"live");view=await fixture.service.selectAddress(id,view.sessionId,"address-a");return {...fixture,id,view};}
test("the application rejects demo requests and migrates old sample sessions to live",async()=>{
  assert.equal(SessionRequestSchema.safeParse({mode:"demo"}).success,false);
  const f=fixtureService(),{id}=await f.service.createOwner();await write(id,"session","legacy-demo",{sessionId:"legacy-demo",mode:"demo"});const owner=await f.service.getOwner(id);await write(id,"owner",id,{...owner,sessionId:"legacy-demo"});
  const boot=await f.service.bootstrap(id);assert.equal(boot.mode,"live");assert.notEqual(boot.sessionId,"legacy-demo");const view=await f.service.getView(id,boot.sessionId!);assert.equal(view.products.length,0);assert.equal(view.cart.lines.length,0);
});
test("validated address-bound products retain provider identifiers for cart writes",async()=>{
  const f=await ready();let view=await rememberSearch(f.service,f.provider,f.id,f.view,"milk");
  assert.equal(view.products[0].id,milkId);assert.equal(view.products[0].priceMinor,10000);
  view=await f.service.updateCart(f.id,{sessionId:view.sessionId,productId:milkId,quantity:1,expectedCartRevision:view.cart.revision});assert.equal(view.cart.lines[0].quantity,1);assert.equal(f.account(f.id).writes,1);assert.equal(f.account(f.id).checkouts,0);
});
test("externally changed Swiggy carts are refreshed before rejecting stale writes",async()=>{
  const f=await ready();const view=await rememberSearch(f.service,f.provider,f.id,f.view,"milk");f.account(f.id).quantities.set("bread",2);
  await assert.rejects(f.service.updateCart(f.id,{sessionId:view.sessionId,productId:milkId,quantity:1,expectedCartRevision:view.cart.revision}),{code:"CART_CHANGED"});assert.equal(f.account(f.id).writes,0);
  const fresh=await f.service.getView(f.id,view.sessionId);assert.equal(fresh.cart.lines[0].product.name,"Fixture bread");assert.equal(fresh.cart.lines[0].quantity,2);
});
test("address and connection prerequisites block cart mutations",async()=>{
  const f=fixtureService(),{id}=await f.service.createOwner();const view=await f.service.startSession(id,"live");
  await assert.rejects(f.service.updateCart(id,{sessionId:view.sessionId,productId:milkId,quantity:1,expectedCartRevision:view.cart.revision}),{code:"ADDRESS_REQUIRED"});
  f.account(id).connected=false;await assert.rejects(f.service.updateCart(id,{sessionId:view.sessionId,productId:milkId,quantity:1,expectedCartRevision:view.cart.revision}),{code:"SWIGGY_NOT_CONNECTED"});assert.equal(f.account(id).writes,0);
});
test("an uncertain cart response is reconciled by reading, never replaying the edit",async()=>{
  const f=await ready();const view=await rememberSearch(f.service,f.provider,f.id,f.view,"milk");
  const service=createShoppingService({provider:owner=>{const p=f.provider(owner);return {...p,setCartQuantity:async input=>{await p.setCartQuantity(input);throw new Error("Fixture lost acknowledgment");}};}});
  await assert.rejects(service.updateCart(f.id,{sessionId:view.sessionId,productId:milkId,quantity:1,expectedCartRevision:view.cart.revision}));
  const recovered=await service.getView(f.id,view.sessionId);assert.equal(recovered.cart.lines[0].quantity,1);assert.equal(f.account(f.id).writes,1);assert.equal(f.account(f.id).checkouts,0);
});
test("payment-read failure leaves the authoritative bag readable with checkout unavailable",async()=>{
  const f=await ready();f.account(f.id).quantities.set("milk",1);
  const service=createShoppingService({provider:owner=>({...f.provider(owner),getPaymentOptions:async()=>{throw new Error("Fixture payment outage");}})});
  const view=await service.getView(f.id,f.view.sessionId);assert.equal(view.cart.lines[0].quantity,1);assert.deepEqual(view.payments,[]);assert.match(view.notice!,/Payment options could not be refreshed/);
});
test("starting an existing live session preserves the selected address and saved bag",async()=>{
  const f=await ready(),view=await f.service.startSession(f.id,"live");assert.equal(view.sessionId,f.view.sessionId);assert.equal(view.addressId,"address-a");
});
after(async()=>{await(await database()).close();});



test("changing delivery address cannot relabel a nonempty bag from another address",async()=>{
  const f=await ready();f.account(f.id).quantities.set("milk",1);
  const before=await read<Record<string,unknown>>(f.id,"session",f.view.sessionId);
  await write(f.id,"session",f.view.sessionId,{...before,addresses:[...f.view.addresses,{id:"address-b",label:"Other",reviewAddressText:"Other fixture address"}]});
  await assert.rejects(f.service.selectAddress(f.id,f.view.sessionId,"address-b"),{code:"CART_ADDRESS_CHANGED"});
  const current=await f.service.getView(f.id,f.view.sessionId);assert.equal(current.addressId,"address-a");assert.equal(current.cart.lines.length,1);
});






test("unavailable multi-quantity lines can be removed completely without adding stock",async()=>{
  const f=await ready();f.account(f.id).quantities.set("milk",2);
  const service=createShoppingService({provider:owner=>{
    const provider=f.provider(owner);
    const getCart=async()=>{const cart=await provider.getCart();cart.items.forEach(item=>{item.isInStockAndAvailable=false;item.maxQuantity=0;});return cart;};
    return {...provider,getCart,setCartQuantity:async input=>{
      assert.equal(input.quantity,0);assert.equal(input.skuId,"sku-milk");
      f.account(owner).writes++;f.account(owner).quantities.delete("milk");return getCart();
    }};
  }});
  let view=await service.getView(f.id,f.view.sessionId);
  assert.equal(view.cart.lines[0].quantity,2);assert.equal(view.cart.lines[0].product.available,false);
  await assert.rejects(service.updateCart(f.id,{sessionId:view.sessionId,productId:milkId,quantity:1,expectedCartRevision:view.cart.revision}),{code:"PRODUCT_UNAVAILABLE"});
  assert.equal(f.account(f.id).writes,0);
  view=await service.updateCart(f.id,{sessionId:view.sessionId,productId:milkId,quantity:0,expectedCartRevision:view.cart.revision});
  assert.deepEqual(view.cart.lines,[]);assert.equal(f.account(f.id).writes,1);assert.equal(f.account(f.id).checkouts,0);
});

test("current bag stock and quantity limits take precedence over earlier search results",async()=>{
  for(const available of [false,true]){
    const f=await ready();
    let view=await rememberSearch(f.service,f.provider,f.id,f.view,"milk");
    f.account(f.id).quantities.set("milk",1);
    const service=createShoppingService({provider:owner=>{
      const provider=f.provider(owner);
      return {...provider,setCartQuantity:async()=>{f.account(owner).writes++;throw new Error("A disallowed quantity was dispatched");},getCart:async()=>{
        const cart=await provider.getCart();
        cart.items.forEach(item=>{item.isInStockAndAvailable=available;item.maxQuantity=available?1:0;});
        return cart;
      }};
    }});
    view=await service.getView(f.id,view.sessionId);
    assert.equal(view.products[0].available,true,"The previous search still reports stock");
    assert.equal(view.cart.lines[0].product.maxQuantity,available?1:0);
    await assert.rejects(service.updateCart(f.id,{sessionId:view.sessionId,productId:milkId,quantity:2,expectedCartRevision:view.cart.revision}),{code:available?"QUANTITY_LIMIT":"PRODUCT_UNAVAILABLE"});
    assert.equal(f.account(f.id).writes,0);
  }
});

test("catalog quantity limits remain enforced when the bag omits its own limit",async()=>{
  const f=await ready();
  const serviceProvider=(owner:string)=>{
    const provider=f.provider(owner);
    return {...provider,searchProducts:async (args:Parameters<typeof provider.searchProducts>[0])=>{
      const results=await provider.searchProducts(args);
      results.products[0].variations[0].maxQuantity=2;
      return results;
    }};
  };
  const service=createShoppingService({provider:serviceProvider});
  let view=await rememberSearch(service,owner=>serviceProvider(owner),f.id,f.view,"milk");
  view=await service.updateCart(f.id,{sessionId:view.sessionId,productId:milkId,quantity:1,expectedCartRevision:view.cart.revision});
  assert.equal(view.cart.lines[0].product.maxQuantity,undefined);
  await assert.rejects(service.updateCart(f.id,{sessionId:view.sessionId,productId:milkId,quantity:3,expectedCartRevision:view.cart.revision}),{code:"QUANTITY_LIMIT"});
  assert.equal(f.account(f.id).writes,1);
});

test("a quantity limit changed since the last bag refresh blocks the stale edit",async()=>{
  const f=await ready();f.account(f.id).quantities.set("milk",1);
  let maxQuantity=3;
  const service=createShoppingService({provider:owner=>{
    const provider=f.provider(owner);
    return {...provider,getCart:async()=>{
      const cart=await provider.getCart();cart.items[0].maxQuantity=maxQuantity;return cart;
    }};
  }});
  const view=await service.getView(f.id,f.view.sessionId);
  assert.equal(view.cart.lines[0].product.maxQuantity,3);
  maxQuantity=1;
  await assert.rejects(service.updateCart(f.id,{sessionId:view.sessionId,productId:milkId,quantity:2,expectedCartRevision:view.cart.revision}),{code:"CART_CHANGED"});
  assert.equal(f.account(f.id).writes,0);
  const refreshed=await service.getView(f.id,view.sessionId);
  assert.equal(refreshed.cart.lines[0].product.maxQuantity,1);
  assert.equal(refreshed.cart.revision,view.cart.revision+1);
});

test("newly available search results can recover a bag with stale unavailable stock",async()=>{
  const f=await ready();f.account(f.id).quantities.set("milk",1);
  let available=false;
  const service=createShoppingService({provider:owner=>{
    const provider=f.provider(owner);
    return {...provider,getCart:async()=>{
      const cart=await provider.getCart();cart.items[0].isInStockAndAvailable=available;return cart;
    }};
  }});
  let view=await service.getView(f.id,f.view.sessionId);
  assert.equal(view.cart.lines[0].product.available,false);
  available=true;
  await service.rememberProducts(f.id,view.sessionId,"address-a",normalizeSwiggyProducts(await f.provider(f.id).searchProducts({addressId:"address-a",query:"milk"})));
  const stored=await read<{products:Array<{available:boolean}>}>(f.id,"session",view.sessionId);
  assert.equal(stored!.products[0].available,true);
  await assert.rejects(service.updateCart(f.id,{sessionId:view.sessionId,productId:milkId,quantity:2,expectedCartRevision:view.cart.revision}),{code:"CART_CHANGED"});
  assert.equal(f.account(f.id).writes,0);
  view=await service.getView(f.id,view.sessionId);
  view=await service.updateCart(f.id,{sessionId:view.sessionId,productId:milkId,quantity:2,expectedCartRevision:view.cart.revision});
  assert.equal(view.cart.lines[0].quantity,2);
  assert.equal(f.account(f.id).writes,1);
});
