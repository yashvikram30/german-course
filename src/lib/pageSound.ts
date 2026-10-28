// The page-turn sound: a recording of a real page ("page turn sound effect" by stumpbutt, freesound.org/s/431871, CC0), trimmed and
// levelled into public/audio/page-turn.mp3. It is decoded once, then each turn plays it a touch faster or slower and louder or softer so
// repeated turns do not sound identical, panned the way the page travels: right to left going forward, left to right going back.

const SRC = "/audio/page-turn.mp3";

let ctx: AudioContext | null = null;
let buffer: Promise<AudioBuffer | null> | null = null;

function audio() {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

/** Fetches and decodes the recording, so the first turn is not late. Safe to call often. */
export function preloadPageTurn() {
  const c = audio();
  if (!c) return null;
  buffer ??= fetch(SRC)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
    .then((b) => c.decodeAudioData(b))
    .catch(() => {
      buffer = null; // try again on the next turn
      return null;
    });
  return buffer;
}

export function playPageTurn(forward = true) {
  try {
    const c = audio();
    const pending = preloadPageTurn();
    if (!c || !pending) return;
    if (c.state === "suspended") void c.resume();
    void pending.then((buf) => {
      if (!buf) return;
      const t = c.currentTime;
      const src = c.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = 0.94 + Math.random() * 0.12;
      const gain = c.createGain();
      gain.gain.value = 0.5 + Math.random() * 0.12;
      src.connect(gain);
      let out: AudioNode = gain;
      if (c.createStereoPanner) {
        const pan = c.createStereoPanner();
        const side = forward ? 1 : -1;
        pan.pan.setValueAtTime(0.35 * side, t);
        pan.pan.linearRampToValueAtTime(-0.35 * side, t + 0.6);
        gain.connect(pan);
        out = pan;
      }
      out.connect(c.destination);
      src.start(t);
    });
  } catch {
    /* audio blocked or unsupported: the turn is silent */
  }
}
