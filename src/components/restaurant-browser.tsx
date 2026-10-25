"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { AssistantView, MealOffer, RestaurantCard, Presentation } from "@/lib/assistant-contracts";
import type { RestaurantVoiceContext, ShoppingVoiceContext } from "@/lib/screen-context";
import { offerQuantity } from "@/lib/offer-quantity";
import { dishMatches, restaurantMatches, sortRestaurants, type RestaurantSort } from "@/lib/screen-filter";
import { mentionedVoiceTarget, prominentVoiceTarget } from "@/lib/voice-browse";
import { FoodArt } from "./explore-navigation";
import { categoriesFor } from "@/lib/discovery";


type RestaurantProvider = "swiggy_food" | "zomato";
type RestaurantBrowserProps = {
  /** A cuisine tapped in "What's on your mind?": a fresh Swiggy search for it. */
  onCuisine?: (label: string) => void;
  voiceActive?: boolean;
  voiceReply?: { id: string; text: string } | null;
  voiceCommand?:{version:number;action:Presentation}|null;
  onMenuVisible?:(context:ShoppingVoiceContext)=>void;
  onVisibleChange?: (context:RestaurantVoiceContext)=>void;
  view: AssistantView;
  busy: boolean;
  onRestaurant: (id: string) => void;
  onBack: () => void;
  onMoreRestaurants: () => void;
  onMoreMenu: () => void;
  onAdd: (offer: MealOffer, quantity: number) => void;
  onConnect: (provider: RestaurantProvider) => void;
};

const providerNames = { swiggy_food: "Swiggy", zomato: "Zomato" } as const;
const price = (minor: number) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: minor % 100 ? 2 : 0,
}).format(minor / 100);

function browseViewport() {
  const header = document.querySelector(".sc-header")?.getBoundingClientRect();
  const dock = document.getElementById("voice-panel")?.getBoundingClientRect();
  return { top: Math.max(0, header?.bottom ?? 0) + 16, bottom: Math.min(window.innerHeight, dock?.top ?? window.innerHeight) - 16 };
}

function revealVoiceElement(element: HTMLElement | null, align: boolean | "center" = false) {
  if (!element || document.querySelector("dialog[open]")) return;
  const viewport = browseViewport();
  const rect = element.getBoundingClientRect();
  const sectionNav = element.matches("[data-voice-offer], .sc-rb-menu-section")
    ? element.closest(".sc-rb")?.querySelector(".sc-rb-section-nav")?.getBoundingClientRect().height ?? 0 : 0;
  const top = viewport.top + sectionNav;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
  // A dish the assistant just changed sits mid-screen, clear of the header and the voice controls.
  if (align === "center") { window.scrollBy({ top: rect.top + rect.height / 2 - (top + viewport.bottom) / 2, behavior: motion }); return; }
  if (align || rect.top < top || rect.bottom > viewport.bottom) {
    window.scrollBy({ top: rect.top - top, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
}

/** Swiggy marks sponsored places by ending the name with “(Ad)”; it is shown as a small tag instead. */
function PlaceName({ name }: { name: string }) {
  const plain = name.replace(/\s*\(Ad\)\s*$/i, "");
  return <>{plain}{plain !== name && <span className="sc-rb-ad">Ad</span>}</>;
}

function Arrow({ back = false }: { back?: boolean }) {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={back ? { transform: "rotate(180deg)" } : undefined}><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
}

function SearchIcon() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>;
}

function FoodImage({ imageUrl, name, art, restaurant = false }: { imageUrl?: string; name: string; art?: string; restaurant?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <div className={`sc-rb-image ${restaurant ? "sc-rb-restaurant-image" : "sc-rb-dish-image"}`}>
    {imageUrl && !failed ? <img src={imageUrl} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)}/> : <div className="sc-rb-image-fallback" aria-hidden="true"><FoodArt kind={(art ?? name).toLowerCase()}/></div>}
  </div>;
}

function RestaurantFacts({ restaurant }: { restaurant: RestaurantCard }) {
  return <div className="sc-rb-facts">
    {restaurant.rating !== null && <span className="sc-rb-rating"><span aria-hidden="true">★</span>{restaurant.rating.toLocaleString("en-IN", { maximumFractionDigits: 1 })}<span className="sr-only"> rating</span></span>}
    {restaurant.etaMinutes !== null && <span>{restaurant.etaMinutes} min</span>}
    {restaurant.costForTwo && <span>{restaurant.costForTwo}</span>}
    {restaurant.distanceKm !== null && <span>{restaurant.distanceKm.toLocaleString("en-IN", { maximumFractionDigits: 1 })} km</span>}
  </div>;
}

function RestaurantTile({ restaurant, busy, onClick, index, focused, onFocus }: { restaurant: RestaurantCard; busy: boolean; onClick: () => void; index:number; focused:boolean; onFocus:()=>void }) {
  return <button data-voice-restaurant={restaurant.id} className={`sc-rb-place ${restaurant.isOpen === false ? "sc-rb-place-closed" : ""} ${focused?"is-voice-target":""}`} onMouseEnter={onFocus} onFocus={onFocus} type="button" disabled={busy} onClick={onClick} aria-label={`Open ${restaurant.name} menu${restaurant.isOpen === false ? ", currently closed" : ""}`}>
    <div className="sc-rb-place-art"><span className="sc-restaurant-number" aria-label={`Restaurant ${index+1}`}>{index+1}</span><FoodImage key={restaurant.imageUrl} imageUrl={restaurant.imageUrl} name={restaurant.name} art={`${restaurant.cuisines.join(" ")} ${restaurant.name}`} restaurant/>{restaurant.isOpen === false && <span className="sc-rb-closed">Closed now</span>}</div>
    <div className="sc-rb-place-copy"><h3><PlaceName name={restaurant.name}/></h3><RestaurantFacts restaurant={restaurant}/>{restaurant.cuisines.length > 0 && <p className="sc-rb-cuisines">{restaurant.cuisines.join(", ")}</p>}{restaurant.area && <p className="sc-rb-area">{restaurant.area}</p>}</div>
  </button>;
}

function MenuItem({ offer, view, busy, restaurantOpen, onAdd, number, focused, onFocus }: { number:number;focused:boolean;onFocus:()=>void;offer: MealOffer; view: AssistantView; busy: boolean; restaurantOpen: boolean | null; onAdd: RestaurantBrowserProps["onAdd"] }) {
  const matchingItems = view.task.items.filter(item => {
    const selected = view.offers.find(candidate => candidate.id === item.selectedOfferId);
    return selected?.provider === offer.provider && selected.providerItemId === offer.providerItemId;
  });
  const savedQuantity = matchingItems.reduce((sum, item) => sum + item.quantity, 0);
  const alreadyPrepared = matchingItems.some(item => item.status === "added");
  const [requested, setRequested] = useState(() => savedQuantity || 1);
  useEffect(() => { setRequested(savedQuantity || 1); }, [savedQuantity]);
  const quantity = offerQuantity(requested, offer.maxQuantity);
  const maxQuantity = offerQuantity(99, offer.maxQuantity);
  const unavailable = !offer.available || !offer.selectable || quantity === null || maxQuantity === null || restaurantOpen !== true;
  const locked = busy || unavailable || alreadyPrepared;
  function changeQuantity(next: number) {
    // A saved dish can always be removed, even after it sells out; only adding needs it available.
    if (busy || alreadyPrepared) return;
    if ((next === 0 || unavailable) && savedQuantity > 0 && next < savedQuantity) { onAdd(offer, 0); return; }
    if (locked) return;
    const normalized = offerQuantity(next, offer.maxQuantity);
    if (normalized === null) return;
    setRequested(normalized);
    if (savedQuantity > 0) onAdd(offer, normalized);
  }
  return <article data-voice-offer={offer.id} onMouseEnter={onFocus} onFocus={onFocus} className={`sc-rb-menu-item ${unavailable ? "sc-rb-menu-item-unavailable" : ""} ${focused ? "is-voice-target" : ""}`}>
    <div className="sc-rb-menu-item-copy"><h4><span className="voice-item-number">{number}</span>{offer.name}</h4><p className={`sc-rb-dish-price ${offer.priceMinor === null ? "sc-rb-price-pending" : ""}`}>{offer.priceMinor === null ? "Price confirmed by restaurant" : price(offer.priceMinor)}{offer.unit && offer.unit !== "serving" && <small> · {offer.unit}</small>}</p>{offer.description && <p className="sc-rb-description">{offer.description}</p>}{alreadyPrepared && <span className="sc-rb-saved">In your bag — edit it there</span>}{unavailable && <span className="sc-rb-unavailable">{restaurantOpen === false ? "Restaurant currently closed" : restaurantOpen === null ? "Restaurant availability not confirmed" : "Currently unavailable"}</span>}</div>
    <div className="sc-rb-menu-item-action"><FoodImage key={offer.imageUrl} imageUrl={offer.imageUrl} name={offer.name}/>{savedQuantity > 0 && !alreadyPrepared
      ? <div className="sc-rb-quantity sc-rb-quantity-saved" role="group" aria-label={`Quantity for ${offer.name}`}><button type="button" disabled={busy} aria-label={quantity === 1 || unavailable ? `Remove ${offer.name} from cart` : `Decrease ${offer.name} quantity`} onClick={() => changeQuantity((quantity ?? savedQuantity) - 1)}>−</button><output aria-live="polite" aria-label={`${offer.name} quantity`}>{quantity ?? "—"}</output><button type="button" disabled={locked || quantity === null || maxQuantity === null || quantity >= maxQuantity} aria-label={`Increase ${offer.name} quantity`} onClick={() => changeQuantity((quantity ?? 1) + 1)}>+</button></div>
      : <button type="button" className="sc-rb-add" disabled={locked} aria-label={`Add ${offer.name} to cart`} onClick={() => { if (quantity !== null) onAdd(offer, quantity); }}>{alreadyPrepared ? "In bag" : unavailable ? "Unavailable" : <>ADD<span aria-hidden="true">+</span></>}</button>}</div>
  </article>;
}

/** A provider restaurant directory followed by one real restaurant's menu. */
export function RestaurantBrowser({ view, busy, onRestaurant, onBack, onMoreRestaurants, onMoreMenu, onAdd, onConnect, onVisibleChange, onMenuVisible, voiceCommand, voiceActive = false, voiceReply, onCuisine }: RestaurantBrowserProps) {
  const browser = view.restaurantBrowser;
  const root = useRef<HTMLElement>(null);
  const followedReply = useRef<string | null>(null);
  const pendingReveal = useRef<"results" | string | null>(null);
  const previousContent = useRef<{menuId: string | null; restaurantIds: string[]; offerIds: string[]} | null>(null);
  const focusLockUntil = useRef(0);
  const [provider, setProvider] = useState<RestaurantProvider>(() => browser?.menu?.restaurant.provider ?? browser?.restaurants[0]?.provider ?? "swiggy_food");
  const [sort,setSort]=useState<RestaurantSort>("recommended");
  const [openOnly,setOpenOnly]=useState(false);
  // Quick filters, as in the food app: fast delivery and well-rated places.
  const [fast,setFast]=useState(false);
  const [topRated,setTopRated]=useState(false);
  const [focusedOffer,setFocusedOffer]=useState<string|null>(null);
  const [focused,setFocused]=useState<string|null>(null);
  const [cuisine, setCuisine] = useState("");
  const [restaurantQuery, setRestaurantQuery] = useState("");
  const [menuQuery, setMenuQuery] = useState("");
  const [activeSection, setActiveSection] = useState("");
  const sectionPrefix = useId();
  const loadedMenu = browser?.menu ?? null;
  const menu = loadedMenu?.restaurant.provider === provider ? loadedMenu : null;
  useEffect(() => {
    if (loadedMenu) setProvider(loadedMenu.restaurant.provider);
    setMenuQuery("");
    setActiveSection("");
  }, [loadedMenu?.restaurantId]);
  const places = browser?.restaurants.filter(restaurant => restaurant.provider === provider) ?? [];
  const mealCategories = categoriesFor({ kind: "meal", mealPeriod: "lunch" });
  // The heading names what was asked for ("Biryani near you"), not just "restaurants".
  // What was searched, not the plan item's label: adding a dish renames the item ("Crispy Mushroom Rice Bowl near you").
  const searched = view.task.items.find(item => item.id === browser?.itemId)?.query ?? null;
  const searchLabel = searched ? searched.charAt(0).toUpperCase() + searched.slice(1) : null;
  const cuisines = [...new Set(places.flatMap(restaurant => restaurant.cuisines).map(value => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const visiblePlaces = sortRestaurants(places.filter(restaurant => (!openOnly||restaurant.isOpen===true)&&(!fast||(restaurant.etaMinutes??99)<=30)&&(!topRated||(restaurant.rating??0)>=4)&&(!cuisine || restaurant.cuisines.includes(cuisine)) && restaurantMatches(restaurant, restaurantQuery)), sort);
  const filtering = openOnly || fast || topRated || !!cuisine || !!restaurantQuery;
  const topPlaces = !filtering && places.length >= 6 ? [...places].filter(place => place.isOpen !== false).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 8) : [];
  const visibleIds=JSON.stringify(menu?[]:visiblePlaces.map(card=>card.id));
  useEffect(()=>{const ids:string[]=JSON.parse(visibleIds);onVisibleChange?.({visibleRestaurantIds:ids,focusedRestaurantId:focused&&ids.includes(focused)?focused:null});},[visibleIds,focused,onVisibleChange]);
  const providerState = view.providers.find(entry => entry.id === provider);
  const normalizedMenuQuery = menuQuery.trim().toLocaleLowerCase();
  const sections = useMemo(() => menu?.sections.map((section, index) => ({
    ...section, anchor: `${sectionPrefix}-${index}`, loadedCount: section.items.length,
    items: section.items.filter(offer => dishMatches(offer, normalizedMenuQuery)),
  })).filter(section => section.items.length > 0) ?? [], [menu, normalizedMenuQuery, sectionPrefix]);
  // Swiggy lists a dish under Recommended and again in its own section; it keeps the number of its first appearance.
  const numberedOffers = [...new Map(sections.flatMap(section=>section.items).map(offer=>[offer.id,offer] as const)).values()];
  const offerNumbers = new Map(numberedOffers.map((offer,index)=>[offer.id,index+1]));
  const offerIds=JSON.stringify(numberedOffers.map(offer=>offer.id));
  useEffect(()=>{const ids:string[]=JSON.parse(offerIds);onMenuVisible?.({surface:menu?"menu":"offers",visibleOfferIds:menu?ids:[],focusedOfferId:menu&&focusedOffer&&ids.includes(focusedOffer)?focusedOffer:null});},[offerIds,menu?.restaurantId,focusedOffer,onMenuVisible]);
  useEffect(()=>{
    const action=voiceCommand?.action;if(!action||action.kind!=="browse"||voiceCommand?.version!==view.version)return;
    if(action.provider){setProvider(action.provider);setRestaurantQuery("");setCuisine("");}
    if(action.sort)setSort(action.sort);
    if(action.openOnly!==undefined)setOpenOnly(action.openOnly);
    if(action.query!==undefined){if(menu)setMenuQuery(action.query);else setRestaurantQuery(action.query);setCuisine("");}
    pendingReveal.current=action.section??"results";
    if(action.section)setMenuQuery("");
    setFocused(null);setFocusedOffer(null);
  },[voiceCommand?.version]);
  useEffect(()=>{
    const target=pendingReveal.current;
    if(!target)return;
    const frame=requestAnimationFrame(()=>{
      pendingReveal.current=null;
      if(target==="results")revealVoiceElement(root.current?.querySelector<HTMLElement>(menu?".sc-rb-menu-sections":".sc-rb-place-grid")??null,true);
      else {const section=sections.find(section=>section.title.toLowerCase().includes(target.toLowerCase()));if(section){setActiveSection(section.id);revealVoiceElement(document.getElementById(section.anchor),true);}}
    });
    return ()=>cancelAnimationFrame(frame);
  },[voiceCommand?.version,visibleIds,offerIds,menu?.restaurantId,sections]);
  useEffect(()=>{
    const content={menuId:menu?.restaurantId??null,restaurantIds:JSON.parse(visibleIds) as string[],offerIds:JSON.parse(offerIds) as string[]};
    const previous=previousContent.current;previousContent.current=content;
    if(!voiceActive||!root.current||document.querySelector("dialog[open]"))return;
    let target:HTMLElement|null=null;
    if(voiceReply&&followedReply.current!==voiceReply.id){
      followedReply.current=voiceReply.id;
      const id=mentionedVoiceTarget(voiceReply.text,menu?numberedOffers:visiblePlaces);
      if(id){
        const attribute=menu?"data-voice-offer":"data-voice-restaurant";
        target=Array.from(root.current.querySelectorAll<HTMLElement>(`[${attribute}]`)).find(node=>node.getAttribute(attribute)===id)??null;
        if(menu)setFocusedOffer(id);else setFocused(id);
        focusLockUntil.current=Date.now()+1000;
      }
    }
    if(!target&&content.menuId!==previous?.menuId)target=root.current.querySelector<HTMLElement>(menu?".sc-rb-menu-header":".sc-rb-heading");
    if(!target&&previous){
      const ids=menu?content.offerIds:content.restaurantIds,oldIds=menu?previous.offerIds:previous.restaurantIds;
      // Reveal newly loaded results only when the existing list is an unchanged prefix.
      if(oldIds.length&&ids.length>oldIds.length&&oldIds.every((id,index)=>ids[index]===id)){
        const attribute=menu?"data-voice-offer":"data-voice-restaurant";
        target=Array.from(root.current.querySelectorAll<HTMLElement>(`[${attribute}]`)).find(node=>node.getAttribute(attribute)===ids[oldIds.length])??null;
      }
    }
    if(target)revealVoiceElement(target);
  },[voiceActive,voiceReply?.id,menu?.restaurantId,visibleIds,offerIds]);
  // A dish saved or changed by voice becomes the highlighted one, so the result is visible where it happened.
  const selections=JSON.stringify(view.task.items.filter(item=>item.selectedOfferId).map(item=>[item.selectedOfferId,item.quantity]));
  const previousSelections=useRef(selections);
  useEffect(()=>{
    const before=new Map<string,number>(JSON.parse(previousSelections.current));previousSelections.current=selections;
    if(!voiceActive||!menu||!root.current)return;
    const changed=(JSON.parse(selections) as [string,number][]).find(([id,quantity])=>before.get(id)!==quantity)?.[0];
    const offer=changed?numberedOffers.find(candidate=>candidate.id===changed||view.offers.find(saved=>saved.id===changed)?.providerItemId===candidate.providerItemId):null;
    if(!offer)return;
    setFocusedOffer(offer.id);focusLockUntil.current=Date.now()+1500;
    revealVoiceElement(Array.from(root.current.querySelectorAll<HTMLElement>("[data-voice-offer]")).find(node=>node.getAttribute("data-voice-offer")===offer.id)??null,"center");
  },[selections]);
  useEffect(()=>{
    if(!voiceActive)return;
    let frame:number|null=null;
    const track=()=>{
      frame=null;if(Date.now()<focusLockUntil.current||document.querySelector("dialog[open]"))return;
      const attribute=menu?"data-voice-offer":"data-voice-restaurant";
      const targets=Array.from(root.current?.querySelectorAll<HTMLElement>(`[${attribute}]`)??[]).map(node=>{const rect=node.getBoundingClientRect();return {id:node.getAttribute(attribute)!,top:rect.top,bottom:rect.bottom};});
      const {top,bottom}=browseViewport();
      const update=menu?setFocusedOffer:setFocused;
      update(current=>targets.some(target=>target.id===current&&target.top<bottom&&target.bottom>top)?current:prominentVoiceTarget(targets,top,bottom));
    };
    const schedule=()=>{if(frame===null)frame=requestAnimationFrame(track);};
    const manual=()=>{focusLockUntil.current=0;schedule();};
    schedule();window.addEventListener("scroll",schedule,{passive:true});window.addEventListener("resize",schedule);window.addEventListener("wheel",manual,{passive:true});window.addEventListener("touchstart",manual,{passive:true});
    return ()=>{if(frame!==null)cancelAnimationFrame(frame);window.removeEventListener("scroll",schedule);window.removeEventListener("resize",schedule);window.removeEventListener("wheel",manual);window.removeEventListener("touchstart",manual);};
  },[voiceActive,menu?.restaurantId,visibleIds,offerIds]);
  if (!browser) return null;
  const connected = providerState?.status === "connected";
  const connectable = providerState?.status === "disconnected";
  const canLoadRestaurants = browser.hasMore && places.length > 0;
  const totalMenuItems = menu?.sections.reduce((sum, section) => sum + section.items.length, 0) ?? 0;
  return <section ref={root} className={`sc-rb ${menu?"sc-rb-menu-view":"sc-rb-directory"}`} aria-label={menu ? `${menu.restaurant.name} menu` : "Browse restaurants"} aria-busy={busy}>
    {busy && <div className="sc-rb-progress" role="status"><span className="sc-spinner"/>{menu ? "Updating your cart…" : "Finding restaurants near you…"}</div>}
    {menu ? <>
      <button type="button" className="sc-rb-back" disabled={busy} onClick={onBack}><Arrow back/>All restaurants</button>
      <header className="sc-rb-menu-header"><div><p className="sc-rb-kicker">{providerNames[menu.restaurant.provider]}</p><h2><PlaceName name={menu.restaurant.name}/></h2>{menu.restaurant.cuisines.length > 0 && <p className="sc-rb-menu-cuisines">{menu.restaurant.cuisines.join(" · ")}</p>}<RestaurantFacts restaurant={menu.restaurant}/>{menu.restaurant.area && <p className="sc-rb-menu-area">{menu.restaurant.area}</p>}</div><FoodImage key={menu.restaurant.imageUrl} imageUrl={menu.restaurant.imageUrl} name={menu.restaurant.name} art={`${menu.restaurant.cuisines.join(" ")} ${menu.restaurant.name}`} restaurant/></header>
      {menu.restaurant.isOpen === false && <p className="sc-rb-warning" role="status">This restaurant is currently closed. You can explore its menu and choose another restaurant to order now.</p>}
      {menu.restaurant.isOpen === null && <p className="sc-rb-warning" role="status">Restaurant availability hasn’t been confirmed. Explore the menu, or choose a restaurant with confirmed availability.</p>}
      {menu.notices.length > 0 && <details className="sc-rb-menu-notices"><summary>Menu information & customizations<Arrow/></summary><div role="note">{menu.notices.map((notice, index) => <p key={`${index}:${notice}`}>{notice}</p>)}</div></details>}
      {view.task.dietary.length > 0 && <p className="sc-rb-dietary-note">Your dietary needs: {view.task.dietary.join(", ")}. Check with the restaurant if a menu description does not confirm an ingredient or allergen.</p>}
      {menuQuery && <p className="sc-rb-filter-chip" role="status"><SearchIcon/>Showing “{menuQuery}”<button type="button" aria-label="Clear menu filter" onClick={() => setMenuQuery("")}>×</button></p>}
      {sections.length > 0 && <nav className="sc-rb-section-nav" aria-label="Menu sections">{sections.map(section => <a key={section.id} href={`#${section.anchor}`} aria-current={activeSection === section.id ? "location" : undefined} onClick={event => { event.preventDefault(); setActiveSection(section.id); revealVoiceElement(document.getElementById(section.anchor), true); }}>{section.title}<span>{section.items.length}</span></a>)}</nav>}
      <div className="sc-rb-menu-sections">{sections.map(section => <section key={section.anchor} id={section.anchor} className="sc-rb-menu-section" aria-labelledby={`${section.anchor}-title`}><div className="sc-rb-section-heading"><h3 id={`${section.anchor}-title`}>{section.title}<span>({section.items.length})</span></h3><span className="sc-rb-section-line"/></div>{section.items.map(offer => <MenuItem number={offerNumbers.get(offer.id)!} focused={focusedOffer===offer.id} onFocus={()=>setFocusedOffer(offer.id)} key={`${offer.id}:${offer.providerItemId}`} offer={offer} view={view} busy={busy} restaurantOpen={menu.restaurant.isOpen} onAdd={onAdd}/>)}{section.hasMoreItems && <p className="sc-rb-partial-section">Showing {section.loadedCount}{section.totalItems !== null ? ` of ${section.totalItems}` : " preview"} dishes in {section.title}.{normalizedMenuQuery ? ` ${section.items.length} ${section.items.length === 1 ? "dish matches" : "dishes match"} your search.` : ""} {menu.hasMore ? "Load more menu sections below; the provider returns a preview within each section." : "The provider has returned a preview of this section."}</p>}</section>)}</div>
      {sections.length === 0 && !busy && <div className="sc-rb-empty"><SearchIcon/><h3>{menuQuery ? "No dishes match that search" : "No menu items returned yet"}</h3><p>{menuQuery ? "Try a dish name or clear the filter to see the loaded menu." : "The restaurant may be updating its menu. Go back to explore another place."}</p>{menuQuery && <button className="sc-rb-secondary" type="button" onClick={() => setMenuQuery("")}>Clear search</button>}</div>}
      {menu.hasMore && <div className="sc-rb-more"><button type="button" className="sc-rb-secondary" disabled={busy} onClick={onMoreMenu}>{busy ? "Loading…" : "Load more dishes"}<Arrow/></button><p>Showing {totalMenuItems} loaded dishes. Search filters these dishes.</p></div>}
    </> : <>
      {connected && <section className="sc-rb-mind" aria-label="What's on your mind?"><h3>What’s on your mind?</h3><div className="sc-rb-mind-rail">{mealCategories.map(category => <button key={category.id} type="button" disabled={busy || !onCuisine} aria-current={searchLabel?.toLowerCase() === category.label.toLowerCase() ? "true" : undefined} onClick={() => onCuisine?.(category.label)}><span aria-hidden="true"><FoodArt kind={category.label}/></span>{category.label}</button>)}</div></section>}
      {topPlaces.length > 0 && <section className="sc-rb-top" aria-label="Top rated near you"><h3>Top rated near you</h3><div className="sc-rb-top-rail">{topPlaces.map(place => <button key={place.id} type="button" disabled={busy} onClick={() => onRestaurant(place.id)} aria-label={`Open ${place.name}`}><FoodImage key={place.imageUrl} imageUrl={place.imageUrl} name={place.name} art={`${place.cuisines.join(" ")} ${place.name}`} restaurant/><strong><PlaceName name={place.name}/></strong><RestaurantFacts restaurant={place}/></button>)}</div></section>}
      <header className="sc-rb-heading"><div><h2>{searchLabel && !/^restaurants?( near you)?$/i.test(searchLabel) ? `${searchLabel} near you` : "Restaurants near you"}</h2>{connected && <span className="sc-rb-live-label"><span/>Live from Swiggy</span>}</div>{places.length > 0 && <span>{visiblePlaces.length} of {places.length} restaurants</span>}</header>
      {connected && places.length > 0 && <div className="sc-rb-quick" role="group" aria-label="Quick filters"><button type="button" aria-pressed={sort !== "recommended"} disabled={busy} onClick={() => setSort(value => value === "recommended" ? "rating" : value === "rating" ? "delivery" : "recommended")}>{sort === "rating" ? "Sort: Rating" : sort === "delivery" ? "Sort: Fastest" : "Sort"}</button><button type="button" aria-pressed={fast} disabled={busy} onClick={() => setFast(value => !value)}>Fast delivery</button><button type="button" aria-pressed={topRated} disabled={busy} onClick={() => setTopRated(value => !value)}>Ratings 4.0+</button><button type="button" aria-pressed={openOnly} disabled={busy} onClick={() => setOpenOnly(value => !value)}>Open now</button></div>}
      {connected && places.length > 0 && <>{restaurantQuery && <p className="sc-rb-filter-chip" role="status"><SearchIcon/>Showing “{restaurantQuery}”<button type="button" aria-label="Clear restaurant filter" onClick={() => setRestaurantQuery("")}>×</button></p>}{cuisines.length > 0 && <div className="sc-rb-cuisine-filters" role="group" aria-label="Filter by cuisine"><button type="button" aria-pressed={!cuisine} disabled={busy} onClick={() => setCuisine("")}>All cuisines</button>{cuisines.map(value => <button key={value} type="button" aria-pressed={cuisine === value} disabled={busy} onClick={() => setCuisine(value)}>{value}</button>)}</div>}</>}
      {!connected ? <div className={`sc-rb-access sc-rb-access-${provider}`}><div className="sc-rb-access-symbol" aria-hidden="true">{provider === "swiggy_food" ? "S" : "z"}</div><div><h3>{provider === "zomato" && providerState?.status === "access_required" ? "Zomato needs developer access" : `Connect ${providerNames[provider]} to explore`}</h3><p>{providerState?.message || `Connect your ${providerNames[provider]} account to see restaurants for your delivery address.`}</p>{connectable && <button type="button" className="sc-rb-primary" disabled={busy} onClick={() => onConnect(provider)}>Connect {providerNames[provider]}<Arrow/></button>}{provider === "zomato" && providerState?.status === "access_required" && <a className="sc-rb-secondary sc-rb-access-link" href="https://forms.eternal.com/form/ja8hap2tpm/" target="_blank" rel="noopener noreferrer">Request Zomato access<Arrow/><span className="sr-only"> (opens in a new tab)</span></a>}{!connectable && <small>Restaurants and menus will appear here when this connection is available.</small>}</div></div> : <>
        {visiblePlaces.length > 0 ? <div className="sc-rb-place-grid">{visiblePlaces.map((restaurant,index) => <RestaurantTile key={restaurant.id} restaurant={restaurant} busy={busy} index={index} focused={focused===restaurant.id} onFocus={()=>setFocused(restaurant.id)} onClick={() => onRestaurant(restaurant.id)}/>)}</div> : busy ? <div className="sc-rb-place-grid sc-rb-skeletons" aria-hidden="true">{[0, 1, 2].map(index => <div className="sc-rb-skeleton" key={index}><div/><span/><span/></div>)}</div> : <div className="sc-rb-empty"><span className="sc-rb-empty-symbol" aria-hidden="true">🍽</span><h3>{filtering ? "No matches in these restaurants" : view.status === "needs_address" ? "Choose your delivery address" : "No restaurants returned for this search"}</h3><p>{filtering ? "Try another cuisine or clear your filter. More restaurants may be available below." : view.status === "needs_address" ? "Select a saved address in connections to see nearby restaurants." : "Choose another category above or tell SayCart a different dish. Availability changes with your address and the time."}</p>{filtering ? <button type="button" className="sc-rb-secondary" onClick={() => { setRestaurantQuery(""); setCuisine(""); setFast(false); setTopRated(false); setOpenOnly(false); }}>Clear filters</button> : view.status === "needs_address" ? <button type="button" className="sc-rb-primary" onClick={() => onConnect(provider)}>Choose address<Arrow/></button> : null}</div>}
        {canLoadRestaurants && <div className="sc-rb-more"><button type="button" className="sc-rb-secondary" disabled={busy} onClick={onMoreRestaurants}>{busy ? "Loading…" : "Explore more restaurants"}<Arrow/></button></div>}
      </>}
    </>}
  </section>;
}
