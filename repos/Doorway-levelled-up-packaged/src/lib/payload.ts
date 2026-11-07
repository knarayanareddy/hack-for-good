/**
 * The Counter — eight aggregate fields, and nothing else (ported from packages/core/src/counter.js).
 * No session id. No timestamp. No exact exposure count. No query text.
 *
 * Schema v2 note: the only change is three extra values for `f` (fork, wave, hallway).
 * No new field. Nothing that could identify a person.
 */

export interface Payload {
  i: string;
  v: string;
  f: string;
  t: string;
  o: string;
  r: string;
  e: string;
  b: number;
}

export const OUTCOMES = ["clicked_help", "left_page", "dismissed", "continued", "timeout"] as const;
export type Outcome = (typeof OUTCOMES)[number];

const ALLOWED: Record<keyof Payload, (v: unknown) => boolean> = {
  i: (v) => typeof v === "string" && /^inst_[a-z0-9]{6,}$/.test(v),
  v: (v) => typeof v === "string" && /^(legal|harm|control|ai|selfhelp)-\d{2}$/.test(v),
  f: (v) => ["gate", "blur", "card", "chat", "quiet", "fork", "wave", "hallway"].includes(v as string),
  t: (v) => ["search", "chat", "nav", "upload"].includes(v as string),
  o: (v) => (OUTCOMES as readonly string[]).includes(v as string),
  r: (v) => typeof v === "string" && /^[a-z]{2}-[a-z0-9-]{2,}$/.test(v),
  e: (v) => ["1", "2", "3", "4", "5+"].includes(v as string),
  b: (v) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 23,
};

export const FIELDS = Object.keys(ALLOWED) as (keyof Payload)[];

/** Whitelist build. Unknown or extra keys are rejected, not stripped. */
export function build(input: Record<string, unknown>): { ok: true; payload: Payload } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  for (const k of Object.keys(input)) if (!(k in ALLOWED)) errors.push(`unknown field: ${k}`);
  for (const k of FIELDS) {
    if (input[k] === undefined) errors.push(`missing field: ${k}`);
    else if (!ALLOWED[k](input[k])) errors.push(`invalid ${k}`);
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, payload: Object.fromEntries(FIELDS.map((k) => [k, input[k]])) as unknown as Payload };
}

/** k-anonymity: cells below k are suppressed before display. */
export const K = 10;
export const suppress = (count: number, k = K) => (count < k ? null : count);

/** Honest click-through: numerator over a real denominator, never a rate alone. */
export function ctr(clicked: number, shown: number) {
  if (!shown) return { rate: null as number | null, note: "no exposures" };
  return { rate: clicked / shown, note: shown < 100 ? "small denominator — indicative only" : "" };
}

/** What each field means, in plain language — shown to the person in the Glass Door. */
export const FIELD_EXPLAINED: Record<keyof Payload, { nl: string; en: string }> = {
  i: { nl: "Welk forum dit is — niet wie jij bent", en: "Which forum this is — not who you are" },
  v: { nl: "Welke tekstvariant je zag", en: "Which wording you saw" },
  f: { nl: "Welke vorm je zag", en: "Which shape you saw" },
  t: { nl: "Soort trigger (zoeken, chat…) — nooit de tekst", en: "Kind of trigger (search, chat…) — never the text" },
  o: { nl: "Wat je deed", en: "What you did" },
  r: { nl: "Welke hulproute (indien gekozen)", en: "Which help route (if chosen)" },
  e: { nl: "Een emmer (1, 2, 3, 4, 5+) — geen exact aantal", en: "A bucket (1, 2, 3, 4, 5+) — not an exact count" },
  b: { nl: "Het uur van de dag (0–23) — geen tijdstip", en: "The hour of day (0–23) — not a timestamp" },
};
