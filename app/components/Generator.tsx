"use client";

import {
  Crosshair,
  Download,
  FileDown,
  FileUp,
  Image as ImageIcon,
  ImageUp,
  Moon,
  Move,
  Package,
  Palette,
  Redo2,
  RotateCcw,
  RotateCw,
  Smartphone,
  Sparkles,
  SquareRoundCorner,
  // Lucide 1.x nazywa ikony od osi: pionowa linia = odbicie lewo/prawo.
  TrianglesCenterlineDashedHorizontal as FlipVerticalIcon,
  TrianglesCenterlineDashedVertical as FlipHorizontalIcon,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { track } from "@/lib/analytics";
import { localize } from "@/lib/i18n";
import { buildPackage, downloadBlob, exportTarget, PROJECT_FILE, projectFromJson, projectToJson } from "@/lib/package";
import type { RenderOptions } from "@/lib/render";
import { DEFAULT_SETTINGS, GROUPS, mergeSettings, SMALL_MAX, type Align, type BgMode, type GroupId, type Settings } from "@/lib/settings";
import {
  hasEmoji,
  SAMPLE_SVG,
  sourceFromDataUrl,
  sourceFromFile,
  sourceFromLucide,
  sourceFromSvgText,
  sourceFromText,
  trimSource,
  normalizeTextSpec,
  type IconSource,
  type TextSpec,
} from "@/lib/source";
import { TARGETS, type Target } from "@/lib/targets";
import { cn } from "@/lib/utils";
import { ColorField, CustomSwatch, Section, Segmented, Slider, Swatch, Toggle } from "./controls";
import { useErrorText, useLocale, useT } from "./I18n";
import IconCanvas from "./IconCanvas";
import LucidePicker from "./LucidePicker";
import Mockups from "./Mockups";
import StartScreen from "./StartScreen";
import TextControls from "./TextControls";
import TransformOverlay from "./TransformOverlay";
import { useHistory } from "./useHistory";

const STORAGE_KEY = "brewcode-favicon:v1";
/** Wiekszego zrodla nie zapisujemy — localStorage ma zwykle ~5 MB na domene. */
const MAX_STORED_SOURCE = 2_000_000;

type SourceTab = "file" | "text" | "lucide";
type Screen = "start" | "editor";
type Panel = "source" | "position" | "colors" | "shape" | "effects" | "dark" | "app" | "pack";
type CenterView = "canvas" | "files";

interface Stored {
  settings: Settings;
  groups: GroupId[];
  source?: { kind: "svg" | "png"; name: string; data: string; text?: TextSpec; lucide?: string };
}

/** Rodzaj zrodla do analityki: plik wektorowy, raster, litera/emoji albo ikona Lucide. */
const sourceType = (src: IconSource | null) => (!src ? "none" : src.text ? "text" : src.lucide ? "lucide" : src.kind);

const HERO: RenderOptions = { mode: "shape" };
const HERO_SIZE = 300;
const ALL_GROUPS = GROUPS;

const PANELS: { id: Panel; icon: LucideIcon }[] = [
  { id: "source", icon: ImageIcon },
  { id: "position", icon: Move },
  { id: "colors", icon: Palette },
  { id: "shape", icon: SquareRoundCorner },
  { id: "effects", icon: Sparkles },
  { id: "dark", icon: Moon },
  { id: "app", icon: Smartphone },
  { id: "pack", icon: Package },
];

const RADIUS_PRESETS = [
  { key: "square", value: 0 },
  { key: "slight", value: 12 },
  { key: "ios", value: 22 },
  { key: "circle", value: 50 },
] as const;

// Pierwszy to domyslne tlo, zeby swiezy projekt mial zaznaczony kafelek, a nie "wlasny".
const BG_SWATCHES = ["#f59e0b", "#121212", "#ffffff", "#2563eb", "#16a34a"];
const ICON_SWATCHES = ["#ffffff", "#121212"];

type PreviewBg = "checker" | "light" | "dark";
const CHECKER = "bg-[conic-gradient(#2c2c2c_25%,#232323_0_50%,#2c2c2c_0_75%,#232323_0)] bg-[length:20px_20px]";
const PREVIEW_BG: Record<PreviewBg, string> = {
  checker: CHECKER,
  light: "bg-white",
  dark: "bg-black",
};

const ALIGNS: Align[] = ["start", "center", "end"];

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const normDeg = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

function AlignGrid({ x, y, onChange }: { x: Align; y: Align; onChange: (x: Align, y: Align) => void }) {
  const t = useT();
  return (
    <ToggleGroup
      type="single"
      value={`${x}:${y}`}
      onValueChange={(v) => {
        if (!v) return;
        const [ax, ay] = v.split(":") as [Align, Align];
        onChange(ax, ay);
      }}
      aria-label={t.align.label}
      className="grid w-[88px] shrink-0 grid-cols-3 gap-1 p-1"
    >
      {ALIGNS.map((ay) =>
        ALIGNS.map((ax) => (
          <ToggleGroupItem
            key={`${ax}:${ay}`}
            value={`${ax}:${ay}`}
            title={`${t.align.x[ax]} · ${t.align.y[ay]}`}
            aria-label={`${t.align.x[ax]} · ${t.align.y[ay]}`}
            className="group h-6 px-0 data-[state=on]:bg-primary"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 group-data-[state=on]:bg-primary-foreground" />
          </ToggleGroupItem>
        )),
      )}
    </ToggleGroup>
  );
}

function ToolButton({
  label,
  onClick,
  children,
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function RailButton({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-current={active || undefined}
      onClick={onClick}
      className={cn(
        "flex min-w-[64px] flex-col items-center gap-1 rounded-lg px-1 py-2.5 text-[11px] transition-colors",
        active ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}

/** Miniatura zrodla — litera i Lucide sa czarne (kolor nadaje przebarwienie), na ciemnym tle je odwracamy. */
function SourceThumb({ src, className }: { src: IconSource | null; className?: string }) {
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src.image.src}
      alt=""
      className={cn("object-contain", ((src.text && !hasEmoji(src.text.text)) || src.lucide) && "invert", className)}
    />
  );
}

function Tile({ target, src, s }: { target: Target; src: IconSource | null; s: Settings }) {
  const h = target.height ?? target.size;
  const long = Math.max(target.size, h);
  // Podglad renderujemy najwyzej w 256 px na dluzszym boku — dla kafelka 96 px to az nadto.
  const k = Math.min(1, 256 / long);
  const render = Math.round(target.size * k);
  const renderH = Math.round(h * k);
  const display = Math.max(32, Math.min(long, 96));
  const [busy, setBusy] = useState(false);
  const name = target.path.split("/").pop()!;
  const t = useT();
  const locale = useLocale();
  return (
    <button
      type="button"
      title={t.download.file(target.path)}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          downloadBlob(await exportTarget(target, src, s), name);
          track("download_file", { file_name: target.path, file_group: target.group, source_type: sourceType(src) });
        } finally {
          setBusy(false);
        }
      }}
      className="group flex flex-col items-center gap-2 rounded-lg p-2 text-center transition-colors hover:bg-card"
    >
      <div className={cn("relative flex h-[104px] w-[104px] items-center justify-center rounded-md", CHECKER)}>
        <IconCanvas size={render} height={renderH} display={display} src={src} settings={s} opts={target.opts} pixelated={long < display} />
        <Download className="absolute right-1.5 bottom-1.5 h-3.5 w-3.5 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <span className="text-xs font-medium">{localize(target.label, locale)}</span>
      <span className="max-w-[120px] truncate font-mono text-[10px] text-muted-foreground group-hover:text-primary">
        {busy ? "…" : name}
      </span>
    </button>
  );
}

export default function Generator() {
  const t = useT();
  const locale = useLocale();
  const errorText = useErrorText();
  // Domyslne nazwy aplikacji w jezyku interfejsu; reszta ustawien wspolna.
  const [defaults] = useState<Settings>(() => ({ ...DEFAULT_SETTINGS, appName: t.defaults.appName, shortName: t.defaults.shortName }));
  const [settings, setSettings] = useState<Settings>(defaults);
  // Zrodlo tak, jak je wczytano (to zapisujemy); `source` nizej to wersja po przycieciu.
  const [rawSource, setSource] = useState<IconSource | null>(null);
  const [groups, setGroups] = useState<Set<GroupId>>(new Set(ALL_GROUPS));
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewBg, setPreviewBg] = useState<PreviewBg>("checker");
  const [selected, setSelected] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [sourceTab, setSourceTab] = useState<SourceTab>("file");
  // Bez zapisanego zrodla zaczynamy od ekranu powitalnego.
  const [screen, setScreen] = useState<Screen>("start");
  const [panel, setPanel] = useState<Panel>("colors");
  const [center, setCenter] = useState<CenterView>("canvas");
  const [textSpec, setTextSpec] = useState<TextSpec>({ text: "B", font: "sans", bold: true });
  const fileInput = useRef<HTMLInputElement>(null);
  const projectInput = useRef<HTMLInputElement>(null);
  const history = useHistory(settings, setSettings);

  // Przyciecie liczone z rastra raz na zrodlo, nie przy kazdym ruchu suwaka.
  const [trimmed, setTrimmed] = useState<{ from: IconSource; out: IconSource } | null>(null);
  useEffect(() => {
    if (!rawSource || !settings.trim) return;
    let alive = true;
    trimSource(rawSource)
      .then((out) => alive && setTrimmed({ from: rawSource, out }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [rawSource, settings.trim]);
  const source = settings.trim && trimmed?.from === rawSource ? trimmed.out : rawSource;

  // Siatka kilkudziesieciu canvasow nie musi nadazac za kazdym ruchem suwaka.
  const deferred = useDeferredValue(settings);

  const set = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);
  const patch = useCallback((fn: (prev: Settings) => Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...fn(prev) }));
  }, []);

  // Odtworzenie stanu z localStorage — dopiero po montazu, zeby nie rozjechac hydratacji.
  useEffect(() => {
    (async () => {
      let stored: Stored | null = null;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) stored = JSON.parse(raw);
      } catch {}
      if (stored?.settings) history.reset(mergeSettings(stored.settings, defaults));
      if (stored?.groups) setGroups(new Set(stored.groups.filter((g) => ALL_GROUPS.includes(g))));
      const s = stored?.source;
      // Powracajacy uzytkownik od razu widzi edytor — zrodlo dociagamy w tle.
      if (s) setScreen("editor");
      try {
        if (s) {
          const src = s.kind === "svg" ? await sourceFromSvgText(s.data, s.name) : await sourceFromDataUrl(s.data, s.name);
          if (s.text) {
            src.text = s.text;
            setTextSpec(normalizeTextSpec(s.text));
            setSourceTab("text");
          } else if (s.lucide) {
            src.lucide = s.lucide;
            setSourceTab("lucide");
          }
          setSource(src);
        }
      } catch {
        setScreen("start");
      }
      setLoaded(true);
    })();
    // Tylko przy montazu; `history.reset` jest stabilne.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const data: Stored = { settings, groups: [...groups] };
    if (rawSource && rawSource.data.length < MAX_STORED_SOURCE) {
      data.source = { kind: rawSource.kind, name: rawSource.name, data: rawSource.data, text: rawSource.text, lucide: rawSource.lucide };
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, [settings, groups, rawSource, loaded]);

  const importProject = useCallback(
    async (file: File) => {
      const p = await projectFromJson(JSON.parse(await file.text()));
      history.reset(p.settings);
      if (p.groups.size) setGroups(p.groups);
      if (p.source) {
        setSource(p.source);
        if (p.source.text) {
          setTextSpec(normalizeTextSpec(p.source.text));
          setSourceTab("text");
        } else setSourceTab(p.source.lucide ? "lucide" : "file");
      }
      setScreen("editor");
    },
    [history],
  );

  const handleFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      if (file.type === "application/json" || /\.json$/i.test(file.name)) return await importProject(file);
      const src = await sourceFromFile(file);
      setSourceTab("file");
      setSource(src);
      setScreen("editor");
      // Nowa grafika startuje z ustawionego wyrownania — przesuniecie dotyczylo poprzedniej.
      patch(() => ({ offsetX: 0, offsetY: 0 }));
      // Raster zwykle ma juz wlasne kolory — przebarwienie wlaczamy tylko dla SVG.
      setSettings((prev) => ({ ...prev, tint: src.kind === "svg" ? prev.tint : false }));
    } catch (e) {
      setError(errorText(e));
    }
  }, [importProject, errorText, patch]);

  const pickLucide = useCallback(
    async (svg: SVGElement, name: string) => {
      setError(null);
      try {
        setSource(await sourceFromLucide(svg, name));
        patch(() => ({ offsetX: 0, offsetY: 0 }));
        // Ikony Lucide sa jednobarwnymi kreskami — kolor zawsze z przebarwienia.
        setSettings((prev) => ({ ...prev, tint: true }));
      } catch (e) {
        setError(errorText(e));
      }
    },
    [errorText, patch],
  );

  // Zrodlo z litery / emoji: generowane od nowa po krotkiej przerwie w pisaniu.
  const emojiRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!loaded || sourceTab !== "text") return;
    let cancelled = false;
    const id = window.setTimeout(async () => {
      try {
        const src = await sourceFromText(textSpec);
        if (cancelled) return;
        setSource(src);
        setError(null);
        // Emoji maja wlasne kolory — przy przejsciu litera ↔ emoji przelaczamy przebarwienie.
        const emoji = hasEmoji(src.text!.text);
        if (emojiRef.current !== emoji) {
          if (emojiRef.current !== null || !rawSource?.text) setSettings((p) => ({ ...p, tint: !emoji }));
          emojiRef.current = emoji;
        }
      } catch (e) {
        if (!cancelled) setError(errorText(e));
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
    // `source` celowo poza zaleznosciami — efekt sam go ustawia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textSpec, sourceTab, loaded]);

  // Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y. W polach tekstowych zostawiamy natywne cofanie.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if ((e.target as HTMLElement).closest("input[type=text], textarea, [contenteditable]")) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        history.undo();
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        e.preventDefault();
        history.redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [history]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
      if (file) handleFile(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleFile]);

  // Przeksztalcenia z klawiatury, gdy ikonka jest zaznaczona.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      // Suwaki Radix, przelaczniki i grupy przyciskow tez obsluguja strzalki — nie przejmujemy ich.
      if (t.closest('input, textarea, select, [contenteditable], [role="slider"], [role="radio"], [role="switch"], [role="tab"]')) return;
      const step = e.shiftKey ? 5 : 0.5;
      const k = e.key;
      if (k === "Escape") return setSelected(false);
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      if (moves[k]) {
        e.preventDefault();
        const [dx, dy] = moves[k];
        patch((p) => ({ offsetX: clamp(p.offsetX + dx, -50, 50), offsetY: clamp(p.offsetY + dy, -50, 50) }));
      } else if (k === "+" || k === "=") patch((p) => ({ scale: clamp(+(p.scale + 0.05).toFixed(2), 0.1, 1.5) }));
      else if (k === "-") patch((p) => ({ scale: clamp(+(p.scale - 0.05).toFixed(2), 0.1, 1.5) }));
      else if (k === "[" || k === "]") patch((p) => ({ rotation: normDeg(p.rotation + (k === "]" ? 1 : -1) * (e.shiftKey ? 15 : 1)) }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, patch]);

  const download = async () => {
    if (!groups.size) return;
    setError(null);
    setProgress(t.download.generating);
    try {
      const blob = await buildPackage(groups, source, settings, locale, (done, total) => setProgress(`${done}/${total}`));
      downloadBlob(blob, "icons.zip");
      track("download_package", {
        file_count: fileCount,
        group_count: groups.size,
        groups: [...groups].sort().join(","),
        source_type: sourceType(source),
        size_kb: Math.round(blob.size / 1024),
      });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setProgress(null);
    }
  };

  const toggleGroup = (id: GroupId, on?: boolean) =>
    setGroups((prev) => {
      const next = new Set(prev);
      if (on ?? !next.has(id)) next.add(id);
      else next.delete(id);
      return next;
    });

  // Wejscia do edytora z ekranu powitalnego.
  const startLetter = () => {
    setSourceTab("text");
    setPanel("source");
    setScreen("editor");
  };
  const startLibrary = async () => {
    setSourceTab("lucide");
    setPanel("source");
    setScreen("editor");
    // Do czasu wyboru z biblioteki plotno pokazuje przykladowa ikone, zeby nie stalo puste.
    if (!rawSource) setSource(await sourceFromSvgText(SAMPLE_SVG, t.defaults.sampleName));
  };
  const closeSource = () => {
    setSource(null);
    setSourceTab("file");
    setSelected(false);
    setCenter("canvas");
    setError(null);
    setScreen("start");
  };

  const s = settings;
  // Kolory juz uzyte w projekcie — szybki wybor w kazdym polu koloru.
  const palette = [s.bgColor, s.bgColor2, s.iconColor, s.borderColor, s.shadowColor, s.darkBgColor, s.darkIconColor, s.themeColor];
  const fileCount = TARGETS.filter((x) => groups.has(x.group)).length;
  const solid = s.bgMode === "solid";

  // Przeciaganie pliku na okno i ukryte pola wyboru — wspolne dla obu ekranow.
  const dropProps = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      if (e.currentTarget === e.target) setDragOver(false);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFile(e.dataTransfer.files[0]);
    },
  };
  const inputs = (
    <>
      <input
        ref={fileInput}
        type="file"
        accept="image/svg+xml,image/png,image/jpeg,image/webp,.svg"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={projectInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </>
  );
  const errorBox = error && <p className="rounded-md bg-destructive/15 px-3 py-2 text-xs text-destructive">{error}</p>;

  if (screen === "start") {
    return (
      <div className="flex min-h-0 flex-1 flex-col" {...dropProps}>
        {inputs}
        <StartScreen
          dragOver={dragOver}
          onPickFile={() => fileInput.current?.click()}
          onPickProject={() => projectInput.current?.click()}
          onLetter={startLetter}
          onLibrary={startLibrary}
        />
        {error && <div className="fixed inset-x-0 bottom-6 mx-auto w-fit max-w-[90vw]">{errorBox}</div>}
      </div>
    );
  }

  const panels: Record<Panel, ReactNode> = {
    source: (
      <Section title={t.source.title}>
        <Segmented<SourceTab>
          value={sourceTab}
          onChange={setSourceTab}
          options={(["file", "text", "lucide"] as const).map((value) => ({
            value,
            label: (
              <span className="text-xs whitespace-nowrap">
                {{ file: t.source.tabFile, text: t.source.tabText, lucide: t.source.tabLucide }[value]}
              </span>
            ),
          }))}
        />
        {sourceTab === "file" && (
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg border-2 border-dashed p-2.5 transition-colors",
              dragOver ? "border-primary bg-primary/10" : "border-border",
            )}
          >
            <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-md", CHECKER)}>
              {source && !source.text && !source.lucide && <SourceThumb src={source} className="max-h-10 max-w-10" />}
            </div>
            <div className="min-w-0 flex-1 text-sm">
              <div className="truncate font-medium">{source && !source.text && !source.lucide ? source.name : t.source.noFile}</div>
              <div className="text-xs text-muted-foreground">{t.source.dropHint}</div>
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={() => fileInput.current?.click()}>
              <ImageUp /> {t.source.change}
            </Button>
          </div>
        )}
        {sourceTab === "lucide" && <LucidePicker selected={source?.lucide} onPick={pickLucide} />}
        {sourceTab === "text" && <TextControls spec={textSpec} onChange={setTextSpec} idPrefix="src" />}
        {source && sourceTab === "file" && (
          <p className="text-xs text-muted-foreground">
            {source.kind === "svg" ? t.source.vector : t.source.raster} · {Math.round(source.width)}×{Math.round(source.height)}
            {source.kind === "png" && source.width < 512 && <span className="text-primary"> · {t.source.lowRes}</span>}
          </p>
        )}
      </Section>
    ),
    position: (
      <Section
        title={t.position.title}
        aside={
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={() => patch(() => ({ alignX: "center", alignY: "center", offsetX: 0, offsetY: 0, rotation: 0, flipX: false, flipY: false }))}
          >
            {t.position.center}
          </button>
        }
      >
        <Toggle label={t.position.trim} hint={t.position.trimHint} checked={s.trim} onChange={(v) => set("trim", v)} />
        <div className="flex items-center gap-4">
          <AlignGrid x={s.alignX} y={s.alignY} onChange={(x, y) => patch(() => ({ alignX: x, alignY: y, offsetX: 0, offsetY: 0 }))} />
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="text-sm text-foreground">
              {t.align.x[s.alignX]} · {t.align.y[s.alignY]}
            </div>
            {(s.offsetX !== 0 || s.offsetY !== 0) && (
              <button type="button" className="text-primary hover:underline" onClick={() => patch(() => ({ offsetX: 0, offsetY: 0 }))}>
                {t.position.clearOffset}
              </button>
            )}
            <div>{t.position.hint}</div>
          </div>
        </div>
        <Slider label={t.position.size} value={Math.round(s.scale * 100)} min={10} max={150} unit="%" onChange={(v) => set("scale", v / 100)} />
        <Slider
          label={t.position.margin}
          value={s.margin}
          min={0}
          max={40}
          step={0.5}
          unit="%"
          disabled={s.alignX === "center" && s.alignY === "center"}
          onChange={(v) => set("margin", v)}
        />
        <Slider label={t.position.rotation} value={s.rotation} min={-180} max={180} unit="°" onChange={(v) => set("rotation", v)} />
      </Section>
    ),
    colors: (
      <>
        <Section title={t.background.title}>
          <div role="group" aria-label={t.editor.quick} className="flex flex-wrap gap-2">
            {BG_SWATCHES.map((c) => (
              <Swatch key={c} color={c} label={c} active={solid && s.bgColor === c} onClick={() => patch(() => ({ bgMode: "solid", bgColor: c }))} />
            ))}
            <Swatch
              color="conic-gradient(#d6d6d6 25%, #fff 0 50%, #d6d6d6 0 75%, #fff 0) 0 0 / 10px 10px"
              label={t.editor.bgNone}
              active={s.bgMode === "transparent"}
              onClick={() => set("bgMode", "transparent")}
            />
            <CustomSwatch
              value={s.bgColor}
              active={solid && !BG_SWATCHES.includes(s.bgColor)}
              label={t.editor.custom}
              palette={palette}
              onChange={(c) => patch(() => ({ bgMode: "solid", bgColor: c }))}
            />
          </div>
          <Segmented<BgMode>
            value={s.bgMode}
            onChange={(v) => set("bgMode", v)}
            options={[
              { value: "solid", label: t.background.solid },
              { value: "gradient", label: t.background.gradient },
              { value: "transparent", label: t.background.none },
            ]}
          />
          {s.bgMode !== "transparent" && (
            <ColorField
              swatches={palette}
              label={s.bgMode === "gradient" ? t.background.color1 : t.background.color}
              value={s.bgColor}
              onChange={(v) => set("bgColor", v)}
            />
          )}
          {s.bgMode === "gradient" && (
            <>
              <ColorField swatches={palette} label={t.background.color2} value={s.bgColor2} onChange={(v) => set("bgColor2", v)} />
              <Slider label={t.background.angle} value={s.bgAngle} min={0} max={360} unit="°" onChange={(v) => set("bgAngle", v)} />
            </>
          )}
          {s.bgMode === "transparent" && <p className="text-xs text-muted-foreground">{t.background.transparentNote}</p>}
        </Section>
        <Section title={t.iconColor.title}>
          <div role="group" aria-label={t.editor.quick} className="flex flex-wrap items-center gap-2">
            {ICON_SWATCHES.map((c) => (
              <Swatch key={c} color={c} label={c} active={s.tint && s.iconColor === c} onClick={() => patch(() => ({ tint: true, iconColor: c }))} />
            ))}
            <CustomSwatch
              value={s.iconColor}
              active={s.tint && !ICON_SWATCHES.includes(s.iconColor)}
              label={t.editor.custom}
              palette={palette}
              onChange={(c) => patch(() => ({ tint: true, iconColor: c }))}
            />
            <button
              type="button"
              aria-pressed={!s.tint}
              onClick={() => set("tint", false)}
              className={cn(
                "h-8 rounded-lg border px-3 text-xs transition-colors",
                !s.tint ? "border-primary bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.editor.original}
            </button>
          </div>
          <Toggle
            label={t.iconColor.tint}
            hint={source?.kind === "png" ? t.iconColor.tintRaster : t.iconColor.tintSvg}
            checked={s.tint}
            onChange={(v) => set("tint", v)}
          />
          <ColorField swatches={palette} label={t.iconColor.color} value={s.iconColor} disabled={!s.tint} onChange={(v) => set("iconColor", v)} />
        </Section>
      </>
    ),
    shape: (
      <Section title={t.shape.title}>
        <Segmented<string>
          value={String(s.radius)}
          onChange={(v) => set("radius", Number(v))}
          className="w-full"
          options={RADIUS_PRESETS.map((p) => ({ value: String(p.value), label: <span className="text-xs">{t.shape.presets[p.key]}</span> }))}
        />
        <Slider label={t.shape.radius} value={s.radius} min={0} max={50} step={0.5} unit="%" onChange={(v) => set("radius", v)} />
        <Slider label={t.shape.border} value={s.borderWidth} min={0} max={20} step={0.5} unit="%" onChange={(v) => set("borderWidth", v)} />
        <ColorField swatches={palette} label={t.shape.borderColor} value={s.borderColor} disabled={s.borderWidth === 0} onChange={(v) => set("borderColor", v)} />
        <p className="text-xs text-muted-foreground">{t.shape.note}</p>
      </Section>
    ),
    effects: (
      <>
        <Section title={t.shadow.title}>
          <Toggle label={t.shadow.toggle} checked={s.shadow} onChange={(v) => set("shadow", v)} />
          {s.shadow && (
            <>
              <ColorField swatches={palette} label={t.shadow.color} value={s.shadowColor} onChange={(v) => set("shadowColor", v)} />
              <Slider label={t.shadow.opacity} value={s.shadowOpacity} min={0} max={100} unit="%" onChange={(v) => set("shadowOpacity", v)} />
              <Slider label={t.shadow.blur} value={s.shadowBlur} min={0} max={20} step={0.5} unit="%" onChange={(v) => set("shadowBlur", v)} />
              <Slider label={t.shadow.offsetY} value={s.shadowOffsetY} min={-10} max={10} step={0.5} unit="%" onChange={(v) => set("shadowOffsetY", v)} />
            </>
          )}
        </Section>
        <Section title={t.small.title(SMALL_MAX)}>
          <Toggle label={t.small.toggle} hint={t.small.hint} checked={s.smallEnabled} onChange={(v) => set("smallEnabled", v)} />
          {s.smallEnabled && (
            <>
              <Slider label={t.small.size} value={Math.round(s.smallScale * 100)} min={10} max={150} unit="%" onChange={(v) => set("smallScale", v / 100)} />
              <Toggle label={t.small.keepBorder} checked={s.smallBorder} onChange={(v) => set("smallBorder", v)} />
            </>
          )}
        </Section>
      </>
    ),
    dark: (
      <Section title={t.dark.title}>
        <Toggle label={t.dark.toggle} hint={t.dark.hint} checked={s.darkEnabled} onChange={(v) => set("darkEnabled", v)} />
        {s.darkEnabled && (
          <>
            <ColorField
              swatches={palette}
              label={t.dark.bg}
              value={s.darkBgColor}
              disabled={s.bgMode === "transparent"}
              onChange={(v) => set("darkBgColor", v)}
            />
            <ColorField swatches={palette} label={t.dark.icon} value={s.darkIconColor} disabled={!s.tint} onChange={(v) => set("darkIconColor", v)} />
            <p className="text-xs text-muted-foreground">
              {s.bgMode === "transparent" ? t.dark.noBgNote : ""}
              {!s.tint ? t.dark.needsTintNote : ""}
              {t.dark.iosNote}
            </p>
          </>
        )}
      </Section>
    ),
    app: (
      <Section title={t.app.title}>
        <div className="space-y-1.5">
          <Label htmlFor="app-name" className="font-normal">
            {t.app.name}
          </Label>
          <Input id="app-name" value={s.appName} onChange={(e) => set("appName", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="app-short" className="font-normal">
            {t.app.shortName}
          </Label>
          <Input id="app-short" value={s.shortName} onChange={(e) => set("shortName", e.target.value)} />
        </div>
        <ColorField swatches={palette} label={t.app.themeColor} value={s.themeColor} onChange={(v) => set("themeColor", v)} />
      </Section>
    ),
    pack: (
      <>
        <Section
          title={t.pack.title}
          aside={
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => setGroups(groups.size === ALL_GROUPS.length ? new Set() : new Set(ALL_GROUPS))}
            >
              {groups.size === ALL_GROUPS.length ? t.pack.deselectAll : t.pack.selectAll}
            </button>
          }
        >
          {GROUPS.map((g) => (
            <div key={g} className="flex items-start gap-2.5">
              <Checkbox id={`grp-${g}`} checked={groups.has(g)} onCheckedChange={(v) => toggleGroup(g, v === true)} className="mt-0.5" />
              <label htmlFor={`grp-${g}`} className="flex-1 text-sm leading-tight">
                {t.groups[g].label}
                <span className="mt-0.5 block text-xs text-muted-foreground">{t.groups[g].hint}</span>
              </label>
              <span className="font-mono text-xs text-muted-foreground">{TARGETS.filter((x) => x.group === g).length}</span>
            </div>
          ))}
        </Section>
        <Section title={t.project.title}>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                downloadBlob(
                  new Blob([JSON.stringify(projectToJson(settings, groups, rawSource), null, 2)], { type: "application/json" }),
                  PROJECT_FILE,
                );
                track("download_project", { source_type: sourceType(source) });
              }}
            >
              <FileDown /> {t.project.save}
            </Button>
            <Button type="button" size="sm" variant="secondary" className="flex-1" onClick={() => projectInput.current?.click()}>
              <FileUp /> {t.project.load}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t.project.note}</p>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setSettings({ ...defaults, appName: s.appName, shortName: s.shortName })}
          >
            {t.project.resetDefaults}
          </button>
        </Section>
      </>
    ),
  };

  const downloadButton = (
    <Button type="button" className="h-9 font-semibold" disabled={!groups.size || !!progress} onClick={download}>
      <Download />
      {progress ? t.download.progress(progress) : t.editor.download(fileCount)}
    </Button>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:h-screen lg:flex-none lg:overflow-hidden" {...dropProps}>
      {inputs}

      <header className="flex flex-wrap items-center gap-2 border-b bg-card px-3 py-2 sm:gap-3 sm:px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/favicon.svg" alt="" className="h-8 w-8" />
        <span className="mr-1 hidden text-[15px] font-semibold sm:inline">{t.header.title}</span>
        <div className="flex h-10 min-w-0 items-center rounded-lg border bg-secondary/40">
          <button
            type="button"
            onClick={() => setPanel("source")}
            className="flex h-full min-w-0 items-center gap-2 rounded-l-lg pr-1 pl-2.5 text-left hover:bg-secondary"
          >
            <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded", CHECKER, "bg-[length:8px_8px]")}>
              <SourceThumb src={source} className="max-h-5 max-w-5" />
            </span>
            <span className="max-w-[180px] truncate text-sm font-medium">
              {source ? (source.text ? t.source.textName(source.text.text) : source.name) : t.source.noFile}
            </span>
          </button>
          <button
            type="button"
            title={t.editor.closeSource}
            aria-label={t.editor.closeSource}
            onClick={closeSource}
            className="flex h-full w-8 items-center justify-center rounded-r-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1" />
        <ToolButton label={t.tools.undo} disabled={!history.canUndo} onClick={history.undo}>
          <Undo2 />
        </ToolButton>
        <ToolButton label={t.tools.redo} disabled={!history.canRedo} onClick={history.redo}>
          <Redo2 />
        </ToolButton>
        <span className="hidden sm:contents">{downloadButton}</span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Telefon: najpierw podglad, potem ustawienia. */}
        <nav
          aria-label={t.editor.panelsLabel}
          className="order-2 flex shrink-0 gap-1 overflow-x-auto border-b bg-card p-2 lg:order-none lg:w-[80px] lg:flex-col lg:overflow-y-auto lg:border-r lg:border-b-0"
        >
          {PANELS.map((p) => (
            <RailButton key={p.id} icon={p.icon} label={t.editor.panels[p.id]} active={panel === p.id} onClick={() => setPanel(p.id)} />
          ))}
        </nav>

        <aside className="order-3 flex shrink-0 flex-col bg-card lg:order-none lg:w-[320px] lg:border-r">
          <h1 className="px-5 pt-4 text-base font-semibold">{t.editor.panels[panel]}</h1>
          <div className="min-h-0 flex-1 lg:overflow-y-auto">{panels[panel]}</div>
          {error && <div className="border-t p-4">{errorBox}</div>}
        </aside>

        <main className="order-1 flex min-w-0 flex-1 flex-col lg:order-none">
          <div role="toolbar" aria-label={t.editor.viewLabel} className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
            <Segmented<CenterView>
              value={center}
              onChange={setCenter}
              options={[
                { value: "canvas", label: t.editor.views.canvas },
                { value: "files", label: <span className="whitespace-nowrap">{t.editor.views.files} · {fileCount}</span> },
              ]}
            />
            {center === "canvas" && (
              <div className="ml-auto" role="group" aria-label={t.editor.previewBg}>
                <Segmented<PreviewBg>
                  value={previewBg}
                  onChange={setPreviewBg}
                  options={[
                    { value: "checker", label: t.preview.checker },
                    { value: "light", label: t.preview.light },
                    { value: "dark", label: t.preview.dark },
                  ]}
                />
              </div>
            )}
          </div>

          {center === "canvas" ? (
            <div className="flex min-h-0 flex-1 flex-col bg-[#1a1a1a] bg-[radial-gradient(#2a2a2a_1px,transparent_1px)] bg-[length:16px_16px] lg:overflow-y-auto">
              <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6">
                <div
                  className={cn("flex h-[360px] w-[360px] max-w-full items-center justify-center rounded-2xl shadow-lg", PREVIEW_BG[previewBg])}
                  onPointerDown={() => setSelected(false)}
                >
                  <div className="relative" style={{ width: HERO_SIZE, height: HERO_SIZE }}>
                    <IconCanvas size={512} display={HERO_SIZE} src={source} settings={s} opts={HERO} />
                    {source && (
                      <TransformOverlay size={HERO_SIZE} src={source} s={s} selected={selected} onSelect={() => setSelected(true)} patch={patch} />
                    )}
                  </div>
                </div>

                <div role="toolbar" aria-label={t.position.title} className="flex flex-wrap items-center justify-center gap-0.5 rounded-xl border bg-card p-1">
                  <ToolButton label={t.tools.zoomOut} onClick={() => patch((p) => ({ scale: clamp(+(p.scale - 0.05).toFixed(2), 0.1, 1.5) }))}>
                    <ZoomOut />
                  </ToolButton>
                  <span className="w-12 text-center font-mono text-xs tabular-nums text-muted-foreground">{Math.round(s.scale * 100)}%</span>
                  <ToolButton label={t.tools.zoomIn} onClick={() => patch((p) => ({ scale: clamp(+(p.scale + 0.05).toFixed(2), 0.1, 1.5) }))}>
                    <ZoomIn />
                  </ToolButton>
                  <span className="mx-1 h-5 w-px bg-border" />
                  <ToolButton label={t.tools.rotateLeft} onClick={() => patch((p) => ({ rotation: normDeg(p.rotation - 90) }))}>
                    <RotateCcw />
                  </ToolButton>
                  <ToolButton label={t.tools.rotateRight} onClick={() => patch((p) => ({ rotation: normDeg(p.rotation + 90) }))}>
                    <RotateCw />
                  </ToolButton>
                  <ToolButton label={t.tools.flipH} onClick={() => patch((p) => ({ flipX: !p.flipX }))}>
                    <FlipHorizontalIcon className={s.flipX ? "text-primary" : ""} />
                  </ToolButton>
                  <ToolButton label={t.tools.flipV} onClick={() => patch((p) => ({ flipY: !p.flipY }))}>
                    <FlipVerticalIcon className={s.flipY ? "text-primary" : ""} />
                  </ToolButton>
                  <span className="mx-1 h-5 w-px bg-border" />
                  <ToolButton
                    label={t.tools.resetTransform}
                    onClick={() =>
                      patch(() => ({
                        scale: DEFAULT_SETTINGS.scale,
                        alignX: "center",
                        alignY: "center",
                        offsetX: 0,
                        offsetY: 0,
                        rotation: 0,
                        flipX: false,
                        flipY: false,
                      }))
                    }
                  >
                    <Crosshair />
                  </ToolButton>
                </div>

                {/* Bez prawej kolumny makiety laduja pod plotnem. */}
                <div className="w-full max-w-3xl xl:hidden">
                  <Mockups src={source} s={deferred} />
                </div>
              </div>
              <p className="border-t bg-background/80 px-4 py-2 text-xs text-muted-foreground">
                {t.preview.help1}
                <kbd className="font-mono">+</kbd>/<kbd className="font-mono">−</kbd>, <kbd className="font-mono">[</kbd>/
                <kbd className="font-mono">]</kbd>, Esc{t.preview.help2}
              </p>
            </div>
          ) : (
            <div className="min-h-0 flex-1 space-y-8 p-6 pb-24 lg:overflow-y-auto">
              <p className="text-sm text-muted-foreground">{t.editor.filesHint}</p>
              {GROUPS.map((g) => {
                const items = TARGETS.filter((x) => x.group === g);
                const on = groups.has(g);
                return (
                  <section key={g} className={on ? "" : "opacity-50"}>
                    <div className="mb-2 flex items-baseline justify-between gap-3 border-b pb-2">
                      <h3 className="text-sm font-semibold">
                        {t.groups[g].label} <span className="font-normal text-muted-foreground">· {items.length}</span>
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Checkbox id={`grid-${g}`} checked={on} onCheckedChange={(v) => toggleGroup(g, v === true)} />
                        <label htmlFor={`grid-${g}`}>{t.pack.inPackage}</label>
                      </div>
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(124px,1fr))] gap-1">
                      {items.map((x) => (
                        <Tile key={x.id} target={x} src={source} s={deferred} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {/* Telefon: pobieranie przyklejone do dolu ekranu; pr-20 robi miejsce na badge. */}
          <div className="sticky bottom-0 z-10 border-t bg-card p-3 pr-20 sm:hidden [&>button]:w-full">{downloadButton}</div>
        </main>

        <aside aria-label={t.editor.look} className="hidden w-[320px] shrink-0 flex-col gap-4 overflow-y-auto border-l p-4 pb-24 xl:flex">
          <h2 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{t.editor.look}</h2>
          <div className="flex items-end justify-between rounded-xl bg-card p-4" title={t.editor.sizes}>
            {[16, 32, 48, 64].map((size) => (
              <div key={size} className="flex flex-col items-center gap-1.5">
                <IconCanvas size={size} src={source} settings={deferred} opts={HERO} />
                <span className="font-mono text-[10px] text-muted-foreground">{size}</span>
              </div>
            ))}
          </div>
          <Mockups src={source} s={deferred} className="grid grid-cols-1 gap-4" />
        </aside>
      </div>
    </div>
  );
}
