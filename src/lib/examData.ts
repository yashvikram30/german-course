import { desc, eq } from "drizzle-orm";
import { db, examAttempts } from "@/db";

export function getAttempts(examId: string, limit = 20) {
  return db.select().from(examAttempts).where(eq(examAttempts.examId, examId)).orderBy(desc(examAttempts.takenAt)).limit(limit).all();
}
export function getAllAttempts(limit = 30) {
  return db.select().from(examAttempts).orderBy(desc(examAttempts.takenAt)).limit(limit).all();
}
