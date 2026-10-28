"use client";

import { useState, useTransition } from "react";
import type { ExerciseData, ExerciseItem } from "@/lib/blocks";
import { recordExercise } from "@/lib/actions";
import { SpeakButton } from "../SpeakButton";

type Verdict = "ok" | "case" | "bad";

const fold = (s: string) => s.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue");
const clean = (s: string) => fold(s).replace(/[.!?]+$/, "").replace(/\s+/g, " ").trim();

// Deterministic shuffle: server and browser must produce the same order.
function shuffle<T>(a: T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)), ((h ^= h >>> 16) >>> 0) / 4294967296);
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  // never hand out the solved order
  if (out.length > 1 && out.every((x, i) => x === a[i])) out.push(out.shift() as T);
  return out;
}

function judge(item: ExerciseItem, given: string): Verdict {
  const g = clean(given);
  if (!g) return "bad";
  if (item.answers.some((a) => clean(a) === g)) return "ok";
  if (item.answers.some((a) => clean(a).toLowerCase() === g.toLowerCase())) return "case";
  return "bad";
}

const gradeWord = (ratio: number) => (ratio === 1 ? "Sehr gut!" : ratio >= 0.75 ? "Gut!" : ratio >= 0.5 ? "Ausreichend" : "Weiter üben");

export function Exercise({
  data,
  chapterId,
  number,
  prior,
}: {
  data: ExerciseData;
  chapterId: string;
  number: number;
  prior?: { best: number; total: number } | null;
}) {
  const [answers, setAnswers] = useState<string[]>(() => data.items.map(() => ""));
  const [verdicts, setVerdicts] = useState<Verdict[] | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [, start] = useTransition();
  const isWrite = data.kind === "write";
  const matchOptions = data.kind === "match" ? shuffle([...new Set(data.items.map((i) => i.answers[0]))], data.id) : [];
  const checked = verdicts !== null;

  const set = (i: number, v: string) => setAnswers((a) => a.map((x, j) => (j === i ? v : x)));

  function check() {
    if (isWrite) {
      setVerdicts(["ok"]);
      start(() => recordExercise(data.id, chapterId, 1, 1));
      return;
    }
    const v = data.items.map((it, i) => judge(it, answers[i]));
    setVerdicts(v);
    start(() => recordExercise(data.id, chapterId, v.filter((x) => x !== "bad").length, v.length));
  }

  function reset() {
    setAnswers(data.items.map(() => ""));
    setVerdicts(null);
    setAttempt((a) => a + 1);
  }

  const score = verdicts && !isWrite ? verdicts.filter((v) => v !== "bad").length : 0;

  return (
    <section id={data.id} className="sheet my-10 scroll-mt-20" aria-label={`Exercise ${number}: ${data.title}`}>
      <p className="label !my-0">Übung {number}</p>
      <h3 className="sheet-title !my-0 !text-ink">{data.title}</h3>
      {data.intro && <p className="!my-1.5 text-[0.95rem] italic text-muted">{data.intro}</p>}
      {prior && !checked && <p className="!my-0 text-sm text-muted">Your best so far: {prior.best} of {prior.total}.</p>}

      <ol className="mt-5 space-y-5 !list-none !pl-0">
        {data.items.map((item, i) => {
          const v = verdicts?.[i];
          return (
            <li key={`${attempt}-${i}`} className="relative !pl-0">
              {checked && !isWrite && v && <Mark ok={v !== "bad"} />}
              <div className="flex gap-3">
                <span className="ui w-5 shrink-0 pt-1 text-right text-sm text-muted">{isWrite ? "" : i + 1}</span>
                <div className="min-w-0 flex-1">
                  <ItemBody data={data} item={item} index={i} value={answers[i]} verdict={v} onChange={(val) => set(i, val)} disabled={checked} matchOptions={matchOptions} />
                  {checked && !isWrite && v && <Remark verdict={v} item={item} />}
                  {checked && isWrite && (
                    <div className="mt-3">
                      <p className="ui !my-0 text-sm font-semibold text-red">Musterlösung</p>
                      <p className="correction !my-0 whitespace-pre-line !text-[1.5rem]">{item.answers[0].replaceAll(" / ", "\n")}</p>
                      {item.note && <p className="!my-1 text-[0.9rem] italic text-muted">{item.note}</p>}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        {!checked ? (
          <button type="button" className="btn btn-solid" onClick={check} disabled={!isWrite && answers.every((a) => !a.trim())}>
            {isWrite ? "Show model answer" : "Check answers"}
          </button>
        ) : (
          <>
            {!isWrite && (
              <span className="grade stamp-in" role="status">
                {score}/{data.items.length} {gradeWord(score / data.items.length)}
              </span>
            )}
            <button type="button" className="btn" onClick={reset}>
              {isWrite ? "Write again" : "Try again"}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

/** The teacher's mark in the margin: a tick or a cross that draws itself. */
function Mark({ ok }: { ok: boolean }) {
  return (
    <svg className="tick absolute -left-[3.1rem] top-0.5 h-7 w-7 text-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={ok ? "Correct" : "Incorrect"}>
      {ok ? <path d="M3 13 L9 19 L21 5" /> : <><path d="M5 5 L19 19" /><path d="M19 5 L5 19" /></>}
    </svg>
  );
}

/** Note under an answer, as written by the teacher. */
function Remark({ verdict, item }: { verdict: Verdict; item: ExerciseItem }) {
  const shownAnswer = item.answers.join("  /  ");
  return (
    <div className="mt-1 text-[0.92rem]" role="status">
      {verdict === "case" && (
        <p className="!my-0 text-red">Mind the capital letters: <span className="correction !text-[1.35rem]">{item.answers[0]}</span></p>
      )}
      {verdict === "bad" && item.options === undefined && item.answers[0] && (
        <p className="!my-0"><span className="correction">{shownAnswer}</span></p>
      )}
      {item.note && <p className="!my-0.5 italic text-muted">{item.note}</p>}
    </div>
  );
}

function ItemBody({
  data,
  item,
  index,
  value,
  verdict,
  onChange,
  disabled,
  matchOptions,
}: {
  data: ExerciseData;
  item: ExerciseItem;
  index: number;
  value: string;
  verdict?: Verdict;
  onChange: (v: string) => void;
  disabled: boolean;
  matchOptions: string[];
}) {
  const wrong = verdict === "bad";
  switch (data.kind) {
    case "gap": {
      const parts = item.prompt.split("___");
      return (
        <p className="!my-0 text-[1.1rem]">
          {parts[0]}
          <input
            className={`ink-field mx-1 ${wrong ? "struck" : ""}`}
            style={{ width: `${Math.max(6, (item.answers[0]?.length ?? 4) + 3)}ch` }}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`Answer ${index + 1}`}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          {parts.slice(1).join("___")}
        </p>
      );
    }
    case "choice":
    case "listen":
      return (
        <fieldset className="m-0 border-0 p-0" disabled={disabled}>
          <legend className="mb-2 text-[1.1rem]">
            {data.kind === "listen" ? (
              <span className="flex flex-wrap items-center gap-3">
                <SpeakButton text={item.prompt} />
                <span className="text-muted">{disabled ? <em>{item.prompt}</em> : "Listen, then choose what you heard."}</span>
              </span>
            ) : (
              item.prompt
            )}
          </legend>
          <div className="flex flex-wrap gap-x-3 gap-y-2" role="radiogroup">
            {item.options!.map((o) => {
              const isChosen = value === o;
              const isRight = item.answers[0] === o;
              let cls = "border-b border-rule";
              if (!disabled && isChosen) cls = "circled";
              if (disabled && isChosen && !wrong) cls = "circled";
              if (disabled && isChosen && wrong) cls = "struck border-b border-transparent";
              if (disabled && wrong && isRight) cls = "circled-red";
              return (
                <button
                  key={o}
                  type="button"
                  role="radio"
                  aria-checked={isChosen}
                  onClick={() => onChange(o)}
                  className={`ui rounded-sm px-2.5 py-0.5 text-[1.05rem] transition-colors duration-150 enabled:hover:bg-marker/30 ${cls}`}
                >
                  {o}
                </button>
              );
            })}
          </div>
        </fieldset>
      );
    case "translate":
      return (
        <div>
          <p className="!my-0 mb-1 text-[1.1rem]">{item.prompt}</p>
          <input
            className={`ink-field !w-full max-w-md !text-left ${wrong ? "struck" : ""}`}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`Translation ${index + 1}`}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      );
    case "match":
      return (
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="min-w-40 text-[1.1rem] font-semibold">{item.prompt}</span>
          <select className={`ink-field ${wrong ? "struck" : ""}`} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} aria-label={`Meaning of ${item.prompt}`}>
            <option value="">choose</option>
            {matchOptions.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
      );
    case "order":
      return <OrderItem prompt={item.prompt} answer={item.answers[0]} onChange={onChange} disabled={disabled} wrong={wrong} />;
    case "write":
      return (
        <div>
          <p className="!my-0 mb-2 text-[1.1rem]">{item.prompt}</p>
          <textarea className="ruled ink" rows={5} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} aria-label="Your text" spellCheck={false} />
        </div>
      );
  }
}

function OrderItem({ prompt, answer, onChange, disabled, wrong }: { prompt: string; answer: string; onChange: (v: string) => void; disabled: boolean; wrong: boolean }) {
  const [pool] = useState(() => shuffle(answer.split(" ").map((t, id) => ({ t, id })), answer));
  const [chosen, setChosen] = useState<number[]>([]);
  const update = (next: number[]) => {
    setChosen(next);
    onChange(next.map((id) => pool.find((p) => p.id === id)!.t).join(" "));
  };
  const slip = "ui rounded-sm border border-rule bg-sheet px-2.5 py-1 text-[1.05rem] shadow-[0_1px_0_var(--rule)] transition-colors duration-150";
  return (
    <div>
      <p className="!my-0 text-[1.1rem]">{prompt}</p>
      <div className={`mt-2 flex min-h-11 flex-wrap items-center gap-1.5 border-b-2 border-dotted border-blue pb-1.5 ${wrong ? "struck" : ""}`} aria-label="Your sentence">
        {chosen.map((id) => (
          <button key={id} type="button" disabled={disabled} className={`${slip} ink !text-[1.4rem]`} onClick={() => update(chosen.filter((c) => c !== id))}>
            {pool.find((p) => p.id === id)!.t}
          </button>
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {pool.map((p) => (
          <button key={p.id} type="button" disabled={disabled || chosen.includes(p.id)} className={`${slip} enabled:hover:bg-marker/30 disabled:opacity-30`} onClick={() => update([...chosen, p.id])}>
            {p.t}
          </button>
        ))}
      </div>
    </div>
  );
}
