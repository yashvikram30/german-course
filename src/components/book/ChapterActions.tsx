"use client";

import { useEffect, useState, useTransition } from "react";
import { markChapterRead, openChapter } from "@/lib/actions";

export function ChapterTracker({ id }: { id: string }) {
  useEffect(() => {
    void openChapter(id);
  }, [id]);
  return null;
}

export function ReadButton({ id, read, words }: { id: string; read: boolean; words: number }) {
  const [done, setDone] = useState(read);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  if (done) {
    return (
      <p className="ui m-0 text-lg font-semibold text-good" role="status">
        Chapter marked as read{msg && `. ${msg}.`}
      </p>
    );
  }
  return (
    <div className="ui">
      <button
        type="button"
        className="btn btn-solid"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await markChapterRead(id);
            setMsg(r.words ? `${r.words} words added to your review` : "");
            setDone(true);
          })
        }
      >
        I have read this chapter
      </button>
      <p className="mt-2 text-base text-muted">
        {words > 0
          ? `Marking it as read adds its ${words} words to your review, so they come back at spaced intervals.`
          : "Marking it as read unlocks the revision for this chapter's worksheets."}
      </p>
    </div>
  );
}
