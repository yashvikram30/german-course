import { and, asc, desc, eq, gt, lte } from "drizzle-orm";
import { annotations, chapterProgress, chapters, db, exerciseProgress, vocab, vocabProgress } from "@/db";
import { parseExercise } from "@/lib/blocks";

const countBlocks = (body: string, lang: string) => (body.match(new RegExp("```" + lang + "\\n", "g")) ?? []).length;

export function getContents() {
  const read = new Map(db.select().from(chapterProgress).all().map((p) => [p.chapterId, p]));
  const done = db.select().from(exerciseProgress).all();
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
      readAt: read.get(c.id)?.readAt ?? null,
      exercises: countBlocks(c.body, "exercise"),
      exercisesDone: done.filter((d) => d.chapterId === c.id).length,
      words: words.filter((w) => w.chapterId === c.id).length,
    }));
}

export type ContentsEntry = ReturnType<typeof getContents>[number];

export function getChapter(id: string) {
  const c = db.select().from(chapters).where(eq(chapters.id, id)).get();
  if (!c) return null;
  const all = db.select({ id: chapters.id, title: chapters.title, order: chapters.order }).from(chapters).orderBy(asc(chapters.order)).all();
  const i = all.findIndex((x) => x.id === id);
  return {
    chapter: c,
    prev: all[i - 1] ?? null,
    next: all[i + 1] ?? null,
    exercises: new Map(db.select().from(exerciseProgress).where(eq(exerciseProgress.chapterId, id)).all().map((e) => [e.exerciseId, e])),
    read: db.select().from(chapterProgress).where(eq(chapterProgress.chapterId, id)).get()?.readAt ?? null,
  };
}

export function getLastOpened() {
  return db.select().from(chapterProgress).orderBy(desc(chapterProgress.lastOpened)).get()?.chapterId ?? null;
}

export function getVocabByIds(ids: string[]) {
  const boxes = new Map(db.select().from(vocabProgress).all().map((p) => [p.vocabId, p.box]));
  const rows = new Map(db.select().from(vocab).all().map((v) => [v.id, v]));
  return ids.flatMap((id) => {
    const v = rows.get(id);
    return v ? [{ ...v, box: boxes.get(id) ?? 0 }] : [];
  });
}

export function getWordBank() {
  return db
    .select({ w: vocab, p: vocabProgress })
    .from(vocab)
    .leftJoin(vocabProgress, eq(vocab.id, vocabProgress.vocabId))
    .orderBy(asc(vocab.chapterId), asc(vocab.group))
    .all()
    .map(({ w, p }) => ({ ...w, box: p?.box ?? 0, correct: p?.correct ?? 0, wrong: p?.wrong ?? 0 }));
}

export type BankWord = ReturnType<typeof getWordBank>[number];

export function getDueWords() {
  return db
    .select({ w: vocab, p: vocabProgress })
    .from(vocabProgress)
    .innerJoin(vocab, eq(vocab.id, vocabProgress.vocabId))
    .where(and(gt(vocabProgress.box, 0), lte(vocabProgress.due, Date.now())))
    .orderBy(asc(vocabProgress.due))
    .all()
    .map(({ w, p }) => ({ ...w, box: p.box }));
}

export function getDueCount() {
  return getDueWords().length;
}

// ---------------- revision ----------------

/** Worksheets of a chapter, read from its Markdown. */
function exercisesOf(chapterId: string, body: string) {
  return [...body.matchAll(/```exercise\n([\s\S]*?)\n```/g)].map((m) => {
    const e = parseExercise(m[1], chapterId);
    return { id: e.id, title: e.title, kind: e.kind, items: e.kind === "write" ? 1 : e.items.length };
  });
}

export function getReviewOverview() {
  const now = Date.now();
  const read = new Map(db.select().from(chapterProgress).all().map((p) => [p.chapterId, p.readAt]));
  const prog = new Map(db.select().from(vocabProgress).all().map((p) => [p.vocabId, p]));
  const words = db.select().from(vocab).all();
  const done = new Map(db.select().from(exerciseProgress).all().map((e) => [e.exerciseId, e]));

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
export function getStudyQueue(scope: string, mode: string, limit = 20) {
  const now = Date.now();
  const readIds = new Set(
    db.select().from(chapterProgress).all().filter((p) => p.readAt != null).map((p) => p.chapterId),
  );
  const prog = new Map(db.select().from(vocabProgress).all().map((p) => [p.vocabId, p]));
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

export function getAnnotations(chapterId: string) {
  return db
    .select({ id: annotations.id, start: annotations.start, end: annotations.end, quote: annotations.quote, prefix: annotations.prefix, suffix: annotations.suffix, note: annotations.note })
    .from(annotations)
    .where(eq(annotations.chapterId, chapterId))
    .orderBy(asc(annotations.start))
    .all();
}
