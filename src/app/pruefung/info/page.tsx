import Link from "next/link";
import { ChapterBody } from "@/components/book/ChapterBody";
import { getInfoMarkdown } from "@/lib/exam";

export default function ExamInfo() {
  return (
    <article className="mx-auto max-w-[38rem]">
      <p className="ui !my-0 text-lg text-muted"><Link href="/pruefung" className="underline">Prüfung</Link> / Format and scoring</p>
      <h1 className="ui !mb-2 !mt-1 text-[3rem] font-bold leading-tight tracking-tight">Goethe-Zertifikat A1: format and scoring</h1>
      <ChapterBody chapterId="pruefung-info" body={getInfoMarkdown()} exercises={new Map()} />
      <Link href="/pruefung" className="btn btn-solid ui mt-8">Go to the Modelltests</Link>
    </article>
  );
}
