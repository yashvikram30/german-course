// Leitner-style spaced repetition: a correct answer moves a word up one box,
// a wrong answer drops it back two. Box 0 = not yet introduced.
export const BOX_INTERVAL_DAYS = [0, 1, 3, 7, 16, 35] as const;
export const MAX_BOX = 5;
const DAY = 86_400_000;

export type Level = "locked" | "learning" | "known" | "mastered";

export function levelOf(box: number | null | undefined): Level {
  if (!box) return "locked";
  if (box <= 2) return "learning";
  if (box <= 4) return "known";
  return "mastered";
}

export function nextBox(box: number, good: boolean) {
  const next = good ? Math.min(box + 1, MAX_BOX) : Math.max(box - 2, 1);
  return { box: next, due: Date.now() + BOX_INTERVAL_DAYS[next] * DAY };
}

