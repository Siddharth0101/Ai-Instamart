import assert from "node:assert/strict";
import test from "node:test";
import { createConversationVoiceController, initialVoiceState, type VoiceCapture, type VoiceContext, type VoiceDependencies, type VoiceHandlers, type VoiceOptions, type VoicePlayback, type VoiceReply, type VoiceState } from "../src/lib/conversation-voice-controller";

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const flush = () => new Promise<void>(resolve => setImmediate(resolve));
const END = 350, STABLE = 2500, IDLE = 60_000;
const DISCONNECTED = "The microphone disconnected. Your conversation is kept; resume; tapping still works.";
type Connection = { signal: AbortSignal; handlers: VoiceHandlers; context: VoiceContext; closed: number; mutes: number; unmutes: number; muted: boolean; level: number; ready: ReturnType<typeof deferred<void>>; capture: VoiceCapture };
type Play = { reply: VoiceReply; signal: AbortSignal; stopped: number; done: ReturnType<typeof deferred<void>>; playback: VoicePlayback };

function harness(overrides: Partial<VoiceOptions> = {}, extra: Partial<VoiceDependencies> = {}) {
  const states: VoiceState[] = [], errors: string[] = [], submissions: string[] = [], cues: string[] = [];
  const connections: Connection[] = [], plays: Play[] = [], replies: Array<ReturnType<typeof deferred<VoiceReply | null>>> = [];
  const timers = new Map<number, { callback: () => void; delay: number }>();
  let timerId = 0, unlocks = 0, maxLive = 0, connectError: Error | null = null;
  const options: VoiceOptions = {
    csrfToken: "test-csrf", sttAvailable: true, ttsAvailable: true,
    onFinal: async text => { submissions.push(text); const reply = deferred<VoiceReply | null>(); replies.push(reply); return reply.promise; },
    onInterrupt: () => {}, onError: message => errors.push(message), ...overrides,
  };
  const live = () => connections.filter(connection => !connection.closed);
  const control = createConversationVoiceController({
    options: () => options, unavailableReason: () => null,
    connect: async (signal, handlers, context) => {
      if (connectError) { const error = connectError; connectError = null; throw error; }
      const ready = deferred<void>();
      const entry: Connection = { signal, handlers, context, closed: 0, mutes: 0, unmutes: 0, muted: true, level: 0.4, ready, capture: null as unknown as VoiceCapture };
      entry.capture = { ready: ready.promise, close: () => { entry.closed++; }, mute: () => { entry.mutes++; entry.muted = true; }, unmute: () => { entry.unmutes++; entry.muted = false; }, level: () => entry.muted ? 0 : entry.level };
      connections.push(entry); maxLive = Math.max(maxLive, live().length);
      return entry.capture;
    },
    play: async (reply, signal, source) => {
      source("server");
      const done = deferred<void>();
      const entry: Play = { reply, signal, stopped: 0, done, playback: null as unknown as VoicePlayback };
      entry.playback = { done: done.promise, stop: () => { entry.stopped++; done.resolve(); } };
      plays.push(entry); return entry.playback;
    },
    unlock: () => { unlocks++; }, cue: kind => { cues.push(kind); },
    onState: state => states.push(state),
    setTimer: ((callback: () => void, delay: number) => { const id = ++timerId; timers.set(id, { callback, delay }); return id; }) as unknown as typeof setTimeout,
    clearTimer: ((id: number) => { timers.delete(id); }) as unknown as typeof clearTimeout,
    ...extra,
  });
  const timerIds = (delay: number) => [...timers].filter(([, timer]) => timer.delay === delay).map(([id]) => id);
  const has = (delay: number) => timerIds(delay).length > 0;
  function fire(delay: number) {
    const [id] = timerIds(delay);
    assert.ok(id !== undefined, `no ${delay} ms timer is armed`);
    const timer = timers.get(id)!; timers.delete(id); timer.callback();
  }
  const last = () => connections.at(-1)!;
  async function listen() { control.start(); await flush(); last().ready.resolve(); await flush(); }
  /** One utterance, then the end-of-turn window closes. */
  async function utter(text: string) { last().handlers.committed(text); fire(END); await flush(); }
  async function answer(reply: VoiceReply | null) { replies.at(-1)!.resolve(reply); await flush(); }
  const phases = (from = 0) => states.slice(from).map(state => state.phase);
  const failNextConnect = (error: Error) => { connectError = error; };
  return { control, states, errors, options, submissions, cues, connections, plays, replies, timers, timerIds, has, fire, listen, utter, answer, last, phases, failNextConnect, unlocks: () => unlocks, maxLive: () => maxLive };
}

test("voice waits for actual capture readiness and ignores transcripts until listening", async t => {
  const h = harness(); t.after(h.control.end);
  h.control.start(); await flush();
  assert.equal(h.unlocks(), 1);
  assert.equal(h.control.getState().phase, "connecting");
  h.connections[0].handlers.committed("too early");
  assert.equal(h.has(END), false);
  h.connections[0].ready.resolve(); await flush();
  assert.equal(h.control.getState().phase, "listening");
  assert.equal(h.connections[0].unmutes, 1);
  assert.deepEqual(h.cues, ["start"]);
  assert.deepEqual(h.submissions, []);
});

test("partial speech never submits and duplicate final events submit exactly once after the turn window", async t => {
  const h = harness(); t.after(h.control.end); await h.listen();
  const handlers = h.connections[0].handlers;
  handlers.partial("I want"); handlers.partial("I want lunch");
  assert.deepEqual(h.submissions, []);
  assert.equal(h.control.getState().partial, "I want lunch");
  handlers.committed("  I want lunch  "); handlers.committed("I want lunch");
  assert.deepEqual(h.submissions, []);
  assert.equal(h.control.getState().partial, "I want lunch");
  assert.equal(h.connections[0].mutes, 0, "the microphone stays open while the user may continue");
  h.fire(END); await flush();
  assert.deepEqual(h.submissions, ["I want lunch"]);
  assert.equal(h.control.getState().phase, "thinking");
  assert.equal(h.control.getState().partial, "");
  assert.equal(h.timers.size, 0);
  assert.equal(h.connections[0].mutes, 1);
  assert.deepEqual(h.cues, ["start", "heard"]);
});

test("a mid-sentence pause merges both halves into one request", async t => {
  const h = harness(); t.after(h.control.end); await h.listen();
  const handlers = h.connections[0].handlers;
  handlers.committed("I want paneer tikka");
  assert.equal(h.has(END), true);
  handlers.partial("and two butter");
  assert.equal(h.has(END), false, "new speech cancels the end of the turn");
  assert.equal(h.control.getState().partial, "I want paneer tikka and two butter");
  handlers.committed("and two butter naan");
  assert.equal(h.control.getState().partial, "I want paneer tikka and two butter naan");
  h.fire(END); await flush();
  assert.deepEqual(h.submissions, ["I want paneer tikka and two butter naan"]);
});

test("a retracted partial restarts the end of the turn for words already committed", async t => {
  const h = harness(); t.after(h.control.end); await h.listen();
  const handlers = h.connections[0].handlers;
  handlers.committed("two veg thali"); handlers.partial("um"); handlers.partial("");
  assert.equal(h.has(END), true);
  assert.equal(h.control.getState().partial, "two veg thali");
  handlers.partial("two veg thali");
  assert.equal(h.has(END), true, "a late repeat of the committed words is not new speech");
  h.fire(END); await flush();
  assert.deepEqual(h.submissions, ["two veg thali"]);
});

test("a partial that stops changing is submitted when the VAD never commits", async t => {
  const h = harness(); t.after(h.control.end); await h.listen();
  const handlers = h.connections[0].handlers;
  handlers.partial("show me"); handlers.partial("show me masala dosa");
  const [armed] = h.timerIds(STABLE);
  handlers.partial("show me masala dosa");
  assert.deepEqual(h.timerIds(STABLE), [armed], "an unchanged partial does not restart the fallback");
  assert.deepEqual(h.submissions, []);
  h.fire(STABLE); await flush();
  assert.deepEqual(h.submissions, ["show me masala dosa"]);
  assert.equal(h.control.getState().phase, "thinking");
});

test("recorded transcription is accepted once after the capture processing transition", async t => {
  const h = harness(); t.after(h.control.end); await h.listen();
  h.connections[0].handlers.processing?.();
  assert.equal(h.control.getState().phase, "transcribing");
  assert.equal(h.timers.size, 0);
  h.connections[0].handlers.committed("Snacks please"); h.connections[0].handlers.committed("Snacks please");
  assert.deepEqual(h.submissions, ["Snacks please"]);
});

test("without barge-in playback keeps the capture muted and resumes the same microphone without a connecting flash", async t => {
  const h = harness({ bargeIn: false }); t.after(h.control.end); await h.listen();
  await h.utter("Lunch");
  const mark = h.states.length;
  await h.answer({ id: "reply", version: 2, text: "What would you like?" });
  assert.equal(h.control.getState().phase, "speaking");
  assert.equal(h.control.getState().outputSource, "server");
  assert.equal(h.connections[0].muted, true);
  h.connections[0].handlers.partial("audio echo"); h.connections[0].handlers.committed("audio echo");
  assert.equal(h.plays[0].stopped, 0);
  assert.equal(h.has(END), false);
  h.plays[0].done.resolve(); await flush();
  assert.equal(h.control.getState().phase, "listening");
  assert.equal(h.connections.length, 1);
  assert.equal(h.connections[0].unmutes, 2);
  assert.equal(h.phases(mark).includes("connecting"), false);
  assert.deepEqual(h.submissions, ["Lunch"]);
});

test("barge-in stops playback on real speech but ignores echo of the reply", async t => {
  const h = harness(); t.after(h.control.end); await h.listen();
  await h.utter("show biryani");
  await h.answer({ id: "reply", version: 2, text: "I found five biryani places. Which one should I open?", speech: "I found 5 biryani places. Which one should I open?" });
  const handlers = h.connections[0].handlers;
  assert.equal(h.control.getState().phase, "speaking");
  assert.equal(h.connections[0].muted, false, "the microphone is open while the reply plays");
  handlers.partial("which one should I open"); handlers.committed("found 5 biryani places"); handlers.partial("no");
  assert.equal(h.plays[0].stopped, 0);
  assert.equal(h.control.getState().phase, "speaking");
  assert.equal(h.control.getState().partial, "");
  assert.equal(h.has(END), false, "echo is never accumulated");
  handlers.partial("open the second one");
  assert.equal(h.plays[0].stopped, 1);
  assert.equal(h.plays[0].signal.aborted, true);
  assert.equal(h.control.getState().phase, "listening");
  assert.equal(h.control.getState().outputSource, "server");
  assert.equal(h.control.getState().partial, "open the second one");
  handlers.committed("open the second one please");
  h.fire(END); await flush();
  assert.deepEqual(h.submissions, ["show biryani", "open the second one please"]);
  assert.equal(h.connections.length, 1);
});

test("thinking always mutes the microphone, even with barge-in", async t => {
  const h = harness(); t.after(h.control.end); await h.listen();
  await h.utter("dinner");
  assert.equal(h.connections[0].muted, true);
  h.connections[0].handlers.partial("are you there");
  assert.equal(h.control.getState().partial, "");
  assert.equal(h.control.getState().phase, "thinking");
});

test("a committed short correction interrupts without treating an unstable syllable as a turn", async t => {
  const h = harness(); t.after(h.control.end); await h.listen();
  await h.utter("show dinner");
  await h.answer({ id: "reply", version: 2, text: "Here are some dinner choices." });
  h.last().handlers.partial("no");
  assert.equal(h.plays[0].stopped, 0);
  h.last().handlers.committed("no");
  assert.equal(h.plays[0].stopped, 1);
  assert.equal(h.control.getState().phase, "listening");
  h.fire(END); await flush();
  assert.deepEqual(h.submissions, ["show dinner", "no"]);
});

test("Hindi corrections can interrupt English replies while romanized dish echoes are ignored", async t => {
  const h = harness(); t.after(h.control.end); await h.listen();
  await h.utter("show dinner");
  await h.answer({ id: "reply", version: 2, text: "Paneer tikka and butter naan are available." });
  h.last().handlers.partial("पनीर टिक्का");
  h.last().handlers.committed("बटर नान");
  assert.equal(h.plays[0].stopped, 0, "the same spoken dish in another script remains echo");
  h.last().handlers.partial("नहीं दूसरा रेस्टोरेंट खोलो");
  assert.equal(h.plays[0].stopped, 1);
  assert.equal(h.control.getState().partial, "नहीं दूसरा रेस्टोरेंट खोलो");
  h.last().handlers.committed("नहीं दूसरा रेस्टोरेंट खोलो");
  h.fire(END); await flush();
  assert.deepEqual(h.submissions, ["show dinner", "नहीं दूसरा रेस्टोरेंट खोलो"]);
});

test("a committed Hindi stop word can interrupt a reply", async t => {
  const h = harness(); t.after(h.control.end); await h.listen();
  await h.utter("show dinner");
  await h.answer({ id: "reply", version: 2, text: "Here are some dinner choices." });
  h.last().handlers.partial("बस");
  assert.equal(h.plays[0].stopped, 0);
  h.last().handlers.committed("बस");
  assert.equal(h.plays[0].stopped, 1);
  h.fire(END); await flush();
  assert.deepEqual(h.submissions, ["show dinner", "बस"]);
});

test("a changed on-screen vocabulary reconnects during playback and never keeps two live captures", async t => {
  let keyterms = ["Paneer Palace"];
  const h = harness({ context: () => ({ keyterms, previousText: "Which restaurant?" }) }); t.after(h.control.end); await h.listen();
  assert.deepEqual(h.connections[0].context, { keyterms: ["Paneer Palace"], previousText: "Which restaurant?" });
  await h.utter("open paneer palace");
  keyterms = ["Butter Naan", "Dal Makhani"];
  const mark = h.states.length;
  await h.answer({ id: "menu", version: 3, text: "Here is the menu." });
  assert.equal(h.connections.length, 2);
  assert.equal(h.connections[0].closed, 1);
  assert.deepEqual(h.connections[1].context.keyterms, ["Butter Naan", "Dal Makhani"]);
  assert.equal(h.control.getState().phase, "speaking");
  assert.equal(h.plays.length, 1, "playback does not wait for the new connection");
  h.connections[1].ready.resolve(); await flush();
  assert.equal(h.connections[1].muted, false, "ready while speaking: opened for barge-in");
  h.plays[0].done.resolve(); await flush();
  assert.equal(h.control.getState().phase, "listening");
  assert.equal(h.connections.length, 2);
  assert.equal(h.phases(mark).includes("connecting"), false);
  assert.equal(h.maxLive(), 1);
});

test("listening waits for the pending vocabulary connection instead of opening another", async t => {
  let keyterms = ["Biryani Blues"];
  const h = harness({ context: () => ({ keyterms }) }); t.after(h.control.end); await h.listen();
  await h.utter("open biryani blues");
  keyterms = ["Chicken 65"];
  await h.answer({ id: "menu", version: 3, text: "Here is the menu." });
  h.plays[0].done.resolve(); await flush();
  assert.equal(h.control.getState().phase, "connecting");
  h.connections[1].ready.resolve(); await flush();
  assert.equal(h.control.getState().phase, "listening");
  assert.equal(h.connections.length, 2);
  assert.equal(h.connections[1].unmutes, 1);
  assert.equal(h.maxLive(), 1);
});

test("unchanged vocabulary and silent replies never reconnect", async t => {
  let keyterms = ["Paneer Palace"];
  const h = harness({ context: () => ({ keyterms }) }); t.after(h.control.end); await h.listen();
  await h.utter("what is on the menu"); await h.answer({ id: "a", version: 2, text: "Starters and mains." });
  h.plays[0].done.resolve(); await flush();
  assert.equal(h.connections.length, 1);
  h.options.onFinal = async text => { h.submissions.push(text); return { id: "navigation:1", version: 2, text: "Scrolling down. Say stop to pause.", silent: true }; };
  keyterms = ["Something Else"];
  await h.utter("scroll down");
  assert.equal(h.control.getState().phase, "listening");
  assert.equal(h.connections.length, 1);
  assert.equal(h.plays.length, 1);
});

test("an unexpected disconnect reconnects once and keeps the words heard so far", async t => {
  const h = harness(); t.after(h.control.end); await h.listen();
  h.connections[0].handlers.partial("add two");
  h.connections[0].handlers.close();
  assert.equal(h.control.getState().phase, "connecting");
  assert.equal(h.connections[0].closed, 1);
  assert.equal(h.connections.length, 2);
  assert.deepEqual(h.errors, []);
  h.connections[1].ready.resolve(); await flush();
  assert.equal(h.control.getState().phase, "listening");
  assert.equal(h.control.getState().partial, "add two");
  h.fire(END); await flush();
  assert.deepEqual(h.submissions, ["add two"]);
  assert.deepEqual(h.cues, ["start", "heard"]);
});

test("a second loss without a successful utterance pauses with the existing message", async t => {
  const h = harness(); t.after(h.control.end); await h.listen();
  h.connections[0].handlers.error("ElevenLabs voice disconnected. Try again; tapping still works.");
  h.connections[1].ready.resolve(); await flush();
  assert.equal(h.control.getState().phase, "listening");
  h.connections[1].handlers.close();
  assert.equal(h.control.getState().phase, "paused");
  assert.equal(h.connections.length, 2);
  assert.equal(h.connections[1].closed, 1);
  assert.deepEqual(h.errors, [DISCONNECTED]);
  assert.equal(h.cues.at(-1), "error");
});

test("a failed automatic reconnect pauses instead of retrying forever", async t => {
  const h = harness(); t.after(h.control.end); await h.listen();
  h.failNextConnect(new Error("ElevenLabs voice disconnected. Try again; tapping still works."));
  h.connections[0].handlers.close(); await flush();
  assert.equal(h.control.getState().phase, "paused");
  assert.deepEqual(h.errors, ["ElevenLabs voice disconnected. Try again; tapping still works."]);
  assert.equal(h.connections.length, 1);
});

test("a microphone whose readiness fails is closed before pausing or resuming", async t => {
  const h = harness(); t.after(h.control.end);
  h.control.start(); await flush();
  h.connections[0].ready.reject(new Error("The microphone could not start.")); await flush();
  assert.equal(h.control.getState().phase, "paused");
  assert.equal(h.connections[0].closed, 1, "failed startup must release the microphone");
  await h.listen();
  assert.equal(h.control.getState().phase, "listening");
  assert.equal(h.maxLive(), 1, "resume must never retain a failed microphone");
});

test("a reconnect whose readiness fails releases its microphone before pausing", async t => {
  const h = harness(); t.after(h.control.end); await h.listen();
  h.connections[0].handlers.close(); await flush();
  h.connections[1].ready.reject(new Error("The microphone disconnected during setup.")); await flush();
  assert.equal(h.control.getState().phase, "paused");
  assert.equal(h.connections[0].closed, 1);
  assert.equal(h.connections[1].closed, 1, "failed reconnect must release its microphone too");
});

test("the reconnect budget resets after a successful utterance and covers losses during playback", async t => {
  const h = harness(); t.after(h.control.end); await h.listen();
  h.connections[0].handlers.close(); h.connections[1].ready.resolve(); await flush();
  await h.utter("hello there"); await h.answer({ id: "hi", version: 2, text: "Hi! What are you craving?" });
  h.connections[1].handlers.close();
  assert.equal(h.control.getState().phase, "speaking", "the reply keeps playing while the microphone reconnects");
  assert.equal(h.plays[0].stopped, 0);
  assert.equal(h.connections.length, 3);
  h.connections[2].ready.resolve(); await flush();
  h.plays[0].done.resolve(); await flush();
  assert.equal(h.control.getState().phase, "listening");
  assert.deepEqual(h.errors, []);
});

test("fatal microphone and account errors pause immediately without reconnecting", async t => {
  const h = harness(); t.after(h.control.end); await h.listen();
  h.connections[0].handlers.error("ElevenLabs voice reached its allowance. Try later; tapping still works.");
  assert.equal(h.control.getState().phase, "paused");
  assert.equal(h.connections.length, 1);
  assert.match(h.errors[0], /allowance/);
});

test("pause closes capture, suppresses an in-flight reply, and resume creates a fresh capture", async t => {
  const h = harness(); t.after(h.control.end); await h.listen();
  await h.utter("Biryani"); h.control.pause();
  assert.equal(h.control.getState().phase, "paused");
  assert.equal(h.connections[0].closed, 1);
  await h.answer({ id: "stale", version: 2, text: "Old reply" });
  assert.equal(h.plays.length, 0);
  h.control.resume(); await flush(); h.connections[1].ready.resolve(); await flush();
  h.connections[0].handlers.error("old connection"); h.connections[0].handlers.committed("old final");
  assert.equal(h.control.getState().phase, "listening");
  assert.equal(h.has(END), false);
  assert.deepEqual(h.errors, []);
  assert.deepEqual(h.submissions, ["Biryani"]);
});

test("ending while connecting aborts and releases capture without a late microphone restart", async () => {
  const h = harness(); h.control.start(); await flush(); h.control.end();
  assert.equal(h.connections[0].signal.aborted, true);
  assert.equal(h.connections[0].closed, 1);
  h.connections[0].ready.resolve(); await flush();
  assert.deepEqual(h.control.getState(), initialVoiceState);
  assert.equal(h.connections[0].unmutes, 0);
  assert.equal(h.timers.size, 0);
});

test("interrupt stops playback and resumes after the shared turn cancellation completes", async t => {
  const h = harness(); t.after(h.control.end); await h.listen();
  await h.utter("Dinner"); await h.answer({ id: "reply", version: 2, text: "Dinner choices" });
  const stop = deferred<void>(); h.options.onInterrupt = () => stop.promise;
  const interrupted = h.control.interrupt();
  assert.equal(h.plays[0].signal.aborted, true);
  assert.equal(h.plays[0].stopped, 1);
  assert.equal(h.control.getState().phase, "thinking");
  assert.equal(h.connections[0].muted, true);
  stop.resolve(); await interrupted; await flush();
  assert.equal(h.control.getState().phase, "listening");
  assert.equal(h.connections.length, 1);
});

test("interrupting capture startup reconnects and ignores late readiness from the old capture", async t => {
  const h = harness(); t.after(h.control.end); h.control.start(); await flush();
  const interrupted = h.control.interrupt(); await flush();
  assert.equal(h.connections[0].signal.aborted, true);
  assert.equal(h.connections[0].closed, 1);
  assert.equal(h.connections.length, 2);
  h.connections[0].ready.resolve(); h.connections[1].ready.resolve(); await interrupted; await flush();
  assert.equal(h.connections[0].unmutes, 0);
  assert.equal(h.connections[1].unmutes, 1);
  assert.equal(h.control.getState().phase, "listening");
});

test("a reentrant microphone error cannot be overwritten by listening state", async t => {
  const h = harness(); t.after(h.control.end); h.control.start(); await flush();
  const blocked = "Allow microphone access for this site in your browser, then resume. Everything on screen also works by tapping.";
  h.connections[0].capture.unmute = () => h.connections[0].handlers.error(blocked);
  h.connections[0].ready.resolve(); await flush();
  assert.equal(h.control.getState().phase, "paused");
  assert.equal(h.connections[0].closed, 1);
  assert.equal(h.connections.length, 1);
  assert.deepEqual(h.errors, [blocked]);
  assert.equal(h.timers.size, 0);
});

test("speech output failure preserves captions and keeps the microphone available for the next turn", async t => {
  const h = harness(); t.after(h.control.end); await h.listen();
  await h.utter("Pizza"); await h.answer({ id: "reply", version: 2, text: "Pizza choices" });
  h.plays[0].done.reject(new Error("Audio device unavailable")); await flush();
  assert.equal(h.control.getState().phase, "listening");
  assert.equal(h.control.getState().outputSource, "captions");
  assert.equal(h.connections[0].closed, 0);
  assert.equal(h.connections[0].muted, false);
  assert.equal(h.plays[0].stopped, 1, "failed audio is stopped before capture resumes");
  assert.deepEqual(h.errors, ["Audio device unavailable"]);
  assert.equal(h.cues.at(-1), "error");
  await h.utter("make it two");
  assert.deepEqual(h.submissions, ["Pizza", "make it two"]);
  assert.equal(h.control.getState().error, null);
});

test("missing configuration does not open a microphone and idle capture releases resources", async t => {
  const h = harness(); t.after(h.control.end);
  h.options.csrfToken = ""; h.control.start(); await flush();
  assert.equal(h.connections.length, 0); assert.match(h.errors[0], /still connecting/);
  h.options.csrfToken = "csrf"; h.options.sttAvailable = false; h.control.start();
  assert.equal(h.connections.length, 0); assert.match(h.errors[1], /speech-to-text/);
  h.options.sttAvailable = true; await h.listen();
  assert.equal(h.timers.size, 1);
  h.fire(IDLE);
  assert.equal(h.control.getState().phase, "paused");
  assert.match(h.errors[2], /quiet minute/); assert.match(h.control.getState().error ?? "", /Tap the mic/);
  assert.equal(h.connections[0].closed, 1);
  assert.equal(h.timers.size, 0);
});

test("any new speech restarts the idle timer", async t => {
  const h = harness(); t.after(h.control.end); await h.listen();
  const [first] = h.timerIds(IDLE);
  h.connections[0].handlers.partial("let me think");
  const [second] = h.timerIds(IDLE);
  assert.notEqual(first, second);
  assert.equal(h.timers.has(first), false);
});

test("completed user and assistant lines survive playback, pause, end and restart", async t => {
  const h = harness(); t.after(h.control.end); await h.listen();
  h.connections[0].handlers.partial("open restaurant");
  h.connections[0].handlers.committed("open restaurant two");
  h.connections[0].handlers.committed("open restaurant two");
  h.fire(END); await flush();
  await h.answer({id:"menu",version:3,text:"Here is the menu."});
  assert.equal(h.control.getState().partial, "");
  assert.deepEqual(h.control.getState().transcript.map(({role,text})=>({role,text})), [
    {role:"user",text:"open restaurant two"},{role:"assistant",text:"Here is the menu."},
  ]);
  h.plays[0].done.resolve(); await flush();
  const transcript = h.control.getState().transcript;
  h.control.pause(); h.control.end();
  assert.deepEqual(h.control.getState().transcript, transcript);
  await h.listen();
  assert.deepEqual(h.control.getState().transcript, transcript);
});

test("the transcript keeps the latest 60 lines and survives end", async () => {
  const h = harness({ speakReplies: false });
  h.options.onFinal = async text => { h.submissions.push(text); return { id: `reply-${h.submissions.length}`, version: 1, text: `Reply ${h.submissions.length}` }; };
  for (let index = 1; index <= 35; index++) await h.control.submitText(`request ${index}`);
  const transcript = h.control.getState().transcript;
  assert.equal(transcript.length, 60);
  assert.equal(transcript[0].text, "request 6");
  assert.equal(transcript.at(-1)?.text, "Reply 35");
  h.control.end();
  assert.deepEqual(h.control.getState().transcript, transcript);
});

test("speech errors preserve the actual assistant reply and replay only replays audio", async t => {
  const h = harness(); t.after(h.control.end); await h.listen();
  await h.utter("show snacks");
  await h.answer({id:"snacks",version:2,text:"Choose a snack category."});
  h.plays[0].done.reject(new Error("ElevenLabs reached its allowance")); await flush();
  assert.equal(h.control.getState().transcript.at(-1)?.text, "Choose a snack category.");
  assert.match(h.control.getState().error!, /allowance/);
  assert.equal(h.control.getState().phase, "listening");
  h.control.pause();
  const replayed = h.control.replay(); await flush();
  assert.equal(h.control.getState().error, null);
  assert.equal(h.unlocks(), 2);
  assert.deepEqual(h.submissions,["show snacks"]);
  assert.equal(h.control.getState().transcript.length,2);
  assert.equal(h.plays.length,2);
  h.plays[1].done.resolve(); await replayed;
  assert.equal(h.control.getState().phase, "paused", "replaying never reopens a paused microphone");
  assert.equal(h.connections.length, 1);
});

test("pausing preserves unsent words and a completed in-flight reply without playing it", async t => {
  const h = harness(); t.after(h.control.end); await h.listen();
  h.connections[0].handlers.partial("biryani please"); h.control.pause();
  assert.equal(h.control.getState().partial,"biryani please"); assert.deepEqual(h.submissions,[]);
  await h.listen(); h.connections[1].handlers.committed("biryani please"); h.control.pause();
  assert.equal(h.control.getState().partial,"biryani please", "pausing inside the turn window keeps the words unsent");
  assert.deepEqual(h.submissions,[]); assert.equal(h.timers.size, 0);
  await h.listen(); await h.utter("biryani please"); h.control.pause();
  await h.answer({id:"biryani",version:2,text:"Biryani restaurants are ready."});
  assert.equal(h.control.getState().transcript.at(-1)?.text,"Biryani restaurants are ready.");
  assert.equal(h.plays.length,0);
});

test("local scroll replies keep transcripts and immediately reopen listening without TTS",async t=>{
  const h=harness();t.after(h.control.end);await h.listen();
  h.options.onFinal=async()=>({id:"navigation:one",version:1,text:"Scrolling down. Say stop to pause.",silent:true});
  await h.utter("scroll down");
  assert.equal(h.control.getState().phase,"listening");assert.equal(h.plays.length,0);
  assert.deepEqual(h.control.getState().transcript.map(line=>line.text),["scroll down","Scrolling down. Say stop to pause."]);
  h.connections[0].handlers.partial("stop");assert.equal(h.control.getState().partial,"stop");
  assert.equal(h.errors.length,0);
});

test("typed text speaks its reply without a microphone session and stays idle", async t => {
  const h = harness(); t.after(h.control.end);
  const sent = h.control.submitText("  veg biryani  ");
  assert.equal(h.unlocks(), 1, "audio is unlocked synchronously inside the gesture");
  assert.equal(h.control.getState().phase, "thinking");
  assert.deepEqual(h.submissions, ["veg biryani"]);
  await h.answer({ id: "veg", version: 2, text: "Veg biryani it is." });
  assert.equal(h.control.getState().phase, "speaking");
  assert.equal(h.control.getState().active, false);
  h.plays[0].done.resolve(); await sent;
  assert.equal(h.control.getState().phase, "idle");
  assert.equal(h.control.getState().active, false);
  assert.equal(h.connections.length, 0);
  assert.deepEqual(h.control.getState().transcript.map(line => line.text), ["veg biryani", "Veg biryani it is."]);
  assert.deepEqual(h.cues, []);
});

test("typed text during a live session stops the reply first, is ignored while thinking, and returns to listening", async t => {
  const h = harness(); t.after(h.control.end); await h.listen();
  await h.utter("lunch"); await h.answer({ id: "a", version: 2, text: "Lunch ideas" });
  assert.equal(h.control.getState().phase, "speaking");
  void h.control.submitText("make it two");
  assert.equal(h.plays[0].stopped, 1);
  assert.equal(h.control.getState().phase, "thinking");
  void h.control.submitText("ignored while thinking");
  assert.deepEqual(h.submissions, ["lunch", "make it two"]);
  await h.answer({ id: "b", version: 3, text: "Two it is." });
  h.plays[1].done.resolve(); await flush();
  assert.equal(h.control.getState().phase, "listening");
  assert.equal(h.connections.length, 1);
  assert.deepEqual(h.control.getState().transcript.map(line => line.text), ["lunch", "Lunch ideas", "make it two", "Two it is."]);
});

test("interrupting a typed reply without a session stops it and stays idle", async t => {
  const h = harness(); t.after(h.control.end);
  void h.control.submitText("hello"); await h.answer({ id: "hi", version: 2, text: "Hi there." });
  await h.control.interrupt();
  assert.equal(h.plays[0].stopped, 1);
  assert.equal(h.control.getState().phase, "idle");
  assert.equal(h.connections.length, 0);
});

test("send now submits everything heard so far", async t => {
  const h = harness(); t.after(h.control.end); await h.listen();
  h.control.sendNow();
  assert.deepEqual(h.submissions, []);
  h.connections[0].handlers.committed("two masala dosa"); h.connections[0].handlers.partial("and a filter coffee");
  h.control.sendNow();
  assert.deepEqual(h.submissions, ["two masala dosa and a filter coffee"]);
  assert.equal(h.control.getState().phase, "thinking");
  assert.equal(h.timers.size, 0);
});

test("captions-only replies skip text-to-speech and go straight back to listening", async t => {
  const h = harness({ speakReplies: false }); t.after(h.control.end); await h.listen();
  await h.utter("show menu"); await h.answer({ id: "menu", version: 2, text: "Here is the menu." });
  assert.equal(h.plays.length, 0);
  assert.equal(h.control.getState().outputSource, "captions");
  assert.equal(h.control.getState().phase, "listening");
  assert.equal(h.control.getState().transcript.at(-1)?.text, "Here is the menu.");
});

test("unconfigured spoken replies use captions without failing an otherwise available microphone", async t => {
  const h = harness({ ttsAvailable: false }); t.after(h.control.end); await h.listen();
  await h.utter("show menu"); await h.answer({ id: "menu", version: 2, text: "Here is the menu." });
  assert.equal(h.plays.length, 0);
  assert.equal(h.control.getState().outputSource, "captions");
  assert.equal(h.control.getState().phase, "listening");
  assert.equal(h.connections[0].muted, false);
  assert.equal(h.control.getState().error, null);
  assert.deepEqual(h.errors, []);
});

test("an audio fetch failure stays visible while microphone capture continues", async t => {
  const h = harness({}, { play: async () => { throw new Error("Spoken replies are temporarily unavailable."); } });
  t.after(h.control.end); await h.listen();
  await h.utter("show menu"); await h.answer({ id: "menu", version: 2, text: "Here is the menu." });
  assert.equal(h.control.getState().phase, "listening");
  assert.equal(h.control.getState().outputSource, "captions");
  assert.equal(h.control.getState().error, "Spoken replies are temporarily unavailable.");
  assert.equal(h.control.getState().transcript.at(-1)?.text, "Here is the menu.");
  assert.equal(h.connections.length, 1);
  assert.equal(h.connections[0].muted, false);
});

test("recovering a typed reply's audio failure never opens an inactive microphone", async t => {
  const h = harness({}, { play: async () => { throw new Error("Audio unavailable"); } });
  t.after(h.control.end);
  const sent = h.control.submitText("show menu");
  await h.answer({ id: "menu", version: 2, text: "Here is the menu." });
  await sent;
  assert.equal(h.control.getState().phase, "idle");
  assert.equal(h.control.getState().active, false);
  assert.equal(h.control.getState().outputSource, "captions");
  assert.equal(h.control.getState().error, "Audio unavailable");
  assert.equal(h.connections.length, 0);
});

test("turning speech off during an audio request stops the pending reply and resumes listening", async t => {
  const ready = deferred<VoicePlayback>();
  const done = deferred<void>();
  let stopped = 0;
  const h = harness({}, { play: async (_reply, _signal, source) => {
    source("server");
    return ready.promise;
  } });
  t.after(h.control.end); await h.listen();
  await h.utter("show menu");
  await h.answer({ id: "menu", version: 2, text: "Here is the menu." });
  assert.equal(h.control.getState().phase, "thinking");
  h.options.speakReplies = false;
  ready.resolve({ done: done.promise, stop() { stopped++; done.resolve(); } });
  await flush();
  assert.equal(stopped, 1);
  assert.equal(h.control.getState().phase, "listening");
  assert.equal(h.control.getState().outputSource, "captions");
  assert.equal(h.control.getState().transcript.at(-1)?.text, "Here is the menu.");
  assert.equal(h.connections.length, 1);
  assert.equal(h.connections[0].muted, false);
});

test("level reports microphone input only while listening or speaking", async t => {
  const h = harness(); t.after(h.control.end);
  assert.equal(h.control.level(), 0);
  await h.listen();
  assert.equal(h.control.level(), 0.4);
  h.connections[0].level = Number.NaN; assert.equal(h.control.level(), 0);
  h.connections[0].level = 3; assert.equal(h.control.level(), 1);
  h.connections[0].capture.level = () => { throw new Error("analyser released"); };
  assert.equal(h.control.level(), 0);
  h.connections[0].capture.level = () => 0.3;
  await h.utter("hi");
  assert.equal(h.control.level(), 0, "thinking reads as silence");
});

test("app-initiated speech only plays during a live session", async t => {
  const h = harness(); t.after(h.control.end);
  await h.control.speak({ id: "welcome", version: 1, text: "Welcome back." });
  assert.equal(h.plays.length, 0);
  await h.listen();
  void h.control.speak({ id: "welcome", version: 1, text: "Welcome back." }); await flush();
  assert.equal(h.plays.length, 1);
  assert.equal(h.control.getState().phase, "speaking");
});

test("a failed spoken request says why and keeps listening, so the user can just rephrase", async t => {
  const h = harness(); t.after(h.control.end);
  await h.listen(); await h.utter("open restaurant nine");
  await h.answer(null);
  let state = h.control.getState();
  assert.equal(state.phase, "listening"); assert.equal(state.muted, false); assert.match(state.error ?? "", /say it again/);
  assert.equal(h.cues.at(-1), "error");
  await h.utter("open restaurant two");
  assert.equal(h.control.getState().error, null); assert.deepEqual(h.submissions, ["open restaurant nine", "open restaurant two"]);
  h.replies.at(-1)!.reject(new Error("Choose a restaurant from the current list.")); await flush();
  state = h.control.getState();
  assert.equal(state.phase, "listening"); assert.equal(state.error, "Choose a restaurant from the current list.");
});
