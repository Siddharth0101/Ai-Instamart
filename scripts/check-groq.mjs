// One real Groq request with synthetic groceries. No Swiggy calls or purchases.
// Run: node --env-file=.env.local --import tsx scripts/check-groq.mjs
import { runTurn } from '../src/server/agent.ts';
import { calculateCart, demoProducts, searchDemo } from '../src/server/catalog.ts';

if (!process.env.GROQ_API_KEY) {
  console.error('Groq key is missing. Configure GROQ_API_KEY in .env.local.');
  process.exitCode = 1;
} else {
  const originalFetch = globalThis.fetch;
  let providerStatus = null;
  let observedUsage = null;
  globalThis.fetch = async (...args) => {
    const response = await originalFetch(...args);
    providerStatus = response.status;
    return response;
  };
  try {
    const result = await runTurn({
      text: 'Find bananas', mode: 'live', history: [],
      products: demoProducts, cart: calculateCart([], 0),
    }, {
      search: async query => searchDemo(query),
      setQuantity: async () => { throw new Error('Connection check cannot change a cart.'); },
      record: async () => {},
      recordUsage: async usage => { observedUsage = usage; },
    });
    if (result.intent.action !== 'search' || !result.products.some(p => p.id === 'demo-banana')) {
      throw new Error('Unexpected connection-check intent.');
    }
    console.log(JSON.stringify({
      ok: true, model: result.usage.model, structuredOutputValidated: true,
      action: result.intent.action, matchedProducts: result.products.length,
      usage: result.usage,
    }, null, 2));
  } catch (error) {
    const reasons = {
      400: 'Groq rejected the model parameters or structured-output schema.',
      401: 'Groq rejected the key. It may be invalid or revoked.',
      403: 'This account does not have access to the requested service or model.',
      404: 'The configured model or endpoint was not found.',
      429: 'The account is currently rate limited.',
    };
    console.error(JSON.stringify({ ok: false, providerStatus,
      code: typeof error?.code === 'string' ? error.code : 'CHECK_INCOMPLETE',
      usage: observedUsage,
      message: reasons[providerStatus] || 'The Groq check did not complete. No cart or order was changed.' }));
    process.exitCode = 1;
  } finally {
    globalThis.fetch = originalFetch;
  }
}
