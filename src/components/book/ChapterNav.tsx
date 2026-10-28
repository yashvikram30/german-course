import Link from "next/link";
import { ReadButton } from "./ChapterActions";

type Ref = { id: string; title: string; order: number } | null;

export function ChapterActionsBottom({ id, read, words, prev, next }: { id: string; read: boolean; words: number; prev: Ref; next: Ref }) {
  return (
    <footer className="mt-14 border-t-2 border-blue pt-6">
      <ReadButton id={id} read={read} words={words} />
      {words > 0 && (
        <p className="ui mt-4 text-base">
          <Link href={`/wiederholung?scope=${id}&mode=cards`} className="text-blue underline">Revise the words of this chapter</Link>
          <span className="text-muted"> (flashcards, writing, article and listening quizzes)</span>
        </p>
      )}
      <nav className="ui mt-8 grid grid-cols-2 gap-4" aria-label="Chapter navigation">
        {prev ? (
          <Link href={`/kapitel/${prev.id}`} className="rounded-sm border border-rule p-4 hover:border-blue">
            <span className="label">Previous chapter</span>
            <span className="mt-0.5 block text-lg font-semibold">{prev.order}. {prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/kapitel/${next.id}`} className="rounded-sm border border-rule p-4 text-right hover:border-blue">
            <span className="label">Next chapter</span>
            <span className="mt-0.5 block text-lg font-semibold">{next.order}. {next.title}</span>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </footer>
  );
}
