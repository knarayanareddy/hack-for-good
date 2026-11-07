/**
 * The Shift v2 — pure scheduling function (ported from packages/core/src/shift.js).
 * No DOM, no network. Same anti-nagging intervals as the original; the difference is
 * that each exposure now changes SHAPE, and each shape answers a different question
 * a person may be asking:
 *
 *   1 gate     "What is this?"                     the plain fact, results held
 *   2 fork     "Where do I stand?"                 the person chooses their own path
 *   3 wave     "What do I do with this urge?"      a skill, not a scare
 *   4 hallway  "What happens if I reach out?"      rehearse the call before making it
 *   5+ door    "Is it still open?"                 presence instead of pressure
 */

export type Shape = "gate" | "fork" | "wave" | "hallway" | "door" | "quiet" | "banner";
export type Family = "legal" | "harm" | "control" | "selfhelp";
export type Bucket = "1" | "2" | "3" | "4" | "5+";

export const SEQUENCE: Exclude<Shape, "quiet" | "banner">[] = ["gate", "fork", "wave", "hallway", "door"];

export interface ShapeMeta {
  label: string;
  question: string;
  /** Wire value for field `f` of the Counter payload. */
  format: "gate" | "card" | "chat" | "quiet" | "fork" | "wave" | "hallway";
  family: Family;
  variant: string;
  holdsResults: boolean;
}

export const SHAPES: Record<Shape, ShapeMeta> = {
  gate: { label: "Gate", question: "What is this?", format: "gate", family: "legal", variant: "legal-01", holdsResults: true },
  fork: { label: "Fork", question: "Where do I stand?", format: "fork", family: "harm", variant: "harm-01", holdsResults: true },
  wave: { label: "Wave", question: "What do I do with this urge?", format: "wave", family: "selfhelp", variant: "selfhelp-01", holdsResults: true },
  hallway: { label: "Hallway", question: "What happens if I reach out?", format: "hallway", family: "selfhelp", variant: "selfhelp-02", holdsResults: true },
  door: { label: "Open door", question: "Is it still open?", format: "chat", family: "control", variant: "control-01", holdsResults: false },
  quiet: { label: "Quiet line", question: "(inside the re-warning window)", format: "quiet", family: "harm", variant: "harm-02", holdsResults: false },
  banner: { label: "Banner (control arm)", question: "(what everyone else ships)", format: "card", family: "harm", variant: "harm-00", holdsResults: false },
};

export interface ShiftState {
  n: number;
  last: number;
  seen: string[];
}

export interface Pick {
  shape: Shape;
  bucket: Bucket;
  state: "FIRST" | "RETURNING" | "PERSISTENT" | "HABITUATED" | "DEGRADED" | "PREVIEW" | "CONTROL";
  reason?: string;
}

/** Widening re-warning windows (hours) — identical to the original repo values. */
export const INTERVAL_HOURS = [0, 10 / 60, 6, 72] as const;

export function intervalFor(n: number, realistic: boolean): number {
  if (!realistic) return 0;
  const i = Math.min(Math.max(0, Math.floor(n)), INTERVAL_HOURS.length - 1);
  return INTERVAL_HOURS[i];
}

export function bucketOf(n: number): Bucket {
  if (!Number.isFinite(n)) return "1";
  if (n >= 5) return "5+";
  return String(Math.max(1, Math.floor(n))) as Bucket;
}

export function shapeForExposure(next: number): Exclude<Shape, "quiet" | "banner"> {
  return SEQUENCE[Math.min(Math.max(1, next), SEQUENCE.length) - 1];
}

export function pick(
  state: Partial<ShiftState>,
  opts: { now?: number; realistic?: boolean; storageBlocked?: boolean } = {},
): Pick {
  const now = opts.now ?? Date.now();
  if (opts.storageBlocked) {
    // Without local memory we cannot escalate or go quiet. Show the hallway (help-forward),
    // never a criminal-law claim on repeat.
    return { shape: "hallway", bucket: "1", state: "DEGRADED", reason: "storage unavailable — help-forward shape instead of the legal gate" };
  }
  const n = Number.isFinite(state.n) ? (state.n as number) : 0;
  const last = Number.isFinite(state.last) ? (state.last as number) : 0;
  const hours = last ? (now - last) / 3.6e6 : Infinity;
  const window = intervalFor(n, !!opts.realistic);
  if (n > 0 && hours < window) {
    return {
      shape: "quiet",
      bucket: bucketOf(n),
      state: "HABITUATED",
      reason: `inside the ${window < 1 ? Math.round(window * 60) + " min" : window + " h"} re-warning window at exposure ${n}`,
    };
  }
  const next = n + 1;
  return {
    shape: shapeForExposure(next),
    bucket: bucketOf(next),
    state: next === 1 ? "FIRST" : next < 5 ? "RETURNING" : "PERSISTENT",
  };
}

export function advance(state: Partial<ShiftState>, variant: string, now = Date.now()): ShiftState {
  const seen = Array.isArray(state.seen) ? state.seen.slice(-4) : [];
  const filtered = seen.filter((v) => v !== variant);
  filtered.push(variant);
  return { n: (state.n || 0) + 1, last: now, seen: filtered };
}
