/* Jagflix stream relay — hardened per stabilization spec:
   1. keep-alive connection pools (http/https agents)
   2. manual URL extraction from req.url (nested &sign= &t= safe)
   3. Referer + desktop UA spoofing; Range/If-Range/If-None-Match forwarding;
      Content-Range/Content-Length/ETag/Last-Modified pass-back
   4. manual redirect following (301/302/303/307/308, max 5, relative-safe)
   5. graceful upstream failure (clean 426 -> player ladder climbs; no crash)
   6. &mode=download injects Content-Disposition attachment
   7. req close -> destroy upstream (no leaked CDN drains)
   Host-allowlisted to the MovieBox CDN domains (not an open proxy). */
import http from "http";
import https from "https";

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 512,
  maxFreeSockets: 64,
  timeout: 60000,
});
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 512,
  maxFreeSockets: 64,
  timeout: 60000,
});

const ALLOWED = ["hakunaymatata.com", "aoneroom.com"];

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const HS: Record<string, Record<string, string>> = {
  web: {
    "user-agent": DESKTOP_UA,
    referer: "https://themoviebox.xyz/",
    origin: "https://themoviebox.xyz",
  },
  app: { "user-agent": "MovieBox/3.0.0.2 (Linux; U; Android 13; en_US) MovieBox/3.0.0.2" },
  okhttp: { "user-agent": "okhttp/4.12.0" },
  exo: { "user-agent": "ExoPlayerLib/2.19.1 (Linux; Android 13) MovieBox" },
};

export const config = { maxDuration: 30 };

/* manual query extraction — survives nested query params intact */
function q(reqUrl: string, name: string): string {
  const m = reqUrl.match(new RegExp("[?&]" + name + "=([^&]+)"));
  return m ? decodeURIComponent(m[1].replace(/\+/g, "%20")) : "";
}

function open(target: URL, headers: Record<string, string>): Promise<http.IncomingMessage> {
  const mod = target.protocol === "http:" ? http : https;
  return new Promise((resolve, reject) => {
    const r = mod.request(
      target,
      { agent: target.protocol === "http:" ? httpAgent : httpsAgent, headers, timeout: 6000 },
      (res) => resolve(res),
    );
    // fail fast: a blackholed CDN connection must not stall the ladder
    r.on("timeout", () => {
      r.destroy(new Error("upstream timeout"));
    });
    r.on("error", reject);
    r.end();
  });
}

async function follow(
  target: URL,
  headers: Record<string, string>,
  hops = 0,
): Promise<http.IncomingMessage> {
  const res = await open(target, headers);
  if (
    hops < 5 &&
    res.statusCode &&
    [301, 302, 303, 307, 308].includes(res.statusCode) &&
    res.headers.location
  ) {
    const next = new URL(res.headers.location, target);
    res.resume();
    return follow(next, headers, hops + 1);
  }
  return res;
}

export default async function handler(req: http.IncomingMessage, res: http.ServerResponse) {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "Range, If-Range, If-None-Match");
  res.setHeader("access-control-expose-headers", "Content-Length, Content-Range, Accept-Ranges, ETag, Last-Modified");
  res.setHeader("accept-ranges", "bytes");

  const rawUrl = q(req.url ?? "", "url");
  if (!rawUrl) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "url required" }));
    return;
  }
  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "bad url" }));
    return;
  }
  if (!ALLOWED.some((h) => target.hostname === h || target.hostname.endsWith("." + h))) {
    res.statusCode = 403;
    res.end(JSON.stringify({ error: "host not relayable" }));
    return;
  }

  const identity = HS[q(req.url ?? "", "hs") || "web"] ?? HS.web;
  const mode = q(req.url ?? "", "mode");
  const name = q(req.url ?? "", "name") || "jagflix";

  const headers: Record<string, string> = { ...identity, accept: "*/*" };
  for (const h of ["range", "if-range", "if-none-match"] as const) {
    const v = req.headers[h];
    if (v) headers[h] = Array.isArray(v) ? v.join(",") : v;
  }

  try {
    const up = await follow(target, headers);
    const status = up.statusCode ?? 502;

    if (status >= 400) {
      up.resume();
      // clean signal so the player ladder climbs; never raw CDN garbage
      res.statusCode = status === 429 || status === 403 ? 426 : status;
      res.setHeader("x-upstream-status", String(status));
      res.end();
      return;
    }

    res.setHeader("x-upstream-status", String(status));
    for (const h of ["content-type", "content-length", "content-range", "etag", "last-modified", "accept-ranges"] as const) {
      const v = up.headers[h];
      if (v) res.setHeader(h, v as string);
    }
    if (mode === "download") {
      res.setHeader(
        "content-disposition",
        `attachment; filename="${name.replace(/[^\w.-]/g, "_")}.mp4"`,
      );
    }
    res.setHeader("cache-control", "public, max-age=300");
    res.statusCode = status;

    req.on("close", () => up.destroy());
    up.on("error", () => {
      if (!res.writableEnded) res.end();
    });
    up.pipe(res);
  } catch {
    if (!res.headersSent) res.statusCode = 502;
    res.end();
  }
}
