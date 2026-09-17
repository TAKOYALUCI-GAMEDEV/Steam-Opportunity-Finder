// Real Steam ingestion (spec Milestone 1). Fetches the curated app universe through the
// provider layer, assembles a Dataset with the SAME analytics as fixtures, and writes:
//   - public/data/dataset.json      (served locally / by the deploy build)
//   - data/generated/dataset.json   (tracked; the committed real dataset the site ships)
//   - data/generated/snapshots.jsonl (appended; enables real velocity/growth over time, §11)
// Run: `npm run ingest`

import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { CLUSTER_SEEDS } from "../../data/fixtures/clusterSeeds";
import type { Game } from "../../src/types/dataset";
import { assembleDataset, logClusterSummary } from "../lib/assemble";
import { fetchGame } from "../providers/steam";
import { fetchTagTop } from "../providers/steamspyLists";
import { SEED_APPS, THICKEN_TAGS } from "./seedApps";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_OUT = resolve(__dirname, "../../public/data/dataset.json");
const TRACKED_OUT = resolve(__dirname, "../../data/generated/dataset.json");
const SNAPSHOTS = resolve(__dirname, "../../data/generated/snapshots.jsonl");

const MIN_GAMES = 4;
const TARGET_PER_MARKET = 14; // thicken each market to ~this many real games (§4)

async function main() {
  // Build per-market membership: curated anchors ∪ top-by-owners games carrying the
  // market's distinctive tag (real SteamSpy data — no hand-guessed appIds).
  console.log("▸ building market membership (curated ∪ SteamSpy tag top)…");
  const membership = new Map<string, Set<number>>();
  for (const slug of Object.keys(SEED_APPS)) {
    const set = new Set<number>(SEED_APPS[slug]);
    const tag = THICKEN_TAGS[slug];
    if (tag) {
      const top = await fetchTagTop(tag, TARGET_PER_MARKET);
      top.forEach((id) => set.add(id));
      console.log(`  · ${slug.padEnd(22)} tag="${tag}" → ${set.size} members`);
    } else {
      console.log(`  · ${slug.padEnd(22)} curated → ${set.size} members`);
    }
    membership.set(slug, set);
  }

  const appIds = [...new Set([...membership.values()].flatMap((s) => [...s]))];
  console.log(`▸ ingesting ${appIds.length} unique apps from Steam (cached; polite rate limit)…`);

  const games: Game[] = [];
  let skipped = 0;
  for (const appId of appIds) {
    const g = await fetchGame(appId);
    if (!g) {
      skipped += 1;
      console.warn(`  ✗ skip ${appId} (no data)`);
      continue;
    }
    games.push(g);
    console.log(
      `  ✓ ${String(appId).padStart(7)} ${g.name.slice(0, 30).padEnd(30)} reviews=${String(
        g.reviewTotal ?? "—",
      ).padStart(7)} ccu=${String(g.currentPlayers ?? "—").padStart(6)} vel=${g.reviewVelocity30d ?? "—"}`,
    );
  }
  console.log(`▸ fetched ${games.length} games, skipped ${skipped}`);

  // Membership filter: a game joins a market if it is a hand-verified curated anchor OR
  // a tag-top candidate whose REAL tags actually contain the market's primary tag(s).
  // This auto-removes off-theme games that merely carried a broad query tag (e.g. big
  // shooters under "Physics", 7 Days to Die under "Tower Defense").
  const norm = (s: string) => s.toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();
  const curatedSets = new Map(
    Object.entries(SEED_APPS).map(([slug, ids]) => [slug, new Set(ids)]),
  );

  const { dataset } = assembleDataset({
    games,
    seeds: CLUSTER_SEEDS,
    source: "steam",
    minGames: MIN_GAMES,
    assign: (seed, gs) => {
      const cand = membership.get(seed.slug) ?? new Set();
      const curated = curatedSets.get(seed.slug) ?? new Set();
      const primary = seed.primaryTags.map(norm);
      return gs.filter((g) => {
        if (!cand.has(g.appId)) return false;
        if (curated.has(g.appId)) return true;
        const gt = new Set(g.tags.map(norm));
        return primary.every((t) => gt.has(t));
      });
    },
    notes: `steam ingestion, ${games.length} games, minGames=${MIN_GAMES}`,
  });

  for (const out of [PUBLIC_OUT, TRACKED_OUT]) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(dataset, null, 2));
  }

  // Append a metric snapshot per game (observed history, spec §11/§16).
  const ts = new Date().toISOString();
  mkdirSync(dirname(SNAPSHOTS), { recursive: true });
  const lines = games.map((g) =>
    JSON.stringify({
      appId: g.appId,
      timestamp: ts,
      totalReviews: g.reviewTotal,
      positiveReviews: g.reviewPositive,
      currentPlayers: g.currentPlayers,
      reviewVelocity30d: g.reviewVelocity30d,
    }),
  );
  appendFileSync(SNAPSHOTS, lines.join("\n") + "\n");

  console.log(`✓ dataset written → public/data/dataset.json + data/generated/dataset.json`);
  console.log(`✓ ${games.length} snapshots appended → data/generated/snapshots.jsonl`);
  logClusterSummary(dataset);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
