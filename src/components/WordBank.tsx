"use client";

import { useMemo, useState, useTransition } from "react";
import { startWord } from "@/lib/actions";
import type { BankWord } from "@/lib/data";
import { genderMark } from "@/lib/gender";
import { type Level, MAX_BOX, levelOf } from "@/lib/srs";
import { useSettings } from "@/lib/settings";
import { SpeakButton } from "./SpeakButton";

const LEVELS: { id: Level; label: string }[] = [
  { id: "locked", label: "Not in review" },
  { id: "learning", label: "Learning" },
  { id: "known", label: "Known" },
  { id: "mastered", label: "Mastered" },
];

export function WordBank({ words, chapterTitles }: { words: BankWord[]; chapterTitles: Record<string, string> }) {
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<Level | "all">("all");
  const [gender, setGender] = useState("all");
  const [chapter, setChapter] = useState("all");

  const counts = useMemo(() => {
    const c: Record<Level, number> = { locked: 0, learning: 0, known: 0, mastered: 0 };
    for (const w of words) c[levelOf(w.box)]++;
    return c;
  }, [words]);

  const needle = q.trim().toLowerCase();
  const shown = words.filter((w) => {
    if (level !== "all" && levelOf(w.box) !== level) return false;
    if (gender !== "all" && (w.article ?? "none") !== gender) return false;
    if (chapter !== "all" && w.chapterId !== chapter) return false;
    return !needle || w.lemma.toLowerCase().includes(needle) || w.translation.toLowerCase().includes(needle);
  });
  const groups = [...new Set(shown.map((w) => w.chapterId))];
  const field = "ui rounded-sm border border-rule bg-sheet px-2.5 py-1.5 text-base";

  return (
    <div className="mt-6 space-y-6">
      <div className="border-l-2 border-blue pl-5">
        <div className="flex h-2.5 overflow-hidden rounded-sm bg-rule" role="img" aria-label={`${words.length - counts.locked} of ${words.length} words in review`}>
          <Seg n={counts.mastered} total={words.length} cls="bg-good" />
          <Seg n={counts.known} total={words.length} cls="bg-der" />
          <Seg n={counts.learning} total={words.length} cls="bg-marker" />
        </div>
        <div className="ui mt-3 flex flex-wrap gap-x-5 gap-y-1 text-base">
          <Legend cls="bg-good" label="Mastered" n={counts.mastered} />
          <Legend cls="bg-der" label="Known" n={counts.known} />
          <Legend cls="bg-marker" label="Learning" n={counts.learning} />
          <Legend cls="bg-rule" label="Not in review" n={counts.locked} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search German or English" aria-label="Search" className={`${field} min-w-48 flex-1`} />
        <select value={level} onChange={(e) => setLevel(e.target.value as Level | "all")} className={field} aria-label="Level">
          <option value="all">All levels</option>
          {LEVELS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
        <select value={gender} onChange={(e) => setGender(e.target.value)} className={field} aria-label="Gender">
          <option value="all">All genders</option>
          <option value="der">der</option>
          <option value="die">die</option>
          <option value="das">das</option>
          <option value="none">no article</option>
        </select>
        <select value={chapter} onChange={(e) => setChapter(e.target.value)} className={field} aria-label="Chapter">
          <option value="all">All chapters</option>
          {Object.entries(chapterTitles).map(([id, t]) => <option key={id} value={id}>{t}</option>)}
        </select>
      </div>

      {groups.map((g) => (
        <section key={g}>
          <h2 className="ui !mb-0 !mt-2 text-2xl font-bold">{chapterTitles[g] ?? g}</h2>
          <ul className="mt-4 grid gap-4 !list-none !pl-0 sm:grid-cols-2 lg:grid-cols-3">
            {shown.filter((w) => w.chapterId === g).map((w) => <Tile key={w.id} w={w} />)}
          </ul>
        </section>
      ))}
      {shown.length === 0 && <p className="text-muted">No words match these filters.</p>}
    </div>
  );
}

function Tile({ w }: { w: BankWord }) {
  const { translations } = useSettings();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const inReview = w.box > 0;
  return (
    <li className="border border-t-[3px] border-rule border-t-red bg-sheet p-3.5 shadow-[0_10px_16px_-14px_var(--shadow)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="!my-0 text-xl font-semibold leading-tight">
            {w.article && <span className={`mr-1 ${genderMark(w.article)}`}>{w.article}</span>}
            {w.lemma}
            {w.plural && <span className="ml-1 text-sm font-normal text-muted">{w.plural}</span>}
          </p>
          <p className="!my-0 ipa text-base text-muted">{w.ipa}</p>
        </div>
        <SpeakButton text={w.article ? `${w.article} ${w.lemma}` : w.lemma} audioFile={w.audioFile} />
      </div>
      <p className="!my-1.5 text-[1.05rem]">{w.translation}</p>
      <button type="button" className="ui text-base text-muted underline underline-offset-2 hover:text-blue" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Hide example" : "Example"}
      </button>
      {open && (
        <p className="!my-1 text-[0.95rem]">
          {w.example}
          {translations && <span className="block italic text-muted">{w.exampleEn}</span>}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="flex flex-1 gap-0.5" title={inReview ? `Level ${w.box} of ${MAX_BOX}` : "Not in review"}>
          {Array.from({ length: MAX_BOX }, (_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-sm ${i < w.box ? "bg-blue" : "bg-rule"}`} />
          ))}
        </span>
        {!inReview && (
          <button type="button" className="ui rounded-sm border border-rule px-2 py-0.5 text-base hover:border-blue hover:text-blue" disabled={pending} onClick={() => start(() => startWord(w.id))}>
            + Review
          </button>
        )}
      </div>
    </li>
  );
}

function Seg({ n, total, cls }: { n: number; total: number; cls: string }) {
  return <div className={cls} style={{ width: `${total ? (n / total) * 100 : 0}%` }} />;
}

function Legend({ cls, label, n }: { cls: string; label: string; n: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-sm ${cls}`} />
      {label} <b>{n}</b>
    </span>
  );
}
