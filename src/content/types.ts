export type Article = "der" | "die" | "das";

export interface VocabEntry {
  id: string;
  lemma: string;
  article?: Article;
  plural?: string;
  pos: string;
  translation: string;
  ipa: string;
  example: string;
  exampleEn: string;
  tags?: string[];
}

export interface DialogueLine {
  speaker: string;
  de: string;
  en: string;
}

export type Exercise =
  | { type: "mcq"; prompt: string; options: string[]; answer: string; explain?: string }
  | { type: "listen"; text: string; options: string[]; answer: string; explain?: string }
  | { type: "gap"; prompt: string; answer: string[]; hint?: string; explain?: string }
  | { type: "order"; prompt: string; answer: string[]; extra?: string[]; explain?: string }
  | { type: "match"; prompt: string; pairs: [string, string][] };

export interface GrammarTable {
  caption?: string;
  head: string[];
  rows: string[][];
}

export interface GrammarBlock {
  title: string;
  intro: string;
  tables?: GrammarTable[];
  examples: { de: string; en: string }[];
  watchOut: string[];
}

export interface LessonContent {
  id: string;
  unitId: string;
  order: number;
  type: "new" | "review" | "test";
  title: string;
  situation?: { setting: string; lines: DialogueLine[] }; // absent for review/test
  vocabIds: string[];
  grammar?: GrammarBlock; // absent for review/test
  passMark?: number; // tests only, percent
  exercises: Exercise[];
  culture: string;
  canDo: string[];
}

export interface UnitMeta {
  id: string;
  level: string;
  order: number;
  title: string;
  theme: string;
  description: string;
}
