import type { AssistantView, MealOffer } from "./assistant-contracts";

/** One cart line the assistant changed, with what it was before, so the change can be shown and undone. */
export type CartChange = { offer: MealOffer; before: number; after: number; inMenu: boolean };

function quantities(view: AssistantView | null) {
  const result = new Map<string, { offer: MealOffer; quantity: number }>();
  for (const item of view?.task.items ?? []) {
    const offer = view!.offers.find(entry => entry.id === item.selectedOfferId);
    if (offer) result.set(offer.id, { offer, quantity: (result.get(offer.id)?.quantity ?? 0) + item.quantity });
  }
  return result;
}

export function cartChanges(before: AssistantView | null, after: AssistantView): CartChange[] {
  const was = quantities(before), now = quantities(after);
  const menu = new Set(after.restaurantBrowser?.menu?.sections.flatMap(section => section.items.map(item => item.id)) ?? []);
  return [...new Set([...was.keys(), ...now.keys()])].flatMap(id => {
    const old = was.get(id)?.quantity ?? 0, current = now.get(id)?.quantity ?? 0, offer = now.get(id)?.offer ?? was.get(id)!.offer;
    return old === current ? [] : [{ offer, before: old, after: current, inMenu: menu.has(id) }];
  });
}

/** "Added 2× Chicken Biryani", "Paneer Biryani: 1 → 3", "Removed Veg Biryani", or a count for several. */
export function describeChanges(changes: CartChange[]): string {
  if (changes.length === 1) {
    const [{ offer, before, after }] = changes;
    return before === 0 ? `Added ${after}× ${offer.name}` : after === 0 ? `Removed ${offer.name}` : `${offer.name}: ${before} → ${after}`;
  }
  const added = changes.filter(change => change.before === 0).length, removed = changes.filter(change => change.after === 0).length, updated = changes.length - added - removed;
  return [added && `Added ${added} ${added === 1 ? "item" : "items"}`, updated && `updated ${updated}`, removed && `removed ${removed}`].filter(Boolean).join(", ").replace(/^./, letter => letter.toUpperCase());
}

/** Undo puts every line back; a removed dish can only return while its menu is open. */
export const undoable = (changes: CartChange[]) => changes.length > 0 && changes.every(change => change.before === 0 || change.after > 0 || change.inMenu);

type HintState = {
  view: AssistantView | null;
  addressAsked: boolean;
  checkoutOpen: boolean;
  /** The Instamart bag is open: its payment choices differ from Swiggy Food's. */
  bagOpen?: boolean;
  reviewReady: boolean;
  orderActive: boolean;
  savedAddresses: string[];
  /** Swiggy Food is not connected yet: the only useful sentence is about connecting. */
  disconnected?: boolean;
};
/** A dish name short enough for a chip: whole when it fits, otherwise its first words. */
const short = (name: string) => { const plain = name.replace(/\s*[(|].*$/, "").trim(); return plain.length <= 28 ? plain : plain.split(/\s+/).slice(0, 3).join(" "); };

/** What the customer could say next, from what is on screen: the voice assistant's discoverability. */
export function voiceHints(state: HintState): string[] {
  const { view } = state;
  if (state.disconnected) return ["Connect Swiggy"];
  if (state.reviewReady) return ["Confirm order", "Change payment"];
  if (state.bagOpen) return ["Pay with cash", "Use Swiggy Money"];
  if (state.checkoutOpen) return ["Pay with cash", "Use PhonePe"];
  if (state.addressAsked) return state.savedAddresses.length ? state.savedAddresses.slice(0, 2).map((label, index) => index ? `Deliver to ${label}` : label) : ["Deliver home"];
  const cart = view?.task.items.some(item => item.selectedOfferId) ?? false;
  const menu = view?.restaurantBrowser?.menu;
  if (menu) {
    const dish = menu.sections.flatMap(section => section.items).find(item => item.available);
    return [dish ? `Add two ${short(dish.name)}` : "What's popular here?", cart ? "Checkout" : "What's popular here?", "Back to restaurants"].filter((hint, index, all) => all.indexOf(hint) === index).slice(0, 3);
  }
  if (view?.task.discovery?.kind === "snacks" && !view.task.discovery.itemId) {
    const first = view.offers.find(offer => offer.provider === "instamart" && offer.available);
    return [first ? `Add two ${short(first.name)}` : "Show chocolates", cart ? "Checkout" : "Show cold drinks", "Show vegetables"];
  }
  const groceries = view?.task.discovery?.kind === "snacks" ? view.offers.filter(offer => offer.provider === "instamart" && offer.itemId === view.task.discovery?.itemId && offer.available) : [];
  if (groceries.length) return [`Add two ${short(groceries[0].name)}`, cart ? "Checkout" : "Show cold drinks", cart ? "Show my cart" : "Get some chocolates"];
  const restaurants = view?.restaurantBrowser?.restaurants ?? [];
  if (restaurants.length) return [`Open ${short(restaurants[0].name)}`, "Top rated first", cart ? "Show my cart" : "Show pizza places"];
  if (state.orderActive) return ["Where is my order?", "I want biryani"];
  return ["I want biryani", "Show pizza places", "Order something veg"];
}
