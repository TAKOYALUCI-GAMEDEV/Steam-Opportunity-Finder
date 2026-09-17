// Recommended initial demo team (spec §73). Used to validate that large multiplayer
// survival markets stay visible but score poorly for Team Fit, while systemic
// low-content markets fit strongly.

import type { CapabilityVector } from "@/lib/capabilities";
import type { TeamProfile } from "@/types/team";

const demoCapabilities: CapabilityVector = {
  gameplaySystems: 4,
  networking: 2,
  backend: 1,
  procedural: 4,
  optimization: 3,
  art2d: 2,
  art3d: 3,
  animationVfx: 2,
  levelContent: 2,
  narrative: 1,
  audio: 2,
  systemsDesign: 5,
  uxui: 4,
  qa: 3,
  liveops: 1,
};

export function makeDemoTeam(): TeamProfile {
  const now = new Date().toISOString();
  return {
    id: "team_demo",
    name: "Demo Studio (3-person systemic)",
    teamSize: 3,
    developmentMonths: 12,
    productionBudget: 120_000,
    outsourceBudget: 0,
    members: [
      { id: "m1", role: "Game Designer", seniority: "senior", fte: 1 },
      { id: "m2", role: "Gameplay Programmer", seniority: "mid", fte: 1 },
      { id: "m3", role: "Technical Artist", seniority: "mid", fte: 1 },
    ],
    capabilityProfile: demoCapabilities,
    constraints: {
      multiplayerAllowed: true, // small-scale co-op acceptable
      backendAllowed: false, // avoid permanent backend
      maxDevelopmentMonths: 12,
      maxBudget: 120_000,
      preferredPlatforms: ["Windows"],
      contentHeavyAllowed: false, // avoid content-heavy narrative games
      liveOpsAllowed: false,
      proceduralPreferred: true, // prefer systemic gameplay
      targetPriceMin: 12,
      targetPriceMax: 25,
    },
    createdAt: now,
    updatedAt: now,
  };
}
