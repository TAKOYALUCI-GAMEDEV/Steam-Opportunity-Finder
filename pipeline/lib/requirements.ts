// Market Requirement Profile generation via tag rules (spec §33). Every inferred
// requirement stores its reason so the UI can explain where it came from (§34).
// Values are 0..5 on the same 15 dimensions as team capability (§32).

import {
  CAPABILITY_IDS,
  type CapabilityId,
  type CapabilityVector,
} from "../../src/lib/capabilities";
import type { RequirementDetail, RequirementProfile } from "../../src/types/dataset";

type Effects = Partial<Record<CapabilityId, number>>;

interface Rule {
  tag: string; // matched case-insensitively against cluster tags
  effects: Effects; // additive contributions (clamped to 5)
  reason: string;
}

// Baseline every game needs some of (kept low; rules push specifics up).
const BASE: Effects = {
  gameplaySystems: 2,
  uxui: 2,
  qa: 2,
  audio: 2,
  art3d: 1,
  systemsDesign: 1,
};

const RULES: Rule[] = [
  { tag: "MMO", effects: { networking: 5, backend: 5, liveops: 5 }, reason: "MMO scope demands top-tier networking, backend and live operations." },
  { tag: "Multiplayer", effects: { networking: 3, qa: 1 }, reason: "Multiplayer requires replication and synchronization work." },
  { tag: "Co-op", effects: { networking: 3 }, reason: "Online co-op requires networked session and state sync." },
  { tag: "PvP", effects: { networking: 3, qa: 2, liveops: 2 }, reason: "Competitive PvP raises networking, QA and live-balance burden." },
  { tag: "Competitive", effects: { networking: 3, qa: 3, liveops: 3 }, reason: "Competitive play needs robust netcode, testing and ongoing balance." },
  { tag: "Open World", effects: { levelContent: 4, art3d: 2, optimization: 2 }, reason: "Open worlds carry heavy world-content and streaming/perf demands." },
  { tag: "Story Rich", effects: { narrative: 4 }, reason: "Story-rich games need substantial writing." },
  { tag: "Narrative", effects: { narrative: 3 }, reason: "Narrative content requires dedicated writing." },
  { tag: "Automation", effects: { systemsDesign: 4, procedural: 4 }, reason: "Automation depends on deep systems design and simulation." },
  { tag: "Physics", effects: { gameplaySystems: 4, qa: 3 }, reason: "Physics interactions require strong engineering and heavy QA." },
  { tag: "Survival", effects: { procedural: 2, systemsDesign: 2, art3d: 2, levelContent: 2 }, reason: "Survival mixes simulation, systems and 3D world content." },
  { tag: "Crafting", effects: { systemsDesign: 2 }, reason: "Crafting economies need systems/economy design." },
  { tag: "Base Building", effects: { systemsDesign: 2, gameplaySystems: 2 }, reason: "Base building needs placement systems and systemic depth." },
  { tag: "Building", effects: { gameplaySystems: 2, systemsDesign: 1 }, reason: "Building mechanics need interaction systems." },
  { tag: "Simulation", effects: { procedural: 3, systemsDesign: 2 }, reason: "Simulation depth requires simulation systems and design." },
  { tag: "Management", effects: { systemsDesign: 3, uxui: 2 }, reason: "Management sims need economy design and strong UX for dense info." },
  { tag: "Economy", effects: { systemsDesign: 2 }, reason: "Economy loops require balancing and reward design." },
  { tag: "Deckbuilding", effects: { systemsDesign: 3, uxui: 2 }, reason: "Deckbuilders live on systems balance and card UX." },
  { tag: "Card Game", effects: { uxui: 2, art2d: 2 }, reason: "Card games need clear UI and 2D card art." },
  { tag: "Roguelike", effects: { procedural: 2, systemsDesign: 2 }, reason: "Roguelikes need procedural runs and systemic balance." },
  { tag: "Tactical RPG", effects: { systemsDesign: 2, gameplaySystems: 2 }, reason: "Tactical combat needs systemic and gameplay engineering." },
  { tag: "First-Person", effects: { art3d: 2, optimization: 2, animationVfx: 1 }, reason: "First-person presentation raises 3D and performance bars." },
  { tag: "Shop Keeper", effects: { systemsDesign: 3, uxui: 2, art3d: 1 }, reason: "Shop sims need economy design and readable management UX." },
  { tag: "Farming", effects: { systemsDesign: 2 }, reason: "Farming loops need progression/economy design." },
  // New-market rules (tag strings as normalized from Steam: hyphens → spaces).
  { tag: "City Builder", effects: { systemsDesign: 3, gameplaySystems: 2, optimization: 2, uxui: 2, levelContent: 2 }, reason: "City builders need deep systems, dense UX and performance at scale." },
  { tag: "Resource Management", effects: { systemsDesign: 2 }, reason: "Resource loops need economy/balance design." },
  { tag: "Colony Sim", effects: { procedural: 4, systemsDesign: 4, gameplaySystems: 2 }, reason: "Colony sims are simulation- and systems-heavy with emergent AI." },
  { tag: "Metroidvania", effects: { levelContent: 4, animationVfx: 2, gameplaySystems: 2, art2d: 2 }, reason: "Metroidvanias need a large handcrafted interconnected world and animation." },
  { tag: "Souls-like", effects: { gameplaySystems: 2, qa: 2, animationVfx: 2 }, reason: "Souls-like combat needs tight systems, animation and heavy tuning." },
  { tag: "Platformer", effects: { gameplaySystems: 2, levelContent: 2, animationVfx: 2 }, reason: "Platformers need responsive systems and handcrafted levels." },
  { tag: "Tower Defense", effects: { systemsDesign: 3, gameplaySystems: 2, uxui: 2 }, reason: "Tower defense lives on systemic balance and readable UX." },
  { tag: "Action Roguelike", effects: { gameplaySystems: 3, procedural: 2, systemsDesign: 2 }, reason: "Action roguelikes need strong gameplay engineering and procedural runs." },
  { tag: "Rogue-lite", effects: { procedural: 2, systemsDesign: 2 }, reason: "Roguelites need procedural runs and systemic balance." },
  { tag: "Rogue-like", effects: { procedural: 2, systemsDesign: 2 }, reason: "Roguelikes need procedural runs and systemic balance." },
  { tag: "Hack and Slash", effects: { gameplaySystems: 2, animationVfx: 2 }, reason: "Hack-and-slash needs combat engineering and animation." },
  { tag: "Farming Sim", effects: { systemsDesign: 2, art2d: 2, levelContent: 2 }, reason: "Farming sims are content-forward with progression design." },
  { tag: "Life Sim", effects: { narrative: 2, systemsDesign: 2, art2d: 2 }, reason: "Life sims need writing, systemic loops and cozy art." },
  { tag: "Horror", effects: { audio: 3, levelContent: 2, art3d: 2 }, reason: "Horror leans on audio, atmosphere and environment content." },
  { tag: "Survival Horror", effects: { audio: 2, levelContent: 2 }, reason: "Survival horror needs tense audio and handcrafted spaces." },
  { tag: "Online Co-Op", effects: { networking: 3 }, reason: "Online co-op requires networked sessions and state sync." },
  { tag: "Moddable", effects: { gameplaySystems: 1, backend: 1 }, reason: "Mod support needs stable APIs and tooling." },
];

function applyEffects(
  acc: CapabilityVector,
  reasons: Partial<Record<CapabilityId, RequirementDetail[]>>,
  effects: Effects,
  reason: string,
) {
  for (const [id, delta] of Object.entries(effects) as [CapabilityId, number][]) {
    acc[id] = Math.min(5, (acc[id] ?? 0) + delta);
    (reasons[id] ??= []).push({ value: delta, source: "rule", reason });
  }
}

export function scopeClassOf(
  values: CapabilityVector,
  medianReviews: number,
): RequirementProfile["scopeClass"] {
  // Content + heavy-engineering load, nudged by market review scale.
  const load =
    values.levelContent * 1.4 +
    values.art3d * 1.2 +
    values.animationVfx +
    values.narrative +
    values.networking * 1.2 +
    values.backend * 1.3 +
    values.liveops;
  // Review scale nudges scope up a little, but must not let a few blockbuster exemplars
  // make every market look Large — production load dominates.
  const scaleBoost = medianReviews > 150000 ? 2 : medianReviews > 40000 ? 1 : 0;
  const s = load + scaleBoost;
  if (s >= 26) return "Very Large";
  if (s >= 18) return "Large";
  if (s >= 11) return "Medium";
  if (s >= 5) return "Small";
  return "Micro";
}

export function buildRequirementProfile(
  clusterTags: string[],
  medianReviews: number,
): RequirementProfile {
  const values = Object.fromEntries(
    CAPABILITY_IDS.map((id) => [id, 0]),
  ) as CapabilityVector;
  const details: Partial<Record<CapabilityId, RequirementDetail[]>> = {};

  applyEffects(values, details, BASE, "Baseline production floor for any shippable game.");

  // Normalize both sides identically (lowercase, hyphens → spaces) so rules match real
  // Steam tags regardless of hyphenation ("Co-op" ↔ "Co op", "Souls-like" ↔ "Souls like").
  const norm = (s: string) => s.toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();
  const clusterSet = new Set(clusterTags.map(norm));
  let matched = 0;
  for (const rule of RULES) {
    if (clusterSet.has(norm(rule.tag))) {
      applyEffects(values, details, rule.effects, rule.reason);
      matched += 1;
    }
  }

  // Confidence: more matched high-information rules → higher confidence (§34).
  // Rules are high-confidence; without observed-game evidence we cap below 100.
  const confidence = Math.min(90, 45 + matched * 8);

  return {
    values,
    details,
    confidence,
    scopeClass: scopeClassOf(values, medianReviews),
  };
}
