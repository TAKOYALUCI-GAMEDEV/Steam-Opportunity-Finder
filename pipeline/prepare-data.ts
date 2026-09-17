// Build-time data selection. If a committed real Steam dataset exists
// (data/generated/dataset.json, produced by `npm run ingest` and checked in), ship it.
// Otherwise fall back to the deterministic fixtures pipeline. This keeps deploy builds
// network-free while letting a scheduled ingestion refresh the real data.

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TRACKED = resolve(__dirname, "../data/generated/dataset.json");
const PUBLIC = resolve(__dirname, "../public/data/dataset.json");

async function main() {
  if (existsSync(TRACKED)) {
    mkdirSync(dirname(PUBLIC), { recursive: true });
    copyFileSync(TRACKED, PUBLIC);
    console.log("✓ using committed Steam dataset → public/data/dataset.json");
    return;
  }
  console.log("· no committed Steam dataset; building from fixtures");
  await import("./build-dataset.ts");
}

main();
