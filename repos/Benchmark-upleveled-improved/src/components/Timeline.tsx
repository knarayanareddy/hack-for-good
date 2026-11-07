import { StepChart } from "./StepChart";
import type { Timeline } from "@/lib/evolution/timeline";

export const TIMELINE_CAPTION =
  "Dates and values as recorded by ACAPS analysts. Completion rate is a judgement whose meaning has not been standardised.";

const TREND: Record<string, { glyph: string; cls: string }> = {
  Deteriorated: { glyph: "▼", cls: "bg-rose-50 text-rose-800 ring-rose-200" },
  Stable: { glyph: "■", cls: "bg-stone-100 text-stone-700 ring-stone-200" },
  Improved: { glyph: "▲", cls: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
};

const MOVE_WORDS = { up: "recorded value rose", down: "recorded value fell", flat: "recorded value unchanged", none: "" } as const;

/** Newest first; an update with no date (text before the first dated header) goes last. Equal dates keep the file order. */
const newestFirst = (updates: Timeline["rationaleUpdates"]) =>
  [...updates].sort((a, b) => ((b.date ?? "") < (a.date ?? "") ? -1 : (b.date ?? "") > (a.date ?? "") ? 1 : 0));

const distinctDates = (pts: { date: string }[]) => new Set(pts.map((p) => p.date)).size;

/**
 * How a risk has been recorded to change. Shows only what ACAPS recorded, with its dates: no durations, lags or
 * probabilities are computed. FULL RISK VIEW ONLY: the caller decides access (see timelineAccess).
 */
export function TimelineSection({ timeline }: { timeline: Timeline }) {
  const triggers = timeline.triggers;
  const updates = newestFirst(timeline.rationaleUpdates);
  const moving = triggers.filter((t) => distinctDates(t.completion) >= 2 || distinctDates(t.trend) >= 2).length;

  return (
    <section id="timeline" aria-labelledby="timeline-h" className="scroll-mt-24">
      <h2 id="timeline-h" className="mb-1 font-semibold">How this risk has been recorded to change</h2>
      <p className="text-xs text-stone-500">{TIMELINE_CAPTION}</p>
      {timeline.span && (
        <p className="mt-1 text-xs text-stone-600">
          Recorded between <b>{timeline.span.from}</b> and <b>{timeline.span.to}</b> · {timeline.points} dated entries · {moving} of {triggers.length} charted{" "}
          {triggers.length === 1 ? "trigger has" : "triggers have"} readings on two or more dates.
        </p>
      )}
      {timeline.riskTrend && (
        <p className="mt-2 text-xs text-stone-600">
          Current risk trend as recorded: <b>{timeline.riskTrend}</b> (a single current value; ACAPS keeps no history of it).
        </p>
      )}
      {triggers.length === 0 && updates.length === 0 && <p className="mt-2 text-sm text-stone-600">ACAPS has recorded no dated changes for this risk.</p>}

      <div className="mt-3 space-y-4">
        {triggers.map((t) => {
          const readings = t.completion.length + t.trend.length;
          const title = t.title ?? t.id;
          return (
            <article key={t.id} className="rounded-xl bg-stone-50 p-3">
              <h3 className="text-sm font-medium">{title}</h3>
              {t.completion.length > 0 && (
                <>
                  <StepChart title={`Completion rate: ${title}`} points={t.completion} yMin={0} yMax={100} unit="%" />
                  <p className="text-[11px] text-stone-500">
                    Analyst-recorded, meaning not standardised. Not a probability.
                    {t.movement.completion !== "none" && ` Between first and last date: ${MOVE_WORDS[t.movement.completion]}.`}
                  </p>
                </>
              )}
              {readings === 1 && <p className="mt-1 text-xs text-stone-500">One reading, no movement to show.</p>}
              {t.trend.length > 0 && (
                <ul aria-label={`Trend: ${title}`} className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {t.trend.map((p, j) => {
                    const tr = TREND[p.value];
                    return (
                      <li key={j} className="flex items-center gap-1.5 text-xs">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ring-1 ring-inset ${tr?.cls ?? "bg-stone-100 text-stone-700 ring-stone-200"}`}>
                          <span aria-hidden="true">{tr?.glyph ?? "•"}</span>
                          {p.value}
                        </span>
                        <time dateTime={p.date} className="text-stone-500">{p.date}</time>
                        {p.conflict && <span className="text-stone-400">same day, order as recorded</span>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </article>
          );
        })}
      </div>

      {updates.length > 0 && (
        <>
          <h3 className="mt-4 text-sm font-medium">Rationale updates</h3>
          <ol className="mt-1 space-y-1">
            {updates.map((u, i) => (
              <li key={i} className="text-sm">
                <details>
                  <summary className="cursor-pointer text-stone-700">
                    <time dateTime={u.date ?? undefined} className="font-medium">{u.date ?? "Undated"}</time>
                    <span className="ml-2 text-xs text-stone-500">show this update</span>
                  </summary>
                  <p className="mt-1 whitespace-pre-wrap rounded-lg bg-stone-50 p-2 text-xs text-slate-700">{u.text}</p>
                </details>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
