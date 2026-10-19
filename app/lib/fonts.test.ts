import { readFileSync } from "node:fs";
import { parse, type Font } from "opentype.js";
import { describe, expect, it } from "vitest";
import { FONT_DEFS, fontFiles, textToSvg, type FontId } from "./fonts";

const load = (id: FontId, bold = true): Font[] =>
  fontFiles(id, bold).map((url) => {
    const buf = readFileSync(new URL(`../public${url}`, import.meta.url));
    return parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  });

const viewBox = (svg: string) => svg.match(/viewBox="([^"]+)"/)![1].split(" ").map(Number);

describe("pliki czcionek", () => {
  it("kazdy krój ma zakres lacinski i rozszerzony w obu grubosciach", () => {
    for (const def of FONT_DEFS) {
      for (const bold of [false, true]) {
        const [latin, ext] = load(def.id, bold);
        expect(latin.hasChar("A"), def.id).toBe(true);
        expect(ext.hasChar("Ł"), def.id).toBe(true);
      }
    }
  });
});

describe("textToSvg", () => {
  it("sklada tekst w jedna sciezke z viewBox przycietym do konturow", () => {
    const svg = textToSvg(load("sans"), "AB")!;
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="[^"]+"><path d="M[^"]+" fill="#000000"\/><\/svg>$/);
    const [, , w, h] = viewBox(svg);
    expect(w).toBeGreaterThan(h);
    expect(h).toBeGreaterThan(500);
  });

  it("polskie znaki bierze z pliku latin-ext", () => {
    expect(textToSvg(load("serif"), "Łż")).not.toBeNull();
  });

  it("odstep liter poszerza wynik", () => {
    const fonts = load("sans");
    const [, , w0] = viewBox(textToSvg(fonts, "AB")!);
    const [, , w1] = viewBox(textToSvg(fonts, "AB", 30)!);
    expect(w1 - w0).toBeCloseTo(300, 0);
  });

  it("zwraca null, gdy znaku nie ma w czcionce albo nic nie widac", () => {
    expect(textToSvg(load("sans"), "漢")).toBeNull();
    expect(textToSvg(load("sans"), "   ")).toBeNull();
  });
});

describe("textToSvg ze stylami liter", () => {
  it("litery w roznych kolorach ida osobnymi sciezkami, sasiednie w tym samym kolorze — jedna", () => {
    const svg = textToSvg(load("sans"), "ABC", 0, [{ fill: "#FF0000" }, { fill: "#ff0000" }, { fill: "#00ff00" }])!;
    expect(svg.match(/<path /g)).toHaveLength(2);
    expect(svg).toContain('fill="#ff0000"');
    expect(svg).toContain('fill="#00ff00"');
  });

  it("niepoprawny kolor zamienia na czarny zamiast wstawiac go do SVG", () => {
    const svg = textToSvg(load("sans"), "A", 0, [{ fill: '"/><script>' }])!;
    expect(svg).toContain('fill="#000000"');
    expect(svg).not.toContain("script");
  });

  it("litera z innym zestawem plikow (grubosc) zmienia ksztalt", () => {
    const regular = load("sans", false);
    const bold = load("sans", true);
    const all = textToSvg(regular, "AB")!;
    const mixed = textToSvg(regular, "AB", 0, [undefined, { fonts: bold }])!;
    expect(mixed).not.toEqual(all);
    expect(viewBox(mixed)[2]).toBeGreaterThan(viewBox(all)[2]);
  });
});
