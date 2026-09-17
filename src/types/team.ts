// Team Profile is a first-class product object (spec §28). Lives entirely client-side;
// editing it recalculates Team Fit / Personalized Opportunity instantly (§42), never
// touching market analytics.

import type { CapabilityVector, CapabilityId } from "@/lib/capabilities";

export type Seniority = "junior" | "mid" | "senior" | "lead";

export interface TeamMember {
  id: string;
  role: string;
  seniority: Seniority;
  fte: number; // full-time-equivalent 0..1+
  capabilityOverrides?: Partial<CapabilityVector>;
}

export interface TeamConstraints {
  multiplayerAllowed: boolean;
  backendAllowed: boolean;
  maxDevelopmentMonths: number | null;
  maxBudget: number | null;
  preferredPlatforms: string[];
  contentHeavyAllowed: boolean;
  liveOpsAllowed: boolean;
  proceduralPreferred: boolean;
  targetPriceMin: number | null;
  targetPriceMax: number | null;
}

export interface TeamProfile {
  id: string;
  name: string;

  teamSize: number;
  developmentMonths: number;
  productionBudget: number; // in EUR
  outsourceBudget: number;

  members: TeamMember[];

  // Effective 0..5 capability per dimension (may be authored directly or rolled up
  // from members — for V1 we author directly, spec §30/§73).
  capabilityProfile: CapabilityVector;

  constraints: TeamConstraints;

  createdAt: string;
  updatedAt: string;
}

// Roles that can pre-populate a capability vector (§29). Users may override.
export interface RoleTemplate {
  role: string;
  defaults: Partial<Record<CapabilityId, number>>;
}
