import type { WithId } from "mongodb";
import { mongo, type ExamAttemptDoc } from "@/db/mongo";
import { getUserId } from "@/lib/auth";

const plain = ({ _id, userId: _user, ...a }: WithId<ExamAttemptDoc>) => ({ id: String(_id), ...a });

export async function getAttempts(examId: string, limit = 20) {
  const userId = (await getUserId()) ?? "none";
  return (await (await mongo()).examAttempts.find({ userId, examId }).sort({ takenAt: -1 }).limit(limit).toArray()).map(plain);
}
export async function getAllAttempts(limit = 30) {
  const userId = (await getUserId()) ?? "none";
  return (await (await mongo()).examAttempts.find({ userId }).sort({ takenAt: -1 }).limit(limit).toArray()).map(plain);
}
