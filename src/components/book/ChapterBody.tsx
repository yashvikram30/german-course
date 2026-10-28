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
}: {
  chapterId: string;
  body: string;
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
        return <VocabTable title={group} words={getVocabByIds(words.map((w) => w.id))} />;
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

  return (
    <div className="book">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {body}
      </Markdown>
    </div>
  );
}

export function outlineOf(body: string) {
  return [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => ({ title: m[1].trim(), id: headingId(m[1]) }));
}
