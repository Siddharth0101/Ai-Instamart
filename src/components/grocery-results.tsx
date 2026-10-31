"use client";

import { useEffect, useState } from "react";
import type { AssistantView, MealOffer } from "@/lib/assistant-contracts";
import { offerQuantity } from "@/lib/offer-quantity";
import { Glyph, money } from "./assistant-ui";
import { FoodArt } from "./explore-navigation";
import { GROCERY_CATEGORIES, type GroceryCategory, type GroceryIcon } from "@/lib/grocery-catalog";

/** Artwork for a grocery by its name; anything unrecognised gets a plain bag rather than a wrong dish. */
function artFor(name: string): string | null {
  const text = name.toLowerCase();
  if (/ice ?cream|cornetto|kulfi/.test(text)) return "icecream";
  if (/chip|crisp|pringles|bingo|kurkure|lay'?s|namkeen|bhujia|moong dal|popcorn|nuts?\b/.test(text)) return "chips";
  if (/drink|cola|coke|pepsi|sprite|thums|juice|aamras|red bull|soda|water|tea|coffee/.test(text)) return "drink";
  if (/choco|cadbury|kitkat|dairy milk|silk|5 star|biscuit|cookie|oreo|parle|good day|sweet/.test(text)) return "chocolate";
  return null;
}
/** The aisle artwork for a product without a photo or food artwork (milk, atta, shampoo…). */
function aisleFor(name: string): GroceryIcon | null {
  const text = name.toLowerCase();
  if (/milk|curd|dahi|butter|paneer|cheese|ghee/.test(text)) return "dairy";
  if (/bread|bun|pav|rusk/.test(text)) return "bakery";
  if (/\begg/.test(text)) return "eggs";
  if (/onion|tomato|potato|banana|apple|fruit|vegetable|fresh/.test(text)) return "produce";
  if (/atta|rice|dal\b|flour|sugar/.test(text)) return "staples";
  if (/masala|spice|oil|salt/.test(text)) return "masala";
  if (/noodle|maggi|pasta/.test(text)) return "noodles";
  if (/detergent|dishwash|cleaner|surf|vim/.test(text)) return "cleaning";
  if (/shampoo|soap|bathing|toothpaste|lotion/.test(text)) return "care";
  return null;
}
/** A product photo when Instamart sends one, otherwise matching artwork. */
function ProductArt({ offer }: { offer: MealOffer }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [offer.imageUrl]);
  const art = artFor(offer.name), aisle = art ? null : aisleFor(offer.name);
  return <div className="sc-grocery-art" aria-hidden="true">{offer.imageUrl && !failed ? <img src={offer.imageUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)}/> : art ? <FoodArt kind={art}/> : aisle ? <CategoryArt icon={aisle}/> : <span className="sc-grocery-art-bag"><Glyph name="bag" size={34}/></span>}</div>;
}

/** One Instamart product: art, name, pack and price, then ADD that becomes a stepper. Shared by the home rails and category pages. */
export function ProductCard({ offer: shown, view, number, sizes = 1, focusedId, busy, onAdd, onQuantity }: { offer: MealOffer; view: AssistantView; number?: number; sizes?: number; focusedId?: string | null; busy: boolean; onAdd: (offer: MealOffer) => void; onQuantity: (offer: MealOffer, quantity: number) => void }) {
  // Each search gives its products new offer ids, so a product already in the cart from another aisle is matched by Swiggy's own id.
  const saved = view.offers.find(other => other.provider === shown.provider && other.providerItemId === shown.providerItemId && view.task.items.some(entry => entry.selectedOfferId === other.id));
  // Keep the saved cart identity for edits, while showing the latest provider price and stock.
  const offer = shown, cartOffer = saved ?? shown;
  const focused = !!focusedId && (focusedId === offer.id || focusedId === cartOffer.id);
  const lines = view.task.items.filter(entry => entry.selectedOfferId === cartOffer.id), quantity = lines.reduce((sum, line) => sum + line.quantity, 0), prepared = lines.some(line => line.status === "added");
  const max = offerQuantity(99, offer.maxQuantity) ?? 99;
  return <article className={`sc-grocery-card ${quantity ? "is-in-cart" : ""} ${offer.available ? "" : "is-unavailable"} ${focused ? "is-voice-target" : ""}`} data-voice-offer={cartOffer.id}>
    <ProductArt offer={offer}/>
    <div className="sc-grocery-copy">
      <h3>{number !== undefined && <span className="voice-item-number">{number}</span>}{offer.name}</h3>
      <p>{[offer.unit, offer.description, sizes > 1 ? `${sizes} sizes` : ""].filter(Boolean).join(" · ")}</p>
    </div>
    <footer>
      <strong>{offer.priceMinor === null ? "Price at checkout" : money(offer.priceMinor)}</strong>
      {prepared ? <span className="sc-grocery-bagged"><Glyph name="check" size={14}/>In bag</span>
        : quantity ? <div className="sc-rb-quantity sc-rb-quantity-saved" role="group" aria-label={`Quantity for ${offer.name}`}><button type="button" disabled={busy} aria-label={quantity === 1 ? `Remove ${offer.name}` : `Decrease ${offer.name}`} onClick={() => onQuantity(cartOffer, quantity - 1)}>−</button><output aria-live="polite">{quantity}</output><button type="button" disabled={busy || !offer.available || quantity >= max} aria-label={`Increase ${offer.name}`} onClick={() => onQuantity(cartOffer, quantity + 1)}>+</button></div>
        : !offer.available ? <span className="sc-grocery-out">Out of stock</span>
        : <button type="button" className="sc-rb-add" disabled={busy} aria-label={`Add ${offer.name} to cart`} onClick={() => onAdd(offer)}>ADD<Glyph name="plus" size={14}/></button>}
    </footer>
  </article>;
}

/** Instamart results as numbered product cards, with every category a tap away, like the store's own aisles. */
export function GroceryResults({ view, itemId, focusedId, busy, onAdd, onQuantity, onMore, onCategory, onHome }: { view: AssistantView; itemId: string; focusedId?: string | null; busy: boolean; onAdd: (offer: MealOffer) => void; onQuantity: (offer: MealOffer, quantity: number) => void; onMore: (itemId: string) => void; onCategory: (category: GroceryCategory) => void; onHome: () => void }) {
  const item = view.task.items.find(entry => entry.id === itemId);
  const offers = view.offers.filter(offer => offer.itemId === itemId);
  const page = view.browsePages.find(entry => entry.itemId === itemId);
  const active = GROCERY_CATEGORIES.find(category => category.query.toLowerCase() === item?.query.toLowerCase());
  return <section className="sc-grocery" aria-labelledby="sc-grocery-title">
    <button type="button" className="sc-rb-back" disabled={busy} onClick={onHome}><span style={{ display: "inline-flex", transform: "rotate(180deg)" }}><Glyph name="arrow" size={16}/></span>Instamart home</button>
    <nav className="sc-grocery-aisles" aria-label="Categories">{GROCERY_CATEGORIES.map(category => <button key={category.id} type="button" aria-current={active?.id === category.id ? "page" : undefined} disabled={busy} onClick={() => onCategory(category)}><span aria-hidden="true"><CategoryArt icon={category.icon}/></span>{category.label}</button>)}</nav>
    <header className="sc-grocery-head"><div><span className="sc-eyebrow">INSTAMART · DELIVERY IN MINUTES</span><h2 id="sc-grocery-title">{active?.label ?? item?.query.replace(/^./, letter => letter.toUpperCase()) ?? "Instamart"}</h2></div>{offers.length > 0 && <span>{offers.length} {offers.length === 1 ? "product" : "products"}</span>}</header>
    {offers.length ? <div className="sc-grocery-grid">{offers.map((offer, index) => <ProductCard key={offer.id} offer={offer} view={view} focusedId={focusedId} number={index + 1} busy={busy} onAdd={onAdd} onQuantity={onQuantity}/>)}</div>
      : <div className="sc-rb-empty"><span className="sc-rb-empty-symbol" aria-hidden="true">🛒</span><h3>No matching products</h3><p>Try another category, or say a product name like “Amul milk” or “Maggi”.</p></div>}
    {page?.hasMore && <div className="sc-more-options"><button className="sc-button sc-button-quiet" disabled={busy} onClick={() => onMore(itemId)}>Show more<Glyph name="plus" size={16}/></button></div>}
  </section>;
}

/** Category artwork: the food illustrations where one fits, simple drawings for the rest. */
export function CategoryArt({ icon }: { icon: GroceryIcon }) {
  // FoodArt picks its picture from words, and "sweet" would match ice cream first.
  const food: Partial<Record<GroceryIcon, string>> = { chips: "chips", drink: "drink", sweet: "chocolate", icecream: "icecream", noodles: "noodles" };
  if (food[icon]) return <FoodArt kind={food[icon]!}/>;
  return <svg viewBox="0 0 120 120" fill="none" aria-hidden="true">
    <ellipse cx="60" cy="104" rx="36" ry="6" fill="#7b3f1a" opacity=".08"/>
    {icon === "produce" ? <><circle cx="48" cy="66" r="26" fill="#e2493b"/><path d="M48 40c0-8 6-14 14-16" stroke="#6b4428" strokeWidth="4" strokeLinecap="round"/><path d="M62 30c10-6 22-2 24 6-10 4-20 2-24-6Z" fill="#5fa043"/><path d="M78 98 98 54c4-8-6-14-12-8L68 92Z" fill="#f08a2b"/><path d="m96 50 8-10M98 56l10-4" stroke="#5fa043" strokeWidth="4" strokeLinecap="round"/></>
    : icon === "dairy" ? <><path d="M40 40h40v58a6 6 0 0 1-6 6H46a6 6 0 0 1-6-6Z" fill="#fff" stroke="#c9d6e6" strokeWidth="3"/><path d="m40 40 8-16h24l8 16Z" fill="#e9f0f8" stroke="#c9d6e6" strokeWidth="3"/><rect x="40" y="60" width="40" height="22" fill="#3b82c4"/><path d="M50 71h20" stroke="#fff" strokeWidth="4" strokeLinecap="round"/></>
    : icon === "bakery" ? <><path d="M22 70c0-22 18-34 38-34s38 12 38 34v20a8 8 0 0 1-8 8H30a8 8 0 0 1-8-8Z" fill="#d99a43"/><path d="M28 70c0-18 14-28 32-28s32 10 32 28" stroke="#b9772d" strokeWidth="3"/><path d="m44 52 6 10m10-12 4 12m10-10 2 10" stroke="#f6d48e" strokeWidth="4" strokeLinecap="round"/></>
    : icon === "eggs" ? <><ellipse cx="44" cy="66" rx="18" ry="24" fill="#fff8ec" stroke="#e6d6bb" strokeWidth="3"/><ellipse cx="74" cy="70" rx="18" ry="24" fill="#f7e2c4" stroke="#e0c49c" strokeWidth="3"/><rect x="20" y="82" width="80" height="16" rx="6" fill="#c8a477"/></>
    : icon === "tea" ? <><path d="M30 50h50v26a24 24 0 0 1-24 24h-2a24 24 0 0 1-24-24Z" fill="#fff" stroke="#d9c7b2" strokeWidth="3"/><path d="M80 58h6a10 10 0 0 1 0 20h-8" stroke="#d9c7b2" strokeWidth="5"/><ellipse cx="55" cy="52" rx="23" ry="5" fill="#a0602d"/><path d="M46 38c0-6 6-6 6-12M60 38c0-6 6-6 6-12" stroke="#cfc2b4" strokeWidth="3" strokeLinecap="round"/></>
    : icon === "staples" ? <><path d="M34 44c-6 0-10 6-10 12l4 36c1 6 5 10 11 10h42c6 0 10-4 11-10l4-36c0-6-4-12-10-12Z" fill="#e9d3a5"/><path d="M38 44c4-10 40-10 44 0" stroke="#c9ad78" strokeWidth="4"/><rect x="40" y="62" width="40" height="22" rx="4" fill="#d24b2f"/><path d="M48 73h24" stroke="#fff" strokeWidth="4" strokeLinecap="round"/></>
    : icon === "masala" ? <><rect x="34" y="40" width="34" height="58" rx="8" fill="#c8402c"/><rect x="34" y="32" width="34" height="12" rx="4" fill="#7a2b1d"/><rect x="72" y="52" width="24" height="46" rx="7" fill="#f2b33d"/><rect x="72" y="46" width="24" height="9" rx="3" fill="#a8721b"/><path d="M40 64h22M40 72h22" stroke="#ffd0bf" strokeWidth="3" strokeLinecap="round"/></>
    : icon === "cleaning" ? <><path d="M46 46h28l6 52a6 6 0 0 1-6 6H46a6 6 0 0 1-6-6Z" fill="#4aa3df"/><path d="M50 46V32h20l10-6v12H70v8" fill="#2f7fb8"/><circle cx="60" cy="76" r="10" fill="#fff" opacity=".85"/><circle cx="88" cy="40" r="4" fill="#bfe3f8"/><circle cx="96" cy="50" r="3" fill="#bfe3f8"/></>
    : <><path d="M44 50h32l4 46a8 8 0 0 1-8 8H48a8 8 0 0 1-8-8Z" fill="#f6a5c0"/><rect x="50" y="34" width="20" height="16" rx="3" fill="#e0728f"/><rect x="56" y="24" width="8" height="12" rx="2" fill="#c35675"/><path d="M50 70h20" stroke="#fff" strokeWidth="4" strokeLinecap="round"/></>}
  </svg>;
}
