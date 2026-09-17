// The static data contract produced by the offline pipeline (pipeline/build-dataset.ts)
// and consumed by the web app. This is the boundary: the app never computes market
// analytics, only Team Fit / Personalized Opportunity (client-side, spec §42).

import type { CapabilityVector } from "@/lib/capabilities";
import type {
  ConcentrationBand,
  ScoreValue,
  SuccessTier,
} from "@shared/scores";

export interface DataProvenance {
  provider: string;
  fetchedAt: string; // ISO
  confidence: number; // 0..100
}

// Steam game record (spec §10). Kept minimal for V1.
export interface Game {
  appId: number;
  name: string;
  developer: string[];
  publisher: string[];
  releaseDate: string | null; // ISO or null
  comingSoon: boolean;
  earlyAccess: boolean;
  price: number | null;
  currency: string;
  genres: string[];
  categories: string[];
  tags: string[]; // ordered, highest-weighted first (spec §13 Tags)
  shortDescription: string;
  reviewPositive: number | null;
  reviewNegative: number | null;
  reviewTotal: number | null;
  reviewScorePercent: number | null;
  currentPlayers: number | null;
  // Derived per-game metrics used by cluster analytics.
  reviewVelocity30d?: number | null; // reviews/day, cohort-normalized upstream
  provenance?: DataProvenance;
}

// A requirement value on one of the 15 dimensions, with why it was inferred (§33, §34).
export interface RequirementDetail {
  value: number; // 0..5
  source: "rule" | "observed" | "ai" | "manual";
  reason: string;
}

export interface RequirementProfile {
  values: CapabilityVector; // 0..5 per dimension (§32)
  details: Partial<Record<keyof CapabilityVector, RequirementDetail[]>>;
  confidence: number; // 0..100 (§34)
  scopeClass: "Micro" | "Small" | "Medium" | "Large" | "Very Large"; // §36
}

export interface SuccessDistribution {
  tierCounts: Record<SuccessTier, number>;
  pctAbove500: number;
  pctAbove2000: number;
  pctAbove10000: number;
  medianReviews: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface Concentration {
  top1Share: number;
  top3Share: number;
  top10Share: number;
  band: ConcentrationBand;
}

// The fundamental map object (spec §5, §9). A point = a MarketCluster, never a game.
export interface MarketCluster {
  id: string;
  slug: string;
  name: string;
  description: string;

  primaryTags: string[];
  secondaryTags: string[];
  gameAppIds: number[]; // members (spec §5: a game may belong to many clusters)

  gameCount: number;
  releasedGameCount: number;
  upcomingGameCount: number;

  // Objective market scores — NEVER modified by team fit (spec §2.2).
  demandScore: ScoreValue;
  demandGrowthScore: ScoreValue;
  supplyPressureScore: ScoreValue;
  supplyGrowthScore: ScoreValue;
  successBreadthScore: ScoreValue;
  timingScore: ScoreValue;
  marketAttractivenessScore: ScoreValue;
  gapScore: ScoreValue;

  concentration: Concentration;
  successDistribution: SuccessDistribution;
  confidenceScore: number; // overall cluster confidence (§60)

  requirementProfile: RequirementProfile;

  createdAt: string;
  updatedAt: string;
}

export interface TagInfo {
  name: string;
  informationWeight: number; // higher = more market-defining (§17)
  gameCount: number;
  generic: boolean;
}

export interface DatasetMeta {
  analyticsVersion: string;
  generatedAt: string;
  source: "fixtures" | "steam";
  gameCount: number;
  clusterCount: number;
  notes?: string;
}

export interface Dataset {
  meta: DatasetMeta;
  games: Game[];
  tags: TagInfo[];
  clusters: MarketCluster[];
}
