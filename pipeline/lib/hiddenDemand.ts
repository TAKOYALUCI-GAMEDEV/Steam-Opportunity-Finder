// Hidden Demand / Sleeper Market analytics (feature spec). Offline & deterministic.
// Finds markets where products outperform their cohort-expected review performance —
// evidence of demand stronger than the visible market size suggests (§43). Distinct from
// Market Gap. Every score exposes components; classification is rule-based (§16).
//
// NOTE on data: our sample is top-by-owners games, so cohort baselines skew successful
// and outperformance ratios are conservative; the confidence model (§20) reflects this.

import type {
  Game,
  GameOutperformance,
  HiddenDemand,
  MarketCluster,
  OutlierQualityCheck,
  OutperformingTitle,
} from "../../src/types/dataset";
import type { ScoreValue, SleeperMarketType } from "../../src/types/scores";
import { clamp, log1p, median, percentileRank, quantile, round1 } from "./stats";

export const OUTPERFORMANCE_VERSION = "outperformance_model_v1";
export const HIDDEN_DEMAND_VERSION = "hidden_demand_v1";

const DAY = 86_400_000;
const MIN_EXPECTED = 100; // §7 minimumExpectedReviews
const MIN_COHORT = 6; // §6 broaden below this
const RECENT_MS = 36 * 30 * DAY; // §10 default 36-month window

const sv = (value: number, confidence: number, components: ScoreValue["components"]): ScoreValue => ({
  value: round1(clamp(value)),
  confidence: round1(clamp(confidence)),
  components,
  analyticsVersion: HIDDEN_DEMAND_VERSION,
});

function priceBand(price: number | null): string {
  if (price == null) return "unk";
  if (price === 0) return "free";
  if (price < 5) return "<5";
  if (price < 10) return "5-9";
  if (price < 20) return "10-19";
  if (price < 30) return "20-29";
  return "30+";
}

function ageBucket(release: string | null, asOf: number): string {
  if (!release) return "unk";
  const days = (asOf - Date.parse(release)) / DAY;
  if (days <= 90) return "0-90d";
  if (days <= 365) return "91-365d";
  if (days <= 730) return "1-2y";
  if (days <= 1825) return "2-5y";
  return "5y+";
}

const yearOf = (r: string | null) => (r ? new Date(r).getUTCFullYear() : 0);

// Progressive cohort broadening (§6): narrowest cohort with enough peers wins; broader
// cohorts lower confidence.
function buildCohorts(games: Game[], asOf: number) {
  const levels = [
    { name: "full", key: (g: Game) => `${yearOf(g.releaseDate)}|${priceBand(g.price)}|${g.price === 0 ? "F" : "P"}|${ageBucket(g.releaseDate, asOf)}`, conf: 90 },
    { name: "noAge", key: (g: Game) => `${yearOf(g.releaseDate)}|${priceBand(g.price)}|${g.price === 0 ? "F" : "P"}`, conf: 70 },
    { name: "noPrice", key: (g: Game) => `${yearOf(g.releaseDate)}|${g.price === 0 ? "F" : "P"}`, conf: 55 },
    { name: "paid", key: (g: Game) => `${g.price === 0 ? "F" : "P"}`, conf: 40 },
    { name: "all", key: () => "all", conf: 25 },
  ];
  const maps = levels.map((lv) => {
    const m = new Map<string, number[]>();
    for (const g of games) {
      const k = lv.key(g);
      (m.get(k) ?? m.set(k, []).get(k)!).push(g.reviewTotal ?? 0);
    }
    return { ...lv, m };
  });
  return (g: Game) => {
    for (const lv of maps) {
      const arr = lv.m.get(lv.key(g)) ?? [];
      if (arr.length >= MIN_COHORT) {
        return { key: `${lv.name}:${lv.key(g)}`, size: arr.length, expected: median(arr), confidence: lv.conf * Math.min(arr.length / 12, 1) };
      }
    }
    const all = maps[maps.length - 1];
    const arr = all.m.get("all") ?? [];
    return { key: "all", size: arr.length, expected: median(arr), confidence: 20 };
  };
}

function qualityCheck(g: Game, asOf: number, dominance: boolean): OutlierQualityCheck {
  const ageY = g.releaseDate ? (asOf - Date.parse(g.releaseDate)) / (365.25 * DAY) : 0;
  const freeToPlay = g.price === 0;
  const unusuallyLowPrice = g.price != null && g.price > 0 && g.price < 3;
  const longReleaseAge = ageY > 5;
  const longEarlyAccessHistory = !!g.earlyAccess && ageY > 2;
  const flags = [freeToPlay, unusuallyLowPrice, longReleaseAge, longEarlyAccessHistory, dominance];
  return {
    freeToPlay,
    unusuallyLowPrice,
    franchiseOrPublisherDominance: dominance,
    longEarlyAccessHistory,
    longReleaseAge,
    majorPublisher: null, // unknown ≠ false (§17)
    confounderCount: flags.filter(Boolean).length,
  };
}

const independentGroup = (g: Game) =>
  (g.developer[0] || g.publisher[0] || `app-${g.appId}`).toLowerCase();

export function computeHiddenDemand(
  games: Game[],
  clusters: MarketCluster[],
  asOf: number,
): void {
  const released = games.filter((g) => !g.comingSoon && g.reviewTotal != null);
  const cohortFor = buildCohorts(released, asOf);

  // Peer velocity medians by age bucket (§8).
  const velByAge = new Map<string, number[]>();
  for (const g of released)
    if (g.reviewVelocity30d != null)
      (velByAge.get(ageBucket(g.releaseDate, asOf)) ?? velByAge.set(ageBucket(g.releaseDate, asOf), []).get(ageBucket(g.releaseDate, asOf))!).push(g.reviewVelocity30d);
  const peerVelMedian = (g: Game) => {
    const arr = velByAge.get(ageBucket(g.releaseDate, asOf)) ?? [];
    return arr.length ? median(arr) : null;
  };

  // ── Per-game outperformance (§5–§8) ──────────────────────────────────────
  // Winsorize log-outperformance across the population before use (§7).
  const rawLogs: number[] = [];
  const byId = new Map<number, GameOutperformance>();
  for (const g of released) {
    const c = cohortFor(g);
    const actual = g.reviewTotal ?? 0;
    const ratio = actual / Math.max(c.expected, MIN_EXPECTED);
    const logOut = Math.log2(1 + ratio);
    rawLogs.push(logOut);
    const peer = peerVelMedian(g);
    const recent = peer && peer > 0 && g.reviewVelocity30d != null ? round1(g.reviewVelocity30d / peer) : null;
    byId.set(g.appId, {
      appId: g.appId,
      cohortKey: c.key,
      cohortSize: c.size,
      expectedReviews: Math.round(c.expected),
      actualReviews: actual,
      outperformanceRatio: round1(ratio),
      logOutperformance: logOut,
      highOutperformer: ratio >= 3 && actual >= 500,
      extremeOutperformer: ratio >= 8 && actual >= 2000,
      recentOutperformance: recent,
      independentGroupId: independentGroup(g),
      quality: qualityCheck(g, asOf, false),
      confidence: round1(c.confidence),
    });
  }
  const loHi = [quantile(rawLogs, 0.02), quantile(rawLogs, 0.98)];
  for (const o of byId.values())
    o.logOutperformance = round1(Math.max(loHi[0], Math.min(loHi[1], o.logOutperformance)));

  for (const g of released) g.outperformance = byId.get(g.appId);

  // ── Per-cluster raw aggregates ───────────────────────────────────────────
  interface Raw {
    cluster: MarketCluster;
    members: Game[];
    outs: GameOutperformance[];
    outReviewRaw: number; // median logOutperformance
    recentVelRaw: number | null;
  }
  const raws: Raw[] = clusters.map((cluster) => {
    const members = cluster.gameAppIds
      .map((id) => games.find((g) => g.appId === id))
      .filter((g): g is Game => !!g && !g.comingSoon && g.reviewTotal != null);
    const outs = members.map((m) => byId.get(m.appId)!).filter(Boolean);

    // Franchise/publisher dominance flag on this cluster's outperformers (§14).
    const groupCounts = new Map<string, number>();
    for (const o of outs) if (o.highOutperformer) groupCounts.set(o.independentGroupId, (groupCounts.get(o.independentGroupId) ?? 0) + 1);
    for (const o of outs) if ((groupCounts.get(o.independentGroupId) ?? 0) > 1) o.quality.franchiseOrPublisherDominance = true;

    const logs = outs.map((o) => o.logOutperformance);
    const recentVals = outs.map((o) => o.recentOutperformance).filter((x): x is number => x != null);
    return {
      cluster,
      members,
      outs,
      outReviewRaw: median(logs),
      recentVelRaw: recentVals.length >= 2 ? median(recentVals) : null,
    };
  });

  const popOut = raws.map((r) => r.outReviewRaw);
  const popRecent = raws.map((r) => r.recentVelRaw ?? 0);

  for (const r of raws) {
    const { cluster, members, outs } = r;
    const reviews = members.map((m) => m.reviewTotal ?? 0);
    const n = members.length;

    const activeSupply = members.filter((m) => m.releaseDate && asOf - Date.parse(m.releaseDate) <= RECENT_MS).length;
    const reviewDensity = activeSupply > 0 ? Math.round(reviews.reduce((a, b) => a + b, 0) / activeSupply) : 0;

    const high = outs.filter((o) => o.highOutperformer);
    const extreme = outs.filter((o) => o.extremeOutperformer);
    const independentGroups = new Set(high.map((o) => o.independentGroupId));
    const bestRatio = outs.reduce((m, o) => Math.max(m, o.outperformanceRatio), 0);

    const recentBreakouts = members.filter((m) => {
      const o = byId.get(m.appId)!;
      return m.releaseDate && asOf - Date.parse(m.releaseDate) <= RECENT_MS && o.outperformanceRatio >= 5 && (m.reviewTotal ?? 0) >= 2000;
    });

    // Review Outperformance Score — median logOutperformance percentiled across clusters.
    const outConf = outs.length ? outs.reduce((a, o) => a + o.confidence, 0) / outs.length : 20;
    const reviewOutperformanceScore = sv(
      percentileRank(r.outReviewRaw, popOut),
      outConf,
      [{ key: "medianLogOutperformance", label: "Median log-outperformance", weight: 1, value: round1(percentileRank(r.outReviewRaw, popOut)) }],
    );

    // Repeatability (§13) — caps single-title impact via share + independent count.
    const shareAbove3x = n ? high.length / n : 0;
    const countComp = clamp((independentGroups.size / 3) * 100);
    const medianRatio = median(outs.map((o) => o.outperformanceRatio));
    const medianComp = clamp((Math.log2(1 + medianRatio) / Math.log2(4)) * 100);
    const repeatComponents = [
      { key: "shareAbove3x", label: "Share of games ≥3× expected", weight: 0.4, value: round1(shareAbove3x * 100) },
      { key: "independentOutperformers", label: "Independent high-outperformers", weight: 0.3, value: round1(countComp) },
      { key: "successBreadth", label: "Success breadth", weight: 0.2, value: cluster.successBreadthScore.value },
      { key: "medianOutperformance", label: "Median outperformance", weight: 0.1, value: round1(medianComp) },
    ];
    const repeatabilityRaw = repeatComponents.reduce((a, c) => a + c.weight * c.value, 0);
    const repeatabilityScore = sv(repeatabilityRaw, outConf, repeatComponents);

    // Recent velocity outperformance (§8).
    const recentAvailable = r.recentVelRaw != null;
    const recentVelValue = recentAvailable ? percentileRank(r.recentVelRaw!, popRecent) : 0;

    const invSupply = clamp(100 - cluster.supplyPressureScore.value);
    const reviewQuality = clamp(((median(members.map((m) => m.reviewScorePercent ?? 0)) - 70) / 30) * 100);

    // Hidden Demand Score (§15) with redistribution when recent velocity is missing.
    const hdComponents = [
      { key: "reviewOutperformance", label: "Review Outperformance", weight: 0.35, value: reviewOutperformanceScore.value, available: true },
      { key: "recentVelocityOutperformance", label: "Recent Velocity Outperformance", weight: 0.25, value: round1(recentVelValue), available: recentAvailable },
      { key: "inverseSupplyPressure", label: "Inverse Supply Pressure", weight: 0.2, value: invSupply, available: true },
      { key: "repeatability", label: "Repeatability", weight: 0.1, value: repeatabilityScore.value, available: true },
      { key: "reviewQuality", label: "Review Quality", weight: 0.1, value: round1(reviewQuality), available: true },
    ];
    const avail = hdComponents.filter((c) => c.available);
    const wsum = avail.reduce((a, c) => a + c.weight, 0);
    const hiddenDemandRaw = avail.reduce((a, c) => a + (c.weight / wsum) * c.value, 0);

    // Concentration lowers confidence & repeatability, not raw demand (§19).
    const concentrationPenalty = cluster.concentration.top1Share; // 0..1
    const confidence = clamp(
      100 *
        (0.25 * Math.min(n / 8, 1) +
          0.2 * (outConf / 100) +
          0.2 * Math.min(independentGroups.size / 2, 1) +
          0.15 * (1 - concentrationPenalty) +
          0.1 * (recentAvailable ? 1 : 0.3) +
          0.1 * (members.filter((m) => m.price != null).length / Math.max(n, 1))),
    );
    const hiddenDemandScore = sv(hiddenDemandRaw, confidence, hdComponents.filter((c) => c.available).map(({ available, ...c }) => c));

    // First Proof Score (§28) over recent games.
    const recentMembers = members.filter((m) => m.releaseDate && asOf - Date.parse(m.releaseDate) <= RECENT_MS);
    const bestRecentRatio = recentMembers.reduce((mx, m) => Math.max(mx, byId.get(m.appId)!.outperformanceRatio), 0);
    const bestRecentComp = clamp((Math.log2(1 + bestRecentRatio) / Math.log2(10)) * 100);
    const recentVelComp = clamp(log1p(median(recentMembers.map((m) => m.reviewVelocity30d ?? 0))) / log1p(200) * 100);
    const lowSupplyComp = invSupply;
    const lowSupplyGrowthComp = clamp(100 - cluster.supplyGrowthScore.value);
    const fpComponents = [
      { key: "bestRecentOutperformance", label: "Best recent outperformance", weight: 0.4, value: round1(bestRecentComp) },
      { key: "recentReviewVelocity", label: "Recent review velocity", weight: 0.25, value: round1(recentVelComp) },
      { key: "lowSupply", label: "Low supply", weight: 0.2, value: lowSupplyComp },
      { key: "lowSupplyGrowth", label: "Low supply growth", weight: 0.15, value: round1(lowSupplyGrowthComp) },
    ];
    const firstProofScore = sv(fpComponents.reduce((a, c) => a + c.weight * c.value, 0), confidence, fpComponents);

    // Supply reaction (§29): releases in the 12m before vs after the best outperformer.
    const supplyReaction = computeSupplyReaction(members, byId, asOf);

    // Classification (§16).
    const sleeperMarketType = classify({
      gameCount: n,
      highCount: high.length,
      independentCount: independentGroups.size,
      repeatability: repeatabilityScore.value,
      hiddenDemand: hiddenDemandScore.value,
      supplyPressure: cluster.supplyPressureScore.value,
      demand: cluster.demandScore.value,
      band: cluster.concentration.band,
    });

    const outperformingTitles: OutperformingTitle[] = high
      .map((o) => {
        const g = members.find((m) => m.appId === o.appId)!;
        const conf: string[] = [];
        if (o.quality.freeToPlay) conf.push("Free-to-play");
        if (o.quality.unusuallyLowPrice) conf.push("Very low price");
        if (o.quality.franchiseOrPublisherDominance) conf.push("Same dev/publisher");
        if (o.quality.longReleaseAge) conf.push("Old release");
        if (o.quality.longEarlyAccessHistory) conf.push("Long Early Access");
        return { appId: o.appId, name: g.name, actualReviews: o.actualReviews, expectedReviews: o.expectedReviews, ratio: o.outperformanceRatio, recentVelocity: o.recentOutperformance, confounders: conf };
      })
      .sort((a, b) => b.ratio - a.ratio);

    const hd: HiddenDemand = {
      activeSupply,
      reviewDensity,
      medianReviewsPerGame: Math.round(median(reviews)),
      p75ReviewsPerGame: Math.round(quantile(reviews, 0.75)),
      p90ReviewsPerGame: Math.round(quantile(reviews, 0.9)),
      reviewOutperformanceScore,
      repeatabilityScore,
      hiddenDemandScore,
      firstProofScore,
      highOutperformerCount: high.length,
      independentOutperformerCount: independentGroups.size,
      extremeOutperformerCount: extreme.length,
      recentBreakoutCount: recentBreakouts.length,
      bestOutperformanceRatio: round1(bestRatio),
      sleeperMarketType,
      confidence: round1(confidence),
      outperformingTitles,
      supplyReaction,
      analyticsVersion: HIDDEN_DEMAND_VERSION,
    };
    cluster.hiddenDemand = hd;
  }
}

function computeSupplyReaction(
  members: Game[],
  byId: Map<number, GameOutperformance>,
  asOf: number,
): HiddenDemand["supplyReaction"] {
  const best = members
    .filter((m) => byId.get(m.appId)!.highOutperformer && m.releaseDate)
    .sort((a, b) => byId.get(b.appId)!.outperformanceRatio - byId.get(a.appId)!.outperformanceRatio)[0];
  if (!best?.releaseDate) return "unknown";
  const t = Date.parse(best.releaseDate);
  const inRange = (m: Game, lo: number, hi: number) => {
    if (!m.releaseDate) return false;
    const x = Date.parse(m.releaseDate);
    return x > lo && x <= hi;
  };
  const before = members.filter((m) => inRange(m, t - 365 * DAY, t)).length;
  const after = members.filter((m) => inRange(m, t, Math.min(t + 365 * DAY, asOf))).length;
  if (before === 0 && after === 0) return "unknown";
  const ratio = after / Math.max(before, 1);
  return ratio >= 3 ? "strong" : ratio >= 1.5 ? "moderate" : "weak";
}

function classify(m: {
  gameCount: number;
  highCount: number;
  independentCount: number;
  repeatability: number;
  hiddenDemand: number;
  supplyPressure: number;
  demand: number;
  band: string;
}): SleeperMarketType {
  if (m.gameCount < 5) return "insufficient_evidence";
  if (m.highCount === 1 && m.repeatability < 35 && m.band === "Highly Concentrated") return "single_hit_anomaly";
  if (m.independentCount >= 2 && m.repeatability >= 60 && m.hiddenDemand >= 70 && m.supplyPressure <= 60) return "repeatable_hidden_demand";
  if (m.highCount >= 1 && m.hiddenDemand >= 65 && m.supplyPressure <= 50 && m.repeatability < 60) return "first_proof_market";
  if (m.demand >= 50 && m.highCount >= 1 && m.supplyPressure > 40) return "established_niche";
  if (m.supplyPressure < 40 && m.demand < 35 && m.highCount === 0) return "dead_niche";
  return m.highCount > 0 ? "established_niche" : "insufficient_evidence";
}
