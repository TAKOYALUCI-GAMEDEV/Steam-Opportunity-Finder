// Fixture games (spec §69). Deliberately shaped to produce the archetypes the spec
// requires: high-demand/low-supply, high-demand/high-supply, low-demand/low-supply,
// blockbuster-dominated, and distributed-success markets. Tags are ORDERED
// (highest-weighted first, spec §13). Review counts drive demand; release dates and
// counts drive supply. This is intentionally small and hand-authored so analytics and
// UI development stay deterministic.

export interface RawGame {
  appId: number;
  name: string;
  tags: string[];
  reviewTotal: number;
  reviewScorePercent: number;
  releaseDate: string; // ISO
  currentPlayers?: number;
  price?: number;
  comingSoon?: boolean;
  earlyAccess?: boolean;
  developer?: string;
  reviewVelocity30d?: number; // reviews/day recent
}

export const FIXTURE_GAMES: RawGame[] = [
  // ── Cozy Automation (Automation + Base Building + Relaxing) ────────────────
  // Archetype: HIGH demand / LOW supply, DISTRIBUTED success (many mid hits).
  { appId: 1001, name: "Gearbloom", tags: ["Automation", "Base Building", "Relaxing", "Singleplayer", "Indie"], reviewTotal: 8200, reviewScorePercent: 96, releaseDate: "2024-03-11", currentPlayers: 3400, price: 19.99, reviewVelocity30d: 42 },
  { appId: 1002, name: "Conveyor Cottage", tags: ["Automation", "Base Building", "Cozy", "Crafting", "Indie"], reviewTotal: 5400, reviewScorePercent: 94, releaseDate: "2024-08-02", currentPlayers: 2100, price: 16.99, reviewVelocity30d: 55 },
  { appId: 1003, name: "Little Foundries", tags: ["Automation", "Relaxing", "Base Building", "Management", "Indie"], reviewTotal: 3100, reviewScorePercent: 93, releaseDate: "2025-01-20", currentPlayers: 1500, price: 14.99, reviewVelocity30d: 70 },
  { appId: 1004, name: "Meadow Machines", tags: ["Automation", "Base Building", "Farming", "Relaxing"], reviewTotal: 2600, reviewScorePercent: 91, releaseDate: "2023-11-05", currentPlayers: 900, price: 17.99, reviewVelocity30d: 18 },
  { appId: 1005, name: "Sproutworks", tags: ["Automation", "Cozy", "Crafting", "Base Building"], reviewTotal: 1400, reviewScorePercent: 90, releaseDate: "2025-04-14", currentPlayers: 680, price: 12.99, reviewVelocity30d: 33 },

  // ── Survival Craft (Survival + Crafting + Open World + Multiplayer) ─────────
  // Archetype: HIGH demand / HIGH supply, BLOCKBUSTER-DOMINATED (one giant).
  { appId: 2001, name: "Frontier Unbound", tags: ["Survival", "Open World", "Crafting", "Multiplayer", "Base Building"], reviewTotal: 412000, reviewScorePercent: 89, releaseDate: "2019-06-18", currentPlayers: 88000, price: 29.99, reviewVelocity30d: 210 },
  { appId: 2002, name: "Coldreach", tags: ["Survival", "Crafting", "Open World", "Multiplayer", "Exploration"], reviewTotal: 26000, reviewScorePercent: 82, releaseDate: "2022-02-09", currentPlayers: 5400, price: 24.99, reviewVelocity30d: 40 },
  { appId: 2003, name: "Emberwake", tags: ["Survival", "Crafting", "Multiplayer", "Open World"], reviewTotal: 14500, reviewScorePercent: 78, releaseDate: "2023-05-30", currentPlayers: 2600, price: 19.99, reviewVelocity30d: 25 },
  { appId: 2004, name: "Driftlands", tags: ["Survival", "Open World", "Crafting", "Multiplayer", "Building"], reviewTotal: 9800, reviewScorePercent: 74, releaseDate: "2024-01-15", currentPlayers: 1800, price: 22.99, reviewVelocity30d: 30, earlyAccess: true },
  { appId: 2005, name: "Hollow Tide", tags: ["Survival", "Crafting", "Open World", "Multiplayer"], reviewTotal: 4200, reviewScorePercent: 69, releaseDate: "2024-09-22", currentPlayers: 700, price: 18.99, reviewVelocity30d: 22 },
  { appId: 2006, name: "Ashen Expanse", tags: ["Survival", "Open World", "Crafting", "Multiplayer", "PvP"], reviewTotal: 6100, reviewScorePercent: 71, releaseDate: "2025-02-11", currentPlayers: 1300, price: 24.99, reviewVelocity30d: 48, earlyAccess: true },
  { appId: 2007, name: "Verdant Ruin", tags: ["Survival", "Crafting", "Open World", "Base Building"], reviewTotal: 3300, reviewScorePercent: 76, releaseDate: "2025-06-03", currentPlayers: 900, price: 19.99, reviewVelocity30d: 60, comingSoon: false, earlyAccess: true },

  // ── Physics Puzzle (Physics + Puzzle + Comedy) ─────────────────────────────
  // Archetype: LOW-MID demand / LOW supply. Small distributed niche.
  { appId: 3001, name: "Wobble Works", tags: ["Physics", "Puzzle", "Comedy", "Singleplayer", "Indie"], reviewTotal: 3800, reviewScorePercent: 95, releaseDate: "2023-07-19", currentPlayers: 420, price: 12.99, reviewVelocity30d: 9 },
  { appId: 3002, name: "Tumble Tower", tags: ["Physics", "Puzzle", "Casual", "Comedy"], reviewTotal: 1200, reviewScorePercent: 92, releaseDate: "2024-10-01", currentPlayers: 180, price: 9.99, reviewVelocity30d: 7 },
  { appId: 3003, name: "Ragdoll Rally", tags: ["Physics", "Comedy", "Puzzle", "Funny"], reviewTotal: 640, reviewScorePercent: 88, releaseDate: "2025-03-08", currentPlayers: 95, price: 7.99, reviewVelocity30d: 6 },
  { appId: 3004, name: "Contraption Club", tags: ["Physics", "Puzzle", "Building", "Sandbox"], reviewTotal: 900, reviewScorePercent: 90, releaseDate: "2024-04-25", currentPlayers: 130, price: 11.99, reviewVelocity30d: 4 },

  // ── Roguelike Deckbuilder (Deckbuilding + Roguelike) ───────────────────────
  // Archetype: MID-HIGH demand / MID-HIGH supply, distributed with a few big hits.
  { appId: 4001, name: "Spellsplit", tags: ["Deckbuilding", "Roguelike", "Card Game", "Strategy", "Singleplayer"], reviewTotal: 52000, reviewScorePercent: 97, releaseDate: "2021-09-14", currentPlayers: 6200, price: 14.99, reviewVelocity30d: 35 },
  { appId: 4002, name: "Runebound Deck", tags: ["Deckbuilding", "Roguelike", "Strategy", "Card Game"], reviewTotal: 18000, reviewScorePercent: 93, releaseDate: "2023-01-27", currentPlayers: 2400, price: 19.99, reviewVelocity30d: 40 },
  { appId: 4003, name: "Hex & Hoard", tags: ["Deckbuilding", "Roguelike", "Card Game", "Tactical RPG"], reviewTotal: 7600, reviewScorePercent: 91, releaseDate: "2024-06-10", currentPlayers: 1400, price: 17.99, reviewVelocity30d: 52 },
  { appId: 4004, name: "Draw of Fate", tags: ["Deckbuilding", "Roguelike", "Strategy"], reviewTotal: 3900, reviewScorePercent: 89, releaseDate: "2025-01-30", currentPlayers: 800, price: 15.99, reviewVelocity30d: 44 },
  { appId: 4005, name: "Arcane Ante", tags: ["Deckbuilding", "Roguelike", "Card Game", "Indie"], reviewTotal: 2100, reviewScorePercent: 87, releaseDate: "2025-05-19", currentPlayers: 520, price: 13.99, reviewVelocity30d: 66 },

  // ── Shop Management (Shop Keeper + Management + Co-op) ──────────────────────
  // Archetype: HIGH demand / LOW-MID supply, growing fast, distributed. Strong fit
  // for a small systemic team (spec §73 demo team).
  { appId: 5001, name: "Corner Store Co", tags: ["Shop Keeper", "Management", "Simulation", "Co-op", "Economy"], reviewTotal: 15400, reviewScorePercent: 92, releaseDate: "2024-05-16", currentPlayers: 4100, price: 16.99, reviewVelocity30d: 120 },
  { appId: 5002, name: "Restock Rush", tags: ["Shop Keeper", "Management", "Simulation", "First-Person", "Co-op"], reviewTotal: 8800, reviewScorePercent: 90, releaseDate: "2024-11-09", currentPlayers: 2600, price: 14.99, reviewVelocity30d: 150 },
  { appId: 5003, name: "Boutique Boss", tags: ["Shop Keeper", "Management", "Economy", "Simulation"], reviewTotal: 4200, reviewScorePercent: 88, releaseDate: "2025-02-28", currentPlayers: 1200, price: 13.99, reviewVelocity30d: 95 },
  { appId: 5004, name: "Pawn & Order", tags: ["Shop Keeper", "Management", "Simulation", "Singleplayer"], reviewTotal: 2600, reviewScorePercent: 86, releaseDate: "2025-04-02", currentPlayers: 700, price: 12.99, reviewVelocity30d: 80 },
  { appId: 5005, name: "Repair Bay", tags: ["Shop Keeper", "Simulation", "Management", "First-Person", "Co-op"], reviewTotal: 1800, reviewScorePercent: 89, releaseDate: "2025-07-12", currentPlayers: 640, price: 15.99, reviewVelocity30d: 110, earlyAccess: true },
];
