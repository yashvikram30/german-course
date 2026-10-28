"use client";

import { genderMark } from "@/lib/gender";
import { MAX_BOX } from "@/lib/srs";
import { useSettings } from "@/lib/settings";
import { SpeakButton } from "../SpeakButton";

interface Word {
  id: string;
  lemma: string;
  article: string | null;
  plural: string | null;
  ipa: string;
  translation: string;
  example: string;
  exampleEn: string;
  audioFile: string | null;
  box: number;
}

export function VocabTable({ title, words }: { title: string; words: Word[] }) {
  const { translations } = useSettings();
  return (
    <section className="my-6">
      {title && <h3 className="!mb-1 !mt-8">{title}</h3>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>German</th>
              <th>Sound</th>
              <th>English</th>
              <th className="w-24"><span className="sr-only">Progress</span></th>
            </tr>
          </thead>
          <tbody>
            {words.map((w) => (
              <tr key={w.id}>
                <td>
                  <span className="font-semibold">
                    {w.article && <span className={`mr-1 ${genderMark(w.article)}`}>{w.article}</span>}
                    {w.lemma}
                  </span>
                  {w.plural && <span className="ml-1 text-xs text-muted">{w.plural}</span>}
                  <span className="mt-0.5 block text-[0.9rem] text-muted">
                    {w.example}
                    {translations && <span className="italic"> — {w.exampleEn}</span>}
                  </span>
                </td>
                <td className="whitespace-nowrap ipa text-base text-muted">
                  {w.ipa}
                  <SpeakButton text={w.article ? `${w.article} ${w.lemma}` : w.lemma} audioFile={w.audioFile} className="ml-2" />
                </td>
                <td>{w.translation}</td>
                <td>
                  <span className="flex gap-0.5" title={w.box ? `In review, level ${w.box} of ${MAX_BOX}` : "Not in review yet"}>
                    {Array.from({ length: MAX_BOX }, (_, i) => (
                      <span key={i} className={`h-1.5 w-3 rounded-sm ${i < w.box ? "bg-blue" : "bg-rule"}`} />
                    ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
