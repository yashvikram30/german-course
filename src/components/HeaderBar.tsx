"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ContentsEntry } from "@/lib/data";
import { SettingsPanel } from "./SettingsPanel";

export function HeaderBar({ contents, due }: { contents: ContentsEntry[]; due: number }) {
  const path = usePathname();
  // The drawer is open "for" one path, so navigating anywhere closes it without an effect.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === path;

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpenFor(null);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);

  const levels = [...new Set(contents.map((c) => c.level))];
  const nav = "ui text-base font-medium text-ink hover:text-blue";

  return (
    <>
      <header className="no-print focus-hide sticky top-0 z-40 border-b-2 border-blue bg-paper">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2">
          <button type="button" className="ui flex items-center gap-2 rounded-sm px-2 py-1 text-base font-medium hover:bg-paper-2" aria-expanded={open} aria-controls="toc" onClick={() => setOpenFor(open ? null : path)}>
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <path d="M3 5h14M3 10h14M3 15h9" />
            </svg>
            Contents
          </button>
          <Link href="/" className="ui text-xl font-bold tracking-tight">
            Deutsch <span className="font-normal text-muted">von Anfang an</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/glossar" className={`${nav} hidden sm:inline`}>Glossary</Link>
            <Link href="/pruefung" className={nav}>Exam</Link>
            <Link href="/wiederholung" className={nav}>
              Review
              {due > 0 && <span className="ml-1.5 rounded-full bg-red px-1.5 pb-0.5 text-sm text-paper">{due}</span>}
            </Link>
            <SettingsPanel />
          </div>
        </div>
      </header>

      {open && (
        <div className="no-print fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Table of contents">
          <nav id="toc" className="drawer-in ui h-full w-[22rem] max-w-[90vw] overflow-y-auto border-r-2 border-blue bg-paper px-6 py-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="text-xl font-bold">Contents</p>
              <button type="button" className="rounded-sm px-2 text-2xl leading-none text-muted hover:text-ink" aria-label="Close contents" onClick={() => setOpenFor(null)}>×</button>
            </div>
            {levels.map((lv) => {
              const inLevel = contents.filter((c) => c.level === lv);
              return (
                <div key={lv} className="mt-6">
                  <p className="!my-0 border-b-2 border-blue pb-1 text-3xl font-bold text-blue">{lv}</p>
                  {[...new Set(inLevel.map((c) => c.part))].map((p) => (
                    <div key={p} className="mt-3">
                      <p className="label">{p}</p>
                      <ol className="mt-1">
                        {inLevel.filter((c) => c.part === p).map((c) => {
                          const here = path === `/kapitel/${c.id}`;
                          return (
                            <li key={c.id}>
                              <Link href={`/kapitel/${c.id}`} className={`flex items-baseline gap-3 border-l-2 py-1.5 pl-3 hover:bg-paper-2 ${here ? "border-red bg-paper-2" : "border-transparent"}`}>
                                <span className="w-6 text-right text-xl font-bold text-blue">{c.order}</span>
                                <span className="flex-1">
                                  <span className="block text-lg font-semibold leading-tight">{c.title}</span>
                                  <span className="block text-[0.9rem] text-muted">
                                    {c.readAt ? "Read. " : ""}
                                    {c.exercisesDone} of {c.exercises} worksheets tried
                                  </span>
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  ))}
                </div>
              );
            })}
            <div className="mt-7 space-y-1.5 border-t border-rule pt-4 text-base">
              <Link href="/glossar" className="block hover:text-blue">Glossary (word bank)</Link>
              <Link href="/wiederholung" className="block hover:text-blue">Review flashcards</Link>
              <Link href="/quellen" className="block hover:text-blue">Sources and licences</Link>
            </div>
          </nav>
          <button type="button" aria-label="Close contents" className="fade-in flex-1 cursor-default bg-ink/40" onClick={() => setOpenFor(null)} />
        </div>
      )}
    </>
  );
}
