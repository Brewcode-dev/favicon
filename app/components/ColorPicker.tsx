"use client";

import * as Popover from "@radix-ui/react-popover";
import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Hsv = { h: number; s: number; v: number };

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;
}

export function hexToHsv(hex: string): Hsv {
  const { r, g, b } = hexToRgb(hex);
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}

export function hsvToHex({ h, s, v }: Hsv): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

const isHex = (v: string) => /^#?[0-9a-f]{6}$/i.test(v.trim());
const normHex = (v: string) => `#${v.trim().replace(/^#/, "").toLowerCase()}`;

const BASICS = ["#000000", "#ffffff", "#ef4444", "#f97316", "#f6b900", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];

/** Przeciąganie wskaźnika po elemencie — zwraca pozycję 0–1 w obu osiach. */
function useDrag(onMove: (x: number, y: number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const handle = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    onMove(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)));
  };
  return {
    ref,
    onPointerDown: (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      handle(e);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (e.buttons & 1) handle(e);
    },
  };
}

type Props = {
  value: string;
  onChange: (hex: string) => void;
  /** Kolory dokumentu pokazywane jako szybki wybór. */
  swatches?: string[];
  children: ReactNode;
  label?: string;
  /** Strona, po ktorej otwiera sie okienko — panel ustawien jest po lewej, wiec domyslnie w prawo. */
  side?: "left" | "right" | "top" | "bottom";
};

export default function ColorPicker({ value, onChange, swatches = [], children, label, side = "right" }: Props) {
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value));
  const [text, setText] = useState(value);
  const [seen, setSeen] = useState(value);

  // Zmiana z zewnątrz (np. paleta) — synchronizacja w trakcie renderu, bez efektu.
  // Dla szarości zostawiamy dotychczasowy odcień, żeby suwak nie skakał na czerwień.
  if (seen !== value) {
    setSeen(value);
    setText(value);
    if (hsvToHex(hsv) !== value) {
      const next = hexToHsv(value);
      setHsv(next.s === 0 || next.v === 0 ? { ...next, h: hsv.h } : next);
    }
  }

  const commit = (next: Hsv) => {
    setHsv(next);
    const hex = hsvToHex(next);
    setText(hex);
    setSeen(hex);
    onChange(hex);
  };

  const sv = useDrag((x, y) => commit({ ...hsv, s: x, v: 1 - y }));
  const hue = useDrag((x) => commit({ ...hsv, h: Math.min(359.9, x * 360) }));
  const pure = hsvToHex({ h: hsv.h, s: 1, v: 1 });
  const docColors = [...new Set(swatches)].slice(0, 20);

  return (
    <Popover.Root>
      <Popover.Trigger asChild aria-label={label}>
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side={side}
          align="start"
          sideOffset={10}
          collisionPadding={12}
          className="z-50 w-60 space-y-3 rounded-xl border bg-popover p-3 text-popover-foreground shadow-2xl outline-none"
        >
          <div
            {...sv}
            className="relative h-36 w-full cursor-crosshair touch-none overflow-hidden rounded-lg"
            style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${pure})` }}
          >
            <span
              className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.5)]"
              style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: value }}
            />
          </div>
          <div
            {...hue}
            className="relative h-3 w-full cursor-pointer touch-none rounded-full"
            style={{ background: "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" }}
          >
            <span
              className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.5)]"
              style={{ left: `${(hsv.h / 360) * 100}%`, background: pure }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 shrink-0 rounded-md ring-1 ring-border" style={{ background: value }} />
            <input
              value={text}
              spellCheck={false}
              onChange={(e) => {
                setText(e.target.value);
                if (isHex(e.target.value)) {
                  const hex = normHex(e.target.value);
                  setHsv(hexToHsv(hex));
                  setSeen(hex);
                  onChange(hex);
                }
              }}
              onBlur={() => setText(value)}
              className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 font-mono text-xs uppercase outline-none focus:ring-1 focus:ring-ring"
              aria-label="HEX"
            />
          </div>
          {docColors.length > 0 && <SwatchRow colors={docColors} value={value} onPick={(c) => commit(hexToHsv(c))} />}
          <SwatchRow colors={BASICS} value={value} onPick={(c) => commit(hexToHsv(c))} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function SwatchRow({ colors, value, onPick }: { colors: string[]; value: string; onPick: (c: string) => void }) {
  return (
    <div className="grid grid-cols-10 gap-1">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          title={c}
          onClick={() => onPick(c)}
          className={cn(
            "aspect-square rounded ring-1 ring-border transition-transform hover:scale-110",
            c === value && "ring-2 ring-primary",
          )}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}
