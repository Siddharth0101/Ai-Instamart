import { normalizeVoice } from "./spoken-match";

/** Follow only names that were actually returned by the current filtered view. */
export function mentionedVoiceTarget(text: string, targets: readonly { id: string; name: string }[]): string | null {
  const spoken = ` ${normalizeVoice(text)} `;
  const matches = targets.flatMap(target => {
    const name = normalizeVoice(target.name);
    const index = name ? spoken.indexOf(` ${name} `) : -1;
    return index < 0 ? [] : [{ id: target.id, index, length: name.length }];
  }).sort((a, b) => a.index - b.index || b.length - a.length);
  if (!matches.length) return null;
  // A generic dish name inside a longer dish name must not win the highlight.
  const first = matches[0];
  if (matches.some(match => match.id !== first.id && match.index === first.index && match.length === first.length)) return null;
  return first.id;
}

type ViewportTarget = { id: string; top: number; bottom: number };
/** Numbering belongs to the entire filtered list; only “this one” follows the viewport. */
export function prominentVoiceTarget(targets: readonly ViewportTarget[], top: number, bottom: number): string | null {
  if (bottom <= top) return null;
  const anchor = top + (bottom - top) * 0.3;
  const visible = targets.filter(target => target.bottom > top && target.top < bottom && target.bottom > target.top);
  visible.sort((a, b) => {
    const distance = (target: ViewportTarget) => Math.abs((Math.max(top, target.top) + Math.min(bottom, target.bottom)) / 2 - anchor);
    return distance(a) - distance(b);
  });
  return visible[0]?.id ?? null;
}
