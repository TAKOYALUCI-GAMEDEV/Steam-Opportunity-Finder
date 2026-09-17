// Automatic market discovery via tag co-occurrence / frequent-itemset mining (spec §18).
// Deterministic (no LLM). Given games with real ordered Steam tags, it:
//   1. builds transactions from each game's informative tags (generic tags dropped, §17)
//   2. mines frequent tag itemsets of size 2–4 (Apriori; FP-Growth-equivalent here)
//   3. drops itemsets below min support (§18 step 5)
//   4. merges highly-overlapping clusters, preferring the more general market (step 6)
//   5. names each cluster from its defining tags (step 7)
// Output is a list of discovered market seeds with explicit member appIds.

import type { Game } from "../../src/types/dataset";
import { GENERIC_TAGS } from "../lib/tags";

export interface DiscoveredSeed {
  slug: string;
  name: string;
  description: string;
  primaryTags: string[];
  secondaryTags: string[];
  memberAppIds: number[];
  support: number;
}

export interface DiscoverOptions {
  minSupport: number; // min games per cluster (§18 step 5)
  maxItemsetSize: number; // 4
  tagsPerGame: number; // informative tags kept per game
  maxClusters: number;
  mergeContainment: number; // 0..1; drop a cluster this contained in a selected one
  // A market must contain at least one DISTINCTIVE tag — one appearing in fewer than
  // this fraction of the pool (spec §17 inverse-frequency: rare tags carry the market
  // information). This kills broad genre pairs like "Open World + Sandbox".
  distinctiveCeiling: number;
  // Drop mega-clusters spanning more than this fraction of the pool — a real "market"
  // is not a third of everything on Steam.
  maxSupportFraction: number;
}

const DEFAULTS: DiscoverOptions = {
  minSupport: 6,
  maxItemsetSize: 4,
  tagsPerGame: 8,
  maxClusters: 30,
  mergeContainment: 0.6,
  distinctiveCeiling: 0.18,
  maxSupportFraction: 0.28,
};

function slugify(tags: string[]): string {
  return tags
    .map((t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))
    .join("_");
}

// A readable market name from the defining tags (§18 step 7).
function nameFor(tags: string[]): string {
  return tags.join(" + ");
}

/** Informative transaction tags for a game: drop generic tags, keep top-K by order. */
function txTags(game: Game, k: number): string[] {
  const kept: string[] = [];
  for (const t of game.tags) {
    if (GENERIC_TAGS.has(t.toLowerCase())) continue;
    kept.push(t);
    if (kept.length >= k) break;
  }
  return kept;
}

export function discoverClusters(
  games: Game[],
  options: Partial<DiscoverOptions> = {},
): DiscoveredSeed[] {
  const opts = { ...DEFAULTS, ...options };

  // Transactions: appId → Set(informative tags).
  const tx = new Map<number, Set<string>>();
  for (const g of games) tx.set(g.appId, new Set(txTags(g, opts.tagsPerGame)));

  const gamesWithTag = (tags: string[]): number[] => {
    const ids: number[] = [];
    for (const g of games) {
      const s = tx.get(g.appId)!;
      if (tags.every((t) => s.has(t))) ids.push(g.appId);
    }
    return ids;
  };

  // Frequent 1-itemsets.
  const tagCount = new Map<string, number>();
  for (const s of tx.values()) for (const t of s) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  let frequentTags = [...tagCount.entries()]
    .filter(([, c]) => c >= opts.minSupport)
    .map(([t]) => t)
    .sort();

  // Apriori: grow itemsets while all subsets remain frequent.
  const itemsets: { tags: string[]; members: number[] }[] = [];
  let prevFrequent: string[][] = frequentTags.map((t) => [t]);

  for (let size = 2; size <= opts.maxItemsetSize; size++) {
    const candidates = new Map<string, string[]>();
    // Join step: union pairs of (size-1)-itemsets sharing a prefix.
    for (let i = 0; i < prevFrequent.length; i++) {
      for (let j = i + 1; j < prevFrequent.length; j++) {
        const a = prevFrequent[i];
        const b = prevFrequent[j];
        const merged = [...new Set([...a, ...b])].sort();
        if (merged.length !== size) continue;
        candidates.set(merged.join("|"), merged);
      }
    }
    const nextFrequent: string[][] = [];
    for (const tags of candidates.values()) {
      const members = gamesWithTag(tags);
      if (members.length >= opts.minSupport) {
        nextFrequent.push(tags);
        itemsets.push({ tags, members });
      }
    }
    if (nextFrequent.length === 0) break;
    prevFrequent = nextFrequent;
  }

  // Rank: prefer larger support, then more specific (longer) itemsets.
  itemsets.sort((a, b) => b.members.length - a.members.length || b.tags.length - a.tags.length);

  // Merge highly-overlapping clusters, preferring the more GENERAL market (§18 step 6).
  // Process shorter itemsets first so a general 2-tag market wins over its 3-tag subset.
  const byGenerality = [...itemsets].sort(
    (a, b) => a.tags.length - b.tags.length || b.members.length - a.members.length,
  );
  const selected: { tags: string[]; members: number[]; set: Set<number> }[] = [];
  for (const it of byGenerality) {
    const set = new Set(it.members);
    const redundant = selected.some((s) => {
      const inter = it.members.filter((m) => s.set.has(m)).length;
      return inter / it.members.length >= opts.mergeContainment;
    });
    if (!redundant) selected.push({ tags: it.tags, members: it.members, set });
  }

  // Distinctiveness + size filters (spec §17): a market must have a rare anchor tag and
  // must not span a huge share of the pool.
  const N = games.length;
  const distinctiveMax = opts.distinctiveCeiling * N;
  const sizeMax = opts.maxSupportFraction * N;
  const qualified = selected.filter((c) => {
    if (c.members.length > sizeMax) return false;
    return c.tags.some((t) => (tagCount.get(t) ?? 0) <= distinctiveMax);
  });

  // Rank by niche information: rarest anchor first (most distinctive markets), tie-broken
  // by support so a distinctive market with real evidence rises.
  const rarity = (tags: string[]) =>
    Math.min(...tags.map((t) => tagCount.get(t) ?? Infinity));
  qualified.sort(
    (a, b) => rarity(a.tags) - rarity(b.tags) || b.members.length - a.members.length,
  );
  const chosen = qualified.slice(0, opts.maxClusters);

  return chosen.map((c) => {
    // Secondary tags: most common member tags not already in the defining set.
    const co = new Map<string, number>();
    for (const id of c.members) {
      const g = games.find((x) => x.appId === id)!;
      for (const t of g.tags) {
        if (c.tags.includes(t) || GENERIC_TAGS.has(t.toLowerCase())) continue;
        co.set(t, (co.get(t) ?? 0) + 1);
      }
    }
    const secondaryTags = [...co.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t]) => t);
    return {
      slug: slugify(c.tags),
      name: nameFor(c.tags),
      description: `Auto-discovered market defined by ${c.tags.join(", ")} (${c.members.length} games).`,
      primaryTags: c.tags,
      secondaryTags,
      memberAppIds: c.members,
      support: c.members.length,
    };
  });
}
