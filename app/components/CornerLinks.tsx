import { cn } from "@/lib/utils";
import BrewcodeBadge from "./BrewcodeBadge";
import { CoffeeLink } from "./CoffeeLink";
import { CookieSettingsButton } from "./ConsentBanner";

/**
 * „Postaw kawę”, ustawienia cookies i znaczek brewcode — razem, po lewej stronie:
 * na dole paska paneli w edytorze, w lewym dolnym rogu na ekranie startowym.
 */
export default function CornerLinks({ variant, className }: { variant: "pill" | "rail"; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <CoffeeLink variant={variant} />
      <CookieSettingsButton />
      <BrewcodeBadge />
    </div>
  );
}
