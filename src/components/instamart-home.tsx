"use client";

import type { AssistantView, MealOffer } from "@/lib/assistant-contracts";
import { GROCERY_CATEGORIES, GROCERY_RAILS, type GroceryCategory } from "@/lib/grocery-catalog";
import { CategoryArt, ProductCard } from "./grocery-results";

/** Instamart lists every pack size as its own product; a rail shows each product once (the size in the cart, else the cheapest) and says how many sizes the aisle has. */
function bySize(offers: MealOffer[], view: AssistantView) {
  const inCart = new Set(view.offers.filter(offer => view.task.items.some(item => item.selectedOfferId === offer.id)).map(offer => offer.providerItemId));
  const groups = new Map<string, MealOffer[]>();
  for (const offer of offers) groups.set(offer.name, [...(groups.get(offer.name) ?? []), offer]);
  return [...groups.values()].map(group => ({ offer: group.find(offer => inCart.has(offer.providerItemId)) ?? group.toSorted((a, b) => (a.priceMinor ?? Infinity) - (b.priceMinor ?? Infinity))[0], sizes: group.length }));
}

/** The Instamart front: a grid of aisles, then product rails, every product straight from Swiggy's search with ADD. */
export function InstamartHome({ view, focusedId, busy, onCategory, onAdd, onQuantity }: { view: AssistantView; focusedId?: string | null; busy: boolean; onCategory: (category: GroceryCategory) => void; onAdd: (offer: MealOffer) => void; onQuantity: (offer: MealOffer, quantity: number) => void }) {
  // One rail per home rail, from its latest search. Cart lines kept from earlier visits and aisles stay in the bag and on their product's card, not as rails of their own.
  const rails = GROCERY_RAILS.flatMap(rail => { const item = view.task.items.findLast(entry => entry.route === "instamart" && entry.status !== "added" && entry.label === rail.label); return item ? [{ item, offers: view.offers.filter(offer => offer.itemId === item.id) }] : []; }).filter(rail => rail.offers.length);
  return <section className="sc-instamart" aria-labelledby="sc-instamart-title">
    <header className="sc-instamart-head"><div><span className="sc-eyebrow">INSTAMART</span><h2 id="sc-instamart-title">Groceries in minutes</h2><p>Tap an aisle, or just say “add two Amul milk” or “show chocolates”.</p></div></header>
    <section aria-label="Shop by category"><h3 className="sc-instamart-title">Shop by category</h3>
      <div className="sc-instamart-aisles">{GROCERY_CATEGORIES.map(category => <button key={category.id} type="button" disabled={busy} onClick={() => onCategory(category)}><span aria-hidden="true"><CategoryArt icon={category.icon}/></span><strong>{category.label}</strong></button>)}</div>
    </section>
    {rails.map(({ item, offers }) => <section key={item.id} className="sc-instamart-rail" aria-label={item.label}>
      <div className="sc-instamart-rail-head"><h3 className="sc-instamart-title">{item.label}</h3>{GROCERY_CATEGORIES.some(category => category.query === item.query) && <button type="button" className="sc-link" disabled={busy} aria-label={`See all ${item.label}`} onClick={() => onCategory(GROCERY_CATEGORIES.find(category => category.query === item.query)!)}>See all</button>}</div>
      <div className="sc-instamart-row">{bySize(offers, view).slice(0, 12).map(({ offer, sizes }) => <ProductCard key={offer.id} offer={offer} sizes={sizes} view={view} focusedId={focusedId} busy={busy} onAdd={onAdd} onQuantity={onQuantity}/>)}</div>
    </section>)}
  </section>;
}
