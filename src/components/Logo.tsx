import { cn } from "@/lib/utils";

/**
 * CMChub.net brand mark: the layered crescent with the four trailing dots,
 * redrawn as a vector so it stays crisp at any size and on light or dark backgrounds.
 */
export function LogoMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <mask id="cmc-outer">
          <rect width="100" height="100" fill="#fff" />
          <circle cx="60" cy="50" r="33" fill="#000" />
        </mask>
        <mask id="cmc-inner">
          <rect width="100" height="100" fill="#fff" />
          <circle cx="64" cy="46" r="25" fill="#000" />
        </mask>
      </defs>
      {/* light crescent */}
      <circle cx="46" cy="58" r="36" fill="#a9d6e3" mask="url(#cmc-outer)" />
      {/* steel-blue crescent */}
      <circle cx="47" cy="47" r="30" fill="#3b7fa6" mask="url(#cmc-inner)" />
      {/* navy wedge */}
      <path d="M27 46 L45 36 L43 72 L29 64 Z" fill="#1f3b5c" opacity="0.85" />
      {/* trailing dots */}
      <circle cx="43" cy="69" r="2.6" fill="#c9a24a" />
      <circle cx="48.5" cy="75.5" r="3.4" fill="#c9a24a" />
      <circle cx="56" cy="81.5" r="4.2" fill="#2f6f7e" />
      <circle cx="65" cy="86" r="5" fill="#4b3f8f" />
    </svg>
  );
}

/** Two-tone wordmark: CMC + hub + .net, with the gold tagline underneath. */
export function Wordmark({ tagline, className, size = "md" }: { tagline?: string; className?: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "text-lg", md: "text-xl", lg: "text-4xl md:text-5xl" };
  return (
    <span className={cn("inline-flex flex-col leading-none", className)} dir="ltr">
      <span className={cn("font-bold tracking-tight", sizes[size])}>
        <span className="text-brand-500">CMC</span>
        <span className="text-brand-200">hub</span>
        <span className="text-brand-500">.net</span>
      </span>
      {tagline ? <span className={cn("mt-1 font-medium text-accent-500", size === "lg" ? "text-base md:text-lg" : "text-[11px]")}>{tagline}</span> : null}
    </span>
  );
}

export function Logo({ tagline, className, markClass = "h-10 w-10", size = "md" }: { tagline?: string; className?: string; markClass?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClass} />
      <Wordmark tagline={tagline} size={size} />
    </span>
  );
}
