export type CatalogCategory = {
  id: string;
  label: string;
  emoji: string;
  color: string;
  baseQuery: string;
  scopeTerm: string;
};

export const catalogCategories: readonly CatalogCategory[] = [
  { id: "dairy", label: "Dairy & eggs", emoji: "🥛", color: "#edf1e6", baseQuery: "milk", scopeTerm: "dairy" },
  { id: "fruit-veg", label: "Fruit & veg", emoji: "🥑", color: "#e8edd9", baseQuery: "fruits", scopeTerm: "fruits vegetables" },
  { id: "snacks", label: "Snacks", emoji: "🍿", color: "#fae9d6", baseQuery: "snacks", scopeTerm: "snacks" },
  { id: "drinks", label: "Drinks", emoji: "🧃", color: "#f2e9ce", baseQuery: "juice", scopeTerm: "drinks" },
  { id: "pantry", label: "Pantry", emoji: "🌾", color: "#ece6dc", baseQuery: "atta", scopeTerm: "pantry" },
  { id: "bakery", label: "Bakery", emoji: "🥐", color: "#f5e5d4", baseQuery: "bread", scopeTerm: "bakery" },
  { id: "personal-care", label: "Personal care", emoji: "🧴", color: "#e8e6f0", baseQuery: "shampoo", scopeTerm: "personal care" },
  { id: "home-care", label: "Home care", emoji: "🧽", color: "#e3efeb", baseQuery: "detergent", scopeTerm: "home care" },
  { id: "baby-care", label: "Baby care", emoji: "🧸", color: "#f4e8e4", baseQuery: "diapers", scopeTerm: "baby care" },
  { id: "pet-care", label: "Pet care", emoji: "🐾", color: "#ebe9dc", baseQuery: "pet food", scopeTerm: "pet care" },
  { id: "electronics", label: "Electronics", emoji: "🎧", color: "#e7e9f0", baseQuery: "headphones", scopeTerm: "electronics" },
  { id: "beauty", label: "Beauty", emoji: "💄", color: "#f5e5e8", baseQuery: "skincare", scopeTerm: "beauty" },
];

function containsScopePhrase(text: string, phrase: string): boolean {
  const words = (value: string) => value.normalize("NFKC").toLowerCase().match(/[\p{L}\p{M}\p{N}_]+/gu) ?? [];
  const textWords = words(text);
  const scopeWords = words(phrase);
  return scopeWords.length > 0 && textWords.some((_, start) =>
    scopeWords.every((word, offset) => textWords[start + offset] === word)
  );
}

/** Category context becomes a provider search phrase, not an inferred product filter. */
export function composeCatalogQuery(text: string, category?: CatalogCategory | null): string {
  const draft = text.trim().replace(/\s+/gu, " ");
  const query = !draft && category
    ? category.baseQuery
    : category && !containsScopePhrase(draft, category.scopeTerm)
      ? `${draft} ${category.scopeTerm}`
      : draft;

  if (!query) throw new Error("Enter a product, brand or description to search.");
  if (query.length > 200) throw new Error("Use 200 characters or fewer, including the category.");
  return query;
}
