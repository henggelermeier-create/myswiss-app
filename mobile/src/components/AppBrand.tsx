export function AppBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center ${compact ? "gap-2" : "gap-3"}`} aria-label="Schiessportal.com">
      <svg
        viewBox="0 0 64 64"
        role="img"
        aria-label="Schiessportal Logo"
        className={compact ? "h-9 w-9 shrink-0" : "h-14 w-14 shrink-0"}
      >
        <circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="32" cy="32" r="19" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="32" cy="32" r="9" fill="var(--color-primary)" />
        <path d="M29 23h6v6h6v6h-6v6h-6v-6h-6v-6h6z" fill="white" />
      </svg>
      <div className="min-w-0 text-left">
        <div className={`${compact ? "text-lg" : "text-2xl"} font-bold leading-none`}>Schiessportal</div>
        <div className="mt-1 font-mono text-xs tracking-[.16em] text-muted-foreground">SCHIESSPORTAL.COM</div>
      </div>
    </div>
  );
}
