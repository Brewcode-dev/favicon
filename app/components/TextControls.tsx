"use client";

import { Eraser } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FONT_DEFS, fontDef, fontWeight, previewFamily } from "@/lib/fonts";
import { hasEmoji, hasLetterColors, SPACING_MAX, SPACING_MIN, type LetterStyle, type TextSpec } from "@/lib/source";
import { cn } from "@/lib/utils";
import { CustomSwatch, Segmented, Slider, Swatch, Toggle } from "./controls";
import { useT } from "./I18n";

let previewsLoaded = false;

/** Szybkie kolory dla zaznaczonych liter. */
const LETTER_SWATCHES = ["#ffffff", "#121212", "#f6b900", "#2563eb"];
const CHECKER = "bg-[conic-gradient(#2c2c2c_25%,#232323_0_50%,#2c2c2c_0_75%,#232323_0)] bg-[length:10px_10px]";

/**
 * Kroje do probek "Ag" i kafelkow liter — te same pliki co do konturow, wiec
 * przegladarka bierze je z cache. Tylko zakres lacinski, obie grubosci.
 */
function loadPreviewFonts() {
  if (previewsLoaded || typeof FontFace === "undefined") return;
  previewsLoaded = true;
  for (const def of FONT_DEFS) {
    for (const bold of def.bold ? [false, true] : [false]) {
      const w = fontWeight(def.id, bold);
      const face = new FontFace(previewFamily(def.id), `url(/fonts/${def.id}/latin-${w}.woff) format("woff")`, { weight: String(w) });
      document.fonts.add(face);
      face.load().catch(() => {});
    }
  }
}

/** Pusty styl nie zostaje w tablicy; koncowe puste wpisy tez nie. */
function packStyles(styles: (LetterStyle | null)[]) {
  const out = styles.map((st) => (st && (st.color !== undefined || st.bold !== undefined) ? st : null));
  while (out.length && out[out.length - 1] === null) out.pop();
  return out.length ? out : undefined;
}

/** Ustawienia zrodla tekstowego. */
export default function TextControls({
  spec,
  onChange,
  idPrefix,
  baseColor,
  tileBg,
  palette,
}: {
  spec: TextSpec;
  onChange: (fn: (prev: TextSpec) => TextSpec) => void;
  idPrefix: string;
  /** Kolor ikonki z ustawien — litery bez wlasnego koloru wygladaja tak w kafelkach. */
  baseColor: string;
  /** Tlo kafelkow liter (kolor tla ikony); brak = szachownica. */
  tileBg?: string;
  palette: string[];
}) {
  const t = useT();
  useEffect(loadPreviewFonts, []);
  const hasBold = fontDef(spec.font).bold !== null;
  const chars = [...spec.text];
  const [picked, setPicked] = useState<Set<number>>(new Set());
  // Zaznaczenie poza dlugoscia tekstu (po skasowaniu liter) po prostu nie istnieje.
  const sel = [...picked].filter((i) => i < chars.length && chars[i].trim());
  const styleAt = (i: number) => spec.styles?.[i] ?? null;
  const emoji = hasEmoji(spec.text);

  const toggle = (i: number) =>
    setPicked((prev) => {
      const next = new Set([...prev].filter((j) => j < chars.length));
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  /** Zmiana stylu zaznaczonych liter; reszta tablicy bez zmian. */
  const restyle = (fn: (st: LetterStyle, i: number, prev: TextSpec) => LetterStyle, all = false) =>
    onChange((p) => {
      const list = [...p.text];
      const styles = list.map((_, i) => p.styles?.[i] ?? null);
      list.forEach((ch, i) => {
        if (!ch.trim() || (!all && !sel.includes(i))) return;
        styles[i] = fn({ ...(styles[i] ?? {}) }, i, p);
      });
      return { ...p, styles: packStyles(styles) };
    });

  const setColor = (color: string) =>
    restyle(
      (st, i, p) => {
        // Pierwszy kolor: pozostale litery dostaja dotychczasowy kolor ikonki,
        // bo od teraz tekst niesie kolory sam (przebarwienie sie wylacza).
        if (sel.includes(i)) return { ...st, color };
        return hasLetterColors(p) || st.color ? st : { ...st, color: baseColor };
      },
      true,
    );
  const setBold = (bold: boolean) =>
    restyle((st, _i, p) => {
      const next: LetterStyle = { ...st, bold };
      if (bold === p.bold) delete next.bold;
      return next;
    });
  const clear = () => restyle(() => ({}));

  const selStyles = sel.map(styleAt);
  const allColor = (c: string) => sel.length > 0 && selStyles.every((st) => st?.color === c);
  const selBold = sel.length > 0 && selStyles.every((st) => st?.bold ?? spec.bold);
  const selRegular = sel.length > 0 && selStyles.every((st) => !(st?.bold ?? spec.bold));
  const customColor = selStyles[0]?.color;

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-text`} className="font-normal">
          {t.source.text}
        </Label>
        <Input
          id={`${idPrefix}-text`}
          value={spec.text}
          maxLength={8}
          placeholder={t.source.textPlaceholder}
          onChange={(e) => {
            const text = e.target.value;
            const len = [...text].length;
            onChange((p) => ({ ...p, text, styles: p.styles ? packStyles(p.styles.slice(0, len)) : undefined }));
          }}
        />
      </div>

      {chars.some((c) => c.trim()) && (
        <div className="space-y-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm">{t.source.letters}</span>
            {!emoji && (
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => setPicked(sel.length === chars.filter((c) => c.trim()).length ? new Set() : new Set(chars.map((_, i) => i)))}
              >
                {sel.length === chars.filter((c) => c.trim()).length ? t.source.lettersNone : t.source.lettersAll}
              </button>
            )}
          </div>
          {emoji ? (
            <p className="text-xs text-muted-foreground">{t.source.lettersEmoji}</p>
          ) : (
            <>
              <div role="group" aria-label={t.source.letters} className="flex flex-wrap gap-1.5">
                {chars.map((ch, i) => {
                  if (!ch.trim()) return <span key={i} className="w-3" />;
                  const st = styleAt(i);
                  const on = sel.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      aria-pressed={on}
                      aria-label={t.source.letterLabel(ch)}
                      onClick={() => toggle(i)}
                      className={cn(
                        "flex h-11 min-w-11 items-center justify-center rounded-lg px-2 text-2xl ring-1 ring-border ring-inset transition-shadow",
                        !tileBg && CHECKER,
                        on ? "ring-2 ring-foreground ring-offset-2 ring-offset-card" : "hover:ring-muted-foreground/60",
                      )}
                      style={{
                        background: tileBg,
                        color: st?.color ?? baseColor,
                        fontFamily: `${previewFamily(spec.font)}, system-ui`,
                        fontWeight: fontWeight(spec.font, st?.bold ?? spec.bold),
                      }}
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
              {sel.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t.source.lettersHint}</p>
              ) : (
                <div className="space-y-3 rounded-lg border bg-background/40 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-1 text-xs text-muted-foreground">{t.source.letterColor}</span>
                    {LETTER_SWATCHES.map((c) => (
                      <Swatch key={c} color={c} label={c} active={allColor(c)} onClick={() => setColor(c)} />
                    ))}
                    <CustomSwatch
                      value={customColor ?? baseColor}
                      active={!!customColor && allColor(customColor) && !LETTER_SWATCHES.includes(customColor)}
                      label={t.editor.custom}
                      palette={palette}
                      onChange={setColor}
                    />
                  </div>
                  {hasBold && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground">{t.source.letterWeight}</span>
                      <Segmented<string>
                        value={selBold ? "bold" : selRegular ? "regular" : ""}
                        onChange={(v) => setBold(v === "bold")}
                        options={[
                          { value: "regular", label: <span className="text-xs font-normal">{t.source.weightRegular}</span> },
                          { value: "bold", label: <span className="text-xs font-bold">{t.source.weightBold}</span> },
                        ]}
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={clear}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Eraser className="h-3.5 w-3.5" />
                    {t.source.clearStyle}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div role="radiogroup" aria-label={t.source.font} className="grid grid-cols-[repeat(auto-fill,minmax(56px,1fr))] gap-1.5">
        {FONT_DEFS.map((def) => {
          const on = spec.font === def.id;
          return (
            <button
              key={def.id}
              type="button"
              role="radio"
              aria-checked={on}
              title={def.name}
              onClick={() => onChange((p) => ({ ...p, font: def.id }))}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg border px-1 pt-1.5 pb-1 transition-colors",
                on ? "border-primary bg-secondary text-foreground" : "text-foreground/80 hover:border-muted-foreground/60",
              )}
            >
              <span className="text-xl leading-7" style={{ fontFamily: `${previewFamily(def.id)}, system-ui`, fontWeight: fontWeight(def.id, true) }}>
                Ag
              </span>
              <span className="w-full truncate text-center text-[10px] text-muted-foreground">{def.name}</span>
            </button>
          );
        })}
      </div>
      <Toggle
        label={t.source.bold}
        hint={hasBold ? undefined : t.source.singleWeight}
        checked={hasBold && spec.bold}
        onChange={(bold) => hasBold && onChange((p) => ({ ...p, bold }))}
      />
      <Slider
        label={t.source.spacing}
        value={spec.spacing ?? 0}
        min={SPACING_MIN}
        max={SPACING_MAX}
        unit="%"
        onChange={(spacing) => onChange((p) => ({ ...p, spacing }))}
      />
    </>
  );
}
