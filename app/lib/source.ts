import { fontDef, isFontId, loadFonts, textToSvg, type FontId } from "./fonts";
import { AppError } from "./i18n";

export type { FontId } from "./fonts";
export { FONTS } from "./fonts";

export interface TextSpec {
  text: string;
  font: FontId;
  bold: boolean;
  /** Odstep miedzy literami w procentach wysokosci kroju; brak = 0 (zapisy sprzed tej opcji). */
  spacing?: number;
}

/** Spec z localStorage albo pliku projektu: nieznana czcionka → domyslna, odstep w zakresie. */
export function normalizeTextSpec(raw: TextSpec): TextSpec {
  const spacing = Number(raw.spacing);
  return {
    text: typeof raw.text === "string" ? raw.text : "",
    font: isFontId(raw.font) ? raw.font : "sans",
    bold: raw.bold !== false,
    spacing: Number.isFinite(spacing) ? Math.min(SPACING_MAX, Math.max(SPACING_MIN, spacing)) : 0,
  };
}

export const SPACING_MIN = -20;
export const SPACING_MAX = 50;

export interface IconSource {
  kind: "svg" | "png";
  name: string;
  /** Dla SVG: znormalizowany tekst dokumentu. Dla rastra: data URL. */
  data: string;
  image: HTMLImageElement;
  width: number;
  height: number;
  /** Zrodlo wygenerowane z litery / emoji — trzymamy parametry do dalszej edycji. */
  text?: TextSpec;
  /** Ikona z biblioteki Lucide — nazwa komponentu (np. "Coffee"), do zaznaczenia w wyborze. */
  lucide?: string;
}

/* ─────────────────────────── sanityzacja SVG ─────────────────────────── */

/** Elementy, ktore moga wykonac kod albo osadzic obca tresc. */
const FORBIDDEN = new Set(["script", "foreignobject", "iframe", "object", "embed", "audio", "video", "handler", "listener"]);
/** Bezpieczne odwolania: wewnatrz dokumentu albo obraz osadzony w data URL. */
const SAFE_HREF = /^\s*(#|data:image\/(png|jpe?g|gif|webp|svg\+xml)[;,])/i;

/**
 * Czysci wgrane SVG, zanim trafi do podgladu i do favicon.svg w paczce:
 * usuwa skrypty, foreignObject i podobne, handlery `on*`, linki `javascript:`
 * i odwolania do zewnetrznych zasobow (takze `@import`/`url()` w <style>).
 * Przegladarka i tak nie wykonuje skryptow w favicon, ale paczka trafia
 * do cudzych projektow i nie powinna nic takiego przenosic.
 */
export function sanitizeSvg(root: Element) {
  for (const el of [...root.querySelectorAll("*")]) {
    if (FORBIDDEN.has(el.localName.toLowerCase())) {
      el.remove();
      continue;
    }
  }
  for (const el of [root, ...root.querySelectorAll("*")]) {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on")) el.removeAttribute(attr.name);
      else if ((name === "href" || name === "xlink:href") && !SAFE_HREF.test(attr.value)) el.removeAttribute(attr.name);
      else if (name === "style" || ["fill", "stroke", "filter", "clip-path", "mask"].includes(name)) {
        const v = stripExternalUrls(attr.value);
        if (v !== attr.value) el.setAttribute(attr.name, v);
      }
    }
    if (el.localName.toLowerCase() === "style" && el.textContent) {
      el.textContent = stripExternalUrls(el.textContent.replace(/@import[^;]*;?/gi, ""));
    }
  }
}

function stripExternalUrls(css: string) {
  return css.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (m, _q, url: string) =>
    url.startsWith("#") || /^data:image\//i.test(url) ? m : "none",
  );
}

/**
 * SVG bez atrybutow width/height ma w czesci przegladarek naturalny rozmiar 0
 * i rysuje sie w canvasie jako nic. Uzupelniamy je z viewBox (i odwrotnie),
 * zeby obraz zawsze mial proporcje i dal sie wektorowo przeskalowac.
 */
function normalizeSvg(text: string): { svg: string; width: number; height: number } {
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const root = doc.documentElement;
  if (root.nodeName.toLowerCase() !== "svg" || doc.getElementsByTagName("parsererror").length) {
    throw new AppError("notSvg");
  }
  sanitizeSvg(root);
  const num = (v: string | null) => {
    if (!v || v.trim().endsWith("%")) return NaN;
    return parseFloat(v);
  };
  let w = num(root.getAttribute("width"));
  let h = num(root.getAttribute("height"));
  const vb = root.getAttribute("viewBox")?.trim().split(/[\s,]+/).map(Number);
  if (vb && vb.length === 4 && vb.every((n) => Number.isFinite(n))) {
    if (!Number.isFinite(w) || !Number.isFinite(h)) {
      w = vb[2];
      h = vb[3];
    }
  } else {
    if (!Number.isFinite(w) || !Number.isFinite(h)) {
      w = 512;
      h = 512;
    }
    root.setAttribute("viewBox", `0 0 ${w} ${h}`);
  }
  root.setAttribute("width", String(w));
  root.setAttribute("height", String(h));
  if (!root.getAttribute("xmlns")) root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return { svg: new XMLSerializer().serializeToString(root), width: w, height: h };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new AppError("imageLoad"));
    img.src = src;
  });
}

export function svgToDataUrl(svg: string): string {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

export async function sourceFromSvgText(text: string, name: string): Promise<IconSource> {
  const { svg, width, height } = normalizeSvg(text);
  const image = await loadImage(svgToDataUrl(svg));
  return { kind: "svg", name, data: svg, image, width, height };
}

export async function sourceFromDataUrl(dataUrl: string, name: string): Promise<IconSource> {
  const image = await loadImage(dataUrl);
  return {
    kind: "png",
    name,
    data: dataUrl,
    image,
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
}

export async function sourceFromFile(file: File): Promise<IconSource> {
  const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
  if (isSvg) return sourceFromSvgText(await file.text(), file.name);
  if (!file.type.startsWith("image/")) throw new AppError("unsupportedFormat");
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
  return sourceFromDataUrl(dataUrl, file.name);
}

/* ─────────────────────────── przyciecie do zawartosci ─────────────────────────── */

/** Prostokat w pikselach rastra: [x0, y0, x1, y1] wlacznie. */
type Bounds = [number, number, number, number];

/** Zakres pikseli z alfa > 8; null, gdy obraz jest pusty. */
export function inkBounds(data: Uint8ClampedArray, w: number, h: number): Bounds | null {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : [x0, y0, x1, y1];
}

/**
 * Nowy viewBox obejmujacy tylko zamalowane piksele rastra cw×ch, ktory
 * odwzorowuje caly stary viewBox. Brzeg o pol piksela rastra w kazda strone,
 * zeby antyaliasing krawedzi nie zostal uciety.
 */
export function cropViewBox(vb: [number, number, number, number], b: Bounds, cw: number, ch: number): [number, number, number, number] {
  const [vx, vy, vw, vh] = vb;
  const kx = vw / cw;
  const ky = vh / ch;
  const x0 = Math.max(vx, vx + (b[0] - 0.5) * kx);
  const y0 = Math.max(vy, vy + (b[1] - 0.5) * ky);
  const x1 = Math.min(vx + vw, vx + (b[2] + 1.5) * kx);
  const y1 = Math.min(vy + vh, vy + (b[3] + 1.5) * ky);
  const r = (v: number) => Math.round(v * 1000) / 1000;
  return [r(x0), r(y0), r(x1 - x0), r(y1 - y0)];
}

/**
 * Zrodlo przyciete do faktycznie zamalowanej zawartosci — pusty margines pliku
 * nie przesuwa wtedy srodka ikonki. SVG zostaje wektorem (zmienia sie tylko
 * viewBox), raster jest wycinany w oryginalnej rozdzielczosci. Zrodlo bez
 * marginesu (albo puste) wraca bez zmian.
 */
export async function trimSource(src: IconSource): Promise<IconSource> {
  const S = 1024;
  const k = S / Math.max(src.width, src.height);
  const cw = Math.max(1, Math.round(src.width * k));
  const ch = Math.max(1, Math.round(src.height * k));
  const c = document.createElement("canvas");
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(src.image, 0, 0, cw, ch);
  const b = inkBounds(ctx.getImageData(0, 0, cw, ch).data, cw, ch);
  // Margines ponizej ~2 px rastra nie ma znaczenia — szkoda nowego obrazu.
  if (!b || (b[0] <= 2 && b[1] <= 2 && b[2] >= cw - 3 && b[3] >= ch - 3)) return src;
  const extra = { text: src.text, lucide: src.lucide };

  if (src.kind === "svg") {
    const doc = new DOMParser().parseFromString(src.data, "image/svg+xml");
    const root = doc.documentElement;
    const vb = root.getAttribute("viewBox")?.trim().split(/[\s,]+/).map(Number);
    if (!vb || vb.length !== 4 || !vb.every(Number.isFinite)) return src;
    // Inne proporcje viewBox niz width/height to letterbox — mapowanie pikseli byloby przesuniete.
    if (Math.abs(vb[2] / vb[3] - src.width / src.height) > 0.01) return src;
    const nv = cropViewBox(vb as [number, number, number, number], b, cw, ch);
    root.setAttribute("viewBox", nv.join(" "));
    root.setAttribute("width", String(nv[2]));
    root.setAttribute("height", String(nv[3]));
    const out = await sourceFromSvgText(new XMLSerializer().serializeToString(root), src.name);
    return { ...out, ...extra };
  }

  // Raster: granice z podgladu przeliczamy na piksele oryginalu.
  const sx = src.width / cw;
  const sy = src.height / ch;
  const x0 = Math.max(0, Math.floor((b[0] - 1) * sx));
  const y0 = Math.max(0, Math.floor((b[1] - 1) * sy));
  const x1 = Math.min(src.width, Math.ceil((b[2] + 2) * sx));
  const y1 = Math.min(src.height, Math.ceil((b[3] + 2) * sy));
  const out = document.createElement("canvas");
  out.width = x1 - x0;
  out.height = y1 - y0;
  out.getContext("2d")!.drawImage(src.image, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return { ...(await sourceFromDataUrl(out.toDataURL("image/png"), src.name)), ...extra };
}

export const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>`;

/* ─────────────────────────── Lucide ─────────────────────────── */

/**
 * Ikona Lucide wyrenderowana przez lucide-react jako <svg> w DOM. Komponenty
 * nie udostepniaja danych sciezek, wiec bierzemy gotowy element: zdejmujemy
 * klasy i atrybuty dostepnosci, a `currentColor` zamieniamy na czern —
 * w <img> nie ma koloru tekstu, a barwe i tak nadaje przebarwienie.
 */
export function lucideSvgText(svg: SVGElement): string {
  const el = svg.cloneNode(true) as SVGElement;
  for (const attr of ["class", "aria-hidden", "focusable", "style"]) el.removeAttribute(attr);
  for (const node of [el, ...el.querySelectorAll("*")]) {
    for (const attr of ["stroke", "fill"]) {
      if (node.getAttribute(attr) === "currentColor") node.setAttribute(attr, "#000000");
    }
  }
  el.setAttribute("width", "24");
  el.setAttribute("height", "24");
  el.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return new XMLSerializer().serializeToString(el);
}

export async function sourceFromLucide(svg: SVGElement, name: string): Promise<IconSource> {
  const src = await sourceFromSvgText(lucideSvgText(svg), `${name}.svg`);
  return { ...src, lucide: name };
}

/* ─────────────────────────── litera / emoji ─────────────────────────── */

/** Krój systemowy dla rastra (emoji, znaki spoza plikow) — najblizszy rodzaj wybranej czcionki. */
function fallbackFamily(id: FontId) {
  switch (id) {
    case "serif":
    case "slab":
      return 'Georgia, "Times New Roman", serif';
    case "mono":
      return "ui-monospace, monospace";
    case "script":
      return "cursive";
    default:
      return "system-ui, sans-serif";
  }
}

export const hasEmoji = (text: string) => /\p{Extended_Pictographic}/u.test(text);

/**
 * Litera albo emoji jako zrodlo. Litery skladamy z konturow czcionki w SVG,
 * wiec favicon.svg zostaje wektorem i jest ostry w kazdym rozmiarze. Emoji
 * (kolorowe glify) i znaki, ktorych nie ma w plikach, rysujemy jak dotad
 * na canvasie. Tekst jest czarny — kolor nadaje przebarwienie.
 */
export async function sourceFromText(spec: TextSpec): Promise<IconSource> {
  const norm = normalizeTextSpec(spec);
  const text = norm.text.trim() || "A";
  const out = { ...norm, text };
  const name = `Tekst „${text}”`;
  if (!hasEmoji(text)) {
    try {
      const svg = textToSvg(await loadFonts(norm.font, norm.bold), text, norm.spacing);
      if (svg) return { ...(await sourceFromSvgText(svg, name)), text: out };
    } catch {
      // Brak sieci albo uszkodzony plik — zostaje raster z kroju systemowego.
    }
  }
  return { ...(await rasterText(text, norm)), name, text: out };
}

/**
 * Raster: rysujemy na duzym canvasie i przycinamy do faktycznie zamalowanych
 * pikseli, zeby wyrownanie i rozmiar dzialaly tak samo jak dla wgranego pliku.
 * 1024 px wystarcza na najwiekszy cel (1024).
 */
async function rasterText(text: string, spec: TextSpec): Promise<IconSource> {
  const family = fallbackFamily(spec.font);
  const weight = spec.bold && fontDef(spec.font).bold ? 700 : 400;
  const S = 1024;
  const font = `${weight} ${S * 0.7}px ${family}`;
  try {
    await document.fonts.load(font, text);
  } catch {}
  const c = document.createElement("canvas");
  c.width = S * 2;
  c.height = S;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#000000";
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${((spec.spacing ?? 0) / 100) * S * 0.7}px`;
  // Dluzszy tekst zmniejszamy tak, zeby zmiescil sie w szerokosci plotna.
  const width = ctx.measureText(text).width;
  if (width > c.width * 0.9) ctx.font = `${weight} ${S * 0.7 * ((c.width * 0.9) / width)}px ${family}`;
  ctx.fillText(text, c.width / 2, S / 2);

  const ink = inkBounds(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
  if (!ink) throw new AppError("noGlyph");
  const [x0, y0, x1, y1] = ink;
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  // Wynik skalujemy tak, by dluzszy bok mial 1024 px.
  const k = S / Math.max(w, h);
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(w * k));
  out.height = Math.max(1, Math.round(h * k));
  const octx = out.getContext("2d")!;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(c, x0, y0, w, h, 0, 0, out.width, out.height);
  return sourceFromDataUrl(out.toDataURL("image/png"), text);
}
