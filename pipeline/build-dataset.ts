// Fixtures pipeline (spec §69). Deterministic, no network. Run: `npm run data`
//   fixtures → games → tag weights → clusters → market metrics → dataset.json

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { CLUSTER_SEEDS } from "../data/fixtures/clusterSeeds";
import { FIXTURE_GAMES, type RawGame } from "../data/fixtures/games";
import type { Game } from "../src/types/dataset";
import { assembleDataset, logClusterSummary } from "./lib/assemble";
import { assignGames } from "./lib/cluster";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../public/data/dataset.json");

// Configurable cluster support threshold (spec §18 step 5). Lowered from the spec's
// example of 8 because the fixture dataset is intentionally small.
const MIN_GAMES = 4;

function toGame(r: RawGame): Game {
  return {
    appId: r.appId,
    name: r.name,
    developer: r.developer ? [r.developer] : [],
    publisher: [],
    releaseDate: r.releaseDate,
    comingSoon: r.comingSoon ?? false,
    earlyAccess: r.earlyAccess ?? false,
    price: r.price ?? null,
    currency: "EUR",
    genres: [],
    categories: [],
    tags: r.tags,
    shortDescription: "",
    reviewPositive: Math.round((r.reviewTotal * r.reviewScorePercent) / 100),
    reviewNegative: Math.round((r.reviewTotal * (100 - r.reviewScorePercent)) / 100),
    reviewTotal: r.reviewTotal,
    reviewScorePercent: r.reviewScorePercent,
    currentPlayers: r.currentPlayers ?? null,
    reviewVelocity30d: r.reviewVelocity30d ?? null,
    provenance: { provider: "fixtures", fetchedAt: new Date().toISOString(), confidence: 100 },
  };
}

function main() {
  const games = FIXTURE_GAMES.map(toGame);
  const { dataset } = assembleDataset({
    games,
    seeds: CLUSTER_SEEDS,
    source: "fixtures",
    minGames: MIN_GAMES,
    assign: assignGames,
    notes: `fixtures, minGames=${MIN_GAMES}`,
  });

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(dataset, null, 2));
  console.log(`✓ dataset written → public/data/dataset.json`);
  logClusterSummary(dataset);
}

main();
