import { describe, expect, it } from "vitest";
import { snapAxis } from "./snap";

// Podglad 300 px, ikonka 180 px, margines 10% (30 px): poczatek = 120, srodek = 150, koniec = 180.
const SIZE = 300;
const LEN = 180;
const MARGIN = 10;

describe("snapAxis", () => {
  it("blisko srodka przykleja sie do srodka i zeruje przesuniecie", () => {
    expect(snapAxis(155, LEN, SIZE, MARGIN)).toEqual({ align: "center", offset: 0, guide: 150 });
  });

  it("blisko gory/lewej przykleja do poczatku, linia na marginesie", () => {
    expect(snapAxis(116, LEN, SIZE, MARGIN)).toEqual({ align: "start", offset: 0, guide: 30 });
  });

  it("blisko dolu/prawej przykleja do konca", () => {
    expect(snapAxis(184, LEN, SIZE, MARGIN)).toEqual({ align: "end", offset: 0, guide: 270 });
  });

  it("poza progiem pozycja swobodna liczona od srodka", () => {
    // 136 px: 14 px od srodka, 16 px od poczatku — oba poza progiem 9 px.
    expect(snapAxis(136, LEN, SIZE, MARGIN)).toEqual({ align: "center", offset: -4.5 });
  });

  it("wylaczone przyciaganie zawsze daje pozycje swobodna", () => {
    expect(snapAxis(150, LEN, SIZE, MARGIN, false)).toEqual({ align: "center", offset: 0 });
    expect(snapAxis(118, LEN, SIZE, MARGIN, false)).toEqual({ align: "center", offset: -10.5 });
  });

  it("przesuniecie przyciete do ±50%", () => {
    expect(snapAxis(-400, 20, SIZE, 0).offset).toBe(-50);
  });
});
