"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { addAnnotation, deleteAnnotation, setAnnotationNote } from "@/lib/actions";
import { buildIndex, describe, resolve, type Anchor } from "@/lib/anchor";

interface Saved extends Anchor {
  id: number;
  note: string;
}
type Ann = Anchor & { key: string; id?: number; note: string };

// Selections that start or end in these belong to the worksheets, not to the text.
const SKIP = "input, textarea, select, button, [contenteditable]";

// Inline because the CSS pipeline drops ::highlight() rules from globals.css.
const HIGHLIGHT_CSS = `
::highlight(ann) { background-color: #ffe94a; color: #1c2330; }
::highlight(ann-note) { background-color: #ffe94a; color: #1c2330; text-decoration: underline solid #e5484d 2px; }`;

/**
 * Select text with the pointer to highlight it; start typing straight away to add a note.
 * Click a highlight to read, edit or delete its note. Highlights are painted with the CSS Custom Highlight API,
 * so the markup that React renders is never touched.
 */
export function Annotator({ chapterId, initial, children }: { chapterId: string; initial: Saved[]; children: ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const ranges = useRef(new Map<string, Range>());
  const saving = useRef(new Map<string, Promise<number>>());
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const counter = useRef(0);

  const [anns, setAnns] = useState<Ann[]>(() => initial.map((a) => ({ ...a, key: String(a.id) })));
  const annsRef = useRef(anns);
  // `fresh` = a highlight was just made and nothing has been typed yet: the next keystroke starts the note.
  const [open, setOpen] = useState<{ key: string; top: number; left: number; fresh: boolean } | null>(null);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const commit = useCallback((fn: (prev: Ann[]) => Ann[]) => {
    annsRef.current = fn(annsRef.current);
    setAnns(annsRef.current);
  }, []);

  const persistNote = useCallback(async (key: string) => {
    const a = annsRef.current.find((x) => x.key === key);
    if (!a) return;
    const id = a.id ?? (await saving.current.get(key));
    if (id !== undefined) await setAnnotationNote(id, a.note);
  }, []);

  const flush = useCallback(
    (key?: string) => {
      clearTimeout(timer.current);
      if (key) void persistNote(key);
    },
    [persistNote],
  );

  const close = useCallback(() => {
    if (openRef.current) flush(openRef.current.key);
    setOpen(null);
  }, [flush]);

  // Paint every highlight. Re-run when the list changes or the text underneath is re-rendered.
  const paint = useCallback(() => {
    const el = root.current;
    if (!el || !("highlights" in CSS)) return;
    const idx = buildIndex(el);
    const plain = new Highlight();
    const noted = new Highlight();
    ranges.current = new Map();
    for (const a of annsRef.current) {
      const r = resolve(idx, a);
      if (!r) continue; // the book text changed and the quote is gone: keep it in the database, just don't show it
      ranges.current.set(a.key, r);
      (a.note.trim() ? noted : plain).add(r);
    }
    CSS.highlights.set("ann", plain);
    CSS.highlights.set("ann-note", noted);
  }, []);

  useEffect(() => {
    paint();
  }, [anns, paint]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let frame = 0;
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(paint);
    });
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    return () => {
      mo.disconnect();
      cancelAnimationFrame(frame);
      if ("highlights" in CSS) {
        CSS.highlights.delete("ann");
        CSS.highlights.delete("ann-note");
      }
    };
  }, [paint]);

  const place = useCallback((rect: DOMRect, key: string, fresh: boolean) => {
    const box = wrap.current?.getBoundingClientRect();
    if (!box) return;
    setOpen({ key, fresh, top: rect.bottom - box.top + 6, left: Math.max(0, Math.min(rect.left - box.left, box.width - 288)) });
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el || !("highlights" in CSS)) return;

    const create = (range: Range) => {
      const a = describe(el, buildIndex(el), range);
      if (!a) return;
      const key = `n${++counter.current}`;
      commit((p) => [...p, { ...a, key, note: "" }]);
      const p = addAnnotation(chapterId, a);
      saving.current.set(key, p);
      void p.then((id) => commit((prev) => prev.map((x) => (x.key === key ? { ...x, id } : x))));
      place(range.getBoundingClientRect(), key, true);
      window.getSelection()?.removeAllRanges(); // so the highlight itself is what you see
    };

    const hit = (x: number, y: number) => {
      const pos = document.caretPositionFromPoint?.(x, y);
      const node = pos?.offsetNode ?? document.caretRangeFromPoint?.(x, y)?.startContainer;
      const offset = pos?.offset ?? document.caretRangeFromPoint?.(x, y)?.startOffset ?? 0;
      if (!node) return null;
      let found: string | null = null;
      for (const [key, r] of ranges.current) if (r.isPointInRange(node, offset)) found = key; // later ones sit on top
      return found;
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerType === "touch" || e.button !== 0) return; // touch selection uses its own handles
      const target = e.target as HTMLElement;
      if (target.closest("[data-annotation-popover]")) return;
      const { clientX, clientY } = e;
      // Let the browser finish updating the selection first.
      setTimeout(() => {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.rangeCount) {
          const r = sel.getRangeAt(0);
          const inside = (n: Node) => el.contains(n) && !(n instanceof Element ? n : n.parentElement)?.closest(SKIP);
          if (inside(r.startContainer) && inside(r.endContainer)) create(r);
          return;
        }
        if (!el.contains(target) || target.closest(SKIP)) return;
        const key = hit(clientX, clientY);
        if (!key) return;
        const r = ranges.current.get(key);
        if (r) {
          if (openRef.current) flush(openRef.current.key);
          place(r.getBoundingClientRect(), key, false);
        }
      }, 0);
    };

    const onDown = (e: PointerEvent) => {
      if (openRef.current && !(e.target as HTMLElement).closest("[data-annotation-popover]")) close();
    };

    // Capture phase: a fresh highlight swallows the first keystroke into its note, ahead of single-key shortcuts such as F for focus mode.
    const onKey = (e: KeyboardEvent) => {
      const o = openRef.current;
      if (!o) return;
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        close();
      } else if (o.fresh && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.stopImmediatePropagation();
        area.current?.focus(); // the character is then typed into the note
        setOpen({ ...o, fresh: false });
      }
    };

    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [chapterId, commit, place, close, flush]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const current = open ? anns.find((a) => a.key === open.key) : undefined;

  const remove = () => {
    if (!current) return;
    const { key, id } = current;
    clearTimeout(timer.current);
    commit((p) => p.filter((x) => x.key !== key));
    setOpen(null);
    void (async () => {
      const real = id ?? (await saving.current.get(key));
      if (real !== undefined) await deleteAnnotation(real);
    })();
  };

  return (
    <div ref={wrap} className="relative">
      <style>{HIGHLIGHT_CSS}</style>
      <div ref={root}>{children}</div>
      {open && current && (
        <div
          data-annotation-popover
          className="no-print ui pop-in absolute z-30 w-72 rounded-sm border-2 border-blue bg-paper p-2 shadow-xl"
          style={{ top: open.top, left: open.left }}
          role="dialog"
          aria-label="Note"
        >
          <textarea
            ref={area}
            rows={3}
            value={current.note}
            placeholder={open.fresh ? "Highlighted. Just start typing to add a note…" : "Add a note…"}
            className="w-full resize-none rounded-sm border border-rule bg-sheet p-2 text-base"
            onChange={(e) => {
              const note = e.target.value;
              commit((p) => p.map((x) => (x.key === current.key ? { ...x, note } : x)));
              clearTimeout(timer.current);
              timer.current = setTimeout(() => void persistNote(current.key), 500);
            }}
            onBlur={() => flush(current.key)}
          />
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-muted">Esc to close</span>
            <button type="button" className="font-medium text-red hover:underline" onClick={remove}>
              Delete highlight
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
