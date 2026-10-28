"use client";

import { useSyncExternalStore } from "react";

export interface Settings {
  voice: string; // voice name, "" = automatic
  gender: "female" | "male";
  rate: number; // 0.6 – 1.1
  translations: boolean;
  size: number; // text scale
  focus: boolean; // distraction-free study mode
  pages: boolean; // read chapters as book pages, one section per page
  sound: boolean; // page-turn sound
}

const DEFAULTS: Settings = { voice: "", gender: "female", rate: 0.9, translations: true, size: 1, focus: false, pages: false, sound: true };
const KEY = "german-book-settings";

let cache: Settings = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) cache = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* private mode or corrupt value: keep defaults */
  }
}

export function updateSettings(patch: Partial<Settings>) {
  if (!loaded) load();
  cache = { ...cache, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function getSettings() {
  if (!loaded && typeof window !== "undefined") load();
  return cache;
}

export function useSettings() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getSettings,
    () => DEFAULTS,
  );
}

// ---------------- voices ----------------

let voices: SpeechSynthesisVoice[] = [];
let voicesInit = false;
const noVoices: SpeechSynthesisVoice[] = [];

function refreshVoices() {
  voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("de"));
}

export function useGermanVoices() {
  return useSyncExternalStore(
    (cb) => {
      if (!("speechSynthesis" in window)) return () => {};
      const on = () => {
        refreshVoices();
        cb();
      };
      window.speechSynthesis.addEventListener("voiceschanged", on);
      return () => window.speechSynthesis.removeEventListener("voiceschanged", on);
    },
    () => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return noVoices;
      if (!voicesInit) {
        voicesInit = true;
        refreshVoices();
      }
      return voices;
    },
    () => noVoices,
  );
}

const FEMALE = ["anna", "petra", "marlene", "vicki", "sandy", "shelley", "flo", "grandma", "katja", "hedda", "helena", "amira", "google deutsch"];
const MALE = ["markus", "yannick", "viktor", "reed", "eddy", "rocko", "grandpa", "stefan", "conrad", "hans", "jonas", "killian"];

export function voiceGender(v: SpeechSynthesisVoice): "female" | "male" | "unknown" {
  const n = v.name.toLowerCase();
  if (MALE.some((m) => n.includes(m))) return "male";
  if (FEMALE.some((f) => n.includes(f))) return "female";
  return "unknown";
}

const quality = (v: SpeechSynthesisVoice) => (/premium|enhanced|neural|natural/i.test(v.name) ? 0 : /compact/i.test(v.name) ? 2 : 1);

export function pickVoice(list: SpeechSynthesisVoice[], s: Settings) {
  const chosen = list.find((v) => v.name === s.voice);
  if (chosen) return chosen;
  const sameGender = list.filter((v) => voiceGender(v) === s.gender).sort((a, b) => quality(a) - quality(b));
  return sameGender[0] ?? [...list].sort((a, b) => quality(a) - quality(b))[0];
}

export function speakText(text: string, slow = false) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const s = getSettings();
  // Vocabulary entries like "essen (isst)" or "die Eltern (pl.)" should be read without the brackets.
  const u = new SpeechSynthesisUtterance(text.replace(/\s*\([^)]*\)/g, ""));
  u.lang = "de-DE";
  u.rate = slow ? Math.max(0.5, s.rate * 0.65) : s.rate;
  const v = pickVoice(window.speechSynthesis.getVoices().filter((x) => x.lang.toLowerCase().startsWith("de")), s);
  if (v) u.voice = v;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}
