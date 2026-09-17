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
    primaryTags: ["Automation"],
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
    primaryTags: ["Deckbuilding"],
    secondaryTags: ["Card Game", "Strategy", "Tactical RPG", "Indie"],
  },
  {
    slug: "shop-management",
    name: "Co-op Shop Management",
    description:
      "First-person / management shop-keeping sims, often with drop-in co-op. A wave of small sims has crowded the space — high supply and success concentrated in a few breakouts. Low production burden, but a saturated field for newcomers.",
    primaryTags: ["Shop Keeper"],
    secondaryTags: ["Simulation", "Co-op", "Economy", "First-Person", "Singleplayer"],
  },
  {
    slug: "colony-sim",
    name: "Colony Simulation",
    description:
      "Deep colony/base management with emergent stories and simulation. Systemic and AI-heavy; low art burden but high design complexity.",
    primaryTags: ["Colony Sim"],
    secondaryTags: ["Simulation", "Survival", "Strategy", "Management", "Sandbox"],
  },
  {
    slug: "cozy-farm-sim",
    name: "Cozy Farm & Life Sim",
    description:
      "Relaxing farming and life sims with light social loops. Broad, distributed demand; content-forward but low-tech.",
    primaryTags: ["Farming Sim"],
    secondaryTags: ["Cozy", "Relaxing", "Simulation", "Pixel Graphics", "Singleplayer"],
  },
  {
    slug: "tower-defense",
    name: "Tower Defense",
    description:
      "Strategic lane/grid defense. Systemic and UX-driven with modest content; a classic fit for small strategy-minded teams.",
    primaryTags: ["Tower Defense"],
    secondaryTags: ["Strategy", "Casual", "Roguelike", "Singleplayer"],
  },
  {
    slug: "metroidvania",
    name: "Metroidvania",
    description:
      "Interconnected exploration-platformers with ability-gated progression. Handcrafted-content and animation heavy.",
    primaryTags: ["Metroidvania"],
    secondaryTags: ["Action", "Souls-like", "Pixel Graphics", "Exploration"],
  },
  {
    slug: "action-roguelite",
    name: "Action Roguelite",
    description:
      "Fast run-based action with procedural progression (survivors-likes, dungeon crawlers). Systemic, replay-driven, moderate content.",
    primaryTags: ["Action Roguelike"],
    secondaryTags: ["Roguelike", "Bullet Hell", "Fast-Paced", "Pixel Graphics"],
  },
  {
    slug: "city-builder",
    name: "City Builder",
    description:
      "Large-scale city and settlement building with logistics and economy. Systemic but production-heavy at the top end.",
    primaryTags: ["City Builder"],
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
  {
    slug: "creature-collector",
    name: "Creature Collector RPG",
    description:
      "Monster-taming / creature-collection RPGs (the Pokémon fantasy). Content- and systems-heavy — lots of creatures, moves and balance — but proven, loyal demand.",
    primaryTags: ["Creature Collector"],
    secondaryTags: ["Turn-Based", "Monster Taming", "Pixel Graphics", "Adventure"],
  },
  // ── Niche "sleeper" markets — small, specific fantasies where a breakout can prove
  //    unexpected demand (feature spec Hidden Demand). Curated to keep them genuinely
  //    niche (auto tag-top would drown them in big off-theme titles). ────────────────
  {
    slug: "cleaning-sim",
    name: "Cleaning & Chore Sim",
    description:
      "Oddly-satisfying cleaning / restoration sims (the PowerWash fantasy). Long a tiny niche until a breakout proved broad demand; very low production burden.",
    primaryTags: ["Cleaning"],
    secondaryTags: ["Relaxing", "Simulation", "Satisfying", "First-Person"],
  },
  {
    slug: "fishing-sim",
    name: "Fishing & Angling",
    description:
      "Dedicated fishing games — from cozy to eerie. A small, loyal niche with occasional breakouts that far outperform the field.",
    primaryTags: ["Fishing"],
    secondaryTags: ["Relaxing", "Simulation", "Adventure", "Atmospheric"],
  },
  {
    slug: "diving-sim",
    name: "Underwater & Diving",
    description:
      "Underwater exploration / diving. Atmospheric and content-forward, small in number but with standout performers.",
    primaryTags: ["Underwater"],
    secondaryTags: ["Diving", "Exploration", "Atmospheric", "Survival"],
  },
  {
    slug: "detective-deduction",
    name: "Detective & Deduction",
    description:
      "Investigation and deduction games built on evidence and reasoning. Niche but critically beloved, with breakouts that vastly outperform expectations.",
    primaryTags: ["Detective"],
    secondaryTags: ["Mystery", "Investigation", "Story Rich", "Puzzle"],
  },
];
