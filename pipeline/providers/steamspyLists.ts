// Candidate acquisition from SteamSpy list endpoints. These return review/owner/ccu
// data but NOT tags (tags come per-app via fetchGameLite). Used to assemble a broad,
// diverse pool of real games for automatic clustering (spec §18).

import { fetchJsonCached } from "./http";

const LIST_TTL = 3 * 24 * 3600 * 1000;

interface ListEntry {
  appid: number;
  name: string;
  owners: string; // "1,000,000 .. 2,000,000"
  positive: number;
  negative: number;
}

function ownersLower(owners: string): number {
  const m = owners.replace(/,/g, "").match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

async function fetchList(url: string): Promise<ListEntry[]> {
  const j = await fetchJsonCached<Record<string, any>>(url, LIST_TTL);
  if (!j) return [];
  return Object.values(j)
    .filter((e) => e && typeof e.appid === "number")
    .map((e) => ({
      appid: e.appid,
      name: e.name ?? "",
      owners: e.owners ?? "0",
      positive: e.positive ?? 0,
      negative: e.negative ?? 0,
    }));
}

/** Top `limit` apps in a genre, ranked by owner estimate (a rough popularity proxy). */
export async function fetchGenreTop(genre: string, limit: number): Promise<number[]> {
  const list = await fetchList(
    `https://steamspy.com/api.php?request=genre&genre=${encodeURIComponent(genre)}`,
  );
  return list
    .filter((e) => e.positive + e.negative >= 200) // some review evidence
    .sort((a, b) => ownersLower(b.owners) - ownersLower(a.owners))
    .slice(0, limit)
    .map((e) => e.appid);
}

export async function fetchTop100(
  kind: "top100in2weeks" | "top100forever" | "top100owned",
): Promise<number[]> {
  const list = await fetchList(`https://steamspy.com/api.php?request=${kind}`);
  return list.map((e) => e.appid);
}

/** Top `limit` apps carrying a given Steam tag, ranked by owner estimate. Filters out
 *  apps with little review evidence. Real membership, no hand-guessed appIds. */
export async function fetchTagTop(
  tag: string,
  limit: number,
  minReviews = 500,
): Promise<number[]> {
  const list = await fetchList(
    `https://steamspy.com/api.php?request=tag&tag=${encodeURIComponent(tag)}`,
  );
  return list
    .filter((e) => e.positive + e.negative >= minReviews)
    .sort((a, b) => ownersLower(b.owners) - ownersLower(a.owners))
    .slice(0, limit)
    .map((e) => e.appid);
}
