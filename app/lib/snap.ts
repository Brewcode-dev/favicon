import type { Align } from "./settings";

/** Prog przyciagania jako ulamek boku podgladu (3% — ok. 9 px przy 300 px). */
export const SNAP_RATIO = 0.03;

export interface AxisSnap {
  align: Align;
  /** Przesuniecie w procentach boku, krok 0,5 jak przy recznym przeciaganiu. */
  offset: number;
  /** Wspolrzedna linii pomocniczej w px (srodek albo krawedz przy marginesie); brak = bez przyciagniecia. */
  guide?: number;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * Jedna os przeciagania ikonki. `center` to srodek ikonki wynikajacy z ruchu
 * kursora, `len` jej dlugosc na tej osi, `size` bok podgladu, `margin` odstep
 * od krawedzi w procentach. Blisko punktu siatki wyrownania (poczatek, srodek,
 * koniec) ikonka sie do niego przykleja: wyrownanie przechodzi na ten punkt,
 * a przesuniecie wraca do zera. Poza progiem pozycja jest swobodna, liczona
 * od srodka.
 */
export function snapAxis(center: number, len: number, size: number, margin: number, enabled = true): AxisSnap {
  const m = (margin / 100) * size;
  const targets: { align: Align; at: number; guide: number }[] = [
    { align: "start", at: m + len / 2, guide: m },
    { align: "center", at: size / 2, guide: size / 2 },
    { align: "end", at: size - m - len / 2, guide: size - m },
  ];
  if (enabled) {
    const best = targets.reduce((a, b) => (Math.abs(center - b.at) < Math.abs(center - a.at) ? b : a));
    if (Math.abs(center - best.at) <= size * SNAP_RATIO) return { align: best.align, offset: 0, guide: best.guide };
  }
  const offset = clamp(Math.round(((center - size / 2) / size) * 200) / 2, -50, 50);
  return { align: "center", offset };
}
