"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { chapterProgress, db, examAttempts, exerciseProgress, vocab, vocabProgress } from "@/db";
import { nextBox } from "./srs";

const DAY = 86_400_000;

export async function openChapter(chapterId: string) {
  const now = Date.now();
  db.insert(chapterProgress)
    .values({ chapterId, lastOpened: now })
    .onConflictDoUpdate({ target: chapterProgress.chapterId, set: { lastOpened: now } })
    .run();
}

/** Marks a chapter as read and puts all of its words into the review queue (due tomorrow). */
export async function markChapterRead(chapterId: string) {
  const now = Date.now();
  db.insert(chapterProgress)
    .values({ chapterId, lastOpened: now, readAt: now })
    .onConflictDoUpdate({ target: chapterProgress.chapterId, set: { readAt: now } })
    .run();
  const words = db.select({ id: vocab.id }).from(vocab).where(eq(vocab.chapterId, chapterId)).all();
  for (const { id } of words) {
    db.insert(vocabProgress).values({ vocabId: id, box: 1, due: now + DAY, lastSeen: now }).onConflictDoNothing().run();
  }
  revalidatePath("/", "layout");
  return { words: words.length };
}

export async function recordExercise(exerciseId: string, chapterId: string, correct: number, total: number) {
  const now = Date.now();
  const prev = db.select().from(exerciseProgress).where(eq(exerciseProgress.exerciseId, exerciseId)).get();
  if (prev) {
    db.update(exerciseProgress)
      .set({ best: Math.max(prev.best, correct), total, attempts: prev.attempts + 1, lastAt: now })
      .where(eq(exerciseProgress.exerciseId, exerciseId))
      .run();
  } else {
    db.insert(exerciseProgress).values({ exerciseId, chapterId, best: correct, total, attempts: 1, lastAt: now }).run();
  }
  revalidatePath("/");
}

/** Adds a single word to the review queue. */
export async function startWord(vocabId: string) {
  const now = Date.now();
  db.insert(vocabProgress).values({ vocabId, box: 1, due: now, lastSeen: now }).onConflictDoNothing().run();
  revalidatePath("/", "layout");
}

export async function gradeWord(vocabId: string, good: boolean) {
  const p = db.select().from(vocabProgress).where(eq(vocabProgress.vocabId, vocabId)).get();
  if (!p) return;
  const { box, due } = nextBox(p.box, good);
  db.update(vocabProgress)
    .set({ box, due, lastSeen: Date.now(), correct: p.correct + (good ? 1 : 0), wrong: p.wrong + (good ? 0 : 1) })
    .where(eq(vocabProgress.vocabId, vocabId))
    .run();
  revalidatePath("/", "layout");
}

/** Stores the result of a mock exam (raw points per module, each out of 15). */
export async function saveExamAttempt(a: { examId: string; timed: boolean; hoeren: number; lesen: number; schreiben: number; sprechen: number }) {
  const clamp = (n: number) => Math.min(15, Math.max(0, n));
  const [hoeren, lesen, schreiben, sprechen] = [a.hoeren, a.lesen, a.schreiben, a.sprechen].map(clamp);
  const total = Math.round((hoeren + lesen + schreiben + sprechen) * 1.66);
  db.insert(examAttempts).values({ examId: a.examId, takenAt: Date.now(), timed: a.timed ? 1 : 0, hoeren, lesen, schreiben, sprechen, total }).run();
  revalidatePath("/pruefung");
  return { total };
}
