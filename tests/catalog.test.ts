import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateCart,demoProducts,searchDemo } from "../src/server/catalog";
import { runTurn } from "../src/server/agent";

test("natural plural grocery searches return the matching product through the workflow",async()=>{
  for(const [query,expectedId]of [["bananas","demo-banana"],["tomatoes","demo-tomato"],["eggs","demo-eggs"]]){
    const result=await runTurn({text:`Find ${query}`,mode:"demo",history:[],products:demoProducts,cart:calculateCart([],0)},{search:async term=>searchDemo(term),setQuantity:async()=>{throw new Error("Search must not mutate the cart");},record:async()=>{}});
    assert.deepEqual(result.products.map(p=>p.id),[expectedId]);
    assert.equal(result.cart.lines.length,0);
  }
});
