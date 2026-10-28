import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ---- Book content (seeded from /content/book, safe to re-seed) ----

export const chapters = sqliteTable("chapters", {
  id: text("id").primaryKey(), // e.g. "k01"
  level: text("level").notNull().default("A1"), // CEFR level: A1, A2, ...
  order: integer("order").notNull(),
  part: text("part").notNull(), // e.g. "Teil I · Erste Schritte"
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull(),
  goals: text("goals", { mode: "json" }).$type<string[]>().notNull(),
  body: text("body").notNull(), // Markdown with custom blocks
});

export const vocab = sqliteTable("vocab", {
  id: text("id").primaryKey(),
  chapterId: text("chapter_id").notNull(),
  group: text("group").notNull(), // heading inside the chapter's vocabulary
  lemma: text("lemma").notNull(),
  article: text("article"), // der | die | das | null
  plural: text("plural"),
  pos: text("pos").notNull(),
  translation: text("translation").notNull(),
  ipa: text("ipa").notNull(),
  example: text("example").notNull(),
  exampleEn: text("example_en").notNull(),
  audioFile: text("audio_file"), // optional recording at /audio/<id>.mp3
});

// ---- Your progress (never touched by the seed) ----

export const vocabProgress = sqliteTable("vocab_progress", {
  vocabId: text("vocab_id").primaryKey(),
  box: integer("box").notNull().default(0), // 0 = new, 1..5 = spaced-repetition box
  due: integer("due").notNull(), // epoch ms
  correct: integer("correct").notNull().default(0),
  wrong: integer("wrong").notNull().default(0),
  lastSeen: integer("last_seen").notNull(),
});

export const chapterProgress = sqliteTable("chapter_progress", {
  chapterId: text("chapter_id").primaryKey(),
  readAt: integer("read_at"), // epoch ms once marked as read
  lastOpened: integer("last_opened").notNull(),
});

export const exerciseProgress = sqliteTable("exercise_progress", {
  exerciseId: text("exercise_id").primaryKey(), // e.g. "k02-ue3"
  chapterId: text("chapter_id").notNull(),
  best: integer("best").notNull(), // best number correct
  total: integer("total").notNull(),
  attempts: integer("attempts").notNull().default(1),
  lastAt: integer("last_at").notNull(),
});

// Mock-exam results (Prüfung section). Raw points per module, 15 each.
export const examAttempts = sqliteTable("exam_attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  examId: text("exam_id").notNull(), // "t1" .. "t4"
  takenAt: integer("taken_at").notNull(),
  timed: integer("timed").notNull().default(1),
  hoeren: real("hoeren").notNull(),
  lesen: real("lesen").notNull(),
  schreiben: real("schreiben").notNull(),
  sprechen: real("sprechen").notNull(),
  total: integer("total").notNull(), // official points, 0..100
});

// Highlights and notes in the chapters. Anchored by the quoted text (plus a little context), not by DOM position.
export const annotations = sqliteTable("annotations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chapterId: text("chapter_id").notNull(),
  start: integer("start").notNull(), // character offset in the chapter text, used to pick between repeated quotes
  end: integer("end").notNull(),
  quote: text("quote").notNull(),
  prefix: text("prefix").notNull().default(""),
  suffix: text("suffix").notNull().default(""),
  note: text("note").notNull().default(""),
  createdAt: integer("created_at").notNull(),
});
