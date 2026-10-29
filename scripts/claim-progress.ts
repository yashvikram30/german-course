// One-off: progress saved before accounts existed has no owner. This hands it to one account (sign up first).
// Run: npx tsx --env-file=.env scripts/claim-progress.ts you@example.com
// Safe to run again. If your router refuses mongodb+srv lookups, add MONGO_DNS=8.8.8.8 in front.
import dns from "node:dns";
import { mongo, progressId } from "../src/db/mongo";

if (process.env.MONGO_DNS) dns.setServers(process.env.MONGO_DNS.split(","));

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error("Usage: claim-progress.ts <email of an existing account>");
  const m = await mongo();
  const user = await m.users.findOne({ email });
  if (!user) throw new Error(`No account for ${email}. Sign up in the app first.`);
  const userId = String(user._id);

  // The old documents were keyed by the bare id (_id = "k01"); the new ones by "<userId>:<id>".
  const moved = { chapters: 0, words: 0, worksheets: 0 };
  for (const [col, field, key] of [
    [m.chapterProgress, "chapterId", "chapters"],
    [m.vocabProgress, "vocabId", "words"],
    [m.exerciseProgress, "exerciseId", "worksheets"],
  ] as const) {
    const c = col as unknown as import("mongodb").Collection<Record<string, unknown> & { _id: string }>;
    for (const old of await c.find({ userId: { $exists: false } }).toArray()) {
      const { _id, ...rest } = old;
      await c.replaceOne({ _id: progressId(userId, _id) }, { ...rest, userId, [field]: _id } as never, { upsert: true });
      await c.deleteOne({ _id });
      moved[key]++;
    }
  }
  const notes = await m.annotations.updateMany({ userId: { $exists: false } }, { $set: { userId } });
  const exams = await m.examAttempts.updateMany({ userId: { $exists: false } }, { $set: { userId } });
  console.log(`Gave ${email} ${moved.chapters} chapters, ${moved.words} words, ${moved.worksheets} worksheets, ${notes.modifiedCount} highlights, ${exams.modifiedCount} exams.`);
}

main().then(() => process.exit(0), (e) => { console.error(e.message ?? e); process.exit(1); });
