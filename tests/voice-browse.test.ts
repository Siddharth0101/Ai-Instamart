import assert from "node:assert/strict";
import test from "node:test";
import { mentionedVoiceTarget, prominentVoiceTarget } from "../src/lib/voice-browse";

test("spoken names follow the displayed result, preferring a full dish name over a contained name", () => {
  const targets = [{ id: "short", name: "Paneer" }, { id: "full", name: "Paneer Tikka" }, { id: "other", name: "Dal Makhani" }];
  assert.equal(mentionedVoiceTarget("Try Paneer Tikka, or Dal Makhani.", targets), "full");
  assert.equal(mentionedVoiceTarget("Dal makhani costs ₹200. Paneer Tikka is also available.", targets), "other");
  assert.equal(mentionedVoiceTarget("Try paneerwala today.", targets), null);
  assert.equal(mentionedVoiceTarget("Try a restaurant we have not loaded.", targets), null);
  assert.equal(mentionedVoiceTarget("Kitchen & Co is open.", [{ id: "place", name: "Kitchen & Co" }]), "place");
});

test("duplicate displayed names do not create an arbitrary spoken focus", () => {
  assert.equal(mentionedVoiceTarget("Vegetable Biryani is available.", [{ id: "one", name: "Vegetable Biryani" }, { id: "two", name: "Vegetable Biryani" }]), null);
});

test("viewport focus excludes cards hidden by the header or voice dock and keeps list order for ties", () => {
  const cards = [
    { id: "above", top: 0, bottom: 80 },
    { id: "first", top: 120, bottom: 290 },
    { id: "same-row", top: 120, bottom: 290 },
    { id: "lower", top: 310, bottom: 490 },
    { id: "behind-dock", top: 510, bottom: 700 },
  ];
  assert.equal(prominentVoiceTarget(cards, 100, 500), "first");
  assert.equal(prominentVoiceTarget(cards.map(card => ({ ...card, top: card.top - 200, bottom: card.bottom - 200 })), 100, 500), "lower");
  assert.equal(prominentVoiceTarget(cards, 750, 900), null);
  assert.equal(prominentVoiceTarget(cards, 500, 100), null);
});
