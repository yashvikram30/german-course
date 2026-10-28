"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { createLeaf } from "@/lib/pageLeaf";
import { playPageTurn, preloadPageTurn } from "@/lib/pageSound";
import { updateSettings, useSettings } from "@/lib/settings";

const TURN_MS = 900;
const EDITING = "input, textarea, select, [contenteditable]";
const WIDE = "(min-width: 1000px)";

const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

/** A wide window shows an open book (two pages); a narrow one shows a single page. */
function useWide() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(WIDE);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
}

/**
 * Page mode. Every section of the chapter is laid out as pages (the cover is the first, the closing actions the last). A section that is
 * longer than one page continues on the next: the CSS sets each section in columns exactly one page wide, and we show the right ones.
 * In a wide window two pages are on show, like an open book, and turning a page lifts the right-hand leaf over to the left (see pageLeaf).
 * All sections stay in the DOM, so highlights, worksheet answers and anchors keep working; scroll mode renders the same children.
 */
export function PageReader({ titles, chapter, children }: { titles: string[]; chapter: string; children: ReactNode }) {
  const { pages: on, sound, size, translations } = useSettings();
  const wide = useWide();
  const two = on && wide;
  const [spread, setSpread] = useState(0); // the view on show: a pair of pages (open book) or one page
  const [turn, setTurn] = useState<{ from: number; to: number } | null>(null);
  const [counts, setCounts] = useState<number[]>(() => titles.map(() => 1)); // pages per section, measured
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null); // holds the turning leaf
  const stride = useRef(0); // distance between two pages inside a section, in px
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const raf = useRef(0);

  // All pages of the chapter in reading order; a section that is longer than a page has several.
  const flat = counts.flatMap((n, sec) => Array.from({ length: n }, (_, sub) => ({ sec, sub })));
  const total = flat.length;
  const starts = counts.map((_, sec) => counts.slice(0, sec).reduce((a, b) => a + b, 0));
  const views = two ? Math.floor(total / 2) + 1 : total;
  // Open book: right-hand pages are the even ones, so the cover sits alone on the right. Single page: one page per view.
  const pagesOf = (s: number): [number, number] => (two ? [s > 0 ? 2 * s - 1 : -1, 2 * s < total ? 2 * s : -1] : [-1, s]);
  const clampView = (s: number) => Math.max(0, Math.min(s, views - 1));
  const viewOf = (f: number) => (two ? Math.ceil(f / 2) : f);

  const current = clampView(turn ? turn.to : spread);
  const forward = turn ? turn.to > turn.from : true;
  // What is really on show during a turn. Open book: the current spread, with the incoming page laid over it. Single page: the page
  // underneath, which for a forward turn is the target; the turning page is a clone on top.
  const real = clampView(turn ? (two ? turn.from : forward ? turn.to : turn.from) : spread);
  const [realL, realR] = pagesOf(real);
  const shownSecs = [realL, realR].filter((f) => f >= 0 && f < total).map((f) => flat[f].sec);

  // A section that starts on a right-hand page has its first column in the right half of its strip.
  const shift = (sec: number) => (two && starts[sec] % 2 === 0 ? 1 : 0);

  // Running head and page number of page f, as printed in a book: the chapter on a left-hand page, the section on a right-hand one, and
  // no running head on a page that opens with its own heading.
  const furniture = (f: number) => {
    if (f < 0 || f >= total) return null;
    const side: "l" | "r" = two && f % 2 === 1 ? "l" : "r";
    const { sec, sub } = flat[f];
    return { side, folio: String(f + 1), head: sub === 0 ? "" : side === "l" ? chapter : titles[sec] };
  };
  const furnitureEls = (f: number) => {
    const p = furniture(f);
    if (!p) return [];
    const head = document.createElement("span");
    head.className = `runhead runhead-${p.side}`;
    head.textContent = p.head;
    const folio = document.createElement("span");
    folio.className = `folio folio-${p.side}`;
    folio.textContent = p.folio;
    return [head, folio];
  };
  const scrollFor = (f: number) => {
    const { sec, sub } = flat[f];
    return two ? Math.floor((sub + shift(sec)) / 2) * 2 * stride.current : sub * stride.current;
  };

  useEffect(() => {
    if (on) document.documentElement.setAttribute("data-pages", "");
    else document.documentElement.removeAttribute("data-pages");
    return () => document.documentElement.removeAttribute("data-pages");
  }, [on]);

  useEffect(() => {
    if (two) document.documentElement.setAttribute("data-spread", "");
    else document.documentElement.removeAttribute("data-spread");
    return () => document.documentElement.removeAttribute("data-spread");
  }, [two]);

  // Book view always opens in focus mode. You can leave focus mode afterwards; it comes back the next time the book opens.
  useEffect(() => {
    if (on) updateSettings({ focus: true });
  }, [on]);

  useEffect(() => {
    if (on && sound) preloadPageTurn();
  }, [on, sound]);

  // Count how many pages each section needs: the column the last piece of text falls in. Re-run whenever the text, size or fonts change.
  const measure = useCallback(() => {
    const el = stage.current;
    if (!el) return;
    const next = titles.map(() => 1);
    el.querySelectorAll<HTMLElement>("[data-page]").forEach((p) => {
      const cs = getComputedStyle(p);
      const st = parseFloat(cs.columnWidth) + parseFloat(cs.columnGap);
      const n = Number(p.dataset.page);
      if (!(st > 0) || !p.clientWidth || !(n in next)) return;
      stride.current = st;
      const range = document.createRange();
      range.selectNodeContents(p);
      let maxLeft = 0;
      for (const r of range.getClientRects()) if (r.width > 0 || r.height > 0) maxLeft = Math.max(maxLeft, r.left);
      const rel = maxLeft - p.getBoundingClientRect().left + p.scrollLeft - parseFloat(cs.paddingLeft);
      next[n] = Math.max(1, Math.floor(rel / st + 0.02) + 1);
    });
    setCounts((prev) => (prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next));
  }, [titles]);

  useEffect(() => {
    const el = stage.current;
    if (!on || !el) return;
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    // worksheet feedback, translations toggled, ... but not the turning leaf or the page numbers
    const mo = new MutationObserver((recs) => {
      const quiet = recs.every((r) => (r.target instanceof Element ? r.target : r.target.parentElement)?.closest(".page-clone-host, .folio, .runhead"));
      if (!quiet) schedule();
    });
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    void document.fonts?.ready.then(schedule);
    schedule();
    return () => {
      ro.disconnect();
      mo.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [on, two, measure, size, translations]);

  // Show the right columns of the sections that are on show.
  useLayoutEffect(() => {
    if (!on || !stride.current) return;
    for (const f of [realL, realR]) {
      if (f < 0 || f >= total) continue;
      const el = stage.current?.querySelector<HTMLElement>(`[data-page="${flat[f].sec}"]`);
      if (el) el.scrollLeft = scrollFor(f);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, two, real, counts]);

  // The turning leaf goes away in the same frame the real pages switch over.
  useLayoutEffect(() => {
    if (turn) return;
    cancelAnimationFrame(raf.current);
    host.current?.replaceChildren();
    if (host.current) host.current.style.opacity = "";
    window.dispatchEvent(new CustomEvent("annotator:clone", { detail: null }));
  }, [turn]);

  // Tabbing or find-in-page can scroll a clipped section to another column: follow it.
  useEffect(() => {
    const el = stage.current;
    if (!on || !el) return;
    const onScroll = (e: Event) => {
      const t = e.target as HTMLElement;
      if (turn || !stride.current || t.dataset?.page === undefined) return;
      // Only follow focus moving into a column that is not on show (tabbing); the browser also nudges scrollLeft when the layout changes.
      const active = document.activeElement;
      if (!active || active === t || !t.contains(active)) return;
      const sec = Number(t.dataset.page);
      if (!shownSecs.includes(sec)) return;
      const first = Math.round(t.scrollLeft / (two ? 2 * stride.current : stride.current)) * (two ? 2 : 1); // leftmost slot on show
      const f = starts[sec] + Math.max(0, Math.min(first - shift(sec), (counts[sec] ?? 1) - 1));
      if (viewOf(f) !== real) setSpread(viewOf(f));
    };
    el.addEventListener("scroll", onScroll, true);
    return () => el.removeEventListener("scroll", onScroll, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, two, turn, real, counts]);

  const go = useCallback(
    (to: number) => {
      const target = clampView(to);
      const from = clampView(turn ? turn.to : spread); // a turn in progress is finished first
      const stageEl = stage.current;
      const hostEl = host.current;
      if (target === from || !stageEl || !hostEl) return;
      window.dispatchEvent(new Event("annotator:close"));
      clearTimeout(timer.current);
      cancelAnimationFrame(raf.current);
      hostEl.replaceChildren();
      if (sound) playPageTurn(target > from);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setSpread(target);
        setTurn(null);
        return;
      }
      const fw = target > from;
      const W = stageEl.clientWidth;
      const H = stageEl.clientHeight;
      const pairs: { from: HTMLElement; to: HTMLElement }[] = [];
      // A fresh copy of a page, for the leaf. A section holds several pages in one element, so the pages on a leaf are often the same
      // element as a page that stays on show: copies are what lets them be in two places at once.
      const copy = (f: number): HTMLElement | null => {
        if (f < 0 || f >= total) return null;
        const { sec } = flat[f];
        const src = stageEl.querySelector<HTMLElement>(`[data-page="${sec}"]`);
        if (!src) return null;
        const wrap = document.createElement("div");
        wrap.className = `clone-wrap${sec > 0 && sec < titles.length - 1 ? " book" : ""}`; // the chapter typography is scoped to .book
        Object.assign(wrap.style, { width: `${W}px`, height: `${H}px` });
        const c = src.cloneNode(true) as HTMLElement;
        c.removeAttribute("data-page");
        c.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
        c.setAttribute("data-clone-of", String(sec));
        c.dataset.scroll = String(scrollFor(f));
        c.classList.add("page-clone");
        c.setAttribute("aria-hidden", "true");
        c.setAttribute("inert", "");
        wrap.append(c, ...furnitureEls(f));
        pairs.push({ from: src, to: c });
        return wrap;
      };
      const [fromL, fromR] = pagesOf(from);
      const [toL, toR] = pagesOf(target);
      // Forward, the right-hand page of what you are reading turns over; backward, the right-hand page of the earlier spread turns back.
      const leaf = createLeaf(hostEl, {
        two,
        W,
        H,
        front: () => copy(fw ? fromR : toR),
        back: () => copy(fw ? toL : fromL),
        under: two ? { make: () => copy(fw ? toR : toL), side: fw ? "r" : "l" } : null,
      });
      window.dispatchEvent(new CustomEvent("annotator:clone", { detail: pairs })); // keeps your highlights on the turning pages
      const t0 = performance.now();
      const tick = (now: number) => {
        const u = Math.min(1, (now - t0) / TURN_MS);
        leaf.set(fw ? ease(u) : 1 - ease(u));
        if (u < 1) raf.current = requestAnimationFrame(tick);
      };
      leaf.set(fw ? 0 : 1);
      raf.current = requestAnimationFrame(tick);
      setSpread(from);
      setTurn({ from, to: target });
      timer.current = setTimeout(() => {
        setSpread(target);
        setTurn(null);
      }, TURN_MS);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [turn, spread, counts, sound, two, titles.length],
  );

  useEffect(() => {
    if (!on) return;
    const key = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest(EDITING)) return;
      if (e.key === "ArrowRight") go(current + 1);
      else if (e.key === "ArrowLeft") go(current - 1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [on, go, current]);

  // Opening /kapitel/k01#1.4-the-sounds-of-german lands on the page that holds that heading.
  useEffect(() => {
    if (!on) return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        const hash = location.hash.slice(1);
        const target = hash ? document.getElementById(decodeURIComponent(hash)) : null;
        const page = target?.closest<HTMLElement>("[data-page]");
        if (!target || !page || !stride.current) return;
        const sec = Number(page.dataset.page);
        const x = target.getBoundingClientRect().left - page.getBoundingClientRect().left + page.scrollLeft - parseFloat(getComputedStyle(page).paddingLeft);
        setSpread(viewOf(starts[sec] + Math.max(0, Math.floor(x / stride.current + 0.02))));
      });
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      cancelAnimationFrame(raf.current);
    },
    [],
  );

  useEffect(() => {
    if (!menu) return;
    const outside = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", esc);
    };
  }, [menu]);

  // Which sections are visible, and which start on a right-hand page. Prefixed like the static rules in globals.css so these win on specificity.
  const css = on
    ? `html[data-pages] .page-stage [data-page] { visibility: hidden; }
${shownSecs.map((s) => `html[data-pages] .page-stage [data-page="${s}"] { visibility: visible; }`).join("\n")}
${two ? counts.map((_, sec) => (shift(sec) ? `html[data-pages] .page-stage :is([data-page="${sec}"], [data-clone-of="${sec}"]) { padding-left: calc(var(--pl) + var(--pw)); }` : "")).join("\n") : ""}`
    : "";

  const [curL, curR] = pagesOf(current);
  // How far through the chapter you are: the last page on show. The page edges and the section rail are drawn from it.
  const last = Math.min(total - 1, Math.max(curL, curR));
  const read = total > 1 ? last / (total - 1) : 1;
  const pageNumbers = (s: number) => {
    const [l, r] = pagesOf(s);
    return l >= 0 && r >= 0 && r < total ? `${l + 1}–${r + 1}` : `${(l >= 0 ? l : r) + 1}`;
  };
  const sectionTitle = (s: number) => {
    const f = pagesOf(s).find((p) => p >= 0 && p < total);
    return f === undefined ? "" : `${titles[flat[f].sec]}${counts[flat[f].sec] > 1 ? ` (${flat[f].sub + 1}/${counts[flat[f].sec]})` : ""}`;
  };
  const btn = "ui shrink-0 whitespace-nowrap rounded-sm border border-rule px-3 py-1 text-base font-medium hover:border-blue disabled:pointer-events-none disabled:opacity-35";

  return (
    <>
      {on && <style>{css}</style>}
      <div ref={stage} className={on ? "page-stage" : undefined} style={on ? ({ "--read": read } as CSSProperties) : undefined}>
        {on && (
          <>
            <div className="edge edge-l" aria-hidden />
            <div className="edge edge-r" aria-hidden />
            <div className={`pg pg-l${realL < 0 ? " blank" : ""}`} />
            <div className={`pg pg-r${realR < 0 || realR >= total ? " blank" : ""}`} />
          </>
        )}
        {children}
        {on &&
          [realL, realR].map((f) => {
            const p = furniture(f);
            return (
              p && (
                <span key={p.side} aria-hidden>
                  <span className={`runhead runhead-${p.side}`}>{p.head}</span>
                  <span className={`folio folio-${p.side}`}>{p.folio}</span>
                </span>
              )
            );
          })}
        {/* Click the outer margin of a page to turn it, as in an e-reader; the corner lifts under the pointer. Back and Next below do the same for the keyboard. */}
        {on && <button type="button" tabIndex={-1} aria-hidden className="turn-zone turn-prev" disabled={current === 0} onClick={() => go(current - 1)} />}
        {on && <button type="button" tabIndex={-1} aria-hidden className="turn-zone turn-next" disabled={current === views - 1} onClick={() => go(current + 1)} />}
        {on && <div ref={host} className="page-clone-host" aria-hidden />}
      </div>
      {on && (
        <div className="no-print ui flex items-center justify-between gap-2 text-base sm:gap-3">
          <button type="button" className={btn} disabled={current === 0} onClick={() => go(current - 1)} aria-label="Previous page">
            ← Back
          </button>
          {/* The sections of the chapter, each as long as its pages, filled up to where you are */}
          <div className="rail" role="group" aria-label="Sections">
            {counts.map((n, sec) => (
              <button
                key={sec}
                type="button"
                className="rail-seg"
                style={{ flexGrow: n, "--fill": Math.max(0, Math.min(1, (last + 1 - starts[sec]) / n)) } as CSSProperties}
                title={titles[sec]}
                aria-label={`${titles[sec]}, page ${starts[sec] + 1}`}
                aria-current={flat[last]?.sec === sec ? "true" : undefined}
                onClick={() => go(viewOf(starts[sec]))}
              />
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* the select sits invisibly over a short label, so the bar shows "Pages 4–5 of 52" while the list shows section names */}
            <label className="relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border border-rule px-3 py-1 hover:border-blue">
              <span><span className="max-sm:hidden">{two ? "Pages" : "Page"} </span>{pageNumbers(current)} of {total}</span>
              <span aria-hidden className="text-muted">▾</span>
              <select className="absolute inset-0 w-full cursor-pointer opacity-0" value={current} onChange={(e) => go(Number(e.target.value))} aria-label="Go to page">
                {Array.from({ length: views }, (_, s) => (
                  <option key={s} value={s}>{pageNumbers(s)}. {sectionTitle(s)}</option>
                ))}
              </select>
            </label>
            <div ref={menuRef} className="relative">
              <button type="button" className="rounded-sm border border-rule px-2.5 py-1 hover:border-blue" aria-haspopup="menu" aria-expanded={menu} aria-label="Page options" onClick={() => setMenu(!menu)}>
                ⋯
              </button>
              {menu && (
                <div role="menu" className="pop-in absolute bottom-11 right-0 z-30 w-60 rounded-sm border-2 border-blue bg-paper p-3 text-base shadow-xl">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={sound} onChange={(e) => updateSettings({ sound: e.target.checked })} className="accent-[var(--blue)]" />
                    Page-turn sound
                  </label>
                  <button type="button" className="btn mt-3 w-full" onClick={() => updateSettings({ pages: false, focus: false })}>
                    Back to scroll view
                  </button>
                </div>
              )}
            </div>
          </div>
          <button type="button" className={btn} disabled={current === views - 1} onClick={() => go(current + 1)} aria-label="Next page">
            Next →
          </button>
        </div>
      )}
    </>
  );
}
