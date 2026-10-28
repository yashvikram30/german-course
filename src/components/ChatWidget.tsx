"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Msg = { role: "user" | "assistant"; content: string };

const isDash = (c: string) => /^:?-{3,}:?$/.test(c);

/** Small models sometimes squeeze a whole table onto one line. Put its rows back on separate lines. */
function fixTables(text: string) {
  return text
    .split("\n")
    .map((line) => {
      const cells = line.split("|").map((c) => c.trim());
      const at = cells.findIndex(isDash);
      if (at === -1) return line;
      let n = 0;
      while (isDash(cells[at + n] ?? "")) n++;
      const before = cells.slice(0, at);
      const after = cells.slice(at + n);
      const content = [...before, ...after].filter((c) => c && !isDash(c));
      // A normal separator row has nothing but dashes around it, so leave it alone.
      if (content.length === 0) return line;
      const firstBar = line.indexOf("|");
      const lead = line.slice(0, firstBar).trim();
      const head = before.filter(Boolean).slice(-n);
      const intro = before.filter(Boolean).slice(0, -n);
      const body = after.filter(Boolean);
      const row = (r: string[]) => `| ${r.join(" | ")} |`;
      const rows: string[] = [];
      for (let i = 0; i < body.length; i += n) rows.push(row(body.slice(i, i + n)));
      const prose = [lead, ...intro].filter(Boolean).join(" ");
      return [prose, "", row(head), row(Array(n).fill("---")), ...rows].join("\n");
    })
    .join("\n");
}

const HINTS = ["Why is it “ich habe einen Bruder”?", "Explain am, im and um", "Correct my sentence: Ich bin 24 Jahre"];

export function ChatWidget() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [msgs, busy, open]);

  // No help during a mock exam.
  if (/^\/pruefung\/test/.test(path)) return null;
  const chapterId = path.match(/^\/kapitel\/(k\d+)/)?.[1];

  async function send(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: question }];
    setMsgs(next);
    setText("");
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next, chapterId }) });
      const data = await res.json();
      if (!res.ok) setErr(data.error ?? "Something went wrong.");
      else setMsgs([...next, { role: "assistant", content: data.reply }]);
    } catch {
      setErr("Could not reach the server.");
    }
    setBusy(false);
  }

  return (
    <div className="no-print fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="ui flex h-[32rem] max-h-[75vh] w-[23rem] max-w-[92vw] flex-col rounded-sm border-2 border-blue bg-paper shadow-2xl" role="dialog" aria-label="German tutor">
          <div className="flex items-center justify-between border-b-2 border-blue px-4 py-2">
            <p className="!my-0 text-lg font-bold">Tutor <span className="font-normal text-muted">{chapterId ? `· chapter ${Number(chapterId.slice(1))}` : "· A1"}</span></p>
            <div className="flex gap-3">
              {msgs.length > 0 && <button type="button" className="text-base text-muted hover:text-ink" onClick={() => { setMsgs([]); setErr(null); }}>Clear</button>}
              <button type="button" className="text-2xl leading-none text-muted hover:text-ink" aria-label="Close tutor" onClick={() => setOpen(false)}>×</button>
            </div>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-[1rem]">
            {msgs.length === 0 && (
              <div>
                <p className="!mt-0 text-muted">Ask about grammar, a word, or let me check a sentence. I answer in English with German examples.</p>
                <div className="flex flex-col items-start gap-2">
                  {HINTS.map((h) => (
                    <button key={h} type="button" className="rounded-sm border border-rule px-2.5 py-1 text-left hover:border-blue hover:text-blue" onClick={() => send(h)}>{h}</button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "ml-8 rounded-sm bg-paper-2 px-3 py-2" : "mr-4"}>
                {m.role === "user" ? m.content : <div className="tbl text-[0.95rem] [&_p]:!my-1.5 [&_ul]:!my-1.5 [&_table]:!my-2 [&_table]:!text-[0.9rem]"><Markdown remarkPlugins={[remarkGfm]}>{fixTables(m.content)}</Markdown></div>}
              </div>
            ))}
            {busy && <p className="!my-0 text-muted">Thinking …</p>}
            {err && <p className="!my-0 text-red">{err}</p>}
            <div ref={end} />
          </div>
          <form className="flex gap-2 border-t border-rule p-2" onSubmit={(e) => { e.preventDefault(); send(text); }}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask a question …" maxLength={1000} className="min-w-0 flex-1 rounded-sm border border-rule bg-paper px-2 py-1.5 outline-none focus:border-blue" />
            <button type="submit" className="btn btn-solid" disabled={busy || !text.trim()}>Send</button>
          </form>
        </div>
      )}
      <button type="button" className="btn btn-solid shadow-lg" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Close" : "Ask the tutor"}</button>
    </div>
  );
}
