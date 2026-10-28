"use client";

import { getSettings, speakText } from "@/lib/settings";

const Speaker = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 9v6h4l5 4V5L8 9H4z" />
    <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
  </svg>
);

/** Plays a recording when one exists, otherwise the browser's German voice (see Settings). */
export function SpeakButton({ text, audioFile, className = "" }: { text: string; audioFile?: string | null; className?: string }) {
  function play(slow: boolean) {
    if (audioFile) {
      const a = new Audio(audioFile);
      a.playbackRate = slow ? 0.7 : getSettings().rate + 0.1;
      a.play().catch(() => speakText(text, slow));
    } else speakText(text, slow);
  }
  const base = "ui inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-rule px-1.5 text-muted transition-colors duration-150 hover:border-blue hover:text-blue";
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 align-middle ${className}`}>
      <button type="button" className={base} aria-label={`Play: ${text}`} onClick={() => play(false)}>
        <Speaker />
      </button>
      <button type="button" className={`${base} text-[0.8rem] font-medium`} aria-label={`Play slowly: ${text}`} onClick={() => play(true)}>
        slow
      </button>
    </span>
  );
}
