// Parsers for the book's Markdown dialect. Used by the seed script (to load
// vocabulary into the database) and by the chapter renderer.

export interface ChapterMeta {
  id: string;
  level: string;
  order: number;
  part: string;
  title: string;
  subtitle: string;
  goals: string[];
}

export function parseFrontmatter(src: string): { meta: ChapterMeta; body: string } {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error("Chapter is missing frontmatter");
  const meta: Record<string, string | string[]> = {};
  let listKey: string | null = null;
  for (const line of m[1].split("\n")) {
    const item = line.match(/^\s*-\s+(.*)$/);
    if (item && listKey) (meta[listKey] as string[]).push(item[1]);
    else {
      const kv = line.match(/^(\w+):\s*(.*)$/);
      if (!kv) continue;
      if (kv[2] === "") {
        listKey = kv[1];
        meta[listKey] = [];
      } else {
        listKey = null;
        meta[kv[1]] = kv[2];
      }
    }
  }
  return {
    meta: {
      id: String(meta.id),
      level: String(meta.level ?? "A1"),
      order: Number(meta.order),
      part: String(meta.part),
      title: String(meta.title),
      subtitle: String(meta.subtitle ?? ""),
      goals: (meta.goals as string[]) ?? [],
    },
    body: m[2],
  };
}

/** Splits "key: value" header lines from the rest, separated by a line of ---. */
function splitHeader(text: string): { header: Record<string, string>; lines: string[] } {
  const all = text.replace(/\r/g, "").split("\n");
  const sep = all.indexOf("---");
  const header: Record<string, string> = {};
  const headerLines = sep === -1 ? [] : all.slice(0, sep);
  for (const l of headerLines) {
    const kv = l.match(/^(\w+):\s*(.*)$/);
    if (kv) header[kv[1]] = kv[2];
  }
  const rest = sep === -1 ? all : all.slice(sep + 1);
  return { header, lines: rest.map((l) => l.trim()).filter(Boolean) };
}

const cells = (line: string) => line.split("|").map((c) => c.trim());

// ---------------- vocabulary ----------------

export interface VocabLine {
  id: string;
  lemma: string;
  article: "der" | "die" | "das" | null;
  plural: string | null;
  pos: string;
  translation: string;
  ipa: string;
  example: string;
  exampleEn: string;
}

export function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** "der Name, -n {#id} | /ipa/ | meaning | example | example meaning | pos" */
export function parseVocab(text: string): { group: string; words: VocabLine[] } {
  const { header, lines } = splitHeader(text);
  const words = lines.map((line) => {
    const [head, ipa, translation, example = "", exampleEn = "", pos = ""] = cells(line);
    const idMatch = head.match(/\{#([\w-]+)\}/);
    const clean = head.replace(/\{#[\w-]+\}/, "").trim();
    const art = clean.match(/^(der|die|das)\s+(.+)$/);
    let lemma = art ? art[2] : clean;
    let plural: string | null = null;
    if (art) {
      const [l, ...rest] = lemma.split(",");
      lemma = l.trim();
      plural = rest.join(",").trim() || null;
    }
    return {
      id: idMatch ? idMatch[1] : slug(lemma),
      lemma,
      article: (art ? art[1] : null) as VocabLine["article"],
      plural,
      pos: pos || (art ? "noun" : ""),
      translation,
      ipa,
      example,
      exampleEn,
    };
  });
  return { group: header.title ?? "", words };
}

// ---------------- dialogue / examples ----------------

export interface DialogueData {
  title: string;
  setting: string;
  lines: { speaker: string; de: string; en: string }[];
}

/** "Speaker: German | English" */
export function parseDialogue(text: string): DialogueData {
  const { header, lines } = splitHeader(text);
  return {
    title: header.title ?? "",
    setting: header.setting ?? "",
    lines: lines.map((l) => {
      const [first, en = ""] = cells(l);
      const i = first.indexOf(":");
      return { speaker: first.slice(0, i).trim(), de: first.slice(i + 1).trim(), en };
    }),
  };
}

export function parseExamples(text: string): { de: string; en: string }[] {
  return splitHeader(text).lines.map((l) => {
    const [de, en = ""] = cells(l);
    return { de, en };
  });
}

// ---------------- exercises ----------------

export type ExerciseKind = "gap" | "choice" | "listen" | "translate" | "order" | "match" | "write";

export interface ExerciseItem {
  prompt: string;
  /** accepted answers (gap/translate), the correct option (choice), the sentence (order), the English side (match) */
  answers: string[];
  options?: string[]; // choice
  note: string;
}

export interface ExerciseData {
  id: string;
  kind: ExerciseKind;
  title: string;
  intro: string;
  items: ExerciseItem[];
}

export function parseExercise(text: string, chapterId: string): ExerciseData {
  const { header, lines } = splitHeader(text);
  const kind = (header.type ?? "gap") as ExerciseKind;
  const items = lines.map((line): ExerciseItem => {
    const c = cells(line);
    switch (kind) {
      case "choice":
      case "listen": {
        const options = c[1].split("/").map((o) => o.trim());
        return { prompt: c[0], options, answers: [c[2]], note: c[3] ?? "" };
      }
      case "match":
        return { prompt: c[0], answers: [c[1]], note: c[2] ?? "" };
      case "order":
      case "write":
        return { prompt: c[0], answers: [c[1] ?? ""], note: c[2] ?? "" };
      default:
        return { prompt: c[0], answers: (c[1] ?? "").split("/").map((a) => a.trim()), note: c[2] ?? "" };
    }
  });
  return {
    id: `${chapterId}-${header.id ?? "ex"}`,
    kind,
    title: header.title ?? "Übung",
    intro: header.intro ?? "",
    items,
  };
}
