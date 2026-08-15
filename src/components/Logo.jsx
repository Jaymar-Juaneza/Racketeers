import { cn } from "../lib/utils.js";

export function ShuttlecockMark({ className }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("h-10 w-10", className)}
      role="img"
      aria-label="Badminton shuttlecock"
    >
      <rect width="64" height="64" rx="14" fill="#1D4ED8" />
      <g fill="none" stroke="#F2F7FF" strokeWidth="2.5" strokeLinecap="round">
        <path d="M32 14 L20 50" />
        <path d="M32 14 L32 52" />
        <path d="M32 14 L44 50" />
        <path d="M32 14 L10 42" />
        <path d="M32 14 L54 42" />
      </g>
      <path
        d="M24 28 h16 a8 6 0 0 1 0 12 h-16 a8 6 0 0 1 0 -12 z"
        fill="#FFFFFF"
      />
      <circle cx="32" cy="34" r="3.5" fill="#38BDF8" />
    </svg>
  );
}

export function Logo({ className, markClassName }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <ShuttlecockMark className={markClassName} />
      <div className="leading-tight">
        <p className="text-xl font-extrabold tracking-tight text-primary">
          ATSI <span className="text-secondary-dark">Racketeers</span>
        </p>
        <p className="font-mono text-xs font-medium text-muted">
          Badminton Tournament Manager
        </p>
      </div>
    </div>
  );
}
