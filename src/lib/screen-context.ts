/** What is visible right now, so spoken references ("the second one", "this") match the screen. */
export type RestaurantVoiceContext = { visibleRestaurantIds: string[]; focusedRestaurantId?: string | null };
export type ShoppingVoiceContext = { surface?: "menu" | "offers" | "choices" | "categories"; visibleOfferIds?: string[]; focusedOfferId?: string | null };
