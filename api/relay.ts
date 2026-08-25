/* Jagflix own media relay.
   The MovieBox video CDN 429s non-whitelisted clients; the official apps
   identify themselves with app User-Agents a browser is not allowed to set.
   This serverless relay re-issues the request with those identities and
   streams the bytes back same-origin (CORS-safe, Range-passthrough).
   Only whitelisted upstream CDN hosts may be relayed (no open proxy). */

const ALLOWED_HOSTS = ["hakunaymatata.com", "aoneroom.com"];

const HEADER_SETS: Record<string, Record<string, string>> = {
  app: { "user-agent": "MovieBox/3.0.0.2 (Linux; U; Android 13; en_US) MovieBox/3.0.0.2" },
  okhttp: { "user-agent": "okhttp/4.12.0" },
  exo: { "user-agent": "ExoPlayerLib/2.19.1 (Linux; Android 13) MovieBox" },
  dalvik: { "user-agent": "Dalvik/2.1.0 (Linux; U; Android 13; sdk_gphone64_arm64)" },
  web: {
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    referer: "https://themoviebox.xyz/",
  },
};

export const config = { maxDuration: 30 };

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Range");
  res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");
  res.setHeader("Accept-Ranges", "bytes");

  const url = String(req.query?.url ?? "");
  const hs = String(req.query?.hs ?? "app");
  if (!url) {
    res.status(400).json({ error: "url required" });
    return;
  }
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    res.status(400).json({ error: "bad url" });
    return;
  }
  if (!ALLOWED_HOSTS.some((h) => target.hostname === h || target.hostname.endsWith("." + h))) {
    res.status(403).json({ error: "host not relayable" });
    return;
  }

  const headers: Record<string, string> = { ...(HEADER_SETS[hs] ?? HEADER_SETS.app) };
  const range = req.headers.range;
  if (range) headers.range = String(range);

  try {
    const upstream = await fetch(target.href, { headers, redirect: "follow" });
    if (!upstream.ok || !upstream.body) {
      // surface upstream refusal so the player ladder keeps climbing
      res.setHeader("x-upstream-status", String(upstream.status));
      res.status(upstream.status === 429 ? 426 : upstream.status).end();
      return;
    }

    const ct = upstream.headers.get("content-type");
    if (ct) res.setHeader("content-type", ct);
    const cl = upstream.headers.get("content-length");
    if (cl) res.setHeader("content-length", cl);
    const cr = upstream.headers.get("content-range");
    if (cr) res.setHeader("content-range", cr);
    res.setHeader("cache-control", "public, max-age=300");
    res.setHeader("x-upstream-status", String(upstream.status));
    res.status(upstream.status);

    const reader = (upstream.body as any).getReader();
    req.on("aborted", () => reader.cancel().catch(() => undefined));
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const ok = res.write(Buffer.from(value));
      if (!ok) await new Promise((r) => res.once("drain", r));
    }
    res.end();
  } catch {
    if (!res.headersSent) res.status(502);
    res.end();
  }
}
