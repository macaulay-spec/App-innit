import { useSyncExternalStore } from "react";
import type { DownloadEntry, MediaItem, MyListEntry, ProgressEntry } from "./types";

/* Tiny reactive localStorage layer ---------------------------------- */

let version = 0;
const listeners = new Set<() => void>();
function emit() {
  version++;
  listeners.forEach((l) => l());
}
if (typeof window !== "undefined") {
  window.addEventListener("storage", emit);
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export function useStoreVersion() {
  return useSyncExternalStore(subscribe, () => version);
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    emit();
  } catch {
    /* storage full / private mode */
  }
}

/* My List ------------------------------------------------------------ */

const MYLIST_KEY = "jagflix:mylist";

export function getMyList(): MyListEntry[] {
  return read<MyListEntry[]>(MYLIST_KEY, []);
}
export function inMyList(subjectId: string): boolean {
  return getMyList().some((e) => e.item.subjectId === subjectId);
}
export function toggleMyList(item: MediaItem): boolean {
  const list = getMyList();
  const exists = list.some((e) => e.item.subjectId === item.subjectId);
  write(
    MYLIST_KEY,
    exists
      ? list.filter((e) => e.item.subjectId !== item.subjectId)
      : [{ item, addedAt: Date.now() }, ...list],
  );
  return !exists;
}
export function useMyList(): MyListEntry[] {
  useStoreVersion();
  return getMyList();
}

/* Continue watching / resume ------------------------------------------ */

const PROGRESS_KEY = "jagflix:progress";

export function getProgress(): ProgressEntry[] {
  return read<ProgressEntry[]>(PROGRESS_KEY, []);
}
export function getResume(subjectId: string, season: number, episode: number): ProgressEntry | undefined {
  return getProgress().find(
    (p) => p.subjectId === subjectId && p.season === season && p.episode === episode,
  );
}
export function saveProgress(entry: ProgressEntry) {
  const list = getProgress().filter(
    (p) => !(p.subjectId === entry.subjectId && p.season === entry.season && p.episode === entry.episode),
  );
  write(PROGRESS_KEY, [entry, ...list].slice(0, 24));
}
export function clearProgress(subjectId: string, season: number, episode: number) {
  write(
    PROGRESS_KEY,
    getProgress().filter(
      (p) => !(p.subjectId === subjectId && p.season === season && p.episode === episode),
    ),
  );
}
export function useContinueWatching(): ProgressEntry[] {
  useStoreVersion();
  return getProgress();
}

/* Downloads registry --------------------------------------------------- */

const DL_KEY = "jagflix:downloads";

export function getDownloads(): DownloadEntry[] {
  return read<DownloadEntry[]>(DL_KEY, []);
}
export function addDownload(entry: DownloadEntry) {
  const list = getDownloads().filter((d) => d.id !== entry.id);
  write(DL_KEY, [entry, ...list]);
}
export function removeDownload(id: string) {
  write(DL_KEY, getDownloads().filter((d) => d.id !== id));
}
export function useDownloads(): DownloadEntry[] {
  useStoreVersion();
  return getDownloads();
}
