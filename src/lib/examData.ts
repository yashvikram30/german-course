import { mongo, type ExamAttemptDoc } from "@/db/mongo";
import type { WithId } from "mongodb";

const plain = ({ _id, ...a }: WithId<ExamAttemptDoc>) => ({ id: String(_id), ...a });

export async function getAttempts(examId: string, limit = 20) {
  return (await (await mongo()).examAttempts.find({ examId }).sort({ takenAt: -1 }).limit(limit).toArray()).map(plain);
}
export async function getAllAttempts(limit = 30) {
  return (await (await mongo()).examAttempts.find().sort({ takenAt: -1 }).limit(limit).toArray()).map(plain);
}
