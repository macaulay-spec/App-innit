import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getItemDetails, getMedia } from "../lib/api";
import { addDownload, getResume, saveProgress } from "../lib/store";
import { useHead } from "../hooks/useHead";
import { Player } from "../player/Player";
import { Button, EmptyState, ErrorState } from "../components/ui";
import { IDownload, IInfo } from "../components/Icons";
import { formatBytes } from "../lib/format";
import { cn } from "../lib/cn";

export function WatchPage() {
  const { subjectId = "" } = useParams();
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();

  const details = useQuery({
    queryKey: ["details", subjectId],
    queryFn: () => getItemDetails(subjectId),
    staleTime: 5 * 60_000,
  });

  const isSeries = details.data?.isSeries ?? false;
  const seasons = details.data?.seasons ?? [];

  const requestedSeason = Number(sp.get("season")) || 0;
  const requestedEpisode = Number(sp.get("episode")) || 0;

  const season = isSeries
    ? (seasons.some((s) => s.se === requestedSeason) ? requestedSeason : seasons[0]?.se) || 1
    : 0;
  const episode = isSeries
    ? (seasons.find((s) => s.se === season)?.episodes.includes(requestedEpisode)
        ? requestedEpisode
        : seasons.find((s) => s.se === season)?.episodes[0]) || 1
    : 0;

  const detailPath = details.data?.item.detailPath ?? "";
  const title = details.data?.item.title ?? "";

  const media = useQuery({
    queryKey: ["media", subjectId, detailPath, season, episode],
    queryFn: () =>
      getMedia({ subjectId, detailPath, season, episode, title }),
    enabled: Boolean(detailPath),
    staleTime: 60_000, // signed URLs expire — keep short
    refetchOnMount: "always",
  });

  useHead(
    title
      ? `${title}${isSeries ? ` S${season}E${episode}` : ""} — Jagflix`
      : "Watching — Jagflix",
    `Stream ${title || "video"} on Jagflix.`,
  );

  const resume = getResume(subjectId, season, episode);

  const activeSeason = seasons.find((s) => s.se === season);
  const epList = activeSeason?.episodes ?? [];
  const epIdx = epList.indexOf(episode);
  const nextEp = epIdx >= 0 && epIdx < epList.length - 1 ? epList[epIdx + 1] : undefined;

  const [downloaded, setDownloaded] = useState<string | null>(null);

  const startDownload = (i: number) => {
    const src = media.data?.sources[i];
    if (!src) return;
    addDownload({
      id: `${subjectId}-${season}-${episode}-${src.resolution}`,
      title: isSeries ? `${title} S${season}E${episode}` : title,
      posterUrl: details.data?.item.poster?.url,
      quality: `${src.resolution}p`,
      sizeBytes: src.sizeBytes,
      streamUrl: src.streamUrl,
      downloadUrl: src.downloadUrl,
      addedAt: Date.now(),
      subjectId,
      season: isSeries ? season : undefined,
      episode: isSeries ? episode : undefined,
    });
    setDownloaded(src.downloadUrl);
    window.setTimeout(() => setDownloaded(null), 1500);
    // trigger the actual attachment download in a new tab
    const a = document.createElement("a");
    a.href = src.downloadUrl;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  useEffect(() => {
    // hide page scroll feel while watching
    window.scrollTo(0, 0);
  }, []);

  if (details.isError) {
    return (
      <main className="mx-auto max-w-xl px-4 pt-28">
        <ErrorState onRetry={() => details.refetch()} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black/60">
      <div className="mx-auto max-w-[1200px] px-0 pt-0 sm:px-6 sm:pt-20">
        {media.isLoading || details.isLoading ? (
          <div className="skeleton aspect-video w-full sm:rounded-2xl" />
        ) : media.isError ? (
          <div className="pt-24">
            <ErrorState onRetry={() => media.refetch()} />
          </div>
        ) : !media.data?.hasResource ? (
          <div className="pt-24">
            <EmptyState
              title="This selection isn't available"
              hint={
                isSeries
                  ? `No resource for S${season}E${episode}. Try another episode.`
                  : "The upstream provider has no playable resource for this title."
              }
            />
          </div>
        ) : (
          <Player
            key={`${season}-${episode}`}
            sources={media.data!.sources}
            captions={media.data!.captions}
            title={title}
            episodeLabel={isSeries ? `S${season} · E${episode}` : undefined}
            resumeAt={resume?.t}
            onBack={() => navigate(`/title/${subjectId}`)}
            onProgress={(t, d) => {
              if (!details.data) return;
              saveProgress({
                subjectId,
                detailPath,
                title,
                posterUrl: details.data.item.poster?.url,
                blurHash: details.data.item.poster?.blurHash,
                season,
                episode,
                t,
                duration: d,
                updatedAt: Date.now(),
                kind: isSeries ? "TV_SERIES" : "MOVIE",
              });
            }}
            onRefreshMedia={() => media.refetch()}
            onNext={
              nextEp
                ? () => navigate(`/watch/${subjectId}?season=${season}&episode=${nextEp}`)
                : undefined
            }
            onEnded={() => {
              if (nextEp) navigate(`/watch/${subjectId}?season=${season}&episode=${nextEp}`);
            }}
          />
        )}

        {/* meta row under player */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-5 pb-28 sm:px-0 md:pb-8">
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg font-semibold text-ink">
              {title || "…"}
              {isSeries && <span className="ml-2 text-ink-dim">S{season} · E{episode}</span>}
            </h1>
            <Link to={`/title/${subjectId}`} className="mt-1 inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-cyan">
              <IInfo width={13} height={13} /> View details
            </Link>
          </div>

          {/* quality / download table */}
          {media.data && media.data.sources.length > 0 && (
            <div className="glass w-full rounded-2xl p-4 sm:w-auto">
              <div className="mb-2 font-display text-[10px] font-semibold tracking-[0.2em] text-ink-faint uppercase">
                Download
              </div>
              <div className="flex flex-wrap gap-2">
                {media.data.sources.map((s, i) => (
                  <button
                    key={s.id + s.resolution}
                    onClick={() => startDownload(i)}
                    className={cn(
                      "ring-focus flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1.5 font-display text-xs transition-colors",
                      downloaded === s.downloadUrl
                        ? "border-success/60 text-success"
                        : "border-hairline-strong text-ink-dim hover:border-cyan/60 hover:text-cyan",
                    )}
                  >
                    <IDownload width={13} height={13} />
                    {s.resolution}p
                    <span className="text-[10px] text-ink-faint">{formatBytes(s.sizeBytes)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* episode strip */}
        {isSeries && epList.length > 0 && (
          <div className="px-4 pb-28 sm:px-0 md:pb-16">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold tracking-[0.18em] text-ink uppercase">
                Season {season}
              </h2>
              <div className="no-scrollbar flex max-w-[60%] gap-1.5 overflow-x-auto">
                {seasons.map((s) => (
                  <button
                    key={s.se}
                    onClick={() => {
                      const first = s.episodes[0] ?? 1;
                      setSp({ season: String(s.se), episode: String(first) });
                    }}
                    className={cn(
                      "shrink-0 cursor-pointer rounded-lg px-3 py-1.5 font-display text-xs font-semibold transition-all",
                      s.se === season
                        ? "bg-accent-gradient text-white"
                        : "border border-hairline text-ink-dim hover:text-ink",
                    )}
                  >
                    S{s.se}
                  </button>
                ))}
              </div>
            </div>
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
              {epList.map((ep) => (
                <button
                  key={ep}
                  onClick={() => setSp({ season: String(season), episode: String(ep) })}
                  className={cn(
                    "ring-focus shrink-0 cursor-pointer rounded-xl border px-4 py-2.5 font-display text-sm transition-all",
                    ep === episode
                      ? "border-cyan/70 bg-cyan/10 text-cyan shadow-(--shadow-neon)"
                      : "border-hairline text-ink-dim hover:border-hairline-strong hover:text-ink",
                  )}
                >
                  E{ep}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
