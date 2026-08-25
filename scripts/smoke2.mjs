/* Smoke test with STUBBED API so real data paths (hero, cards, player) execute. */
import { JSDOM } from "jsdom";
import { readdirSync } from "fs";

const BUNDLE =
  process.env.BUNDLE === "dist"
    ? "../dist/assets/" + readdirSync(new URL("../dist/assets", import.meta.url)).find((f) => f.endsWith(".js") && !f.endsWith(".map"))
    : "../.smoke/bundle.mjs";
console.log("using bundle:", BUNDLE);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------- canned API payloads ------------------------- */
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
  subjectId: "1001",
  subjectType: 1,
  title: "Mutiny",
  description: "A test movie.",
  releaseDate: "2026-08-21",
  duration: 5700,
  genre: "Action,Crime,Thriller",
  cover,
  stills,
  countryName: "United Kingdom",
  imdbRatingValue: "6.0",
  imdbRatingCount: 100,
  subtitles: "English,Español",
  hasResource: true,
  detailPath: "mutiny-x",
  postTitle: "Mutiny-1080P",
};
const series = {
  ...movie,
  subjectId: "2002",
  subjectType: 2,
  title: "Reacher",
  detailPath: "reacher-x",
  genre: "Action,Crime,Drama",
};
const wrap = (endpoint, data) => ({ status: true, statusCode: 200, endpoint, data });

function apiResponse(url) {
  const u = new URL(url);
  const p = u.pathname;
  if (p === "/api/homepage")
    return wrap("/api/homepage", {
      operatingList: [
        { type: "BANNER", banner: { items: [{ image: stills, subject: movie, subjectId: "1001", detailPath: "mutiny-x", title: "Mutiny" }] } },
      ],
      homeList: [],
      platformList: [{ name: "Netflix" }],
    });
  if (p === "/api/hot-movies-series") return wrap("/api/hot-movies-series", { movie: [movie], series: [series] });
  if (p === "/api/trending") return wrap("/api/trending", { subjectList: [movie, series] });
  if (p === "/api/popular-searches") return wrap("/api/popular-searches", { everyoneSearch: [{ title: "Mutiny" }] });
  if (p === "/api/search-suggestion") return wrap("/api/search-suggestion", { items: [{ word: "Mutiny", type: 1 }], keyword: "mut" });
  if (p === "/api/search") return wrap("/api/search", { pager: { hasMore: false, nextPage: 2, page: 1, perPage: 24, totalCount: 2 }, items: [movie, series] });
  if (p === "/api/item-details") {
    const isSeries = u.searchParams.get("subjectId") === "2002";
    return wrap("/api/item-details", {
      subject: isSeries ? series : movie,
      stars: [{ name: "Test Actor", character: "Hero", avatarUrl: "" }],
      seasons: isSeries ? [{ se: 1, maxEp: 3, allEp: "1,2,3", resolutions: [] }] : [],
      seasonCount: isSeries ? 1 : 0,
      isSeries,
      watchTimeLimit: 15,
    });
  }
  if (p === "/api/recommendations") return wrap("/api/recommendations", { items: [series] });
  if (p === "/api/media")
    return wrap("/api/media", {
      downloads: {
        code: 0,
        data: {
          downloads: [
            { id: "d1", url: "https://cdn.example/v.mp4", resolution: 720, size: "1000000", streamUrl: "https://proxy.example/s.mp4", downloadUrl: "https://proxy.example/d.mp4" },
            { id: "d2", url: "https://cdn.example/v360.mp4", resolution: 360, size: "500000", streamUrl: "https://proxy.example/s360.mp4", downloadUrl: "https://proxy.example/d360.mp4" },
          ],
          captions: [{ id: "c1", lan: "en", lanName: "English", url: "https://cdn.example/en.srt", size: "100", delay: 0 }],
          limited: false,
          hasResource: true,
        },
      },
      stream: { code: 0, data: { streams: [{ id: "d1", url: "https://cdn.example/v.mp4", resolutions: "720", size: "1000000", duration: 1361, codecName: "h264", format: "MP4" }], dash: [], hls: [], hasResource: true } },
    });
  return { status: false, statusCode: 404, error: "no stub for " + p };
}

/* ----------------------------- dom setup ----------------------------- */
const dom = new JSDOM(`<!doctype html><html><head></head><body><div id="root"></div></body></html>`, {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
const w = dom.window;
w.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
w.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
if (!w.matchMedia)
  w.matchMedia = () => ({ matches: false, media: "", addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });

for (const k of [
  "window", "document", "navigator", "location", "history", "localStorage", "sessionStorage",
  "HTMLElement", "HTMLInputElement", "HTMLVideoElement", "HTMLMediaElement", "Element", "Node",
  "Event", "MouseEvent", "KeyboardEvent", "CustomEvent", "getComputedStyle",
  "requestAnimationFrame", "cancelAnimationFrame", "IntersectionObserver", "matchMedia", "ResizeObserver",
  "MutationObserver", "MessageChannel", "MessagePort", "CustomEvent", "EventTarget", "HTMLAnchorElement",
  "HTMLButtonElement", "HTMLDivElement", "HTMLSpanElement", "HTMLImageElement", "HTMLCanvasElement",
  "DOMParser", "XMLSerializer", "AbortController", "AbortSignal",
]) {
  try {
    Object.defineProperty(globalThis, k, { value: w[k], configurable: true, writable: true });
  } catch {}
}

// stub fetch for the API; everything else (media) fails
globalThis.fetch = async (input) => {
  const url = String(input);
  if (url.includes("zstlab.cyou")) {
    return new Response(JSON.stringify(apiResponse(url)), { status: 200, headers: { "content-type": "application/json" } });
  }
  throw new Error("network blocked in smoke: " + url.slice(0, 60));
};
w.fetch = globalThis.fetch;

const errors = [];
w.addEventListener("error", (e) => errors.push(`window error: ${e.message}`), true);
process.on("uncaughtException", (e) => errors.push(`uncaught: ${e.stack?.split("\n").slice(0, 4).join(" <- ")}`));
const origErr = console.error;
console.error = (...args) => {
  errors.push(args.map((a) => (a && a.stack ? a.stack.split("\n").slice(0, 6).join("\n") : String(a && a.message ? a.message : a))).join(" ").slice(0, 1200));
  origErr(...args);
};

const text = () => w.document.body.textContent.replace(/\s+/g, " ").trim();

await import(BUNDLE);
await sleep(1000);
console.log("== BOOT ==", "bodyLen:", w.document.body.innerHTML.length, "| text:", text().slice(0, 160));

async function go(hash, label) {
  errors.length = 0;
  w.location.hash = hash;
  w.dispatchEvent(new w.HashChangeEvent("hashchange"));
  await sleep(700);
  console.log(`\n== ${label} == hash=${w.location.hash} bodyLen=${w.document.body.innerHTML.length}`);
  console.log("text:", text().slice(0, 220));
  if (errors.length) console.log("ERRORS:\n" + errors.slice(0, 4).join("\n---\n"));
  else console.log("errors: none");
}

await go("#/", "HOME");
await go("#/title/1001", "TITLE movie");
await go("#/watch/1001", "WATCH movie (player mounts)");
await go("#/title/2002", "TITLE series");
await go("#/watch/2002?season=1&episode=2", "WATCH series ep");
await go("#/my-list", "MY LIST");
await go("#/downloads", "DOWNLOADS");
await go("#/browse/MOVIE", "MOVIES");
await go("#/search?q=mutiny", "SEARCH");

console.log("\nDONE");
process.exit(0);
