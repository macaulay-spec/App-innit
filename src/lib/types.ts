export type SubjectType = "MOVIE" | "TV_SERIES";

export interface ImageRef {
  url: string;
  blurHash: string | null;
  avgHueDark: string | null;
  avgHueLight: string | null;
  width?: number;
  height?: number;
}

export interface MediaItem {
  subjectId: string;
  subjectType: SubjectType;
  title: string;
  description: string;
  releaseDate?: string;
  year?: string;
  genres: string[];
  country?: string;
  rating: number | null;
  ratingCount?: number;
  poster?: ImageRef;
  backdrop?: ImageRef;
  detailPath: string;
  hasResource: boolean;
  durationSec?: number;
  subtitles: string[];
  postTitle?: string;
}

export interface Star {
  name: string;
  character: string;
  avatarUrl?: string;
}

export interface Season {
  se: number;
  maxEp: number;
  episodes: number[];
}

export interface TitleDetails {
  item: MediaItem;
  stars: Star[];
  seasons: Season[];
  seasonCount: number;
  isSeries: boolean;
  trailerUrl: string | null;
  watchTimeLimit?: number;
}

export interface PlaybackSource {
  id: string;
  resolution: number;
  sizeBytes?: number;
  /** Ordered ladder of playable URLs for this resolution. */
  candidates: string[];
  streamUrl: string;
  downloadUrl: string;
  format: string;
  codec?: string;
  durationSec?: number;
}

export interface Caption {
  lang: string;
  label: string;
  url: string;
}

export interface Playback {
  sources: PlaybackSource[];
  captions: Caption[];
  hasResource: boolean;
}

export interface HeroEntry {
  item: MediaItem;
  backdrop?: ImageRef;
}

export interface RailGroup {
  title: string;
  items: MediaItem[];
}

export interface Homepage {
  hero: HeroEntry[];
  rails: RailGroup[];
  platforms: { name: string }[];
}

export interface SearchResult {
  items: MediaItem[];
  hasMore: boolean;
  nextPage: number;
  totalCount: number;
}

export interface ProgressEntry {
  subjectId: string;
  detailPath: string;
  title: string;
  posterUrl?: string;
  blurHash?: string | null;
  season: number;
  episode: number;
  t: number;
  duration: number;
  updatedAt: number;
  kind: SubjectType;
}

export interface MyListEntry {
  item: MediaItem;
  addedAt: number;
}

export interface DownloadEntry {
  id: string;
  title: string;
  posterUrl?: string;
  quality: string;
  sizeBytes?: number;
  streamUrl: string;
  downloadUrl: string;
  addedAt: number;
  subjectId: string;
  season?: number;
  episode?: number;
}
