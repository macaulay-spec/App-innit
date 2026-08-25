/* Real-browser smoke test using @sparticuz/chromium + puppeteer-core.
   API responses are injected via request interception so full data paths run. */
const puppeteer = require("puppeteer-core");
let chromium = require("@sparticuz/chromium");
chromium = chromium.default ?? chromium;
const fs = require("fs");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* canned payloads (same shapes as live API) */
const cover = {
  url: "https://pbcdnw.aoneroom.com/image/x.jpg",
  blurHash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
  avgHueLight: "#645a64",
  avgHueDark: "#645d64",
  width: 1080,
  height: 1350,
};
const stills = { ...cover, width: 3000, height: 2000 };
const movie = {
  subjectId: "1001", subjectType: 1, title: "Mutiny", description: "A test movie.",
  releaseDate: "2026-08-21", duration: 5700, genre: "Action,Crime,Thriller", cover, stills,
  countryName: "United Kingdom", imdbRatingValue: "6.0", imdbRatingCount: 100,
  subtitles: "English,Español", hasResource: true, detailPath: "mutiny-x", postTitle: "Mutiny-1080P",
};
const series = { ...movie, subjectId: "2002", subjectType: 2, title: "Reacher", detailPath: "reacher-x", genre: "Action,Crime,Drama" };
const wrap = (endpoint, data) => ({ status: true, statusCode: 200, endpoint, data });

function apiResponse(url) {
  const u = new URL(url);
  const p = u.pathname;
  if (p === "/api/homepage")
    return wrap(p, {
      operatingList: [{ type: "BANNER", banner: { items: [{ image: stills, subject: movie, subjectId: "1001", detailPath: "mutiny-x", title: "Mutiny" }] } }],
      homeList: [], platformList: [{ name: "Netflix" }],
    });
  if (p === "/api/hot-movies-series") return wrap(p, { movie: [movie], series: [series] });
  if (p === "/api/trending") return wrap(p, { subjectList: [movie, series] });
  if (p === "/api/popular-searches") return wrap(p, { everyoneSearch: [{ title: "Mutiny" }] });
  if (p === "/api/search-suggestion") return wrap(p, { items: [{ word: "Mutiny", type: 1 }], keyword: "mut" });
  if (p === "/api/search") return wrap(p, { pager: { hasMore: false, nextPage: 2, page: 1, perPage: 24, totalCount: 2 }, items: [movie, series] });
  if (p === "/api/item-details") {
    const isSeries = u.searchParams.get("subjectId") === "2002";
    return wrap(p, {
      subject: isSeries ? series : movie,
      stars: [{ name: "Test Actor", character: "Hero", avatarUrl: "" }],
      seasons: isSeries ? [{ se: 1, maxEp: 3, allEp: "1,2,3", resolutions: [] }] : [],
      seasonCount: isSeries ? 1 : 0, isSeries, watchTimeLimit: 15,
    });
  }
  if (p === "/api/recommendations") return wrap(p, { items: [series] });
  if (p === "/api/media")
    return wrap(p, {
      downloads: { code: 0, data: {
        downloads: [
          { id: "d1", url: "https://cdn.example/v.mp4", resolution: 720, size: "1000000", streamUrl: "https://proxy.example/s.mp4", downloadUrl: "https://proxy.example/d.mp4" },
          { id: "d2", url: "https://cdn.example/v360.mp4", resolution: 360, size: "500000", streamUrl: "https://proxy.example/s360.mp4", downloadUrl: "https://proxy.example/d360.mp4" },
        ],
        captions: [{ id: "c1", lan: "en", lanName: "English", url: "https://cdn.example/en.srt", size: "100", delay: 0 }],
        limited: false, hasResource: true,
      } },
      stream: { code: 0, data: { streams: [{ id: "d1", url: "https://cdn.example/v.mp4", resolutions: "720", size: "1000000", duration: 1361, codecName: "h264", format: "MP4" }], dash: [], hls: [], hasResource: true } },
    });
  return { status: false, statusCode: 404, error: "no stub " + p };
}

(async () => {
  const exePath = await chromium.executablePath();
  console.log("chromium at:", exePath);
  const browser = await puppeteer.launch({
    args: [...chromium.args, "--no-sandbox", "--disable-dev-shm-usage"],
    executablePath: exePath,
    headless: true,
    defaultViewport: { width: 1280, height: 800 },
  });
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("zstlab.cyou")) {
      req.respond({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(apiResponse(url)) });
    } else if (url.includes("fonts.googleapis") || url.includes("fonts.gstatic") || url.includes("pbcdnw") || url.includes("proxy.example") || url.includes("cdn.example")) {
      req.abort();
    } else req.continue();
  });
  page.on("pageerror", (e) => {
    console.log("\n!!! PAGEERROR:", e.message);
    console.log((e.stack || "").split("\n").slice(0, 8).join("\n"));
  });
  page.on("console", (m) => {
    if (m.type() === "error") console.log("CONSOLE ERROR:", m.text().slice(0, 400));
  });

  fs.mkdirSync(".smoke", { recursive: true });
  const shots = [
    ["#/", "home"],
    ["#/browse/MOVIE", "movies"],
    ["#/my-list", "mylist"],
    ["#/downloads", "downloads"],
    ["#/title/1001", "title-movie"],
    ["#/watch/1001", "watch-movie"],
    ["#/title/2002", "title-series"],
    ["#/watch/2002?season=1&episode=2", "watch-series"],
    ["#/search?q=mutiny", "search"],
  ];
  for (const [hash, name] of shots) {
    await page.goto("http://localhost:5173/" + hash, { waitUntil: "domcontentloaded" });
    await sleep(1600);
    const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").slice(0, 200));
    const hasDebug = await page.evaluate(() => Boolean(document.getElementById("jf-debug")));
    console.log(`\n== ${name} == debug-overlay:${hasDebug}\n   text: ${body}`);
    await page.screenshot({ path: `.smoke/shot-${name}.png` });
  }

  // click-through test on home (like the user)
  await page.goto("http://localhost:5173/#/", { waitUntil: "domcontentloaded" });
  await sleep(1500);
  for (const label of ["Movies", "Series", "My List", "Downloads", "Home"]) {
    const clicked = await page.evaluate((t) => {
      const a = [...document.querySelectorAll("header a")].find((x) => x.textContent.trim() === t);
      if (a) { a.click(); return true; }
      return false;
    }, label);
    await sleep(900);
    const dbg = await page.evaluate(() => document.getElementById("jf-debug")?.textContent ?? "");
    const txt = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").slice(0, 120));
    console.log(`CLICK ${label}: clicked=${clicked} debug="${dbg.slice(0, 200)}" text="${txt}"`);
    if (dbg) await page.screenshot({ path: `.smoke/shot-crash-${label}.png` });
  }

  await browser.close();
  console.log("\nBROWSER SMOKE DONE");
  process.exit(0);
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
