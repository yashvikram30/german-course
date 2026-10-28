import Link from "next/link";
import { getContents, getLastOpened } from "@/lib/data";

export default function Contents() {
  const contents = getContents();
  const last = getLastOpened();
  const resume = contents.find((c) => c.id === last) ?? contents[0];
  const levels = [...new Set(contents.map((c) => c.level))];
  const totalWords = contents.reduce((n, c) => n + c.words, 0);

  return (
    <div className="mx-auto max-w-3xl">
      {/* The cover of a Schulheft, with its label sticker */}
      <section className="rounded-sm bg-cover px-5 py-10 sm:px-12 sm:py-14" aria-label="Cover">
        <div className="-rotate-1 rounded-[3px] bg-sheet px-6 py-7 text-ink shadow-[0_18px_30px_-18px_rgba(0,0,0,0.6)] sm:px-9">
          <h1 className="ui !m-0 text-[2.9rem] font-bold leading-[1.02] tracking-tight sm:text-[4.4rem]">
            Deutsch
            <span className="block font-normal text-muted">von Anfang an</span>
          </h1>
          <dl className="ui mt-7 grid grid-cols-[4.5rem_1fr] gap-y-3 text-lg">
            {[
              ["Fach", "Deutsch, Grammatik und Lesebuch"],
              ["Stufe", `A1, ${contents.filter((c) => c.level === "A1").length} Kapitel`],
              ["Name", ""],
            ].map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted">{k}</dt>
                <dd className="hand m-0 border-b border-rule text-[1.7rem] leading-none text-blue">{v || " "}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mt-9 max-w-[36rem]">
        <p className="!mt-0 text-xl leading-relaxed">
          A beginner&rsquo;s German course written like a textbook. Each chapter explains why the language works the way it does, shows real sentences you can hear, and gives you worksheets that mark themselves.
        </p>
        <div className="ui mt-6 flex flex-wrap gap-3">
          <Link href={`/kapitel/${resume.id}`} className="btn btn-solid">
            {last ? "Continue" : "Start"} with chapter {resume.order}, {resume.title}
          </Link>
          <Link href="/glossar" className="btn">Glossary, {totalWords} words</Link>
          <Link href="/pruefung" className="btn">Exam practice (Goethe A1)</Link>
        </div>
      </div>

      <section className="mt-14 max-w-[36rem]" aria-labelledby="how">
        <h2 id="how" className="ui !mb-2 text-2xl font-bold">How to use it</h2>
        <ol className="list-decimal space-y-2 pl-6 marker:font-bold marker:text-blue">
          <li><strong>Read aloud.</strong> Every German sentence has a play button. Pick a male or a female voice under <em>Text and voice</em>.</li>
          <li><strong>Notice the margin notes.</strong> <em>Merke</em> is what to remember, <em>Achtung</em> a common mistake, <em>Tipp</em> a shortcut, <em>Landeskunde</em> the culture behind a phrase.</li>
          <li><strong>Fill in the worksheets.</strong> Your answers are marked in red pencil, and every mistake is explained.</li>
          <li><strong>Review the words.</strong> Marking a chapter as read adds its vocabulary to your flashcards.</li>
        </ol>
      </section>

      <section className="mt-14" aria-labelledby="toc-h">
        <h2 id="toc-h" className="ui !mb-0 text-2xl font-bold">Contents</h2>
        {levels.map((lv) => {
          const inLevel = contents.filter((c) => c.level === lv);
          const parts = [...new Set(inLevel.map((c) => c.part))];
          return (
            <div key={lv} className="mt-8">
              <div className="flex items-baseline gap-3 border-b-2 border-blue pb-1">
                <span className="ui text-4xl font-bold text-blue">{lv}</span>
                <span className="ui text-lg text-muted">
                  {lv === "A1" ? "Beginner: survive and introduce yourself" : "Elementary"}
                  {", "}
                  {inLevel.length} chapters, {inLevel.reduce((n, c) => n + c.words, 0)} words
                </span>
              </div>
              {parts.map((p) => (
                <div key={p} className="mt-5">
                  <h3 className="ui !m-0 text-lg font-semibold text-muted">{p}</h3>
                  <ol className="mt-1 divide-y divide-rule border-y border-rule">
                    {inLevel.filter((c) => c.part === p).map((c) => (
                      <li key={c.id}>
                        <Link href={`/kapitel/${c.id}`} className="group grid grid-cols-[3.2rem_1fr_auto] items-baseline gap-x-3 py-4 hover:bg-paper-2">
                          <span className="ui text-right text-[2.6rem] font-bold leading-none text-blue">{c.order}</span>
                          <span>
                            <span className="block text-xl font-semibold leading-snug group-hover:underline group-hover:decoration-marker group-hover:decoration-[6px] group-hover:underline-offset-[-2px]">{c.title}</span>
                            <span className="block italic text-muted">{c.subtitle}</span>
                            <span className="ui mt-1 block text-base text-muted">
                              {c.words > 0 ? `${c.words} words, ` : ""}
                              {c.exercises} worksheets
                              {c.exercisesDone > 0 ? `, ${c.exercisesDone} tried` : ""}
                            </span>
                          </span>
                          {c.readAt && <span className="hand text-2xl leading-none text-red" title="Read">gelesen</span>}
                        </Link>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          );
        })}

        <div className="mt-8">
          <div className="flex items-baseline gap-3 border-b-2 border-rule pb-1">
            <span className="ui text-4xl font-bold text-muted">A2</span>
            <span className="ui text-lg text-muted">Planned, not written yet</span>
          </div>
          <ul className="mt-3 !list-none !pl-0 text-muted">
            <li className="!pl-0">Subordinate clauses with weil, dass, wenn, obwohl</li>
            <li className="!pl-0">Adjective endings and comparison</li>
            <li className="!pl-0">Reflexive verbs, the genitive and relative clauses</li>
            <li className="!pl-0">Future with werden, connected writing, opinions</li>
          </ul>
        </div>
      </section>

      <p className="mt-12 max-w-[36rem] text-muted">
        The A1 scope follows the Goethe-Institut word list and exam objectives. <Link href="/quellen" className="text-blue underline">See the sources</Link>.
      </p>
    </div>
  );
}
