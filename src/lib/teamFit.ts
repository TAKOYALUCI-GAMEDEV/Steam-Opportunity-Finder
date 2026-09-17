// Team Fit engine (spec §35–§41). Runs entirely client-side so editing a Team Profile
// recalculates instantly without rebuilding market analytics (§42). It reads objective
// cluster data (requirement profile + market scores) and the active team; it NEVER
// modifies market coordinates (§2.2). Explanations come from structured metrics only —
// no invented reasons (§41).

import { CAPABILITIES, type CapabilityId } from "@/lib/capabilities";
import type { MarketCluster, RequirementProfile } from "@/types/dataset";
import type { TeamProfile } from "@/types/team";

export const TEAM_FIT_VERSION = "team_fit_v1";

export interface DimensionFit {
  id: CapabilityId;
  label: string;
  teamCapability: number; // 0..100
  marketRequirement: number; // 0..100
  coverage: number; // 0..1
  weight: number; // = requirement (higher req carries more weight, §35)
}

export interface HardBlocker {
  code: string;
  message: string;
}

export type FitGate = "Strong fit" | "Viable" | "High execution risk" | "Poor fit";

export interface TeamFitResult {
  teamFit: number;
  capabilityFit: number;
  scopeFit: number;
  gate: FitGate;
  hardBlockers: HardBlocker[];
  dimensions: DimensionFit[];
  strengths: string[];
  risks: string[];
}

export interface PersonalizedOpportunity {
  personalizedOpportunity: number;
  marketAttractiveness: number;
  teamFit: number;
  timing: number;
  cap: number | null; // applied ceiling, if any
  capReason: string | null;
}

// Nominal resource requirement per market scope class (§36). Used by ScopeFit and by
// duration/budget hard blockers.
export const SCOPE_REQ: Record<
  RequirementProfile["scopeClass"],
  { size: number; months: number; budget: number }
> = {
  Micro: { size: 1, months: 3, budget: 10_000 },
  Small: { size: 2, months: 6, budget: 40_000 },
  Medium: { size: 4, months: 12, budget: 150_000 },
  Large: { size: 8, months: 20, budget: 500_000 },
  "Very Large": { size: 15, months: 30, budget: 1_500_000 },
};

const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));

export function gateOf(teamFit: number): FitGate {
  if (teamFit >= 75) return "Strong fit";
  if (teamFit >= 60) return "Viable";
  if (teamFit >= 40) return "High execution risk";
  return "Poor fit";
}

export function computeTeamFit(
  team: TeamProfile,
  cluster: MarketCluster,
): TeamFitResult {
  const rp = cluster.requirementProfile;

  // ── Capability coverage per dimension (§35) ────────────────────────────
  const dimensions: DimensionFit[] = [];
  let covWeighted = 0;
  let weightSum = 0;
  for (const cap of CAPABILITIES) {
    const R = (rp.values[cap.id] ?? 0) * 20; // 0..100
    const C = (team.capabilityProfile[cap.id] ?? 0) * 20; // 0..100
    if (R <= 0) continue; // zero requirement → ignored (§35)
    const coverage = Math.min(C / R, 1);
    const weight = R; // higher requirement carries more weight
    covWeighted += coverage * weight;
    weightSum += weight;
    dimensions.push({
      id: cap.id,
      label: cap.label,
      teamCapability: C,
      marketRequirement: R,
      coverage,
      weight,
    });
  }
  const capabilityFit = weightSum > 0 ? (covWeighted / weightSum) * 100 : 100;

  // ── Scope fit (§36) ────────────────────────────────────────────────────
  const req = SCOPE_REQ[rp.scopeClass];
  const scopeCoverage = (have: number, need: number) =>
    need <= 0 ? 1 : Math.min(have / need, 1);
  const sizeCov = scopeCoverage(team.teamSize, req.size);
  const monthsCov = scopeCoverage(team.developmentMonths, req.months);
  const budgetCov = scopeCoverage(
    team.productionBudget + team.outsourceBudget,
    req.budget,
  );
  const scopeFit = clamp(((sizeCov + monthsCov + budgetCov) / 3) * 100);

  // ── Hard blockers (§38) ────────────────────────────────────────────────
  const hardBlockers: HardBlocker[] = [];
  const reqVal = (id: CapabilityId) => rp.values[id] ?? 0;
  const teamVal = (id: CapabilityId) => team.capabilityProfile[id] ?? 0;
  const c = team.constraints;

  if (reqVal("networking") >= 4 && teamVal("networking") <= 1 && !c.multiplayerAllowed)
    hardBlockers.push({
      code: "networking",
      message: "Multiplayer architecture exceeds team constraints.",
    });
  if (reqVal("backend") >= 4 && !c.backendAllowed)
    hardBlockers.push({
      code: "backend",
      message: "Persistent backend required but disallowed by team constraints.",
    });
  if (reqVal("levelContent") >= 5 && !c.contentHeavyAllowed)
    hardBlockers.push({
      code: "content",
      message: "Massive handcrafted content burden exceeds team constraints.",
    });
  if (reqVal("liveops") >= 4 && !c.liveOpsAllowed)
    hardBlockers.push({
      code: "liveops",
      message: "Sustained LiveOps required but disallowed by team constraints.",
    });
  if (c.maxDevelopmentMonths != null && req.months > c.maxDevelopmentMonths)
    hardBlockers.push({
      code: "duration",
      message: `Market scope (${rp.scopeClass}) needs ~${req.months} months; team caps at ${c.maxDevelopmentMonths}.`,
    });
  if (c.maxBudget != null && req.budget > c.maxBudget)
    hardBlockers.push({
      code: "budget",
      message: `Market scope (${rp.scopeClass}) needs ~€${req.budget.toLocaleString()}; team budget is €${c.maxBudget.toLocaleString()}.`,
    });

  // ── Final Team Fit (§37) ───────────────────────────────────────────────
  const teamFit = clamp(0.75 * capabilityFit + 0.25 * scopeFit);

  // ── Explanation from structured metrics (§41) ──────────────────────────
  const strengths: string[] = [];
  const risks: string[] = [];
  for (const d of dimensions) {
    if (d.marketRequirement >= 60 && d.coverage >= 0.999)
      strengths.push(`Strong ${d.label.toLowerCase()} capability`);
    else if (d.marketRequirement >= 60 && d.coverage < 0.6)
      risks.push(`${d.label} requirement exceeds current team capability`);
  }
  // Low-requirement dimensions are a fit advantage for lean teams.
  for (const cap of CAPABILITIES) {
    const R = (rp.values[cap.id] ?? 0) * 20;
    if (R <= 20 && ["narrative", "levelContent", "liveops", "backend"].includes(cap.id))
      strengths.push(`Low ${cap.label.toLowerCase()} burden`);
  }
  if (c.maxDevelopmentMonths == null || req.months <= (c.maxDevelopmentMonths ?? Infinity))
    strengths.push(`Fits the ${req.months}-month scope of a ${rp.scopeClass} market`);
  else risks.push(`Production duration for a ${rp.scopeClass} market exceeds the team limit`);
  for (const b of hardBlockers) risks.push(b.message);

  return {
    teamFit,
    capabilityFit: clamp(capabilityFit),
    scopeFit,
    gate: gateOf(teamFit),
    hardBlockers,
    dimensions,
    strengths: dedupe(strengths).slice(0, 6),
    risks: dedupe(risks).slice(0, 6),
  };
}

export function computePersonalizedOpportunity(
  team: TeamProfile,
  cluster: MarketCluster,
  fit?: TeamFitResult,
): PersonalizedOpportunity {
  const f = fit ?? computeTeamFit(team, cluster);
  const marketAttractiveness = cluster.marketAttractivenessScore.value;
  const timing = cluster.timingScore.value;
  const teamFit = f.teamFit;

  let value = 0.45 * marketAttractiveness + 0.35 * teamFit + 0.2 * timing;

  // Team Fit gates cap the personalized score (§39).
  let cap: number | null = null;
  let capReason: string | null = null;
  if (f.hardBlockers.length > 0) {
    cap = 45;
    capReason = "Hard blocker present — capped at 45.";
  } else if (teamFit < 40) {
    cap = 55;
    capReason = "Team Fit below 40 — capped at 55.";
  }
  if (cap != null) value = Math.min(value, cap);

  return {
    personalizedOpportunity: clamp(Math.round(value * 10) / 10),
    marketAttractiveness,
    teamFit: Math.round(teamFit * 10) / 10,
    timing,
    cap,
    capReason,
  };
}

function dedupe(xs: string[]): string[] {
  return [...new Set(xs)];
}
