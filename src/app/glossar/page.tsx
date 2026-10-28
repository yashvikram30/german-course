import { WordBank } from "@/components/WordBank";
import { getContents, getWordBank } from "@/lib/data";

export default function GlossarPage() {
  const titles = Object.fromEntries(getContents().map((c) => [c.id, `${c.order}. ${c.title}`]));
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="ui !mb-0 text-[3rem] font-bold leading-tight tracking-tight">Word bank</h1>
      <p className="!mt-2 max-w-xl text-lg text-muted">
        Every word in the book with its article, plural and pronunciation. The bar on each card shows how well you know it. Words enter your review when you mark a chapter as read, or when you press <em>+ Review</em>.
      </p>
      <WordBank words={getWordBank()} chapterTitles={titles} />
    </div>
  );
}
