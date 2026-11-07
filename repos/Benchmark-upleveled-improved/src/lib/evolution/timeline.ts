/**
 * The dated history of one risk, as ACAPS recorded it (scripts/build-timeline.py). Pure: no storage, no clock.
 * Port of benchmark packages/core/src/timeline.js.
 *
 * Dates and values are "as recorded". Nothing here computes a duration or a lag from them. Completion rate is an
 * analyst-recorded reading whose meaning is not standardised, so `movement` only says which way the recorded series
 * went; it is not a rate of change or a probability. Trend reads Deteriorated < Stable < Improved, so 'up' means the
 * recorded trend moved towards Improved.
 */

export type Point = { date: string; value: number | string; conflict: boolean };
export type Movement = "up" | "down" | "flat" | "none";
export type TimelineTrigger = {
  id: string;
  title: string | null;
  completion: (Point & { value: number })[];
  trend: (Point & { value: string })[];
  dateEntered: string | null;
  lastUpdate: string | null;
  movement: { completion: Movement; trend: Movement };
};
export type Timeline = {
  riskTrend: string | null;
  rationaleUpdates: { date: string | null; text: string }[];
  triggers: TimelineTrigger[];
  span: { from: string; to: string } | null;
  points: number;
};

const TREND_RANK: Record<string, number> = { Deteriorated: 0, Stable: 1, Improved: 2 };
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object";

/** A real calendar date in ISO form, or null. */
function isoOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = ISO_DATE.exec(v);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d ? v : null;
}

/** Valid entries in file order, each marked when another entry on the same day carries a different value. */
function pointsOf(entries: unknown, acceptValue: (value: unknown) => boolean): Point[] {
  if (!Array.isArray(entries)) return [];
  const valid: { date: string; value: number | string }[] = [];
  for (const e of entries) {
    if (!isObject(e)) continue;
    const date = isoOrNull(e.date);
    if (date && acceptValue(e.value)) valid.push({ date, value: e.value as number | string });
  }
  return valid.map((p) => ({ ...p, conflict: valid.some((q) => q.date === p.date && q.value !== p.value) }));
}

/**
 * The movement between the first and last distinct dates. Each date is represented by its last entry in file order, so a
 * same-day correction counts as that day's reading. Values that cannot be ranked are ignored.
 */
function movementOf(points: Point[], rank: (v: number | string) => number | null): Movement {
  const byDate = new Map<string, number>();
  for (const p of points) {
    const r = rank(p.value);
    if (r !== null) byDate.set(p.date, r);
  }
  const dates = [...byDate.keys()].sort();
  if (dates.length < 2) return "none";
  const first = byDate.get(dates[0]) as number;
  const last = byDate.get(dates[dates.length - 1]) as number;
  return last > first ? "up" : last < first ? "down" : "flat";
}

const completionRank = (v: number | string) => (typeof v === "number" ? v : null);
const trendRank = (v: number | string) => (typeof v === "string" && Object.hasOwn(TREND_RANK, v) ? TREND_RANK[v] : null);

/** The timeline of a risk carrying `timeline` source data. A risk with none gives an empty timeline. */
export function buildTimeline(risk: unknown): Timeline {
  const src: Record<string, unknown> = isObject(risk) && isObject(risk.timeline) ? risk.timeline : {};
  const rationaleUpdates = Array.isArray(src.rationaleUpdates)
    ? src.rationaleUpdates.filter(isObject).map((u) => ({
        date: isoOrNull(u.date),
        text: typeof u.text === "string" ? u.text : "",
      }))
    : [];

  const triggers: TimelineTrigger[] = [];
  for (const t of Array.isArray(src.triggers) ? src.triggers : []) {
    if (!isObject(t) || typeof t.id !== "string") continue;
    const completion = pointsOf(t.completionHistory, (v) => Number.isInteger(v)) as TimelineTrigger["completion"];
    const trend = pointsOf(t.trendHistory, (v) => typeof v === "string" && v !== "") as TimelineTrigger["trend"];
    if (completion.length === 0 && trend.length === 0) continue;
    triggers.push({
      id: t.id,
      title: typeof t.title === "string" ? t.title : null,
      completion,
      trend,
      dateEntered: isoOrNull(t.dateEnteredISO),
      lastUpdate: isoOrNull(t.lastUpdateISO),
      movement: { completion: movementOf(completion, completionRank), trend: movementOf(trend, trendRank) },
    });
  }

  const dates = [
    ...triggers.flatMap((t) => [...t.completion, ...t.trend].map((p) => p.date)),
    ...rationaleUpdates.flatMap((u) => (u.date ? [u.date] : [])),
  ].sort();

  return {
    riskTrend: typeof src.riskTrend === "string" && src.riskTrend !== "" ? src.riskTrend : null,
    rationaleUpdates,
    triggers,
    span: dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null,
    points: dates.length,
  };
}

export function hasHistory(risk: unknown): boolean {
  return buildTimeline(risk).points > 0;
}
