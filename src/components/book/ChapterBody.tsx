import type { ReactNode } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { parseDialogue, parseExamples, parseExercise, parseVocab } from "@/lib/blocks";
import { getVocabByIds } from "@/lib/data";
import { Callout, isCallout } from "./Callout";
import { Dialogue } from "./Dialogue";
import { Examples } from "./Examples";
import { Exercise } from "./Exercise";
import { VocabTable } from "./VocabTable";

export const headingId = (text: string) =>
  text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function plain(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(plain).join("");
  if (node && typeof node === "object" && "props" in node) return plain((node as { props: { children?: ReactNode } }).props.children);
  return "";
}

export function ChapterBody({
  chapterId,
  body,
  exercises,
  boxes = new Map(),
}: {
  chapterId: string;
  body: string;
  boxes?: Map<string, number>;
  exercises: Map<string, { best: number; total: number }>;
}) {
  const counter = { n: 0 };

  const components: Components = {
    h2: ({ children }) => <h2 id={headingId(plain(children))}>{children}</h2>,
    h3: ({ children }) => <h3 id={headingId(plain(children))}>{children}</h3>,
    table: ({ children }) => (
      <div className="table-wrap">
        <table>{children}</table>
      </div>
    ),
    pre: ({ children }) => <>{children}</>,
    code: ({ className, children }) => {
      const lang = /language-(\w+)/.exec(className ?? "")?.[1];
      const text = String(children).replace(/\n$/, "");
      if (!lang) return <code>{children}</code>;
      if (lang === "dialogue") return <Dialogue data={parseDialogue(text)} />;
      if (lang === "examples") return <Examples items={parseExamples(text)} />;
      if (lang === "vocab") {
        const { group, words } = parseVocab(text);
        return <VocabTable title={group} words={getVocabByIds(words.map((w) => w.id), boxes)} />;
      }
      if (lang === "exercise") {
        const data = parseExercise(text, chapterId);
        counter.n += 1;
        return <Exercise data={data} chapterId={chapterId} number={counter.n} prior={exercises.get(data.id) ?? null} />;
      }
      if (isCallout(lang)) {
        return (
          <Callout kind={lang}>
            <Markdown remarkPlugins={[remarkGfm]} components={components}>
              {text}
            </Markdown>
          </Callout>
        );
      }
      return <pre>{text}</pre>;
    },
  };

  // One wrapper per section so page mode can show a section per page. The exercise counter is shared, so numbering is unchanged.
  return (
    <div className="book">
      {splitSections(body).map((s, i) => (
        <div key={s.id} data-page={i + 1}>
          <Markdown remarkPlugins={[remarkGfm]} components={components}>
            {s.md}
          </Markdown>
        </div>
      ))}
    </div>
  );
}

/** Splits a chapter at its "##" headings (ignoring fenced blocks). Text before the first heading becomes an "Introduction" section. */
export function splitSections(body: string) {
  const out: { title: string; id: string; md: string }[] = [];
  let fenced = false;
  let cur: string[] = [];
  let title = "Introduction";
  const push = () => {
    const md = cur.join("\n");
    if (md.trim()) out.push({ title, id: headingId(title) || `s${out.length}`, md });
  };
  for (const line of body.split("\n")) {
    if (/^\s*```/.test(line)) fenced = !fenced;
    const h = !fenced && /^##\s+(.+)$/.exec(line);
    if (h) {
      push();
      cur = [];
      title = h[1].trim();
    }
    cur.push(line);
  }
  push();
  return out;
}

export function outlineOf(body: string) {
  return [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => ({ title: m[1].trim(), id: headingId(m[1]) }));
}
