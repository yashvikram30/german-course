import Link from "next/link";
import { Flashcards } from "@/components/Flashcards";
import { StudySession } from "@/components/StudySession";
import { getChapterTitle, getReviewOverview, getStudyQueue } from "@/lib/data";

const MODES = [
  { id: "cards", label: "Flashcards", hint: "Flip and say it aloud" },
  { id: "type", label: "Write it", hint: "English to German, with article" },
  { id: "gender", label: "Der, die or das", hint: "Nouns only" },
  { id: "listen", label: "Listening", hint: "Hear it, pick the meaning" },
] as const;

const scopeTitle = (scope: string) =>
  scope === "due" ? "Words due today" : scope === "weak" ? "Words you missed" : scope === "all" ? "All words from the chapters you have read" : getChapterTitle(scope);

function ModeLinks({ scope, nouns = true }: { scope: string; nouns?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {MODES.filter((m) => nouns || m.id !== "gender").map((m) => (
        <Link key={m.id} href={`/wiederholung?scope=${scope}&mode=${m.id}`} className="btn" title={m.hint}>
          {m.label}
        </Link>
      ))}
    </div>
  );
}

export default async function ReviewPage(props: PageProps<"/wiederholung">) {
  const sp = await props.searchParams;
  const mode = typeof sp.mode === "string" ? sp.mode : null;
  const scope = typeof sp.scope === "string" ? sp.scope : "due";

  if (mode && MODES.some((m) => m.id === mode)) {
    const words = getStudyQueue(scope, mode);
    const label = MODES.find((m) => m.id === mode)!.label;
    return (
      <div className="mx-auto max-w-2xl">
        <p className="ui !my-0 text-lg text-muted">
          <Link href="/wiederholung" className="underline">Review</Link> / {label}
        </p>
        <h1 className="ui !mb-0 !mt-1 text-[2.4rem] font-bold leading-tight tracking-tight">{scopeTitle(scope)}</h1>
        {words.length === 0 ? (
          <div className="mt-4 max-w-lg">
            <p className="text-lg text-muted">
              There are no words for this session yet. Only chapters that you marked as <em>read</em> take part. Open a chapter, read it, and press <em>I have read this chapter</em> at the end.
            </p>
            <Link href="/wiederholung" className="btn mt-3">Back to review</Link>
          </div>
        ) : mode === "cards" ? (
          <Flashcards words={words} />
        ) : (
          <StudySession key={`${scope}-${mode}`} mode={mode as "type" | "gender" | "listen"} words={words} />
        )}
      </div>
    );
  }

  const o = getReviewOverview();
  const readChapters = o.chapters.filter((c) => c.read);
  const levels = [...new Set(o.chapters.map((c) => c.level))];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="ui !mb-0 text-[3rem] font-bold leading-tight tracking-tight">Review</h1>
      <p className="!mt-2 max-w-xl text-lg text-muted">
        Revise what you have finished. Only chapters that you marked as read are included, so the review always matches how far you have got.
      </p>

      <section className="mt-8" aria-labelledby="today">
        <h2 id="today" className="ui !mb-2 text-2xl font-bold">Today</h2>
        {readChapters.length === 0 ? (
          <p className="text-lg">
            Nothing to review yet. Read a chapter, then press <em>I have read this chapter</em> at its end. Its words will arrive here.
          </p>
        ) : o.due > 0 ? (
          <>
            <p className="!mt-0 text-lg"><strong>{o.due} word{o.due === 1 ? " is" : "s are"} due.</strong> Short sessions of 20 words work best.</p>
            <ModeLinks scope="due" />
          </>
        ) : (
          <>
            <p className="!mt-0 text-lg">Nothing is due. You can still practise, for example before an exam:</p>
            <ModeLinks scope="all" />
          </>
        )}
      </section>

      {o.weak > 0 && (
        <section className="mt-10" aria-labelledby="weak">
          <h2 id="weak" className="ui !mb-2 text-2xl font-bold">Words you often miss</h2>
          <p className="!mt-0 text-lg">{o.weak} word{o.weak === 1 ? "" : "s"} you missed more often than you got right.</p>
          <ModeLinks scope="weak" />
        </section>
      )}

      <section className="mt-10" aria-labelledby="by-chapter">
        <h2 id="by-chapter" className="ui !mb-0 text-2xl font-bold">By chapter</h2>
        {levels.map((lv) => (
          <div key={lv} className="mt-5">
            <h3 className="ui !m-0 text-lg font-semibold text-blue">{lv}</h3>
            <ul className="mt-1 divide-y divide-rule border-y border-rule !list-none !pl-0">
              {o.chapters.filter((c) => c.level === lv).map((c) => (
                <li key={c.id} className={`!pl-0 py-4 ${c.read ? "" : "opacity-60"}`}>
                  <div className="grid grid-cols-[2.6rem_1fr] gap-x-3">
                    <span className="ui text-right text-3xl font-bold leading-none text-blue">{c.order}</span>
                    <div>
                      <p className="!my-0 text-lg font-semibold leading-snug">{c.title}</p>
                      {c.read ? (
                        <>
                          <p className="ui !my-1 text-base text-muted">
                            {c.words} words, {c.inReview} in review, {c.strong} well known{c.due > 0 ? `, ${c.due} due` : ""}
                          </p>
                          <div className="mb-3 flex h-1.5 max-w-xs overflow-hidden rounded-sm bg-rule" aria-hidden>
                            <div className="bg-good" style={{ width: `${c.words ? (c.strong / c.words) * 100 : 0}%` }} />
                            <div className="bg-blue" style={{ width: `${c.words ? ((c.inReview - c.strong) / c.words) * 100 : 0}%` }} />
                          </div>
                          {c.words > 0 ? (
                            <ModeLinks scope={c.id} nouns={c.nouns > 0} />
                          ) : (
                            <Link href={`/kapitel/${c.id}`} className="btn">Redo the worksheets</Link>
                          )}
                        </>
                      ) : (
                        <p className="ui !my-1 text-base text-muted">
                          Not read yet. <Link href={`/kapitel/${c.id}`} className="text-blue underline">Read this chapter</Link> to unlock its revision.
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {o.worksheets.length > 0 && (
        <section className="mt-10" aria-labelledby="sheets">
          <h2 id="sheets" className="ui !mb-1 text-2xl font-bold">Worksheets worth another try</h2>
          <p className="!mt-0 text-muted">From the chapters you have read: the ones you have not tried, and those you did not get fully right.</p>
          <ul className="divide-y divide-rule border-y border-rule !list-none !pl-0">
            {o.worksheets.slice(0, 12).map((e) => (
              <li key={e.id} className="!pl-0">
                <Link href={`/kapitel/${e.chapterId}#${e.id}`} className="flex items-baseline justify-between gap-4 py-3 hover:bg-paper-2">
                  <span>
                    <span className="block font-semibold">{e.title}</span>
                    <span className="ui block text-base text-muted">{e.chapterTitle}</span>
                  </span>
                  <span className={`ui shrink-0 text-lg ${e.best === null ? "text-muted" : "hand text-red !text-2xl"}`}>
                    {e.best === null ? "not tried" : `${e.best}/${e.total}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-10 text-muted">
        A2 chapters will appear here as soon as they are written. The <Link href="/glossar" className="text-blue underline">glossary</Link> lists every word of the book, including chapters you have not read.
      </p>
    </div>
  );
}
