// @vitest-environment jsdom
import { icons } from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { lucideSvgText } from "./source";

/** Ikona tak, jak lucide-react wstawia ja do DOM-u w siatce wyboru. */
function rendered(name: keyof typeof icons) {
  const html = renderToStaticMarkup(createElement(icons[name], { className: "h-5 w-5" }));
  const box = document.createElement("div");
  box.innerHTML = html;
  return box.querySelector("svg")!;
}

describe("lucideSvgText", () => {
  it("daje samodzielny dokument SVG bez klas i currentColor", () => {
    const out = lucideSvgText(rendered("Coffee"));
    const root = new DOMParser().parseFromString(out, "image/svg+xml").documentElement;
    expect(root.localName).toBe("svg");
    expect(root.getAttribute("xmlns")).toBe("http://www.w3.org/2000/svg");
    expect(root.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(root.getAttribute("width")).toBe("24");
    expect(root.getAttribute("stroke")).toBe("#000000");
    expect(root.getAttribute("fill")).toBe("none");
    expect(out).not.toMatch(/class=|currentColor|aria-hidden/);
    expect(root.querySelectorAll("path").length).toBeGreaterThan(0);
  });

  it("nie zmienia oryginalu w DOM-ie", () => {
    const svg = rendered("Star");
    lucideSvgText(svg);
    expect(svg.getAttribute("class")).toContain("h-5");
    expect(svg.getAttribute("stroke")).toBe("currentColor");
  });

  it("biblioteka ma cala kolekcje ikon", () => {
    expect(Object.keys(icons).length).toBeGreaterThan(1500);
  });
});
