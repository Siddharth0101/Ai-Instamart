/** Spoken-reply text cleanup shared by every voice reply. */
const DEVANAGARI = /[\u0900-\u097F]/;
const MAX_SPEECH = 1800;
function clip(value: string, max: number) {
  if (value.length <= max) return value;
  const head = value.slice(0, max + 1);
  let sentence = -1;
  for (const match of head.matchAll(/[.!?।](?=\s|$)/g)) if (match.index < max) sentence = match.index + 1;
  if (sentence >= max / 2) return head.slice(0, sentence).trim();
  const space = head.lastIndexOf(" ", max);
  return head.slice(0, space > max / 2 ? space : max).trim();
}
const unit = (one: string, many: string) => (_: string, amount: string) => `${amount} ${amount === "1" ? one : many}`;

/** Turns display text into words a TTS voice can say naturally. */
export function speakable(text: string): string {
  const rupees = DEVANAGARI.test(text) ? "रुपये" : "rupees";
  const money = (_: string, amount: string) => `${amount.replace(/,/g, "").replace(/\.0+$/, "")} ${rupees}`;
  const lines = text.normalize("NFC")
    .replace(/\[([^\]\n]+)\]\([^)\s]*\)/g, "$1")
    .replace(/\b(?:https?:\/\/|www\.)[^\s<>"“”]*[^\s<>"“”.,;:!?)\]]/gi, " ")
    .split(/\r?\n+/).map(line => line.replace(/^\s*(?:[-*+•◦▪‣⁃●○■]|\d{1,2}[.)])\s+/, "").trim()).filter(Boolean);
  const value = lines.map((line, index) => index < lines.length - 1 && !/[.!?।,:;]$/.test(line) ? `${line}.` : line).join(" ")
    .replace(/(?:₹|\bRs\.?|\bINR)\s*(\d+(?:,\d+)*(?:\.\d+)?)(?:\s*\/-)?/gi, money)
    .replace(/\b(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:rs|inr)(?![a-z])/gi, money)
    .replace(/₹/g, ` ${rupees} `)
    .replace(/(\d)\s*[×xX]\s*(?=\d)/g, "$1 times ")
    .replace(/\b(\d+)\s*[×xX](?=\s)/g, "$1")
    .replace(/×/g, " ")
    .replace(/[“”„‟«»"‘‛]/g, "")
    .replace(/(^|[^\p{L}\p{N}])['’]+|['’]+(?=$|[^\p{L}\p{N}])/gu, "$1")
    .replace(/(\d(?:\.\d+)?)\s*[★⭐]/gu, "$1 stars")
    .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}‍︎️⃣★☆✓]/gu, "")
    .replace(/[*_`#>]+/g, " ")
    .replace(/[•◦▪‣⁃●]/g, ", ")
    .replace(/\s*[~≈]\s*/g, " about ")
    .replace(/\s+&\s+/g, " and ")
    .replace(/\s*[·|]\s*/g, ", ")
    .replace(/\b(\d+)\s?mins?\b/g, unit("minute", "minutes"))
    .replace(/\b(\d+)\s?hrs?\b/g, unit("hour", "hours"))
    .replace(/\b(\d+(?:\.\d+)?)\s?km\b/g, unit("kilometre", "kilometres"))
    .replace(/\b(\d+(?:\.\d+)?)\s?kg\b/g, unit("kilogram", "kilograms"))
    .replace(/\b(\d+(?:\.\d+)?)\s?(?:g|gm|gms)\b/g, unit("gram", "grams"))
    .replace(/\b(\d+(?:\.\d+)?)\s?ml\b/g, unit("millilitre", "millilitres"))
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?।])/g, "$1")
    .replace(/([,;:])(?:\s*[,;:])+/g, "$1")
    .replace(/[,;:]+(?=\s*(?:[.!?।]|$))/g, "")
    .replace(/^[\s,;:.!?।-]+/, "")
    .trim();
  return clip(value, MAX_SPEECH);
}
