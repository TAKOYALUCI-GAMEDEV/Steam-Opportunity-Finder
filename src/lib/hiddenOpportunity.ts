// Hidden Demand × Team Fit (feature spec §32). A specialized combined search score for
// Hidden Demand mode — does NOT replace PersonalizedOpportunity. Applies the same Team
// Fit gates. Client-side, recomputed instantly when the team changes.

import { computeTeamFit, type TeamFitResult } from "@/lib/teamFit";
import type { MarketCluster } from "@/types/dataset";
import type { TeamProfile } from "@/types/team";

const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));

export interface HiddenOpportunity {
  hiddenOpportunityForTeam: number;
  hiddenDemand: number;
  teamFit: number;
  timing: number;
  cap: number | null;
  capReason: string | null;
  fit: TeamFitResult;
}

export function computeHiddenOpportunityForTeam(
  team: TeamProfile,
  cluster: MarketCluster,
  fitIn?: TeamFitResult,
): HiddenOpportunity | null {
  const hd = cluster.hiddenDemand?.hiddenDemandScore.value;
  if (hd == null) return null;

  const fit = fitIn ?? computeTeamFit(team, cluster);
  const timing = cluster.timingScore.value;
  const teamFit = fit.teamFit;

  let value = 0.5 * hd + 0.35 * teamFit + 0.15 * timing;

  // Same gates as PersonalizedOpportunity (§32 → main spec §39).
  let cap: number | null = null;
  let capReason: string | null = null;
  if (fit.hardBlockers.length > 0) {
    cap = 45;
    capReason = "Hard blocker present — capped at 45.";
  } else if (teamFit < 40) {
    cap = 55;
    capReason = "Team Fit below 40 — capped at 55.";
  }
  if (cap != null) value = Math.min(value, cap);

  return {
    hiddenOpportunityForTeam: clamp(Math.round(value * 10) / 10),
    hiddenDemand: hd,
    teamFit: Math.round(teamFit * 10) / 10,
    timing,
    cap,
    capReason,
    fit,
  };
}
