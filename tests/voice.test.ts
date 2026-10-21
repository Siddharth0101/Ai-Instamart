import test from "node:test";
import assert from "node:assert/strict";
import { createRealtimeTranscriptionToken, synthesizeSpeech, VoiceError } from "../src/server/voice";

function wav(seconds = 1) {
  const samples = 16_000 * seconds;
  const bytes = Buffer.alloc(44 + samples * 2);
  bytes.write("RIFF", 0); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write("WAVE", 8);
  bytes.write("fmt ", 12); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(16_000, 24); bytes.writeUInt32LE(32_000, 28);
  bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36); bytes.writeUInt32LE(samples * 2, 40);
  return bytes;
}
const isVoiceError = (code: string, status?: number) => (error: unknown) => error instanceof VoiceError && error.code === code && (status === undefined || error.status === status);
let previousSpeechURL: string | undefined;
let previousSpeechKey: string | undefined;
test.beforeEach(() => {
  previousSpeechURL = process.env.KOKORO_URL;
  previousSpeechKey = process.env.ELEVENLABS_API_KEY;
  process.env.KOKORO_URL = "http://127.0.0.1:8880";
  process.env.ELEVENLABS_API_KEY = "test-key-not-a-credential";
});
test.afterEach(() => {
  if (previousSpeechURL === undefined) delete process.env.KOKORO_URL; else process.env.KOKORO_URL = previousSpeechURL;
  if (previousSpeechKey === undefined) delete process.env.ELEVENLABS_API_KEY; else process.env.ELEVENLABS_API_KEY = previousSpeechKey;
});

const audioResponse = () => new Response(wav(), { headers: { "content-type": "audio/wav" } });

test("cancelled voice work and invalid inputs never contact speech services", async t => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return audioResponse(); });
  const controller = new AbortController(); controller.abort();
  await assert.rejects(synthesizeSpeech("Hello", controller.signal), isVoiceError("VOICE_STOPPED", 409));
  await assert.rejects(synthesizeSpeech(" "), isVoiceError("SPEECH_TEXT_INVALID", 400));
  await assert.rejects(synthesizeSpeech("x".repeat(1801)), isVoiceError("SPEECH_TEXT_INVALID", 400));
  assert.equal(calls, 0);
});

test("rejected TTS responses cancel their body, including header and streamed size limits", async t => {
  for (const variant of ["status", "type", "length", "stream"] as const) {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) { if (variant === "stream") controller.enqueue(new Uint8Array(8 * 1024 * 1024 + 1)); },
      cancel() { cancelled = true; },
    });
    t.mock.method(globalThis, "fetch", async () => new Response(stream, {
      status: variant === "status" ? 503 : 200,
      headers: { "content-type": variant === "type" ? "application/json" : "audio/wav", ...(variant === "length" ? { "content-length": String(8 * 1024 * 1024 + 1) } : {}) },
    }));
    const code = variant === "status" ? "TTS_UNAVAILABLE" : variant === "type" ? "TTS_RESPONSE_INVALID" : "VOICE_RESPONSE_TOO_LARGE";
    await assert.rejects(synthesizeSpeech("A test reply."), isVoiceError(code));
    assert.equal(cancelled, true, `${variant} response must release its stream`);
    t.mock.restoreAll();
  }
});

test("speech jobs are bounded and aborted work releases capacity", async t => {
  const pending: Array<(value: Response) => void> = [];
  t.mock.method(globalThis, "fetch", async (_input: unknown, init?: RequestInit) => new Promise<Response>((resolve, reject) => {
    pending.push(resolve);
    init?.signal?.addEventListener("abort", () => reject(new DOMException("Stopped", "AbortError")), { once: true });
  }));
  const controller = new AbortController();
  const first = synthesizeSpeech("First reply", controller.signal);
  const second = synthesizeSpeech("Second reply");
  await assert.rejects(synthesizeSpeech("Third reply"), isVoiceError("VOICE_BUSY", 429));
  assert.equal(pending.length, 2);
  controller.abort();
  await assert.rejects(first, isVoiceError("VOICE_STOPPED", 409));
  const replacement = synthesizeSpeech("Replacement reply");
  assert.equal(pending.length, 3);
  pending[1](audioResponse()); pending[2](audioResponse());
  for (const result of await Promise.all([second, replacement])) {
    assert.equal(result.contentType, "audio/wav");
    assert.deepEqual(Buffer.from(result.audio), wav());
  }
});

test("realtime dictation requests a one-use token without exposing the server key", async t => {
  t.mock.method(globalThis, "fetch", async (url: unknown, init?: RequestInit) => {
    assert.equal(url, "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe");
    assert.equal(init?.method, "POST");
    assert.equal(new Headers(init?.headers).get("xi-api-key"), "test-key-not-a-credential");
    assert.equal(init?.cache, "no-store");
    assert.equal(init?.redirect, "error");
    return Response.json({ token: "single-use-test-token", extra: "not returned" });
  });
  assert.deepEqual(await createRealtimeTranscriptionToken(), { token: "single-use-test-token" });
});

test("unconfigured or cancelled realtime dictation never contacts ElevenLabs", async t => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return Response.json({ token: "test" }); });
  const controller = new AbortController(); controller.abort();
  await assert.rejects(createRealtimeTranscriptionToken(controller.signal), isVoiceError("VOICE_STOPPED", 409));
  process.env.ELEVENLABS_API_KEY = " ";
  await assert.rejects(createRealtimeTranscriptionToken(), isVoiceError("ELEVENLABS_NOT_CONFIGURED", 503));
  assert.equal(calls, 0);
});

test("realtime dictation maps provider rejections and releases their response streams", async t => {
  for (const [status, code, expectedStatus] of [
    [401, "ELEVENLABS_AUTH_INVALID", 503],
    [403, "ELEVENLABS_AUTH_INVALID", 503],
    [429, "ELEVENLABS_RATE_LIMITED", 429],
    [500, "ELEVENLABS_UNAVAILABLE", 503],
  ] as const) {
    let cancelled = false;
    t.mock.method(globalThis, "fetch", async () => new Response(new ReadableStream({ cancel() { cancelled = true; } }), { status }));
    await assert.rejects(createRealtimeTranscriptionToken(), isVoiceError(code, expectedStatus));
    assert.equal(cancelled, true, `${status} response must release its stream`);
    t.mock.restoreAll();
  }
});

test("realtime dictation rejects malformed and oversized credentials", async t => {
  for (const body of ["not JSON", "", JSON.stringify({ token: "" }), JSON.stringify({ token: "x".repeat(8193) })]) {
    t.mock.method(globalThis, "fetch", async () => new Response(body));
    await assert.rejects(createRealtimeTranscriptionToken(), isVoiceError("ELEVENLABS_INVALID_RESPONSE", 502));
    t.mock.restoreAll();
  }
  let cancelled = false;
  t.mock.method(globalThis, "fetch", async () => new Response(new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new Uint8Array(16 * 1024 + 1)); },
    cancel() { cancelled = true; },
  })));
  await assert.rejects(createRealtimeTranscriptionToken(), isVoiceError("VOICE_RESPONSE_TOO_LARGE", 502));
  assert.equal(cancelled, true);
});

test("realtime token requests are bounded and cancellation releases capacity", async t => {
  const pending: Array<(value: Response) => void> = [];
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => new Promise<Response>((resolve, reject) => {
    pending.push(resolve);
    init?.signal?.addEventListener("abort", () => reject(new DOMException("Stopped", "AbortError")), { once: true });
  }));
  const controller = new AbortController();
  const first = createRealtimeTranscriptionToken(controller.signal);
  const second = createRealtimeTranscriptionToken();
  await assert.rejects(createRealtimeTranscriptionToken(), isVoiceError("VOICE_BUSY", 429));
  assert.equal(pending.length, 2);
  controller.abort();
  await assert.rejects(first, isVoiceError("VOICE_STOPPED", 409));
  const replacement = createRealtimeTranscriptionToken();
  assert.equal(pending.length, 3);
  pending[1](Response.json({ token: "second" })); pending[2](Response.json({ token: "replacement" }));
  assert.deepEqual(await Promise.all([second, replacement]), [{ token: "second" }, { token: "replacement" }]);
});

