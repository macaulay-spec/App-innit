import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

/* ---------------------------------- Button --------------------------------- */

type Variant = "hero" | "glass" | "ghost" | "outline";

export function Button({
  variant = "glass",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...rest}
      className={cn(
        "ring-focus inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-display text-sm font-semibold tracking-wide transition-all duration-300 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
        variant === "hero" &&
          "bg-accent-gradient text-white shadow-(--shadow-neon) hover:brightness-115 hover:shadow-(--shadow-neon)",
        variant === "glass" && "glass text-ink hover:border-hairline-strong hover:bg-canvas-raise/70",
        variant === "ghost" && "text-ink-dim hover:text-ink",
        variant === "outline" &&
          "border border-hairline-strong text-ink hover:border-cyan/60 hover:text-cyan",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function IconBtn({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={cn(
        "ring-focus inline-flex cursor-pointer items-center justify-center rounded-full text-ink-dim transition-colors hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ---------------------------------- Chips ---------------------------------- */

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-hairline-strong bg-canvas-raise/50 px-3 py-1 font-display text-[11px] font-medium tracking-[0.14em] text-ink-dim uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function RatingPill({ rating, count }: { rating: number | null; count?: number }) {
  if (rating == null || Number.isNaN(rating)) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg bg-[oklch(0.85_0.16_95)] px-2 py-0.5 font-display text-xs font-bold text-black"
      title={count ? `${count.toLocaleString()} IMDb ratings` : "IMDb rating"}
    >
      IMDb {rating.toFixed(1)}
    </span>
  );
}

/* -------------------------------- Headings --------------------------------- */

export function SectionHeading({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-end justify-between gap-4", className)}>
      <h2 className="font-display text-sm font-semibold tracking-[0.18em] text-ink uppercase">
        {children}
      </h2>
      {action}
    </div>
  );
}

/* --------------------------------- States ---------------------------------- */

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="glass flex flex-col items-center gap-4 rounded-2xl px-8 py-14 text-center">
      <div className="font-serif text-2xl text-ink">Signal lost</div>
      <p className="max-w-md text-sm text-ink-dim">
        {message && message !== "network"
          ? message
          : "The Jagflix API could not be reached from your network. Check your connection and try again."}
      </p>
      {onRetry && (
        <Button variant="hero" onClick={onRetry} className="px-6 py-2.5">
          Retry
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-hairline-strong px-8 py-16 text-center">
      <div className="font-serif text-xl text-ink-dim">{title}</div>
      {hint && <p className="text-sm text-ink-faint">{hint}</p>}
    </div>
  );
}

/* ------------------------------- Progress bar ------------------------------ */

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-ink/15", className)}>
      <div
        className="h-full rounded-full bg-accent-gradient"
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
      />
    </div>
  );
}
