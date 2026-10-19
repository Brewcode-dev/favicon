import { describe, expect, it } from "vitest";
import { hasLetterColors, normalizeTextSpec, type TextSpec } from "./source";

const base: TextSpec = { text: "AB", font: "sans", bold: true };

describe("normalizeTextSpec — style liter", () => {
  it("zostawia poprawne kolory (malymi literami) i grubosc", () => {
    const spec = normalizeTextSpec({ ...base, styles: [{ color: "#FFAA00" }, { bold: false }] });
    expect(spec.styles).toEqual([{ color: "#ffaa00" }, { bold: false }]);
  });

  it("odrzuca smieci i puste wpisy na koncu", () => {
    const raw = { ...base, styles: [{ color: "red" }, null, { bold: "tak" }, {}] } as unknown as TextSpec;
    expect(normalizeTextSpec(raw).styles).toBeUndefined();
  });

  it("stare zapisy bez stylow zostaja bez pola styles", () => {
    expect(normalizeTextSpec(base)).not.toHaveProperty("styles");
  });

  it("hasLetterColors patrzy tylko na kolory, nie na grubosc", () => {
    expect(hasLetterColors({ ...base, styles: [{ bold: false }] })).toBe(false);
    expect(hasLetterColors({ ...base, styles: [null, { color: "#000000" }] })).toBe(true);
  });
});
