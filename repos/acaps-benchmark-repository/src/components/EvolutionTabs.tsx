"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { downstream, TEXT_MAX, TEXT_MIN } from "@/lib/evolution/links";
import type { CardOption, LinkRow } from "@/lib/evolution/service";

type Grid = {
  regions: string[];
  themes: string[];
  themeLabels: Record<string, string>;
  minCell: number;
  unplaced: { risks: number; cards: number };
  cells: { region: string; theme: string; risks: number; cards: number; live: number; open: number; small: boolean }[];
};
type Series = {
  cardId: string;
  statement: string;
  status: string;
  riskId: string;
  country: string;
  closedRounds: number[];
  points: { round: number; day: string; n: number; estimate: number; lo: number; hi: number }[];
  withheld: { round: number }[];
  note: string;
};

type Envelope<T> = { ok: boolean; data?: T; error?: string };

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({ ok: false, error: "Unreadable response" }))) as Envelope<T>;
  if (!res.ok || !json.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json.data as T;
}

/** A probability in [0, 1] as a percentage, one decimal at most. */
const pct = (p: number) => `${Math.round(p * 1000) / 10}%`;
const clamp01 = (p: number) => Math.min(1, Math.max(0, p));

/** The range from lo to hi with the estimate marked, on a 0 to 100% axis. Numbers are in the text beside it. */
function IntervalBar({ lo, hi, estimate }: { lo: number; hi: number; estimate: number }) {
  const w = 240;
  return (
    <svg viewBox={`0 0 ${w} 22`} className="mt-1 h-5 w-full max-w-[240px]" aria-hidden="true" focusable="false">
      <line x1={0} x2={w} y1={9} y2={9} className="stroke-stone-300" strokeWidth={4} strokeLinecap="round" />
      <line x1={clamp01(lo) * w} x2={clamp01(hi) * w} y1={9} y2={9} className="stroke-teal-300" strokeWidth={6} strokeLinecap="round" />
      <rect x={clamp01(estimate) * w - 4} y={4} width={8} height={10} className="fill-teal-800" />
      {[0, 0.5, 1].map((t) => (
        <text key={t} x={t * w} y={21} textAnchor={t === 0 ? "start" : t === 1 ? "end" : "middle"} className="fill-stone-400 text-[8px]">
          {t * 100}%
        </text>
      ))}
    </svg>
  );
}

const TABS = [
  ["series", "Panel series"],
  ["grid", "Regional grid"],
  ["links", "Analyst links"],
] as const;

export function EvolutionTabs({ cards, grid, links }: { cards: CardOption[]; grid: Grid; links: LinkRow[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("series");
  return (
    <div>
      <div role="tablist" aria-label="Situation evolution" className="mb-4 flex flex-wrap gap-2">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === id ? "bg-teal-700 text-white" : "bg-white ring-1 ring-stone-300 hover:bg-stone-100"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "series" && <PanelSeries cards={cards} />}
        {tab === "grid" && <GridView grid={grid} />}
        {tab === "links" && <LinksView cards={cards} links={links} />}
      </div>
    </div>
  );
}

function CardSelect({ id, cards, value, onChange, label }: { id: string; cards: CardOption[]; value: string; onChange: (v: string) => void; label: string }) {
  const groups = useMemo(() => {
    const m = new Map<string, CardOption[]>();
    for (const c of cards) m.set(c.group, [...(m.get(c.group) ?? []), c]);
    return [...m.entries()];
  }, [cards]);
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-stone-600">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm">
        <option value="">Choose a card</option>
        {groups.map(([g, list]) => (
          <optgroup key={g} label={g}>
            {list.map((c) => (
              <option key={c.id} value={c.id}>{`#${c.id} ${c.hasRounds ? "● " : ""}${c.label}`}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

/* ----------------------------------------------------------------------------------------------------------- */

function PanelSeries({ cards }: { cards: CardOption[] }) {
  const [cardId, setCardId] = useState("");
  const [series, setSeries] = useState<Series | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

  // Only the newest choice may land, so a slow earlier card cannot replace the one on screen.
  async function choose(id: string) {
    const my = ++seq.current;
    setCardId(id);
    setSeries(null);
    setError("");
    if (!id) return;
    try {
      const r = await call<Series>("GET", `/api/staff/cards/${encodeURIComponent(id)}/series`);
      if (my === seq.current) setSeries(r);
    } catch (e) {
      if (my === seq.current) setError((e as Error).message);
    }
  }

  async function close(round: 1 | 2) {
    if (!series) return;
    const ok = window.confirm(
      `Close round ${round}? The panel's numbers for this round are released once and cannot be re-released. ${round === 1 ? "New first estimates are no longer accepted." : "New second looks are no longer accepted."} Below 5 respondents, the round is withheld.`
    );
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      await call("POST", `/api/staff/cards/${encodeURIComponent(series.cardId)}/close-round`, { round });
      await choose(series.cardId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const rows = series
    ? [...series.points.map((p) => ({ ...p, withheld: false as const })), ...series.withheld.map((w) => ({ round: w.round, withheld: true as const }))].sort((a, b) => a.round - b.round)
    : [];

  return (
    <section aria-labelledby="ev-panel-h" className="space-y-3">
      <div>
        <h2 id="ev-panel-h" className="font-serif text-xl font-semibold">Panel over the rounds</h2>
        <p className="text-sm text-slate-600">
          Each released round with its estimate and interval. Round 1 is the first instinct, round 2 follows the second look. A round with fewer than 5 respondents is withheld and shows no numbers. No individual trajectories, and times are day-coarse. Staff only.
        </p>
      </div>
      <CardSelect id="ev-card" cards={cards} value={cardId} onChange={choose} label="Card (● = has a released round)" />
      {error && <div role="alert" className="rounded-lg bg-rose-50 p-2 text-sm text-rose-800">{error}</div>}
      {series && (
        <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
          <h3 className="text-sm font-semibold leading-snug">{series.statement}</h3>
          <p className="text-xs text-stone-500">
            Status: {series.status} · {series.country} ·{" "}
            <Link href={`/risks/${series.riskId}#timeline`} className="font-semibold text-teal-700 underline">
              see how ACAPS recorded this risk to change
            </Link>
          </p>
          {rows.length === 0 ? (
            <p className="text-sm text-stone-600">No rounds to show yet.</p>
          ) : (
            <table aria-label="Rounds for this card" className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-stone-500">
                  <th scope="col" className="py-1 pr-3 font-medium">Round</th>
                  <th scope="col" className="py-1 pr-3 font-medium">Day</th>
                  <th scope="col" className="py-1 pr-3 font-medium">Experts</th>
                  <th scope="col" className="py-1 font-medium">Estimate and interval</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) =>
                  r.withheld ? (
                    <tr key={`w${r.round}`} className="border-t border-stone-200 text-stone-600">
                      <td colSpan={4} className="py-2">{`Round ${r.round}: withheld, fewer than 5 respondents`}</td>
                    </tr>
                  ) : (
                    <tr key={r.round} className="border-t border-stone-200 align-top">
                      <td className="py-2 pr-3">{`Round ${r.round}`}</td>
                      <td className="py-2 pr-3">{r.day}</td>
                      <td className="py-2 pr-3">{`${r.n} experts`}</td>
                      <td className="py-2">
                        <strong>{pct(r.estimate)}</strong> <span className="text-xs text-stone-500">{`interval ${pct(r.lo)} to ${pct(r.hi)}`}</span>
                        <IntervalBar lo={r.lo} hi={r.hi} estimate={r.estimate} />
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
          {series.note && <p className="text-xs text-stone-500">{series.note}</p>}
          {series.status === "open" && (
            <div className="flex flex-wrap items-center gap-2 border-t border-stone-200 pt-2">
              {!series.closedRounds.includes(1) && (
                <button disabled={busy} onClick={() => close(1)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                  Close round 1 and release
                </button>
              )}
              {series.closedRounds.includes(1) && !series.closedRounds.includes(2) && (
                <button disabled={busy} onClick={() => close(2)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                  Close round 2 and release
                </button>
              )}
              <span className="text-xs text-stone-500">Moderator action. Writes one ledger entry per round, through the release gate.</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ----------------------------------------------------------------------------------------------------------- */

function GridView({ grid }: { grid: Grid }) {
  const cell = (region: string, theme: string) => grid.cells.find((c) => c.region === region && c.theme === theme);
  return (
    <section aria-labelledby="ev-grid-h" className="space-y-3">
      <div>
        <h2 id="ev-grid-h" className="font-serif text-xl font-semibold">Regional grid</h2>
        <p className="text-sm text-slate-600">
          Counts of ACAPS radar risks and questions by region and theme. No expert or answer data. {`Cells with fewer than ${grid.minCell} risks are descriptive only; no association between situations is implied.`} Small cells are marked, not hidden.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white" role="region" aria-label="Regional grid, scrolls sideways on a small screen" tabIndex={0}>
        <table aria-label="Risks and cards by region and theme" className="w-full min-w-[760px] border-collapse text-left text-xs">
          <thead>
            <tr className="bg-stone-50">
              <th scope="col" className="p-2 font-semibold">Region</th>
              {grid.themes.map((t) => (
                <th key={t} scope="col" className="p-2 font-semibold">{grid.themeLabels[t] ?? t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.regions.map((r) => (
              <tr key={r} className="border-t border-stone-200 align-top">
                <th scope="row" className="p-2 font-semibold">{r}</th>
                {grid.themes.map((t) => {
                  const c = cell(r, t);
                  return (
                    <td key={t} className={`p-2 ${c?.small ? "bg-stone-50 text-stone-600" : ""}`} title={c?.small ? "descriptive only" : undefined}>
                      {!c ? (
                        "—"
                      ) : (
                        <div className="space-y-0.5">
                          <div className="text-sm font-semibold text-slate-900">{`${c.risks} ${c.risks === 1 ? "risk" : "risks"}`}</div>
                          {c.cards > 0 && <div>{`${c.cards} ${c.cards === 1 ? "card" : "cards"} (${c.open} open)`}</div>}
                          {c.small && <span className="inline-block rounded-full bg-white px-1.5 py-0.5 text-[10px] ring-1 ring-stone-300">descriptive only</span>}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(grid.unplaced.risks > 0 || grid.unplaced.cards > 0) && (
        <p className="text-xs text-stone-500">{`Not placed in a cell: ${grid.unplaced.risks} risks, ${grid.unplaced.cards} cards.`}</p>
      )}
    </section>
  );
}

/* ----------------------------------------------------------------------------------------------------------- */

function LinksView({ cards, links }: { cards: CardOption[]; links: LinkRow[] }) {
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [mechanism, setMechanism] = useState("");
  const [rival, setRival] = useState("");
  const [formError, setFormError] = useState("");
  const [formOk, setFormOk] = useState("");
  const [removeError, setRemoveError] = useState("");
  const [chainCard, setChainCard] = useState("");
  const [filter, setFilter] = useState("");

  // Links join live cards; closed history is not offered.
  const linkable = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return cards.filter((c) => !c.group.startsWith("Closed history") && (!f || c.label.toLowerCase().includes(f) || c.id === f));
  }, [cards, filter]);
  const statements = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of cards) m.set(c.id, c.statement);
    for (const l of links) {
      if (l.fromStatement) m.set(l.fromCardId, l.fromStatement);
      if (l.toStatement) m.set(l.toCardId, l.toStatement);
    }
    return m;
  }, [cards, links]);
  const label = (id: string) => `#${id} ${statements.get(id) ?? "(card removed)"}`;
  const chain = chainCard ? downstream(links, chainCard) : [];
  const mechOf = (id: string) => links.find((l) => l.id === id);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const m = mechanism.trim();
    const r = rival.trim();
    const issues: string[] = [];
    if (!from || !to) issues.push("Choose the card the link comes from and the card it leads to.");
    else if (from === to) issues.push("Choose two different cards.");
    if (m.length < TEXT_MIN || m.length > TEXT_MAX) issues.push(`The mechanism needs ${TEXT_MIN} to ${TEXT_MAX} characters; it has ${m.length}.`);
    if (r.length < TEXT_MIN || r.length > TEXT_MAX) issues.push(`The rival explanation needs ${TEXT_MIN} to ${TEXT_MAX} characters; it has ${r.length}.`);
    setFormOk("");
    if (issues.length) return setFormError(issues.join(" "));
    setFormError("");
    try {
      await call("POST", "/api/staff/links", { fromCardId: from, toCardId: to, mechanism: m, rival: r });
      setFrom("");
      setTo("");
      setMechanism("");
      setRival("");
      setFormOk("Link recorded.");
      router.refresh();
    } catch (err) {
      setFormError((err as Error).message);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this link? The two cards stay; only the analyst judgement is deleted.")) return;
    setRemoveError("");
    try {
      await call("DELETE", `/api/staff/links/${encodeURIComponent(id)}`);
      router.refresh();
    } catch (err) {
      setRemoveError((err as Error).message);
    }
  }

  return (
    <section aria-labelledby="ev-links-h" className="space-y-5">
      <div>
        <h2 id="ev-links-h" className="font-serif text-xl font-semibold">Analyst links between questions</h2>
        <p className="text-sm text-slate-600">
          A link says a moderator believes one situation feeds another. It is created only by hand, never inferred, and always carries a stated mechanism and a rival explanation. Nothing here measures correlation or detects cascades: at pilot scale that cannot be done honestly.
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Recorded links ({links.length})</h3>
        {removeError && <div role="alert" className="mb-2 rounded-lg bg-rose-50 p-2 text-sm text-rose-800">{removeError}</div>}
        {links.length === 0 ? (
          <p className="text-sm text-stone-500">No links yet.</p>
        ) : (
          <ul className="space-y-3">
            {links.map((l) => (
              <li key={l.id} className="rounded-xl border border-stone-200 bg-white p-3 text-sm">
                <p className="mb-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">Analyst judgement, not a finding</p>
                <p><span className="text-xs font-semibold text-stone-500">From </span>{label(l.fromCardId)}</p>
                <p aria-hidden="true" className="pl-2 text-stone-400">↓ feeds</p>
                <p><span className="text-xs font-semibold text-stone-500">To </span>{label(l.toCardId)}</p>
                <p className="mt-2"><b>Mechanism:</b> {l.mechanism}</p>
                <p className="mt-1"><b>Rival explanation:</b> {l.rival}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
                  <span>Recorded {l.day}</span>
                  <button onClick={() => remove(l.id)} className="rounded-lg px-2 py-1 font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50">Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={create} className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-3" aria-labelledby="ev-new-h">
        <h3 id="ev-new-h" className="text-sm font-semibold">Record a link</h3>
        <div>
          <label htmlFor="ev-filter" className="mb-1 block text-xs font-semibold text-stone-600">Filter the card lists (country, wording or card number)</label>
          <input id="ev-filter" value={filter} onChange={(e) => setFilter(e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" placeholder="e.g. Sudan" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <CardSelect id="ev-from" cards={linkable} value={from} onChange={setFrom} label="From card (the situation that feeds)" />
          <CardSelect id="ev-to" cards={linkable} value={to} onChange={setTo} label="To card (the situation that follows)" />
        </div>
        <div>
          <label htmlFor="ev-mech" className="mb-1 block text-xs font-semibold text-stone-600">Mechanism: how does the first lead to the second?</label>
          <textarea id="ev-mech" value={mechanism} onChange={(e) => setMechanism(e.target.value)} rows={3} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
          <p className="text-[11px] text-stone-500">{mechanism.trim().length} / {TEXT_MAX} characters, at least {TEXT_MIN}</p>
        </div>
        <div>
          <label htmlFor="ev-rival" className="mb-1 block text-xs font-semibold text-stone-600">Rival explanation: what else could explain both moving together? (required)</label>
          <textarea id="ev-rival" value={rival} onChange={(e) => setRival(e.target.value)} rows={3} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
          <p className="text-[11px] text-stone-500">{rival.trim().length} / {TEXT_MAX} characters, at least {TEXT_MIN}</p>
        </div>
        {formError && <div role="alert" className="rounded-lg bg-rose-50 p-2 text-sm text-rose-800">{formError}</div>}
        {formOk && <div role="status" className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800">{formOk}</div>}
        <button type="submit" className="rounded-lg bg-teal-700 px-4 py-1.5 text-sm font-semibold text-white">Record link</button>
      </form>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Follow a chain downstream</h3>
        <CardSelect id="ev-chain" cards={cards.filter((c) => !c.group.startsWith("Closed history"))} value={chainCard} onChange={setChainCard} label="Start from card" />
        {chainCard && (
          chain.length === 0 ? (
            <p className="text-sm text-stone-500">No analyst-linked cards downstream of this one (up to 3 steps).</p>
          ) : (
            <ol className="space-y-1.5 text-sm">
              {chain.map((c) => (
                <li key={c.cardId} style={{ marginLeft: `${(c.depth - 1) * 16}px` }} className="rounded-lg bg-white p-2 ring-1 ring-stone-200">
                  <span className="text-xs font-semibold text-stone-500">{`Step ${c.depth} · `}</span>
                  {label(c.cardId)}
                  {mechOf(c.via) && <p className="mt-0.5 text-xs text-stone-600">{`Mechanism stated by the analyst: ${mechOf(c.via)!.mechanism}`}</p>}
                </li>
              ))}
              <li className="text-[11px] text-stone-500">Each step is an analyst judgement, not a finding. No probability is attached to any step.</li>
            </ol>
          )
        )}
      </div>
    </section>
  );
}
