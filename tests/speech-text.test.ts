import { test } from "node:test";
import assert from "node:assert/strict";
import { speakable } from "../src/server/speech-text";

test("speakable turns display symbols into words a voice can say", () => {
  assert.equal(speakable("Total ₹1,250.50 today"), "Total 1250.50 rupees today");
  assert.equal(speakable("Budget Rs 500, Rs. 750 and INR 900 or 300 Rs. Fine."), "Budget 500 rupees, 750 rupees and 900 rupees or 300 rupees. Fine.");
  assert.equal(speakable("Final total ₹1234.00, including fees."), "Final total 1234 rupees, including fees.");
  assert.equal(speakable("कुल ₹500 है।"), "कुल 500 रुपये है।");
  assert.equal(speakable("Your plan now has 2 × Veg Biryani and 3 x Naan."), "Your plan now has 2 Veg Biryani and 3 Naan.");
  assert.equal(speakable("Say “review my choices” or 'place this order' — I’ll keep Domino’s."), "Say review my choices or place this order — I’ll keep Domino’s.");
  assert.equal(speakable("Great choice 🍕🔥! ❤️ 👍🏽"), "Great choice!");
  assert.equal(speakable("Complete payment using the link https://pay.example/abc?x=1. Or visit www.example.com now."), "Complete payment using the link. Or visit now.");
  assert.equal(speakable("~30 min away · 4.2★ | Open now & ready"), "about 30 minutes away, 4.2 stars, Open now and ready");
  assert.equal(speakable("**Paneer** _tikka_ `code` # Title > quote"), "Paneer tikka code Title quote");
  assert.equal(speakable("• Chips 50 g\n• Juice 200 ml"), "Chips 50 grams. Juice 200 millilitres");
  const long = speakable("This is a complete sentence. ".repeat(100));
  assert.ok(long.length <= 1800 && long.endsWith("sentence."), "long replies end on a sentence boundary");
  assert.equal(speakable("x".repeat(2500)).length, 1800);
});
