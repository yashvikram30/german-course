import type { ReactNode } from "react";

const KINDS = {
  merke: { title: "Merke", cls: "note-merke" },
  achtung: { title: "Achtung!", cls: "note-achtung" },
  tipp: { title: "Tipp", cls: "note-tipp" },
  kultur: { title: "Landeskunde", cls: "note-kultur" },
  englisch: { title: "Compared with English", cls: "note-englisch" },
} as const;

export type CalloutKind = keyof typeof KINDS;
export const isCallout = (k: string): k is CalloutKind => k in KINDS;

export function Callout({ kind, children }: { kind: CalloutKind; children: ReactNode }) {
  const k = KINDS[kind];
  return (
    <aside className={`note ${k.cls}`}>
      <p className="note-title">{k.title}</p>
      <div className="[&>p:first-child]:mt-1 [&>p:last-child]:mb-0 [&>ul:last-child]:mb-0">{children}</div>
    </aside>
  );
}
