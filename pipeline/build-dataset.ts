// Offline analytics pipeline (spec §3 decision loop, run offline / in CI):
//   fixtures → games → tag weights → clusters → market metrics → dataset.json
// The web app consumes the emitted JSON and never recomputes market analytics.
// Run: `npm run data`

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { CLUSTER_SEEDS } from "../data/fixtures/clusterSeeds";
import { FIXTURE_GAMES, type RawGame } from "../data/fixtures/games";
import type { Dataset, Game, MarketCluster } from "../src/types/dataset";
import { assignGames, buildClusterRaw, type ClusterRaw } from "./lib/cluster";
import { buildRequirementProfile } from "./lib/requirements";
import { ANALYTICS_VERSION, computeClusterScores } from "./lib/scoring";
import { computeTagInfo } from "./lib/tags";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../public/data/dataset.json");

// Configurable cluster support threshold (spec §18 step 5). Fixtures are small, so we
// lower it from the spec's example of 8 to keep the archetype markets.
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
    provenance: {
      provider: "fixtures",
      fetchedAt: new Date().toISOString(),
      confidence: 100,
    },
  };
}

function slugToClusterId(slug: string): string {
  return `cl_${slug}`;
}

function main() {
  const games = FIXTURE_GAMES.map(toGame);
  const tags = computeTagInfo(games);

  // asOf = latest observed release; supply/growth windows are relative to it so the
  // small fixture dataset yields meaningful 12m / 24m windows (§21).
  const asOf =
    Math.max(
      ...games
        .map((g) => (g.releaseDate ? Date.parse(g.releaseDate) : 0))
        .filter((t) => t > 0),
    ) +
    15 * 86_400_000;

  // Assign games and build raw aggregates; drop under-supported clusters (§18 step 5).
  const rawsWithSeed: ClusterRaw[] = [];
  for (const seed of CLUSTER_SEEDS) {
    const members = assignGames(seed, games);
    if (members.length < MIN_GAMES) {
      console.warn(
        `  ⚠ cluster "${seed.slug}" has ${members.length} games (< ${MIN_GAMES}) — dropped`,
      );
      continue;
    }
    const raw = buildClusterRaw(seed, members, asOf);
    if (raw) rawsWithSeed.push(raw);
  }

  const scores = computeClusterScores(rawsWithSeed);
  const now = new Date().toISOString();

  const clusters: MarketCluster[] = rawsWithSeed.map((raw, i) => {
    const s = scores[i];
    const requirementProfile = buildRequirementProfile(
      raw.clusterTags,
      raw.successDistribution.medianReviews,
    );
    return {
      id: slugToClusterId(raw.seed.slug),
      slug: raw.seed.slug,
      name: raw.seed.name,
      description: raw.seed.description,
      primaryTags: raw.seed.primaryTags,
      secondaryTags: raw.seed.secondaryTags,
      gameAppIds: raw.games.map((g) => g.appId),
      gameCount: raw.gameCount,
      releasedGameCount: raw.releasedGameCount,
      upcomingGameCount: raw.upcomingGameCount,
      demandScore: s.demandScore,
      demandGrowthScore: s.demandGrowthScore,
      supplyPressureScore: s.supplyPressureScore,
      supplyGrowthScore: s.supplyGrowthScore,
      successBreadthScore: s.successBreadthScore,
      timingScore: s.timingScore,
      marketAttractivenessScore: s.marketAttractivenessScore,
      gapScore: s.gapScore,
      concentration: raw.concentration,
      successDistribution: raw.successDistribution,
      confidenceScore: s.confidenceScore,
      requirementProfile,
      createdAt: now,
      updatedAt: now,
    };
  });

  const dataset: Dataset = {
    meta: {
      analyticsVersion: ANALYTICS_VERSION,
      generatedAt: now,
      source: "fixtures",
      gameCount: games.length,
      clusterCount: clusters.length,
      notes: `asOf=${new Date(asOf).toISOString().slice(0, 10)}, minGames=${MIN_GAMES}`,
    },
    games,
    tags,
    clusters,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(dataset, null, 2));

  console.log(`✓ dataset written → public/data/dataset.json`);
  console.log(`  ${games.length} games · ${clusters.length} clusters · ${tags.length} tags`);
  for (const c of clusters) {
    console.log(
      `  · ${c.name.padEnd(26)} D=${String(c.demandScore.value).padStart(5)}  S=${String(
        c.supplyPressureScore.value,
      ).padStart(5)}  Gap=${String(c.gapScore.value).padStart(5)}  Attr=${String(
        c.marketAttractivenessScore.value,
      ).padStart(5)}  conf=${c.confidenceScore}  [${c.concentration.band}]`,
    );
  }
}

main();
