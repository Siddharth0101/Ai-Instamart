import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SayCart — Everyday shopping, effortlessly.",
  description: "A voice shopping assistant for Swiggy Instamart. Speak your list, review your cart, and stay in control of checkout.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
