"use client";

import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FONT_DEFS, fontDef, fontWeight, previewFamily } from "@/lib/fonts";
import { SPACING_MAX, SPACING_MIN, type TextSpec } from "@/lib/source";
import { cn } from "@/lib/utils";
import { Slider, Toggle } from "./controls";
import { useT } from "./I18n";

let previewsLoaded = false;

/**
 * Kroje do probek "Ag" w siatce — te same pliki co do konturow, wiec przegladarka
 * bierze je z cache. Tylko zakres lacinski i tylko grubosc, ktora pokazujemy.
 */
function loadPreviewFonts() {
  if (previewsLoaded || typeof FontFace === "undefined") return;
  previewsLoaded = true;
  for (const def of FONT_DEFS) {
    const w = fontWeight(def.id, true);
    const face = new FontFace(previewFamily(def.id), `url(/fonts/${def.id}/latin-${w}.woff) format("woff")`, { weight: String(w) });
    document.fonts.add(face);
    face.load().catch(() => {});
  }
}

/** Ustawienia zrodla tekstowego — wspolne dla trybu prostego i zaawansowanego. */
export default function TextControls({
  spec,
  onChange,
  idPrefix,
}: {
  spec: TextSpec;
  onChange: (fn: (prev: TextSpec) => TextSpec) => void;
  idPrefix: string;
}) {
  const t = useT();
  useEffect(loadPreviewFonts, []);
  const hasBold = fontDef(spec.font).bold !== null;

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
          onChange={(e) => onChange((p) => ({ ...p, text: e.target.value }))}
        />
      </div>
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
