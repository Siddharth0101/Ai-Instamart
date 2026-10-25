import type { AssistantView } from "./assistant-contracts";
import type { RestaurantVoiceContext, ShoppingVoiceContext } from "./screen-context";
import type { VoiceContext } from "./conversation-voice-controller";
import { sanitizeKeyterms } from "./voice-text";

/** Recognition follows the food on screen, including after a menu or filter changes. */
export function buildVoiceContext(
  view: AssistantView | null,
  restaurants: RestaurantVoiceContext,
  shopping: ShoppingVoiceContext,
): VoiceContext {
  if (!view) return { keyterms: [] };
  const browser = view.restaurantBrowser;
  const dishes = browser?.menu?.sections.flatMap(section=>section.items) ?? view.offers;
  const matchedDishes = dishes.filter(dish=>shopping.visibleOfferIds?.includes(dish.id));
  // The view commits before React publishes the new menu's visible IDs. Never bias
  // the new microphone connection toward a restaurant that has just been left.
  const visibleDishes = matchedDishes.length ? matchedDishes : dishes;
  const matchedRestaurants = browser?.restaurants.filter(restaurant=>restaurants.visibleRestaurantIds.includes(restaurant.id)) ?? [];
  const visibleRestaurants = matchedRestaurants.length ? matchedRestaurants : browser?.restaurants ?? [];
  const focusedDish = dishes.find(dish=>dish.id===shopping.focusedOfferId);
  const focusedRestaurant = visibleRestaurants.find(restaurant=>restaurant.id===restaurants.focusedRestaurantId);
  return {
    keyterms: sanitizeKeyterms([
      focusedDish?.name, focusedRestaurant?.name, browser?.menu?.restaurant.name,
      ...visibleDishes.map(dish=>dish.name),
      ...visibleRestaurants.map(restaurant=>restaurant.name),
      ...view.questions.flatMap(question=>question.options),
      ...view.task.items.filter(item=>item.selectedOfferId).map(item=>item.label),
      "biryani", "paneer", "roti", "dosa", "Swiggy", "Instamart",
    ].filter((value):value is string=>!!value)),
    previousText: view.messages.findLast(message=>message.role==="assistant")?.text,
  };
}
