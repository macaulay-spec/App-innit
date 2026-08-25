import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { getItemDetails, getRecommendations } from "../lib/api";
import { inMyList, toggleMyList, useMyList } from "../lib/store";
import { useHead } from "../hooks/useHead";
import { BlurImg } from "../components/BlurImg";
import { PosterCard, Rail } from "../components/Cards";
import { Button, Chip, ErrorState, RatingPill } from "../components/ui";
import { ICheck, IPlay, IPlus } from "../components/Icons";
import { formatDuration } from "../lib/format";
import { cn } from "../lib/cn";

export function TitlePage() {
  const { subjectId = "" } = useParams();
  const navigate = useNavigate();
  useMyList(); // re-render on list changes

  const details = useQuery({
    queryKey: ["details", subjectId],
    queryFn: () => getItemDetails(subjectId),
    staleTime: 5 * 60_000,
  });
  const recs = useQuery({
    queryKey: ["recs", subjectId],
    queryFn: () => getRecommendations(subjectId),
    staleTime: 5 * 60_000,
  });

  const item = details.data?.item;
  useHead(
    item ? `${item.title}${item.year ? ` (${item.year})` : ""} — Jagflix` : "Jagflix",
    item?.description || `Watch ${item?.title ?? ""} on Jagflix.`,
  );

  const [season, setSeason] = useState(1);
  const [epLimit, setEpLimit] = useState(30);
  const activeSeason = useMemo(() => {
    const seasons = details.data?.seasons ?? [];
    return seasons.find((s) => s.se === season) ?? seasons[0];
  }, [details.data, season]);

  const listed = item ? inMyList(item.subjectId) : false;
  const tagline =
    item && item.description
      ? item.description
      : item?.postTitle && !item.postTitle.startsWith("Trailer-")
        ? item.postTitle
        : "";

  return (
    <main className="relative min-h-screen pb-28 md:pb-20">
      {/* Ambient backdrop */}
      <div className="absolute inset-0 overflow-hidden">
        <BlurImg image={item?.backdrop ?? item?.poster} alt="" className="h-full w-full scale-110 blur-2xl opacity-60" />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, color-mix(in oklch, ${item?.backdrop?.avgHueDark ?? "#0a0b12"} 55%, transparent), var(--color-canvas-deep) 78%)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-canvas-deep via-transparent to-canvas-deep/60" />
        {details.data?.trailerUrl && (
          <video
            src={details.data.trailerUrl}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
        )}
      </div>

      <div className="relative mx-auto max-w-[1440px] px-4 pt-28 sm:px-8 md:pt-32">
        {details.isError ? (
          <div className="mx-auto max-w-xl">
            <ErrorState onRetry={() => details.refetch()} />
          </div>
        ) : !item ? (
          <div className="grid gap-10 lg:grid-cols-[1fr_420px]">
            <div>
              <div className="skeleton h-4 w-48 rounded-full" />
              <div className="skeleton mt-5 h-16 w-3/4 rounded-2xl" />
              <div className="skeleton mt-4 h-4 w-64 rounded-full" />
              <div className="skeleton mt-8 h-14 w-64 rounded-xl" />
            </div>
            <div className="skeleton hidden h-[420px] rounded-2xl lg:block" />
          </div>
        ) : (
          <div className="grid items-start gap-10 lg:grid-cols-[1fr_420px]">
            {/* ------------------------------ Left column ------------------------------ */}
            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
              <div className="font-display text-[11px] font-semibold tracking-[0.3em] text-cyan uppercase">
                {details.data?.isSeries ? "A Jagflix Original Series" : "A Jagflix Film"}
              </div>
              <h1
                className="mt-3 font-serif text-5xl font-semibold tracking-wide text-transparent sm:text-7xl"
                style={{
                  backgroundImage: `linear-gradient(120deg, var(--color-ink), color-mix(in oklch, ${item.poster?.avgHueLight ?? "var(--color-violet-soft)"} 60%, var(--color-ink)))`,
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                }}
              >
                {item.title}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-dim">
                {item.year && <span>{item.year}</span>}
                {details.data!.isSeries && (
                  <>
                    <span className="text-ink-faint">•</span>
                    <span>
                      {details.data!.seasonCount} Season{details.data!.seasonCount > 1 ? "s" : ""}
                    </span>
                  </>
                )}
                {item.durationSec ? (
                  <>
                    <span className="text-ink-faint">•</span>
                    <span>{formatDuration(item.durationSec)}</span>
                  </>
                ) : null}
                {item.country && (
                  <>
                    <span className="text-ink-faint">•</span>
                    <span>{item.country}</span>
                  </>
                )}
                <RatingPill rating={item.rating} count={item.ratingCount} />
              </div>

              {tagline && <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-dim">{tagline}</p>}

              {item.genres.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {item.genres.map((g) => (
                    <Chip key={g}>{g}</Chip>
                  ))}
                </div>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button
                  variant="hero"
                  className="px-9 py-3.5 text-base"
                  onClick={() => navigate(`/watch/${item.subjectId}`)}
                  disabled={!item.hasResource}
                >
                  <IPlay width={18} height={18} /> Play
                  <span className="mx-1 h-5 w-px bg-white/30" />
                  <IPlus
                    width={16}
                    height={16}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMyList(item);
                    }}
                    className="cursor-pointer opacity-80 hover:opacity-100"
                  />
                </Button>
                <Button variant="glass" className="px-5 py-3.5" onClick={() => toggleMyList(item)}>
                  {listed ? <ICheck width={16} height={16} className="text-cyan" /> : <IPlus width={16} height={16} />}
                  {listed ? "In My List" : "My List"}
                </Button>
              </div>
              {!item.hasResource && (
                <p className="mt-3 text-sm text-ink-faint">No playable resource available for this title right now.</p>
              )}

              {/* Cast */}
              {details.data!.stars.length > 0 && (
                <div className="mt-10">
                  <div className="mb-4 font-display text-[11px] font-semibold tracking-[0.22em] text-ink-dim uppercase">
                    Cast
                  </div>
                  <div className="no-scrollbar flex gap-6 overflow-x-auto pb-2">
                    {details.data!.stars.slice(0, 12).map((s) => (
                      <div key={s.name} className="w-20 shrink-0 text-center">
                        {s.avatarUrl ? (
                          <img
                            src={s.avatarUrl}
                            alt={s.name}
                            loading="lazy"
                            className="mx-auto size-16 rounded-full border border-hairline-strong object-cover"
                          />
                        ) : (
                          <span className="mx-auto grid size-16 place-items-center rounded-full border border-hairline-strong bg-canvas-raise font-display text-lg text-ink-dim">
                            {s.name[0]}
                          </span>
                        )}
                        <div className="mt-2 truncate text-xs font-medium text-ink">{s.name}</div>
                        <div className="truncate text-[10px] text-ink-faint">as {s.character || "—"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* ------------------------------ Episodes panel ------------------------------ */}
            {details.data!.isSeries && details.data!.seasons.length > 0 && (
              <motion.aside
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="glass-strong rounded-2xl p-5"
              >
                <div className="font-display text-[11px] font-semibold tracking-[0.22em] text-ink-dim uppercase">
                  Season
                </div>
                <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
                  {details.data!.seasons.map((s) => (
                    <button
                      key={s.se}
                      onClick={() => {
                        setSeason(s.se);
                        setEpLimit(30);
                      }}
                      className={cn(
                        "ring-focus shrink-0 cursor-pointer rounded-lg px-3.5 py-2 font-display text-xs font-semibold transition-all",
                        (activeSeason?.se ?? 1) === s.se
                          ? "bg-accent-gradient text-white shadow-(--shadow-neon)"
                          : "border border-hairline text-ink-dim hover:text-ink",
                      )}
                    >
                      Season {s.se}
                    </button>
                  ))}
                </div>

                <div className="mt-5 mb-2 font-display text-[11px] font-semibold tracking-[0.22em] text-ink-dim uppercase">
                  Episodes
                </div>
                <div className="flex max-h-[430px] flex-col gap-2 overflow-y-auto pr-1">
                  {(activeSeason?.episodes ?? []).slice(0, epLimit).map((ep, i) => (
                    <Link
                      key={ep}
                      to={`/watch/${item.subjectId}?season=${activeSeason!.se}&episode=${ep}`}
                      className="group ring-focus flex items-center gap-3 rounded-xl border border-hairline bg-canvas-raise/40 p-2.5 transition-all hover:border-violet/60 hover:bg-canvas-raise/70"
                    >
                      <span className="w-6 text-center font-display text-sm text-ink-faint">{ep}</span>
                      <BlurImg image={item.poster} alt="" className="h-12 w-20 shrink-0 rounded-lg" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-display text-sm font-semibold text-ink">
                          Episode {ep}
                        </div>
                        <div className="text-[11px] text-ink-faint">
                          S{activeSeason!.se} • {item.title}
                        </div>
                      </div>
                      <span className="grid size-9 shrink-0 place-items-center rounded-full border border-hairline-strong text-ink-dim transition-colors group-hover:border-cyan group-hover:text-cyan">
                        <IPlay width={14} height={14} />
                      </span>
                    </Link>
                  ))}
                  {(activeSeason?.episodes.length ?? 0) > epLimit && (
                    <Button variant="glass" className="mt-1 w-full py-2.5" onClick={() => setEpLimit((n) => n + 50)}>
                      Show more episodes
                    </Button>
                  )}
                </div>
              </motion.aside>
            )}
          </div>
        )}

        {/* More like this */}
        {recs.data && recs.data.length > 0 && (
          <Rail title="More Like This" className="mt-14">
            {recs.data.map((it, i) => (
              <PosterCard key={it.subjectId} item={it} index={i} />
            ))}
          </Rail>
        )}
      </div>
    </main>
  );
}
