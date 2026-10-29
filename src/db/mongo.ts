import { MongoClient } from "mongodb";

// Progress (read chapters, worksheet scores, review boxes, exams, highlights) lives in MongoDB so that it
// survives restarts on hosts with a read-only or temporary disk. The book itself stays in the bundled SQLite file.

export interface ChapterProgressDoc { _id: string; readAt: number | null; lastOpened: number }
export interface VocabProgressDoc { _id: string; box: number; due: number; correct: number; wrong: number; lastSeen: number }
export interface ExerciseProgressDoc { _id: string; chapterId: string; best: number; total: number; attempts: number; lastAt: number }
export interface ExamAttemptDoc { examId: string; takenAt: number; timed: number; hoeren: number; lesen: number; schreiben: number; sprechen: number; total: number }
export interface AnnotationDoc { chapterId: string; start: number; end: number; quote: string; prefix: string; suffix: string; note: string; createdAt: number }

const globalForMongo = globalThis as unknown as { mongo?: Promise<MongoClient> };

function client() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not set. Add it to .env (and to the host's environment variables).");
  // Kept on globalThis so dev reloads and serverless warm starts reuse one connection.
  return (globalForMongo.mongo ??= new MongoClient(uri).connect());
}

export async function mongo() {
  const d = (await client()).db(process.env.MONGO_DB || "german");
  return {
    chapterProgress: d.collection<ChapterProgressDoc>("chapter_progress"),
    vocabProgress: d.collection<VocabProgressDoc>("vocab_progress"),
    exerciseProgress: d.collection<ExerciseProgressDoc>("exercise_progress"),
    examAttempts: d.collection<ExamAttemptDoc>("exam_attempts"),
    annotations: d.collection<AnnotationDoc>("annotations"),
  };
}
