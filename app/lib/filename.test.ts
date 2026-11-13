import { describe, expect, it } from "vitest";
import { baseFileName, cleanFileName, slugify } from "./filename";

describe("nazwa plikow paczki", () => {
  it("wpisana nazwa wygrywa, bez rozszerzenia i znakow zakazanych", () => {
    expect(baseFileName({ fileName: "Sklep Kawa", appName: "x" })).toBe("Sklep Kawa");
    expect(cleanFileName("ikony.zip")).toBe("ikony");
    expect(cleanFileName("a/b:c?.json")).toBe("a-b-c-");
    expect(cleanFileName("  ..ukryty..  ")).toBe("ukryty");
  });

  it("pusta nazwa bierze slug z nazwy aplikacji", () => {
    expect(baseFileName({ fileName: "  ", appName: "Moja aplikacja" })).toBe("moja-aplikacja");
    expect(slugify("Żółta Łódź!")).toBe("zolta-lodz");
  });

  it("bez zadnej nazwy zostaje favicon", () => {
    expect(baseFileName({ fileName: "", appName: "!!!" })).toBe("favicon");
  });

  it("nazwa przycieta do 80 znakow", () => {
    expect(baseFileName({ fileName: "a".repeat(200), appName: "" })).toHaveLength(80);
  });
});
