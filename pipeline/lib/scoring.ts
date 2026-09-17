// Market scoring (spec §19–§27). All metrics are normalized to percentile values
// across the cluster population before weighting (§19). Every score is explainable:
// it carries its weighted components, a confidence, and the analytics version.
// These scores are OBJECTIVE market coordinates — never touched by team fit (§2.2).

import type { ScoreComponent, ScoreValue } from "../../src/types/scores";
import type { ClusterRaw } from "./cluster";
import { clamp, log1p, percentileRank, round1 } from "./stats";

export const ANALYTICS_VERSION = "market_v0.1";

interface CompInput {
  key: string;
  label: string;
  weight: number;
  value: number; // 0..100
  available?: boolean; // if false, weight is redistributed (spec §19 CCU note)
}

/** Weighted mean over available components, renormalizing dropped weights. */
function weighted(inputs: CompInput[], confidence: number): ScoreValue {
  const avail = inputs.filter((c) => c.available !== false);
  const totalW = avail.reduce((a, c) => a + c.weight, 0) || 1;
  const value = avail.reduce((a, c) => a + (c.weight / totalW) * c.value, 0);
  const components: ScoreComponent[] = avail.map((c) => ({
    key: c.key,
    label: c.label,
    weight: round1((c.weight / totalW) * 100) / 100,
    value: round1(c.value),
  }));
  return {
    value: round1(clamp(value)),
    confidence: round1(clamp(confidence)),
    components,
    analyticsVersion: ANALYTICS_VERSION,
  };
}

const inv = (v: number) => clamp(100 - v);

export interface ClusterScores {
  demandScore: ScoreValue;
  demandGrowthScore: ScoreValue;
  supplyPressureScore: ScoreValue;
  supplyGrowthScore: ScoreValue;
  successBreadthScore: ScoreValue;
  timingScore: ScoreValue;
  marketAttractivenessScore: ScoreValue;
  gapScore: ScoreValue;
  confidenceScore: number;
}

export function computeClusterScores(raws: ClusterRaw[]): ClusterScores[] {
  // Populations for percentile normalization across clusters (§19).
  const pop = {
    velocity: raws.map((r) => log1p(r.medianVelocity)),
    players: raws.map((r) => log1p(r.medianCurrentPlayers)),
    reviewsPerYear: raws.map((r) => log1p(r.reviewsPerYearMedian)),
    reviewVolume: raws.map((r) => log1p(r.medianReviews)),
    releaseVolume: raws.map((r) => r.releasesLast12m),
    releaseGrowth: raws.map((r) => r.yoyReleaseGrowth),
    velTrend: raws.map((r) => r.recentVelocityMedian / Math.max(r.olderVelocityMedian, 1)),
    recentCohortVel: raws.map((r) => log1p(r.recentVelocityMedian)),
    breadthRaw: raws.map(
      (r) =>
        0.4 * r.successDistribution.pctAbove500 +
        0.35 * r.successDistribution.pctAbove2000 +
        0.25 * r.successDistribution.pctAbove10000,
    ),
  };

  const pr = (val: number, arr: number[]) => percentileRank(val, arr);

  return raws.map((r) => {
    const ccuAvailable = r.ccuAvailability >= 0.5;

    // ── Confidence (§60) ──────────────────────────────────────────────────
    const gameCountFactor = Math.min(r.gameCount / 10, 1);
    const reviewSampleFactor = Math.min(log1p(r.reviewSum) / log1p(50000), 1);
    const ccuFactor = r.ccuAvailability;
    const snapshotFactor = 0.4; // fixtures have no observed history (§16)
    const confidenceScore = round1(
      clamp(
        100 *
          (0.3 * gameCountFactor +
            0.25 * reviewSampleFactor +
            0.2 * ccuFactor +
            0.25 * snapshotFactor),
      ),
    );
    const cc = confidenceScore;

    // ── Demand (§19) ──────────────────────────────────────────────────────
    const demandScore = weighted(
      [
        { key: "reviewVelocity", label: "Review Velocity", weight: 0.3, value: pr(log1p(r.medianVelocity), pop.velocity) },
        { key: "currentPlayers", label: "Current Player Strength", weight: 0.25, value: pr(log1p(r.medianCurrentPlayers), pop.players), available: ccuAvailable },
        { key: "releaseAdjReviews", label: "Release-Adjusted Review Performance", weight: 0.2, value: pr(log1p(r.reviewsPerYearMedian), pop.reviewsPerYear) },
        { key: "reviewVolume", label: "Review Volume", weight: 0.15, value: pr(log1p(r.medianReviews), pop.reviewVolume) },
        { key: "reviewQuality", label: "Review Quality", weight: 0.1, value: clamp(((r.medianScorePercent - 70) / 30) * 100) },
      ],
      ccuAvailable ? cc * 0.9 : cc * 0.75,
    );

    // ── Demand Growth (§22, low confidence — no snapshots §16) ─────────────
    const demandGrowthScore = weighted(
      [
        { key: "velocityTrend", label: "Recent vs Older Velocity", weight: 0.6, value: pr(r.recentVelocityMedian / Math.max(r.olderVelocityMedian, 1), pop.velTrend) },
        { key: "recentCohortMomentum", label: "Newest Cohort Momentum", weight: 0.4, value: pr(log1p(r.recentVelocityMedian), pop.recentCohortVel) },
      ],
      cc * 0.5,
    );

    // ── Supply Pressure (§21) ──────────────────────────────────────────────
    const supplyPressureScore = weighted(
      [
        { key: "releaseVolume", label: "Release Volume (12m)", weight: 0.6, value: pr(r.releasesLast12m, pop.releaseVolume) },
        { key: "releaseGrowth", label: "Release Growth (YoY)", weight: 0.4, value: pr(r.yoyReleaseGrowth, pop.releaseGrowth) },
      ],
      cc * 0.85,
    );

    const supplyGrowthScore = weighted(
      [{ key: "releaseGrowth", label: "Release Growth (YoY)", weight: 1, value: pr(r.yoyReleaseGrowth, pop.releaseGrowth) }],
      cc * 0.7,
    );

    // ── Success Breadth (§23) ──────────────────────────────────────────────
    const breadthRaw =
      0.4 * r.successDistribution.pctAbove500 +
      0.35 * r.successDistribution.pctAbove2000 +
      0.25 * r.successDistribution.pctAbove10000;
    const successBreadthScore = weighted(
      [
        { key: "pctAbove500", label: "% above 500 reviews", weight: 0.4, value: r.successDistribution.pctAbove500 },
        { key: "pctAbove2000", label: "% above 2,000 reviews", weight: 0.35, value: r.successDistribution.pctAbove2000 },
        { key: "pctAbove10000", label: "% above 10,000 reviews", weight: 0.25, value: r.successDistribution.pctAbove10000 },
      ],
      cc * 0.9,
    );
    // Spread breadth across the population so the axis is comparative (§19).
    successBreadthScore.value = round1(pr(breadthRaw, pop.breadthRaw));

    const demand = demandScore.value;
    const demandGrowth = demandGrowthScore.value;
    const supply = supplyPressureScore.value;
    const breadth = successBreadthScore.value;

    // ── Timing (§26) — no upcoming-supply data → use inverse supply growth ──
    const timingScore = weighted(
      [
        { key: "demandGrowth", label: "Demand Growth", weight: 0.6, value: demandGrowth },
        { key: "invSupplyGrowth", label: "Inverse Supply Growth (proxy for upcoming)", weight: 0.4, value: inv(supplyGrowthScore.value) },
      ],
      cc * 0.45,
    );

    // ── Market Attractiveness (§27) ────────────────────────────────────────
    const marketAttractivenessScore = weighted(
      [
        { key: "demand", label: "Demand", weight: 0.35, value: demand },
        { key: "demandGrowth", label: "Demand Growth", weight: 0.25, value: demandGrowth },
        { key: "successBreadth", label: "Success Breadth", weight: 0.2, value: breadth },
        { key: "invSupply", label: "Inverse Supply Pressure", weight: 0.2, value: inv(supply) },
      ],
      cc * 0.8,
    );

    // ── Gap (§25) ──────────────────────────────────────────────────────────
    const gapScore = weighted(
      [
        { key: "demand", label: "Demand", weight: 0.4, value: demand },
        { key: "demandGrowth", label: "Demand Growth", weight: 0.25, value: demandGrowth },
        { key: "successBreadth", label: "Success Breadth", weight: 0.2, value: breadth },
        { key: "invSupply", label: "Inverse Supply Pressure", weight: 0.15, value: inv(supply) },
      ],
      cc * 0.75,
    );

    return {
      demandScore,
      demandGrowthScore,
      supplyPressureScore,
      supplyGrowthScore,
      successBreadthScore,
      timingScore,
      marketAttractivenessScore,
      gapScore,
      confidenceScore,
    };
  });
}
