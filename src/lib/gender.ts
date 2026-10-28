// Articles are highlighted like a marker pen; the class names are static so Tailwind and CSS see them.
export const genderMark = (article: string | null | undefined) =>
  article === "der" ? "mark mark-der" : article === "die" ? "mark mark-die" : article === "das" ? "mark mark-das" : "";

const RULES: { test: RegExp; article: "der" | "die" | "das"; tip: string }[] = [
  { test: /(ung|heit|keit|schaft|tion)$/i, article: "die", tip: "Nouns ending in -ung, -heit, -keit, -schaft and -tion are always feminine." },
  { test: /(chen|lein)$/i, article: "das", tip: "Nouns ending in -chen or -lein are always neuter." },
  { test: /ismus$/i, article: "der", tip: "Nouns ending in -ismus are masculine." },
  { test: /in$/i, article: "die", tip: "The ending -in marks the female form of a person (die Lehrerin)." },
  { test: /e$/i, article: "die", tip: "Most nouns ending in -e are feminine." },
  { test: /o$/i, article: "das", tip: "Most nouns ending in -o are neuter (das Auto, das Foto)." },
  { test: /er$/i, article: "der", tip: "Most nouns ending in -er name a doer or a thing and are masculine." },
];

/** A rule of thumb that agrees with the real article, so it can be taught after an answer. */
export function genderTip(lemma: string, article: string): string | null {
  const word = lemma.replace(/\s*\(.*\)/, "").trim();
  const hit = RULES.find((r) => r.test.test(word) && r.article === article);
  return hit ? hit.tip : null;
}
