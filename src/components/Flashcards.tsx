"use client";

import { useState, useTransition } from "react";
import { gradeWord } from "@/lib/actions";
import { genderMark } from "@/lib/gender";
import { useSettings } from "@/lib/settings";
import { SpeakButton } from "./SpeakButton";

interface Card {
  id: string;
  lemma: string;
  article: string | null;
  plural: string | null;
  translation: string;
  ipa: string;
  example: string;
  exampleEn: string;
  audioFile: string | null;
}

/** Flashcards styled as Karteikarten: a red header line and blue rules. */
export function Flashcards({ words }: { words: Card[] }) {
  const { translations } = useSettings();
  const [queue] = useState(words);
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const [right, setRight] = useState(0);
  const [, start] = useTransition();

  if (i >= queue.length) {
    return (
      <div className="karte stamp-in mt-8 max-w-md px-7 pb-10 pt-14">
        <p className="hand !my-0 text-5xl leading-none text-red">Geschafft!</p>
        <p className="mt-4 text-lg">{right} of {queue.length} remembered. The words you missed come back sooner.</p>
      </div>
    );
  }

  const w = queue[i];
  const full = w.article ? `${w.article} ${w.lemma}` : w.lemma;
  const grade = (good: boolean) => {
    start(() => gradeWord(w.id, good));
    if (good) setRight((r) => r + 1);
    setShown(false);
    setI((n) => n + 1);
  };

  return (
    <div className="mt-6 max-w-md">
      <div className="h-1.5 overflow-hidden rounded-sm bg-rule" role="progressbar" aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={i} aria-label="Review progress">
        <div className="h-full bg-blue transition-[width] duration-300 ease-linear" style={{ width: `${(i / queue.length) * 100}%` }} />
      </div>
      <div key={i} className="karte fade-in mt-4 min-h-[22rem] px-7 pb-7 pt-3">
        <p className="ui !my-0 h-[2.2rem] text-lg text-muted">Card {i + 1} of {queue.length}. What is the German word?</p>
        <p className="!mb-0 !mt-6 text-3xl font-semibold leading-tight">{w.translation}</p>
        {shown ? (
          <div className="mt-8">
            <p className="!my-0 text-4xl font-bold leading-tight">
              {w.article && <span className={`mr-2 ${genderMark(w.article)}`}>{w.article}</span>}
              {w.lemma}
              {w.plural && <span className="ml-2 text-lg font-normal text-muted">{w.plural}</span>}
            </p>
            <p className="!my-1.5 flex items-center gap-3 ipa text-lg text-muted">
              {w.ipa} <SpeakButton text={full} audioFile={w.audioFile} />
            </p>
            <p className="!mb-0 !mt-4 text-lg">{w.example}</p>
            {translations && <p className="!my-0 italic text-muted">{w.exampleEn}</p>}
          </div>
        ) : (
          <button type="button" className="btn btn-solid mt-10" onClick={() => setShown(true)}>
            Show answer
          </button>
        )}
      </div>
      {shown && (
        <div className="mt-4 flex gap-3">
          <button type="button" className="btn flex-1" onClick={() => grade(false)}>Not yet</button>
          <button type="button" className="btn btn-solid flex-1" onClick={() => grade(true)}>Got it</button>
        </div>
      )}
    </div>
  );
}
