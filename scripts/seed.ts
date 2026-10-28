// Loads /content/book/*.md into the database. Safe to re-run: content tables are
// upserted, progress tables are never touched.
import fs from "node:fs";
import path from "node:path";
import { notInArray } from "drizzle-orm";
import { chapters, db, vocab } from "../src/db";
import { parseFrontmatter, parseVocab } from "../src/lib/blocks";

const dir = path.join(process.cwd(), "content", "book");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort();

const seen = new Set<string>();
let nWords = 0;

for (const file of files) {
  const { meta, body } = parseFrontmatter(fs.readFileSync(path.join(dir, file), "utf8"));
  const row = { ...meta, body };
  db.insert(chapters).values(row).onConflictDoUpdate({ target: chapters.id, set: row }).run();

  for (const m of body.matchAll(/```vocab\n([\s\S]*?)\n```/g)) {
    const { group, words } = parseVocab(m[1]);
    for (const w of words) {
      if (seen.has(w.id)) throw new Error(`Duplicate vocabulary id "${w.id}" in ${file}`);
      seen.add(w.id);
      const audio = path.join(process.cwd(), "public", "audio", `${w.id}.mp3`);
      const v = { ...w, chapterId: meta.id, group, audioFile: fs.existsSync(audio) ? `/audio/${w.id}.mp3` : null };
      db.insert(vocab).values(v).onConflictDoUpdate({ target: vocab.id, set: v }).run();
      nWords++;
    }
  }
}

// Words that were removed from the book disappear from the glossary too.
if (seen.size) db.delete(vocab).where(notInArray(vocab.id, [...seen])).run();
db.delete(chapters).where(notInArray(chapters.id, files.map((f) => f.replace(/\.md$/, "")))).run();

console.log(`Seeded ${files.length} chapter(s), ${nWords} word(s).`);
