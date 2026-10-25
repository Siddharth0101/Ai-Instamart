import test from "node:test";
import assert from "node:assert/strict";
import { createRealtimeTranscriptionToken, speechToTextSettings, synthesizeSpeech, VoiceError } from "../src/server/voice";

// A provider response fixture, not synthesized speech or an audio quality test.
const mp3 = () => Buffer.concat([Buffer.from("ID3"), Buffer.alloc(61)]);
const isVoiceError = (code: string, status?: number) => (error: unknown) => error instanceof VoiceError && error.code === code && (status === undefined || error.status === status);
let previousSpeechKey: string | undefined;
test.beforeEach(() => {
  previousSpeechKey = process.env.ELEVENLABS_API_KEY;
  process.env.ELEVENLABS_API_KEY = "test-key-not-a-credential";
});
test.afterEach(() => {
  if (previousSpeechKey === undefined) delete process.env.ELEVENLABS_API_KEY; else process.env.ELEVENLABS_API_KEY = previousSpeechKey;
});

const audioResponse = () => new Response(mp3(), { headers: { "content-type": "audio/mpeg" } });

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
      headers: { "content-type": variant === "type" ? "application/json" : "audio/mpeg", ...(variant === "length" ? { "content-length": String(8 * 1024 * 1024 + 1) } : {}) },
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
    assert.equal(result.contentType, "audio/mpeg");
    assert.deepEqual(Buffer.from(result.audio), mp3());
  }
});

test("a stalled speech request is overtaken by one backup request, and the slow one is cancelled", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let calls = 0, stalledAborted = false;
  t.mock.method(globalThis, "fetch", async (_input: unknown, init?: RequestInit) => {
    if (++calls === 1) return new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener("abort", () => { stalledAborted = true; reject(new DOMException("Stopped", "AbortError")); }, { once: true }));
    return audioResponse();
  });
  const speaking = synthesizeSpeech("Slow reply");
  await Promise.resolve(); t.mock.timers.tick(2500);
  const result = await speaking;
  assert.deepEqual(Buffer.from(result.audio), mp3());
  assert.equal(calls, 2); assert.equal(stalledAborted, true);
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


test("ElevenLabs TTS sends only stored reply text and a server credential to the fixed endpoint", async t => {
  t.mock.method(globalThis, "fetch", async (url: unknown, init?: RequestInit) => {
    assert.match(String(url), /^https:\/\/api\.elevenlabs\.io\/v1\/text-to-speech\/[\w-]+\?output_format=mp3_44100_128$/);
    assert.equal(new Headers(init?.headers).get("xi-api-key"), "test-key-not-a-credential");
    assert.equal(init?.redirect, "error"); assert.equal(init?.cache, "no-store");
    assert.deepEqual(JSON.parse(String(init?.body)), {text: "Biryani options are ready.", model_id: "eleven_flash_v2_5"});
    return audioResponse();
  });
  assert.equal((await synthesizeSpeech("Biryani options are ready.")).contentType, "audio/mpeg");
});

test("a configured TTS model overrides the low-latency default", async t => {
  const previous = process.env.ELEVENLABS_TTS_MODEL;
  t.after(() => { if (previous === undefined) delete process.env.ELEVENLABS_TTS_MODEL; else process.env.ELEVENLABS_TTS_MODEL = previous; });
  process.env.ELEVENLABS_TTS_MODEL = " eleven_multilingual_v2 ";
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    assert.equal(JSON.parse(String(init?.body)).model_id, "eleven_multilingual_v2");
    return audioResponse();
  });
  assert.equal((await synthesizeSpeech("Hello")).contentType, "audio/mpeg");
});

test("speech-to-text language hints default to English with Hindi and drop invalid codes", t => {
  const previous = { primary: process.env.ELEVENLABS_STT_LANGUAGE, secondary: process.env.ELEVENLABS_STT_SECONDARY_LANGUAGES };
  t.after(() => {
    if (previous.primary === undefined) delete process.env.ELEVENLABS_STT_LANGUAGE; else process.env.ELEVENLABS_STT_LANGUAGE = previous.primary;
    if (previous.secondary === undefined) delete process.env.ELEVENLABS_STT_SECONDARY_LANGUAGES; else process.env.ELEVENLABS_STT_SECONDARY_LANGUAGES = previous.secondary;
  });
  const settings = (primary?: string, secondary?: string) => {
    if (primary === undefined) delete process.env.ELEVENLABS_STT_LANGUAGE; else process.env.ELEVENLABS_STT_LANGUAGE = primary;
    if (secondary === undefined) delete process.env.ELEVENLABS_STT_SECONDARY_LANGUAGES; else process.env.ELEVENLABS_STT_SECONDARY_LANGUAGES = secondary;
    return speechToTextSettings();
  };
  assert.deepEqual(settings(), { languageCode: "en", secondaryLanguages: ["hi"] });
  assert.deepEqual(settings(" HI ", "en, ta, hi, bad-code, x1, mr, en, gu, kn"), { languageCode: "hi", secondaryLanguages: ["en", "ta", "mr", "gu"] });
  assert.deepEqual(settings("english", "hin"), { languageCode: "en", secondaryLanguages: ["hin"] }, "an invalid primary falls back to English");
  assert.deepEqual(settings("", "en"), { languageCode: "en", secondaryLanguages: [] }, "the primary is never repeated as a secondary language");
  assert.deepEqual(settings("en", ""), { languageCode: "en", secondaryLanguages: [] }, "an explicitly empty list pins recognition to the primary language");
  assert.deepEqual(settings("en", "<script>,../hi,h1"), { languageCode: "en", secondaryLanguages: [] });
});

test("key IDs and permission errors are actionable without revealing provider payloads", async t => {
  for (const call of [() => createRealtimeTranscriptionToken(), () => synthesizeSpeech("Hello")]) {
    t.mock.method(globalThis, "fetch", async () => Response.json({detail:{status:"api_key_id_used_as_api_key",message:"secret-provider-debug"}}, {status:401}));
    await assert.rejects(call(), error => isVoiceError("ELEVENLABS_KEY_ID_CONFIGURED",503)(error) && !String(error).includes("secret-provider-debug"));
    t.mock.restoreAll();
  }
  t.mock.method(globalThis, "fetch", async () => Response.json({detail:{status:"missing_permissions"}}, {status:403}));
  await assert.rejects(synthesizeSpeech("Hello"), error => isVoiceError("ELEVENLABS_AUTH_INVALID",503)(error) && String(error).includes("text-to-speech"));
});

test("missing ElevenLabs key and malformed audio cannot silently use another TTS provider", async t => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return new Response("not an mp3 stream", {headers:{"content-type":"audio/mpeg"}}); });
  process.env.ELEVENLABS_API_KEY = "";
  await assert.rejects(synthesizeSpeech("Hello"), isVoiceError("ELEVENLABS_NOT_CONFIGURED",503));
  assert.equal(calls,0);
  process.env.ELEVENLABS_API_KEY = "test-key-not-a-credential";
  await assert.rejects(synthesizeSpeech("Hello"), isVoiceError("TTS_RESPONSE_INVALID",502));
  assert.equal(calls,1);
});
