// Curated cluster seeds for the fixture dataset. Spec §18 allows curated cluster
// definitions for V1; FP-Growth / co-occurrence mining is the swap-in for real Steam
// data (many games). Each seed defines the market by its primary tags; the pipeline
// assigns member games (games containing ALL primaryTags), computes market metrics,
// and derives the 15-dim requirement profile via rules (§33).

export interface ClusterSeed {
  slug: string;
  name: string; // human-readable market name (spec §18 step 7)
  description: string;
  primaryTags: string[]; // membership: a game must contain all of these
  secondaryTags: string[];
}

export const CLUSTER_SEEDS: ClusterSeed[] = [
  {
    slug: "cozy-automation",
    name: "Cozy Automation Builders",
    description:
      "Relaxing factory/automation games with base building and a low-stress tone. Systemic depth without twitch or content-heavy demands.",
    primaryTags: ["Automation", "Base Building"],
    secondaryTags: ["Relaxing", "Cozy", "Crafting", "Farming", "Management"],
  },
  {
    slug: "survival-craft",
    name: "Open-World Survival Craft",
    description:
      "Large multiplayer survival-crafting sandboxes. High demand but crowded and dominated by long-tail giants; heavy production and networking burden.",
    primaryTags: ["Survival", "Crafting"],
    secondaryTags: ["Open World", "Multiplayer", "Base Building", "PvP", "Exploration"],
  },
  {
    slug: "physics-puzzle",
    name: "Physics Puzzle Comedy",
    description:
      "Small, charming physics-driven puzzle and comedy games. Low supply, modest but stable demand; light content footprint.",
    primaryTags: ["Physics", "Puzzle"],
    secondaryTags: ["Comedy", "Casual", "Sandbox", "Building", "Funny"],
  },
  {
    slug: "roguelike-deckbuilder",
    name: "Roguelike Deckbuilders",
    description:
      "Card-based roguelike strategy. Proven distributed demand with recurring breakouts; systemic and UX heavy, low content burden.",
    primaryTags: ["Deckbuilding", "Roguelike"],
    secondaryTags: ["Card Game", "Strategy", "Tactical RPG", "Indie"],
  },
  {
    slug: "shop-management",
    name: "Co-op Shop Management",
    description:
      "First-person / management shop-keeping sims, increasingly with drop-in co-op. Fast-growing demand, still-manageable supply; strong fit for small systemic teams.",
    primaryTags: ["Shop Keeper", "Management"],
    secondaryTags: ["Simulation", "Co-op", "Economy", "First-Person", "Singleplayer"],
  },
];
