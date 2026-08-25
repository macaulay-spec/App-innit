/* Remote CDN probe — tests which header/host combinations the MovieBox
   video CDN accepts. Open /api/cdnprobe in the browser and copy the text. */
export default async function handler(req: any, res: any) {
  const KEY = "zst_sxWpWzOBNhkz3ev6wlnZIkShU3PC0NxJ6AVjOIzp";
  const BASE = "https://api.zstlab.cyou";
  const BROWSER_UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");

  const lines: string[] = ["== Jagflix CDN probe =="];

  try {
    const media = await fetch(
      `${BASE}/api/media?subjectId=5859976759130620224&detailPath=mutiny-E6TlP0RKSY6&season=0&episode=0&apikey=${KEY}`,
      { headers: { "x-api-key": KEY, "user-agent": BROWSER_UA } },
    ).then((r) => r.json());

    const dl = media?.data?.downloads?.data?.downloads ?? [];
    const raw = dl[0]?.url;
    if (!raw) {
      res.status(200).end(lines.join("\n") + "\nERROR: no raw url (media status " + media?.statusCode + ")");
      return;
    }
    lines.push("raw: " + raw.slice(0, 80) + "…");

    const u = new URL(raw);
    const hosts = [
      u.host,
      "bcdnw.hakunaymatata.com",
      "valiw.hakunaymatata.com",
      "vacdn.hakunaymatata.com",
      "vgorigin.hakunaymatata.com",
    ];

    const headerSets: Record<string, Record<string, string>> = {
      "browser-ua": { "user-agent": BROWSER_UA },
      "browser+ref-themoviebox": {
        "user-agent": BROWSER_UA,
        referer: "https://themoviebox.xyz/",
        origin: "https://themoviebox.xyz",
      },
      "browser+ref-h5": {
        "user-agent": BROWSER_UA,
        referer: "https://h5.aoneroom.com/",
        origin: "https://h5.aoneroom.com",
      },
      "ua-moviebox-app": { "user-agent": "MovieBox/3.0.0.2 (Linux; U; Android 13; en_US)" },
      "ua-okhttp": { "user-agent": "okhttp/4.12.0" },
      "ua-exoplayer": { "user-agent": "ExoPlayerLib/2.19.1 (Linux; Android 13)" },
      "ua-dalvik": { "user-agent": "Dalvik/2.1.0 (Linux; U; Android 13; sdk_gphone64_arm64)" },
      "ua-default-node": {},
    };

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 40000);

    outer: for (const [hname, extra] of Object.entries(headerSets)) {
      const row: string[] = [];
      for (const host of hosts) {
        const url = `${u.protocol}//${host}${u.pathname}${u.search}`;
        try {
          const r = await fetch(url, {
            method: "GET",
            headers: { ...extra, range: "bytes=0-499" },
            signal: ctrl.signal,
          });
          row.push(`${host.split(".")[0]}:${r.status}`);
          await r.body?.cancel?.();
        } catch (e: any) {
          row.push(`${host.split(".")[0]}:ERR`);
        }
      }
      lines.push(`${hname} -> ${row.join(" ")}`);
      // if a header set scored a 200/206 everywhere, that's the answer; still list the rest
      if (lines.length > 12) break outer;
    }
    clearTimeout(timer);

    try {
      const pr = await fetch(`${BASE}/api/proxy?url=${encodeURIComponent(raw)}`, {
        headers: { range: "bytes=0-499", "user-agent": BROWSER_UA },
      });
      lines.push(`zst-proxy -> ${pr.status} ${pr.headers.get("content-range") ?? ""}`);
      await pr.body?.cancel?.();
    } catch (e: any) {
      lines.push("zst-proxy -> ERR " + String(e?.message ?? e).slice(0, 60));
    }
  } catch (e: any) {
    lines.push("ERROR: " + String(e?.message ?? e).slice(0, 200));
  }

  res.status(200).end(lines.join("\n") + "\n");
}
