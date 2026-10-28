// Pure scoring helpers, shared by the exam runner and the results page.
import type { Exam, ExamExercise, ModuleKey } from "./exam";

export const FACTOR = 1.66;

const fold = (s: string) => s.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue");
const clean = (s: string) => fold(s).replace(/[.!?]+$/, "").replace(/\s+/g, " ").trim().toLowerCase();

/** One item right? Spelling variants (ae/ä) and capitals are forgiven, as in the real form-filling task. */
export function itemCorrect(kind: ExamExercise["kind"], answers: string[], given: string | undefined) {
  if (!given) return false;
  const g = clean(given);
  return answers.some((a) => clean(a) === g);
}

export function exercisesOf(exam: Exam, key: ModuleKey) {
  const m = exam.modules.find((x) => x.key === key);
  return m ? m.teile.flatMap((t) => t.blocks.flatMap((b) => (b.t === "ex" ? [b.ex] : []))) : [];
}

/** Automatically marked points of a module: all multiple-choice, true/false and form items. */
export function autoScore(exam: Exam, key: ModuleKey, answers: Record<string, string[]>) {
  let got = 0;
  let max = 0;
  for (const ex of exercisesOf(exam, key)) {
    if (ex.kind === "write") continue;
    ex.items.forEach((it, i) => {
      max++;
      if (itemCorrect(ex.kind, it.answers, answers[ex.id]?.[i])) got++;
    });
  }
  return { got, max };
}

export const WRITE_CONTENT = [0, 1.5, 3] as const;
export const WRITE_FORM = [0, 0.5, 1] as const;

export function grade(points: number) {
  return points >= 90 ? "sehr gut" : points >= 80 ? "gut" : points >= 70 ? "befriedigend" : points >= 60 ? "ausreichend" : "nicht bestanden";
}

export function official(rawTotal: number) {
  return Math.round(rawTotal * FACTOR);
}
