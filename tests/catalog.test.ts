import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateCart,searchDemo } from "../src/server/catalog";

test("synthetic catalog fixtures normalize natural plural grocery searches",()=>{
  for(const [query,expectedId]of [["bananas","demo-banana"],["tomatoes","demo-tomato"],["eggs","demo-eggs"]]){
    assert.deepEqual(searchDemo(`Find ${query}`).map(p=>p.id),[expectedId]);
  }
});
test("synthetic cart fixtures calculate quantities and the delivery threshold",()=>{
  const product=searchDemo("milk")[0];
  assert.equal(calculateCart([],0).totals.totalMinor,0);
  assert.equal(calculateCart([{product,quantity:2}],1).totals.totalMinor,8300);
  assert.equal(calculateCart([{product,quantity:11}],2).totals.feesMinor,0);
});
