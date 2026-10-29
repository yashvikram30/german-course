"use server";

import { eq } from "drizzle-orm";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { db, vocab } from "@/db";
import { mongo, progressId } from "@/db/mongo";
import { requireUserId } from "./auth";
import { nextBox } from "./srs";

const DAY = 86_400_000;

export async function openChapter(chapterId: string) {
  const now = Date.now();
  const userId = await requireUserId();
  const m = await mongo();
  await m.chapterProgress.updateOne({ _id: progressId(userId, chapterId) }, { $set: { lastOpened: now }, $setOnInsert: { userId, chapterId, readAt: null } }, { upsert: true });
}

/** Marks a chapter as read and puts all of its words into the review queue (due tomorrow). */
export async function markChapterRead(chapterId: string) {
  const now = Date.now();
  const userId = await requireUserId();
  const m = await mongo();
  await m.chapterProgress.updateOne({ _id: progressId(userId, chapterId) }, { $set: { readAt: now }, $setOnInsert: { userId, chapterId, lastOpened: now } }, { upsert: true });
  const words = db.select({ id: vocab.id }).from(vocab).where(eq(vocab.chapterId, chapterId)).all();
  if (words.length) {
    await m.vocabProgress.bulkWrite(
      words.map(({ id }) => ({
        updateOne: { filter: { _id: progressId(userId, id) }, update: { $setOnInsert: { userId, vocabId: id, box: 1, due: now + DAY, correct: 0, wrong: 0, lastSeen: now } }, upsert: true },
      })),
    );
  }
  revalidatePath("/", "layout");
  return { words: words.length };
}

export async function recordExercise(exerciseId: string, chapterId: string, correct: number, total: number) {
  const now = Date.now();
  const userId = await requireUserId();
  const m = await mongo();
  await m.exerciseProgress.updateOne(
    { _id: progressId(userId, exerciseId) },
    { $max: { best: correct }, $set: { total, lastAt: now, chapterId }, $inc: { attempts: 1 }, $setOnInsert: { userId, exerciseId } },
    { upsert: true },
  );
  revalidatePath("/");
}

/** Adds a single word to the review queue. */
export async function startWord(vocabId: string) {
  const now = Date.now();
  const userId = await requireUserId();
  const m = await mongo();
  await m.vocabProgress.updateOne({ _id: progressId(userId, vocabId) }, { $setOnInsert: { userId, vocabId, box: 1, due: now, correct: 0, wrong: 0, lastSeen: now } }, { upsert: true });
  revalidatePath("/", "layout");
}

export async function gradeWord(vocabId: string, good: boolean) {
  const userId = await requireUserId();
  const m = await mongo();
  const _id = progressId(userId, vocabId);
  const p = await m.vocabProgress.findOne({ _id });
  if (!p) return;
  const { box, due } = nextBox(p.box, good);
  await m.vocabProgress.updateOne({ _id }, { $set: { box, due, lastSeen: Date.now() }, $inc: { correct: good ? 1 : 0, wrong: good ? 0 : 1 } });
  revalidatePath("/", "layout");
}

/** Stores the result of a mock exam (raw points per module, each out of 15). */
export async function saveExamAttempt(a: { examId: string; timed: boolean; hoeren: number; lesen: number; schreiben: number; sprechen: number }) {
  const clamp = (n: number) => Math.min(15, Math.max(0, n));
  const [hoeren, lesen, schreiben, sprechen] = [a.hoeren, a.lesen, a.schreiben, a.sprechen].map(clamp);
  const total = Math.round((hoeren + lesen + schreiben + sprechen) * 1.66);
  const userId = await requireUserId();
  await (await mongo()).examAttempts.insertOne({ userId, examId: a.examId, takenAt: Date.now(), timed: a.timed ? 1 : 0, hoeren, lesen, schreiben, sprechen, total });
  revalidatePath("/pruefung");
  return { total };
}

/** Saves a highlight and returns its id. The note starts empty. */
export async function addAnnotation(chapterId: string, a: { start: number; end: number; quote: string; prefix: string; suffix: string }) {
  if (!a.quote.trim() || a.quote.length > 2000) throw new Error("Invalid highlight");
  const userId = await requireUserId();
  const { insertedId } = await (await mongo()).annotations.insertOne({
    userId, chapterId, start: a.start, end: a.end, quote: a.quote, prefix: a.prefix.slice(-60), suffix: a.suffix.slice(0, 60), note: "", createdAt: Date.now(),
  });
  return String(insertedId);
}

export async function setAnnotationNote(id: string, note: string) {
  if (!ObjectId.isValid(id)) return;
  const userId = await requireUserId();
  await (await mongo()).annotations.updateOne({ _id: new ObjectId(id), userId }, { $set: { note: note.slice(0, 5000) } });
}

export async function deleteAnnotation(id: string) {
  if (!ObjectId.isValid(id)) return;
  const userId = await requireUserId();
  await (await mongo()).annotations.deleteOne({ _id: new ObjectId(id), userId });
}
