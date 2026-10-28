"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { pickVoice, speakText, updateSettings, useGermanVoices, useSettings, voiceGender } from "@/lib/settings";

export function SettingsPanel() {
  const s = useSettings();
  const path = usePathname();
  const voices = useGermanVoices();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.style.setProperty("--text-scale", String(s.size));
  }, [s.size]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const current = pickVoice(voices, s);
  const label = (v: SpeechSynthesisVoice) => `${v.name.replace(/\s*\(German \(Germany\)\)/, "")} · ${voiceGender(v)}`;
  const seg = (active: boolean) =>
    `ui flex-1 rounded-sm border px-2 py-1 text-base transition-colors duration-150 ${active ? "border-blue bg-blue text-paper" : "border-rule hover:border-blue"}`;

  return (
    <div ref={ref} className="relative">
      <button type="button" className="ui rounded-sm border border-rule px-2.5 py-1 text-base font-medium hover:border-blue" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(!open)}>
        Settings
      </button>
      {open && (
        <div role="dialog" aria-label="View, reading and voice settings" className="pop-in ui absolute right-0 top-11 z-50 w-80 rounded-sm border-2 border-blue bg-paper p-4 text-base shadow-xl">
          <p className="label !my-0">View</p>
          {path.startsWith("/kapitel/") && (
            <label className="mt-2 flex items-center gap-2">
              <input type="checkbox" checked={s.pages} onChange={(e) => updateSettings(e.target.checked ? { pages: true, focus: true } : { pages: false, focus: false })} className="accent-[var(--blue)]" />
              <span>Book view <span className="text-muted">(one section per page)</span></span>
            </label>
          )}
          <label className="mt-2 flex items-center gap-2">
            <input type="checkbox" checked={s.focus} onChange={(e) => updateSettings({ focus: e.target.checked })} className="accent-[var(--blue)]" />
            <span>Focus mode <span className="text-muted">(hide the menus, key F)</span></span>
          </label>

          <hr className="my-3 border-rule" />
          <p className="label !my-0">Voice</p>
          <div className="mt-2 flex gap-2" role="group" aria-label="Voice gender">
            <button type="button" className={seg(s.gender === "female" && !s.voice)} onClick={() => updateSettings({ gender: "female", voice: "" })}>Female</button>
            <button type="button" className={seg(s.gender === "male" && !s.voice)} onClick={() => updateSettings({ gender: "male", voice: "" })}>Male</button>
          </div>
          {voices.length > 0 ? (
            <label className="mt-3 block">
              <span className="text-muted">Or pick a specific voice</span>
              <select
                className="mt-1 w-full rounded-sm border border-rule bg-sheet px-2 py-1.5"
                value={s.voice || current?.name || ""}
                onChange={(e) => {
                  const v = voices.find((x) => x.name === e.target.value);
                  updateSettings({ voice: e.target.value, gender: v && voiceGender(v) === "male" ? "male" : "female" });
                }}
              >
                {voices.map((v) => (
                  <option key={v.name} value={v.name}>{label(v)}</option>
                ))}
              </select>
            </label>
          ) : (
            <p className="mt-3 text-muted">No German voice was found in this browser. Install one in your system settings.</p>
          )}
          <label className="mt-3 block">
            <span className="text-muted">Speed: {Math.round(s.rate * 100)}%</span>
            <input type="range" min={0.6} max={1.1} step={0.05} value={s.rate} onChange={(e) => updateSettings({ rate: Number(e.target.value) })} className="w-full accent-[var(--blue)]" />
          </label>
          <button type="button" className="btn mt-2" onClick={() => speakText("Guten Tag! Ich heiße Anna. Wie geht es dir?")}>
            Test the voice
          </button>
          <p className="mt-2 text-sm text-muted">
            Voices come from your computer. For a clearer voice, add an enhanced German voice in macOS: System Settings → Accessibility → Spoken Content → System Voice → Manage Voices.
          </p>

          <hr className="my-3 border-rule" />
          <p className="label !my-0">Reading</p>
          <label className="mt-2 flex items-center gap-2">
            <input type="checkbox" checked={s.translations} onChange={(e) => updateSettings({ translations: e.target.checked })} className="accent-[var(--blue)]" />
            Show English translations
          </label>
          <div className="mt-2 flex items-center gap-2" role="group" aria-label="Text size">
            <span className="text-muted">Text size</span>
            <button type="button" className={seg(s.size < 1)} onClick={() => updateSettings({ size: 0.9 })}>A−</button>
            <button type="button" className={seg(s.size === 1)} onClick={() => updateSettings({ size: 1 })}>A</button>
            <button type="button" className={seg(s.size > 1)} onClick={() => updateSettings({ size: 1.15 })}>A+</button>
          </div>
        </div>
      )}
    </div>
  );
}
