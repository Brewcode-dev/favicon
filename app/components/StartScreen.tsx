"use client";

import { ArrowRight, FolderOpen, Grid2x2, ShieldCheck, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { RenderOptions } from "@/lib/render";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings";
import { SAMPLE_SVG, sourceFromSvgText, sourceFromText, type IconSource } from "@/lib/source";
import { cn } from "@/lib/utils";
import { useT } from "./I18n";
import IconCanvas from "./IconCanvas";

const SHAPE: RenderOptions = { mode: "shape" };
const FULL: RenderOptions = { mode: "fullbleed", opaque: true };
/** Krzywa ksztaltu ikon iOS jest superelipsa; 22.37% promienia to standardowe przyblizenie. */
const IOS_RADIUS = "22.37%";
const ROTATE_MS = 3500;

/** Przyklady na podgladzie: rozne zrodla i style, renderowane tym samym silnikiem co edytor. */
const EXAMPLES: { key: string; label: string; load: () => Promise<IconSource>; settings: Settings }[] = [
  {
    key: "letter",
    label: "B",
    load: () => sourceFromText({ text: "B", font: "sans", bold: true }),
    settings: { ...DEFAULT_SETTINGS, bgColor: "#f59e0b", iconColor: "#ffffff", tint: true },
  },
  {
    key: "icon",
    label: "☕",
    load: () => sourceFromSvgText(SAMPLE_SVG, "coffee.svg"),
    settings: { ...DEFAULT_SETTINGS, bgColor: "#ffffff", iconColor: "#121212", tint: true },
  },
  {
    key: "serif",
    label: "Ab",
    load: () => sourceFromText({ text: "Ab", font: "serif", bold: true }),
    settings: { ...DEFAULT_SETTINGS, bgColor: "#2563eb", iconColor: "#ffffff", tint: true, radius: 50 },
  },
];

const APPS = ["rgba(255,255,255,.35)", null, "rgba(255,255,255,.35)", "rgba(255,255,255,.35)"];

/**
 * Ekran powitalny. Upuszczenie pliku dziala na calym oknie (obsluga
 * w Generatorze) — tu podswietlamy strefe i pokazujemy przyklad wyniku.
 */
export default function StartScreen({
  dragOver,
  fileCount,
  onPickFile,
  onPickProject,
  onLetter,
  onLibrary,
}: {
  dragOver: boolean;
  fileCount: number;
  onPickFile: () => void;
  onPickProject: () => void;
  onLetter: () => void;
  onLibrary: () => void;
}) {
  const t = useT();
  const [sources, setSources] = useState<(IconSource | null)[]>(() => EXAMPLES.map(() => null));
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let alive = true;
    EXAMPLES.forEach((ex, i) =>
      ex
        .load()
        .then((src) => alive && setSources((prev) => prev.map((p, j) => (j === i ? src : p))))
        .catch(() => {}),
    );
    return () => {
      alive = false;
    };
  }, []);

  // Przyklady zmieniaja sie same, chyba ze uzytkownik najechal na podglad albo woli mniej ruchu.
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % EXAMPLES.length), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  const src = sources[active];
  const s = EXAMPLES[active].settings;
  const name = t.mockups.appName;

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
        <div className="flex w-full max-w-[1160px] flex-wrap items-center justify-center gap-14">
          <section className="flex min-w-0 flex-[1_1_440px] flex-col gap-6">
            <span className="self-start rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-xs text-primary">
              favicon · iOS · Android · PWA
            </span>
            <h1 className="text-4xl leading-[1.04] font-bold tracking-[-0.035em] sm:text-[56px]">
              {t.start.titleBefore}
              <span className="text-primary">{t.start.titleAccent}</span>
              {t.start.titleAfter}
            </h1>
            <p className="max-w-[480px] text-base leading-relaxed text-muted-foreground">{t.start.lead}</p>

            {/* Caly box jest przyciskiem; "Wybierz" to tylko wizualna podpowiedz. */}
            <button
              type="button"
              onClick={onPickFile}
              className={cn(
                "group flex items-center gap-3.5 rounded-2xl border border-dashed p-3.5 text-left transition-colors",
                dragOver ? "border-primary bg-primary/10" : "border-muted-foreground/40 bg-card hover:border-primary/70",
              )}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 text-primary">
                <Upload className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">{t.start.dropTitle}</span>
                <span className="block text-[13px] text-muted-foreground">{t.start.dropFormats}</span>
              </span>
              <span className={buttonVariants({ className: "h-10 rounded-lg px-4 font-semibold group-hover:bg-primary/90" })}>
                {t.start.choose}
              </span>
            </button>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={onLetter}
                className="flex h-14 items-center gap-3 rounded-xl border bg-card px-3.5 text-left transition-colors hover:border-muted-foreground/60"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-sm font-bold">Aa</span>
                <span className="text-sm">
                  <span className="block font-medium">{t.start.letter}</span>
                  <span className="block text-xs text-muted-foreground">{t.start.letterHint}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={onLibrary}
                className="flex h-14 items-center gap-3 rounded-xl border bg-card px-3.5 text-left transition-colors hover:border-muted-foreground/60"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                  <Grid2x2 className="h-4 w-4" />
                </span>
                <span className="text-sm">
                  <span className="block font-medium">{t.start.library}</span>
                  <span className="block text-xs text-muted-foreground">{t.start.libraryHint}</span>
                </span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border px-1.5 font-mono text-xs text-foreground/80">Ctrl</kbd>+
                <kbd className="rounded border px-1.5 font-mono text-xs text-foreground/80">V</kbd>
                {t.start.paste}
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                {t.start.privacy}
              </span>
            </div>
          </section>

          <figure
            aria-label={t.start.example}
            className="flex w-full max-w-[440px] flex-col gap-4 rounded-3xl border bg-card p-5"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase">
              <span className="rounded-full bg-foreground px-2.5 py-1 text-background">{t.start.oneImage}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="rounded-full bg-primary px-2.5 py-1 text-primary-foreground">{t.start.files(fileCount)}</span>
            </div>

            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-sky-400 via-indigo-500 to-fuchsia-500 px-5 pt-6 pb-5">
              <div className="grid grid-cols-4 justify-items-center gap-3">
                {APPS.map((c, i) =>
                  c ? (
                    <span key={i} className="h-[60px] w-[60px]" style={{ borderRadius: IOS_RADIUS, background: c }} />
                  ) : (
                    <span key={i} className="flex flex-col items-center gap-1">
                      <IconCanvas size={180} display={60} src={src} settings={s} opts={FULL} style={{ borderRadius: IOS_RADIUS }} className="shadow-lg" />
                      <span className="text-[10px] text-white">{name}</span>
                    </span>
                  ),
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl bg-[#dfe1e5] px-3 pt-3">
              <div className="flex max-w-[240px] items-center gap-2 rounded-t-lg bg-white px-3 py-2">
                <IconCanvas size={32} display={16} src={src} settings={s} opts={SHAPE} />
                <span className="truncate text-xs text-zinc-800">{t.mockups.siteTitle}</span>
                <span className="ml-auto text-xs text-zinc-500">×</span>
              </div>
              <div className="h-4 bg-white" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center gap-2 rounded-xl bg-[#121212] py-3.5">
                <IconCanvas size={128} display={48} src={src} settings={s} opts={FULL} style={{ borderRadius: "50%" }} />
                <span className="text-[11px] text-zinc-400">Android</span>
              </div>
              <div className="flex flex-col items-center gap-2 rounded-xl bg-background py-3.5">
                <IconCanvas size={128} display={48} src={src} settings={s} opts={SHAPE} />
                <span className="text-[11px] text-muted-foreground">PWA · macOS</span>
              </div>
              <div className="flex flex-col items-center justify-between gap-2 rounded-xl bg-background py-3.5">
                <span className="flex h-12 items-end gap-2">
                  <IconCanvas size={16} display={16} src={src} settings={s} opts={SHAPE} />
                  <IconCanvas size={32} display={32} src={src} settings={s} opts={SHAPE} />
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">16 · 32 px</span>
              </div>
            </div>

            <div role="group" aria-label={t.start.example} className="flex items-center justify-center gap-2">
              {EXAMPLES.map((ex, i) => (
                <button
                  key={ex.key}
                  type="button"
                  aria-pressed={i === active}
                  onClick={() => setActive(i)}
                  className={cn(
                    "h-9 min-w-9 rounded-lg border px-2 text-sm transition-colors",
                    i === active ? "border-primary bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </figure>
        </div>
      </main>
    </div>
  );
}
