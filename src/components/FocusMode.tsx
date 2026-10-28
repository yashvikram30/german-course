"use client";

import { useEffect, useState } from "react";
import { updateSettings, useSettings } from "@/lib/settings";

const clock = (s: number) => `${Math.floor(s / 3600) ? `${Math.floor(s / 3600)}:` : ""}${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

// Mounted only while focus is on, so the count restarts each time.
function Elapsed() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSecs((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="tabular-nums text-muted" aria-label="Time in focus mode">{clock(secs)}</span>;
}

// Focus mode hides the header, the tutor and the side outline (anything marked .focus-hide) and shows a small timer.
export function FocusMode() {
  const { focus } = useSettings();

  useEffect(() => {
    if (focus) document.documentElement.setAttribute("data-focus", "");
    else document.documentElement.removeAttribute("data-focus");
  }, [focus]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || el.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key.toLowerCase() === "f") updateSettings({ focus: !focus });
      else if (e.key === "Escape" && focus) updateSettings({ focus: false });
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [focus]);

  if (!focus) return null;
  return (
    <div className="focus-pill no-print ui fixed right-4 top-4 z-40 flex items-center gap-3 rounded-sm border border-rule bg-paper/90 px-3 py-1.5 text-base shadow-sm backdrop-blur">
      <Elapsed />
      <button type="button" className="font-medium hover:text-blue" title="Esc or F" onClick={() => updateSettings({ focus: false })}>
        Exit focus
      </button>
    </div>
  );
}
