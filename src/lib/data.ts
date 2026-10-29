import { asc, eq } from "drizzle-orm";
import { ObjectId } from "mongodb";
import { chapters, db, vocab } from "@/db";
import { mongo } from "@/db/mongo";
import { getUserId } from "@/lib/auth";
import { parseExercise } from "@/lib/blocks";

const countBlocks = (body: string, lang: string) => (body.match(new RegExp("```" + lang + "\\n", "g")) ?? []).length;

// Everything below shows the signed-in user's progress. A visitor who is not signed in sees the book with no progress.
const NOBODY = "none";
const me = async () => ({ m: await mongo(), userId: (await getUserId()) ?? NOBODY });

const readMap = async () => {
  const { m, userId } = await me();
  return new Map((await m.chapterProgress.find({ userId }).toArray()).map((p) => [p.chapterId, p.readAt]));
};
const vocabProgressMap = async () => {
  const { m, userId } = await me();
  return new Map((await m.vocabProgress.find({ userId }).toArray()).map((p) => [p.vocabId, p]));
};
const exerciseMap = async () => {
  const { m, userId } = await me();
  return new Map((await m.exerciseProgress.find({ userId }).toArray()).map((e) => [e.exerciseId, e]));
};

export async function getContents() {
  const read = await readMap();
  const done = [...(await exerciseMap()).values()];
  const words = db.select().from(vocab).all();
  return db
    .select()
    .from(chapters)
    .orderBy(asc(chapters.order))
    .all()
    .map((c) => ({
      id: c.id,
      level: c.level,
      order: c.order,
      part: c.part,
      title: c.title,
      subtitle: c.subtitle,
      goals: c.goals,
      readAt: read.get(c.id) ?? null,
      exercises: countBlocks(c.body, "exercise"),
      exercisesDone: done.filter((d) => d.chapterId === c.id).length,
      words: words.filter((w) => w.chapterId === c.id).length,
    }));
}

export type ContentsEntry = Awaited<ReturnType<typeof getContents>>[number];

export async function getChapter(id: string) {
  const c = db.select().from(chapters).where(eq(chapters.id, id)).get();
  if (!c) return null;
  const { m, userId } = await me();
  const all = db.select({ id: chapters.id, title: chapters.title, order: chapters.order }).from(chapters).orderBy(asc(chapters.order)).all();
  const i = all.findIndex((x) => x.id === id);
  return {
    chapter: c,
    prev: all[i - 1] ?? null,
    next: all[i + 1] ?? null,
    exercises: new Map((await m.exerciseProgress.find({ userId, chapterId: id }).toArray()).map((e) => [e.exerciseId, e])),
    read: (await m.chapterProgress.findOne({ userId, chapterId: id }))?.readAt ?? null,
  };
}

export async function getLastOpened() {
  const { m, userId } = await me();
  return (await m.chapterProgress.find({ userId }).sort({ lastOpened: -1 }).limit(1).next())?.chapterId ?? null;
}

/** Review box of every word that has progress. Pass it to `getVocabByIds` (which runs inside the sync Markdown renderer). */
export async function getVocabBoxes() {
  return new Map([...(await vocabProgressMap())].map(([id, p]) => [id, p.box]));
}

export function getVocabByIds(ids: string[], boxes: Map<string, number>) {
  const rows = new Map(db.select().from(vocab).all().map((v) => [v.id, v]));
  return ids.flatMap((id) => {
    const v = rows.get(id);
    return v ? [{ ...v, box: boxes.get(id) ?? 0 }] : [];
  });
}

export async function getWordBank() {
  const prog = await vocabProgressMap();
  return db
    .select()
    .from(vocab)
    .orderBy(asc(vocab.chapterId), asc(vocab.group))
    .all()
    .map((w) => {
      const p = prog.get(w.id);
      return { ...w, box: p?.box ?? 0, correct: p?.correct ?? 0, wrong: p?.wrong ?? 0 };
    });
}

export type BankWord = Awaited<ReturnType<typeof getWordBank>>[number];

export async function getDueWords() {
  const { m, userId } = await me();
  const due = await m.vocabProgress.find({ userId, box: { $gt: 0 }, due: { $lte: Date.now() } }).sort({ due: 1 }).toArray();
  const rows = new Map(db.select().from(vocab).all().map((v) => [v.id, v]));
  return due.flatMap((p) => {
    const w = rows.get(p.vocabId);
    return w ? [{ ...w, box: p.box }] : [];
  });
}

export async function getDueCount() {
  return (await getDueWords()).length;
}

// ---------------- revision ----------------

/** Worksheets of a chapter, read from its Markdown. */
function exercisesOf(chapterId: string, body: string) {
  return [...body.matchAll(/```exercise\n([\s\S]*?)\n```/g)].map((m) => {
    const e = parseExercise(m[1], chapterId);
    return { id: e.id, title: e.title, kind: e.kind, items: e.kind === "write" ? 1 : e.items.length };
  });
}

export async function getReviewOverview() {
  const now = Date.now();
  const read = await readMap();
  const prog = await vocabProgressMap();
  const words = db.select().from(vocab).all();
  const done = await exerciseMap();

  const chaptersOut = db
    .select()
    .from(chapters)
    .orderBy(asc(chapters.order))
    .all()
    .map((c) => {
      const ws = words.filter((w) => w.chapterId === c.id);
      const inReview = ws.filter((w) => (prog.get(w.id)?.box ?? 0) > 0);
      return {
        id: c.id,
        level: c.level,
        order: c.order,
        title: c.title,
        read: read.get(c.id) != null,
        words: ws.length,
        nouns: ws.filter((w) => w.article).length,
        inReview: inReview.length,
        due: inReview.filter((w) => (prog.get(w.id)?.due ?? 0) <= now).length,
        strong: inReview.filter((w) => (prog.get(w.id)?.box ?? 0) >= 4).length,
        exercises: exercisesOf(c.id, c.body).map((e) => {
          const p = done.get(e.id);
          return { ...e, chapterId: c.id, best: p?.best ?? null, total: p?.total ?? null };
        }),
      };
    });

  const readOnes = chaptersOut.filter((c) => c.read);
  const worksheets = readOnes
    .flatMap((c) => c.exercises.map((e) => ({ ...e, chapterTitle: `${c.order}. ${c.title}` })))
    .map((e) => ({ ...e, ratio: e.best === null || !e.total ? -1 : e.best / e.total }))
    .filter((e) => e.ratio < 1)
    .sort((a, b) => (a.ratio === -1 ? 1 : 0) - (b.ratio === -1 ? 1 : 0) || a.ratio - b.ratio);

  return {
    chapters: chaptersOut,
    due: chaptersOut.reduce((n, c) => n + c.due, 0),
    weak: [...prog.values()].filter((p) => p.box > 0 && p.wrong > p.correct).length,
    worksheets,
  };
}

export interface StudyWord {
  id: string;
  lemma: string;
  article: string | null;
  plural: string | null;
  translation: string;
  ipa: string;
  example: string;
  exampleEn: string;
  audioFile: string | null;
  options: string[]; // for listening: the right meaning plus three others
}

function seeded(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)), ((h ^= h >>> 16) >>> 0) / 4294967296);
}

/** The words for a study session. Only chapters you marked as read take part. */
export async function getStudyQueue(scope: string, mode: string, limit = 20) {
  const now = Date.now();
  const readIds = new Set([...(await readMap())].filter(([, readAt]) => readAt != null).map(([id]) => id));
  const prog = await vocabProgressMap();
  let pool = db.select().from(vocab).all().filter((w) => readIds.has(w.chapterId));

  if (/^k\d+$/.test(scope)) pool = pool.filter((w) => w.chapterId === scope);
  else if (scope === "due") pool = pool.filter((w) => (prog.get(w.id)?.box ?? 0) > 0 && (prog.get(w.id)?.due ?? 0) <= now);
  else if (scope === "weak") pool = pool.filter((w) => (prog.get(w.id)?.wrong ?? 0) > (prog.get(w.id)?.correct ?? 0));

  if (mode === "gender") pool = pool.filter((w) => w.article);
  if (mode === "type") pool = pool.filter((w) => w.pos !== "participle");

  const everyMeaning = [...new Set(db.select().from(vocab).all().map((w) => w.translation))];
  const rnd = seeded(`${scope}-${mode}-${Math.floor(now / 60000)}`);
  const picked = [...pool].sort(() => rnd() - 0.5).slice(0, scope.startsWith("k") ? Math.max(limit, 25) : limit);

  return picked.map((w): StudyWord => {
    const others = everyMeaning.filter((m) => m !== w.translation).sort(() => rnd() - 0.5).slice(0, 3);
    const options = [w.translation, ...others].sort(() => rnd() - 0.5);
    return {
      id: w.id, lemma: w.lemma, article: w.article, plural: w.plural, translation: w.translation,
      ipa: w.ipa, example: w.example, exampleEn: w.exampleEn, audioFile: w.audioFile, options,
    };
  });
}

export function getChapterTitle(id: string) {
  const c = db.select().from(chapters).where(eq(chapters.id, id)).get();
  return c ? `${c.order}. ${c.title}` : id;
}

export async function getAnnotations(chapterId: string) {
  const { m, userId } = await me();
  const rows = await m.annotations.find({ userId, chapterId }).sort({ start: 1 }).toArray();
  return rows.map((a) => ({ id: String(a._id as ObjectId), start: a.start, end: a.end, quote: a.quote, prefix: a.prefix, suffix: a.suffix, note: a.note }));
}
