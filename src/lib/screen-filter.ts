import type { MealOffer, RestaurantCard } from "./assistant-contracts";

/** One filter rule for the page and the agent, so what the agent says matches what the customer sees. */
export const restaurantMatches = (restaurant: RestaurantCard, query: string) => {
  const value = query.trim().toLocaleLowerCase();
  return !value || [restaurant.name, restaurant.area, ...restaurant.cuisines].filter(Boolean).join(" ").toLocaleLowerCase().includes(value);
};
export const dishMatches = (offer: MealOffer, query: string) => {
  const value = query.trim().toLocaleLowerCase();
  return !value || `${offer.name} ${offer.description}`.toLocaleLowerCase().includes(value);
};

export type RestaurantSort = "recommended" | "rating" | "delivery";
export function sortRestaurants<T extends RestaurantCard>(list: T[], sort: RestaurantSort) {
  if (sort === "rating") list.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
  if (sort === "delivery") list.sort((a, b) => (a.etaMinutes ?? Infinity) - (b.etaMinutes ?? Infinity));
  return list;
}
