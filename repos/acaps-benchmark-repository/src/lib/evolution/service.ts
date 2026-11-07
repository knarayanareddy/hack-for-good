/**
 * Situation evolution, server side (benchmark docs/12-situation-evolution.md, sections 1 to 4), ported from the benchmark
 * repo's document-store service onto this prototype's Postgres/Drizzle schema.
 *
 * Permissions (the prototype has one staff role, the ACAPS moderator):
 *   evolution.read  - moderator   (panel series, regional grid, list links)
 *   evolution.link  - moderator   (create / remove links, close a round)
 * Nothing here is ever sent to a non-staff viewer except the risk timeline, which is ACAPS analysis and follows the
 * radar rule (see timelineAccess).
 */
import { and, count, eq, inArray } from "drizzle-orm";
import { db, pool } from "@/db";
import * as s from "@/db/schema";
import timelineData from "@/data/timeline.json";
import { ensureSeeded } from "@/lib/seed";
import { getWorld, type Expert, type World } from "@/lib/world";
import { matchScore } from "@/lib/dispatch";
import { THEMES } from "@/lib/constants";
import { buildTimeline, type Timeline } from "./timeline";
import { buildSeries, dayOf } from "./series";
import { releaseSnapshot, RELEASE_FLOOR } from "./release";
import { buildGrid } from "./grid";
import { validateLink, wouldDuplicate } from "./links";

export class EvolutionError extends Error {
  constructor(message: string, public status = 400, public details?: unknown) {
    super(message);
  }
}

/** Same order as the benchmark taxonomy. */
export const REGIONS = [
  "East & Southern Africa",
  "Middle East & North Africa",
  "Sahel & West/Central Africa",
  "Americas & Europe",
  "South-East Asia & Pacific",
  "South & Central Asia",
];

const DAY = 24 * 3600 * 1000;
const SERIES_NOTE = "At most two rounds exist per card: round 1 is the first instinct, round 2 follows the second look. A later window is a new card, not a third round.";

/* ---------------------------------------------------------------------------------------------------------------- */
/* Bootstrap: source data and the demo ledger. Idempotent and safe under concurrent workers.                         */
/* ---------------------------------------------------------------------------------------------------------------- */

let booting: Promise<void> | null = null;
export function ensureEvolution(): Promise<void> {
  if (!booting) {
    booting = bootstrap().catch((e) => {
      booting = null;
      throw e;
    });
  }
  return booting;
}

async function bootstrap() {
  await ensureSeeded();
  const client = await pool.connect();
  try {
    await client.query("select pg_advisory_lock(424243)");
    const [{ c: tl }] = await db.select({ c: count() }).from(s.riskTimelines);
    if (Number(tl) === 0) {
      const rows = Object.entries(timelineData as Record<string, Omit<typeof s.riskTimelines.$inferInsert, "riskId">>).map(([riskId, v]) => ({
        riskId,
        riskTrend: v.riskTrend ?? null,
        rationaleUpdates: v.rationaleUpdates,
        triggers: v.triggers,
      }));
      for (let i = 0; i < rows.length; i += 50) await db.insert(s.riskTimelines).values(rows.slice(i, i + 50)).onConflictDoNothing();
    }
    const [{ c: rr }] = await db.select({ c: count() }).from(s.roundReleases);
    if (Number(rr) === 0) await seedDemoReleases();
  } finally {
    await client.query("select pg_advisory_unlock(424243)").catch(() => {});
    client.release();
  }
}

/**
 * Demo ledger: the synthetic Season 1 history was a closed panel, so its rounds are released through the same gate a
 * moderator uses. Round 2 is only present where someone took the second look. Marked synthetic.
 */
async function seedDemoReleases() {
  const qs = await db.select().from(s.questions).where(eq(s.questions.season, "S1"));
  if (!qs.length) return;
  const fs = await db.select().from(s.forecasts).where(inArray(s.forecasts.questionId, qs.map((q) => q.id)));
  const byQ = new Map<number, typeof fs>();
  for (const f of fs) byQ.set(f.questionId, [...(byQ.get(f.questionId) ?? []), f]);
  const rows: (typeof s.roundReleases.$inferInsert)[] = [];
  for (const q of qs) {
    const all = byQ.get(q.id) ?? [];
    if (!all.length) continue;
    rows.push({ questionId: q.id, round: 1, n: all.length, at: new Date(q.closesAt.getTime() - 7 * DAY), snapshot: releaseSnapshot(all.map((f) => f.probability / 100)), synthetic: true });
    const second = all.filter((f) => f.revised !== null);
    if (second.length)
      rows.push({ questionId: q.id, round: 2, n: second.length, at: new Date(q.closesAt.getTime() - 3 * DAY), snapshot: releaseSnapshot(second.map((f) => (f.revised as number) / 100)), synthetic: true });
  }
  for (let i = 0; i < rows.length; i += 100) await db.insert(s.roundReleases).values(rows.slice(i, i + 100)).onConflictDoNothing();
}

/* ---------------------------------------------------------------------------------------------------------------- */
/* Permissions and audit                                                                                             */
/* ---------------------------------------------------------------------------------------------------------------- */

export type Permission = "evolution.read" | "evolution.link";
export function can(me: Expert | null | undefined, _permission: Permission): boolean {
  void _permission;
  return !!me?.isModerator;
}
export function need(me: Expert | null | undefined, permission: Permission) {
  if (!me) throw new EvolutionError("Choose a persona or join first", 401);
  if (!can(me, permission)) throw new EvolutionError(`Not allowed: ${permission}`, 403);
}
async function audit(actor: Expert, action: string, target: string) {
  await db.insert(s.auditLog).values({ actorId: actor.id, action, target });
}

/* ---------------------------------------------------------------------------------------------------------------- */
/* Risk timeline (full risk view only)                                                                               */
/* ---------------------------------------------------------------------------------------------------------------- */

export type TimelineAccess =
  | { state: "anon" }
  | { state: "staff" | "open" }
  | { state: "held"; questionIds: number[] };

/**
 * The radar rule (benchmark docs/10 section 3), applied to this prototype's dispatch: an expert is held back only while an
 * OPEN risk question on this risk that is put to them (it clears their own relevance threshold) is unanswered by them. An
 * expert never asked about the risk sees it. Staff always. Someone with no persona sees nothing.
 */
export function timelineAccess(w: World, me: Expert | null, riskId: string): TimelineAccess {
  if (!me) return { state: "anon" };
  if (me.isModerator) return { state: "staff" };
  const risk = w.riskById.get(riskId);
  if (!risk) return { state: "open" };
  const answered = new Set(w.forecasts.filter((f) => f.expertId === me.id).map((f) => f.questionId));
  const held = w.questions.filter(
    (q) =>
      q.riskId === riskId &&
      q.season === "current" &&
      q.status === "open" &&
      !q.triggerId &&
      !answered.has(q.id) &&
      matchScore(w, me, risk, 5).score >= me.minMatch
  );
  return held.length ? { state: "held", questionIds: held.map((q) => q.id) } : { state: "open" };
}

/** The timeline of one risk. Call only after timelineAccess allowed it. */
export async function getRiskTimeline(riskId: string): Promise<Timeline> {
  await ensureEvolution();
  const [row] = await db.select().from(s.riskTimelines).where(eq(s.riskTimelines.riskId, riskId));
  return buildTimeline({ timeline: row ? { riskTrend: row.riskTrend, rationaleUpdates: row.rationaleUpdates, triggers: row.triggers } : {} });
}

/* ---------------------------------------------------------------------------------------------------------------- */
/* Cards (questions) as the staff see them                                                                           */
/* ---------------------------------------------------------------------------------------------------------------- */

const cardStatus = (q: { status: string }) => (q.status === "open" ? "open" : "closed");

export type CardOption = { id: string; label: string; statement: string; group: string; riskId: string; status: string; hasRounds: boolean };

export async function listCards(me: Expert | null): Promise<CardOption[]> {
  need(me, "evolution.read");
  await ensureEvolution();
  const w = await getWorld();
  const released = new Set((await db.select({ q: s.roundReleases.questionId }).from(s.roundReleases)).map((r) => r.q));
  const out: CardOption[] = [];
  for (const q of w.questions) {
    const risk = w.riskById.get(q.riskId);
    if (!risk) continue;
    const kind = q.kind === "signal" ? "signal check" : q.triggerId ? "trigger" : "risk";
    const group = q.season === "S1" ? "Closed history (synthetic season 1)" : q.kind === "signal" ? "Signal checks" : "Current 6-month window";
    out.push({
      id: String(q.id),
      label: `${risk.country} · ${kind} · ${q.text.replace(/^Within the next \d+ (months|days), will /, "").replace(/^Season 1 \(synthetic history\): will /, "").slice(0, 110)}`,
      statement: q.text,
      group,
      riskId: q.riskId,
      status: cardStatus(q),
      hasRounds: released.has(q.id),
    });
  }
  const rank = (g: string) => (g.startsWith("Current") ? 0 : g.startsWith("Signal") ? 1 : 2);
  return out.sort((a, b) => rank(a.group) - rank(b.group) || Number(b.hasRounds) - Number(a.hasRounds) || a.label.localeCompare(b.label));
}

/* ---------------------------------------------------------------------------------------------------------------- */
/* Panel series (staff)                                                                                              */
/* ---------------------------------------------------------------------------------------------------------------- */

export async function cardSeries(me: Expert | null, cardId: string) {
  need(me, "evolution.read");
  await ensureEvolution();
  const w = await getWorld();
  const q = w.questionById.get(Number(cardId));
  if (!q) throw new EvolutionError(`card ${cardId} not found`, 404);
  // Only closed, panel-visible ledger documents: an open round's snapshot would allow sequential differencing.
  const docs = await db
    .select()
    .from(s.roundReleases)
    .where(and(eq(s.roundReleases.questionId, q.id), eq(s.roundReleases.closed, true), eq(s.roundReleases.visibility, "panel")));
  const latest = new Map<number, (typeof docs)[number]>();
  for (const d of docs) {
    const cur = latest.get(d.round);
    if (!cur || d.n > cur.n) latest.set(d.round, d);
  }
  const series = buildSeries([...latest.values()]);
  const synthetic = [...latest.values()].some((d) => d.synthetic);
  const open1 = !latest.has(1) && q.status === "open";
  const note = [
    open1 ? "No round has been closed yet, so nothing is shown: an open round's numbers are never released, which would allow differencing between looks." : "",
    synthetic ? "These rounds come from the synthetic season-1 history." : "",
    `A round with fewer than ${RELEASE_FLOOR} respondents is withheld. ${SERIES_NOTE}`,
  ]
    .filter(Boolean)
    .join(" ");
  return {
    cardId: String(q.id),
    statement: q.text,
    status: cardStatus(q),
    riskId: q.riskId,
    country: w.riskById.get(q.riskId)?.country ?? "",
    closedRounds: [...latest.keys()].sort(),
    points: series.points,
    withheld: series.withheld,
    note,
  };
}

/**
 * A moderator closes a round: the panel's numbers for that round are released ONCE, through the release gate, into the
 * ledger. Later answers do not change a closed round, and a closed round is never re-released, so no one can difference
 * successive looks. Round 2 needs round 1 closed first.
 */
export async function closeRound(me: Expert | null, cardId: string, round: unknown) {
  need(me, "evolution.link");
  await ensureEvolution();
  const w = await getWorld();
  const q = w.questionById.get(Number(cardId));
  if (!q) throw new EvolutionError(`card ${cardId} not found`, 404);
  const r = Number(round);
  if (r !== 1 && r !== 2) throw new EvolutionError("round must be 1 or 2");
  const existing = await db.select().from(s.roundReleases).where(eq(s.roundReleases.questionId, q.id));
  if (existing.some((d) => d.round === r)) throw new EvolutionError(`round ${r} is already closed`, 409);
  if (r === 2 && !existing.some((d) => d.round === 1)) throw new EvolutionError("close round 1 before round 2", 409);
  // Fresh read, not the request cache: the round must include everyone who answered before it closed.
  const fs = await db.select().from(s.forecasts).where(eq(s.forecasts.questionId, q.id));
  const values = r === 1 ? fs.map((f) => f.probability / 100) : fs.filter((f) => f.revised !== null).map((f) => (f.revised as number) / 100);
  if (values.length === 0) throw new EvolutionError(r === 1 ? "no estimates to close yet" : "nobody has taken the second look yet");
  const snapshot = releaseSnapshot(values);
  try {
    await db.insert(s.roundReleases).values({ questionId: q.id, round: r, n: values.length, closed: true, visibility: "panel", at: new Date(), snapshot });
  } catch {
    throw new EvolutionError(`round ${r} is already closed`, 409);
  }
  await audit(me as Expert, "round.close", `${q.id}:r${r}`);
  return { cardId: String(q.id), round: r, withheld: snapshot === null };
}

/** Has this round been closed? Used to stop answers that would not be in the ledgered round. */
export async function isRoundClosed(questionId: number, round: 1 | 2): Promise<boolean> {
  const [row] = await db.select({ id: s.roundReleases.id }).from(s.roundReleases).where(and(eq(s.roundReleases.questionId, questionId), eq(s.roundReleases.round, round)));
  return !!row;
}

/* ---------------------------------------------------------------------------------------------------------------- */
/* Regional grid (staff)                                                                                             */
/* ---------------------------------------------------------------------------------------------------------------- */

export async function evolutionGrid(me: Expert | null) {
  need(me, "evolution.read");
  await ensureEvolution();
  const w = await getWorld();
  const cards = w.questions
    .filter((q) => q.season !== "S1") // the synthetic season-1 history is not a live card
    .map((q) => ({ riskId: q.riskId, status: cardStatus(q) }));
  const grid = buildGrid(
    w.risks.map((r) => ({ id: r.id, region: r.region, theme: r.theme })),
    cards,
    REGIONS,
    Object.keys(THEMES)
  );
  return { ...grid, themeLabels: THEMES };
}

/* ---------------------------------------------------------------------------------------------------------------- */
/* Analyst links (staff)                                                                                             */
/* ---------------------------------------------------------------------------------------------------------------- */

export type LinkRow = {
  id: string;
  fromCardId: string;
  toCardId: string;
  fromStatement: string | null;
  toStatement: string | null;
  mechanism: string;
  rival: string;
  by: number;
  day: string;
};

function linkRow(row: typeof s.questionLinks.$inferSelect, w: World): LinkRow {
  return {
    id: row.id,
    fromCardId: String(row.fromQuestionId),
    toCardId: String(row.toQuestionId),
    fromStatement: w.questionById.get(row.fromQuestionId)?.text ?? null,
    toStatement: w.questionById.get(row.toQuestionId)?.text ?? null,
    mechanism: row.mechanism,
    rival: row.rival,
    by: row.by,
    day: row.day,
  };
}

export async function listLinks(me: Expert | null): Promise<LinkRow[]> {
  need(me, "evolution.read");
  await ensureEvolution();
  const w = await getWorld();
  return (await db.select().from(s.questionLinks)).map((l) => linkRow(l, w)).sort((a, b) => a.id.localeCompare(b.id));
}

export async function createLink(me: Expert | null, input: unknown): Promise<LinkRow> {
  need(me, "evolution.link");
  await ensureEvolution();
  const v = validateLink(input);
  if (!v.ok || !v.link) throw new EvolutionError(`link cannot be saved: ${v.problems.join("; ")}`, 400, { problems: v.problems });
  const { fromCardId, toCardId, mechanism, rival } = v.link;
  const w = await getWorld();
  const from = w.questionById.get(Number(fromCardId));
  const to = w.questionById.get(Number(toCardId));
  if (!from) throw new EvolutionError(`card ${fromCardId} not found`, 404);
  if (!to) throw new EvolutionError(`card ${toCardId} not found`, 404);
  const existing = (await db.select().from(s.questionLinks)).map((l) => ({ fromCardId: String(l.fromQuestionId), toCardId: String(l.toQuestionId) }));
  if (wouldDuplicate(existing, fromCardId, toCardId)) throw new EvolutionError("this link already exists", 409);
  const id = `lk_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  let row: typeof s.questionLinks.$inferSelect;
  try {
    // The unique (from, to) index is the authority; the pre-check above is only a fast path.
    [row] = await db
      .insert(s.questionLinks)
      .values({ id, fromQuestionId: from.id, toQuestionId: to.id, mechanism, rival, by: (me as Expert).id, day: dayOf(new Date()), version: 0 })
      .returning();
  } catch {
    throw new EvolutionError("this link already exists", 409);
  }
  await audit(me as Expert, "link.create", id);
  return linkRow(row, w);
}

export async function removeLink(me: Expert | null, id: string) {
  need(me, "evolution.link");
  await ensureEvolution();
  const gone = await db.delete(s.questionLinks).where(eq(s.questionLinks.id, String(id))).returning({ id: s.questionLinks.id });
  if (!gone.length) throw new EvolutionError(`link ${id} not found`, 404);
  await audit(me as Expert, "link.remove", String(id));
  return { removed: true };
}
