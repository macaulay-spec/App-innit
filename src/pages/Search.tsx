import { useEffect, useMemo, useRef } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { getHot, getPopularSearches, getTrending, search } from "../lib/api";
import { useHead } from "../hooks/useHead";
import { PosterCard } from "../components/Cards";
import { Button, Chip, EmptyState, ErrorState } from "../components/ui";
import { ISearch } from "../components/Icons";
import { cn } from "../lib/cn";
import type { MediaItem } from "../lib/types";

type SubjectFilter = "ALL" | "MOVIE" | "TV_SERIES";

export function SearchPage() {
  const params = useParams();
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const q = sp.get("q") ?? "";
  const routeKind = params.kind; // MOVIE | TV_SERIES | trending | undefined

  const filter: SubjectFilter =
    (sp.get("kind") as SubjectFilter) ||
    (routeKind === "MOVIE" || routeKind === "TV_SERIES" ? routeKind : "ALL");

  const heading =
    q.trim() !== ""
      ? `Results for “${q}”`
      : routeKind === "MOVIE"
        ? "Movies"
        : routeKind === "TV_SERIES"
          ? "Series"
          : "New & Popular";
  useHead(
    q ? `${q} — Jagflix Search` : `${heading} — Jagflix`,
    q ? `Search results for ${q} on Jagflix.` : `Browse ${heading.toLowerCase()} on Jagflix.`,
  );

  const inputRef = useRef<HTMLInputElement>(null);

  const searching = q.trim().length > 0;

  const results = useInfiniteQuery({
    queryKey: ["search", q.trim(), filter],
    queryFn: ({ pageParam }) =>
      search({ query: q.trim(), subjectType: filter, page: pageParam, perPage: 24 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.nextPage : undefined),
    enabled: searching,
    staleTime: 60_000,
  });

  const trending = useQuery({
    queryKey: ["trending"],
    queryFn: () => getTrending(0, 24),
    staleTime: 10 * 60_000,
    enabled: !searching,
  });
  const hot = useQuery({ queryKey: ["hot"], queryFn: getHot, staleTime: 10 * 60_000, enabled: !searching });
  const popular = useQuery({ queryKey: ["popular"], queryFn: getPopularSearches, staleTime: 10 * 60_000 });

  const browseItems: MediaItem[] = useMemo(() => {
    if (searching) return [];
    const trend = trending.data ?? [];
    if (routeKind === "MOVIE")
      return [...(hot.data?.movies ?? []), ...trend.filter((i) => i.subjectType === "MOVIE")];
    if (routeKind === "TV_SERIES")
      return [...(hot.data?.series ?? []), ...trend.filter((i) => i.subjectType === "TV_SERIES")];
    return trend;
  }, [searching, trending.data, hot.data, routeKind]);

  // de-dupe browse items
  const deduped = useMemo(() => {
    const seen = new Set<string>();
    return browseItems.filter((i) => (seen.has(i.subjectId) ? false : (seen.add(i.subjectId), true)));
  }, [browseItems]);

  const flat = useMemo(() => (results.data?.pages ?? []).flatMap((p) => p.items), [results.data]);
  const total = results.data?.pages[0]?.totalCount;

  const setFilter = (f: SubjectFilter) => {
    const next = new URLSearchParams(sp);
    if (f === "ALL") next.delete("kind");
    else next.set("kind", f);
    setSp(next, { replace: true });
  };

  useEffect(() => {
    if (!searching && routeKind === undefined && !q) inputRef.current?.focus();
  }, [searching, routeKind, q]);

  return (
    <main className="mx-auto min-h-[80vh] w-full max-w-[1440px] px-4 pt-24 pb-28 sm:px-8 md:pb-16">
      {/* Search input */}
      <div className="glass mx-auto flex max-w-2xl items-center gap-3 rounded-2xl px-5 py-3.5 transition-shadow focus-within:shadow-(--shadow-neon)">
        <ISearch width={20} height={20} className="shrink-0 text-cyan" />
        <input
          ref={inputRef}
          defaultValue={q}
          key={q}
          placeholder="Search movies, series, actors…"
          className="w-full bg-transparent font-display text-base text-ink outline-none placeholder:text-ink-faint"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const v = (e.target as HTMLInputElement).value.trim();
              if (v) navigate(`/search?q=${encodeURIComponent(v)}`);
            }
          }}
        />
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(["ALL", "MOVIE", "TV_SERIES"] as SubjectFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "ring-focus cursor-pointer rounded-full px-4 py-1.5 font-display text-xs font-semibold tracking-[0.14em] uppercase transition-all",
              filter === f
                ? "bg-accent-gradient text-white shadow-(--shadow-neon)"
                : "border border-hairline text-ink-dim hover:text-ink",
            )}
          >
            {f === "ALL" ? "All" : f === "MOVIE" ? "Movies" : "Series"}
          </button>
        ))}
        {!searching && (
          <span className="ml-auto hidden items-center gap-2 sm:flex">
            {(popular.data ?? []).slice(0, 5).map((w) => (
              <button key={w} onClick={() => navigate(`/search?q=${encodeURIComponent(w)}`)} className="cursor-pointer">
                <Chip className="transition-colors hover:border-cyan/50 hover:text-cyan">{w}</Chip>
              </button>
            ))}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="mt-8">
        {searching ? (
          results.isError ? (
            <ErrorState onRetry={() => results.refetch()} />
          ) : flat.length === 0 && results.isLoading ? (
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="skeleton aspect-[2/3] rounded-xl" />
              ))}
            </div>
          ) : flat.length === 0 ? (
            <EmptyState title={`Nothing found for “${q}”`} hint="Try another title, or browse trending below." />
          ) : (
            <>
              <div className="mb-4 text-sm text-ink-faint">
                {typeof total === "number" && total > 0 ? `${total} titles` : `${flat.length} titles`}
              </div>
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                {flat.map((it, i) => (
                  <PosterCard key={it.subjectId} item={it} index={i % 6} className="w-full sm:w-full md:w-full" />
                ))}
              </div>
              {results.hasNextPage && (
                <div className="mt-8 flex justify-center">
                  <Button variant="glass" onClick={() => results.fetchNextPage()} disabled={results.isFetchingNextPage} className="px-8 py-3">
                    {results.isFetchingNextPage ? "Loading…" : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )
        ) : trending.isLoading && hot.isLoading ? (
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[2/3] rounded-xl" />
            ))}
          </div>
        ) : trending.isError && hot.isError ? (
          <ErrorState onRetry={() => { trending.refetch(); hot.refetch(); }} />
        ) : (
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {deduped.map((it, i) => (
              <PosterCard key={it.subjectId} item={it} index={i % 6} className="w-full sm:w-full md:w-full" />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
