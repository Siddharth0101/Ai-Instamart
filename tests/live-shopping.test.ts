import { after, test } from "node:test";
import assert from "node:assert/strict";
import { fixtureService, milkId } from "./helpers/live-provider";
import { SessionRequestSchema } from "../src/lib/contracts";
import { database, write, read } from "../src/server/store";
import { createShoppingService } from "../src/server/shopping";
import { runTurn } from "../src/server/agent";
process.env.DATA_DIR="memory://";
async function ready(){const fixture=fixtureService(),{id}=await fixture.service.createOwner();let view=await fixture.service.startSession(id,"live");view=await fixture.service.selectAddress(id,view.sessionId,"address-a");return {...fixture,id,view};}
test("the application rejects demo requests and migrates old sample sessions to live",async()=>{
  assert.equal(SessionRequestSchema.safeParse({mode:"demo"}).success,false);
  const f=fixtureService(),{id}=await f.service.createOwner();await write(id,"session","legacy-demo",{sessionId:"legacy-demo",mode:"demo"});const owner=await f.service.getOwner(id);await write(id,"owner",id,{...owner,sessionId:"legacy-demo"});
  const boot=await f.service.bootstrap(id);assert.equal(boot.mode,"live");assert.notEqual(boot.sessionId,"legacy-demo");const view=await f.service.getView(id,boot.sessionId!);assert.equal(view.products.length,0);assert.equal(view.cart.lines.length,0);
});
test("live search uses selected-address MCP products and cart writes use returned identifiers",async()=>{
  const f=await ready();let view=await f.service.conversation(f.id,{sessionId:f.view.sessionId,text:"find milk",expectedTurnVersion:f.view.turnVersion,expectedCartRevision:f.view.cart.revision});
  assert.equal(view.products[0].id,milkId);assert.equal(view.products[0].priceMinor,10000);
  view=await f.service.updateCart(f.id,{sessionId:view.sessionId,productId:milkId,quantity:1,expectedCartRevision:view.cart.revision});assert.equal(view.cart.lines[0].quantity,1);assert.equal(f.account(f.id).writes,1);assert.equal(f.account(f.id).checkouts,0);
});
test("externally changed Swiggy carts are refreshed before rejecting stale writes",async()=>{
  const f=await ready();const view=await f.service.conversation(f.id,{sessionId:f.view.sessionId,text:"find milk",expectedTurnVersion:f.view.turnVersion,expectedCartRevision:f.view.cart.revision});f.account(f.id).quantities.set("bread",2);
  await assert.rejects(f.service.updateCart(f.id,{sessionId:view.sessionId,productId:milkId,quantity:1,expectedCartRevision:view.cart.revision}),{code:"CART_CHANGED"});assert.equal(f.account(f.id).writes,0);
  const fresh=await f.service.getView(f.id,view.sessionId);assert.equal(fresh.cart.lines[0].product.name,"Fixture bread");assert.equal(fresh.cart.lines[0].quantity,2);
});
test("address and connection prerequisites block shopping before model or mutations",async()=>{
  const f=fixtureService(),{id}=await f.service.createOwner();const view=await f.service.startSession(id,"live");
  await assert.rejects(f.service.conversation(id,{sessionId:view.sessionId,text:"find milk",expectedTurnVersion:0,expectedCartRevision:view.cart.revision}),{code:"ADDRESS_REQUIRED"});
  f.account(id).connected=false;await assert.rejects(f.service.conversation(id,{sessionId:view.sessionId,text:"find milk",expectedTurnVersion:0,expectedCartRevision:view.cart.revision}),{code:"SWIGGY_NOT_CONNECTED"});assert.equal(f.account(id).writes,0);
});
test("stopping an in-flight live turn prevents a later provider write",async()=>{
  const f=await ready();let resolveStarted!:()=>void,release!:()=>void;const started=new Promise<void>(r=>resolveStarted=r),waiting=new Promise<void>(r=>release=r);
  const service=createShoppingService({provider:f.provider,runTurn:async(input,deps)=>{resolveStarted();await waiting;await deps.setQuantity(milkId,1);throw new Error("Unexpected late write");}});
  const before=await read<Record<string,unknown>>(f.id,"session",f.view.sessionId);await write(f.id,"session",f.view.sessionId,{...before,products:[{id:milkId,name:"Fixture milk",brand:"Fixture",unit:"500 ml",priceMinor:10000,currency:"INR",available:true}]});
  const turn=service.conversation(f.id,{sessionId:f.view.sessionId,text:"add milk",expectedTurnVersion:f.view.turnVersion,expectedCartRevision:f.view.cart.revision});await started;await service.stopTurn(f.id,f.view.sessionId,f.view.turnVersion);release();await turn;assert.equal(f.account(f.id).writes,0);
});
test("an uncertain cart response is reconciled by reading, never replaying the edit",async()=>{
  const f=await ready();const view=await f.service.conversation(f.id,{sessionId:f.view.sessionId,text:"find milk",expectedTurnVersion:f.view.turnVersion,expectedCartRevision:f.view.cart.revision});
  const service=createShoppingService({provider:owner=>{const p=f.provider(owner);return {...p,setCartQuantity:async input=>{await p.setCartQuantity(input);throw new Error("Fixture lost acknowledgment");}};}});
  await assert.rejects(service.updateCart(f.id,{sessionId:view.sessionId,productId:milkId,quantity:1,expectedCartRevision:view.cart.revision}));
  const recovered=await service.getView(f.id,view.sessionId);assert.equal(recovered.cart.lines[0].quantity,1);assert.equal(f.account(f.id).writes,1);assert.equal(f.account(f.id).checkouts,0);
});
test("payment-read failure leaves the authoritative bag readable with checkout unavailable",async()=>{
  const f=await ready();f.account(f.id).quantities.set("milk",1);
  const service=createShoppingService({provider:owner=>({...f.provider(owner),getPaymentOptions:async()=>{throw new Error("Fixture payment outage");}})});
  const view=await service.getView(f.id,f.view.sessionId);assert.equal(view.cart.lines[0].quantity,1);assert.deepEqual(view.payments,[]);assert.match(view.notice!,/Payment options could not be refreshed/);
});
test("starting an existing live session preserves the selected address and conversation",async()=>{
  const f=await ready(),view=await f.service.startSession(f.id,"live");assert.equal(view.sessionId,f.view.sessionId);assert.equal(view.addressId,"address-a");
});
after(async()=>{await(await database()).close();});

test("direct search covers electronics without a model call and paginates using the saved provider cursor",async()=>{
  const f=await ready();const calls:number[]=[];
  const service=createShoppingService({provider:owner=>({...f.provider(owner),searchProducts:async args=>{
    assert.equal(args.addressId,"address-a");assert.equal(args.query,"headphones");calls.push(args.offset??0);
    const page=await f.provider(owner).searchProducts({addressId:args.addressId,query:"milk"});
    const product=page.products[0];product.displayName="Wireless headphones";product.variations[0].displayName="Wireless headphones";
    product.variations[0].skuId=args.offset?"second-headphones":"first-headphones";
    product.variations[0].maxQuantity=2;
    return {...page,nextOffset:args.offset?"":"20"};
  }}),runTurn:async()=>{throw new Error("Direct search must not use Groq");}});
  const input={sessionId:f.view.sessionId,query:"headphones",expectedTurnVersion:f.view.turnVersion,expectedCartRevision:f.view.cart.revision};
  let view=await service.searchCatalog(f.id,input);assert.equal(view.products[0].name,"Wireless headphones");assert.equal(view.search?.hasMore,true);assert.equal(view.usage.totalTokens,0);assert.ok(!("searchOffset" in view));
  await assert.rejects(service.searchCatalog(f.id,{...input,query:"soap",loadMore:true,expectedTurnVersion:view.turnVersion}),{code:"SEARCH_CHANGED"});
  view=await service.searchCatalog(f.id,{...input,loadMore:true,expectedTurnVersion:view.turnVersion});assert.equal(view.products.length,2);assert.equal(view.search?.hasMore,false);assert.deepEqual(calls,[0,20]);
  await assert.rejects(service.updateCart(f.id,{sessionId:view.sessionId,productId:view.products[0].id,quantity:3,expectedCartRevision:view.cart.revision}),{code:"QUANTITY_LIMIT"});
  assert.equal(f.account(f.id).writes,0);assert.equal(f.account(f.id).checkouts,0);
});

test("stopped direct search discards late provider results",async()=>{
  const f=await ready();let started!:()=>void,release!:()=>void;const waiting=new Promise<void>(r=>release=r),begin=new Promise<void>(r=>started=r);
  const service=createShoppingService({provider:owner=>({...f.provider(owner),searchProducts:async args=>{started();await waiting;return f.provider(owner).searchProducts(args);}})});
  const request=service.searchCatalog(f.id,{sessionId:f.view.sessionId,query:"milk",expectedTurnVersion:f.view.turnVersion,expectedCartRevision:f.view.cart.revision});
  await begin;await service.stopTurn(f.id,f.view.sessionId,f.view.turnVersion);release();const view=await request;assert.deepEqual(view.products,[]);assert.equal(view.search,undefined);
});

test("changing delivery address cannot relabel a nonempty bag from another address",async()=>{
  const f=await ready();f.account(f.id).quantities.set("milk",1);
  const before=await read<Record<string,unknown>>(f.id,"session",f.view.sessionId);
  await write(f.id,"session",f.view.sessionId,{...before,addresses:[...f.view.addresses,{id:"address-b",label:"Other",reviewAddressText:"Other fixture address"}]});
  await assert.rejects(f.service.selectAddress(f.id,f.view.sessionId,"address-b"),{code:"CART_ADDRESS_CHANGED"});
  const current=await f.service.getView(f.id,f.view.sessionId);assert.equal(current.addressId,"address-a");assert.equal(current.cart.lines.length,1);
});

test("direct search stops repeated, backwards, and unsafe provider cursors",async()=>{
  for(const nextOffset of ["20","19","-1","not-a-cursor","9007199254740992","40"]){
    const f=await ready(),calls:number[]=[];
    const service=createShoppingService({provider:owner=>({...f.provider(owner),searchProducts:async args=>{
      calls.push(args.offset??0);
      const page=await f.provider(owner).searchProducts({addressId:args.addressId,query:"milk"});
      page.nextOffset=args.offset===undefined?"20":nextOffset;
      return page;
    }})});
    let view=await service.searchCatalog(f.id,{sessionId:f.view.sessionId,query:"milk",expectedTurnVersion:f.view.turnVersion,expectedCartRevision:f.view.cart.revision});
    view=await service.searchCatalog(f.id,{sessionId:view.sessionId,query:"milk",loadMore:true,expectedTurnVersion:view.turnVersion,expectedCartRevision:view.cart.revision});
    assert.equal(view.search?.hasMore,false,`Unexpected cursor accepted: ${nextOffset}`);
    assert.equal(view.products.length,1,"Repeated variants must not accumulate");
    await assert.rejects(service.searchCatalog(f.id,{sessionId:view.sessionId,query:"milk",loadMore:true,expectedTurnVersion:view.turnVersion,expectedCartRevision:view.cart.revision}),{code:"SEARCH_CHANGED"});
    assert.deepEqual(calls,[0,20]);
  }
});

test("broad direct searches stop fetching at 500 variants without offering an extra page",async()=>{
  for(const count of [500,501]){
  const f=await ready();let calls=0;
  const service=createShoppingService({provider:owner=>({...f.provider(owner),searchProducts:async args=>{
    calls++;const page=await f.provider(owner).searchProducts({addressId:args.addressId,query:"milk"});
    const template=page.products[0].variations[0];
    page.products[0].variations=Array.from({length:count},(_,index)=>({...template,skuId:`sku-${index}`,spinId:`spin-${index}`}));
    page.nextOffset="20";return page;
  }})});
  const view=await service.searchCatalog(f.id,{sessionId:f.view.sessionId,query:"milk",expectedTurnVersion:f.view.turnVersion,expectedCartRevision:f.view.cart.revision});
  assert.equal(view.products.length,500);assert.equal(view.search?.hasMore,false);assert.equal(calls,1);
  await assert.rejects(service.searchCatalog(f.id,{sessionId:view.sessionId,query:"milk",loadMore:true,expectedTurnVersion:view.turnVersion,expectedCartRevision:view.cart.revision}),{code:"SEARCH_CHANGED"});
  assert.equal(calls,1);
  }
});

test("changing an empty bag's address invalidates prior catalog results and cursor",async()=>{
  const f=await ready();const seenAddresses:string[]=[];
  const service=createShoppingService({provider:owner=>({...f.provider(owner),searchProducts:async args=>{
    seenAddresses.push(args.addressId);const page=await f.provider(owner).searchProducts({addressId:args.addressId,query:"milk"});page.nextOffset="20";return page;
  }})});
  let view=await service.searchCatalog(f.id,{sessionId:f.view.sessionId,query:"milk",expectedTurnVersion:f.view.turnVersion,expectedCartRevision:f.view.cart.revision});
  const stored=await read<Record<string,unknown>>(f.id,"session",view.sessionId);
  await write(f.id,"session",view.sessionId,{...stored,addresses:[...view.addresses,{id:"address-b",label:"Other",reviewAddressText:"Other fixture address"}]});
  const priorRevision=view.cart.revision;
  view=await service.selectAddress(f.id,view.sessionId,"address-b");
  assert.equal(view.addressId,"address-b");assert.deepEqual(view.products,[]);assert.equal(view.search,undefined);assert.ok(view.cart.revision>priorRevision);
  await assert.rejects(service.searchCatalog(f.id,{sessionId:view.sessionId,query:"milk",loadMore:true,expectedTurnVersion:view.turnVersion,expectedCartRevision:view.cart.revision}),{code:"SEARCH_CHANGED"});
  await assert.rejects(service.updateCart(f.id,{sessionId:view.sessionId,productId:milkId,quantity:1,expectedCartRevision:view.cart.revision}),{code:"PRODUCT_UNAVAILABLE"});
  view=await service.searchCatalog(f.id,{sessionId:view.sessionId,query:"milk",expectedTurnVersion:view.turnVersion,expectedCartRevision:view.cart.revision});
  assert.equal(view.products[0].id,milkId);assert.deepEqual(seenAddresses,["address-a","address-b"]);assert.equal(f.account(f.id).writes,0);
});

test("assistant search preserves a private provider cursor for direct Load more",async()=>{
  const f=await ready(),calls:number[]=[];
  const service=createShoppingService({provider:owner=>({...f.provider(owner),searchProducts:async args=>{
    assert.equal(args.addressId,"address-a");calls.push(args.offset??0);
    const page=await f.provider(owner).searchProducts(args);
    page.nextOffset=args.offset?"":"20";
    if(args.offset)page.products[0].variations[0].skuId="sku-second-page";
    return page;
  }}),runTurn:(input,deps)=>runTurn({...input,mode:"demo"},deps)});
  let view=await service.conversation(f.id,{sessionId:f.view.sessionId,text:"find milk",expectedTurnVersion:f.view.turnVersion,expectedCartRevision:f.view.cart.revision});
  assert.deepEqual(view.search,{query:"milk",hasMore:true});assert.equal("searchOffset" in view,false);
  view=await service.searchCatalog(f.id,{sessionId:view.sessionId,query:view.search!.query,loadMore:true,expectedTurnVersion:view.turnVersion,expectedCartRevision:view.cart.revision});
  assert.equal(view.products.length,2);assert.equal(view.search?.hasMore,false);assert.deepEqual(calls,[0,20]);
});

test("assistant search caps broad provider results and rejects unsafe first-page cursors",async()=>{
  for(const [count,nextOffset] of [[501,"20"],[1,"0"],[1,"9007199254740992"],[1,"invalid"]] as const){
    const f=await ready();
    const service=createShoppingService({provider:owner=>({...f.provider(owner),searchProducts:async args=>{
      const page=await f.provider(owner).searchProducts(args),template=page.products[0].variations[0];
      page.products[0].variations=Array.from({length:count},(_,index)=>({...template,skuId:`sku-${index}`,spinId:`spin-${index}`}));
      page.nextOffset=nextOffset;return page;
    }}),runTurn:(input,deps)=>runTurn({...input,mode:"demo"},deps)});
    const view=await service.conversation(f.id,{sessionId:f.view.sessionId,text:"find milk",expectedTurnVersion:f.view.turnVersion,expectedCartRevision:f.view.cart.revision});
    assert.equal(view.products.length,Math.min(500,count));assert.equal(view.search?.hasMore,false);assert.equal("searchOffset" in view,false);
  }
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
    let view=await f.service.searchCatalog(f.id,{sessionId:f.view.sessionId,query:"milk",expectedTurnVersion:f.view.turnVersion,expectedCartRevision:f.view.cart.revision});
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
  const service=createShoppingService({provider:owner=>{
    const provider=f.provider(owner);
    return {...provider,searchProducts:async args=>{
      const results=await provider.searchProducts(args);
      results.products[0].variations[0].maxQuantity=2;
      return results;
    }};
  }});
  let view=await service.searchCatalog(f.id,{sessionId:f.view.sessionId,query:"milk",expectedTurnVersion:f.view.turnVersion,expectedCartRevision:f.view.cart.revision});
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
  view=await service.searchCatalog(f.id,{sessionId:view.sessionId,query:"milk",expectedTurnVersion:view.turnVersion,expectedCartRevision:view.cart.revision});
  assert.equal(view.products[0].available,true);
  await assert.rejects(service.updateCart(f.id,{sessionId:view.sessionId,productId:milkId,quantity:2,expectedCartRevision:view.cart.revision}),{code:"CART_CHANGED"});
  assert.equal(f.account(f.id).writes,0);
  view=await service.getView(f.id,view.sessionId);
  view=await service.updateCart(f.id,{sessionId:view.sessionId,productId:milkId,quantity:2,expectedCartRevision:view.cart.revision});
  assert.equal(view.cart.lines[0].quantity,2);
  assert.equal(f.account(f.id).writes,1);
});
