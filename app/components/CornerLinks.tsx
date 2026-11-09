import { cn } from "@/lib/utils";
import BrewcodeBadge from "./BrewcodeBadge";
import { CookieSettingsButton } from "./ConsentBanner";

/**
 * Ustawienia cookies i znaczek brewcode — razem, po lewej stronie: na dole
 * paska paneli w edytorze, w lewym dolnym rogu na ekranie startowym.
 */
export default function CornerLinks({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <CookieSettingsButton />
      <BrewcodeBadge />
    </div>
  );
}
