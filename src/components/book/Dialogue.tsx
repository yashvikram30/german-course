"use client";

import type { DialogueData } from "@/lib/blocks";
import { useSettings } from "@/lib/settings";
import { SpeakButton } from "../SpeakButton";

export function Dialogue({ data }: { data: DialogueData }) {
  const { translations } = useSettings();
  const speakers = [...new Set(data.lines.map((l) => l.speaker))];
  return (
    <figure className="my-8 border-l-2 border-blue pl-5">
      {data.title && <figcaption className="ui text-lg font-semibold">{data.title}</figcaption>}
      {data.setting && <p className="!my-1 text-[0.95rem] italic text-muted">{data.setting}</p>}
      <ul className="mt-4 space-y-3.5 !list-none !pl-0">
        {data.lines.map((l, i) => (
          <li key={i} className="grid grid-cols-[4.8rem_1fr] gap-x-3 !pl-0 sm:grid-cols-[6.5rem_1fr]">
            <span className={`ui pt-0.5 text-right text-base font-semibold ${speakers.indexOf(l.speaker) % 2 ? "text-die" : "text-blue"}`}>{l.speaker}</span>
            <div>
              <p className="!my-0">
                {l.de} <SpeakButton text={l.de} className="ml-1" />
              </p>
              {translations && l.en && <p className="!my-0 text-[0.92rem] italic text-muted">{l.en}</p>}
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}
