import { describe, expect, it } from "vitest";
import type { Game, MarketCluster } from "../../src/types/dataset";
import type { ConcentrationBand, ScoreValue } from "../../src/types/scores";
import { computeHiddenDemand } from "./hiddenDemand";

const ASOF = Date.parse("2025-08-01");
const sv = (v: number): ScoreValue => ({ value: v, confidence: 80, components: [], analyticsVersion: "t" });

let appId = 1;
function game(reviews: number, dev: string, opts: Partial<Game> = {}): Game {
  return {
    appId: appId++, name: `${dev}-${reviews}`, developer: [dev], publisher: [dev],
    releaseDate: "2024-01-01", comingSoon: false, earlyAccess: false, price: 15, currency: "EUR",
    genres: [], categories: [], tags: [], shortDescription: "",
    reviewPositive: Math.round(reviews * 0.9), reviewNegative: Math.round(reviews * 0.1),
    reviewTotal: reviews, reviewScorePercent: 90, currentPlayers: 100, reviewVelocity30d: null,
    ...opts,
  };
}

function cluster(
  id: string, games: Game[], supplyPressure: number, demand: number,
  band: ConcentrationBand, top1Share: number,
): MarketCluster {
  return {
    id, slug: id, name: id, description: "", primaryTags: [], secondaryTags: [],
    gameAppIds: games.map((g) => g.appId),
    gameCount: games.length, releasedGameCount: games.length, upcomingGameCount: 0,
    demandScore: sv(demand), demandGrowthScore: sv(50), supplyPressureScore: sv(supplyPressure),
    supplyGrowthScore: sv(40), successBreadthScore: sv(60), timingScore: sv(50),
    marketAttractivenessScore: sv(55), gapScore: sv(50),
    concentration: { top1Share, top3Share: Math.min(1, top1Share + 0.1), top10Share: 1, band },
    successDistribution: { tierCounts: { Tiny: 0, Small: 0, Viable: 0, Successful: 0, Breakout: 0 }, pctAbove500: 40, pctAbove2000: 20, pctAbove10000: 10, medianReviews: 400, p25: 200, p50: 400, p75: 2000, p90: 10000 },
    confidenceScore: 70, requirementProfile: { values: {} as never, details: {}, confidence: 70, scopeClass: "Small" },
    createdAt: "", updatedAt: "",
  };
}

describe("Hidden Demand classification (feature spec §40)", () => {
  // A: 8 games, 4 independent strong outperformers, low supply.
  const aGames = [
    ...[0, 1, 2, 3].map((i) => game(24000, `DevA${i}`)),
    ...[0, 1, 2, 3].map((i) => game(400, `DevA${i + 10}`)),
  ];
  // B: 8 games, one franchise title owns most reviews.
  const bGames = [game(80000, "Franchise"), ...[0, 1, 2, 3, 4, 5, 6].map((i) => game(300, `DevB${i}`))];
  // C: 7 games, all underperform.
  const cGames = [...Array(7)].map((_, i) => game(120, `DevC${i}`));

  const clusters = [
    cluster("A", aGames, 30, 60, "Distributed", 0.2),
    cluster("B", bGames, 25, 45, "Highly Concentrated", 0.9),
    cluster("C", cGames, 20, 20, "Distributed", 0.2),
  ];
  computeHiddenDemand([...aGames, ...bGames, ...cGames], clusters, ASOF);
  const [A, B, C] = clusters.map((c) => c.hiddenDemand!);

  it("A: multiple independent outperformers, not a single-hit", () => {
    expect(A.independentOutperformerCount).toBeGreaterThanOrEqual(2);
    expect(A.sleeperMarketType).not.toBe("single_hit_anomaly");
    expect(A.hiddenDemandScore.value).toBeGreaterThan(C.hiddenDemandScore.value);
  });

  it("B: one franchise hit → single_hit_anomaly with low repeatability", () => {
    expect(B.highOutperformerCount).toBe(1);
    expect(B.sleeperMarketType).toBe("single_hit_anomaly");
    expect(B.repeatabilityScore.value).toBeLessThan(35);
  });

  it("C: all underperform → dead_niche, no outperformers", () => {
    expect(C.highOutperformerCount).toBe(0);
    expect(C.sleeperMarketType).toBe("dead_niche");
  });

  it("concentration lowers B's confidence relative to A", () => {
    expect(B.confidence).toBeLessThan(A.confidence);
  });
});
