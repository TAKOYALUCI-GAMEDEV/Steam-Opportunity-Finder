import { describe, expect, it } from "vitest";
import { emptyCapabilityVector, type CapabilityVector } from "@/lib/capabilities";
import { makeDemoTeam } from "@/lib/demoTeam";
import {
  computePersonalizedOpportunity,
  computeTeamFit,
  gateOf,
} from "@/lib/teamFit";
import type { MarketCluster, RequirementProfile } from "@/types/dataset";
import type { ScoreValue } from "@/types/scores";

function score(value: number): ScoreValue {
  return { value, confidence: 80, components: [], analyticsVersion: "test" };
}

function req(
  partial: Partial<CapabilityVector>,
  scopeClass: RequirementProfile["scopeClass"],
): RequirementProfile {
  return {
    values: { ...emptyCapabilityVector(), ...partial },
    details: {},
    confidence: 80,
    scopeClass,
  };
}

function cluster(
  id: string,
  requirementProfile: RequirementProfile,
  attractiveness = 70,
): MarketCluster {
  return {
    id,
    slug: id,
    name: id,
    description: "",
    primaryTags: [],
    secondaryTags: [],
    gameAppIds: [],
    gameCount: 6,
    releasedGameCount: 6,
    upcomingGameCount: 0,
    demandScore: score(70),
    demandGrowthScore: score(60),
    supplyPressureScore: score(50),
    supplyGrowthScore: score(50),
    successBreadthScore: score(60),
    timingScore: score(60),
    marketAttractivenessScore: score(attractiveness),
    gapScore: score(60),
    concentration: { top1Share: 0.3, top3Share: 0.6, top10Share: 0.9, band: "Distributed" },
    successDistribution: {
      tierCounts: { Tiny: 0, Small: 1, Viable: 2, Successful: 2, Breakout: 1 },
      pctAbove500: 80,
      pctAbove2000: 50,
      pctAbove10000: 16,
      medianReviews: 3000,
      p25: 1000,
      p50: 3000,
      p75: 8000,
      p90: 15000,
    },
    confidenceScore: 70,
    requirementProfile,
    createdAt: "",
    updatedAt: "",
  };
}

describe("gateOf", () => {
  it("maps team fit to the spec §39 bands", () => {
    expect(gateOf(80)).toBe("Strong fit");
    expect(gateOf(65)).toBe("Viable");
    expect(gateOf(50)).toBe("High execution risk");
    expect(gateOf(30)).toBe("Poor fit");
  });
});

describe("computeTeamFit coverage (§35)", () => {
  it("caps coverage at 1 and ignores zero-requirement dims", () => {
    const team = makeDemoTeam();
    // systemsDesign is a team strength (5→100); requirement 3 (60) → coverage 1.
    const c = cluster("systemic", req({ systemsDesign: 3, uxui: 2 }, "Small"));
    const fit = computeTeamFit(team, c);
    const sd = fit.dimensions.find((d) => d.id === "systemsDesign");
    expect(sd?.coverage).toBe(1);
    // narrative has zero requirement → not in dimensions.
    expect(fit.dimensions.some((d) => d.id === "narrative")).toBe(false);
  });
});

describe("demo team archetype behaviour (spec §73)", () => {
  const team = makeDemoTeam();
  // Cozy/systemic market: leans on team strengths, small scope.
  const systemic = cluster(
    "cozy",
    req({ systemsDesign: 4, procedural: 4, gameplaySystems: 3, uxui: 3 }, "Small"),
  );
  // Large multiplayer survival: heavy networking/content/3D, Large scope.
  const survival = cluster(
    "survival",
    req(
      { networking: 4, art3d: 5, levelContent: 5, procedural: 3, optimization: 4 },
      "Large",
    ),
  );

  it("systemic low-content market fits the team more strongly than large survival", () => {
    const a = computeTeamFit(team, systemic).teamFit;
    const b = computeTeamFit(team, survival).teamFit;
    expect(a).toBeGreaterThan(b);
    expect(a).toBeGreaterThanOrEqual(60); // viable+
  });

  it("large survival stays visible but scores as execution risk / poor", () => {
    const fit = computeTeamFit(team, survival);
    expect(fit.teamFit).toBeLessThan(60);
  });
});

describe("hard blockers & gates (§38, §39)", () => {
  const team = makeDemoTeam(); // backendAllowed=false, liveOpsAllowed=false

  it("backend requirement with backend disallowed produces a blocker and caps PO ≤ 45", () => {
    const c = cluster("mmo", req({ backend: 5, networking: 4, liveops: 5 }, "Very Large"));
    const fit = computeTeamFit(team, c);
    expect(fit.hardBlockers.length).toBeGreaterThan(0);
    const po = computePersonalizedOpportunity(team, c, fit);
    expect(po.personalizedOpportunity).toBeLessThanOrEqual(45);
    expect(po.cap).toBe(45);
  });
});
