/* Symbolicate the crash offsets captured from the user's Vercel bundle
   (index-BqdFY6m3.js — identical hash to our local prod build). */
import { readFileSync } from "fs";
import { SourceMapConsumer } from "source-map";

const map = JSON.parse(readFileSync(new URL("../dist/assets/index-BqdFY6m3.js.map", import.meta.url)));

const stack = [
  ["_i", 48, 93095],
  ["zg", 48, 111013],
  ["Il", 48, 110245],
  ["Og", 48, 110609],
  ["Il2", 48, 110307],
  ["Og2", 48, 110397],
];
const components = [
  ["O3", 81, 536],
  ["N3", 70, 24580],
  ["z3", 81, 626],
  ["eA", 60, 7562],
  ["CA", 60, 17860],
  ["v2", 49, 37605],
];

await SourceMapConsumer.with(map, null, (c) => {
  console.log("== crash stack ==");
  for (const [name, line, column] of stack) {
    const p = c.originalPositionFor({ line, column });
    console.log(`${name}  ${p.source}:${p.line}:${p.column}  ${p.name ?? ""}`);
  }
  console.log("== component stack ==");
  for (const [name, line, column] of components) {
    const p = c.originalPositionFor({ line, column });
    console.log(`${name}  ${p.source}:${p.line}:${p.column}  ${p.name ?? ""}`);
  }
});
