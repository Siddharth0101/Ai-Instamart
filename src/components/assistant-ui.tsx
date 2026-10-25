"use client";

import { useEffect, useRef, type ReactNode } from "react";

export type IconName = "arrow" | "mic" | "bag" | "plus" | "close" | "check" | "pin" | "chevron" | "spark" | "refresh" | "pause" | "volume" | "edit" | "clock" | "users" | "link" | "stop" | "undo" | "bike" | "pot" | "home" | "repeat";
const paths: Record<IconName, ReactNode> = {
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  mic: <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11v1a7 7 0 0 0 14 0v-1M12 19v3m-4 0h8"/></>,
  bag: <><path d="m5 8-1 13h16L19 8ZM9 8V6a3 3 0 0 1 6 0v2"/></>,
  plus: <path d="M12 5v14M5 12h14"/>, close: <path d="m6 6 12 12M18 6 6 18"/>, check: <path d="m5 12 4 4L19 6"/>,
  pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  chevron: <path d="m8 10 4 4 4-4"/>, spark: <><path d="m12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3ZM20 2v4M18 4h4"/></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-2l2 3M4 16l2 3a7 7 0 0 0 12-2"/></>,
  pause: <path d="M8 5v14M16 5v14"/>, volume: <><path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/></>,
  edit: <><path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14ZM3 22h18"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-4-5"/></>,
  link: <><path d="m10 13 4-4M8 16l-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M14 8l2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/></>,
  stop: <rect x="5" y="5" width="14" height="14" rx="3"/>,
  undo: <path d="M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-4"/>,
  bike: <><circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17h7l3-7h3M13 17l-3-8H7M15 6h3"/></>,
  pot: <><path d="M5 11h14v4a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5ZM3 11h18M9 7c0-2 2-2 2-4M14 7c0-2 2-2 2-4"/></>,
  home: <path d="M4 11 12 4l8 7v9H4ZM10 20v-6h4v6"/>,
  repeat: <><path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/></>,
};
export function Glyph({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
export const money = (minor: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: minor % 100 ? 2 : 0 }).format(minor / 100);

export function Sheet({ title, subtitle, onClose, children, accessory, wide = false }: { accessory?:ReactNode; title: string; subtitle?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => { dialog?.close(); document.body.style.overflow = ""; previous?.focus(); };
  }, []);
  return <dialog ref={ref} className={`sc-dialog ${wide ? "sc-dialog-wide" : ""}`} aria-labelledby="sc-dialog-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}>
    <div className="sc-dialog-heading"><div><span className="sc-eyebrow">SAYCART</span><h2 id="sc-dialog-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button type="button" autoFocus className="sc-icon" aria-label={`Close ${title}`} onClick={onClose}><Glyph name="close"/></button></div>{accessory}{children}
  </dialog>;
}
