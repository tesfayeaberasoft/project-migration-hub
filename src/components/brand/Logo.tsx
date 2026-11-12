import emblem from "@/assets/haroni-emblem.png";
import fullLogo from "@/assets/haroni-logo.png";
import { cn } from "@/lib/utils";

export { emblem as haroniEmblemUrl, fullLogo as haroniLogoUrl };

/** Emblem + name, for sidebars and headers. */
export function LogoLockup({ className, compact = false, subtitle = "Credit Management" }: { className?: string; compact?: boolean; subtitle?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img src={emblem} alt="Haroni Hotel" width={384} height={375} className={cn("shrink-0 animate-glow", compact ? "h-9 w-9" : "h-11 w-11")} />
      {!compact && (
        <div className="leading-none">
          <div className="font-display text-2xl font-semibold tracking-[0.22em] text-gold-gradient">HARONI</div>
          <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground">{subtitle}</div>
        </div>
      )}
    </div>
  );
}

/** Full stacked logo (crest, wordmark and HOTEL rule). */
export function LogoFull({ className }: { className?: string }) {
  return <img src={fullLogo} alt="Haroni Hotel" width={640} height={594} className={cn("h-auto select-none", className)} />;
}
