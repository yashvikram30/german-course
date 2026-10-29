// One-off: copies the progress stored in the local SQLite file into MongoDB. Safe to run again (it upserts).
// Run: npx tsx --env-file=.env scripts/migrate-to-mongo.ts
import dns from "node:dns";
import { annotations, chapterProgress, examAttempts, exerciseProgress, db, vocabProgress } from "../src/db";
import { mongo } from "../src/db/mongo";

// Some home routers refuse the SRV lookup that mongodb+srv:// needs; ask a public resolver instead.
if (process.env.MONGO_DNS) dns.setServers(process.env.MONGO_DNS.split(","));

async function main() {
const m = await mongo();

const chapters = db.select().from(chapterProgress).all();
if (chapters.length)
  await m.chapterProgress.bulkWrite(chapters.map((c) => ({ replaceOne: { filter: { _id: c.chapterId }, replacement: { _id: c.chapterId, readAt: c.readAt, lastOpened: c.lastOpened }, upsert: true } })));

const words = db.select().from(vocabProgress).all();
if (words.length)
  await m.vocabProgress.bulkWrite(words.map((w) => ({ replaceOne: { filter: { _id: w.vocabId }, replacement: { _id: w.vocabId, box: w.box, due: w.due, correct: w.correct, wrong: w.wrong, lastSeen: w.lastSeen }, upsert: true } })));

const exercises = db.select().from(exerciseProgress).all();
if (exercises.length)
  await m.exerciseProgress.bulkWrite(exercises.map((e) => ({ replaceOne: { filter: { _id: e.exerciseId }, replacement: { _id: e.exerciseId, chapterId: e.chapterId, best: e.best, total: e.total, attempts: e.attempts, lastAt: e.lastAt }, upsert: true } })));

const exams = db.select().from(examAttempts).all();
for (const { id: _id, ...e } of exams) await m.examAttempts.updateOne({ examId: e.examId, takenAt: e.takenAt }, { $setOnInsert: e }, { upsert: true });

const notes = db.select().from(annotations).all();
for (const { id: _id, ...a } of notes) await m.annotations.updateOne({ chapterId: a.chapterId, start: a.start, quote: a.quote }, { $setOnInsert: a }, { upsert: true });

console.log(`Migrated ${chapters.length} chapters, ${words.length} words, ${exercises.length} worksheets, ${exams.length} exams, ${notes.length} highlights.`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
