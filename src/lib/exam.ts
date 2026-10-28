// Loads the mock exams from /content/tests/*.md. These are not part of the book:
// they are parsed on request and shown in exam mode under /pruefung.
import fs from "node:fs";
import path from "node:path";
import { parseDialogue, parseExamples, parseExercise } from "./blocks";

export type ModuleKey = "hoeren" | "lesen" | "schreiben" | "sprechen";

export interface ExamExercise {
  id: string;
  kind: "choice" | "listen" | "gap" | "write";
  title: string;
  intro: string;
  items: { prompt: string; options?: string[]; answers: string[]; note: string }[];
}

export type ExamBlock =
  | { t: "md"; md: string }
  | { t: "text"; title: string; lines: { speaker: string; de: string }[] }
  | { t: "ex"; ex: ExamExercise }
  | { t: "cards"; cards: string[]; model: { de: string; en: string }[] };

export interface ExamTeil {
  title: string;
  blocks: ExamBlock[];
}
export interface ExamModule {
  key: ModuleKey;
  title: string;
  minutes: number;
  teile: ExamTeil[];
}
export interface Exam {
  id: string;
  title: string;
  subtitle: string;
  modules: ExamModule[];
}

export const MODULES: { key: ModuleKey; heading: string; minutes: number }[] = [
  { key: "hoeren", heading: "Hören", minutes: 20 },
  { key: "lesen", heading: "Lesen", minutes: 25 },
  { key: "schreiben", heading: "Schreiben", minutes: 20 },
  { key: "sprechen", heading: "Sprechen", minutes: 15 },
];

const dir = path.join(process.cwd(), "content", "tests");

export function getExamIds() {
  return fs.readdirSync(dir).filter((f) => /^test\d+\.md$/.test(f)).sort().map((f) => f.replace(".md", ""));
}

export function getInfoMarkdown() {
  return fs.readFileSync(path.join(dir, "info.md"), "utf8");
}

export function getExam(fileId: string): Exam | null {
  const file = path.join(dir, `${fileId}.md`);
  if (!/^test\d+$/.test(fileId) || !fs.existsSync(file)) return null;
  const m = fs.readFileSync(file, "utf8").match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return null;
  const meta: Record<string, string> = {};
  for (const l of m[1].split("\n")) {
    const kv = l.match(/^(\w+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2];
  }
  const examId = meta.id as string;

  const modules: ExamModule[] = [];
  let mod: ExamModule | null = null;
  let teil: ExamTeil | null = null;
  let buf: string[] = [];
  const flush = () => {
    const md = buf.join("\n").trim();
    buf = [];
    if (md && teil) teil.blocks.push({ t: "md", md });
  };

  const lines = m[2].split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h2 = line.match(/^## (.+)$/);
    const h3 = line.match(/^### (.+)$/);
    if (h2) {
      flush();
      const def = MODULES.find((x) => x.heading === h2[1].trim());
      mod = def ? { key: def.key, title: def.heading, minutes: def.minutes, teile: [] } : null;
      if (mod) modules.push(mod);
      teil = mod ? { title: "", blocks: [] } : null;
      if (mod && teil) mod.teile.push(teil);
      continue;
    }
    if (!mod) continue;
    if (h3) {
      flush();
      if (mod.teile.length === 1 && mod.teile[0].title === "" && mod.teile[0].blocks.length === 0) mod.teile.pop();
      teil = { title: h3[1].trim(), blocks: [] };
      mod.teile.push(teil);
      continue;
    }
    const fence = line.match(/^```(\w+)$/);
    if (fence && teil) {
      flush();
      const body: string[] = [];
      for (i++; i < lines.length && lines[i] !== "```"; i++) body.push(lines[i]);
      const text = body.join("\n");
      if (fence[1] === "exercise") {
        const e = parseExercise(text, examId);
        const kind = e.kind as ExamExercise["kind"];
        teil.blocks.push({ t: "ex", ex: { id: e.id, kind, title: e.title, intro: e.intro, items: e.items.map((it) => ({ prompt: it.prompt, options: it.options, answers: it.answers, note: it.note })) } });
      } else if (fence[1] === "dialogue") {
        const d = parseDialogue(text);
        teil.blocks.push({ t: "text", title: d.title, lines: d.lines.map((l) => ({ speaker: l.speaker, de: l.de })) });
      } else if (fence[1] === "examples") {
        const all = parseExamples(text);
        const isCard = (de: string) => /^(Karte|Bild):/.test(de);
        teil.blocks.push({
          t: "cards",
          cards: all.filter((x) => isCard(x.de)).map((x) => x.de.replace(/^(Karte|Bild):\s*/, "")),
          model: all.filter((x) => !isCard(x.de)),
        });
      }
      continue;
    }
    buf.push(line);
  }
  flush();
  return { id: examId, title: meta.title as string, subtitle: meta.subtitle as string, modules };
}

export function getExamSummaries() {
  return getExamIds().map((id) => {
    const e = getExam(id)!;
    return { id: e.id, file: id, title: e.title, subtitle: e.subtitle };
  });
}
