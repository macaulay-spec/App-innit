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
    const res = await fetch(entry.downloadUrl, { signal: ctrl.signal });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
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
