import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { removeDownload, useDownloads } from "../lib/store";
import { useHead } from "../hooks/useHead";
import { Button, EmptyState } from "../components/ui";
import { ICheck, IDownload, IPlay, ITrash } from "../components/Icons";
import { formatBytes } from "../lib/format";

const QUOTA = 100 * 1024 ** 3; // 100 GB visual quota

export function DownloadsPage() {
  useHead("Downloads — Jagflix", "Your offline library on Jagflix.");
  const downloads = useDownloads();
  const navigate = useNavigate();

  const used = downloads.reduce((acc, d) => acc + (d.sizeBytes ?? 0), 0);
  const ratio = Math.min(1, used / QUOTA);
  const circ = 2 * Math.PI * 15.5;

  return (
    <main className="mx-auto min-h-[80vh] w-full max-w-[1100px] px-4 pt-24 pb-28 sm:px-8 md:pb-16">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-serif text-4xl font-semibold text-ink sm:text-5xl"
          >
            Downloads
          </motion.h1>
          <p className="mt-2 text-sm text-ink-dim">
            {downloads.length} item{downloads.length === 1 ? "" : "s"} • {formatBytes(used)} used
          </p>
        </div>

        {/* storage widget */}
        <div className="glass flex items-center gap-4 rounded-2xl px-5 py-4">
          <svg width="44" height="44" viewBox="0 0 36 36" className="-rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-hairline-strong)" strokeWidth="3" />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="url(#dlgrad)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${circ * Math.max(ratio, 0.02)} ${circ}`}
            />
            <defs>
              <linearGradient id="dlgrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="var(--color-cyan)" />
                <stop offset="1" stopColor="var(--color-violet)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="font-display text-sm text-ink-dim">
            <span className="text-ink">{formatBytes(used)}</span> / 100 GB
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {downloads.length === 0 ? (
          <EmptyState
            title="No downloads yet"
            hint="Open a title and pick a quality under the player to save it here."
          />
        ) : (
          downloads.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="glass flex flex-wrap items-center gap-4 rounded-2xl p-3.5 sm:flex-nowrap"
            >
              <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-xl border border-hairline">
                {d.posterUrl ? (
                  <img src={d.posterUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-canvas-raise">
                    <IDownload width={18} height={18} className="text-ink-faint" />
                  </div>
                )}
                <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/70 px-1.5 py-0.5 font-display text-[10px] font-bold text-ink backdrop-blur">
                  {d.quality}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate font-serif text-lg text-ink">{d.title}</div>
                <div className="mt-0.5 text-xs text-ink-dim">
                  {d.quality} • {formatBytes(d.sizeBytes)}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-cyan">
                <span>Ready to watch</span>
                <ICheck width={15} height={15} />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="hero"
                  className="px-6 py-2.5"
                  onClick={() =>
                    navigate(
                      d.season != null
                        ? `/watch/${d.subjectId}?season=${d.season}&episode=${d.episode}`
                        : `/watch/${d.subjectId}`,
                    )
                  }
                >
                  <IPlay width={15} height={15} /> Play
                </Button>
                <Button variant="glass" className="px-4 py-2.5" onClick={() => removeDownload(d.id)} aria-label={`Delete ${d.title}`}>
                  <ITrash width={15} height={15} /> Delete
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </main>
  );
}
