import { useRef, type ReactNode } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import type { MediaItem, ProgressEntry } from "../lib/types";
import { BlurImg } from "./BlurImg";
import { ProgressBar, SectionHeading } from "./ui";
import { IChevronR, IPlay } from "./Icons";
import { cn } from "../lib/cn";

/* ------------------------------- Poster card ------------------------------- */

export function PosterCard({
  item,
  progress,
  badge,
  className,
  index = 0,
}: {
  item: MediaItem;
  progress?: number;
  badge?: ReactNode;
  className?: string;
  index?: number;
}) {
  const glow = item.poster?.avgHueDark ?? "oklch(0.4 0.1 275)";
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.4), ease: [0.22, 1, 0.36, 1] }}
      className={cn("w-36 shrink-0 snap-start sm:w-40 md:w-44", className)}
    >
      <Link
        to={`/title/${item.subjectId}`}
        className="group ring-focus relative block overflow-hidden rounded-xl border border-hairline bg-canvas-raise transition-all duration-300 hover:-translate-y-1.5"
        style={{ ["--glow" as any]: glow }}
      >
        <BlurImg image={item.poster} alt={item.title} className="aspect-[2/3] w-full" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-canvas-deep/90 via-transparent to-transparent opacity-70 transition-opacity group-hover:opacity-90" />
        <div
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ boxShadow: `inset 0 0 0 1px ${glow}, 0 12px 44px color-mix(in oklch, ${glow} 45%, transparent)` }}
        />
        {badge && <div className="absolute top-2 left-2">{badge}</div>}
        <div className="absolute right-2 bottom-2 left-2">
          <div className="truncate font-display text-[13px] font-semibold tracking-wide text-ink">
            {item.title}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-dim">
            {item.year && <span>{item.year}</span>}
            {item.rating != null && <span className="text-cyan">★ {item.rating.toFixed(1)}</span>}
            <span className="truncate uppercase">{item.subjectType === "TV_SERIES" ? "Series" : "Movie"}</span>
          </div>
          {progress !== undefined && progress > 0.01 && (
            <ProgressBar value={progress} className="mt-1.5" />
          )}
        </div>
      </Link>
    </motion.div>
  );
}

/* ------------------------------ Landscape card ----------------------------- */

export function LandscapeCard({
  item,
  progress,
  label,
  className,
  index = 0,
}: {
  item: MediaItem;
  progress?: number;
  label?: string;
  className?: string;
  index?: number;
}) {
  const glow = item.backdrop?.avgHueDark ?? item.poster?.avgHueDark ?? "oklch(0.4 0.1 275)";
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.4), ease: [0.22, 1, 0.36, 1] }}
      className={cn("w-64 shrink-0 snap-start sm:w-72 md:w-80", className)}
    >
      <Link
        to={`/title/${item.subjectId}`}
        className="group ring-focus relative block overflow-hidden rounded-xl border border-hairline bg-canvas-raise transition-all duration-300 hover:-translate-y-1"
      >
        <BlurImg
          image={item.backdrop ?? item.poster}
          alt={item.title}
          className="aspect-video w-full"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-canvas-deep/95 via-canvas-deep/20 to-transparent" />
        <div
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ boxShadow: `inset 0 0 0 1px ${glow}, 0 12px 44px color-mix(in oklch, ${glow} 45%, transparent)` }}
        />
        {label && (
          <span className="absolute top-2 left-2 rounded-md bg-violet/80 px-1.5 py-0.5 font-display text-[10px] font-bold tracking-wider text-white">
            {label}
          </span>
        )}
        <div className="absolute right-2 bottom-2 left-2 flex items-end justify-between gap-2">
          <div className="truncate font-display text-sm font-semibold tracking-[0.08em] text-ink uppercase">
            {item.title}
          </div>
          <span className="grid size-8 shrink-0 place-items-center rounded-full border border-hairline-strong bg-canvas-deep/60 text-ink backdrop-blur transition-colors group-hover:border-cyan group-hover:text-cyan">
            <IPlay width={14} height={14} />
          </span>
        </div>
        {progress !== undefined && progress > 0.01 && (
          <ProgressBar value={progress} className="absolute bottom-0 left-0 rounded-none" />
        )}
      </Link>
    </motion.div>
  );
}

/* ----------------------------------- Rail ---------------------------------- */

export function Rail({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) =>
    ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <section className={cn("relative", className)}>
      <SectionHeading
        action={
          <div className="flex items-center gap-2">
            {action}
            <button
              aria-label="Scroll rail forward"
              onClick={() => scroll(1)}
              className="ring-focus hidden size-8 cursor-pointer place-items-center rounded-full border border-hairline text-ink-dim transition-colors hover:border-cyan hover:text-cyan md:grid"
            >
              <IChevronR width={16} height={16} />
            </button>
          </div>
        }
      >
        {title}
      </SectionHeading>
      <div
        ref={ref}
        className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-1 pb-2"
      >
        {children}
      </div>
    </section>
  );
}

/* ---------------------------- Continue-watching card ------------------------ */

export function ContinueCard({ entry, index = 0 }: { entry: ProgressEntry; index?: number }) {
  const progress = entry.duration > 0 ? entry.t / entry.duration : 0;
  const itemLike: MediaItem = {
    subjectId: entry.subjectId,
    subjectType: entry.kind,
    title: entry.title,
    description: "",
    genres: [],
    rating: null,
    detailPath: entry.detailPath,
    hasResource: true,
    subtitles: [],
    poster: entry.posterUrl
      ? { url: entry.posterUrl, blurHash: entry.blurHash ?? null, avgHueDark: null, avgHueLight: null }
      : undefined,
  };
  const label =
    entry.kind === "TV_SERIES" ? `S${entry.season}:E${entry.episode}` : undefined;
  return (
    <LandscapeCard item={itemLike} progress={progress} label={label} index={index} />
  );
}
