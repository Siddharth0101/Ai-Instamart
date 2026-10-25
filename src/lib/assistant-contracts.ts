import { z } from "zod";

export const ProviderIdSchema = z.enum(["instamart", "swiggy_food", "zomato"]);
export const PlanItemSchema = z.object({
  id:z.string(), label:z.string(), query:z.string(), quantity:z.number().int().min(1).max(99).default(1),
  route:z.enum(["instamart","restaurant","undecided"]), status:z.enum(["planned","searching","needs_choice","selected","unavailable","added"]).default("planned"),
  selectedOfferId:z.string().nullable().default(null),
});
export const PartyDetailsSchema = z.object({
  adults:z.number().int().min(0).max(200).nullable().default(null), teens:z.number().int().min(0).max(200).default(0),
  children:z.number().int().min(0).max(200).nullable().default(null), youngerChildren:z.number().int().min(0).max(200).default(0),
  vegetarianAdults:z.number().int().min(0).max(200).nullable().default(null), vegetarianChildren:z.number().int().min(0).max(200).nullable().default(null),
  childAgeBands:z.string().max(100).default(""), childPreferences:z.string().max(300).default(""),
  childPortion:z.number().min(0.25).max(1.5).default(0.75), courses:z.array(z.string().max(60)).max(12).default([]),
  suppliesAlreadyHave:z.string().max(300).default(""),
});
export const DiscoverySchema=z.object({
  kind:z.enum(["meal","snacks"]),mealPeriod:z.enum(["breakfast","lunch","dinner"]),
  periodSource:z.enum(["time","explicit"]),categoryId:z.string().nullable().default(null),
  itemId:z.string().nullable().default(null),stage:z.enum(["categories","items"]),
});
export const ShoppingTaskSchema = z.object({
  kind:z.enum(["undecided","meal","packaged","mixed","party"]).default("undecided"), title:z.string().max(180).default("Your shopping plan"),
  items:z.array(PlanItemSchema).max(30).default([]), people:z.number().int().min(1).max(500).nullable().default(null),
  budgetMinor:z.number().int().min(0).max(50_000_000).nullable().default(null),
  foodIntake:z.boolean().default(false), budgetConfirmed:z.boolean().default(false),
  dietary:z.array(z.string().max(120)).max(20).default([]), preferences:z.string().max(600).default(""),
  eventDate:z.string().max(10).nullable().default(null), serveBy:z.string().max(5).nullable().default(null), timezone:z.string().max(100).default("Asia/Kolkata"),
  party:PartyDetailsSchema.nullable().default(null),
  discovery:DiscoverySchema.nullable().default(null),
  pendingInput:z.enum(["budget","item"]).nullable().default(null),
});
export const MealOfferSchema = z.object({
  id:z.string(), itemId:z.string(), provider:ProviderIdSchema, providerItemId:z.string(), name:z.string(),
  restaurant:z.string().nullable().default(null), unit:z.string(), priceMinor:z.number().int().nonnegative().nullable(),
  imageUrl:z.string().url().optional(), available:z.boolean(), maxQuantity:z.number().int().min(0).optional(),
  etaMinutes:z.number().nonnegative().nullable().default(null), description:z.string().default(""),
  selectable:z.boolean().default(true),
});
export const ProviderStateSchema=z.object({id:ProviderIdSchema,name:z.string(),status:z.enum(["connected","disconnected","access_required","unavailable"]),message:z.string()});
export const RestaurantCardSchema=z.object({
  id:z.string().min(1),provider:z.enum(["swiggy_food","zomato"]),name:z.string(),cuisines:z.array(z.string()).default([]),
  rating:z.number().finite().nullable().default(null),etaMinutes:z.number().nonnegative().nullable().default(null),
  costForTwo:z.string().nullable().default(null),area:z.string().nullable().default(null),imageUrl:z.string().url().optional(),
  isOpen:z.boolean().nullable().default(null),
  distanceKm:z.number().nonnegative().nullable().default(null),
});
export const RestaurantMenuSchema=z.object({
  restaurantId:z.string(),restaurant:RestaurantCardSchema,
  sections:z.array(z.object({id:z.string(),title:z.string(),items:z.array(MealOfferSchema),hasMoreItems:z.boolean().default(false),totalItems:z.number().int().nonnegative().nullable().default(null)})),hasMore:z.boolean(),notices:z.array(z.string()).default([]),
});
export const RestaurantBrowserSchema=z.object({
  itemId:z.string(),restaurants:z.array(RestaurantCardSchema).max(100),selectedRestaurantId:z.string().nullable().default(null),
  menu:RestaurantMenuSchema.nullable().default(null),hasMore:z.boolean().default(false),
});
// `speech` is an optional TTS rendering of `text` (same meaning, speakable script and numbers).
export const AssistantMessageSchema=z.object({id:z.string(),role:z.enum(["user","assistant"]),text:z.string(),speech:z.string().max(2000).optional(),createdAt:z.string()});
export const AgentProposalSchema=z.object({kind:z.enum(["restaurant","offer","menu"]),targetId:z.string(),quantity:z.number().int().min(1).max(99).default(1),text:z.string(),reason:z.string()});
export const PresentationSchema=z.object({kind:z.enum(["choices","bag","connections","address","payment","provider_checkout","plan","close","reset","prepare","review","confirm","end_voice","repeat","browse","more_options","setting","scroll"]),direction:z.enum(["up","down","stop"]).optional(),setting:z.enum(["address","food_address","payment"]).optional(),provider:z.enum(["swiggy_food","zomato"]).optional(),sort:z.enum(["recommended","rating","delivery"]).optional(),query:z.string().max(200).optional(),openOnly:z.boolean().optional(),section:z.string().max(200).optional()});
export const ShoppingVoiceContextSchema=z.strictObject({surface:z.enum(["menu","offers","choices","categories"]).optional(),visibleOfferIds:z.array(z.string().max(600)).max(1000).optional(),focusedOfferId:z.string().max(600).nullable().optional()});
export const AssistantViewSchema=z.object({
  id:z.string(),version:z.number().int().nonnegative(),messages:z.array(AssistantMessageSchema),task:ShoppingTaskSchema,
  questions:z.array(z.object({id:z.string(),text:z.string(),options:z.array(z.string()).default([])})),
  suggestions:z.array(z.string()).max(8),offers:z.array(MealOfferSchema).max(200),providers:z.array(ProviderStateSchema),
  status:z.enum(["idle","clarifying","ready","needs_connection","needs_address","needs_choice","selected","prepared","blocked"]),
  browsePages:z.array(z.object({itemId:z.string(),hasMore:z.boolean(),loaded:z.number().int().nonnegative()})).default([]),
  restaurantBrowser:RestaurantBrowserSchema.nullable().default(null),
  proposal:AgentProposalSchema.nullable().default(null),presentation:PresentationSchema.nullable().default(null),
  notices:z.array(z.string()),updatedAt:z.string(),
});
export const AssistantTurnSchema=z.object({text:z.string().trim().min(1).max(2000),expectedVersion:z.number().int().nonnegative(),retryable:z.boolean().optional(),visibleRestaurantIds:z.array(z.string().max(600)).max(200).optional(),visibleOfferIds:z.array(z.string().max(600)).max(400).optional(),focusedId:z.string().max(600).nullable().optional(),panel:z.string().max(40).nullable().optional(),mobile:z.boolean().optional()});
export const AssistantSelectSchema=z.object({offerId:z.string().min(1).max(600),quantity:z.number().int().min(1).max(99).optional(),expectedVersion:z.number().int().nonnegative()});
export const AssistantCartLineSchema=z.object({offerId:z.string().min(1).max(600),quantity:z.number().int().min(0).max(99),expectedVersion:z.number().int().nonnegative()});
export const AssistantVersionSchema=z.object({expectedVersion:z.number().int().nonnegative()});
export const AssistantMoreSchema=z.strictObject({itemId:z.string().min(1).max(300),expectedVersion:z.number().int().nonnegative()});
export const AssistantRestaurantSchema=z.strictObject({restaurantId:z.string().min(1).max(600),expectedVersion:z.number().int().nonnegative()});
export const AssistantMenuSelectSchema=z.strictObject({offerId:z.string().min(1).max(600),quantity:z.number().int().min(0).max(99),expectedVersion:z.number().int().nonnegative()});
export type RestaurantCard=z.infer<typeof RestaurantCardSchema>;
export type RestaurantMenu=z.infer<typeof RestaurantMenuSchema>;
export type RestaurantBrowser=z.infer<typeof RestaurantBrowserSchema>;
export type Discovery=z.infer<typeof DiscoverySchema>;
export type ShoppingTask=z.infer<typeof ShoppingTaskSchema>;
export type PartyDetails=z.infer<typeof PartyDetailsSchema>;
export type PlanItem=z.infer<typeof PlanItemSchema>;
export type MealOffer=z.infer<typeof MealOfferSchema>;
export type ProviderState=z.infer<typeof ProviderStateSchema>;
export type AssistantMessage=z.infer<typeof AssistantMessageSchema>;
export type AssistantView=z.infer<typeof AssistantViewSchema>;

export type AgentProposal=z.infer<typeof AgentProposalSchema>;
export type Presentation=z.infer<typeof PresentationSchema>;
