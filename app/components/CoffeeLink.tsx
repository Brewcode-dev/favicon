"use client";

import { Coffee, X } from "lucide-react";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { useT } from "./I18n";

export const COFFEE_URL = "https://buymeacoffee.com/brwcd";

/**
 * Dyskretny link „Postaw kawę” obok cookies i znaczka brewcode.
 * `pill` — kapsula jak przycisk cookies (ekran startowy), `rail` — jak przycisk paska paneli (edytor).
 */
export function CoffeeLink({ variant, className }: { variant: "pill" | "rail"; className?: string }) {
  const t = useT().coffee;
  return (
    <a
      href={COFFEE_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("support_click", { place: variant === "rail" ? "editor" : "start" })}
      className={cn(
        variant === "pill"
          ? "flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#f2f0eb] px-3 text-sm font-medium text-black shadow-lg transition-colors hover:bg-[#f6b900]"
          : "flex min-w-[64px] flex-col items-center gap-1 rounded-lg px-1 py-2 text-center text-[11px] leading-tight text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-primary",
        className,
      )}
    >
      <Coffee className={variant === "pill" ? "h-4 w-4" : "h-5 w-5"} aria-hidden />
      {t.link}
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
        className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        <Coffee className="h-4 w-4" aria-hidden />
        {t.cta}
      </a>
    </section>
  );
}
