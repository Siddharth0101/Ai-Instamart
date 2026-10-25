import type { AssistantView } from "./assistant-contracts";

/** Resume only a saved, explicit category; ordinary page loads never choose food. */
export function shouldResumeDiscovery(view:AssistantView,force=false):boolean{
  const discovery=view.task.discovery;
  // The Instamart home is several rails rather than one item; it resumes the same way, e.g. after connecting Instamart.
  if(discovery?.kind==="snacks"&&discovery.stage==="items"&&discovery.categoryId==="home"&&!discovery.itemId&&!view.task.pendingInput){
    if(!view.providers.some(entry=>entry.id==="instamart"&&entry.status==="connected"))return false;
    return force||!view.offers.some(offer=>offer.provider==="instamart")&&["needs_connection","needs_address","ready"].includes(view.status);
  }
  if(!discovery||discovery.stage!=="items"||!discovery.itemId||view.task.pendingInput)return false;
  const item=view.task.items.find(item=>item.id===discovery.itemId);
  if(!item||item.status==="added"||item.route==="undecided")return false;
  const provider=item.route==="instamart"?"instamart":"swiggy_food";
  if(!view.providers.some(entry=>entry.id===provider&&entry.status==="connected"))return false;
  if(!force&&view.restaurantBrowser?.itemId===item.id&&view.restaurantBrowser.restaurants.length)return false;
  return force||!view.offers.some(offer=>offer.itemId===item.id)&&["needs_connection","needs_address","ready"].includes(view.status);
}
