"use client";

import { Coffee, X } from "lucide-react";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { useT } from "./I18n";

export const COFFEE_URL = "https://buymeacoffee.com/brwcd";

// Wspolny wyglad przycisku we wszystkich aplikacjach brewcode (kolory Buy Me a Coffee).
const COFFEE_COLORS = "bg-[#FFDD00] text-black hover:bg-[#FFE84D] shadow-[0_6px_18px_-6px_rgba(0,0,0,0.45)] transition-colors";

/**
 * „Postaw kawę” obok znaczka brewcode.
 * `corner` — kapsula 36 px (do 560 px szerokosci okragla 40 px, sama ikona),
 * `rail` — okragla 40 px w waskim pasku paneli edytora, gdzie kapsula sie nie miesci.
 */
export function CoffeeLink({ variant, className }: { variant: "corner" | "rail"; className?: string }) {
  const t = useT().coffee;
  return (
    <a
      href={COFFEE_URL}
      target="_blank"
      rel="noopener noreferrer"
      title={t.link}
      aria-label={t.link}
      onClick={() => track("support_click", { place: variant === "rail" ? "editor" : "start" })}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        COFFEE_COLORS,
        variant === "corner"
          ? "h-9 gap-1.5 px-3.5 text-sm font-semibold max-[560px]:h-10 max-[560px]:w-10 max-[560px]:px-0"
          : "h-10 w-10",
        className,
      )}
    >
      <Coffee className="h-4 w-4" aria-hidden />
      {variant === "corner" && <span className="max-[560px]:hidden">{t.link}</span>}
    </a>
  );
}

/** Karta po pobraniu paczki ZIP — wtedy jest za co dziekowac. */
export function CoffeeCard({ onClose, className }: { onClose: () => void; className?: string }) {
  const t = useT().coffee;
  return (
    <section role="status" className={cn("relative rounded-xl border bg-card p-4 pr-10 shadow-lg", className)}>
      <button
        type="button"
        onClick={onClose}
        title={t.close}
        aria-label={t.close}
        className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <h2 className="text-sm font-semibold">{t.title}</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.text}</p>
      <a
        href={COFFEE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("support_click", { place: "download" })}
        className={cn("mt-3 inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold", COFFEE_COLORS)}
      >
        <Coffee className="h-4 w-4" aria-hidden />
        {t.cta}
      </a>
    </section>
  );
}
