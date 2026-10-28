"use client";

import { useSettings } from "@/lib/settings";
import { SpeakButton } from "../SpeakButton";

export function Examples({ items }: { items: { de: string; en: string }[] }) {
  const { translations } = useSettings();
  return (
    <ul className="my-5 divide-y divide-rule border-y border-rule !list-none !pl-0">
      {items.map((e, i) => (
        <li key={i} className="flex items-start justify-between gap-3 !pl-0 py-2.5">
          <span>
            <span className="text-[1.05rem] font-medium">{e.de}</span>
            {translations && e.en && <span className="block text-[0.92rem] italic text-muted">{e.en}</span>}
          </span>
          <SpeakButton text={e.de} className="mt-0.5" />
        </li>
      ))}
    </ul>
  );
}
