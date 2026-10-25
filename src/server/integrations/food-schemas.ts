import { z } from "zod";
import { SwiggyAddressesSchema } from "./swiggy-schemas";

/** Provider DTOs verified against the official Food reference, 22 October 2026.
 * https://mcp.swiggy.com/builders/docs/reference/food/search_menu/
 * Optional provider values remain optional: absence is not availability or ₹0.
 */
const id = z.string().min(1).max(300);
const money = z.number().finite().nonnegative();
const flag = z.number().int().min(0).max(1);
const query = z.string().trim().min(1).max(200);
const image = z.string().url().optional();
const variation = z.object({
  name:z.string().optional(), price:money.optional(), isVeg:z.boolean().optional(),
  id:id.optional(), groupId:id.optional(), default:flag.optional(), inStock:flag.optional(),
}).passthrough();

export const FoodMenuItemSchema = z.object({
  name:z.string().min(1), price:money.optional(), isVeg:z.boolean().optional(),
  menu_item_id:id.optional(), inStock:flag.optional(), restaurant_id:id.optional(),
  restaurant_name:z.string().optional(), imageUrl:image, rating:z.union([z.string(),z.number().finite()]).optional(),
  totalRatings:z.string().optional(), hasVariants:z.boolean().optional(), hasAddons:z.boolean().optional(),
  isBestseller:z.boolean().optional(), variations:z.array(variation).max(200).optional(),
  variantsV2:z.array(z.object({groupId:id,name:z.string(),variations:z.array(z.object({
    id,name:z.string(),price:money.optional(),inStock:flag.optional(),default:flag.optional(),
  }).passthrough()).max(200)}).passthrough()).max(100).optional(),
  addons:z.array(z.object({
    groupId:id,groupName:z.string(),minAddons:z.number().int().nonnegative().optional(),
    maxAddons:z.number().int().nonnegative().optional(),maxFreeAddons:z.number().int().nonnegative().optional(),
    choices:z.array(z.object({id,name:z.string(),price:money}).passthrough()).max(200),
  }).passthrough()).max(100).optional(),
}).passthrough();

export const FoodSearchMenuSchema = z.object({
  items:z.array(FoodMenuItemSchema).max(1000), query:z.string(), restaurantIdOfAddedItem:id.optional(),
  totalItems:z.number().int().nonnegative(),hasMore:z.boolean(),nextOffset:z.number().int().nonnegative().optional(),
}).passthrough();
export const FoodSearchRestaurantsSchema = z.object({
  restaurants:z.array(z.object({
    id:id.optional(),name:z.string(),cuisines:z.array(z.string()),avgRating:z.number().finite().optional(),
    totalRatings:z.string().optional(),costForTwo:z.string().optional(),areaName:z.string().optional(),
    distanceKm:z.number().finite().nonnegative().optional(),deliveryTimeMinutes:z.number().finite().nonnegative().optional(),
    deliveryTimeRange:z.string().optional(),veg:z.boolean().optional(),offer:z.string().optional(),imageUrl:image,
    availabilityStatus:z.string().optional(),nextOpenTime:z.string().optional(),
  }).passthrough()).max(1000),
  dishes:z.array(z.object({
    id:id.optional(),name:z.string(),price:money.optional(),isVeg:z.boolean().optional(),description:z.string().optional(),
    imageUrl:image,category:z.string().optional(),inStock:z.boolean().optional(),restaurantId:id.optional(),
    restaurantName:z.string().optional(),restaurantRating:z.number().finite().optional(),restaurantAreaName:z.string().optional(),
    deliveryTimeMinutes:z.number().finite().nonnegative().optional(),
  }).passthrough()).max(1000),
  nextOffset:z.union([z.string(),z.number().finite()]).optional(),query:z.string(),
  totalRestaurants:z.number().int().nonnegative().optional(),hasMore:z.boolean().optional(),
}).passthrough();
export const FoodMenuCategorySchema = z.object({
  title:z.string(),categoryId:id.optional(),imageUrl:image,totalItems:z.number().int().nonnegative().optional(),
  hasMoreItems:z.boolean().optional(),items:z.array(z.object({
    id,name:z.string(),description:z.string().optional(),price:money.optional(),inStock:flag.optional(),
    isVeg:z.boolean().optional(),isBestseller:z.boolean().optional(),rating:z.string().optional(),
    imageUrl:image,hasVariants:z.boolean().optional(),hasAddons:z.boolean().optional(),
  }).passthrough()).max(100),
}).passthrough();
export const FoodRestaurantMenuSchema = z.object({
  restaurant:z.object({
    id,name:z.string(),city:z.string().optional(),areaName:z.string().optional(),cuisines:z.array(z.string()).optional(),
    avgRating:z.number().finite().optional(),avgRatingString:z.string().optional(),totalRatingsString:z.string().optional(),
    costForTwoMessage:z.string().optional(),isOpen:z.boolean().optional(),deliveryTime:z.number().finite().nonnegative().optional(),
    slaString:z.string().optional(),address:z.string().optional(),imageUrl:image,
  }).passthrough(),
  categories:z.array(z.union([FoodMenuCategorySchema,z.object({title:z.string(),categoryId:id.optional(),imageUrl:image,
    subcategories:z.array(FoodMenuCategorySchema).max(100),totalSubcategories:z.number().int().nonnegative().optional(),
  }).passthrough()])).max(100),
  totalCategories:z.number().int().nonnegative(),page:z.number().int().positive(),
  pageSize:z.number().int().positive(),hasMore:z.boolean(),
}).passthrough();

// This adapter deliberately accepts saved Food addresses only. It does not infer
// client coordinates or forward arbitrary model-authored provider arguments.
export const FoodReadArguments = {
  get_addresses:z.strictObject({page:z.number().int().positive().optional(),pageSize:z.number().int().min(1).max(10).optional(),selectedAddressId:id.optional(),explicitAddressId:id.optional()}),
  search_menu:z.strictObject({query,addressId:id,restaurantIdOfAddedItem:id.optional(),vegFilter:z.union([z.literal(0),z.literal(1)]).optional(),offset:z.number().int().nonnegative().optional()}),
  search_restaurants:z.strictObject({query,addressId:id,offset:z.number().int().nonnegative().optional()}),
  get_restaurant_menu:z.strictObject({restaurantId:id,addressId:id,page:z.number().int().positive().optional(),pageSize:z.number().int().min(1).max(8).optional()}),
};
export const FoodReadResponseSchemas = {
  get_addresses:SwiggyAddressesSchema,
  search_menu:FoodSearchMenuSchema,
  search_restaurants:FoodSearchRestaurantsSchema,
  get_restaurant_menu:FoodRestaurantMenuSchema,
};
export type FoodReadTool = keyof typeof FoodReadArguments;
export type FoodMenuItem = z.infer<typeof FoodMenuItemSchema>;
export type FoodSearchMenu = z.infer<typeof FoodSearchMenuSchema>;
