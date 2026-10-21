// Offline, in-memory microbenchmark. Never loads .env.local or calls providers.
process.env.DATA_DIR = 'memory://';
delete process.env.GROQ_API_KEY;
const { performance } = await import('node:perf_hooks');
const {fixtureService,milkId}=await import('../tests/helpers/live-provider.ts');
const {createOwner,startSession,getView,updateCart,conversation,selectAddress}=fixtureService().service;
const { database } = await import('../src/server/store.ts');
const samples = {};
async function measure(name, count, fn) {
  const values=[];
  for(let i=0;i<count;i++){const start=performance.now();await fn(i);values.push(performance.now()-start);}
  values.sort((a,b)=>a-b);
  samples[name]={samples:count,medianMs:Number(values[Math.floor(values.length/2)].toFixed(2)),p95Ms:Number(values[Math.min(values.length-1,Math.ceil(values.length*.95)-1)].toFixed(2))};
}
try {
  const cold=performance.now(),{id}=await createOwner();let view=await startSession(id,'live');view=await selectAddress(id,view.sessionId,'address-a');view=await conversation(id,{sessionId:view.sessionId,text:'find milk',expectedTurnVersion:view.turnVersion,expectedCartRevision:view.cart.revision});
  const coldStartMs=Number((performance.now()-cold).toFixed(2));
  await measure('readSession',100,async()=>{view=await getView(id,view.sessionId);});
  await measure('cartEdit',30,async i=>{view=await updateCart(id,{sessionId:view.sessionId,productId:milkId,quantity:i%2+1,expectedCartRevision:view.cart.revision});});
  await measure('offlineTurn',20,async()=>{view=await conversation(id,{sessionId:view.sessionId,text:'find milk',expectedTurnVersion:view.turnVersion,expectedCartRevision:view.cart.revision});});
  console.log(JSON.stringify({environment:'Node local, PGlite in-memory, isolated fixture transport; not speech/network latency',coldStartMs,...samples},null,2));
} finally { await (await database()).close(); }
