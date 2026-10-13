"use client";

import { Plus } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import ColorPicker from "@/components/ColorPicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider as UiSlider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="border-b px-5 py-4 last:border-b-0">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{title}</h2>
        {aside}
      </div>
      <div className="space-y-3.5">{children}</div>
    </section>
  );
}

/**
 * Pole do wpisania wartosci z palca. Szkic trzymany lokalnie, zeby dalo sie
 * wpisac np. "1" w drodze do "12" bez natychmiastowego przycinania do min.
 * Kazda poprawna liczba w zakresie idzie od razu; Enter/blur przycina reszte.
 * Strzalki gora/dol zmieniaja o 1 (z Shiftem o 10).
 */
function NumberInput({
  id,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  id: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setDraft(String(value));
  }
  const parse = (v: string) => (v.trim() === "" ? NaN : Number(v.replace(",", ".")));
  const commit = () => {
    const n = parse(draft);
    const clamped = Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : value;
    setDraft(String(clamped));
    setSynced(clamped);
    if (clamped !== value) onChange(clamped);
  };
  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      value={draft}
      disabled={disabled}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = parse(e.target.value);
        if (Number.isFinite(n) && n >= min && n <= max) {
          setSynced(n);
          onChange(n);
        }
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          onChange(Math.min(max, Math.max(min, value + (e.key === "ArrowUp" ? step : -step))));
        }
      }}
      className="h-7 w-16 px-2 text-right text-xs tabular-nums"
    />
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className={cn("space-y-2", disabled && "opacity-50")}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="font-normal">
          {label}
        </Label>
        <span className="flex items-center gap-1 text-muted-foreground">
          <NumberInput id={id} value={value} min={min} max={max} disabled={disabled} onChange={onChange} />
          <span className="w-3 text-xs">{unit}</span>
        </span>
      </div>
      <UiSlider
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={label}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}

function HexInput({
  value,
  onChange,
  disabled,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  label: string;
}) {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  // Zmiana z zewnatrz (pipeta, reset) nadpisuje szkic; wlasne wpisywanie nie.
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
  }
  return (
    <Input
      type="text"
      value={draft}
      disabled={disabled}
      spellCheck={false}
      aria-label={`${label} (hex)`}
      onChange={(e) => {
        const v = e.target.value.trim();
        setDraft(v);
        if (/^#[0-9a-f]{6}$/i.test(v)) {
          setSynced(v.toLowerCase());
          onChange(v.toLowerCase());
        }
      }}
      onBlur={() => setDraft(value)}
      className="h-7 w-20 px-2 font-mono text-xs uppercase"
    />
  );
}

export function ColorField({
  label,
  value,
  onChange,
  disabled,
  swatches,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  /** Kolory projektu do szybkiego wyboru w okienku. */
  swatches?: string[];
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", disabled && "opacity-50")}>
      <span className="text-sm">{label}</span>
      <span className="flex items-center gap-2">
        <HexInput value={value} onChange={onChange} disabled={disabled} label={label} />
        <ColorPicker value={value} onChange={onChange} swatches={swatches} label={label}>
          <button
            type="button"
            disabled={disabled}
            title={label}
            className="h-7 w-7 rounded-md ring-1 ring-border ring-inset transition-transform hover:scale-110 disabled:pointer-events-none data-[state=open]:ring-2 data-[state=open]:ring-primary"
            style={{ background: value }}
          />
        </ColorPicker>
      </span>
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-3">
      <label htmlFor={id} className="text-sm">
        {label}
        {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function Swatch({
  color,
  active,
  label,
  onClick,
  className,
}: {
  color: string;
  active: boolean;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-8 w-8 rounded-lg ring-1 ring-border ring-inset transition-transform hover:scale-110",
        active && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
        className,
      )}
      style={{ background: color }}
    />
  );
}

/** Wlasny kolor: kafelek "+" otwierajacy pelny picker. */
export function CustomSwatch({
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
        aria-label={label}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-transform hover:scale-110",
          active ? "ring-2 ring-foreground ring-offset-2 ring-offset-card" : "border border-dashed border-muted-foreground/60",
        )}
        style={active ? { background: value } : undefined}
      >
        {!active && <Plus className="h-4 w-4" />}
      </button>
    </ColorPicker>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      // Radix oddaje "" przy odkliknieciu aktywnej opcji — wybor ma zostac.
      onValueChange={(v) => v && onChange(v as T)}
      className={className}
    >
      {options.map((o) => (
        <ToggleGroupItem key={o.value} value={o.value}>
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
