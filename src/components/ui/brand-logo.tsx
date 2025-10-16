export function BrandLogo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gv" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--accent))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </linearGradient>
      </defs>
      {/* Minimal, rectangular motif: a simple "view" frame with a highlight bar */}
      <rect x="8" y="12" width="48" height="40" rx="8" stroke="url(#gv)" strokeWidth="3" />
      {/* Header bar */}
      <rect x="12" y="16" width="40" height="8" rx="3" fill="url(#gv)" opacity="0.3" />
      {/* Content area */}
      <rect x="12" y="28" width="28" height="20" rx="4" fill="url(#gv)" opacity="0.12" />
      {/* Right insight rail */}
      <rect x="44" y="28" width="8" height="20" rx="2" fill="url(#gv)" opacity="0.5" />
      {/* Small focus tile */}
      <rect x="20" y="32" width="12" height="8" rx="2" fill="url(#gv)" />
    </svg>
  );
}


