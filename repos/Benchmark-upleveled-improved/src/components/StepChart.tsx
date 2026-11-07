const W = 640;
const H = 240;
const L = 52;
const R = 20;
const T = 16;
const B = 42;

/** The date as a day count, so spacing on the x axis follows the calendar. */
const day = (d: string) => Date.parse(`${d}T00:00:00Z`);

type Pt = { date: string; value: number };

/**
 * An accessible step chart of dated values: each value holds until the next date. Entries are drawn in date order; entries
 * on the same day keep the order they were recorded in and sit at the same x. Every chart has a title, a description and a
 * table of its values (no meaning is carried by colour alone: each point is a marker and each value is in the table).
 */
export function StepChart({
  title,
  points,
  yMin = 0,
  yMax = 100,
  unit = "%",
  caption,
}: {
  title: string;
  points: Pt[];
  yMin?: number;
  yMax?: number;
  unit?: string;
  caption?: string;
}) {
  if (!points || points.length === 0) return <p className="text-sm text-stone-500">No dated history recorded.</p>;

  // A stable sort: same-day entries keep the file order, which is how ACAPS recorded them.
  const pts = [...points].sort((a, b) => day(a.date) - day(b.date));
  const first = day(pts[0].date);
  const last = day(pts[pts.length - 1].date);
  const span = last - first;
  const x = (d: string) => L + (span > 0 ? (day(d) - first) / span : 0.5) * (W - L - R);
  const y = (v: number) => T + (1 - (Math.min(yMax, Math.max(yMin, v)) - yMin) / (yMax - yMin)) * (H - T - B);
  const fmt = (v: number) => `${v}${unit}`;
  const sameDay = pts.map((p, i) => i > 0 && p.date === pts[i - 1].date);
  const latest = pts[pts.length - 1];
  const desc =
    pts.length === 1
      ? `One recorded value: ${fmt(latest.value)} on ${latest.date}.`
      : `${pts.length} recorded values from ${pts[0].date} to ${latest.date}. Latest: ${fmt(latest.value)} on ${latest.date}.`;

  // The value holds from its date until the next one: a horizontal run at the old value, then a vertical step.
  let path = "";
  if (pts.length > 1) {
    path = `M${x(pts[0].date)} ${y(pts[0].value)}`;
    for (let i = 1; i < pts.length; i++) path += ` H${x(pts[i].date)} V${y(pts[i].value)}`;
  }
  const gridValues = [yMin, (yMin + yMax) / 2, yMax];

  return (
    <figure className="my-2">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} className="h-auto w-full max-w-2xl">
        <title>{title}</title>
        <desc>{desc}</desc>
        {gridValues.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="stroke-stone-200" strokeDasharray="3 4" />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" className="fill-stone-500 text-[11px]">
              {fmt(v)}
            </text>
          </g>
        ))}
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} className="stroke-stone-400" />
        {span > 0 ? (
          <>
            <text x={L} y={H - B + 18} className="fill-stone-500 text-[11px]">{pts[0].date}</text>
            <text x={W - R} y={H - B + 18} textAnchor="end" className="fill-stone-500 text-[11px]">{latest.date}</text>
          </>
        ) : (
          <text x={x(pts[0].date)} y={H - B + 18} textAnchor="middle" className="fill-stone-500 text-[11px]">{pts[0].date}</text>
        )}
        {path && <path d={path} fill="none" strokeWidth={2.2} className="stroke-teal-700" />}
        {pts.map((p, i) => (
          <rect
            key={i}
            x={x(p.date) - 4.5}
            y={y(p.value) - 4.5}
            width={9}
            height={9}
            transform={`rotate(45 ${x(p.date)} ${y(p.value)})`}
            className={sameDay[i] ? "fill-white stroke-teal-800" : "fill-teal-700 stroke-white"}
            strokeWidth={1.5}
          >
            <title>{`${p.date}: ${fmt(p.value)}${sameDay[i] ? ", same day, order as recorded" : ""}`}</title>
          </rect>
        ))}
      </svg>
      {caption && <figcaption className="text-xs text-stone-500">{caption}</figcaption>}
      <details className="mt-1 text-xs text-stone-600">
        <summary className="cursor-pointer font-medium text-stone-700">Values as a table</summary>
        <table aria-label={`${title}: values`} className="mt-1 w-full max-w-md text-left">
          <thead>
            <tr className="text-stone-500">
              <th scope="col" className="py-0.5 pr-3 font-medium">Date</th>
              <th scope="col" className="py-0.5 pr-3 font-medium">Value</th>
              <th scope="col" className="py-0.5 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {pts.map((p, i) => (
              <tr key={i} className="border-t border-stone-100">
                <td className="py-0.5 pr-3">{p.date}</td>
                <td className="py-0.5 pr-3">{fmt(p.value)}</td>
                <td className="py-0.5">{sameDay[i] ? "same day, order as recorded" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
