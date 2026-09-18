// Shared dataset assembly used by BOTH the fixtures pipeline and the real Steam
// ingestion. Given games + cluster seeds + a membership function, it runs the full
// analytics loop (tag weights → clusters → scores → requirement profiles) and emits a
// Dataset. Keeping this shared guarantees fixtures and real data are scored identically
// (spec §68 analytics regression).

import type { ClusterSeed } from "../../data/fixtures/clusterSeeds";
import type { Dataset, Game, MarketCluster } from "../../src/types/dataset";
import { buildClusterRaw, type ClusterRaw } from "./cluster";
import { computeHiddenDemand, type CohortSample } from "./hiddenDemand";
import { buildRequirementProfile } from "./requirements";
import { ANALYTICS_VERSION, computeClusterScores } from "./scoring";
import { computeTagInfo } from "./tags";

export interface AssembleOptions {
  games: Game[];
  seeds: ClusterSeed[];
  source: "fixtures" | "steam";
  minGames: number;
  /** Returns the member games of a seed. Fixtures use tag matching; Steam uses an
   *  explicit appId → market assignment. */
  assign: (seed: ClusterSeed, games: Game[]) => Game[];
  asOf?: number; // default: latest release + 15d
  notes?: string;
  baseline?: CohortSample[]; // representative review-performance baseline (Hidden Demand)
}

export interface AssembleResult {
  dataset: Dataset;
  raws: ClusterRaw[];
}

export function assembleDataset(opts: AssembleOptions): AssembleResult {
  const { games, seeds, source, minGames, assign } = opts;
  const tags = computeTagInfo(games);

  const asOf =
    opts.asOf ??
    Math.max(
      ...games
        .map((g) => (g.releaseDate ? Date.parse(g.releaseDate) : 0))
        .filter((t) => t > 0),
      Date.now() - 365 * 86_400_000,
    ) + 15 * 86_400_000;

  const raws: ClusterRaw[] = [];
  for (const seed of seeds) {
    const members = assign(seed, games);
    if (members.length < minGames) {
      console.warn(
        `  ⚠ cluster "${seed.slug}" has ${members.length} games (< ${minGames}) — dropped`,
      );
      continue;
    }
    const raw = buildClusterRaw(seed, members, asOf);
    if (raw) raws.push(raw);
  }

  const scores = computeClusterScores(raws);
  const now = new Date().toISOString();

  const clusters: MarketCluster[] = raws.map((raw, i) => {
    const s = scores[i];
    const requirementProfile = buildRequirementProfile(
      raw.clusterTags,
      raw.successDistribution.medianReviews,
    );
    return {
      id: `cl_${raw.seed.slug}`,
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

  // Hidden Demand / Sleeper analysis (feature spec) — attaches cluster.hiddenDemand and
  // game.outperformance in place, over the whole game population.
  computeHiddenDemand(games, clusters, asOf, opts.baseline);

  const dataset: Dataset = {
    meta: {
      analyticsVersion: ANALYTICS_VERSION,
      generatedAt: now,
      source,
      gameCount: games.length,
      clusterCount: clusters.length,
      notes: opts.notes ?? `asOf=${new Date(asOf).toISOString().slice(0, 10)}`,
    },
    games,
    tags,
    clusters,
  };

  return { dataset, raws };
}

export function logClusterSummary(dataset: Dataset) {
  console.log(
    `✓ ${dataset.meta.gameCount} games · ${dataset.meta.clusterCount} clusters · ${dataset.tags.length} tags · source=${dataset.meta.source}`,
  );
  for (const c of dataset.clusters) {
    console.log(
      `  · ${c.name.padEnd(28)} D=${String(c.demandScore.value).padStart(5)}  S=${String(
        c.supplyPressureScore.value,
      ).padStart(5)}  Gap=${String(c.gapScore.value).padStart(5)}  Attr=${String(
        c.marketAttractivenessScore.value,
      ).padStart(5)}  conf=${c.confidenceScore}  [${c.concentration.band}] n=${c.gameCount}`,
    );
  }
}
