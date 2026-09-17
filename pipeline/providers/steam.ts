// Steam data providers (spec §12/§13). Each external source sits behind a small
// function so it can be replaced without touching analytics. Uses only public,
// keyless endpoints + SteamSpy for tags. Never scrapes SteamDB (spec §13).

import type { DataProvenance, Game } from "../../src/types/dataset";
import { fetchJsonCached } from "./http";

const REVIEWS_TTL = 24 * 3600 * 1000; // daily (§15)
const CCU_TTL = 6 * 3600 * 1000;
const META_TTL = 7 * 24 * 3600 * 1000; // weekly (§15)

function normalizeTag(name: string): string {
  return name.replace(/-/g, " ").replace(/\s+/g, " ").trim();
}

function parseReleaseDate(raw?: string): { iso: string | null; comingSoon: boolean } {
  if (!raw) return { iso: null, comingSoon: true };
  const t = Date.parse(raw);
  if (!Number.isNaN(t)) return { iso: new Date(t).toISOString().slice(0, 10), comingSoon: false };
  return { iso: null, comingSoon: /coming|soon|tba|q[1-4]/i.test(raw) };
}

interface ReviewSummary {
  total: number;
  positive: number;
  negative: number;
  scorePercent: number;
}

export async function fetchReviewSummary(appId: number): Promise<ReviewSummary | null> {
  const url = `https://store.steampowered.com/appreviews/${appId}?json=1&num_per_page=0&language=all&purchase_type=all&filter=all`;
  const j = await fetchJsonCached<any>(url, REVIEWS_TTL);
  const q = j?.query_summary;
  if (!q || j.success !== 1) return null;
  const total = q.total_reviews ?? 0;
  const positive = q.total_positive ?? 0;
  return {
    total,
    positive,
    negative: q.total_negative ?? 0,
    scorePercent: total > 0 ? Math.round((positive / total) * 100) : 0,
  };
}

// Recent review velocity (spec §20): reviews/day over the window covered by the most
// recent reviews page. A real recency signal without needing stored snapshots yet.
export async function fetchRecentVelocity(appId: number): Promise<number | null> {
  const url = `https://store.steampowered.com/appreviews/${appId}?json=1&num_per_page=100&language=all&purchase_type=all&filter=recent`;
  const j = await fetchJsonCached<any>(url, REVIEWS_TTL);
  const reviews: any[] = j?.reviews ?? [];
  if (reviews.length < 5) return reviews.length === 0 ? null : 0.1;
  const ts = reviews
    .map((r) => r.timestamp_created as number)
    .filter((x) => typeof x === "number")
    .sort((a, b) => a - b);
  const spanDays = (ts[ts.length - 1] - ts[0]) / 86400;
  if (spanDays <= 0) return reviews.length; // all same day → very hot
  return Math.round((reviews.length / spanDays) * 10) / 10;
}

export async function fetchCurrentPlayers(appId: number): Promise<number | null> {
  const url = `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`;
  const j = await fetchJsonCached<any>(url, CCU_TTL);
  if (j?.response?.result === 1) return j.response.player_count ?? null;
  return null;
}

interface AppDetails {
  name: string;
  releaseIso: string | null;
  comingSoon: boolean;
  earlyAccess: boolean;
  price: number | null;
  currency: string;
  genres: string[];
  categories: string[];
  shortDescription: string;
}

export async function fetchAppDetails(appId: number): Promise<AppDetails | null> {
  const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&l=english&filters=basic,genres,categories,release_date,price_overview`;
  const j = await fetchJsonCached<any>(url, META_TTL);
  const entry = j?.[String(appId)];
  if (!entry?.success || !entry.data) return null;
  const d = entry.data;
  const rd = parseReleaseDate(d.release_date?.date);
  const genres = (d.genres ?? []).map((g: any) => g.description as string);
  const categories = (d.categories ?? []).map((c: any) => c.description as string);
  return {
    name: d.name,
    releaseIso: rd.iso,
    comingSoon: d.release_date?.coming_soon ?? rd.comingSoon,
    earlyAccess: genres.includes("Early Access") || categories.includes("Early Access"),
    price: d.is_free ? 0 : d.price_overview ? d.price_overview.final / 100 : null,
    currency: d.price_overview?.currency ?? "EUR",
    genres,
    categories,
    shortDescription: (d.short_description ?? "").slice(0, 300),
  };
}

interface SteamSpyInfo {
  developer: string;
  publisher: string;
  tags: string[]; // ordered by vote count desc (tag ranking, §13)
}

export async function fetchSteamSpy(appId: number): Promise<SteamSpyInfo | null> {
  const url = `https://steamspy.com/api.php?request=appdetails&appid=${appId}`;
  const j = await fetchJsonCached<any>(url, META_TTL);
  if (!j || j.name == null) return null;
  const tagsRaw = j.tags;
  let tags: string[] = [];
  if (tagsRaw && typeof tagsRaw === "object" && !Array.isArray(tagsRaw)) {
    tags = Object.entries(tagsRaw as Record<string, number>)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => normalizeTag(name));
  } else if (Array.isArray(tagsRaw)) {
    tags = tagsRaw.map((t: string) => normalizeTag(t));
  }
  return {
    developer: j.developer ?? "",
    publisher: j.publisher ?? "",
    tags,
  };
}

// Combine every provider into a single Game record (spec §10). Returns null if the app
// can't be resolved so ingestion can skip it gracefully.
export async function fetchGame(appId: number): Promise<Game | null> {
  const [reviews, details, spy] = await Promise.all([
    fetchReviewSummary(appId),
    fetchAppDetails(appId),
    fetchSteamSpy(appId),
  ]);
  if (!details && !spy) return null;

  const [ccu, velocity] = await Promise.all([
    fetchCurrentPlayers(appId),
    fetchRecentVelocity(appId),
  ]);

  const name = details?.name ?? spy?.developer ?? `App ${appId}`;
  const tags = spy?.tags?.length ? spy.tags : (details?.genres ?? []);
  const provenance: DataProvenance = {
    provider: "steam+steamspy",
    fetchedAt: new Date().toISOString(),
    confidence: reviews && details ? 90 : 60,
  };

  return {
    appId,
    name,
    developer: spy?.developer ? [spy.developer] : [],
    publisher: spy?.publisher ? [spy.publisher] : [],
    releaseDate: details?.releaseIso ?? null,
    comingSoon: details?.comingSoon ?? false,
    earlyAccess: details?.earlyAccess ?? false,
    price: details?.price ?? null,
    currency: details?.currency ?? "EUR",
    genres: details?.genres ?? [],
    categories: details?.categories ?? [],
    tags,
    shortDescription: details?.shortDescription ?? "",
    reviewPositive: reviews?.positive ?? null,
    reviewNegative: reviews?.negative ?? null,
    reviewTotal: reviews?.total ?? null,
    reviewScorePercent: reviews?.scorePercent ?? null,
    currentPlayers: ccu,
    reviewVelocity30d: velocity,
    provenance,
  };
}
