import type { Font } from "opentype.js";

/**
 * Czcionki do zrodla "litera / emoji". Pliki WOFF (Google Fonts przez
 * Fontsource, licencja OFL) leza w public/fonts/<id>/ — osobno zakres
 * lacinski i lacinski rozszerzony, zeby polskie znaki tez byly wektorem.
 * Identyfikatory sans/serif/mono/rounded zostaly z poprzedniej wersji,
 * wiec stare zapisy i pliki projektu otwieraja sie bez zmian.
 */
export const FONT_DEFS = [
  { id: "sans", name: "Inter", bold: 700 },
  { id: "geometric", name: "Montserrat", bold: 700 },
  { id: "grotesk", name: "Space Grotesk", bold: 700 },
  { id: "rounded", name: "Nunito", bold: 800 },
  { id: "condensed", name: "Oswald", bold: 700 },
  { id: "serif", name: "Playfair Display", bold: 700 },
  { id: "slab", name: "Roboto Slab", bold: 700 },
  { id: "mono", name: "JetBrains Mono", bold: 700 },
  { id: "display", name: "Bebas Neue", bold: null },
  { id: "script", name: "Pacifico", bold: null },
] as const satisfies readonly { id: string; name: string; bold: number | null }[];

export type FontId = (typeof FONT_DEFS)[number]["id"];
export type FontDef = (typeof FONT_DEFS)[number];

export const FONTS: FontId[] = FONT_DEFS.map((f) => f.id);

export const fontDef = (id: string): FontDef => FONT_DEFS.find((f) => f.id === id) ?? FONT_DEFS[0];

export const isFontId = (id: unknown): id is FontId => FONT_DEFS.some((f) => f.id === id);

/** Waga pliku: pogrubienie tylko tam, gdzie krój ma druga grubosc. */
export const fontWeight = (id: FontId, bold: boolean) => {
  const def = fontDef(id);
  return bold && def.bold ? def.bold : 400;
};

/** Pliki danej grubosci — najpierw zakres lacinski, potem rozszerzony. */
export const fontFiles = (id: FontId, bold: boolean) => {
  const w = fontWeight(id, bold);
  return [`/fonts/${id}/latin-${w}.woff`, `/fonts/${id}/latin-ext-${w}.woff`];
};

/** Rodzina CSS do podgladu kroju w interfejsie (rejestrowana przez FontFace). */
export const previewFamily = (id: FontId) => `bf-${id}`;

const cache = new Map<string, Promise<Font>>();

/** Wczytanie i sparsowanie pliku czcionki; wynik trzymamy do konca sesji. */
export function loadFont(url: string): Promise<Font> {
  let p = cache.get(url);
  if (!p) {
    p = (async () => {
      const [{ parse }, res] = await Promise.all([import("opentype.js"), fetch(url)]);
      if (!res.ok) throw new Error(`font ${url}: ${res.status}`);
      return parse(await res.arrayBuffer());
    })();
    // Nieudane wczytanie nie zostaje w cache — nastepna proba sprobuje znowu.
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p;
}

export const loadFonts = (id: FontId, bold: boolean) => Promise.all(fontFiles(id, bold).map(loadFont));

/**
 * Tekst jako sciezka SVG. Kazdy znak bierzemy z pierwszego pliku, ktory go
 * ma; kerning tylko miedzy znakami z tego samego pliku. `spacing` to odstep
 * miedzy literami w procentach wysokosci kroju (jak `letter-spacing` w em).
 * Zwraca null, gdy ktoregos znaku nie ma w zadnym pliku albo nic nie widac —
 * wtedy zrodlo powstaje z rastra.
 */
export function textToSvg(fonts: Font[], text: string, spacing = 0): string | null {
  const SIZE = 1000;
  let x = 0;
  let d = "";
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  let prev: { font: Font; glyph: ReturnType<Font["charToGlyph"]> } | null = null;
  for (const ch of text) {
    const font = fonts.find((f) => f.hasChar(ch));
    if (!font) return null;
    const scale = SIZE / font.unitsPerEm;
    const glyph = font.charToGlyph(ch);
    if (prev && prev.font === font) x += font.getKerningValue(prev.glyph, glyph) * scale;
    const path = glyph.getPath(x, 0, SIZE);
    const box = path.getBoundingBox();
    if (Number.isFinite(box.x1) && box.x2 > box.x1) {
      d += path.toPathData(1);
      x0 = Math.min(x0, box.x1);
      y0 = Math.min(y0, box.y1);
      x1 = Math.max(x1, box.x2);
      y1 = Math.max(y1, box.y2);
    }
    x += (glyph.advanceWidth ?? 0) * scale + (spacing / 100) * SIZE;
    prev = { font, glyph };
  }
  if (!d || !(x1 > x0)) return null;
  const r = (v: number) => Math.round(v * 10) / 10;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r(x0)} ${r(y0)} ${r(x1 - x0)} ${r(y1 - y0)}"><path d="${d}" fill="#000000"/></svg>`;
}
