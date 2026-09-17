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
  {
    slug: "colony-sim",
    name: "Colony Simulation",
    description:
      "Deep colony/base management with emergent stories and simulation. Systemic and AI-heavy; low art burden but high design complexity.",
    primaryTags: ["Colony Sim", "Base Building"],
    secondaryTags: ["Simulation", "Survival", "Strategy", "Management", "Sandbox"],
  },
  {
    slug: "cozy-farm-sim",
    name: "Cozy Farm & Life Sim",
    description:
      "Relaxing farming and life sims with light social loops. Broad, distributed demand; content-forward but low-tech.",
    primaryTags: ["Farming Sim", "Life Sim"],
    secondaryTags: ["Cozy", "Relaxing", "Simulation", "Pixel Graphics", "Singleplayer"],
  },
  {
    slug: "tower-defense",
    name: "Tower Defense",
    description:
      "Strategic lane/grid defense. Systemic and UX-driven with modest content; a classic fit for small strategy-minded teams.",
    primaryTags: ["Tower Defense", "Strategy"],
    secondaryTags: ["Strategy", "Casual", "Roguelike", "Singleplayer"],
  },
  {
    slug: "metroidvania",
    name: "Metroidvania",
    description:
      "Interconnected exploration-platformers with ability-gated progression. Handcrafted-content and animation heavy.",
    primaryTags: ["Metroidvania", "Platformer"],
    secondaryTags: ["Action", "Souls-like", "Pixel Graphics", "Exploration"],
  },
  {
    slug: "action-roguelite",
    name: "Action Roguelite",
    description:
      "Fast run-based action with procedural progression (survivors-likes, dungeon crawlers). Systemic, replay-driven, moderate content.",
    primaryTags: ["Roguelite", "Action"],
    secondaryTags: ["Roguelike", "Bullet Hell", "Fast-Paced", "Pixel Graphics"],
  },
  {
    slug: "city-builder",
    name: "City Builder",
    description:
      "Large-scale city and settlement building with logistics and economy. Systemic but production-heavy at the top end.",
    primaryTags: ["City Builder", "Base Building"],
    secondaryTags: ["Management", "Strategy", "Economy", "Simulation"],
  },
  {
    slug: "coop-horror",
    name: "Co-op Survival Horror",
    description:
      "Small-session online co-op horror — a fast-growing, breakout-prone market. Networking-dependent, which is a real gate for some teams.",
    primaryTags: ["Horror", "Online Co-Op"],
    secondaryTags: ["Co-op", "Multiplayer", "Survival Horror", "First-Person"],
  },
];
