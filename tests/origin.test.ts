import assert from "node:assert/strict";
import test from "node:test";
import { localPageRedirects } from "../src/server/origin";

test("local page aliases redirect to the configured origin before cookie creation", () => {
  const [rule] = localPageRedirects("http://127.0.0.1:3000", true);
  assert.equal(rule.destination, "http://127.0.0.1:3000/");
  assert.equal(rule.permanent, false);
  assert.deepEqual(rule.has, [{ type: "header", key: "host", value: "localhost:3000" }]);
  const [reverse] = localPageRedirects("http://localhost:4000", true);
  assert.equal(reverse.destination, "http://localhost:4000/");
  assert.equal(reverse.has[0].value, "127\\.0\\.0\\.1:4000");
});

test("canonical redirects target only the root page and exact alternate host/port", () => {
  const [rule] = localPageRedirects("http://127.0.0.1:3000", true);
  assert.equal(rule.source, "/"); // APIs, including OAuth callbacks, are excluded.
  const host = new RegExp(`^(?:${rule.has[0].value})$`);
  assert.ok(host.test("localhost:3000"));
  for (const untrusted of ["127.0.0.1:3000", "localhost:3001", "evil.example:3000", "localhost.evil.example:3000", "localhost:3000@evil.example", "localhost:3000,evil.example"]) {
    assert.equal(host.test(untrusted), false);
  }
  const [reverse] = localPageRedirects("http://localhost:4000", true);
  assert.equal(new RegExp(`^(?:${reverse.has[0].value})$`).test("127x0x0x1:4000"), false);
});

test("production and nonlocal configured origins keep their existing strict behavior", () => {
  for (const origin of ["https://shop.example", "http://192.168.1.2:3000", "https://127.0.0.1:3000"]) {
    assert.deepEqual(localPageRedirects(origin, true), []);
  }
  assert.deepEqual(localPageRedirects("http://127.0.0.1:3000", false), []);
});
