// The 15 standardized Team Capability dimensions (spec §30).
// These are the SINGLE source of truth for both Team capability and Market
// requirement profiles. Requirement profiles use the same 15 dimensions (§32).

export type CapabilityGroup =
  | "Engineering"
  | "Content"
  | "Design"
  | "Operations";

export interface CapabilityDef {
  id: CapabilityId;
  index: number; // 1..15 as in the spec
  label: string;
  group: CapabilityGroup;
  blurb: string;
}

export type CapabilityId =
  | "gameplaySystems"
  | "networking"
  | "backend"
  | "procedural"
  | "optimization"
  | "art2d"
  | "art3d"
  | "animationVfx"
  | "levelContent"
  | "narrative"
  | "audio"
  | "systemsDesign"
  | "uxui"
  | "qa"
  | "liveops";

export const CAPABILITIES: CapabilityDef[] = [
  { id: "gameplaySystems", index: 1, label: "Gameplay Systems Engineering", group: "Engineering", blurb: "Mechanics, interactions, state systems, gameplay architecture." },
  { id: "networking", index: 2, label: "Networking & Multiplayer", group: "Engineering", blurb: "Replication, matchmaking, multiplayer architecture, sync." },
  { id: "backend", index: 3, label: "Backend & Live Services", group: "Engineering", blurb: "Accounts, persistence, servers, cloud, telemetry services." },
  { id: "procedural", index: 4, label: "Procedural / Simulation Systems", group: "Engineering", blurb: "Procedural generation, simulation, AI, automation systems." },
  { id: "optimization", index: 5, label: "Optimization & Platform Engineering", group: "Engineering", blurb: "Performance, memory, platform integration, optimization." },
  { id: "art2d", index: 6, label: "2D Art & Visual Design", group: "Content", blurb: "Illustration, UI art, concept production, 2D pipelines." },
  { id: "art3d", index: 7, label: "3D Asset Production", group: "Content", blurb: "Modeling, texturing, materials, environment assets." },
  { id: "animationVfx", index: 8, label: "Animation & VFX", group: "Content", blurb: "Character animation, effects, rigging, animation systems." },
  { id: "levelContent", index: 9, label: "Level / World Content Production", group: "Content", blurb: "Handcrafted levels, environments, missions, worldbuilding." },
  { id: "narrative", index: 10, label: "Narrative & Writing", group: "Content", blurb: "Story, dialogue, quests, narrative content." },
  { id: "audio", index: 11, label: "Audio Production", group: "Content", blurb: "Sound design, implementation, music production." },
  { id: "systemsDesign", index: 12, label: "Systems / Economy Design", group: "Design", blurb: "Progression, economy, balancing, systemic gameplay." },
  { id: "uxui", index: 13, label: "UX / UI Design", group: "Design", blurb: "Interaction design, hierarchy, menus, onboarding, usability." },
  { id: "qa", index: 14, label: "QA / Release Operations", group: "Operations", blurb: "Testing, certification, build management, regression." },
  { id: "liveops", index: 15, label: "LiveOps / Community Capability", group: "Operations", blurb: "Post-launch content, events, community operations." },
];

export const CAPABILITY_IDS: CapabilityId[] = CAPABILITIES.map((c) => c.id);

export const CAPABILITY_BY_ID: Record<CapabilityId, CapabilityDef> =
  Object.fromEntries(CAPABILITIES.map((c) => [c.id, c])) as Record<
    CapabilityId,
    CapabilityDef
  >;

// A 0..5 rating per dimension (spec §30 scale). Used by both team capability
// and cluster requirement profiles.
export type CapabilityVector = Record<CapabilityId, number>;

export function emptyCapabilityVector(): CapabilityVector {
  return Object.fromEntries(CAPABILITY_IDS.map((id) => [id, 0])) as CapabilityVector;
}

// Rating scale labels (spec §30).
export const RATING_LABELS: Record<number, string> = {
  0: "none",
  1: "minimal",
  2: "basic",
  3: "competent",
  4: "strong",
  5: "expert",
};
