"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { gradeWord } from "@/lib/actions";
import type { StudyWord } from "@/lib/data";
import { genderMark, genderTip } from "@/lib/gender";
import { speakText, useSettings } from "@/lib/settings";
import { SpeakButton } from "./SpeakButton";

type Mode = "type" | "gender" | "listen";
interface Result {
  ok: boolean;
  note?: string;
  given: string;
}

const fold = (s: string) =>
  s
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, " ")
    .trim();

const full = (w: StudyWord) => (w.article ? `${w.article} ${w.lemma}` : w.lemma);

export function StudySession({ mode, words }: { mode: Mode; words: StudyWord[] }) {
  const { translations } = useSettings();
  const [queue, setQueue] = useState(words);
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [missed, setMissed] = useState<StudyWord[]>([]);
  const [rightCount, setRight] = useState(0);
  const [, start] = useTransition();

  const w = queue[i];
  const finished = i >= queue.length;

  function submit(given: string) {
    if (!w || result) return;
    let res: Result;
    if (mode === "gender") {
      res = { ok: given === w.article, given, note: genderTip(w.lemma, w.article ?? "") ?? undefined };
    } else if (mode === "listen") {
      res = { ok: given === w.translation, given };
    } else {
      const g = fold(given);
      const ok = g === fold(full(w));
      const noArticle = !ok && w.article && g === fold(w.lemma);
      res = { ok, given, note: noArticle ? `Always learn the noun with its article: ${full(w)}.` : undefined };
    }
    setResult(res);
    start(() => gradeWord(w.id, res.ok));
    if (res.ok) setRight((r) => r + 1);
    else setMissed((m) => [...m, w]);
  }

  function next() {
    setResult(null);
    setAnswer("");
    setI((n) => n + 1);
  }

  // Keyboard: Enter checks or continues; 1-4 choose an option.
  useEffect(() => {
    if (finished) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "Enter" && !e.repeat) {
        if (t.tagName === "BUTTON" || t.tagName === "A") return;
        e.preventDefault();
        if (result) next();
        else if (mode === "type" && answer.trim()) submit(answer);
      }
      if (!result && t.tagName !== "INPUT") {
        const n = Number(e.key) - 1;
        if (mode === "gender" && n >= 0 && n < 3) submit(["der", "die", "das"][n]);
        if (mode === "listen" && n >= 0 && n < w.options.length) submit(w.options[n]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Listening: say each new word as soon as it appears (after the first answer, the browser allows it).
  useEffect(() => {
    if (mode === "listen" && w && i > 0) speakText(full(w));
  }, [mode, w, i]);

  if (finished) {
    const total = queue.length;
    return (
      <div className="mt-8 max-w-lg">
        <p className="grade stamp-in">{rightCount}/{total} {rightCount === total ? "Sehr gut!" : rightCount / total >= 0.75 ? "Gut!" : "Weiter üben"}</p>
        {missed.length > 0 ? (
          <>
            <h2 className="ui !mb-1 mt-8 text-2xl font-bold">To look at again</h2>
            <ul className="divide-y divide-rule border-y border-rule !list-none !pl-0">
              {missed.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    <span className="font-semibold">
                      {m.article && <span className={`mr-1 ${genderMark(m.article)}`}>{m.article}</span>}
                      {m.lemma}
                    </span>
                    <span className="text-muted">, {m.translation}</span>
                  </span>
                  <SpeakButton text={full(m)} audioFile={m.audioFile} />
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="btn btn-solid"
                onClick={() => {
                  setQueue(missed);
                  setMissed([]);
                  setRight(0);
                  setI(0);
                }}
              >
                Practise the {missed.length} you missed
              </button>
              <Link href="/wiederholung" className="btn">Back to review</Link>
            </div>
          </>
        ) : (
          <div className="mt-6">
            <p className="text-lg">Every word was right. They will come back later at longer intervals.</p>
            <Link href="/wiederholung" className="btn btn-solid mt-4">Back to review</Link>
          </div>
        )}
      </div>
    );
  }

  const optBase = "ui rounded-sm border px-4 py-2 text-lg text-left transition-colors duration-150";
  return (
    <div className="mt-6 max-w-lg">
      <div className="h-1.5 overflow-hidden rounded-sm bg-rule" role="progressbar" aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={i} aria-label="Session progress">
        <div className="h-full bg-blue transition-[width] duration-300 ease-linear" style={{ width: `${(i / queue.length) * 100}%` }} />
      </div>
      <p className="ui mt-2 text-base text-muted">Word {i + 1} of {queue.length}</p>

      <div key={i} className="karte fade-in mt-2 min-h-[18rem] px-7 pb-7 pt-3">
        <p className="ui !my-0 h-[2.2rem] text-lg text-muted">
          {mode === "type" && "Write it in German, with the article."}
          {mode === "gender" && "Which article does this noun take?"}
          {mode === "listen" && "Listen. What does it mean?"}
        </p>

        {mode === "type" && <p className="!mb-0 !mt-6 text-3xl font-semibold leading-tight">{w.translation}</p>}
        {mode === "gender" && (
          <p className="!mb-0 !mt-6 text-4xl font-bold leading-tight">
            {w.lemma}
            <span className="ml-3 text-lg font-normal text-muted">{w.translation}</span>
          </p>
        )}
        {mode === "listen" && (
          <div className="mt-6 flex items-center gap-3">
            <SpeakButton text={full(w)} audioFile={w.audioFile} />
            <span className="text-muted">Press to hear the word</span>
          </div>
        )}

        {!result && mode === "type" && (
          <div className="mt-6">
            <input
              autoFocus
              className="ink-field !w-full !text-left"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              aria-label="Your answer"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <button type="button" className="btn btn-solid mt-4" disabled={!answer.trim()} onClick={() => submit(answer)}>
              Check
            </button>
          </div>
        )}

        {!result && mode === "gender" && (
          <div className="mt-8 flex gap-3">
            {(["der", "die", "das"] as const).map((a, n) => (
              <button key={a} type="button" className={`${optBase} flex-1 border-rule bg-sheet text-center hover:border-blue`} onClick={() => submit(a)}>
                <span className="mr-2 text-sm text-muted">{n + 1}</span>
                {a}
              </button>
            ))}
          </div>
        )}

        {!result && mode === "listen" && (
          <ul className="mt-6 space-y-2 !list-none !pl-0">
            {w.options.map((o, n) => (
              <li key={o}>
                <button type="button" className={`${optBase} w-full border-rule bg-sheet hover:border-blue`} onClick={() => submit(o)}>
                  <span className="mr-3 text-sm text-muted">{n + 1}</span>
                  {o}
                </button>
              </li>
            ))}
          </ul>
        )}

        {result && (
          <div className="mt-6" role="status">
            <p className={`ui !my-0 text-xl font-semibold ${result.ok ? "text-good" : "text-red"}`}>
              {result.ok ? "Richtig!" : "Not quite."}
            </p>
            {!result.ok && result.given && mode === "type" && <p className="!my-0 struck inline-block">{result.given}</p>}
            <p className="!mb-0 !mt-2 text-3xl font-bold leading-tight">
              {w.article && <span className={`mr-2 ${genderMark(w.article)}`}>{w.article}</span>}
              {w.lemma}
              {w.plural && <span className="ml-2 text-lg font-normal text-muted">{w.plural}</span>}
            </p>
            <p className="!my-1 flex items-center gap-3 text-muted">
              <span className="ipa text-lg">{w.ipa}</span>
              <SpeakButton text={full(w)} audioFile={w.audioFile} />
            </p>
            <p className="!my-1">{w.translation}</p>
            {result.note && <p className="!my-2 border-l-2 border-red pl-3 italic">{result.note}</p>}
            <p className="!mb-0 !mt-3 text-[0.95rem]">
              {w.example}
              {translations && <span className="block italic text-muted">{w.exampleEn}</span>}
            </p>
            <button type="button" className="btn btn-solid mt-5" onClick={next}>
              {i + 1 === queue.length ? "Finish" : "Continue"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
