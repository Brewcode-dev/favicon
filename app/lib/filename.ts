import type { Settings } from "./settings";

const MAX = 80;
const FALLBACK = "favicon";

/** Nazwa wpisana przez uzytkownika: bez znakow zakazanych w nazwach plikow i bez rozszerzenia. */
export function cleanFileName(raw: string): string {
  return raw
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-")
    .replace(/\.(zip|json)$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+|\.+$/g, "")
    .slice(0, MAX)
    .trim();
}

/** Slug z nazwy aplikacji: "Moja aplikacja" daje "moja-aplikacja". */
export function slugify(raw: string): string {
  return raw
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX)
    .replace(/-+$/, "");
}

/** Wspolna nazwa paczki ZIP i pliku projektu, bez rozszerzenia. */
export function baseFileName(s: Pick<Settings, "fileName" | "appName">): string {
  return cleanFileName(s.fileName) || slugify(s.appName) || FALLBACK;
}
