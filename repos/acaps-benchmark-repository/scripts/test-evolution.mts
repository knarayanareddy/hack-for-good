/**
 * Property checks for the ported evolution modules. Run: npm run test:evolution
 * (Node >= 22 strips the types; the modules under test import nothing but each other.)
 */
import assert from "node:assert/strict";
import test from "node:test";
import { buildTimeline, hasHistory } from "../src/lib/evolution/timeline.ts";
import { buildSeries, SERIES_FLOOR } from "../src/lib/evolution/series.ts";
import { releaseSnapshot, RELEASE_FLOOR } from "../src/lib/evolution/release.ts";
import { buildGrid } from "../src/lib/evolution/grid.ts";
import { downstream, upstream, validateLink, wouldDuplicate } from "../src/lib/evolution/links.ts";
import timelineData from "../src/data/timeline.json" with { type: "json" };

const risk = (timeline: unknown) => ({ timeline });

test("timeline: same-day conflicting entries are flagged, order kept", () => {
  const t = buildTimeline(
    risk({ triggers: [{ id: "T1", title: "x", completionHistory: [{ date: "2025-01-06", value: 40 }, { date: "2025-01-06", value: 60 }, { date: "2025-03-03", value: 30 }], trendHistory: [] }] })
  );
  assert.deepEqual(t.triggers[0].completion.map((p) => [p.value, p.conflict]), [[40, true], [60, true], [30, false]]);
  assert.equal(t.triggers[0].movement.completion, "down"); // last entry of the first day (60) -> 30
  assert.deepEqual(t.span, { from: "2025-01-06", to: "2025-03-03" });
});

test("timeline: invalid dates and values are dropped; no history gives an empty timeline", () => {
  const t = buildTimeline(risk({ triggers: [{ id: "T1", completionHistory: [{ date: "2025-02-30", value: 10 }, { date: "2025-02-01", value: 10.5 }], trendHistory: [{ date: "2025-02-01", value: "" }] }] }));
  assert.equal(t.triggers.length, 0);
  assert.equal(hasHistory(risk({})), false);
  assert.equal(hasHistory(null), false);
});

test("timeline: trend movement reads Deteriorated < Stable < Improved; undated update is kept", () => {
  const t = buildTimeline(risk({ riskTrend: "Stable", rationaleUpdates: [{ date: null, text: "old" }, { date: "2026-01-01", text: "new" }], triggers: [{ id: "T1", trendHistory: [{ date: "2025-01-01", value: "Deteriorated" }, { date: "2025-06-01", value: "Improved" }], completionHistory: [] }] }));
  assert.equal(t.triggers[0].movement.trend, "up");
  assert.equal(t.rationaleUpdates.length, 2);
  assert.equal(t.points, 3);
});

test("timeline: every real risk in the shipped data builds, and no trigger carries a probability", () => {
  let withPoints = 0;
  for (const [id, tl] of Object.entries(timelineData)) {
    const t = buildTimeline({ timeline: tl });
    if (t.points > 0) withPoints++;
    for (const trig of t.triggers) assert.ok(!("probability" in trig), id);
  }
  assert.ok(withPoints >= 70, `expected most of the 86 risks to have dated points, got ${withPoints}`);
});

test("release gate: below the floor nothing is released; at the floor only estimate, lo, hi", () => {
  assert.equal(releaseSnapshot([0.2, 0.3, 0.4, 0.5]), null);
  const s = releaseSnapshot([0.2, 0.3, 0.4, 0.5, 0.9])!;
  assert.deepEqual(Object.keys(s).sort(), ["estimate", "hi", "lo"]);
  assert.equal(s.estimate, 0.4);
  assert.ok(s.lo <= s.estimate && s.estimate <= s.hi && s.lo >= 0 && s.hi <= 1);
  assert.deepEqual(releaseSnapshot([0.2, 0.3, 0.4, 0.5, 0.9]), s, "deterministic");
  assert.equal(releaseSnapshot([0.2, 0.3, 0.4, 0.5, 0.9], { floor: 2 }) !== null, true, "floor can never be lowered below 5");
  assert.equal(releaseSnapshot([0.2, 0.3, 0.4, 0.5], { floor: 2 }), null);
});

test("series: floor, withheld, day-coarse, fractions", () => {
  const snap = { estimate: 0.4, lo: 0.2, hi: 0.6 };
  const r = buildSeries([
    { round: 2, n: 4, at: "2026-03-02T23:59:00Z", snapshot: snap },
    { round: 1, n: 6, at: "2026-01-02T10:11:12Z", snapshot: snap },
  ]);
  assert.deepEqual(r.points, [{ round: 1, day: "2026-01-02", n: 6, ...snap }]);
  assert.deepEqual(r.withheld, [{ round: 2 }]);
  assert.deepEqual(buildSeries([{ round: 1, n: 9, at: "2026-01-02", snapshot: null }]).withheld, [{ round: 1 }]);
  assert.deepEqual(buildSeries([{ round: 1, n: 3, at: "2026-01-02", snapshot: snap }], { floor: 1 }).points, [], "floor cannot be lowered");
});

test("grid: counts by derived region/theme, small cells marked not hidden, retired excluded", () => {
  const risks = [{ id: "R1", region: "A", theme: "x" }, { id: "R2", region: "A", theme: "x" }, { id: "R3", region: null, theme: "x" }];
  const g = buildGrid(risks, [{ riskId: "R1", status: "open" }, { riskId: "R2", status: "closed" }, { riskId: "R1", status: "retired" }, { riskId: "nope" }], ["A", "B"], ["x", "y"]);
  const c = g.cells.find((k) => k.region === "A" && k.theme === "x")!;
  assert.deepEqual([c.risks, c.cards, c.live, c.open, c.small], [2, 2, 2, 1, true]);
  assert.equal(g.cells.length, 4);
  assert.deepEqual(g.unplaced, { risks: 1, cards: 1 });
  assert.equal(g.minCell, 10);
});

test("links: rival explanation required, 20..500 chars, distinct cards", () => {
  const ok = "x".repeat(20);
  assert.equal(validateLink({ fromCardId: "1", toCardId: "2", mechanism: ok, rival: ok }).ok, true);
  assert.equal(validateLink({ fromCardId: "1", toCardId: "2", mechanism: ok, rival: "" }).ok, false);
  assert.equal(validateLink({ fromCardId: "1", toCardId: "2", mechanism: ok, rival: "x".repeat(501) }).ok, false);
  assert.equal(validateLink({ fromCardId: "1", toCardId: "1", mechanism: ok, rival: ok }).ok, false);
  assert.equal(validateLink({ fromCardId: 1, toCardId: 2, mechanism: ` ${ok} `, rival: ok }).link?.fromCardId, "1");
});

test("links: downstream is BFS, shallowest depth, cycle-safe, depth-limited", () => {
  const L = [
    { id: "a", fromCardId: "1", toCardId: "2" },
    { id: "b", fromCardId: "2", toCardId: "3" },
    { id: "c", fromCardId: "3", toCardId: "1" },
    { id: "d", fromCardId: "3", toCardId: "4" },
    { id: "e", fromCardId: "4", toCardId: "5" },
  ];
  assert.deepEqual(downstream(L, "1"), [{ cardId: "2", depth: 1, via: "a" }, { cardId: "3", depth: 2, via: "b" }, { cardId: "4", depth: 3, via: "d" }]);
  assert.deepEqual(downstream(L, "1", { maxDepth: 1 }).length, 1);
  assert.equal(upstream(L, "2")[0].cardId, "1");
  assert.equal(wouldDuplicate(L, "1", "2"), true);
  assert.equal(wouldDuplicate(L, "2", "1"), false);
  assert.throws(() => downstream(L, "1", { maxDepth: -1 }), RangeError);
});

test("the release floor is 5 in both places", () => {
  assert.equal(SERIES_FLOOR, 5);
  assert.equal(RELEASE_FLOOR, SERIES_FLOOR);
});
