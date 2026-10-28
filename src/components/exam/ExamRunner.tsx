"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Exam, ExamBlock, ExamExercise, ExamModule, ModuleKey } from "@/lib/exam";
import { FACTOR, WRITE_CONTENT, WRITE_FORM, autoScore, exercisesOf, grade, itemCorrect, official } from "@/lib/examScore";
import { saveExamAttempt } from "@/lib/actions";
import { speakText } from "@/lib/settings";

type Answers = Record<string, string[]>;
type Phase = "start" | "run" | "between" | "results";

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

function AudioPlay({ text, max, used, onPlay }: { text: string; max: number; used: number; onPlay: () => void }) {
  const left = max - used;
  return (
    <span className="ui inline-flex items-center gap-3">
      <button
        type="button"
        className="btn"
        disabled={left <= 0}
        onClick={() => {
          onPlay();
          speakText(text);
        }}
      >
        ▶ Play
      </button>
      <span className="text-base text-muted">{left > 0 ? `${left} of ${max} plays left` : "No plays left"}</span>
    </span>
  );
}

function ExerciseView(props: {
  ex: ExamExercise;
  maxPlays: number;
  startAt: number;
  answers: Answers;
  setAnswer: (exId: string, i: number, v: string, n: number) => void;
  plays: Record<string, number>;
  addPlay: (key: string) => void;
}) {
  const { ex, maxPlays, startAt, answers, setAnswer, plays, addPlay } = props;
  const val = (i: number) => answers[ex.id]?.[i] ?? "";
  return (
    <section className="mt-6">
      <h4 className="ui !my-0 text-xl font-bold">{ex.title}</h4>
      {ex.intro && <p className="!mt-1 text-muted">{ex.intro}</p>}
      <ol className="mt-3 space-y-5 !pl-0" style={{ listStyle: "none" }}>
        {ex.items.map((it, i) => (
          <li key={i} className="border-l-2 border-rule pl-4">
            {ex.kind === "listen" ? (
              <div className="mb-2">
                <span className="ui mr-3 font-semibold">Aufgabe {startAt + i + 1}</span>
                <AudioPlay text={it.prompt} max={maxPlays} used={plays[`${ex.id}:${i}`] ?? 0} onPlay={() => addPlay(`${ex.id}:${i}`)} />
              </div>
            ) : ex.kind === "gap" ? null : ex.kind === "write" ? null : <p className="!mb-2 !mt-0 text-[1.05rem]">{it.prompt}</p>}

            {(ex.kind === "listen" || ex.kind === "choice") && (
              <div className="flex flex-wrap gap-x-3 gap-y-2" role="radiogroup">
                {it.options!.map((o) => (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={val(i) === o}
                    onClick={() => setAnswer(ex.id, i, o, ex.items.length)}
                    className={`ui rounded-sm px-2.5 py-0.5 text-[1.05rem] transition-colors duration-150 hover:bg-marker/30 ${val(i) === o ? "circled" : "border-b border-rule"}`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            )}

            {ex.kind === "gap" && (
              <label className="flex flex-wrap items-baseline gap-2 text-[1.05rem]">
                <span>{it.prompt.split("___")[0]}</span>
                <input
                  value={val(i)}
                  onChange={(e) => setAnswer(ex.id, i, e.target.value, ex.items.length)}
                  className="ui min-w-[14rem] border-b-2 border-blue bg-transparent px-1 text-[1.1rem] outline-none focus:border-red"
                  autoComplete="off"
                  spellCheck={false}
                />
                <span>{it.prompt.split("___")[1]}</span>
              </label>
            )}

            {ex.kind === "write" && (
              <div>
                <textarea
                  value={val(i)}
                  onChange={(e) => setAnswer(ex.id, i, e.target.value, ex.items.length)}
                  rows={7}
                  className="w-full rounded-sm border-2 border-rule bg-paper-2 p-3 text-[1.05rem] outline-none focus:border-blue"
                  placeholder="Schreiben Sie hier …"
                  spellCheck={false}
                />
                <p className="ui !my-1 text-base text-muted">{words(val(i))} words · about 30 expected</p>
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function BlockView({ b, ...rest }: { b: ExamBlock } & Omit<Parameters<typeof ExerciseView>[0], "ex">) {
  if (b.t === "md") {
    return (
      <div className="mt-3">
        <Markdown remarkPlugins={[remarkGfm]}>{b.md}</Markdown>
      </div>
    );
  }
  if (b.t === "text") {
    return (
      <figure className="my-4 rounded-sm border-2 border-rule bg-sheet px-5 py-3">
        {b.title && <figcaption className="ui !mb-1 font-bold">{b.title}</figcaption>}
        {b.lines.map((l, i) => (
          <p key={i} className="!my-1 text-[1.05rem] leading-snug">
            {l.speaker && <strong>{l.speaker}: </strong>}
            {l.de}
          </p>
        ))}
      </figure>
    );
  }
  if (b.t === "cards") {
    if (b.cards.length === 0) return null;
    return (
      <div className="my-4 grid gap-3 sm:grid-cols-2">
        {b.cards.map((c, i) => (
          <div key={i} className="ui rounded-sm border-2 border-blue bg-sheet px-4 py-3 text-lg font-semibold">
            {c}
          </div>
        ))}
      </div>
    );
  }
  return <ExerciseView ex={b.ex} {...rest} />;
}

export function ExamRunner({ exam, history }: { exam: Exam; history: { takenAt: number; total: number }[] }) {
  const [phase, setPhase] = useState<Phase>("start");
  const [timed, setTimed] = useState(true);
  const [queue, setQueue] = useState<ModuleKey[]>([]);
  const [qi, setQi] = useState(0);
  const [left, setLeft] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [plays, setPlays] = useState<Record<string, number>>({});
  const [confirm, setConfirm] = useState<"hand" | "exit" | null>(null);
  const [self, setSelf] = useState({ wc1: 0, wc2: 0, wc3: 0, wf: 0, s1: 0, s2: 0, s3: 0 });
  const [saved, setSaved] = useState<number | null>(null);
  const [, start] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  const mod: ExamModule | undefined = exam.modules.find((m) => m.key === queue[qi]);
  const full = queue.length === exam.modules.length;

  function begin(keys: ModuleKey[]) {
    setQueue(keys);
    setQi(0);
    setAnswers({});
    setPlays({});
    setSelf({ wc1: 0, wc2: 0, wc3: 0, wf: 0, s1: 0, s2: 0, s3: 0 });
    setSaved(null);
    openModule(keys[0]);
  }
  function openModule(key: ModuleKey) {
    const m = exam.modules.find((x) => x.key === key)!;
    setLeft(m.minutes * 60);
    setConfirm(null);
    setPhase("run");
    scrollRef.current?.scrollTo({ top: 0 });
  }
  function finishModule() {
    setConfirm(null);
    if (qi + 1 < queue.length) setPhase("between");
    else setPhase("results");
  }

  const finishRef = useRef(finishModule);
  finishRef.current = finishModule;
  useEffect(() => {
    if (phase !== "run" || !timed) return;
    const t = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          clearInterval(t);
          setTimeout(() => finishRef.current(), 0);
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, timed, qi]);

  // Speech must stop when the exam part ends.
  useEffect(() => {
    if (phase !== "run" && typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, [phase]);

  const setAnswer = (exId: string, i: number, v: string, n: number) =>
    setAnswers((a) => {
      const row = a[exId] ? [...a[exId]] : Array(n).fill("");
      row[i] = v;
      return { ...a, [exId]: row };
    });
  const addPlay = (k: string) => setPlays((p) => ({ ...p, [k]: (p[k] ?? 0) + 1 }));

  // ---- scores ----
  const taken = (k: ModuleKey) => queue.includes(k);
  const hoeren = autoScore(exam, "hoeren", answers).got;
  const lesen = autoScore(exam, "lesen", answers).got;
  const s1 = autoScore(exam, "schreiben", answers).got;
  const s2 = WRITE_CONTENT[self.wc1] + WRITE_CONTENT[self.wc2] + WRITE_CONTENT[self.wc3] + WRITE_FORM[self.wf];
  const schreiben = s1 + s2;
  const sprechen = self.s1 + self.s2 + self.s3;
  const rows: [ModuleKey, string, number][] = [
    ["hoeren", "Hören", hoeren],
    ["lesen", "Lesen", lesen],
    ["schreiben", "Schreiben", schreiben],
    ["sprechen", "Sprechen", sprechen],
  ];
  const raw = rows.filter(([k]) => taken(k)).reduce((n, [, , v]) => n + v, 0);
  const points = official(raw);

  const shared = { answers, setAnswer, plays, addPlay };

  // ---------- start ----------
  if (phase === "start") {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="ui !my-0 text-lg text-muted"><Link href="/pruefung" className="underline">Prüfung</Link> / {exam.title}</p>
        <h1 className="ui !mb-1 !mt-1 text-[2.8rem] font-bold leading-tight tracking-tight">{exam.title}</h1>
        <p className="!mt-0 text-xl italic text-muted">Goethe-Zertifikat A1: Start Deutsch 1, exam mode</p>

        <div className="table-wrap tbl mt-6 overflow-x-auto">
          <table>
            <thead><tr><th>Part</th><th>Time</th><th>Teile</th><th>Points</th></tr></thead>
            <tbody>
              {exam.modules.map((m) => (
                <tr key={m.key}><td><strong>{m.title}</strong></td><td>{m.minutes} min</td><td>{m.teile.length}</td><td>15</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="mt-4 space-y-1.5">
          <li>You work in <strong>one part at a time</strong> and the clock runs. When time is up the part is handed in automatically.</li>
          <li>In <strong>Hören</strong>, Teil 1 and 3 can be played <strong>twice</strong>, Teil 2 only <strong>once</strong>. The text is never shown.</li>
          <li>There are <strong>no hints, translations or answers</strong> until the whole exam is finished. Wrong answers cost nothing: do not leave gaps.</li>
          <li><strong>Sprechen</strong>: say your answers aloud. You score that part yourself afterwards, so be strict.</li>
          <li>Pass mark: <strong>60 of 100</strong> points (raw points × {FACTOR}).</li>
        </ul>

        <label className="ui mt-5 flex items-center gap-3 text-lg">
          <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} className="h-5 w-5 accent-[var(--blue)]" />
          Run the real timer {timed ? "" : "(off: untimed practice)"}
        </label>

        <div className="ui mt-5 flex flex-wrap gap-3">
          <button type="button" className="btn btn-solid" onClick={() => begin(exam.modules.map((m) => m.key))}>Start the full exam</button>
          {exam.modules.map((m) => (
            <button key={m.key} type="button" className="btn" onClick={() => begin([m.key])}>Only {m.title}</button>
          ))}
        </div>

        {history.length > 0 && (
          <p className="ui mt-6 text-base text-muted">
            Your earlier results for this test: {history.map((h) => `${h.total} (${new Date(h.takenAt).toLocaleDateString("en-GB")})`).join(", ")}
          </p>
        )}
      </div>
    );
  }

  // ---------- between modules ----------
  if (phase === "between") {
    const next = exam.modules.find((m) => m.key === queue[qi + 1])!;
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <p className="label">Part finished</p>
        <h2 className="ui !mt-1 text-4xl font-bold">Next: {next.title}</h2>
        <p className="text-lg text-muted">{next.minutes} minutes{timed ? "" : " (untimed)"}. Take a breath. In the real exam there is no break, so start when you are ready.</p>
        <button type="button" className="btn btn-solid mt-3" onClick={() => { setQi(qi + 1); openModule(next.key); }}>Start {next.title}</button>
      </div>
    );
  }

  // ---------- results ----------
  if (phase === "results") {
    const writeEx = exercisesOf(exam, "schreiben").find((e) => e.kind === "write");
    const writeText = writeEx ? answers[writeEx.id]?.[0] ?? "" : "";
    return (
      <div className="mx-auto max-w-3xl">
        <p className="ui !my-0 text-lg text-muted"><Link href="/pruefung" className="underline">Prüfung</Link> / {exam.title} / Result</p>
        <h1 className="ui !mb-2 !mt-1 text-[2.6rem] font-bold leading-tight">Your result</h1>

        <div className="table-wrap tbl overflow-x-auto">
          <table>
            <thead><tr><th>Part</th><th>Raw</th><th>× {FACTOR}</th></tr></thead>
            <tbody>
              {rows.map(([k, name, v]) => (
                <tr key={k}><td>{name}</td><td>{taken(k) ? `${v} / 15` : "not taken"}</td><td>{taken(k) ? (v * FACTOR).toFixed(1) : "–"}</td></tr>
              ))}
              {full && <tr><td><strong>Total</strong></td><td><strong>{raw} / 60</strong></td><td><strong>{points} / 100</strong></td></tr>}
            </tbody>
          </table>
        </div>

        {full ? (
          <p className="ui !mt-2 text-2xl font-bold">
            <span className={points >= 60 ? "text-blue" : "text-red"}>{points >= 60 ? "Bestanden" : "Nicht bestanden"}</span>
            <span className="ml-3 font-normal text-muted">{points} points · {grade(points)}</span>
          </p>
        ) : (
          <p className="text-muted">You practised a single part. Take the full exam to get a total and a pass or fail.</p>
        )}

        {taken("schreiben") && (
          <section className="mt-8">
            <h2 className="ui !mb-1 text-2xl font-bold">Mark your writing (Teil 2)</h2>
            <p className="!mt-0 text-muted">Compare with the model, then give points for each content point and for the text type (greeting and closing).</p>
            <p className="ui !mb-1 font-semibold">Your text</p>
            <blockquote className="whitespace-pre-wrap">{writeText || "(nothing written)"}</blockquote>
            <p className="ui !mb-1 font-semibold">Model</p>
            <blockquote>{writeEx?.items[0].answers[0]}</blockquote>
            <p className="text-base text-muted">{writeEx?.items[0].note}</p>
            <div className="ui grid gap-2 sm:grid-cols-2">
              {([["wc1", "Content point 1", WRITE_CONTENT], ["wc2", "Content point 2", WRITE_CONTENT], ["wc3", "Content point 3", WRITE_CONTENT], ["wf", "Text type (greeting, closing)", WRITE_FORM]] as const).map(([key, label, opts]) => (
                <label key={key} className="flex items-center justify-between gap-3 border-b border-rule py-1">
                  <span>{label}</span>
                  <select value={self[key]} onChange={(e) => setSelf({ ...self, [key]: Number(e.target.value) })} className="rounded-sm border border-rule bg-paper px-2 py-1">
                    {opts.map((p, idx) => <option key={p} value={idx}>{p} points</option>)}
                  </select>
                </label>
              ))}
            </div>
            <p className="ui !mt-2">Writing: form {s1} / 5 + message {s2} / 10 = <strong>{schreiben} / 15</strong></p>
          </section>
        )}

        {taken("sprechen") && (
          <section className="mt-8">
            <h2 className="ui !mb-1 text-2xl font-bold">Mark your speaking</h2>
            <p className="!mt-0 text-muted">Be strict. Teil 1 needs all seven keywords, a spelled word and a clear number. Teil 2 and 3 need real questions or requests <em>and</em> real reactions, twice each.</p>
            <div className="ui grid gap-2 sm:grid-cols-3">
              {([["s1", "Teil 1 (max 3)", 3], ["s2", "Teil 2 (max 6)", 6], ["s3", "Teil 3 (max 6)", 6]] as const).map(([key, label, max]) => (
                <label key={key} className="flex items-center justify-between gap-3 border-b border-rule py-1">
                  <span>{label}</span>
                  <select value={self[key]} onChange={(e) => setSelf({ ...self, [key]: Number(e.target.value) })} className="rounded-sm border border-rule bg-paper px-2 py-1">
                    {Array.from({ length: max + 1 }, (_, p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
              ))}
            </div>
            {exam.modules.find((m) => m.key === "sprechen")?.teile.map((t) => (
              <div key={t.title} className="mt-3">
                <p className="ui !mb-0 font-semibold">{t.title}: model answers</p>
                {t.blocks.map((b, i) => b.t === "cards" ? (
                  <ul key={i} className="!my-1 text-[1rem]">{b.model.map((m, j) => <li key={j}>{m.de}</li>)}</ul>
                ) : null)}
              </div>
            ))}
            <p className="ui !mt-2">Speaking: <strong>{sprechen} / 15</strong></p>
          </section>
        )}

        <section className="mt-8">
          <h2 className="ui !mb-1 text-2xl font-bold">Review</h2>
          {rows.filter(([k]) => taken(k) && (k === "hoeren" || k === "lesen" || k === "schreiben")).map(([k, name]) => (
            <div key={k} className="mt-4">
              <h3 className="ui !mb-1 text-xl font-bold text-blue">{name}</h3>
              {exercisesOf(exam, k).filter((e) => e.kind !== "write").map((ex) => (
                <div key={ex.id} className="mt-2">
                  <p className="ui !my-1 font-semibold">{ex.title}</p>
                  <ul className="!my-0 !pl-0" style={{ listStyle: "none" }}>
                    {ex.items.map((it, i) => {
                      const given = answers[ex.id]?.[i] ?? "";
                      const ok = itemCorrect(ex.kind, it.answers, given);
                      return (
                        <li key={i} className="flex gap-3 border-b border-rule py-1.5 text-[1rem]">
                          <span className={`ui w-5 font-bold ${ok ? "text-blue" : "text-red"}`}>{ok ? "✓" : "✗"}</span>
                          <span className="flex-1">
                            {ex.kind === "listen" ? <em>“{it.prompt}”</em> : it.prompt}
                            <br />
                            <span className="text-muted">Your answer: {given || "(blank)"}</span>
                            {!ok && <span className="correction ml-3 !text-[1.35rem]">{it.answers[0].replaceAll(" / ", " or ")}</span>}
                            {it.note && <span className="block text-[0.95rem] text-muted">{it.note}</span>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </section>

        <div className="ui mt-8 flex flex-wrap gap-3">
          {full && (
            <button
              type="button"
              className="btn btn-solid"
              disabled={saved !== null}
              onClick={() => start(async () => { const r = await saveExamAttempt({ examId: exam.id, timed, hoeren, lesen, schreiben, sprechen }); setSaved(r.total); })}
            >
              {saved !== null ? `Saved: ${saved} points` : "Save this result"}
            </button>
          )}
          <button type="button" className="btn" onClick={() => setPhase("start")}>Back to the start</button>
          <Link href="/pruefung" className="btn">All tests</Link>
        </div>
      </div>
    );
  }

  // ---------- running ----------
  const low = timed && left <= 300;
  return (
    <div ref={scrollRef} className="fixed inset-0 z-[70] overflow-y-auto bg-paper" role="dialog" aria-label={`${exam.title}: ${mod?.title}`}>
      <div className="sticky top-0 z-10 border-b-2 border-blue bg-paper">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-2">
          <p className="ui !my-0 text-lg"><strong>{exam.title}</strong> · {mod?.title} <span className="text-muted">({qi + 1}/{queue.length})</span></p>
          <p className={`ui !my-0 text-2xl font-bold tabular-nums ${low ? "text-red" : "text-blue"}`}>{timed ? mmss(left) : "untimed"}</p>
          <div className="ui flex gap-2">
            {confirm === "hand" ? (
              <>
                <button type="button" className="btn btn-solid" onClick={finishModule}>Yes, hand in</button>
                <button type="button" className="btn" onClick={() => setConfirm(null)}>Keep working</button>
              </>
            ) : confirm === "exit" ? (
              <>
                <button type="button" className="btn btn-solid" onClick={() => { setPhase("start"); setConfirm(null); }}>Yes, leave exam</button>
                <button type="button" className="btn" onClick={() => setConfirm(null)}>Stay</button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-solid" onClick={() => setConfirm("hand")}>Hand in this part</button>
                <button type="button" className="btn" onClick={() => setConfirm("exit")}>Exit</button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-24 pt-6">
        {(() => {
          let n = 0;
          return mod?.teile.map((t, ti) => (
            <section key={ti} className="mb-10">
              {t.title && <h3 className="ui !mb-0 border-b-2 border-blue pb-1 text-2xl font-bold">{t.title}</h3>}
              {t.blocks.map((b, bi) => {
                const startAt = n;
                if (b.t === "ex" && b.ex.kind === "listen") n += b.ex.items.length;
                return <BlockView key={bi} b={b} startAt={startAt} maxPlays={mod.key === "hoeren" && /Teil 2/.test(t.title) ? 1 : 2} {...shared} />;
              })}
            </section>
          ));
        })()}
        <button type="button" className="btn btn-solid ui" onClick={() => setConfirm("hand")}>Hand in this part</button>
      </div>
    </div>
  );
}
