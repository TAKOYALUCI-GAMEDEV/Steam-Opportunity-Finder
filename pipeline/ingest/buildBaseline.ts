// Build a REPRESENTATIVE review-performance baseline (feature spec §5–§6). Hidden Demand
// outperformance is only meaningful against a cohort that includes the small-game long
// tail — not our top-by-owners market sample. This samples games across many genres AND
// across the whole owner range (stratified, so tiny games are included), fetches their
// release year + price, and writes a cohort baseline the Hidden Demand engine uses as the
// expected-performance reference.
// Run: `npm run baseline`  (slow, cached; refresh occasionally)

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { fetchAppDetails } from "../providers/steam";
import { fetchGenreList } from "../providers/steamspyLists";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../../data/generated/cohort-baseline.json");

const GENRES = ["Indie", "Simulation", "Strategy", "RPG", "Casual", "Adventure", "Action", "Early Access"];
const PER_GENRE = 170; // stratified across each genre's full ranked list
const MAX_SAMPLE = 1400;

export interface BaselineGame {
  reviewTotal: number;
  releaseDate: string | null;
  price: number | null;
}

async function main() {
  console.log("▸ sampling games across genres (stratified, includes the long tail)…");
  const reviewsById = new Map<number, number>();
  for (const genre of GENRES) {
    const list = await fetchGenreList(genre);
    if (list.length === 0) continue;
    // Even stride across the owner-ranked list → top hits AND deep tail.
    const stride = Math.max(1, Math.floor(list.length / PER_GENRE));
    let picked = 0;
    for (let i = 0; i < list.length && picked < PER_GENRE; i += stride) {
      reviewsById.set(list[i].appid, list[i].reviews);
      picked += 1;
    }
    console.log(`  · ${genre.padEnd(14)} list ${list.length} → sampled ${picked} (pool ${reviewsById.size})`);
  }

  const appIds = [...reviewsById.keys()].slice(0, MAX_SAMPLE);
  console.log(`▸ fetching release year + price for ${appIds.length} games…`);

  const games: BaselineGame[] = [];
  let done = 0;
  for (const appId of appIds) {
    const d = await fetchAppDetails(appId);
    done += 1;
    if (!d || d.comingSoon || !d.releaseIso) continue;
    games.push({ reviewTotal: reviewsById.get(appId)!, releaseDate: d.releaseIso, price: d.price });
    if (done % 100 === 0) console.log(`  … ${done}/${appIds.length} (${games.length} usable)`);
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), sampleSize: games.length, games }, null, 2));

  const reviews = games.map((g) => g.reviewTotal).sort((a, b) => a - b);
  const median = reviews[Math.floor(reviews.length / 2)];
  console.log(`✓ baseline written → data/generated/cohort-baseline.json`);
  console.log(`  ${games.length} games · overall median reviews = ${median}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
