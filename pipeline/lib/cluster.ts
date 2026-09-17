// Cluster assembly: assign games to curated seeds and compute raw per-cluster
// aggregates. Normalization into 0..100 scores happens in scoring.ts (needs the
// whole cluster population for percentile ranking, spec §19).

import type { ClusterSeed } from "../../data/fixtures/clusterSeeds";
import type {
  Concentration,
  Game,
  SuccessDistribution,
} from "../../src/types/dataset";
import type { SuccessTier } from "../../src/types/scores";
import { median, quantile, sum } from "./stats";

// Success tiers by review count (spec §23). Configurable.
export const SUCCESS_TIERS: { tier: SuccessTier; min: number; max: number }[] = [
  { tier: "Tiny", min: 0, max: 49 },
  { tier: "Small", min: 50, max: 499 },
  { tier: "Viable", min: 500, max: 1999 },
  { tier: "Successful", min: 2000, max: 9999 },
  { tier: "Breakout", min: 10000, max: Infinity },
];

export interface ClusterRaw {
  seed: ClusterSeed;
  games: Game[];
  clusterTags: string[]; // primary + secondary + frequent member tags

  gameCount: number;
  releasedGameCount: number;
  upcomingGameCount: number;

  reviewSum: number;
  medianReviews: number;
  medianVelocity: number;
  medianCurrentPlayers: number;
  medianScorePercent: number;
  reviewsPerYearMedian: number;

  releasesLast12m: number;
  releasesPrior12m: number;
  yoyReleaseGrowth: number; // ratio last/prior (1 = flat)

  recentVelocityMedian: number;
  olderVelocityMedian: number;

  successDistribution: SuccessDistribution;
  concentration: Concentration;

  ccuAvailability: number; // 0..1 fraction of games with a player count
}

const DAY = 86_400_000;

export function ageYears(releaseDate: string | null, asOf: number): number {
  if (!releaseDate) return 0.5;
  const t = Date.parse(releaseDate);
  if (Number.isNaN(t)) return 0.5;
  return Math.max(0.5, (asOf - t) / (365.25 * DAY));
}

function tierOf(reviews: number): SuccessTier {
  return (SUCCESS_TIERS.find((t) => reviews >= t.min && reviews <= t.max)?.tier) ??
    "Tiny";
}

function successDistribution(reviews: number[]): SuccessDistribution {
  const tierCounts = {
    Tiny: 0,
    Small: 0,
    Viable: 0,
    Successful: 0,
    Breakout: 0,
  } as Record<SuccessTier, number>;
  for (const r of reviews) tierCounts[tierOf(r)] += 1;
  const n = reviews.length || 1;
  const share = (min: number) => reviews.filter((r) => r >= min).length / n;
  return {
    tierCounts,
    pctAbove500: share(500) * 100,
    pctAbove2000: share(2000) * 100,
    pctAbove10000: share(10000) * 100,
    medianReviews: median(reviews),
    p25: quantile(reviews, 0.25),
    p50: quantile(reviews, 0.5),
    p75: quantile(reviews, 0.75),
    p90: quantile(reviews, 0.9),
  };
}

function concentrationOf(reviews: number[]): Concentration {
  const total = sum(reviews) || 1;
  const sorted = [...reviews].sort((a, b) => b - a);
  const topShare = (k: number) => sum(sorted.slice(0, k)) / total;
  const top1Share = topShare(1);
  const band: Concentration["band"] =
    top1Share >= 0.6
      ? "Highly Concentrated"
      : top1Share >= 0.35
        ? "Moderately Concentrated"
        : "Distributed";
  return {
    top1Share,
    top3Share: topShare(3),
    top10Share: topShare(10),
    band,
  };
}

/** A game belongs to a cluster if it contains ALL of the seed's primary tags. */
export function assignGames(seed: ClusterSeed, games: Game[]): Game[] {
  const need = seed.primaryTags.map((t) => t.toLowerCase());
  return games.filter((g) => {
    const gl = g.tags.map((t) => t.toLowerCase());
    return need.every((t) => gl.includes(t));
  });
}

function frequentTags(games: Game[], min = 2): string[] {
  const counts = new Map<string, number>();
  for (const g of games)
    for (const t of g.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, c]) => c >= min)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t);
}

export function buildClusterRaw(
  seed: ClusterSeed,
  games: Game[],
  asOf: number,
): ClusterRaw | null {
  if (games.length === 0) return null;

  const released = games.filter((g) => !g.comingSoon);
  const upcoming = games.filter((g) => g.comingSoon);
  const reviews = released.map((g) => g.reviewTotal ?? 0);
  const velocities = released
    .map((g) => g.reviewVelocity30d)
    .filter((v): v is number => v != null);
  const players = released
    .map((g) => g.currentPlayers)
    .filter((v): v is number => v != null);
  const scorePcts = released
    .map((g) => g.reviewScorePercent)
    .filter((v): v is number => v != null);
  const reviewsPerYear = released.map(
    (g) => (g.reviewTotal ?? 0) / ageYears(g.releaseDate, asOf),
  );

  // Supply windows relative to asOf.
  const inWindow = (g: Game, from: number, to: number) => {
    if (!g.releaseDate) return false;
    const t = Date.parse(g.releaseDate);
    return t > from && t <= to;
  };
  const y1 = asOf - 365.25 * DAY;
  const y2 = asOf - 2 * 365.25 * DAY;
  const releasesLast12m = released.filter((g) => inWindow(g, y1, asOf)).length;
  const releasesPrior12m = released.filter((g) => inWindow(g, y2, y1)).length;
  const yoyReleaseGrowth =
    releasesPrior12m > 0
      ? releasesLast12m / releasesPrior12m
      : releasesLast12m > 0
        ? 2
        : 1;

  // Demand-growth proxy: newer vs older cohort review velocity (§22, low confidence).
  const byDate = [...released].sort(
    (a, b) => Date.parse(a.releaseDate ?? "") - Date.parse(b.releaseDate ?? ""),
  );
  const mid = Math.floor(byDate.length / 2);
  const olderVel = byDate
    .slice(0, mid)
    .map((g) => g.reviewVelocity30d ?? 0);
  const recentVel = byDate
    .slice(mid)
    .map((g) => g.reviewVelocity30d ?? 0);

  return {
    seed,
    games,
    clusterTags: [
      ...new Set([...seed.primaryTags, ...seed.secondaryTags, ...frequentTags(games)]),
    ],
    gameCount: games.length,
    releasedGameCount: released.length,
    upcomingGameCount: upcoming.length,
    reviewSum: sum(reviews),
    medianReviews: median(reviews),
    medianVelocity: median(velocities),
    medianCurrentPlayers: median(players),
    medianScorePercent: median(scorePcts),
    reviewsPerYearMedian: median(reviewsPerYear),
    releasesLast12m,
    releasesPrior12m,
    yoyReleaseGrowth,
    recentVelocityMedian: median(recentVel),
    olderVelocityMedian: median(olderVel),
    successDistribution: successDistribution(reviews),
    concentration: concentrationOf(reviews),
    ccuAvailability: released.length ? players.length / released.length : 0,
  };
}
