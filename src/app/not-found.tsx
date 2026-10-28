import Link from "next/link";

export const metadata = { title: "Seite nicht gefunden · Deutsch von Anfang an" };

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-10">
      <p className="label !my-0">Fehler 404</p>
      <h1 className="ui !mb-1 !mt-1 text-[3.4rem] font-bold leading-[1.02] tracking-tight sm:text-[4.6rem]">
        Seite nicht <span className="text-red">gefunden</span>
      </h1>
      <p className="!mt-2 text-xl italic text-muted">This page does not exist. Check the address, or pick a way back in.</p>

      <div className="mt-6 border-l-2 border-blue pl-5">
        <p className="ui !my-0 text-lg font-semibold">Das Wort des Tages: <span className="text-blue">die Sackgasse</span></p>
        <p className="!mb-0 !mt-1 text-[1.05rem]">Sackgasse, f., -n: a dead end. <em>Hier ist eine Sackgasse.</em> (This is a dead end.)</p>
      </div>

      <div className="ui mt-8 flex flex-wrap gap-3">
        <Link href="/" className="btn btn-solid">Back to the contents</Link>
        <Link href="/pruefung" className="btn">Exam practice</Link>
        <Link href="/glossar" className="btn">Glossary</Link>
        <Link href="/wiederholung" className="btn">Review</Link>
      </div>
    </div>
  );
}
