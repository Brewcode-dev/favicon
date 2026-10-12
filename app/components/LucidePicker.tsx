"use client";

import type { LucideIcon } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useT } from "./I18n";

/** Tyle ikon pokazujemy naraz — cala biblioteka to ok. 1900 elementow SVG. */
const PAGE = 120;

type Icons = Record<string, LucideIcon>;

/** "ArrowDownAZ" → "arrow-down-a-z", tak jak nazwy na lucide.dev. */
const kebab = (name: string) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z])(?=[a-z])/g, "$1-$2")
    .replace(/([a-zA-Z])([0-9])/g, "$1-$2")
    .toLowerCase();

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Wybor ikony z calej biblioteki Lucide. Modul ze wszystkimi ikonami jest
 * spory, wiec dociagamy go dopiero przy pierwszym otwarciu zakladki.
 */
export default function LucidePicker({
  selected,
  onPick,
}: {
  selected?: string;
  onPick: (svg: SVGElement, name: string) => void;
}) {
  const t = useT();
  const [icons, setIcons] = useState<Icons | null>(null);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const q = norm(useDeferredValue(query));

  useEffect(() => {
    let alive = true;
    import("lucide-react").then((m) => alive && setIcons(m.icons as Icons));
    return () => {
      alive = false;
    };
  }, []);

  const names = useMemo(() => (icons ? Object.keys(icons) : []), [icons]);
  const matches = useMemo(() => {
    if (!q) return names;
    // Najpierw nazwy zaczynajace sie od zapytania, potem pozostale trafienia.
    const hits = names.filter((n) => norm(n).includes(q));
    return [...hits.filter((n) => norm(n).startsWith(q)), ...hits.filter((n) => !norm(n).startsWith(q))];
  }, [names, q]);
  const page = matches.slice(0, limit);
  // Wybrana ikona spoza pierwszej strony (np. po odswiezeniu) ma byc widoczna od razu.
  const shown = selected && !page.includes(selected) && matches.includes(selected) ? [selected, ...page] : page;

  return (
    <div className="space-y-2">
      <Input
        type="text"
        value={query}
        placeholder={t.source.lucideSearch}
        onChange={(e) => {
          setQuery(e.target.value);
          setLimit(PAGE);
        }}
      />
      {!icons ? (
        <p className="py-6 text-center text-xs text-muted-foreground">{t.source.lucideLoading}</p>
      ) : (
        <>
          <div className="grid max-h-64 grid-cols-8 gap-0.5 overflow-y-auto rounded-md border p-1">
            {shown.map((name) => {
              const Icon = icons[name];
              const label = kebab(name);
              return (
                <button
                  key={name}
                  type="button"
                  title={label}
                  aria-label={label}
                  aria-pressed={selected === name}
                  onClick={(e) => {
                    const svg = e.currentTarget.querySelector("svg");
                    if (svg) onPick(svg, name);
                  }}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded transition-colors hover:bg-accent",
                    selected === name && "bg-primary text-primary-foreground hover:bg-primary",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </button>
              );
            })}
            {!shown.length && <p className="col-span-8 py-4 text-center text-xs text-muted-foreground">{t.source.lucideEmpty}</p>}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {t.source.lucideCount(shown.length, matches.length)} · {t.source.lucideHint}
            </span>
            {matches.length > limit && (
              <button type="button" className="text-primary hover:underline" onClick={() => setLimit((l) => l + PAGE * 2)}>
                {t.source.lucideMore}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
