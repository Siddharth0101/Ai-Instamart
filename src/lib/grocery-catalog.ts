/**
 * The Instamart home, built on Swiggy's own product search (the MCP has no category endpoint):
 * every tile and rail is one simple search query, and every product shown is one Swiggy returned.
 */
export type GroceryIcon = "produce" | "dairy" | "bakery" | "eggs" | "chips" | "drink" | "sweet" | "icecream" | "noodles" | "tea" | "staples" | "masala" | "cleaning" | "care";
export type GroceryCategory = { id: string; label: string; query: string; icon: GroceryIcon };

export const GROCERY_CATEGORIES: readonly GroceryCategory[] = [
  { id: "produce", label: "Fruits & Vegetables", query: "vegetables", icon: "produce" },
  { id: "dairy", label: "Dairy & Milk", query: "milk", icon: "dairy" },
  { id: "bakery", label: "Bread & Bakery", query: "bread", icon: "bakery" },
  { id: "eggs", label: "Eggs", query: "eggs", icon: "eggs" },
  { id: "munchies", label: "Munchies", query: "chips", icon: "chips" },
  { id: "drinks", label: "Cold Drinks & Juices", query: "cold drinks", icon: "drink" },
  { id: "sweets", label: "Chocolates & Sweets", query: "chocolate", icon: "sweet" },
  { id: "icecream", label: "Ice Creams", query: "ice cream", icon: "icecream" },
  { id: "instant", label: "Instant Food", query: "instant noodles", icon: "noodles" },
  { id: "tea", label: "Tea & Coffee", query: "tea", icon: "tea" },
  { id: "staples", label: "Atta, Rice & Dal", query: "atta", icon: "staples" },
  { id: "masala", label: "Masala & Oil", query: "masala", icon: "masala" },
  { id: "cleaning", label: "Cleaning Essentials", query: "detergent", icon: "cleaning" },
  { id: "care", label: "Personal Care", query: "shampoo", icon: "care" },
];

export const GROCERY_RAILS: Array<{ label: string; query: string }> = [
  { label: "Daily essentials", query: "milk" },
  { label: "Munchies", query: "chips" },
  { label: "Cold drinks", query: "cold drinks" },
  { label: "Sweet cravings", query: "chocolate" },
];
