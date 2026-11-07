/**
 * Panel series for one question: one point per released round, from the ledger (`round_releases`).
 * Port of benchmark core/series.js.
 *
 * Privacy: a release below the floor, or without a usable snapshot, is WITHHELD as `{ round }` only. The floor can be
 * raised but never lowered below RELEASE_FLOOR (5). Pure: no storage, no clock.
 */
/** Must equal RELEASE_FLOOR in release.ts (checked by scripts/test-evolution.mts); kept local so this module is import-free. */
export const SERIES_FLOOR = 5;
const RELEASE_FLOOR = SERIES_FLOOR;

export type LedgerDoc = {
  round: number;
  n: number;
  at: Date | string | number;
  snapshot: { estimate: number; lo: number; hi: number } | null;
};
export type SeriesPoint = { round: number; day: string; n: number; estimate: number; lo: number; hi: number };

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** The UTC calendar day of a timestamp: times are day-coarse on every series. */
export function dayOf(at: Date | string | number): string {
  const t = at instanceof Date ? at.getTime() : typeof at === "number" ? at : Date.parse(String(at));
  if (!Number.isFinite(t)) throw new TypeError("dayOf() needs a valid timestamp");
  return new Date(t).toISOString().slice(0, 10);
}

export function buildSeries(releases: LedgerDoc[], { floor = RELEASE_FLOOR } = {}): { points: SeriesPoint[]; withheld: { round: number }[] } {
  if (!Array.isArray(releases)) throw new TypeError("releases must be an array");
  const effectiveFloor = Math.max(RELEASE_FLOOR, floor);
  const docs = releases.filter((d) => d && finite(d.round)).sort((a, b) => a.round - b.round);

  const points: SeriesPoint[] = [];
  const withheld: { round: number }[] = [];
  for (const d of docs) {
    const s = d.snapshot;
    if (!finite(d.n) || d.n < effectiveFloor || !s || !finite(s.estimate) || !finite(s.lo) || !finite(s.hi)) {
      withheld.push({ round: d.round });
      continue;
    }
    let day: string;
    try {
      day = dayOf(d.at);
    } catch {
      withheld.push({ round: d.round });
      continue;
    }
    points.push({ round: d.round, day, n: d.n, estimate: s.estimate, lo: s.lo, hi: s.hi });
  }
  return { points, withheld };
}
