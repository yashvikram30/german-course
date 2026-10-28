export default function Quellen() {
  const a = "text-blue underline";
  return (
    <div className="book mx-auto max-w-2xl">
      <h1 className="ui !mb-2 text-[3rem] font-bold leading-tight tracking-tight">Sources and licences</h1>
      <p>
        This book is written for personal study. It teaches from open and public resources, and every explanation and exercise is written fresh for this book rather than copied from a commercial textbook.
      </p>
      <h2>Open sources used</h2>
      <ul>
        <li><a className={a} href="https://en.wikibooks.org/wiki/German">Wikibooks: German</a> (Creative Commons Attribution-ShareAlike). Grammar structure, explanations and many example sentences are adapted from its Grammar pages: personal pronouns, verb conjugation, word order, noun gender, plurals, the accusative and pronunciation. Adapted material in this book remains available under CC BY-SA.</li>
        <li><a className={a} href="https://coerll.utexas.edu/dib/">Deutsch im Blick</a>, University of Texas at Austin (Creative Commons Attribution 4.0). The vocabulary groupings and the introduction-style dialogues follow its first chapter.</li>
      </ul>
      <h2>Scope reference</h2>
      <ul>
        <li><a className={a} href="https://www.goethe.de/pro/relaunch/prf/ca/A1_SD1_Wortliste_02.pdf">Goethe-Zertifikat A1: Start Deutsch 1, Wortliste</a> and <a className={a} href="https://goethe.de/pro/relaunch/prf/et/Pruefungsziele_Testbeschreibung_A1_SD1.pdf">Prüfungsziele</a>. Used only to decide which topics and grammar belong at level A1. No text was copied.</li>
      </ul>
      <h2>Please note</h2>
      <p>
        Pronunciations are given in IPA by the author and should be checked against audio. The computer voices come from your own browser and are not recordings by native speakers.
      </p>
    </div>
  );
}
