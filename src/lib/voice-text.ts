import { romanize } from "./romanize";

/** Pure text helpers for the realtime voice loop: STT biasing, echo filtering and turn assembly. */
export const DOMAIN_TERMS = ["SayCart", "Swiggy", "Instamart", "Zomato", "biryani", "paneer", "masala", "restaurant", "menu", "checkout", "veg", "non veg"];
export type LanguageHints = { languageCode?: string; secondaryLanguages?: string[] };

const MAX_TERMS = 50, MAX_TERM_LENGTH = 20, LANGUAGE_CODE = /^[a-z]{2,3}$/;
const DANGLING = /(?:\s+(?:and|with|or|of|the|in|n)|[\s'&-]+)$/iu;

export function normalizeWords(text: string): string[] {
  if (typeof text !== "string") return [];
  return text.normalize("NFKC").toLowerCase().replace(/['‘’ʼ]/gu, "").split(/[^\p{L}\p{M}\p{Nd}]+/u).filter(Boolean);
}
const wordKey = (text: string) => normalizeWords(text).join(" ");

function keyterm(raw: unknown): string {
  if (typeof raw !== "string") return "";
  let term = raw.normalize("NFC").replace(/[‘’ʼ`´]/gu, "'").replace(/[‐-―]/gu, "-")
    .replace(/[^\p{L}\p{M}\p{Nd}\s'&-]+/gu, " ").replace(/\s+/gu, " ").replace(/^[\s'&-]+|[\s'&-]+$/gu, "");
  if (term.length > MAX_TERM_LENGTH) {
    let cut = "";
    for (const word of term.split(" ")) { const next = cut ? `${cut} ${word}` : word; if (next.length > MAX_TERM_LENGTH) break; cut = next; }
    // A cut name must not end on a connector ("Chicken Biryani with").
    while (DANGLING.test(cut)) cut = cut.replace(DANGLING, "");
    term = cut;
  }
  return term.length >= 2 && /\p{L}/u.test(term) ? term : "";
}

/** ElevenLabs accepts at most 50 keyterms of up to 20 characters; anything else rejects the whole session. */
export function sanitizeKeyterms(raw: readonly string[], base: readonly string[] = DOMAIN_TERMS): string[] {
  const terms: string[] = [], seen = new Set<string>();
  for (const list of [base, Array.isArray(raw) ? raw : []]) for (const candidate of list) {
    const term = keyterm(candidate), key = wordKey(term);
    if (!term || !key || seen.has(key)) continue;
    seen.add(key); terms.push(term);
    if (terms.length === MAX_TERMS) return terms;
  }
  return terms;
}

/** Keyterms travel in the WebSocket URL; non-Latin names percent-encode to ~9 bytes per character. */
export function fitKeyterms(terms: readonly string[], budget = 3000): string[] {
  const fitted: string[] = [];
  for (const term of terms) { budget -= encodeURIComponent(term).length + 10; if (budget < 0) break; fitted.push(term); }
  return fitted;
}

/** Context sent with the first audio chunk: the end of the text is what the next words continue from. */
export function trimContextText(text: unknown, max = 300): string | undefined {
  if (typeof text !== "string") return undefined;
  const clean = text.replace(/\s+/gu, " ").trim();
  if (clean.length <= max) return clean || undefined;
  const tail = clean.slice(-max);
  return tail.replace(/^\S*\s+/u, "") || tail;
}

export function languageHints(data: unknown): LanguageHints {
  const value = (data && typeof data === "object" ? data : {}) as { languageCode?: unknown; secondaryLanguages?: unknown };
  const languageCode = typeof value.languageCode === "string" && LANGUAGE_CODE.test(value.languageCode) ? value.languageCode : undefined;
  if (!languageCode) return {};
  const secondary = Array.isArray(value.secondaryLanguages) ? value.secondaryLanguages.filter((code): code is string => typeof code === "string" && LANGUAGE_CODE.test(code) && code !== languageCode) : [];
  const secondaryLanguages = [...new Set(secondary)].slice(0, 4);
  return secondaryLanguages.length ? { languageCode, secondaryLanguages } : { languageCode };
}

/** True when heard text is most likely the assistant's own reply leaking back into the microphone. */
export function isLikelyEcho(heard: string, spoken: readonly (string | undefined)[]): boolean {
  // A user can answer in Hindi while the assistant speaks English. Script changes alone
  // are not echo; compare romanized words so food names still receive echo protection.
  const words = normalizeWords(romanize(heard));
  if (!words.length) return true;
  const said = spoken.filter((text): text is string => typeof text === "string" && !!text.trim());
  const known = new Set(said.flatMap(text => normalizeWords(romanize(text))));
  return words.filter(word => known.has(word)).length >= words.length * 0.6;
}

export function meaningfulSpeech(text: string, committed = false): boolean {
  const words = normalizeWords(romanize(text));
  // A completed “no”, “yes”, or “bas” is a real conversational turn. Waiting for its
  // commit avoids cutting off a reply for an unstable one-syllable partial.
  return words.length >= 2 || (words.length === 1 && (
    (words[0].match(/[\p{L}\p{M}]/gu)?.length ?? 0) >= 4 ||
    (committed && /^(?:no|yes|ok|na|ji|bas|ruk)$/.test(words[0]))
  ));
}

export const sameWords = (left: string | undefined, right: string | undefined) => !!left && !!right && wordKey(left) === wordKey(right);

/** One utterance from VAD segments plus the live partial; repeated finals are transport duplicates. */
export function joinSegments(segments: readonly string[], partial = ""): string {
  const parts: string[] = [];
  for (const raw of [...segments, partial]) {
    const part = typeof raw === "string" ? raw.replace(/\s+/gu, " ").trim() : "";
    if (part && !sameWords(part, parts.at(-1))) parts.push(part);
  }
  return parts.join(" ");
}
