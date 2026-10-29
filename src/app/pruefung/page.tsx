import Link from "next/link";
import { getExamSummaries, MODULES } from "@/lib/exam";
import { getAllAttempts } from "@/lib/examData";

export default async function ExamHome() {
  const tests = getExamSummaries();
  const attempts = await getAllAttempts();
  const grade = (p: number) => (p >= 90 ? "sehr gut" : p >= 80 ? "gut" : p >= 70 ? "befriedigend" : p >= 60 ? "ausreichend" : "nicht bestanden");

  return (
    <div className="mx-auto max-w-3xl">
      <p className="label !my-0">Prüfung</p>
      <h1 className="ui !mb-2 !mt-1 text-[3rem] font-bold leading-tight tracking-tight">Goethe-Zertifikat A1: Start Deutsch 1</h1>
      <p className="max-w-[36rem] text-xl">
        Four complete mock exams in the format of the real test: three parts of listening and reading, a form and a message to write, and three speaking tasks. Exam mode runs the real timings, limits the audio and keeps answers hidden until the end.
      </p>
      <div className="ui mt-4 flex flex-wrap gap-3">
        <Link href="/pruefung/info" className="btn">Format and scoring</Link>
      </div>

      <div className="tbl mt-6 max-w-[34rem]">
        <div className="table-wrap tbl overflow-x-auto">
          <table>
            <thead><tr><th>Part</th><th>Time</th><th>Teile</th><th>Raw points</th></tr></thead>
            <tbody>
              {MODULES.map((m) => (
                <tr key={m.key}><td><strong>{m.heading}</strong></td><td>{m.key === "hoeren" ? "about " : ""}{m.minutes} min</td><td>{m.key === "schreiben" ? 2 : 3}</td><td>15</td></tr>
              ))}
              <tr><td><strong>Total</strong></td><td>about 80 min</td><td></td><td><strong>60 × 1.66 = 100</strong></td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <h2 className="ui !mb-2 mt-10 text-2xl font-bold">Modelltests</h2>
      <ul className="!pl-0" style={{ listStyle: "none" }}>
        {tests.map((t) => {
          const mine = attempts.filter((a) => a.examId === t.id);
          const best = mine.length ? Math.max(...mine.map((a) => a.total)) : null;
          return (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-rule py-3">
              <div>
                <p className="ui !my-0 text-xl font-bold">{t.title}</p>
                <p className="!my-0 text-muted">{best !== null ? `Best: ${best} / 100 (${grade(best)}), ${mine.length} attempt${mine.length === 1 ? "" : "s"}` : "Not taken yet"}</p>
              </div>
              <Link href={`/pruefung/${t.file}`} className="btn btn-solid ui">{best !== null ? "Take it again" : "Start"}</Link>
            </li>
          );
        })}
      </ul>

      {attempts.length > 0 && (
        <>
          <h2 className="ui !mb-2 mt-10 text-2xl font-bold">Your results</h2>
          <div className="table-wrap tbl overflow-x-auto">
            <table>
              <thead><tr><th>Date</th><th>Test</th><th>Hören</th><th>Lesen</th><th>Schreiben</th><th>Sprechen</th><th>Points</th></tr></thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id}>
                    <td>{new Date(a.takenAt).toLocaleDateString("en-GB")}</td>
                    <td>{a.examId.replace("t", "Modelltest ")}{a.timed ? "" : " (untimed)"}</td>
                    <td>{a.hoeren}</td><td>{a.lesen}</td><td>{a.schreiben}</td><td>{a.sprechen}</td>
                    <td><strong>{a.total}</strong> <span className="text-muted">{grade(a.total)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
