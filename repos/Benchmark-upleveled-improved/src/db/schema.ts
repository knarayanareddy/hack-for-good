import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** ACAPS Risk Radar export (real data, 139 risks). */
export const risks = pgTable("risks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull().default(""),
  country: text("country").notNull(),
  countries: jsonb("countries").$type<string[]>().notNull(),
  region: text("region").notNull(),
  theme: text("theme").notNull(),
  probability: text("probability").notNull().default(""),
  impact: text("impact").notNull().default(""),
  level: text("level").notNull().default(""),
  trend: text("trend").notNull().default(""),
  status: text("status").notNull(),
  rationale: text("rationale").notNull().default(""),
  sources: jsonb("sources").$type<string[]>().notNull(),
  exposure: text("exposure").notNull().default(""),
  expectedImpact: text("expected_impact").notNull().default(""),
  materialised: text("materialised").notNull().default(""),
});

export const triggers = pgTable("triggers", {
  id: text("id").primaryKey(),
  riskId: text("risk_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
});

/**
 * Experts. Identity fields (realName, org) are only ever read through
 * src/lib/identity.ts, which enforces the viewer-aware masking rules.
 * All people in this prototype are SYNTHETIC.
 */
export const experts = pgTable("experts", {
  id: serial("id").primaryKey(),
  alias: text("alias").notNull(),
  realName: text("real_name").notNull(),
  org: text("org").notNull().default(""),
  roleType: text("role_type").notNull().default("researcher"),
  /** sealed | alias | confidential | named */
  anonymity: text("anonymity").notNull().default("alias"),
  stageOptIn: boolean("stage_opt_in").notNull().default(false),
  retroactive: boolean("retroactive").notNull().default(true),
  countries: jsonb("countries").$type<string[]>().notNull(),
  themes: jsonb("themes").$type<string[]>().notNull(),
  languages: jsonb("languages").$type<string[]>().notNull(),
  claims: jsonb("claims").$type<string[]>().notNull(),
  /** invited | verified */
  verification: text("verification").notNull().default("invited"),
  vouchedBy: integer("vouched_by"),
  invitedVia: text("invited_via").notNull().default("moderator"),
  isModerator: boolean("is_moderator").notNull().default(false),
  weeklyCap: integer("weekly_cap").notNull().default(2),
  minMatch: integer("min_match").notNull().default(55),
  quietChannel: text("quiet_channel").notNull().default("in-app digest"),
  archetype: text("archetype").notNull().default("real"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const invites = pgTable("invites", {
  code: text("code").primaryKey(),
  label: text("label").notNull(),
  countryHint: text("country_hint").notNull().default(""),
  issuedBy: text("issued_by").notNull().default("ACAPS moderator"),
  usedBy: integer("used_by"),
});

/** A forecastable question derived from an ACAPS risk or trigger. */
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  riskId: text("risk_id").notNull(),
  triggerId: text("trigger_id"),
  text: text("text").notNull(),
  criteria: text("criteria").notNull(),
  season: text("season").notNull().default("current"),
  status: text("status").notNull().default("open"), // open | resolved
  /** forecast = 6-month ACAPS risk/trigger question; signal = short-horizon "signal check" that resolves in days/weeks */
  kind: text("kind").notNull().default("forecast"),
  outcome: text("outcome"), // yes | no | unobservable
  opensAt: timestamp("opens_at").notNull().defaultNow(),
  closesAt: timestamp("closes_at").notNull(),
});

export const forecasts = pgTable(
  "forecasts",
  {
    id: serial("id").primaryKey(),
    questionId: integer("question_id").notNull(),
    expertId: integer("expert_id").notNull(),
    /** locked first-instinct estimate (never overwritten) */
    probability: integer("probability").notNull(),
    revised: integer("revised"),
    confidence: integer("confidence").notNull().default(2),
    reason: text("reason").notNull().default(""),
    evidenceType: text("evidence_type").notNull().default("none"),
    /** divergence interview: what would change my mind (pre-registered disconfirmer) */
    disconfirmer: text("disconfirmer").notNull().default(""),
    /** divergence interview: what the expert says drives the gap vs ACAPS */
    gapBasis: text("gap_basis").notNull().default(""),
    identityMode: text("identity_mode").notNull().default("profile"),
    coiFlag: boolean("coi_flag").notNull().default(false),
    secondsSpent: integer("seconds_spent").notNull().default(60),
    seenAcapsFirst: boolean("seen_acaps_first").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("forecast_q_e").on(t.questionId, t.expertId)]
);

/** Roundtable (structured debate) */
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  riskId: text("risk_id").notNull(),
  parentId: integer("parent_id"),
  expertId: integer("expert_id").notNull(),
  identityMode: text("identity_mode").notNull().default("profile"),
  kind: text("kind").notNull().default("claim"), // claim | evidence | counter | question | missing_risk
  body: text("body").notNull(),
  sourceUrl: text("source_url").notNull().default(""),
  hidden: boolean("hidden").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reactions = pgTable(
  "reactions",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id").notNull(),
    expertId: integer("expert_id").notNull(),
    type: text("type").notNull(), // new_info | changed_mind | needs_source | disagree
  },
  (t) => [uniqueIndex("reaction_unique").on(t.postId, t.expertId, t.type)]
);

export const vouches = pgTable(
  "vouches",
  {
    id: serial("id").primaryKey(),
    voucherId: integer("voucher_id").notNull(),
    voucheeId: integer("vouchee_id").notNull(),
  },
  (t) => [uniqueIndex("vouch_unique").on(t.voucherId, t.voucheeId)]
);

/** In-app dispatch log: every send AND every suppression is recorded (transparency). */
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  expertId: integer("expert_id").notNull(),
  kind: text("kind").notNull(), // question | impact | roundtable | receipt
  questionId: integer("question_id"),
  riskId: text("risk_id"),
  title: text("title").notNull(),
  reason: text("reason").notNull(),
  score: integer("score").notNull().default(0),
  suppressed: boolean("suppressed").notNull().default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Dissent loop: open -> routed -> actioned -> notified -> closed */
export const dissents = pgTable("dissents", {
  id: serial("id").primaryKey(),
  forecastId: integer("forecast_id").notNull(),
  questionId: integer("question_id").notNull(),
  riskId: text("risk_id").notNull(),
  state: text("state").notNull().default("open"),
  gap: integer("gap").notNull().default(0),
  analystNote: text("analyst_note").notNull().default(""),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const meta = pgTable("meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

/* ------------------------------------------------------------------------------------------------------------------
 * Situation evolution (ported from the benchmark repo, docs/12-situation-evolution.md)
 * ---------------------------------------------------------------------------------------------------------------- */

/** The dated history ACAPS recorded for one risk, as the export holds it (src/data/timeline.json). Source data only. */
export const riskTimelines = pgTable("risk_timelines", {
  riskId: text("risk_id").primaryKey(),
  riskTrend: text("risk_trend"),
  rationaleUpdates: jsonb("rationale_updates").$type<{ date: string | null; text: string }[]>().notNull(),
  triggers: jsonb("triggers")
    .$type<
      {
        id: string;
        title: string | null;
        completionHistory: { date: string; value: number }[];
        trendHistory: { date: string; value: string }[];
        dateEnteredISO: string | null;
        lastUpdateISO: string | null;
      }[]
    >()
    .notNull(),
});

/**
 * Ledger of released panel rounds, written ONCE per (question, round) when a moderator closes the round. Panel series
 * read only this table, never live forecasts, so an open round can never be differenced. A round closed below the
 * release floor keeps its respondent count and a null snapshot: it is withheld, with no numbers.
 */
export const roundReleases = pgTable(
  "round_releases",
  {
    id: serial("id").primaryKey(),
    questionId: integer("question_id").notNull(),
    round: integer("round").notNull(), // 1 = first instinct, 2 = after the second look
    n: integer("n").notNull(),
    closed: boolean("closed").notNull().default(true),
    visibility: text("visibility").notNull().default("panel"),
    at: timestamp("at").notNull().defaultNow(),
    /** { estimate, lo, hi } as FRACTIONS in [0,1]; null when withheld */
    snapshot: jsonb("snapshot").$type<{ estimate: number; lo: number; hi: number } | null>(),
    synthetic: boolean("synthetic").notNull().default(false),
  },
  (t) => [uniqueIndex("round_release_q_r").on(t.questionId, t.round)]
);

/** Analyst links between two questions: a moderator's stated mechanism and rival explanation. Never inferred. */
export const questionLinks = pgTable(
  "question_links",
  {
    id: text("id").primaryKey(),
    fromQuestionId: integer("from_question_id").notNull(),
    toQuestionId: integer("to_question_id").notNull(),
    mechanism: text("mechanism").notNull(),
    rival: text("rival").notNull(),
    by: integer("by").notNull(),
    day: text("day").notNull(),
    version: integer("version").notNull().default(0),
  },
  (t) => [uniqueIndex("question_link_pair").on(t.fromQuestionId, t.toQuestionId)]
);

/** Staff audit trail: who did what to which object. Targets are ids only, never content. */
export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  actorId: integer("actor_id").notNull(),
  action: text("action").notNull(),
  target: text("target").notNull(),
  at: timestamp("at").notNull().defaultNow(),
});
