import { describe, expect, it } from "vitest";
import { cropViewBox, inkBounds } from "./source";

/** Raster w×h z zamalowanym prostokatem [x0, y0, x1, y1] (wlacznie). */
function raster(w: number, h: number, box: [number, number, number, number] | null) {
  const data = new Uint8ClampedArray(w * h * 4);
  if (box) {
    for (let y = box[1]; y <= box[3]; y++) for (let x = box[0]; x <= box[2]; x++) data[(y * w + x) * 4 + 3] = 255;
  }
  return data;
}

describe("inkBounds", () => {
  it("znajduje zamalowany prostokat", () => {
    expect(inkBounds(raster(10, 8, [2, 1, 6, 5]), 10, 8)).toEqual([2, 1, 6, 5]);
  });

  it("pusty obraz to null, a ledwo widoczne piksele sie nie licza", () => {
    expect(inkBounds(raster(4, 4, null), 4, 4)).toBeNull();
    const faint = raster(4, 4, null);
    faint[3] = 8;
    expect(inkBounds(faint, 4, 4)).toBeNull();
  });
});

describe("cropViewBox", () => {
  it("przelicza piksele na jednostki viewBox z brzegiem pol piksela", () => {
    // viewBox 0 0 100 100 na rastrze 100×100: 1 px = 1 jednostka.
    expect(cropViewBox([0, 0, 100, 100], [20, 30, 59, 69], 100, 100)).toEqual([19.5, 29.5, 41, 41]);
  });

  it("uwzglednia przesuniety viewBox i skale", () => {
    // viewBox -12 -12 24 24 na rastrze 240×240: 1 px = 0,1 jednostki.
    const [x, y, w, h] = cropViewBox([-12, -12, 24, 24], [40, 40, 199, 199], 240, 240);
    expect(x).toBeCloseTo(-8.05);
    expect(y).toBeCloseTo(-8.05);
    expect(w).toBeCloseTo(16.1);
    expect(h).toBeCloseTo(16.1);
  });

  it("nie wychodzi poza stary viewBox", () => {
    expect(cropViewBox([0, 0, 50, 50], [0, 0, 49, 49], 50, 50)).toEqual([0, 0, 50, 50]);
  });
});
