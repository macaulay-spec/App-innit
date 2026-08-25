/* Client-runtime smoke test: mounts the real app bundle in jsdom and clicks through routes. */
import { JSDOM } from "jsdom";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const dom = new JSDOM(`<!doctype html><html><head></head><body><div id="root"></div></body></html>`, {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
const w = dom.window;

// environment stubs jsdom lacks
w.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
if (!w.matchMedia)
  w.matchMedia = () => ({
    matches: false,
    media: "",
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
if (!w.ResizeObserver)
  w.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

const nodeFetch = globalThis.fetch;
for (const k of [
  "window",
  "document",
  "navigator",
  "location",
  "history",
  "localStorage",
  "sessionStorage",
  "HTMLElement",
  "HTMLInputElement",
  "HTMLVideoElement",
  "HTMLMediaElement",
  "Element",
  "Node",
  "Event",
  "MouseEvent",
  "KeyboardEvent",
  "CustomEvent",
  "getComputedStyle",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "IntersectionObserver",
  "matchMedia",
  "ResizeObserver",
]) {
  try {
    Object.defineProperty(globalThis, k, { value: w[k], configurable: true, writable: true });
  } catch (e) {
    console.log("global skip:", k, e.message);
  }
}
globalThis.fetch = nodeFetch; // network will fail -> queries hit error states, that's fine

const errors = [];
w.addEventListener("error", (e) => errors.push(`window error: ${e.message}`));
process.on("uncaughtException", (e) => errors.push(`uncaught: ${e.stack?.split("\n").slice(0, 3).join(" <- ")}`));
const origConsoleError = console.error;
console.error = (...args) => {
  errors.push(`console.error: ${args.map((a) => (a?.message ?? String(a))).join(" ").slice(0, 300)}`);
  origConsoleError(...args);
};

const text = () => w.document.body.textContent.replace(/\s+/g, " ").trim();

console.log("== importing bundle ==");
await import("../.smoke/bundle.mjs");
await sleep(900);
console.log("BOOT bodyLen:", w.document.body.innerHTML.length);
console.log("BOOT text:", text().slice(0, 220));
console.log("BOOT errors:", errors.length ? errors.join(" || ") : "none");

async function report(label) {
  await sleep(500);
  console.log(`\n== ${label} ==  hash=${w.location.hash}`);
  console.log("bodyLen:", w.document.body.innerHTML.length);
  console.log("text:", text().slice(0, 260));
  console.log("errors:", errors.length ? errors.slice(-3).join(" || ") : "none");
}

async function clickLink(href, label) {
  const a = w.document.querySelector(`a[href="${href}"]`);
  if (!a) {
    console.log(`\n== ${label} == link ${href} NOT FOUND; falling back to hash set`);
    w.location.hash = href.slice(1);
  } else {
    a.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
  }
  await report(label);
}

await clickLink("#/my-list", "NAV My List");
await clickLink("#/downloads", "NAV Downloads");
await clickLink("#/browse/MOVIE", "NAV Movies");
await clickLink("#/browse/trending", "NAV Explore");
await clickLink("#/title/5859976759130620224", "NAV Title (hash)");
await clickLink("#/watch/5859976759130620224", "NAV Watch (hash)");
await clickLink("#/", "NAV Home");

console.log("\nTOTAL errors captured:", errors.length);
process.exit(0);
