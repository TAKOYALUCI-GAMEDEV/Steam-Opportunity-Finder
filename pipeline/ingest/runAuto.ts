// Automatic ingestion + market discovery (spec §18/§49 groundwork). Builds a broad
// candidate pool from SteamSpy, fetches real tags/metrics, mines markets by tag
// co-occurrence, and assembles a dataset with the SAME analytics as the curated path.
// Run: `npm run ingest:auto`

import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { ClusterSeed } from "../../data/fixtures/clusterSeeds";
import type { Game } from "../../src/types/dataset";
import { assembleDataset, logClusterSummary } from "../lib/assemble";
import { assignGames } from "../lib/cluster";
import { discoverClusters } from "../cluster/discover";
import { fetchGameLite } from "../providers/steam";
import { fetchGenreTop } from "../providers/steamspyLists";
import { allSeedAppIds } from "./seedApps";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_OUT = resolve(__dirname, "../../public/data/dataset.json");
const TRACKED_OUT = resolve(__dirname, "../../data/generated/dataset.json");
const SNAPSHOTS = resolve(__dirname, "../../data/generated/snapshots.jsonl");

// Genres worth mining for indie/mid-market opportunities, and how many top-by-owners to
// take from each. Curated niche appIds are always included so niche markets can surface.
const GENRES: [string, number][] = [
  ["Simulation", 70],
  ["Strategy", 70],
  ["RPG", 55],
  ["Casual", 55],
  ["Adventure", 50],
  ["Indie", 70],
  ["Early Access", 40],
];
const MAX_POOL = 360;
const MIN_SUPPORT = 8;
const MAX_CLUSTERS = 30;

async function buildCandidatePool(): Promise<number[]> {
  const ids = new Set<number>(allSeedAppIds());
  for (const [genre, limit] of GENRES) {
    const top = await fetchGenreTop(genre, limit);
    top.forEach((id) => ids.add(id));
    console.log(`  · ${genre.padEnd(14)} +${top.length} (pool ${ids.size})`);
  }
  return [...ids].slice(0, MAX_POOL);
}

async function main() {
  console.log("▸ building candidate pool from SteamSpy genres…");
  const pool = await buildCandidatePool();
  console.log(`▸ fetching ${pool.length} games (lite: appdetails + SteamSpy)…`);

  const games: Game[] = [];
  let done = 0;
  for (const appId of pool) {
    const g = await fetchGameLite(appId);
    done += 1;
    if (!g || !g.tags.length || g.reviewTotal == null) continue;
    games.push(g);
    if (done % 25 === 0) console.log(`  … ${done}/${pool.length} (${games.length} usable)`);
  }
  console.log(`▸ ${games.length} usable games`);

  console.log("▸ mining markets by tag co-occurrence…");
  const discovered = discoverClusters(games, {
    minSupport: MIN_SUPPORT,
    maxClusters: MAX_CLUSTERS,
  });
  console.log(`▸ discovered ${discovered.length} markets`);

  const seeds: ClusterSeed[] = discovered.map((d) => ({
    slug: d.slug,
    name: d.name,
    description: d.description,
    primaryTags: d.primaryTags,
    secondaryTags: d.secondaryTags,
  }));

  const { dataset } = assembleDataset({
    games,
    seeds,
    source: "steam",
    minGames: MIN_SUPPORT,
    assign: assignGames,
    notes: `auto-discovery, pool=${games.length}, minSupport=${MIN_SUPPORT}`,
  });

  for (const out of [PUBLIC_OUT, TRACKED_OUT]) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(dataset, null, 2));
  }

  const ts = new Date().toISOString();
  mkdirSync(dirname(SNAPSHOTS), { recursive: true });
  appendFileSync(
    SNAPSHOTS,
    games
      .map((g) =>
        JSON.stringify({
          appId: g.appId,
          timestamp: ts,
          totalReviews: g.reviewTotal,
          positiveReviews: g.reviewPositive,
          currentPlayers: g.currentPlayers,
        }),
      )
      .join("\n") + "\n",
  );

  console.log(`✓ dataset written (${games.length} games, ${dataset.clusters.length} clusters)`);
  logClusterSummary(dataset);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
