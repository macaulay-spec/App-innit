/* Remote CDN probe — tests which header/host combinations the MovieBox
   video CDN accepts. Results are read back via the public Vercel URL.
   Temporary diagnostic; reports status codes only (no bytes streamed). */
export default async function handler(req: any, res: any) {
  const KEY = "zst_sxWpWzOBNhkz3ev6wlnZIkShU3PC0NxJ6AVjOIzp";
  const BASE = "https://api.zstlab.cyou";
  const BROWSER_UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  try {
    // 1. get a fresh signed media url from the ZST API
    const media = await fetch(
      `${BASE}/api/media?subjectId=5859976759130620224&detailPath=mutiny-E6TlP0RKSY6&season=0&episode=0&apikey=${KEY}`,
      { headers: { "x-api-key": KEY, "user-agent": BROWSER_UA } },
    ).then((r) => r.json());

    const dl = media?.data?.downloads?.data?.downloads ?? [];
    const raw = dl[0]?.url;
    if (!raw) {
      res.status(200).json({ error: "no raw url in media response", media: media?.statusCode });
      return;
    }

    const u = new URL(raw);
    const hosts = [u.host, "bcdnw.hakunaymatata.com", "valiw.hakunaymatata.com", "vacdn.hakunaymatata.com", "vgorigin.hakunaymatata.com"];

    const headerSets: Record<string, Record<string, string>> = {
      "browser-ua": { "user-agent": BROWSER_UA },
      "browser+referer-themoviebox": {
        "user-agent": BROWSER_UA,
        referer: "https://themoviebox.xyz/",
        origin: "https://themoviebox.xyz",
      },
      "browser+referer-h5": {
        "user-agent": BROWSER_UA,
        referer: "https://h5.aoneroom.com/",
        origin: "https://h5.aoneroom.com",
      },
      "app-ua-moviebox": {
        "user-agent": "MovieBox/3.0.0.2 (Linux; U; Android 13; en_US) MovieBox/3.0.0.2",
      },
      "app-ua-okhttp": { "user-agent": "okhttp/4.12.0" },
      "app-ua-exoplayer": {
        "user-agent": "ExoPlayerLib/2.19.1 (Linux; Android 13) MovieBox",
      },
      "app-ua-dalvik": {
        "user-agent": "Dalvik/2.1.0 (Linux; U; Android 13; sdk_gphone64_arm64)",
      },
      "no-ua-default": {},
    };

    const results: any[] = [];
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);

    for (const [hname, extra] of Object.entries(headerSets)) {
      for (const host of hosts) {
        const url = `${u.protocol}//${host}${u.pathname}${u.search}`;
        try {
          const r = await fetch(url, {
            method: "GET",
            headers: { ...extra, range: "bytes=0-499" },
            signal: ctrl.signal,
            redirect: "follow",
          });
          results.push({
            hs: hname,
            host,
            status: r.status,
            len: r.headers.get("content-length"),
            range: r.headers.get("content-range"),
            server: r.headers.get("server"),
            body: r.status >= 400 ? (await r.text()).slice(0, 120) : undefined,
          });
          await r.body?.cancel?.();
        } catch (e: any) {
          results.push({ hs: hname, host, status: "ERR", err: String(e?.message ?? e).slice(0, 80) });
        }
      }
      // keep total runtime bounded
      if (results.length > 24) break;
    }
    clearTimeout(timer);

    // baseline: the ZST proxy
    let proxyStatus: any;
    try {
      const pr = await fetch(
        `${BASE}/api/proxy?url=${encodeURIComponent(raw)}`,
        { headers: { range: "bytes=0-499", "user-agent": BROWSER_UA }, signal: ctrl.signal },
      );
      proxyStatus = { status: pr.status, range: pr.headers.get("content-range") };
      await pr.body?.cancel?.();
    } catch (e: any) {
      proxyStatus = { err: String(e?.message ?? e).slice(0, 80) };
    }

    res.status(200).json({ raw: raw.slice(0, 90), results, proxyStatus });
  } catch (e: any) {
    res.status(200).json({ error: String(e?.message ?? e).slice(0, 200) });
  }
}
