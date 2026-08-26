/* In-app download manager: streams through the proven proxy-download
   lane with live progress, persists the result to IndexedDB. No tabs. */
import { addDownload, removeDownload, updateDownload } from "./store";
import { saveBlob, deleteBlob } from "./files";
import type { DownloadEntry } from "./types";

const controllers = new Map<string, AbortController>();

export function isDownloadRunning(id: string) {
  return controllers.has(id);
}

export async function startManagedDownload(
  entry: Omit<DownloadEntry, "status" | "received" | "total" | "addedAt">,
) {
  const id = entry.id;
  if (controllers.has(id)) return;
  addDownload({ ...entry, addedAt: Date.now(), status: "active", received: 0, total: 0 });

  const ctrl = new AbortController();
  controllers.set(id, ctrl);
  try {
    // try each url in order: our relay first, proven lanes as fallback
    const urls = [entry.downloadUrl, entry.streamUrl].filter(
      (u, i, a) => u && a.indexOf(u) === i,
    );
    let res: Response | null = null;
    for (const u of urls) {
      try {
        const r = await fetch(u, { signal: ctrl.signal });
        if (r.ok && r.body) {
          res = r;
          break;
        }
      } catch {
        /* try next */
      }
    }
    if (!res) throw new Error("all download urls failed");
    if (!res.body) throw new Error("no body");
    const total = Number(res.headers.get("content-length")) || entry.sizeBytes || 0;
    const reader = res.body.getReader();
    const chunks: BlobPart[] = [];
    let received = 0;
    let lastEmit = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value as BlobPart);
      received += value.byteLength;
      const now = Date.now();
      if (now - lastEmit > 500) {
        lastEmit = now;
        updateDownload(id, { received, total, status: "active" });
      }
    }
    const blob = new Blob(chunks, { type: "video/mp4" });
    await saveBlob(id, blob);
    updateDownload(id, { status: "done", received, total: received, sizeBytes: received });
  } catch (e: any) {
    if (e?.name === "AbortError") {
      removeDownload(id);
      deleteBlob(id).catch(() => undefined);
    } else {
      updateDownload(id, { status: "error" });
    }
  } finally {
    controllers.delete(id);
  }
}

export function cancelManagedDownload(id: string) {
  controllers.get(id)?.abort();
  controllers.delete(id);
  removeDownload(id);
  deleteBlob(id).catch(() => undefined);
}
