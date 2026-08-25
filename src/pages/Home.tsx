import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { getHomepage, getHot, getTrending } from "../lib/api";
import { useContinueWatching } from "../lib/store";
import { useHead } from "../hooks/useHead";
import { BlurImg } from "../components/BlurImg";
import { ContinueCard, LandscapeCard, PosterCard, Rail } from "../components/Cards";
import { Button, Chip, ErrorState, RatingPill } from "../components/ui";
import { IInfo, IPlay } from "../components/Icons";
import { formatDuration, formatLeft } from "../lib/format";
import { cn } from "../lib/cn";

export function Home() {
  useHead("Jagflix — Watch movies & series", "A premium streaming experience.");
  const navigate = useNavigate();

  const home = useQuery({ queryKey: ["homepage"], queryFn: getHomepage, staleTime: 10 * 60_000 });
  const hot = useQuery({ queryKey: ["hot"], queryFn: getHot, staleTime: 10 * 60_000 });
  const trending = useQuery({ queryKey: ["trending"], queryFn: () => getTrending(0, 24), staleTime: 10 * 60_000 });
  const continueWatching = useContinueWatching();

  const heroEntries = useMemo(() => {
    const list = home.data?.hero ?? [];
    if (list.length) return list;
    return (trending.data ?? []).slice(0, 6).map((item) => ({ item, backdrop: item.backdrop ?? item.poster }));
  }, [home.data, trending.data]);

  const [heroIdx, setHeroIdx] = useState(0);
  useEffect(() => {
    if (heroEntries.length < 2) return;
    const id = setInterval(() => setHeroIdx((i) => (i + 1) % heroEntries.length), 9000);
    return () => clearInterval(id);
  }, [heroEntries.length]);
  const hero = heroEntries[heroIdx % Math.max(heroEntries.length, 1)];

  const loading = home.isLoading && trending.isLoading;
  const allFailed = home.isError && trending.isError && hot.isError;

  const latest = continueWatching[0];

  return (
    <main className="pb-28 md:pb-16">
      {/* ------------------------------- HERO ------------------------------- */}
      <section className="relative flex min-h-[86vh] items-center overflow-hidden md:min-h-[78vh]">
        {allFailed ? (
          <div className="mx-auto w-full max-w-xl px-4 pt-24">
            <ErrorState onRetry={() => { home.refetch(); hot.refetch(); trending.refetch(); }} />
          </div>
        ) : loading || !hero ? (
          <div className="mx-auto w-full max-w-[1440px] px-4 pt-24 sm:px-8">
            <div className="skeleton h-4 w-40 rounded-full" />
            <div className="skeleton mt-5 h-16 w-2/3 rounded-2xl" />
            <div className="skeleton mt-3 h-16 w-1/2 rounded-2xl" />
            <div className="skeleton mt-6 h-4 w-80 max-w-full rounded-full" />
            <div className="mt-8 flex gap-3">
              <div className="skeleton h-12 w-36 rounded-xl" />
              <div className="skeleton h-12 w-36 rounded-xl" />
            </div>
          </div>
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              <motion.div
                key={hero.item.subjectId}
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
                <BlurImg image={hero.backdrop ?? hero.item.poster} alt="" className="h-full w-full" eager />
                <div className="absolute inset-0 bg-gradient-to-t from-canvas-deep via-canvas-deep/35 to-canvas-deep/10" />
                <div className="absolute inset-0 bg-gradient-to-r from-canvas-deep/85 via-transparent to-canvas-deep/30" />
              </motion.div>
            </AnimatePresence>

            <div className="relative mx-auto grid w-full max-w-[1440px] items-center gap-10 px-4 pt-24 pb-10 sm:px-8 lg:grid-cols-[1fr_auto]">
              <motion.div
                key={`meta-${hero.item.subjectId}`}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-2xl"
              >
                <div className="mb-4 font-display text-[11px] font-semibold tracking-[0.3em] text-cyan uppercase">
                  A Jagflix Original
                </div>
                <h1 className="font-display text-5xl leading-[0.95] font-bold tracking-tight text-ink uppercase sm:text-7xl">
                  {hero.item.title}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-dim">
                  {hero.item.year && <span>{hero.item.year}</span>}
                  {hero.item.genres[0] && (
                    <>
                      <span className="text-ink-faint">•</span>
                      <span>{hero.item.genres.slice(0, 2).join(" · ")}</span>
                    </>
                  )}
                  {hero.item.durationSec ? (
                    <>
                      <span className="text-ink-faint">•</span>
                      <span>{formatDuration(hero.item.durationSec)}</span>
                    </>
                  ) : null}
                  <RatingPill rating={hero.item.rating} count={hero.item.ratingCount} />
                </div>
                {hero.item.description && (
                  <p className="mt-4 line-clamp-3 max-w-xl text-[15px] leading-relaxed text-ink-dim">
                    {hero.item.description}
                  </p>
                )}
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Button
                    variant="hero"
                    className="px-8 py-3 text-[15px]"
                    onClick={() => navigate(`/watch/${hero.item.subjectId}`)}
                  >
                    <IPlay width={18} height={18} /> Play
                  </Button>
                  <Button variant="glass" className="px-6 py-3" onClick={() => navigate(`/title/${hero.item.subjectId}`)}>
                    <IInfo width={17} height={17} /> More Info
                  </Button>
                </div>

                {/* hero dots (mobile) */}
                {heroEntries.length > 1 && (
                  <div className="mt-6 flex gap-2">
                    {heroEntries.map((_, i) => (
                      <button
                        key={i}
                        aria-label={`Hero ${i + 1}`}
                        onClick={() => setHeroIdx(i)}
                        className={cn(
                          "h-1.5 cursor-pointer rounded-full transition-all",
                          i === heroIdx ? "w-6 bg-cyan" : "w-1.5 bg-ink/25 hover:bg-ink/50",
                        )}
                      />
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Neon poster card (desktop) */}
              <motion.div
                key={`poster-${hero.item.subjectId}`}
                initial={{ opacity: 0, y: 26, rotate: 1.5 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ type: "spring", stiffness: 120, damping: 18 }}
                className="hidden lg:block"
              >
                <Link
                  to={`/title/${hero.item.subjectId}`}
                  className="ring-focus block overflow-hidden rounded-2xl border"
                  style={{
                    borderColor: "color-mix(in oklch, var(--color-cyan) 55%, transparent)",
                    boxShadow: "var(--shadow-neon)",
                  }}
                >
                  <BlurImg image={hero.item.poster} alt={hero.item.title} className="h-[420px] w-[290px]" eager />
                </Link>
              </motion.div>
            </div>
          </>
        )}
      </section>

      {/* ------------------------------- RAILS ------------------------------- */}
      <div className="relative mx-auto flex max-w-[1440px] flex-col gap-10 px-4 sm:px-8">
        {continueWatching.length > 0 && (
          <Rail title="Continue Watching">
            {continueWatching.map((e, i) => (
              <ContinueCard key={`${e.subjectId}-${e.season}-${e.episode}`} entry={e} index={i} />
            ))}
          </Rail>
        )}

        {(home.data?.rails ?? []).map((r) => (
          <Rail key={r.title} title={r.title}>
            {r.items.map((it, i) => (
              <PosterCard key={it.subjectId} item={it} index={i} />
            ))}
          </Rail>
        ))}

        {hot.data && hot.data.movies.length > 0 && (
          <Rail title="Hot Movies">
            {hot.data.movies.map((it, i) => (
              <LandscapeCard key={it.subjectId} item={it} index={i} />
            ))}
          </Rail>
        )}

        {hot.data && hot.data.series.length > 0 && (
          <Rail title="Hot Series">
            {hot.data.series.map((it, i) => (
              <LandscapeCard key={it.subjectId} item={it} index={i} />
            ))}
          </Rail>
        )}

        {(trending.data?.length ?? 0) > 0 && (
          <Rail title="Trending Now">
            {trending.data!.map((it, i) => (
              <PosterCard key={it.subjectId} item={it} index={i} />
            ))}
          </Rail>
        )}

        {(home.data?.platforms.length ?? 0) > 0 && (
          <div className="flex flex-wrap items-center gap-2 pb-4">
            <span className="mr-2 font-display text-[11px] font-semibold tracking-[0.22em] text-ink-faint uppercase">
              Also streaming from
            </span>
            {home.data!.platforms.map((p) => (
              <Chip key={p.name}>{p.name}</Chip>
            ))}
          </div>
        )}
      </div>

      {/* --------------------- Floating continue-watching bar --------------------- */}
      <AnimatePresence>
        {latest && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 200, damping: 24 }}
            className="glass-strong fixed bottom-20 left-1/2 z-20 hidden w-[560px] -translate-x-1/2 items-center gap-4 rounded-2xl px-5 py-3.5 md:flex md:bottom-6"
          >
            <span className="font-display text-xs font-semibold tracking-[0.18em] text-ink-dim uppercase">
              Continue Watching
            </span>
            {latest.posterUrl && (
              <img src={latest.posterUrl} alt="" className="h-12 w-16 rounded-lg object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-sm font-semibold text-ink">{latest.title}</div>
              <div className="mt-1 flex items-center gap-3">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-ink/15">
                  <div
                    className="h-full bg-accent-gradient"
                    style={{ width: `${Math.min(100, (latest.t / Math.max(latest.duration, 1)) * 100)}%` }}
                  />
                </div>
                <span className="text-[11px] whitespace-nowrap text-ink-faint">
                  {formatLeft(Math.max(latest.duration - latest.t, 0))}
                </span>
              </div>
            </div>
            <Link
              to={`/watch/${latest.subjectId}?season=${latest.season}&episode=${latest.episode}`}
              className="ring-focus grid size-11 shrink-0 place-items-center rounded-full border border-cyan/50 text-cyan transition-all hover:bg-cyan/10 hover:shadow-(--shadow-neon)"
              aria-label={`Continue ${latest.title}`}
            >
              <IPlay width={18} height={18} />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
