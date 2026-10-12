"use client";

import { Grid2x2, ImageUp, Plus, Upload } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { RenderOptions } from "@/lib/render";
import type { GroupId, Settings } from "@/lib/settings";
import type { IconSource, TextSpec } from "@/lib/source";
import { cn } from "@/lib/utils";
import ColorPicker from "./ColorPicker";
import { Slider } from "./controls";
import { useT } from "./I18n";
import IconCanvas from "./IconCanvas";
import LucidePicker from "./LucidePicker";
import Mockups from "./Mockups";
import TextControls from "./TextControls";

export type Mode = "simple" | "advanced";
export type SourceTab = "file" | "text" | "lucide";

const HERO: RenderOptions = { mode: "shape" };
const CHECKER = "bg-[conic-gradient(#2c2c2c_25%,#232323_0_50%,#2c2c2c_0_75%,#232323_0)] bg-[length:20px_20px]";

// Pierwszy to domyslne tlo, zeby swiezy projekt mial zaznaczony kafelek, a nie "wlasny".
const BG_SWATCHES = ["#f59e0b", "#121212", "#ffffff", "#2563eb", "#16a34a"];
const ICON_SWATCHES = ["#ffffff", "#121212"];
const SHAPES = [
  { key: "square", value: 0 },
  { key: "ios", value: 22 },
  { key: "circle", value: 50 },
] as const;

/** Platformy w trybie prostym — kazda wlacza swoje grupy paczki. */
const PLATFORMS: { key: "web" | "ios" | "android" | "windows" | "macos" | "icons"; groups: GroupId[] }[] = [
  { key: "web", groups: ["favicon", "apple", "pwa"] },
  { key: "ios", groups: ["ios", "splash"] },
  { key: "android", groups: ["android"] },
  { key: "windows", groups: ["windows"] },
  { key: "macos", groups: ["macos"] },
  { key: "icons", groups: ["icons"] },
];

export function ModeSwitch({ mode, onChange, className }: { mode: Mode; onChange: (m: Mode) => void; className?: string }) {
  const t = useT();
  return (
    <div role="group" aria-label={t.simple.mode} className={cn("flex rounded-lg border bg-background/60 p-0.5 [&>button]:flex-1", className)}>
      {(["simple", "advanced"] as const).map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={mode === m}
          onClick={() => onChange(m)}
          className={cn(
            "h-8 rounded-md px-3 text-xs transition-colors",
            mode === m ? "bg-foreground font-semibold text-background" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {m === "simple" ? t.simple.modeSimple : t.simple.modeAdvanced}
        </button>
      ))}
    </div>
  );
}

function Card({ step, title, children, className }: { step?: number; title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-4 rounded-2xl border bg-card p-5", className)}>
      {title && (
        <h2 className="text-base font-semibold">
          {step && <span className="mr-2 text-primary">{step}</span>}
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

function SourceTile({
  active,
  icon,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-2 rounded-xl border p-3.5 text-left text-sm transition-colors",
        active ? "border-primary bg-secondary text-foreground" : "hover:border-muted-foreground/60 text-foreground/85",
      )}
    >
      <span className={cn("flex h-6 items-center", active && "text-primary")}>{icon}</span>
      <span>
        {label}
        <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}

function Swatch({ color, active, label, onClick }: { color: string; active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-9 w-9 rounded-lg ring-1 ring-border ring-inset transition-transform hover:scale-110",
        active && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
      )}
      style={{ background: color }}
    />
  );
}

/** Wlasny kolor: ten sam picker co w trybie zaawansowanym, otwierany z kafelka "+". */
function CustomSwatch({
  value,
  active,
  label,
  palette,
  onChange,
}: {
  value: string;
  active: boolean;
  label: string;
  palette: string[];
  onChange: (v: string) => void;
}) {
  return (
    <ColorPicker value={value} onChange={onChange} swatches={palette} label={label} side="bottom">
      <button
        type="button"
        title={label}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-transform hover:scale-110",
          active ? "ring-2 ring-foreground ring-offset-2 ring-offset-card" : "border border-dashed border-muted-foreground/60",
        )}
        style={active ? { background: value } : undefined}
      >
        {!active && <Plus className="h-4 w-4" />}
      </button>
    </ColorPicker>
  );
}

export default function SimpleView({
  mode,
  onMode,
  source,
  settings: s,
  deferred,
  set,
  patch,
  palette,
  sourceTab,
  onSourceTab,
  textSpec,
  setTextSpec,
  onPickFile,
  onPickLucide,
  dragOver,
  groups,
  setGroups,
  fileCount,
  onDownload,
  progress,
  error,
}: {
  mode: Mode;
  onMode: (m: Mode) => void;
  source: IconSource | null;
  settings: Settings;
  deferred: Settings;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  patch: (fn: (prev: Settings) => Partial<Settings>) => void;
  palette: string[];
  sourceTab: SourceTab;
  onSourceTab: (tab: SourceTab) => void;
  textSpec: TextSpec;
  setTextSpec: (fn: (prev: TextSpec) => TextSpec) => void;
  onPickFile: () => void;
  onPickLucide: (svg: SVGElement, name: string) => void;
  dragOver: boolean;
  groups: Set<GroupId>;
  setGroups: (fn: (prev: Set<GroupId>) => Set<GroupId>) => void;
  fileCount: number;
  onDownload: () => void;
  progress: string | null;
  error: string | null;
}) {
  const t = useT();
  const [mockups, setMockups] = useState(false);

  const solid = s.bgMode === "solid";
  const bgCustom = solid && !BG_SWATCHES.includes(s.bgColor);
  const iconCustom = s.tint && !ICON_SWATCHES.includes(s.iconColor);

  const togglePlatform = (ids: GroupId[]) =>
    setGroups((prev) => {
      const next = new Set(prev);
      const on = ids.every((g) => next.has(g));
      for (const g of ids) {
        if (on) next.delete(g);
        else next.add(g);
      }
      return next;
    });

  return (
    <div className="mx-auto flex w-full max-w-[1160px] flex-col gap-7 px-4 pt-6 pb-28 sm:px-6">
      <header className="flex flex-wrap items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/favicon.svg" alt="" className="h-9 w-9" />
        <div className="min-w-[200px] flex-1">
          <h1 className="text-base font-semibold">{t.header.title}</h1>
          <p className="text-sm text-muted-foreground">{t.simple.subtitle}</p>
        </div>
        <ModeSwitch mode={mode} onChange={onMode} />
      </header>

      {/* Waski ekran: duzy podglad jest pod ustawieniami, wiec u gory trzymamy przypiety skrot. */}
      <div className="sticky top-0 z-10 -mx-4 -my-3 flex items-center gap-3 border-b bg-background/95 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6 min-[900px]:hidden">
        <IconCanvas size={128} display={56} src={source} settings={deferred} opts={HERO} />
        {[16, 32, 48].map((size) => (
          <IconCanvas key={size} size={size} src={source} settings={deferred} opts={HERO} />
        ))}
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-5">
          <Card step={1} title={t.simple.step1}>
            <div className="grid grid-cols-3 gap-2.5">
              <SourceTile
                active={sourceTab === "file"}
                icon={<Upload className="h-5 w-5" />}
                label={t.simple.srcFile}
                hint={t.simple.srcFileHint}
                onClick={() => onSourceTab("file")}
              />
              <SourceTile
                active={sourceTab === "text"}
                icon={<span className="text-lg leading-none font-bold">Aa</span>}
                label={t.simple.srcText}
                hint={t.simple.srcTextHint}
                onClick={() => onSourceTab("text")}
              />
              <SourceTile
                active={sourceTab === "lucide"}
                icon={<Grid2x2 className="h-5 w-5" />}
                label={t.simple.srcLucide}
                hint={t.simple.srcLucideHint}
                onClick={() => onSourceTab("lucide")}
              />
            </div>

            {sourceTab === "file" && (
              <div
                className={cn(
                  "flex items-center gap-3 rounded-xl border-2 border-dashed p-3 transition-colors",
                  dragOver ? "border-primary bg-primary/10" : "border-border",
                )}
              >
                <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-md", CHECKER)}>
                  {source && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={source.image.src} alt="" className="max-h-10 max-w-10 object-contain" />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <div className="truncate font-medium">{source && !source.text ? source.name : t.source.noFile}</div>
                  <div className="text-xs text-muted-foreground">{t.source.dropHint}</div>
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={onPickFile}>
                  <ImageUp /> {t.source.change}
                </Button>
              </div>
            )}
            {sourceTab === "text" && (
              <TextControls spec={textSpec} onChange={setTextSpec} idPrefix="simple" />
            )}
            {sourceTab === "lucide" && <LucidePicker selected={source?.lucide} onPick={onPickLucide} />}
          </Card>

          <Card step={2} title={t.simple.step2}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2.5">
                <span className="text-sm">{t.simple.bg}</span>
                <div className="flex flex-wrap gap-2">
                  {BG_SWATCHES.map((c) => (
                    <Swatch
                      key={c}
                      color={c}
                      label={c}
                      active={solid && s.bgColor === c}
                      onClick={() => patch(() => ({ bgMode: "solid", bgColor: c }))}
                    />
                  ))}
                  <button
                    type="button"
                    title={t.simple.bgNone}
                    aria-label={t.simple.bgNone}
                    aria-pressed={s.bgMode === "transparent"}
                    onClick={() => set("bgMode", "transparent")}
                    className={cn(
                      "h-9 w-9 rounded-lg ring-1 ring-border ring-inset transition-transform hover:scale-110",
                      CHECKER,
                      "bg-[length:10px_10px]",
                      s.bgMode === "transparent" && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
                    )}
                  />
                  <CustomSwatch
                    value={s.bgColor}
                    active={bgCustom}
                    label={t.simple.custom}
                    palette={palette}
                    onChange={(c) => patch(() => ({ bgMode: "solid", bgColor: c }))}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <span className="text-sm">{t.simple.iconColor}</span>
                <div className="flex flex-wrap items-center gap-2">
                  {ICON_SWATCHES.map((c) => (
                    <Swatch
                      key={c}
                      color={c}
                      label={c}
                      active={s.tint && s.iconColor === c}
                      onClick={() => patch(() => ({ tint: true, iconColor: c }))}
                    />
                  ))}
                  <CustomSwatch
                    value={s.iconColor}
                    active={iconCustom}
                    label={t.simple.custom}
                    palette={palette}
                    onChange={(c) => patch(() => ({ tint: true, iconColor: c }))}
                  />
                  <button
                    type="button"
                    aria-pressed={!s.tint}
                    onClick={() => set("tint", false)}
                    className={cn(
                      "h-9 rounded-lg border px-3 text-xs transition-colors",
                      !s.tint ? "border-primary bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t.simple.original}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <span className="text-sm">{t.simple.shape}</span>
                <div className="flex gap-2">
                  {SHAPES.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      title={t.shape.presets[p.key]}
                      aria-label={t.shape.presets[p.key]}
                      aria-pressed={s.radius === p.value}
                      onClick={() => set("radius", p.value)}
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-lg border transition-colors",
                        s.radius === p.value ? "border-primary bg-secondary" : "hover:border-muted-foreground/60",
                      )}
                    >
                      <span
                        className={cn("h-5 w-5", s.radius === p.value ? "bg-primary" : "bg-muted-foreground/60")}
                        style={{ borderRadius: `${p.value}%` }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <Slider label={t.simple.size} value={Math.round(s.scale * 100)} min={10} max={150} unit="%" onChange={(v) => set("scale", v / 100)} />
            </div>
          </Card>
        </div>

        <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-5">
          <Card className="items-center">
            <div className={cn("flex h-[244px] w-[244px] items-center justify-center rounded-xl", s.bgMode === "transparent" && CHECKER)}>
              <IconCanvas size={512} display={220} src={source} settings={s} opts={HERO} />
            </div>
            <div className="flex items-end gap-3.5">
              {[16, 32, 48].map((size) => (
                <IconCanvas key={size} size={size} src={source} settings={deferred} opts={HERO} />
              ))}
            </div>
            <button type="button" className="text-sm text-primary hover:underline" onClick={() => setMockups((v) => !v)}>
              {mockups ? t.simple.hideMockups : t.simple.showMockups}
            </button>
          </Card>

          <Card step={3} title={t.simple.step3}>
            <div role="group" aria-label={t.simple.platforms} className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const on = p.groups.every((g) => groups.has(g));
                return (
                  <button
                    key={p.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => togglePlatform(p.groups)}
                    className={cn(
                      "h-9 rounded-full border px-3 text-sm transition-colors",
                      on ? "border-primary bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {on && "✓ "}
                    {t.simple.platform[p.key]}
                  </button>
                );
              })}
            </div>
            {error && <p className="rounded-md bg-destructive/15 px-3 py-2 text-xs text-destructive">{error}</p>}
            <Button type="button" className="h-12 w-full text-[15px] font-semibold" disabled={!groups.size || !!progress} onClick={onDownload}>
              {progress ? t.download.progress(progress) : t.simple.download(fileCount)}
            </Button>
            <button type="button" className="self-center text-sm text-primary hover:underline" onClick={() => onMode("advanced")}>
              {t.simple.details}
            </button>
          </Card>
        </aside>
      </div>

      {mockups && <Mockups src={source} s={deferred} />}
    </div>
  );
}
