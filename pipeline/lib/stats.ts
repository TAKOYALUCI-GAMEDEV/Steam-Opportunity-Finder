// Deterministic statistics helpers. Spec §19 requires percentile/log/winsorization
// rather than raw averages distorted by blockbusters.

export const clamp = (x: number, lo = 0, hi = 100): number =>
  Math.max(lo, Math.min(hi, x));

export const round1 = (x: number): number => Math.round(x * 10) / 10;

export const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

export const mean = (xs: number[]): number =>
  xs.length ? sum(xs) / xs.length : 0;

export function median(xs: number[]): number {
  return quantile(xs, 0.5);
}

/** Linear-interpolated quantile. q in [0,1]. Empty → 0. */
export function quantile(xs: number[], q: number): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  if (s.length === 1) return s[0];
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return s[lo];
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

export const log1p = (x: number): number => Math.log(1 + Math.max(0, x));

/** Winsorize to [pLow, pHigh] percentile bounds to tame extreme outliers. */
export function winsorize(xs: number[], pLow = 0.05, pHigh = 0.95): number[] {
  if (xs.length === 0) return xs;
  const lo = quantile(xs, pLow);
  const hi = quantile(xs, pHigh);
  return xs.map((x) => Math.max(lo, Math.min(hi, x)));
}

/**
 * Percentile-rank of `value` within `population` → 0..100.
 * Ties share the mid-rank. Used to normalize cluster raw metrics ACROSS clusters
 * before weighting (spec §19). With a tiny population this is coarse but deterministic.
 */
export function percentileRank(value: number, population: number[]): number {
  const n = population.length;
  if (n === 0) return 0;
  if (n === 1) return 50;
  let below = 0;
  let equal = 0;
  for (const p of population) {
    if (p < value) below += 1;
    else if (p === value) equal += 1;
  }
  return clamp(((below + 0.5 * equal) / n) * 100);
}

/** Min-max normalize a value within [min,max] → 0..100. */
export function minMax(value: number, min: number, max: number): number {
  if (max <= min) return 50;
  return clamp(((value - min) / (max - min)) * 100);
}
