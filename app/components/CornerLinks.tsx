import { cn } from "@/lib/utils";
import BrewcodeBadge from "./BrewcodeBadge";
import { CoffeeLink } from "./CoffeeLink";
import { CookieSettingsButton } from "./ConsentBanner";

/**
 * Znaczek brewcode, „Postaw kawę” i ustawienia cookies — razem, po lewej stronie.
 * Znaczek zawsze najblizej rogu, kawa tuz przy nim (od strony srodka ekranu),
 * cookies nigdy miedzy nimi.
 * `corner` (ekran startowy): cookies nad znaczkiem, kapsula kawy na prawo od znaczka.
 * `rail` (pasek paneli edytora): w kolumnie cookies, kawa, znaczek na dole;
 * na telefonie pasek jest wierszem i znaczek konczy go z prawej.
 */
export default function CornerLinks({ variant, className }: { variant: "corner" | "rail"; className?: string }) {
  if (variant === "rail")
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <CookieSettingsButton />
        <CoffeeLink variant="rail" />
        <BrewcodeBadge />
      </div>
    );
  return (
    <div className={cn("flex flex-col items-start gap-3", className)}>
      <div className="flex w-12 justify-center empty:hidden">
        <CookieSettingsButton />
      </div>
      <div className="flex items-center gap-3">
        <BrewcodeBadge />
        <CoffeeLink variant="corner" />
      </div>
    </div>
  );
}
