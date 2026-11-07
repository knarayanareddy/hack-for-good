import { db } from "@/db";
import * as s from "@/db/schema";
import { loadWorld } from "./world";
import { planDispatch } from "./dispatch";

const DAY = 24 * 3600 * 1000;
const MIN = 60 * 1000;

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

type Sig = { country: string; text: string; criteria: string; outcome?: "yes" | "no"; ageDays?: number; daysLeft?: number };

const SIGNALS: Sig[] = [
  { country: "Chad", text: "Within 14 days, will ACLED record at least one armed clash within 30 km of the Adré border crossing?", criteria: "YES if ACLED lists ≥1 battle/violence event inside the radius in the window.", outcome: "yes", ageDays: 38 },
  { country: "Chad", text: "Within 14 days, will the Adré crossing be closed to humanitarian traffic for 48+ consecutive hours?", criteria: "YES if OCHA/UNHCR access reporting confirms a closure of 48h or more.", outcome: "no", ageDays: 31 },
  { country: "Mali", text: "Within 14 days, will a main supply road to a regional capital be blockaded or attacked, per credible public reporting?", criteria: "YES if two independent public sources report a blockade or attack on the road in the window.", outcome: "yes", ageDays: 27 },
  { country: "Sudan", text: "Within 21 days, will OCHA publish a flash update citing new displacement of 50,000+ people?", criteria: "YES if an OCHA flash update in the window states 50,000+ newly displaced.", outcome: "no", ageDays: 24 },
  { country: "Syria", text: "Within 14 days, will WFP or OCHA report a bread or fuel price rise above 10% in a major city?", criteria: "YES if a market-monitoring bulletin in the window shows a >10% rise.", outcome: "no", ageDays: 20 },
  { country: "Afghanistan", text: "Within 14 days, will IOM report more than 20,000 returns from Pakistan in a single week?", criteria: "YES if an IOM flow report in the window shows a weekly figure above 20,000.", outcome: "yes", ageDays: 16 },
  { country: "Nigeria", text: "Within 14 days, will NEMA or OCHA report flooding that displaces 10,000+ people?", criteria: "YES if an official or OCHA report in the window gives 10,000+ displaced by flooding.", outcome: "no", ageDays: 12 },
  { country: "Yemen", text: "Within 14 days, will an IPC/FEWS NET alert or update raise the food-insecurity phase for any governorate?", criteria: "YES if a published update in the window raises a phase classification.", outcome: "yes", ageDays: 9 },
  // open now
  { country: "Chad", text: "Within the next 14 days, will UNHCR report 3,000+ new arrivals from Sudan into eastern Chad in a single week?", criteria: "YES if a UNHCR operational update in the window shows ≥3,000 new weekly arrivals.", daysLeft: 11 },
  { country: "Sudan", text: "Within the next 14 days, will a humanitarian convoy be denied access or attacked in Darfur, per OCHA access reporting?", criteria: "YES if OCHA access snapshots/flash updates in the window record such an incident.", daysLeft: 10 },
  { country: "Mali", text: "Within the next 14 days, will fuel shortages force a shutdown of public services in Bamako?", criteria: "YES if two independent sources report suspended services due to fuel shortages.", daysLeft: 12 },
  { country: "Lebanon", text: "Within the next 14 days, will evacuation orders affect 20,000+ people in a single announcement?", criteria: "YES if an official order or OCHA update in the window cites 20,000+ people.", daysLeft: 9 },
];

export async function seedSignals() {
  // atomic claim so concurrent workers never seed twice
  const claimed = await db.insert(s.meta).values({ key: "v3_signals", value: "1" }).onConflictDoNothing().returning();
  if (!claimed.length) return;
  const w = await loadWorld();
  const now = Date.now();
  const r = rng(2026);
  const experts = w.experts.filter((e) => !e.isModerator);
  const pairNames = ["Tariq Aziz", "Lea Moreau"];
  const pair = experts.filter((e) => pairNames.includes(e.realName));

  const riskFor = (country: string) =>
    w.risks.find((x) => x.status === "Active" && x.countries.includes(country)) ?? w.risks.find((x) => x.countries.includes(country));

  type Pending = { qid: number; risk: string; country: string; sig: Sig; opensAt: Date };
  const created: Pending[] = [];
  for (const sg of SIGNALS) {
    const risk = riskFor(sg.country);
    if (!risk) continue;
    const resolved = !!sg.outcome;
    const opensAt = new Date(now - (resolved ? sg.ageDays! + 14 : 3) * DAY);
    const closesAt = new Date(resolved ? now - sg.ageDays! * DAY : now + sg.daysLeft! * DAY);
    const [q] = await db
      .insert(s.questions)
      .values({
        riskId: risk.id,
        text: sg.text,
        criteria: sg.criteria + " ‘Unobservable’ is never counted as a miss.",
        kind: "signal",
        season: "S2",
        status: resolved ? "resolved" : "open",
        outcome: sg.outcome ?? null,
        opensAt,
        closesAt,
      })
      .returning({ id: s.questions.id });
    created.push({ qid: q.id, risk: risk.id, country: sg.country, sig: sg, opensAt });
  }

  const fcs: (typeof s.forecasts.$inferInsert)[] = [];
  const pairBase = new Map<number, number>();
  for (const c of created) {
    const resolved = !!c.sig.outcome;
    const o = c.sig.outcome === "yes" ? 1 : 0;
    const target = o ? 86 : 14;
    // lock-step pair answers every resolved signal check, a few minutes apart, with near-identical wording
    if (resolved && pair.length === 2) {
      const base = clamp(Math.round(40 + r() * 40), 20, 80);
      pairBase.set(c.qid, base);
      pair.forEach((e, i) => {
        fcs.push({
          questionId: c.qid,
          expertId: e.id,
          probability: base + (i ? 1 : 0),
          confidence: 2,
          reason: "Heard from contacts that tensions are rising near the border and the situation looks unstable this period.",
          evidenceType: "local_source",
          identityMode: "profile",
          secondsSpent: 40 + Math.floor(r() * 20),
          createdAt: new Date(c.opensAt.getTime() + 3 * DAY + i * (4 + Math.floor(r() * 5)) * MIN),
        });
      });
    }
    for (const e of experts) {
      if (pairNames.includes(e.realName)) continue;
      const covers = e.countries.includes(c.country);
      if (!covers && r() > 0.12) continue;
      if (!resolved && r() < 0.55) continue; // open ones: leave room for demo personas to answer
      if (!resolved && ["Fatimé Abakar", "Dr. Claire Nguema", "Idriss Mahamat", "Samuel Eze"].includes(e.realName)) continue;
      let p: number;
      let secs = 25 + Math.floor(r() * 45);
      let reason = "";
      switch (e.archetype) {
        case "ace": p = target + (r() - 0.5) * 16; break;
        case "solid": p = 50 + (target - 50) * 0.6 + (r() - 0.5) * 24; break;
        case "partisan": p = (o ? 80 : 88) + (r() - 0.5) * 10; break;
        case "rubber": p = 55 + (r() - 0.5) * 10; break;
        case "fence": p = 50 + (r() - 0.5) * 6; break;
        case "speeder": p = 20 + r() * 60; secs = 3 + Math.floor(r() * 5); break;
        default: p = 50 + (target - 50) * 0.3 + (r() - 0.5) * 36;
      }
      p = clamp(Math.round(p), 3, 97);
      if (["ace", "solid"].includes(e.archetype)) {
        reason = o
          ? "Contacts on the ground describe exactly this pattern in the past fortnight; it matches what I see on the roads and at the crossing."
          : "Indicators I track locally are quiet; the usual precursors are absent and partners report normal operations.";
      }
      fcs.push({
        questionId: c.qid,
        expertId: e.id,
        probability: p,
        confidence: e.archetype === "ace" ? 3 : 2,
        reason,
        evidenceType: reason ? (e.archetype === "ace" ? "direct" : "local_source") : "none",
        identityMode: "profile",
        coiFlag: e.archetype === "partisan",
        secondsSpent: secs,
        createdAt: new Date(c.opensAt.getTime() + Math.floor((0.2 + r() * 8) * DAY)),
      });
    }
  }
  for (let i = 0; i < fcs.length; i += 200) await db.insert(s.forecasts).values(fcs.slice(i, i + 200));

  // resolution receipts: the fast loop experts actually feel (private to each expert)
  const receipts: (typeof s.notifications.$inferInsert)[] = [];
  for (const c of created.filter((x) => x.sig.outcome)) {
    const mine = fcs.filter((f) => f.questionId === c.qid);
    const sorted = mine.map((f) => f.probability).sort((a, b) => a - b);
    const med = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 50;
    const o = c.sig.outcome === "yes" ? 1 : 0;
    for (const f of mine) {
      const b = ((f.probability ?? 50) / 100 - o) ** 2;
      receipts.push({
        expertId: f.expertId,
        kind: "receipt",
        questionId: c.qid,
        riskId: c.risk,
        title: `Signal check resolved: ${c.country} — outcome ${o ? "YES" : "NO"}`,
        reason: `You said ${f.probability}%, the circle median was ${med}%. Brier ${b.toFixed(2)} (lower is better). This feeds your private calibration mirror — resolved in days, not months.`,
        score: 100,
        readAt: new Date(),
        createdAt: new Date(c.sig.ageDays ? now - (c.sig.ageDays - 1) * DAY : now),
      });
    }
  }
  for (let i = 0; i < receipts.length; i += 200) await db.insert(s.notifications).values(receipts.slice(i, i + 200));

  // dispatch the open signal checks with the same relevance + cap logic as everything else
  const w2 = await loadWorld();
  const asks: (typeof s.notifications.$inferInsert)[] = [];
  for (const c of created.filter((x) => !x.sig.outcome)) {
    const risk = w2.riskById.get(c.risk)!;
    for (const p of planDispatch(w2, risk, { id: c.qid })) {
      if (p.decision === "answered") continue;
      asks.push({
        expertId: p.expertId,
        kind: "question",
        questionId: c.qid,
        riskId: risk.id,
        title: `Fast loop · ${risk.country}: ${c.sig.text.slice(0, 100)}`,
        reason: p.reason,
        score: p.score,
        suppressed: p.decision === "suppress",
      });
    }
  }
  // respect each expert's weekly cap among the signal asks too (earliest/best first)
  const seen = new Map<number, number>();
  for (const a of asks.sort((x, y) => (y.score ?? 0) - (x.score ?? 0))) {
    if (a.suppressed) continue;
    const e = w2.expertById.get(a.expertId)!;
    const n = (seen.get(a.expertId) ?? 0) + 1;
    seen.set(a.expertId, n);
    if (n > 1 && n > Math.max(1, e.weeklyCap - 1)) {
      a.suppressed = true;
      a.reason = `Weekly cap reached — available on your radar, not pushed`;
    }
  }
  for (let i = 0; i < asks.length; i += 200) await db.insert(s.notifications).values(asks.slice(i, i + 200));
}
