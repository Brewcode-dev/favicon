"use client";

import { useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { iconBox } from "@/lib/render";
import type { Settings } from "@/lib/settings";
import { snapAxis } from "@/lib/snap";
import type { IconSource } from "@/lib/source";
import { cn } from "@/lib/utils";
import { useT } from "./I18n";

type Patch = (fn: (prev: Settings) => Partial<Settings>) => void;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const SCALE_MIN = 0.1;
const SCALE_MAX = 1.5;

/**
 * Prog przeciagania w px. Klikniecie, ktore tylko zaznacza ikonke, zwykle
 * drgnie o piksel — bez progu dawalo to przesuniecie 0,5% i ikonka po cichu
 * schodzila ze srodka.
 */
const DRAG_THRESHOLD = 4;

/** Obrot do zakresu -180..180, jak suwak w sidebarze. */
const normDeg = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

type Drag =
  | { kind: "move"; x: number; y: number; cx0: number; cy0: number; moved: boolean }
  | { kind: "scale"; cx: number; cy: number; d0: number; s0: number }
  | { kind: "rotate"; cx: number; cy: number };

/**
 * Ramka przeksztalcen nad duzym podgladem, jak w edytorze grafiki:
 * przeciaganie srodka przesuwa, narozniki skaluja (rowno, od srodka),
 * uchwyt nad ramka obraca (z Shiftem co 15°). Przy przesuwaniu ikonka
 * przykleja sie do punktow siatki wyrownania (Alt wylacza) i pokazuje linie.
 *
 * `size` to bok podgladu w pikselach CSS — geometria ramki liczona jest tym
 * samym `iconBox`, ktorym renderer rysuje ikonke, wiec ramka trzyma sie
 * dokladnie jej obrysu takze przy wyrownaniu do krawedzi.
 */
export default function TransformOverlay({
  size,
  src,
  s,
  selected,
  onSelect,
  patch,
}: {
  size: number;
  src: IconSource;
  s: Settings;
  selected: boolean;
  onSelect: () => void;
  patch: Patch;
}) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  // Linie pomocnicze przyciagania (px w ukladzie podgladu), tylko w trakcie przesuwania.
  const [guides, setGuides] = useState<{ x?: number; y?: number } | null>(null);
  const { w, h, cx, cy } = iconBox(src, s, size, 1);

  const center = () => {
    const r = root.current!.getBoundingClientRect();
    return { x: r.left + cx, y: r.top + cy };
  };

  const start = (e: RPointerEvent<HTMLElement>, kind: Drag["kind"]) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    const c = center();
    if (kind === "move") drag.current = { kind, x: e.clientX, y: e.clientY, cx0: cx, cy0: cy, moved: false };
    else if (kind === "scale")
      drag.current = { kind, cx: c.x, cy: c.y, d0: Math.max(1, Math.hypot(e.clientX - c.x, e.clientY - c.y)), s0: s.scale };
    else drag.current = { kind, cx: c.x, cy: c.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const move = (e: RPointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    if (d.kind === "move") {
      if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < DRAG_THRESHOLD) return;
      d.moved = true;
      const snap = !e.altKey;
      const ax = snapAxis(d.cx0 + e.clientX - d.x, w, size, s.margin, snap);
      const ay = snapAxis(d.cy0 + e.clientY - d.y, h, size, s.margin, snap);
      setGuides({ x: ax.guide, y: ay.guide });
      patch(() => ({ alignX: ax.align, offsetX: ax.offset, alignY: ay.align, offsetY: ay.offset }));
    } else if (d.kind === "scale") {
      const dist = Math.hypot(e.clientX - d.cx, e.clientY - d.cy);
      patch(() => ({ scale: clamp(Math.round(d.s0 * (dist / d.d0) * 100) / 100, SCALE_MIN, SCALE_MAX) }));
    } else {
      // Uchwyt siedzi nad ramka (lokalnie wektor (0,-1)). Odbicie jest
      // nakladane po obrocie, wiec kierunek kursora najpierw "odbijamy"
      // z powrotem, a dopiero potem liczymy kat jak dla (sin θ, -cos θ).
      const vx = (e.clientX - d.cx) * (s.flipX ? -1 : 1);
      const vy = (e.clientY - d.cy) * (s.flipY ? -1 : 1);
      let deg = (Math.atan2(vx, -vy) * 180) / Math.PI;
      deg = e.shiftKey ? Math.round(deg / 15) * 15 : Math.round(deg);
      patch(() => ({ rotation: normDeg(deg) }));
    }
  };

  const end = () => {
    drag.current = null;
    setGuides(null);
  };

  const handlers = { onPointerMove: move, onPointerUp: end, onPointerCancel: end };
  const corner = "absolute h-3 w-3 rounded-[2px] border-[1.5px] border-selection bg-white shadow";

  return (
    <div ref={root} className="pointer-events-none absolute inset-0">
      {guides?.x !== undefined && (
        <span className="absolute -top-6 -bottom-6 w-[1.5px] bg-pink-500" style={{ left: guides.x - 0.75 }} />
      )}
      {guides?.y !== undefined && (
        <span className="absolute -right-6 -left-6 h-[1.5px] bg-pink-500" style={{ top: guides.y - 0.75 }} />
      )}
      <div
        className="pointer-events-none absolute"
        style={{
          left: cx - w / 2,
          top: cy - h / 2,
          width: w,
          height: h,
          // Ta sama kolejnosc co w rendererze: odbicie, potem obrot.
          transform: `scale(${s.flipX ? -1 : 1}, ${s.flipY ? -1 : 1}) rotate(${s.rotation}deg)`,
        }}
      >
        {/* Obszar ikonki: klik zaznacza, przeciaganie przesuwa. */}
        <div
          role="button"
          tabIndex={-1}
          aria-label={t.overlay.icon}
          className={cn(
            "pointer-events-auto absolute inset-0 touch-none rounded-sm",
            selected
              ? "cursor-move outline-1 outline-selection"
              : "cursor-pointer hover:outline-1 hover:outline-dashed hover:outline-selection/80",
          )}
          onPointerDown={(e) => start(e, "move")}
          {...handlers}
        />
        {selected && (
          <>
            {(
              [
                ["-left-1.5 -top-1.5", "cursor-nwse-resize"],
                ["-right-1.5 -top-1.5", "cursor-nesw-resize"],
                ["-left-1.5 -bottom-1.5", "cursor-nesw-resize"],
                ["-right-1.5 -bottom-1.5", "cursor-nwse-resize"],
              ] as const
            ).map(([pos, cur]) => (
              <span
                key={pos}
                aria-label={t.overlay.scale}
                className={cn(corner, pos, cur, "pointer-events-auto touch-none")}
                onPointerDown={(e) => start(e, "scale")}
                {...handlers}
              />
            ))}
            <span className="absolute -top-7 left-1/2 h-5 w-px -translate-x-1/2 bg-selection" />
            <span
              aria-label={t.overlay.rotate}
              title={t.overlay.rotateTitle}
              className="pointer-events-auto absolute -top-9 left-1/2 h-4 w-4 -translate-x-1/2 cursor-grab touch-none rounded-full border-[1.5px] border-selection bg-white shadow active:cursor-grabbing"
              onPointerDown={(e) => start(e, "rotate")}
              {...handlers}
            />
          </>
        )}
      </div>
    </div>
  );
}
