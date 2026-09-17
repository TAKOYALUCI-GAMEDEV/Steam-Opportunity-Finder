import type { Dataset, MarketCluster, Game } from "@/types/dataset";

let cache: Dataset | null = null;

export async function loadDataset(): Promise<Dataset> {
  if (cache) return cache;
  const url = `${import.meta.env.BASE_URL}data/dataset.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to load dataset (${res.status}). Run \`npm run data\` to generate it.`,
    );
  }
  cache = (await res.json()) as Dataset;
  return cache;
}

export function clusterById(ds: Dataset, id: string): MarketCluster | undefined {
  return ds.clusters.find((c) => c.id === id || c.slug === id);
}

export function gamesOf(ds: Dataset, cluster: MarketCluster): Game[] {
  const set = new Set(cluster.gameAppIds);
  return ds.games.filter((g) => set.has(g.appId));
}
