import { MongoClient } from "mongodb";

// Progress (read chapters, worksheet scores, review boxes, exams, highlights) lives in MongoDB so that it
// survives restarts on hosts with a read-only or temporary disk. The book itself stays in the bundled SQLite file.
// Every progress document belongs to one user (`userId`). Where a user has one document per thing, `_id` is `${userId}:${key}`.

export interface UserDoc { email: string; name: string; passwordHash: string; createdAt: number }
export interface ChapterProgressDoc { _id: string; userId: string; chapterId: string; readAt: number | null; lastOpened: number }
export interface VocabProgressDoc { _id: string; userId: string; vocabId: string; box: number; due: number; correct: number; wrong: number; lastSeen: number }
export interface ExerciseProgressDoc { _id: string; userId: string; exerciseId: string; chapterId: string; best: number; total: number; attempts: number; lastAt: number }
export interface ExamAttemptDoc { userId: string; examId: string; takenAt: number; timed: number; hoeren: number; lesen: number; schreiben: number; sprechen: number; total: number }
export interface AnnotationDoc { userId: string; chapterId: string; start: number; end: number; quote: string; prefix: string; suffix: string; note: string; createdAt: number }

export const progressId = (userId: string, key: string) => `${userId}:${key}`;

const globalForMongo = globalThis as unknown as { mongo?: Promise<MongoClient>; mongoIndexes?: Promise<unknown> };

function client() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not set. Add it to .env (and to the host's environment variables).");
  // Kept on globalThis so dev reloads and serverless warm starts reuse one connection.
  return (globalForMongo.mongo ??= new MongoClient(uri).connect());
}

export async function mongo() {
  const d = (await client()).db(process.env.MONGO_DB || "german");
  const c = {
    users: d.collection<UserDoc>("users"),
    chapterProgress: d.collection<ChapterProgressDoc>("chapter_progress"),
    vocabProgress: d.collection<VocabProgressDoc>("vocab_progress"),
    exerciseProgress: d.collection<ExerciseProgressDoc>("exercise_progress"),
    examAttempts: d.collection<ExamAttemptDoc>("exam_attempts"),
    annotations: d.collection<AnnotationDoc>("annotations"),
  };
  // Created once per process; Mongo ignores the call when the indexes already exist.
  globalForMongo.mongoIndexes ??= Promise.all([
    c.users.createIndex({ email: 1 }, { unique: true }),
    c.chapterProgress.createIndex({ userId: 1 }),
    c.vocabProgress.createIndex({ userId: 1 }),
    c.exerciseProgress.createIndex({ userId: 1 }),
    c.examAttempts.createIndex({ userId: 1, takenAt: -1 }),
    c.annotations.createIndex({ userId: 1, chapterId: 1 }),
  ]);
  await globalForMongo.mongoIndexes;
  return c;
}
