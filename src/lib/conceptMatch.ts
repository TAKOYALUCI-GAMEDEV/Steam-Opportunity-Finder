// Concept Validator matching (spec §52) — static, deterministic "semantic-lite".
// A natural-language concept is mapped to Steam tags (via keyword rules + direct tag
// mentions), then scored against markets and games by weighted tag overlap. This is NOT
// deep embeddings (impossible to run in-browser under the CSP); it is honest keyword/tag
// matching over the real dataset. Phase-2 pgvector embeddings would replace this engine.

import type { Dataset, Game, MarketCluster } from "@/types/dataset";

const norm = (s: string) => s.toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();

// Phrase / keyword → canonical Steam tags. Order-independent; substrings matched on the
// normalized concept text.
const KEYWORD_TAGS: [string[], string[]][] = [
  [["shop", "store", "retail", "shelf", "shelves", "stock", "cashier", "sell items", "shopkeeper"], ["Shop Keeper", "Management", "Economy"]],
  [["co op", "coop", "co-op", "with friends", "multiplayer", "online co"], ["Co op", "Online Co Op", "Multiplayer"]],
  [["farm", "farming", "crops", "harvest", "grow crops", "ranch"], ["Farming Sim", "Simulation", "Life Sim"]],
  [["deck", "cards", "card game", "deckbuild"], ["Deckbuilding", "Card Game"]],
  [["automation", "factory", "conveyor", "assembly line", "automate", "production line"], ["Automation", "Base Building"]],
  [["survive", "survival", "gather resources", "hunger", "shelter"], ["Survival", "Crafting"]],
  [["craft", "crafting", "build items"], ["Crafting"]],
  [["tower defense", "defend waves", "defend the", "waves of enemies"], ["Tower Defense", "Strategy"]],
  [["colony", "settlers", "settlement", "manage a base", "base management"], ["Colony Sim", "Base Building"]],
  [["city", "build a city", "urban", "metropolis", "town builder"], ["City Builder", "Management"]],
  [["horror", "scary", "ghost", "monster", "haunt", "creepy"], ["Horror", "Survival Horror"]],
  [["roguelike", "roguelite", "run based", "permadeath", "each run"], ["Roguelite", "Roguelike"]],
  [["physics", "ragdoll", "physics based"], ["Physics"]],
  [["platformer", "jump", "wall jump", "precision"], ["Platformer"]],
  [["metroidvania", "explore a connected", "ability gated", "backtrack"], ["Metroidvania", "Exploration"]],
  [["puzzle", "solve puzzles", "brain teaser"], ["Puzzle"]],
  [["cozy", "relaxing", "chill", "wholesome", "low stress"], ["Cozy", "Relaxing"]],
  [["first person", "first-person", "fps"], ["First Person"]],
  [["open world", "explore the world", "vast world"], ["Open World"]],
  [["rpg", "level up", "character build", "skill tree"], ["RPG", "Character Customization"]],
  [["management", "manage", "run a business", "tycoon"], ["Management", "Economy", "Simulation"]],
  [["build", "building", "construct"], ["Building", "Base Building"]],
  [["dungeon", "hack and slash", "loot"], ["Hack and Slash", "Action Roguelike"]],
];

export interface QueryTag {
  tag: string;
  weight: number;
}

export function conceptToTags(text: string, dataset: Dataset): QueryTag[] {
  const t = norm(text);
  const weights = new Map<string, number>();
  const add = (tag: string, w: number) =>
    weights.set(tag, Math.max(weights.get(tag) ?? 0, w));

  // Keyword rules.
  for (const [phrases, tags] of KEYWORD_TAGS)
    if (phrases.some((p) => t.includes(norm(p)))) tags.forEach((tag) => add(tag, 1));

  // Direct tag mentions (all words of a real tag appear in the text).
  for (const info of dataset.tags) {
    const words = norm(info.name).split(" ");
    if (words.every((w) => w.length > 2 && t.includes(w)))
      add(info.name, info.generic ? 0.4 : 1.1);
  }

  return [...weights.entries()]
    .map(([tag, weight]) => ({ tag, weight }))
    .sort((a, b) => b.weight - a.weight);
}

export interface MarketMatch {
  cluster: MarketCluster;
  score: number; // 0..100
  matchedTags: string[];
}

function clusterTagWeight(cluster: MarketCluster, tag: string): number {
  const n = norm(tag);
  if (cluster.primaryTags.some((x) => norm(x) === n)) return 1;
  if (cluster.secondaryTags.some((x) => norm(x) === n)) return 0.6;
  return 0;
}

export function matchMarkets(query: QueryTag[], dataset: Dataset): MarketMatch[] {
  const totalW = query.reduce((a, q) => a + q.weight, 0) || 1;
  return dataset.clusters
    .map((cluster) => {
      let s = 0;
      const matched: string[] = [];
      for (const q of query) {
        const w = clusterTagWeight(cluster, q.tag);
        if (w > 0) {
          s += q.weight * w;
          matched.push(q.tag);
        }
      }
      return { cluster, score: Math.round((s / totalW) * 100), matchedTags: matched };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);
}

export interface GameMatch {
  game: Game;
  score: number;
  matchedTags: string[];
}

export function matchGames(query: QueryTag[], dataset: Dataset, limit = 8): GameMatch[] {
  const qset = new Map(query.map((q) => [norm(q.tag), q.weight]));
  const totalW = query.reduce((a, q) => a + q.weight, 0) || 1;
  return dataset.games
    .map((game) => {
      let s = 0;
      const matched: string[] = [];
      for (const tag of game.tags) {
        const w = qset.get(norm(tag));
        if (w) {
          s += w;
          matched.push(tag);
        }
      }
      return { game, score: Math.round((s / totalW) * 100), matchedTags: matched };
    })
    .filter((g) => g.score > 0)
    .sort((a, b) => b.score - a.score || (b.game.reviewTotal ?? 0) - (a.game.reviewTotal ?? 0))
    .slice(0, limit);
}

// Differentiators: query tags that the closest market does NOT define — the angle that
// would set a new entrant apart (spec §52 "Possible Differentiators").
export function differentiators(query: QueryTag[], cluster: MarketCluster): string[] {
  return query
    .filter((q) => clusterTagWeight(cluster, q.tag) === 0)
    .map((q) => q.tag);
}
