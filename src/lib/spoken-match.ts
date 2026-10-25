import { romanize, soundKey } from "./romanize";

/** Resolving spoken references ("2", "doosra", "Meghana wala", "the pizza one") against what is on screen. */
export const normalizeVoice = (text: string) => text.toLowerCase().normalize("NFKC").replace(/[’']/g, "").replace(/[^\p{L}\p{M}\p{N}₹]+/gu, " ").trim();

const words: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, last: -1,
  ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, pehla: 1, pehli: 1, pehle: 1, dusra: 2, doosra: 2, dusri: 2, dusre: 2, teesra: 3, tisra: 3, teesri: 3, chautha: 4, chauthi: 4, paanchva: 5,
  "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पांच": 5, "पाँच": 5, "पहला": 1, "पहली": 1, "दूसरा": 2, "दूसरी": 2, "तीसरा": 3, "तीसरी": 3, "चौथा": 4, "चौथी": 4, "पांचवां": 5, "आखिरी": -1,
};
/** A list position from "3", "third", "teesra", "number 3", "तीसरा"; -1 means "the last one". */
export function spokenNumber(text: string): number | null {
  const value = normalizeVoice(text).replace(/\b(?:number|no|option|item|restaurant|dish|the|wala|wali|waala|one|vala|नंबर|वाला|वाली)\b/g, " ").replace(/\s+/g, " ").trim();
  if (/^\d{1,3}(?:st|nd|rd|th)?$/.test(value)) return parseInt(value, 10);
  return words[value] ?? null;
}

/** The single entry a spoken reference names, or null when it names none or several. */
export function matchSpoken<T extends { id: string; name: string }>(reference: string, entries: readonly T[]): T | null {
  const number = spokenNumber(reference);
  if (number !== null) return (number === -1 ? entries.at(-1) : entries[number - 1]) ?? null;
  const said = normalizeVoice(reference).replace(/\b(?:wala|wali|waala|vala|ka|ki|ke|the|restaurant|place|menu|dish|item|one|please)\b/g, " ").replace(/\s+/g, " ").trim();
  if (!said) return null;
  const exact = entries.filter(entry => normalizeVoice(entry.name) === said);
  if (exact.length === 1) return exact[0];
  const contained = entries.filter(entry => { const name = normalizeVoice(entry.name); return name.includes(said) || (said.length >= 4 && said.includes(name)); });
  if (contained.length === 1) return contained[0];
  // Word overlap handles reordering and partial names ("chicken biryani boneless", "meghana").
  const tokens = said.split(" ").filter(token => token.length > 1);
  const scored = entries.map(entry => { const name = normalizeVoice(entry.name).split(" "); return { entry, score: tokens.filter(token => name.some(part => part === token || (token.length >= 4 && part.startsWith(token)))).length / Math.max(tokens.length, 1) }; })
    .filter(item => item.score >= 0.5).sort((a, b) => b.score - a.score);
  return scored.length && (scored.length === 1 || scored[0].score > scored[1].score) ? scored[0].entry : null;
}

/** A spoken or tapped delivery-address answer ("ghar pe", "deliver to work", "pehla wala", "Koramangala") → a saved address id. */
export function resolveAddressAnswer(raw: string, addresses: readonly { id: string; label: string; reviewAddressText?: string }[]): string | null {
  if (!addresses.length) return null;
  const synonyms: Record<string, string> = { ghar: "home", "घर": "home", house: "home", office: "work", ofis: "work", ophis: "work", offis: "work", "ऑफिस": "work", "ऑफ़िस": "work", kaam: "work", daftar: "work" };
  let value = normalizeVoice(raw).replace(/\b(?:please|deliver|delivery|it|to|at|on|my|the|is|use|select|choose|address|addresses|location|wala|wali|wale|waala|pe|par|per|mein|me|bhejo|bhej|do|dena|karo|kar|karna|mera|meri|mere|send|order|ka|ki|ke|wahi|yahi|chahiye|hai|one|पे|पर|में|भेजो|वाला|का)\b/g, " ").replace(/\s+/g, " ").trim();
  value = synonyms[value] ?? value;
  if (!value) return null;
  const number = spokenNumber(value);
  if (number) return (number === -1 ? addresses.at(-1) : addresses[number - 1])?.id ?? null;
  const label = addresses.filter(address => normalizeVoice(address.label) === value);
  if (label.length === 1) return label[0].id;
  const named = [...new Set(value.split(" ").map(word => synonyms[word] ?? word).flatMap(word => addresses.filter(address => normalizeVoice(address.label) === word).map(address => address.id)))];
  if (named.length === 1) return named[0];
  const partial = addresses.filter(address => value.length >= 3 && (normalizeVoice(address.label).includes(value) || normalizeVoice(address.reviewAddressText ?? "").includes(value)));
  return partial.length === 1 ? partial[0].id : null;
}

/**
 * The quantity spoken right before an item's name: "do coca cola" → 2, "दो Chicken Biryani" → 2, "three fries" → 3.
 * Null when no number directly precedes a word of that name, so "do you have coke" says nothing about quantity.
 */
export function spokenQuantityFor(text: string, name: string): number | null {
  const words = normalizeVoice(romanize(text)).split(" "), parts = normalizeVoice(name).split(" ").filter(part => part.length >= 3);
  const inName = (word: string | undefined) => !!word && word.length >= 3 && parts.some(part => part === word || (word.length >= 4 && (part.startsWith(word) || word.startsWith(part))));
  for (let index = 0; index < words.length - 1; index++) {
    const count = spokenNumber(words[index]);
    if (count !== null && count > 0 && count <= 20 && inName(words[index + 1])) return count;
  }
  return null;
}

const POSITIONAL = /\b(?:number|no|nambar|first|second|third|fourth|fifth|sixth|last|pehla|pehli|pehle|dusra|doosra|dusri|dusre|teesra|tisra|teesri|chautha|chauthi|paanchva|\d+(?:st|nd|rd|th))\b|नंबर|पहला|पहली|दूसरा|दूसरी|तीसरा|तीसरी|चौथा|चौथी|आखिरी/i;
/** Did the customer refer to a list position ("the first one", "number 2", "teesra")? "do coca cola" is a quantity, not a position. */
export function saidPosition(text: string, position: number): boolean {
  return POSITIONAL.test(text) || normalizeVoice(text).split(" ").includes(String(position));
}

/** Did the customer name this item, in Latin or Devanagari ("पनीर बिरयानी" for "Paneer Biryani", "koka kola" for "Coca-Cola")? */
export function nameSaid(name: string, text: string): boolean {
  const said = normalizeVoice(romanize(text)).split(" ").filter(word => word.length >= 3);
  const parts = normalizeVoice(name).split(" ").filter(part => part.length >= 3 && !/^\d/.test(part));
  const heard = (part: string) => said.some(word => word === part || (word.length >= 4 && part.length >= 4 && word.slice(0, 4) === part.slice(0, 4)) || soundKey(word) === soundKey(part));
  const matched = parts.filter(heard).length;
  return matched > 0 && matched / parts.length >= 0.5;
}
