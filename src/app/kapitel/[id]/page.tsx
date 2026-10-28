import Link from "next/link";
import { notFound } from "next/navigation";
import { ChapterActionsBottom } from "@/components/book/ChapterNav";
import { ChapterBody, outlineOf } from "@/components/book/ChapterBody";
import { ChapterTracker } from "@/components/book/ChapterActions";
import { Annotator } from "@/components/book/Annotator";
import { getAnnotations, getChapter, getContents } from "@/lib/data";

export default async function ChapterPage(props: PageProps<"/kapitel/[id]">) {
  const { id } = await props.params;
  const data = getChapter(id);
  if (!data) notFound();
  const { chapter, prev, next, exercises, read } = data;
  const outline = outlineOf(chapter.body);
  const words = getContents().find((c) => c.id === id)?.words ?? 0;

  return (
    <div className="mx-auto flex max-w-5xl justify-center gap-12">
      <ChapterTracker id={id} />
      <article className="min-w-0 max-w-[38rem] flex-1">
        <header className="mb-6">
          <p className="ui !my-0 text-lg text-muted"><span className="mr-2 rounded-sm bg-blue px-1.5 py-0.5 text-base font-bold text-paper">{chapter.level}</span>{chapter.part}</p>
          <h1 className="ui !mb-0 mt-5 text-[3.2rem] font-bold leading-[1.02] tracking-tight sm:text-[4.6rem]">
            <span className="mr-3 text-blue">{chapter.order}</span>
            {chapter.title}
          </h1>
          <p className="!mt-3 text-xl italic text-muted">{chapter.subtitle}</p>
          <div className="mt-7 border-l-2 border-blue pl-5">
            <p className="ui !my-0 text-lg font-semibold">By the end of this chapter you can</p>
            <ul className="!mb-0 !mt-1.5 text-[1rem]">
              {chapter.goals.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>
        </header>

        <Annotator chapterId={id} initial={getAnnotations(id)}>
          <ChapterBody
            chapterId={id}
            body={chapter.body}
            exercises={new Map([...exercises].map(([k, v]) => [k, { best: v.best, total: v.total }]))}
          />
        </Annotator>

        <ChapterActionsBottom id={id} read={read !== null} words={words} prev={prev} next={next} />

        <p className="focus-hide ui mt-12 border-t border-rule pt-4 text-base text-muted">
          Grammar explanations and example sentences adapted in part from{" "}
          <a className="underline" href="https://en.wikibooks.org/wiki/German">Wikibooks: German</a> (CC BY-SA) and{" "}
          <a className="underline" href="https://coerll.utexas.edu/dib/">Deutsch im Blick</a> (CC BY 4.0).{" "}
          <Link className="underline" href="/quellen">Sources and licences</Link>.
        </p>
      </article>

      <nav aria-label="On this page" className="focus-hide ui sticky top-20 hidden h-fit w-56 shrink-0 text-base xl:block">
        <p className="label !my-0">On this page</p>
        <ol className="mt-3 space-y-2 border-l-2 border-rule pl-3">
          {outline.map((o) => (
            <li key={o.id}>
              <a href={`#${o.id}`} className="text-muted hover:text-blue">
                {o.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
