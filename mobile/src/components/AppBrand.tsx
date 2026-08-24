const BRAND_CLAIM = "Die Schweizer Plattform für Schützenvereine";
const BRAND_DOMAIN = "schiessportal.com";

function LogoMark({ compact }: { compact: boolean }) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label="Schiessportal Logo"
      className={compact ? "h-10 w-10 shrink-0 text-foreground" : "h-16 w-16 shrink-0 text-foreground"}
    >
      <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M32 4a28 28 0 0 1 0 56" opacity="0.85" />
        <path d="M32 4a28 28 0 0 0 0 56" opacity="0.85" />
        <path d="M32 13a19 19 0 0 1 15.5 30" />
        <path d="M32 51a19 19 0 0 1-15.5-8" />
      </g>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M24 32H6" />
        <path d="M24 32l-6-6H8" />
      </g>
      <g fill="currentColor">
        <circle cx="5" cy="32" r="2.6" />
        <circle cx="7" cy="26" r="2.2" />
      </g>
      <g
        fill="none"
        className="stroke-primary"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M40 32h18" />
        <path d="M40 32l6 6h10" />
      </g>
      <g className="fill-primary">
        <circle cx="59" cy="32" r="2.6" />
        <circle cx="57" cy="38" r="2.2" />
        <circle cx="32" cy="32" r="6" />
      </g>
    </svg>
  );
}

function Wordmark({ compact }: { compact: boolean }) {
  return (
    <div className="min-w-0 text-left">
      <div
        className={`${compact ? "text-lg" : "text-2xl"} font-display font-black uppercase leading-none tracking-[0.08em]`}
      >
        <span className="text-primary">SCHIESS</span>
        <span className="text-foreground">PORTAL</span>
      </div>
      <div className={`${compact ? "hidden" : "mt-1 block"} text-xs leading-tight text-muted-foreground`}>
        {BRAND_CLAIM}
      </div>
      <div className="mt-1 font-mono text-[10px] tracking-[0.12em] text-muted-foreground">
        {BRAND_DOMAIN}
      </div>
    </div>
  );
}

export function AppBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center ${compact ? "gap-2.5" : "gap-3"}`} aria-label="Schiessportal.com">
      <LogoMark compact={compact} />
      <Wordmark compact={compact} />
    </div>
  );
}
