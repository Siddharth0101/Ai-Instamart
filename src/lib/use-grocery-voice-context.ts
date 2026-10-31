"use client";

import { useEffect, useRef, useState } from "react";
import type { ShoppingVoiceContext } from "./screen-context";
import { prominentVoiceTarget } from "./voice-browse";

/** Publish the cards actually rendered by rails or an aisle, including their cart identities. */
export function useGroceryVoiceContext(screen: string | null, version: number | undefined, voiceActive: boolean, publish: (context: ShoppingVoiceContext) => void) {
  const [focused, setFocused] = useState<string | null>(null);
  const lastFocused = useRef<string | null>(null);
  useEffect(() => {
    if (!screen) { publish({}); lastFocused.current = null; setFocused(null); return; }
    const root = document.getElementById("saycart-main");
    if (!root) return;
    let frame: number | null = null, current = lastFocused.current;
    const cards = () => Array.from(root.querySelectorAll<HTMLElement>(".sc-grocery-card[data-voice-offer]"));
    const update = (preferred?: string) => {
      const nodes = cards();
      const ids = [...new Set(nodes.map(node => node.dataset.voiceOffer!))];
      const top = Math.max(0, document.querySelector(".sc-header")?.getBoundingClientRect().bottom ?? 0) + 16;
      const bottom = Math.min(innerHeight, document.getElementById("voice-panel")?.getBoundingClientRect().top ?? innerHeight) - 16;
      const targets = nodes.flatMap(node => { const rect = node.getBoundingClientRect(); return rect.right > 0 && rect.left < innerWidth ? [{ id: node.dataset.voiceOffer!, top: rect.top, bottom: rect.bottom }] : []; });
      current = preferred && ids.includes(preferred) ? preferred
        : targets.some(target => target.id === current && target.top < bottom && target.bottom > top) ? current
        : prominentVoiceTarget(targets, top, bottom);
      lastFocused.current = current; setFocused(current);
      publish({ surface: "offers", visibleOfferIds: ids, focusedOfferId: current });
    };
    const schedule = () => { if (frame === null) frame = requestAnimationFrame(() => { frame = null; if (!document.querySelector("dialog[open]")) update(); }); };
    const point = (event: Event) => {
      const card = event.target instanceof Element ? event.target.closest<HTMLElement>(".sc-grocery-card[data-voice-offer]") : null;
      if (card) update(card.dataset.voiceOffer);
    };
    update();
    root.addEventListener("mouseover", point); root.addEventListener("focusin", point);
    if (voiceActive) { window.addEventListener("scroll", schedule, { passive: true }); window.addEventListener("resize", schedule); root.addEventListener("scroll", schedule, { passive: true, capture: true }); }
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      root.removeEventListener("mouseover", point); root.removeEventListener("focusin", point);
      window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); root.removeEventListener("scroll", schedule, { capture: true });
    };
  }, [screen, version, voiceActive, publish]);
  return focused;
}
