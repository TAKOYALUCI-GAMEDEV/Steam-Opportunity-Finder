// Polite cached HTTP for external providers (spec §67): identifiable user-agent,
// on-disk cache, retry with exponential backoff, and a global rate limiter. The rest of
// the app never touches this — only provider implementations do (§12).

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = resolve(__dirname, "../../.cache/http");

const USER_AGENT =
  "SteamOpportunityFinder/0.1 (+https://github.com/TAKOYALUCI-GAMEDEV/Steam-Opportunity-Finder; research)";

// Global rate limiter: at most one request every MIN_INTERVAL ms (SteamSpy asks ≤1/s).
const MIN_INTERVAL = 350;
let lastCall = 0;
async function throttle() {
  const wait = Math.max(0, lastCall + MIN_INTERVAL - Date.now());
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function cachePath(url: string): string {
  const h = createHash("sha1").update(url).digest("hex");
  return resolve(CACHE_DIR, `${h}.json`);
}

interface CacheEntry {
  url: string;
  fetchedAt: string;
  body: string;
}

/** Fetch a URL as text, with disk cache. TTL in ms; 0 disables cache reads. */
export async function fetchTextCached(
  url: string,
  ttlMs = 7 * 24 * 3600 * 1000,
): Promise<string | null> {
  const path = cachePath(url);
  if (ttlMs > 0 && existsSync(path)) {
    try {
      const entry = JSON.parse(readFileSync(path, "utf8")) as CacheEntry;
      if (Date.now() - Date.parse(entry.fetchedAt) < ttlMs) return entry.body;
    } catch {
      /* ignore corrupt cache */
    }
  }

  let attempt = 0;
  const maxAttempts = 4;
  while (attempt < maxAttempts) {
    attempt += 1;
    await throttle();
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      });
      if (res.status === 429 || res.status >= 500) {
        const backoff = 800 * 2 ** (attempt - 1);
        console.warn(`  … ${res.status} on ${short(url)} — retry in ${backoff}ms`);
        await sleep(backoff);
        continue;
      }
      if (!res.ok) return null;
      const body = await res.text();
      mkdirSync(dirname(path), { recursive: true });
      const entry: CacheEntry = { url, fetchedAt: new Date().toISOString(), body };
      writeFileSync(path, JSON.stringify(entry));
      return body;
    } catch (e) {
      const backoff = 800 * 2 ** (attempt - 1);
      console.warn(`  … network error on ${short(url)} — retry in ${backoff}ms`);
      await sleep(backoff);
    }
  }
  console.warn(`  ✗ giving up on ${short(url)}`);
  return null;
}

export async function fetchJsonCached<T>(url: string, ttlMs?: number): Promise<T | null> {
  const text = await fetchTextCached(url, ttlMs);
  if (text == null) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function short(url: string): string {
  return url.length > 70 ? url.slice(0, 67) + "…" : url;
}
