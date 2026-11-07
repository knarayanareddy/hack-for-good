/**
 * The release gate for one closed panel round. Port of the relevant path of benchmark core/aggregate.js
 * `releaseAggregate` (policy on_close, closed, panel visibility, default method = median, equal weights).
 *
 *  - Fails closed below RELEASE_FLOOR respondents: no numbers at all.
 *  - Emits ONLY { estimate, lo, hi }. Quartiles, extremes and spread are never emitted, so order statistics cannot be
 *    solved back into individual answers (benchmark docs/05).
 *  - The interval is a deterministic, variance-preserving smoothed bootstrap (Efron & Tibshirani 1993, section 16.5), so
 *    [lo, hi] does not collapse onto one panellist's raw input on small panels.
 *
 * Values are FRACTIONS in [0, 1]. Pure: no storage, no clock.
 */

export const RELEASE_FLOOR = 5;

export type Snapshot = { estimate: number; lo: number; hi: number };

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function quantileSorted(sorted: number[], q: number): number {
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

const median = (v: number[]) => quantileSorted([...v].sort((a, b) => a - b), 0.5);

/** @returns the snapshot, or null when the round is below the floor (withheld). */
export function releaseSnapshot(values: number[], { floor = RELEASE_FLOOR, reps = 2000, seed = 42, alpha = 0.05 } = {}): Snapshot | null {
  const clean = values.filter((v) => typeof v === "number" && Number.isFinite(v)).map((v) => Math.min(1, Math.max(0, v)));
  const n = clean.length;
  if (n < Math.max(RELEASE_FLOOR, floor)) return null;

  const estimate = median(clean);
  const mean = clean.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(clean.reduce((a, v) => a + (v - mean) ** 2, 0) / n);
  let lo = estimate;
  let hi = estimate;
  if (sd > 0) {
    const shrink = Math.sqrt(Math.max(0, 1 - 1 / n));
    const bandwidth = sd / Math.sqrt(n);
    const rnd = mulberry32(seed);
    const boot = new Array<number>(reps);
    const sample = new Array<number>(n);
    for (let r = 0; r < reps; r++) {
      for (let i = 0; i < n; i++) {
        const idx = (rnd() * n) | 0;
        const u1 = Math.max(1e-12, rnd());
        const u2 = rnd();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        sample[i] = Math.min(1, Math.max(0, mean + shrink * (clean[idx] - mean) + bandwidth * z));
      }
      boot[r] = median(sample);
    }
    boot.sort((a, b) => a - b);
    lo = Math.min(estimate, quantileSorted(boot, alpha / 2));
    hi = Math.max(estimate, quantileSorted(boot, 1 - alpha / 2));
  }
  return { estimate, lo, hi };
}
