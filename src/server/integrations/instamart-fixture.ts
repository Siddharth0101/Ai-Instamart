import type { ShoppingProvider } from "../shopping";
import { swiggyCartFingerprint } from "./swiggy";
import type { SwiggyCart } from "./swiggy-schemas";

/**
 * Development-only Instamart: a small synthetic store with a live bag, fees and checkout, so grocery voice
 * flows can be tried and tested without an account. Nothing here reaches Swiggy or places a real order.
 */
type Product = { key: string; name: string; brand: string; pack: string; rupees: number; tags: string };
const products: Product[] = [
  { key: "lays-classic", name: "Lay's Classic Salted Chips", brand: "Lay's", pack: "52 g", rupees: 20, tags: "chips crisps snacks namkeen salty" },
  { key: "lays-magic", name: "Lay's India's Magic Masala Chips", brand: "Lay's", pack: "52 g", rupees: 20, tags: "chips crisps snacks masala" },
  { key: "mad-angles", name: "Bingo Mad Angles Achaari Masti", brand: "Bingo", pack: "66 g", rupees: 20, tags: "chips crisps snacks" },
  { key: "pringles", name: "Pringles Original", brand: "Pringles", pack: "107 g", rupees: 110, tags: "chips crisps snacks" },
  { key: "coke", name: "Coca-Cola Soft Drink", brand: "Coca-Cola", pack: "750 ml", rupees: 40, tags: "cold drink drinks soda coke beverage" },
  { key: "thums-up", name: "Thums Up Soft Drink", brand: "Thums Up", pack: "750 ml", rupees: 40, tags: "cold drink drinks soda beverage" },
  { key: "sprite", name: "Sprite Lemon Soft Drink", brand: "Sprite", pack: "750 ml", rupees: 40, tags: "cold drink drinks soda lemon beverage" },
  { key: "aamras", name: "Paper Boat Aamras", brand: "Paper Boat", pack: "600 ml", rupees: 60, tags: "drinks juice mango beverage" },
  { key: "red-bull", name: "Red Bull Energy Drink", brand: "Red Bull", pack: "250 ml", rupees: 125, tags: "drinks energy beverage" },
  { key: "parle-g", name: "Parle-G Gold Biscuits", brand: "Parle", pack: "250 g", rupees: 25, tags: "biscuits cookies snacks" },
  { key: "oreo", name: "Oreo Vanilla Creme Biscuits", brand: "Cadbury", pack: "120 g", rupees: 35, tags: "biscuits cookies snacks sweet" },
  { key: "good-day", name: "Good Day Cashew Cookies", brand: "Britannia", pack: "200 g", rupees: 40, tags: "biscuits cookies snacks" },
  { key: "silk", name: "Cadbury Dairy Milk Silk", brand: "Cadbury", pack: "60 g", rupees: 80, tags: "chocolate chocolates sweet" },
  { key: "kitkat", name: "Nestle KitKat 4 Finger", brand: "Nestle", pack: "37 g", rupees: 30, tags: "chocolate chocolates sweet" },
  { key: "milk", name: "Amul Taaza Toned Milk", brand: "Amul", pack: "500 ml", rupees: 28, tags: "milk doodh dairy" },
  { key: "butter", name: "Amul Salted Butter", brand: "Amul", pack: "100 g", rupees: 58, tags: "butter makhan dairy" },
  { key: "curd", name: "Mother Dairy Classic Curd", brand: "Mother Dairy", pack: "400 g", rupees: 45, tags: "curd dahi dairy" },
  { key: "bread", name: "Britannia Whole Wheat Bread", brand: "Britannia", pack: "400 g", rupees: 45, tags: "bread bakery breakfast" },
  { key: "eggs", name: "Farm Fresh White Eggs", brand: "Eggoz", pack: "6 pieces", rupees: 54, tags: "eggs anda breakfast" },
  { key: "bhujia", name: "Haldiram's Aloo Bhujia", brand: "Haldiram's", pack: "200 g", rupees: 55, tags: "namkeen bhujia snacks" },
  { key: "moong-dal", name: "Haldiram's Moong Dal", brand: "Haldiram's", pack: "200 g", rupees: 50, tags: "namkeen snacks" },
  { key: "ice-cream", name: "Amul Vanilla Magic Ice Cream Tub", brand: "Amul", pack: "1 L", rupees: 180, tags: "ice cream icecream dessert sweet" },
  { key: "cornetto", name: "Kwality Wall's Cornetto Double Chocolate", brand: "Kwality Wall's", pack: "105 ml", rupees: 40, tags: "ice cream icecream dessert chocolate" },
  { key: "banana", name: "Robusta Banana", brand: "Fresh", pack: "6 pieces", rupees: 48, tags: "banana kela fruit fruits" },
  { key: "onion", name: "Onion", brand: "Fresh", pack: "1 kg", rupees: 42, tags: "onion pyaz vegetable vegetables fresh" },
  { key: "tomato", name: "Tomato Hybrid", brand: "Fresh", pack: "500 g", rupees: 28, tags: "tomato tamatar vegetable vegetables fresh" },
  { key: "potato", name: "Potato", brand: "Fresh", pack: "1 kg", rupees: 36, tags: "potato aloo vegetable vegetables fresh" },
  { key: "atta", name: "Aashirvaad Whole Wheat Atta", brand: "Aashirvaad", pack: "5 kg", rupees: 265, tags: "atta flour wheat staples" },
  { key: "rice", name: "India Gate Basmati Rice", brand: "India Gate", pack: "1 kg", rupees: 145, tags: "rice chawal basmati staples" },
  { key: "dal", name: "Tata Sampann Toor Dal", brand: "Tata Sampann", pack: "1 kg", rupees: 189, tags: "dal toor lentils staples" },
  { key: "tea", name: "Tata Tea Gold", brand: "Tata Tea", pack: "250 g", rupees: 155, tags: "tea chai beverage" },
  { key: "coffee", name: "Nescafe Classic Instant Coffee", brand: "Nescafe", pack: "50 g", rupees: 185, tags: "coffee beverage instant" },
  { key: "garam-masala", name: "Everest Garam Masala", brand: "Everest", pack: "100 g", rupees: 82, tags: "masala spices garam" },
  { key: "oil", name: "Fortune Sunflower Oil", brand: "Fortune", pack: "1 L", rupees: 159, tags: "oil cooking sunflower masala" },
  { key: "maggi", name: "Maggi 2-Minute Masala Noodles", brand: "Maggi", pack: "4 x 70 g", rupees: 56, tags: "noodles maggi instant food" },
  { key: "detergent", name: "Surf Excel Easy Wash Detergent", brand: "Surf Excel", pack: "1 kg", rupees: 135, tags: "detergent washing cleaning" },
  { key: "dishwash", name: "Vim Dishwash Liquid Gel", brand: "Vim", pack: "500 ml", rupees: 110, tags: "dishwash cleaning utensils" },
  { key: "shampoo", name: "Clinic Plus Strong & Long Shampoo", brand: "Clinic Plus", pack: "355 ml", rupees: 215, tags: "shampoo hair personal care" },
  { key: "soap", name: "Dove Cream Beauty Bathing Bar", brand: "Dove", pack: "3 x 100 g", rupees: 199, tags: "soap bath personal care" },
  { key: "apple", name: "Shimla Apple", brand: "Fresh", pack: "4 pieces", rupees: 160, tags: "apple seb fruit fruits" },
];
const sku = (key: string) => `im-sku-${key}`, spin = (key: string) => `im-spin-${key}`;
const addresses = [
  { id: "im-home", addressLine: "12, 4th Cross, Koramangala, Bengaluru", phoneNumber: "0000000000", addressTag: "Home" },
  { id: "im-work", addressLine: "Embassy Tech Village, Bellandur, Bengaluru", phoneNumber: "0000000000", addressTag: "Work" },
];
const globals = globalThis as typeof globalThis & { saycartInstamartFixture?: Map<string, { addressId: string | null; quantities: Map<string, number>; orders: number }> };
const accounts = globals.saycartInstamartFixture ??= new Map();
const account = (owner: string) => { let value = accounts.get(owner); if (!value) accounts.set(owner, value = { addressId: null, quantities: new Map(), orders: 0 }); return value; };
const rupees = (value: number) => `₹${value.toFixed(2)}`;

function cart(owner: string): SwiggyCart {
  const current = account(owner);
  const items = [...current.quantities].filter(([, quantity]) => quantity > 0).map(([key, quantity]) => {
    const product = products.find(entry => entry.key === key)!;
    return { skuId: sku(key), spinId: spin(key), productId: `im-product-${key}`, itemName: product.name, itemVariant: product.pack, quantity, isInStockAndAvailable: true, mrp: product.rupees, discountedFinalPrice: product.rupees, maxQuantity: 10 };
  });
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.discountedFinalPrice, 0);
  const handling = items.length ? 9 : 0, delivery = items.length && subtotal < 199 ? 25 : 0, total = subtotal + handling + delivery;
  return {
    ...(current.addressId ? { selectedAddress: current.addressId } : {}), cartTotalAmount: rupees(total), items,
    billBreakdown: { lineItems: [{ label: "Item total", value: rupees(subtotal) }, ...(handling ? [{ label: "Handling fee", value: rupees(handling) }] : []), ...(delivery ? [{ label: "Delivery fee", value: rupees(delivery) }] : [])], toPay: { label: "To pay", value: rupees(total) } },
  };
}
/** How well a product fits a spoken grocery request: 2 when its kind matches (milk → toned milk), 1 for a name or brand only (milk → Dairy Milk), 0 for none. */
function relevance(product: Product, query: string) {
  const words = query.toLowerCase().replace(/cold\s*drinks?/g, "cold drink").split(/[^a-z]+/).filter(word => word.length >= 3 && !["the", "and", "some", "get", "want", "show", "pack", "packs"].includes(word)).map(word => word.replace(/s$/, ""));
  if (!words.length) return 0;
  if ((query.includes("cold drink") && product.tags.includes("cold drink")) || words.some(word => product.tags.includes(word))) return 2;
  return words.some(word => `${product.name} ${product.brand}`.toLowerCase().includes(word)) ? 1 : 0;
}
const search = (query: string) => products.map(product => ({ product, score: relevance(product, query) })).filter(entry => entry.score > 0).sort((a, b) => b.score - a.score).map(entry => entry.product);

export function instamartFixture(owner: string): ShoppingProvider {
  return {
    readiness: async () => ({ connected: true, mappingVerified: true, reason: "Development Instamart store" }),
    close: async () => {},
    getAddresses: async () => ({ addresses, pagination: { page: 1, pageSize: 10, total: addresses.length, totalPages: 1, hasMore: false }, resolution: { defaultAddressId: "im-home", resolutionSource: "ranked_saved_address", needsUserClarification: false, candidateAddressIds: addresses.map(address => address.id) } }),
    searchProducts: async ({ query }) => ({ nextOffset: "", products: search(query).map(product => ({
      displayName: product.name, brand: product.brand, inStock: true, isAvail: true, productId: `im-product-${product.key}`, parentProductId: `im-parent-${product.key}`,
      variations: [{ skuId: sku(product.key), spinId: spin(product.key), displayName: product.name, brandName: product.brand, quantityDescription: product.pack, price: { mrp: product.rupees, offerPrice: product.rupees }, isInStockAndAvailable: true, maxQuantity: 10 }],
    })) }),
    getCart: async () => structuredClone(cart(owner)),
    getPaymentOptions: async () => ({ allMethods: [{ id: "Cash", displayName: "Cash on delivery", enabled: true }, { id: "SWIGGY_MONEY", displayName: "Swiggy Money", enabled: true }], cod: { id: "Cash", displayName: "Cash on delivery", available: true }, swiggyMoney: { id: "SWIGGY_MONEY", displayName: "Swiggy Money", available: true }, placeOrderToolName: "checkout" }),
    setCartQuantity: async input => {
      if (swiggyCartFingerprint(cart(owner)) !== input.expectedFingerprint) throw new Error("CART_CHANGED");
      const current = account(owner), key = input.skuId.replace(/^im-sku-/, "");
      if (!products.some(product => product.key === key)) throw new Error("Unknown fixture product");
      if (input.quantity) current.quantities.set(key, input.quantity); else current.quantities.delete(key);
      current.addressId = input.addressId;
      return cart(owner);
    },
    checkout: async () => {
      const current = account(owner);
      if (![...current.quantities.values()].some(quantity => quantity > 0)) return { state: "failed", message: "Your Instamart bag is empty.", results: [] };
      current.orders++; current.quantities.clear();
      const orderId = `IM${Date.now().toString().slice(-7)}`;
      return { state: "complete", message: "Instamart order placed. Arriving in about 12 minutes.", results: [{ orderId, state: "complete", message: "Development store" }] };
    },
  };
}
