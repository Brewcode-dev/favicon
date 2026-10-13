"use client";

import { FolderOpen, Grid2x2, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "./I18n";

/** Kafelki aplikacji na ekranie telefonu; `null` to miejsce na ikone uzytkownika. */
const HOME = ["#34c759", "#ffffff", "#0a84ff", "#5ac8fa", "#ffd60a", null, "#1c1c1e", "#ff375f"];
const DOCK = ["#30d158", "#0a84ff", "#ffffff", "#ff375f"];

/**
 * Ekran powitalny: telefon z pustym miejscem na ikone. Upuszczenie pliku
 * dziala na calym oknie (obsluga w Generatorze) — tu tylko podswietlamy cel.
 */
export default function StartScreen({
  dragOver,
  onPickFile,
  onPickProject,
  onLetter,
  onLibrary,
}: {
  dragOver: boolean;
  onPickFile: () => void;
  onPickProject: () => void;
  onLetter: () => void;
  onLibrary: () => void;
}) {
  const t = useT();
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3 sm:px-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/favicon.svg" alt="" className="h-8 w-8" />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">{t.header.title}</div>
          <div className="text-xs text-muted-foreground">{t.start.tagline}</div>
        </div>
        <Button type="button" variant="ghost" onClick={onPickProject}>
          <FolderOpen /> {t.start.openProject}
        </Button>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="flex w-full max-w-[1200px] flex-wrap items-center justify-center gap-14">
          <section className="flex max-w-[440px] min-w-0 flex-[1_1_360px] flex-col gap-6">
            <span className="self-start rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-xs text-primary">
              favicon · iOS · Android · PWA
            </span>
            <h1 className="text-4xl leading-[1.04] font-bold tracking-[-0.035em] sm:text-[52px]">
              {t.start.titleBefore}
              <span className="text-primary">{t.start.titleAccent}</span>
              {t.start.titleAfter}
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">{t.start.lead}</p>
            <div className="flex flex-wrap gap-2.5">
              <Button type="button" className="h-12 rounded-xl px-5 text-[15px] font-semibold" onClick={onPickFile}>
                <Upload /> {t.start.upload}
              </Button>
              <Button type="button" variant="ghost" className="h-12 rounded-xl border px-4 text-[15px]" onClick={onLetter}>
                <span className="font-bold">Aa</span> {t.start.letter}
              </Button>
              <Button type="button" variant="ghost" className="h-12 rounded-xl border px-4 text-[15px]" onClick={onLibrary}>
                <Grid2x2 /> {t.start.library}
              </Button>
            </div>
            <p className="text-[13px] text-muted-foreground">{t.start.hint}</p>
          </section>

          {/* Telefon — caly jest celem klikniecia, bo to najwiekszy element ekranu. */}
          <button
            type="button"
            onClick={onPickFile}
            aria-label={t.start.drop}
            className={cn(
              "flex h-[600px] w-[296px] shrink-0 flex-col justify-between rounded-[48px] border-[10px] border-[#0b0b0b] bg-[#1e2a44] px-5 pt-14 pb-5 text-left shadow-[0_30px_60px_#00000080] ring-1 transition-shadow",
              dragOver ? "ring-4 ring-primary" : "ring-[#3a3a3a] hover:ring-primary/60",
            )}
          >
            <span className="grid grid-cols-4 gap-x-3 gap-y-5">
              {HOME.map((c, i) =>
                c ? (
                  <span key={i} className="mx-auto h-[52px] w-[52px] rounded-[13px] opacity-35" style={{ background: c }} />
                ) : (
                  <span key={i} className="flex flex-col items-center gap-1">
                    <span
                      className={cn(
                        "flex h-[52px] w-[52px] items-center justify-center rounded-[13px] border-2 border-dashed border-primary text-primary transition-colors",
                        dragOver ? "bg-primary/40" : "bg-primary/15",
                      )}
                    >
                      <Plus className="h-6 w-6" strokeWidth={2.5} />
                    </span>
                    <span className="text-[10px] font-semibold text-primary">{t.start.slot}</span>
                  </span>
                ),
              )}
            </span>
            <span
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed px-3 py-5 text-center transition-colors",
                dragOver ? "border-primary bg-primary/20" : "border-primary/60 bg-black/40",
              )}
            >
              <span className="text-sm font-semibold text-white">{t.start.drop}</span>
              <span className="text-xs text-[#dbe3f5]">{t.start.dropHint}</span>
            </span>
            <span className="grid grid-cols-4 gap-3 rounded-[22px] bg-white/10 p-3">
              {DOCK.map((c, i) => (
                <span key={i} className="mx-auto h-12 w-12 rounded-xl opacity-40" style={{ background: c }} />
              ))}
            </span>
          </button>

          <aside aria-label={t.start.elsewhere} className="hidden w-[260px] flex-col gap-3.5 xl:flex">
            <figure className="overflow-hidden rounded-xl border bg-card">
              <div className="flex h-[84px] items-end bg-[#e7e7e7] px-3">
                <div className="flex w-4/5 items-center gap-2 rounded-t-lg bg-white px-3 py-2 text-xs text-zinc-800">
                  <span className="h-3.5 w-3.5 rounded-[3px] border-[1.5px] border-dashed border-amber-700" />
                  {t.mockups.siteTitle}
                </div>
              </div>
              <figcaption className="px-3 py-2.5 text-xs">{t.start.tab}</figcaption>
            </figure>
            <figure className="overflow-hidden rounded-xl border bg-card">
              <div className="flex h-[84px] items-center justify-center gap-4 bg-[#0f172a]">
                <span className="h-[46px] w-[46px] rounded-full border-2 border-dashed border-primary" />
                <span className="h-[46px] w-[46px] rounded-[14px] border-2 border-dashed border-primary" />
              </div>
              <figcaption className="px-3 py-2.5 text-xs">{t.start.android}</figcaption>
            </figure>
            <figure className="overflow-hidden rounded-xl border bg-card">
              <div className="flex h-16 items-center gap-2.5 bg-[#262626] px-3">
                <span className="h-7 w-7 rounded-full border-2 border-dashed border-primary" />
                <span className="flex flex-col gap-1">
                  <span className="h-[7px] w-28 rounded bg-[#4a4a4a]" />
                  <span className="h-[7px] w-[70px] rounded bg-[#3a3a3a]" />
                </span>
              </div>
              <figcaption className="px-3 py-2.5 text-xs">{t.start.notification}</figcaption>
            </figure>
          </aside>
        </div>
      </main>
    </div>
  );
}
