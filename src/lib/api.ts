import type {
  Caption,
  Homepage,
  HeroEntry,
  ImageRef,
  MediaItem,
  Playback,
  PlaybackSource,
  RailGroup,
  SearchResult,
  Season,
  Star,
  TitleDetails,
} from "./types";

/* ------------------------------------------------------------------ */
/* Transport — browser-direct: the API reflects Origin (CORS) and     */
/* accepts ?apikey= query auth. Media always flows through /api/proxy */
/* which ships access-control-allow-origin: *.                        */
/* ------------------------------------------------------------------ */

export const BASE = "https://api.zstlab.cyou";
const KEY = "zst_sxWpWzOBNhkz3ev6wlnZIkShU3PC0NxJ6AVjOIzp";

export const PROXY = `${BASE}/api/proxy`;
export const PROXY_DOWNLOAD = `${BASE}/api/proxy-download`;

/** Wrap a RAW signed CDN url into the CORS-safe, Range-capable streaming proxy. */
export const toStream = (raw: string) => `${PROXY}?url=${encodeURIComponent(raw)}`;

/** Wrap a RAW url into the attachment-flavoured download proxy. */
export const toDownload = (raw: string, name: string, quality: string) =>
  `${PROXY_DOWNLOAD}?url=${encodeURIComponent(raw)}&name=${encodeURIComponent(name)}&quality=${encodeURIComponent(quality)}`;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function call(path: string, params: Record<string, string | number | undefined> = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  qs.set("apikey", KEY);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}?${qs.toString()}`, { headers: { accept: "application/json" } });
  } catch {
    throw new ApiError(0, "network");
  }
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = j?.error || msg;
    } catch {
      /* noop */
    }
    throw new ApiError(res.status, msg);
  }
  const json = await res.json();
  if (json?.status === false) throw new ApiError(json.statusCode ?? 500, json.error ?? "API error");
  return json;
}

/* ------------------------------------------------------------------ */
/* Normalizers                                                        */
/* ------------------------------------------------------------------ */

function img(raw: any): ImageRef | undefined {
  if (!raw || typeof raw.url !== "string" || !raw.url) return undefined;
  return {
    url: raw.url,
    blurHash: raw.blurHash ?? null,
    avgHueDark: raw.avgHueDark ?? null,
    avgHueLight: raw.avgHueLight ?? null,
    width: raw.width,
    height: raw.height,
  };
}

export function normalizeItem(raw: any): MediaItem | null {
  const s = raw?.subject ?? raw;
  if (!s || s.subjectId === undefined || s.subjectId === null) return null;
  const releaseDate: string | undefined = s.releaseDate || undefined;
  return {
    subjectId: String(s.subjectId),
    subjectType: Number(s.subjectType) === 2 ? "TV_SERIES" : "MOVIE",
    title: s.title || "Untitled",
    description: s.description || "",
    releaseDate,
    year: releaseDate ? releaseDate.slice(0, 4) : undefined,
    genres:
      typeof s.genre === "string" && s.genre
        ? s.genre.split(",").map((g: string) => g.trim()).filter(Boolean)
        : [],
    country: s.countryName || undefined,
    rating: s.imdbRatingValue ? Number.parseFloat(s.imdbRatingValue) || null : null,
    ratingCount: Number(s.imdbRatingCount) || 0,
    poster: img(s.cover),
    backdrop: img(s.stills),
    detailPath: s.detailPath ?? "",
    hasResource: s.hasResource !== false,
    durationSec: Number(s.duration) > 0 ? Number(s.duration) : undefined,
    subtitles:
      typeof s.subtitles === "string" && s.subtitles
        ? s.subtitles.split(",").map((t: string) => t.trim()).filter(Boolean)
        : [],
    postTitle: s.postTitle || undefined,
  };
}

function normalizeList(raw: any[]): MediaItem[] {
  const out: MediaItem[] = [];
  for (const r of raw ?? []) {
    const it = normalizeItem(r);
    if (it) out.push(it);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Endpoints                                                          */
/* ------------------------------------------------------------------ */

export async function getHomepage(): Promise<Homepage> {
  const json = await call("/api/homepage");
  const data = json?.data ?? {};
  const hero: HeroEntry[] = [];
  const rails: RailGroup[] = [];

  for (const entry of data.operatingList ?? []) {
    if (entry?.type === "BANNER" && Array.isArray(entry?.banner?.items)) {
      for (const b of entry.banner.items) {
        const item = normalizeItem(b);
        if (item) hero.push({ item, backdrop: img(b.image) ?? item.backdrop });
      }
    } else if (Array.isArray(entry?.subjects) && entry.subjects.length) {
      const items = normalizeList(entry.subjects);
      if (items.length) rails.push({ title: entry.title || "For You", items });
    }
  }
  for (const group of data.homeList ?? []) {
    const items = normalizeList(group?.list ?? group?.subjects ?? []);
    if (items.length) rails.push({ title: group?.title ?? group?.name ?? "Discover", items });
  }

  return {
    hero,
    rails,
    platforms: (data.platformList ?? []).map((p: any) => ({ name: p?.name })).filter((p: any) => p.name),
  };
}

export async function getHot(): Promise<{ movies: MediaItem[]; series: MediaItem[] }> {
  const json = await call("/api/hot-movies-series");
  return {
    movies: normalizeList(json?.data?.movie ?? []),
    series: normalizeList(json?.data?.series ?? []),
  };
}

export async function getTrending(page = 0, perPage = 24): Promise<MediaItem[]> {
  const json = await call("/api/trending", { page, perPage });
  return normalizeList(json?.data?.subjectList ?? []);
}

export async function getPopularSearches(): Promise<string[]> {
  const json = await call("/api/popular-searches");
  return (json?.data?.everyoneSearch ?? []).map((e: any) => e?.title).filter(Boolean);
}

export async function getSuggestions(query: string): Promise<{ word: string; type: number }[]> {
  const json = await call("/api/search-suggestion", { query, per_page: 8 });
  return (json?.data?.items ?? [])
    .map((i: any) => ({ word: i?.word ?? i?.subject?.title ?? "", type: Number(i?.type) || 0 }))
    .filter((i: any) => i.word);
}

export async function search(opts: {
  query: string;
  subjectType?: "ALL" | "MOVIE" | "TV_SERIES";
  page?: number;
  perPage?: number;
}): Promise<SearchResult> {
  const json = await call("/api/search", {
    query: opts.query,
    subjectType: opts.subjectType ?? "ALL",
    page: opts.page ?? 1,
    perPage: opts.perPage ?? 24,
  });
  const pager = json?.data?.pager ?? {};
  return {
    items: normalizeList(json?.data?.items ?? []),
    hasMore: pager.hasMore === true,
    nextPage: Number(pager.nextPage) || (opts.page ?? 1) + 1,
    totalCount: Number(pager.totalCount) || 0,
  };
}

export async function getItemDetails(subjectId: string): Promise<TitleDetails> {
  const json = await call("/api/item-details", { subjectId });
  const data = json?.data ?? {};
  const item = normalizeItem(data.subject ?? { subjectId });
  if (!item) throw new ApiError(404, "Title not found");

  const stars: Star[] = (data.stars ?? [])
    .map((s: any) => ({
      name: s?.name ?? "",
      character: s?.character ?? "",
      avatarUrl: s?.avatarUrl ?? s?.avatar?.url,
    }))
    .filter((s: Star) => s.name);

  const seasons: Season[] = (data.seasons ?? [])
    .map((s: any) => ({
      se: Number(s?.se) || 0,
      maxEp: Number(s?.maxEp) || 0,
      episodes: String(s?.allEp ?? "")
        .split(",")
        .map((n: string) => Number(n))
        .filter((n: number) => Number.isFinite(n) && n > 0),
    }))
    .filter((s: Season) => s.se > 0);

  const trailerRaw =
    data.subject?.trailer?.videoAddress?.url ?? data.trailer?.videoAddress?.url ?? null;

  return {
    item,
    stars,
    seasons,
    seasonCount: Number(data.seasonCount) || seasons.length,
    isSeries: data.isSeries === true || Number(data.subject?.subjectType) === 2,
    trailerUrl: typeof trailerRaw === "string" && trailerRaw ? toStream(trailerRaw) : null,
    watchTimeLimit: Number(data.watchTimeLimit) || undefined,
  };
}

export async function getRecommendations(subjectId: string): Promise<MediaItem[]> {
  const json = await call("/api/recommendations", { subjectId, page: 1, perPage: 18 });
  return normalizeList(json?.data?.items ?? []).filter((i) => i.subjectId !== subjectId);
}

/**
 * The media normalizer — heart of the app.
 * Merges downloads[] (pre-built proxied urls, numeric resolution), the
 * subtitles-section mirror (same shape, different signatures) and
 * stream.streams[] (raw urls only, string resolutions). Dedupes by
 * resolution, sorts descending, and builds an ordered candidate ladder
 * per resolution: proxied primary -> proxied mirrors -> proxied raws ->
 * direct raw CDN (real-browser attempt) -> alternate-host variants.
 */
export async function getMedia(opts: {
  subjectId: string;
  detailPath: string;
  season?: number;
  episode?: number;
  title?: string;
}): Promise<Playback> {
  const json = await call("/api/media", {
    subjectId: opts.subjectId,
    detailPath: opts.detailPath,
    season: opts.season ?? 0,
    episode: opts.episode ?? 0,
  });
  const data = json?.data ?? {};
  const dlData = data?.downloads?.data ?? {};
  const mirrorData = data?.subtitles?.data ?? {};
  const stData = data?.stream?.data ?? {};
  const title = opts.title ?? "video";

  interface Bucket {
    id: string;
    resolution: number;
    sizeBytes?: number;
    format: string;
    codec?: string;
    durationSec?: number;
    downloadUrl?: string;
    proxied: string[];
    raw: string[];
  }
  const buckets = new Map<number, Bucket>();
  const bucket = (res: number, id: string): Bucket => {
    let b = buckets.get(res);
    if (!b) {
      b = { id, resolution: res, format: "MP4", proxied: [], raw: [] };
      buckets.set(res, b);
    }
    return b;
  };

  const ALT_HOSTS = [
    "bcdnw.hakunaymatata.com",
    "valiw.hakunaymatata.com",
    "vacdn.hakunaymatata.com",
    "vgorigin.hakunaymatata.com",
  ];
  const altHostVariants = (raw: string): string[] => {
    try {
      const u = new URL(raw);
      return ALT_HOSTS.filter((h) => h !== u.host).map((h) => `${u.protocol}//${h}${u.pathname}${u.search}`);
    } catch {
      return [];
    }
  };

  for (const d of dlData.downloads ?? []) {
    const res = Number(d?.resolution) || 0;
    if (!d?.url && !d?.streamUrl) continue;
    const b = bucket(res, String(d?.id ?? res));
    if (d.streamUrl) b.proxied.push(String(d.streamUrl));
    if (d.url) b.raw.push(String(d.url));
    b.downloadUrl = d?.downloadUrl
      ? String(d.downloadUrl)
      : d?.url
        ? toDownload(String(d.url), title, `${res}p`)
        : b.downloadUrl;
    b.sizeBytes = b.sizeBytes ?? (d?.size ? Number(d.size) : undefined);
  }

  // mirror section: same content, different signatures
  for (const d of mirrorData.downloads ?? []) {
    const res = Number(d?.resolution) || 0;
    if (!d?.url) continue;
    const b = bucket(res, String(d?.id ?? res));
    b.raw.push(String(d.url));
    b.downloadUrl = b.downloadUrl ?? toDownload(String(d.url), title, `${res}p`);
    b.sizeBytes = b.sizeBytes ?? (d?.size ? Number(d.size) : undefined);
  }

  for (const s of stData.streams ?? []) {
    const res = Number(s?.resolutions) || 0;
    if (!s?.url) continue;
    const b = bucket(res, String(s?.id ?? res));
    b.raw.push(String(s.url));
    b.durationSec = Number(s?.duration) || b.durationSec;
    b.codec = s?.codecName ?? b.codec;
    b.format = s?.format ?? b.format;
    b.sizeBytes = b.sizeBytes ?? (s?.size ? Number(s.size) : undefined);
    b.downloadUrl = b.downloadUrl ?? toDownload(String(s.url), title, `${res}p`);
  }

  const sources: PlaybackSource[] = [...buckets.values()]
    .map((b) => {
      const proxiedRaws = b.raw.map((r) => toStream(r));
      const directAlts = b.raw.flatMap((r) => [r, ...altHostVariants(r)]);
      const proxiedAlts = directAlts.map((r) => toStream(r));
      const candidates = dedupe([
        ...b.proxied,
        ...proxiedRaws,
        ...directAlts,
        ...proxiedAlts,
      ]).slice(0, 10);
      return {
        id: b.id,
        resolution: b.resolution,
        sizeBytes: b.sizeBytes,
        format: b.format,
        codec: b.codec,
        durationSec: b.durationSec,
        candidates,
        streamUrl: candidates[0] ?? "",
        downloadUrl: b.downloadUrl ?? (b.raw[0] ? toDownload(b.raw[0], title, `${b.resolution}p`) : ""),
      };
    })
    .filter((s) => s.candidates.length > 0)
    .sort((a, b) => b.resolution - a.resolution);

  const rawCaptions = dlData.captions?.length ? dlData.captions : (mirrorData.captions ?? []);
  const captions: Caption[] = (rawCaptions ?? [])
    .filter((c: any) => c?.url)
    .map((c: any) => ({
      lang: String(c?.lan ?? "und"),
      label: String(c?.lanName ?? c?.lan ?? "Unknown"),
      url: toStream(String(c.url)),
    }));

  const hasResource =
    (dlData.hasResource === true || stData.hasResource === true) && sources.length > 0;

  return { sources, captions, hasResource };
}

function dedupe(list: string[]): string[] {
  const seen = new Set<string>();
  return list.filter((x) => (seen.has(x) ? false : (seen.add(x), true)));
}
