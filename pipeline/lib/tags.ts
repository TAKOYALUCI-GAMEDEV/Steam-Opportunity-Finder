// Tag normalization & information weight (spec §17). Generic tags carry little market
// information and are down-weighted; rare meaningful tags carry more. Initial weight is
// based on inverse document frequency.

import type { Game, TagInfo } from "../../src/types/dataset";

// Low-information tags (spec §17). Down-weighted, not removed.
export const GENERIC_TAGS = new Set(
  [
    "Indie",
    "Singleplayer",
    "Action",
    "Casual",
    "Adventure",
    "Simulation",
    "Strategy",
    "RPG",
    "Multiplayer",
    "Great Soundtrack",
    "Atmospheric",
    "2D",
    "3D",
    "Colorful",
    "Cute",
    "Funny",
    "Family Friendly",
  ].map((t) => t.toLowerCase()),
);

export function computeTagInfo(games: Game[]): TagInfo[] {
  const n = games.length || 1;
  const df = new Map<string, number>();
  for (const g of games)
    for (const t of new Set(g.tags)) df.set(t, (df.get(t) ?? 0) + 1);

  const infos: TagInfo[] = [];
  for (const [name, count] of df.entries()) {
    const generic = GENERIC_TAGS.has(name.toLowerCase());
    // idf normalized to 0..1 against the theoretical max (a tag in a single game).
    const idf = Math.log(n / count) / Math.log(n / 1 || 1);
    const base = Number.isFinite(idf) ? Math.max(0, idf) : 0;
    const informationWeight = Math.round((generic ? base * 0.2 : base) * 100) / 100;
    infos.push({ name, informationWeight, gameCount: count, generic });
  }
  return infos.sort((a, b) => b.informationWeight - a.informationWeight);
}
