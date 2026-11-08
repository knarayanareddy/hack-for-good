import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, ArrowLeft, DoorOpen, LogOut, X, Phone, ScanEye, Users, Baby, Briefcase, HeartHandshake, Hand, Compass, Sprout } from "lucide-react";
import { COPY, type Lang } from "../../lib/content";
import type { Outcome, Payload } from "../../lib/payload";
import { ROUTES, lineStatus, routeFor } from "../../lib/routes";
import { SHAPES, SEQUENCE, type Bucket, type Shape } from "../../lib/shift";
import { ALink, Btn, DoorLogo, Tag } from "../ui";
import { Glass } from "./Glass";
import { Hallway } from "./Hallway";
import { Wave } from "./Wave";

type View = "gate" | "fork" | "wave" | "hallway" | "door" | "accident" | "work" | "young" | "other";

export interface DoorwayProps {
  shape: Shape;
  bucket: Bucket;
  lang: Lang;
  fastWave: boolean;
  n: number;
  plan: string | null;
  sent: Payload | null;
  preview: boolean;
  onOutcome: (o: Outcome, route?: string) => void;
  onHelp: (routeId: string) => void;
  onSavePlan: (p: string | null) => void;
  onWipe: () => void;
  onQuickExit: () => void;
}

export function Doorway(props: DoorwayProps) {
  if (props.shape === "quiet") return <Quiet {...props} />;
  if (props.shape === "banner") return <Banner {...props} />;
  if (props.shape === "door") return <OpenDoor {...props} />;
  return <Shell {...props} />;
}

/* ---------- shared shell for the four results-holding shapes ---------- */
function Shell(p: DoorwayProps) {
  const t = COPY[p.lang];
  const [view, setView] = useState<View>(p.shape as View);
  const [glass, setGlass] = useState(false);
  const idx = SEQUENCE.indexOf(p.shape as (typeof SEQUENCE)[number]) + 1;

  const draft = {
    i: "inst_demo0001",
    v: SHAPES[p.shape].variant,
    f: SHAPES[p.shape].format,
    t: "search",
    o: "",
    r: "",
    e: p.bucket,
    b: new Date().getHours(),
  };

  let body: ReactNode;
  switch (view) {
    case "gate":
      body = <Gate lang={p.lang} onLeave={() => p.onOutcome("left_page")} onHelp={() => setView("hallway")} onContinue={() => p.onOutcome("continued")} />;
      break;
    case "fork":
      body = <Fork lang={p.lang} go={setView} />;
      break;
    case "wave":
      body = (
        <Wave lang={p.lang} fast={p.fastWave} initialPlan={p.plan} onSavePlan={p.onSavePlan} onTalk={() => setView("hallway")} onLeave={() => p.onOutcome("left_page")} />
      );
      break;
    case "hallway":
      body = <Hallway lang={p.lang} onHelp={p.onHelp} onLeave={() => p.onOutcome("left_page")} />;
      break;
    case "door":
      body = <DoorView lang={p.lang} onHelp={p.onHelp} onContinue={() => p.onOutcome("continued")} />;
      break;
    case "accident":
      body = <Info lang={p.lang} title={t.fork.accidentTitle} text={t.fork.accidentBody}>
        <Btn variant="lamp" onClick={() => p.onOutcome("left_page")}>{t.fork.accidentBack}</Btn>
        <Btn variant="soft" onClick={() => setView("hallway")}>{t.fork.accidentHelp}</Btn>
      </Info>;
      break;
    case "work":
      body = <Info lang={p.lang} title={t.fork.workTitle} text={t.fork.workBody}>
        <Btn variant="lamp" onClick={() => p.onOutcome("continued")}>{t.fork.workGo}</Btn>
      </Info>;
      break;
    case "young":
      body = <Info lang={p.lang} title={t.fork.youngTitle} text={t.fork.youngBody}>
        <ALink variant="lamp" href={ROUTES["nl-helpwanted"].url} target="_blank" rel="noopener noreferrer" onClick={() => p.onHelp("nl-helpwanted")}>{t.fork.youngLink}</ALink>
        <Btn variant="soft" onClick={() => p.onOutcome("left_page")}>{t.fork.youngBack}</Btn>
      </Info>;
      break;
    case "other":
      body = <Info lang={p.lang} title={t.fork.otherTitle} text={t.fork.otherBody}>
        <Btn variant="lamp" onClick={() => setView("hallway")}>{t.fork.otherGo} <ArrowRight className="h-4 w-4" /></Btn>
      </Info>;
      break;
    default:
      body = null;
  }

  const showBack = view !== p.shape;

  return (
    <section
      className="dw-rise relative overflow-hidden rounded-2xl bg-night text-paper shadow-[0_30px_80px_-30px_rgba(14,26,36,0.9)] ring-1 ring-white/10"
      aria-label="Doorway"
    >
      <div className="pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full bg-lamp/15 blur-3xl" />
      {/* header */}
      <div className="relative flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 md:px-6">
        <div className="flex items-center gap-2.5">
          <DoorLogo className="h-6 w-6" />
          <span className="font-display text-base font-medium">{t.chrome.brand}</span>
          {idx > 0 && (
            <Tag tone="night" className="hidden sm:inline-flex">
              {p.preview ? "preview · " : ""}
              {SHAPES[p.shape].label} · {idx}/5
            </Tag>
          )}
        </div>
        <button
          onClick={p.onQuickExit}
          title={t.chrome.quickExitHint}
          className="inline-flex items-center gap-1.5 rounded-lg bg-clay px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#c9654b]"
        >
          <LogOut className="h-3.5 w-3.5" /> {t.chrome.quickExit}
        </button>
      </div>

      <div className="relative px-4 py-5 md:px-6 md:py-6">
        {showBack && (
          <button onClick={() => setView(p.shape as View)} className="mb-3 inline-flex items-center gap-1 text-xs text-paper/60 hover:text-paper">
            <ArrowLeft className="h-3.5 w-3.5" /> {t.chrome.back}
          </button>
        )}
        {body}
      </div>

      {/* footer: the Glass Door */}
      <div className="relative border-t border-white/10 px-4 py-3 md:px-6">
        <button
          onClick={() => setGlass((g) => !g)}
          aria-expanded={glass}
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-medium text-lamp transition hover:bg-lamp/10"
        >
          <ScanEye className="h-4 w-4" /> {t.chrome.glass}
        </button>
        <span className="ml-2 text-[11px] text-paper/40">{t.chrome.heldNote}</span>
        {glass && (
          <div className="mt-3">
            <Glass lang={p.lang} draft={draft} sent={p.sent} n={p.n} plan={p.plan} onWipe={p.onWipe} />
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- views ---------- */
function Heading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-lamp">{kicker}</div>
      <h2 className="font-display mt-2 text-2xl font-medium leading-snug text-paper md:text-[28px]">{title}</h2>
    </>
  );
}

function Gate({ lang, onLeave, onHelp, onContinue }: { lang: Lang; onLeave: () => void; onHelp: () => void; onContinue: () => void }) {
  const t = COPY[lang].gate;
  const [wait, setWait] = useState(5);
  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);
  return (
    <div className="dw-rise">
      <Heading kicker={t.kicker} title={t.title} />
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-paper/85">{t.body}</p>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-paper/60">{t.accident}</p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Btn variant="lamp" onClick={onLeave}>{t.back}</Btn>
        <Btn variant="soft" onClick={onHelp}>{t.help} <ArrowRight className="h-4 w-4" /></Btn>
        <Btn variant="ghost" disabled={wait > 0} onClick={onContinue} className="ml-auto text-paper/55">
          {wait > 0 ? t.mistakeWait(wait) : t.mistake}
        </Btn>
      </div>
    </div>
  );
}

const forkIcons = { accident: Hand, stop: HeartHandshake, cantstop: Compass, other: Users, young: Baby, work: Briefcase } as const;

function Fork({ lang, go }: { lang: Lang; go: (v: View) => void }) {
  const t = COPY[lang].fork;
  const dest: Record<keyof typeof t.options, View> = { accident: "accident", stop: "hallway", cantstop: "door", other: "other", young: "young", work: "work" };
  return (
    <div className="dw-rise">
      <Heading kicker={t.kicker} title={t.title} />
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-paper/65">{t.sub}</p>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {(Object.keys(t.options) as (keyof typeof t.options)[]).map((k) => {
          const Icon = forkIcons[k];
          return (
            <button
              key={k}
              onClick={() => go(dest[k])}
              className="group flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3.5 text-left text-[15px] text-paper ring-1 ring-white/10 transition hover:bg-lamp/10 hover:ring-lamp/50"
            >
              <Icon className="h-5 w-5 shrink-0 text-lamp" />
              <span className="flex-1">{t.options[k]}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-paper/30 transition group-hover:translate-x-0.5 group-hover:text-lamp" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Info({ lang, title, text, children }: { lang: Lang; title: string; text: string; children: ReactNode }) {
  void lang;
  return (
    <div className="dw-rise">
      <h2 className="font-display text-2xl font-medium leading-snug text-paper md:text-[28px]">{title}</h2>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-paper/80">{text}</p>
      <div className="mt-5 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function DoorView({
  lang,
  onHelp,
  onContinue,
}: {
  lang: Lang;
  onHelp: (routeId: string) => void;
  onContinue: () => void;
}) {
  const t = COPY[lang];
  const status = lineStatus();
  const { selfhelp } = routeFor(lang);
  const nl = lang === "nl";
  const line = ROUTES["nl-offlimits"];
  const title = t.door.titles[2] || t.door.titles[0];

  return (
    <div className="dw-rise">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-lamp/15 text-lamp">
          <DoorOpen className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-lamp">{t.door.kicker}</div>
          <h2 className="font-display mt-1 text-2xl font-medium leading-snug text-paper">{title}</h2>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-paper/75">{t.door.body}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-xl bg-white/5 p-4 ring-1 ring-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-medium text-paper">{t.hallway.selfhelp}</div>
          <div className="text-xs text-paper/60">{t.hallway.selfhelpSub}</div>
        </div>
        <ALink
          variant="lamp"
          href={selfhelp.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onHelp(selfhelp.id)}
          className="!py-3 shrink-0"
        >
          <Sprout className="h-4 w-4" /> {t.hallway.selfhelp} <ArrowRight className="h-4 w-4" />
        </ALink>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {nl && status.open ? (
          <>
            <ALink variant="soft" href={`tel:${line.phone!.replace(/\s/g, "")}`} onClick={() => onHelp(line.id)} className="text-xs">
              <Phone className="h-3.5 w-3.5" /> {t.door.callOpen} {line.phone}
            </ALink>
            <ALink variant="ghost" href={line.url} target="_blank" rel="noopener noreferrer" onClick={() => onHelp(line.id)} className="text-xs">
              {t.door.chat}
            </ALink>
          </>
        ) : nl ? (
          <span className="text-xs text-paper/50">{t.door.closed(status.opensAt)}</span>
        ) : null}
        <Btn variant="ghost" onClick={onContinue} className="ml-auto text-paper/55">
          {t.door.carryOn}
        </Btn>
      </div>
    </div>
  );
}

/* ---------- shape 5: the open door (presence, not pressure) ---------- */
function OpenDoor(p: DoorwayProps) {
  const t = COPY[p.lang];
  const status = lineStatus();
  const { selfhelp } = routeFor(p.lang);
  const nl = p.lang === "nl";
  const line = ROUTES["nl-offlimits"];
  const title = t.door.titles[Math.max(0, p.n - 5) % t.door.titles.length];
  const [glass, setGlass] = useState(false);
  return (
    <section className="dw-rise relative overflow-hidden rounded-2xl bg-night text-paper shadow-xl ring-1 ring-white/10" aria-label="Doorway">
      <div className="pointer-events-none absolute -left-10 top-0 h-full w-1/2 bg-gradient-to-r from-lamp/20 to-transparent" />
      <div className="relative flex flex-col gap-4 p-5 md:flex-row md:items-center md:p-6">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-lamp/15 text-lamp">
          <DoorOpen className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-lamp">{t.door.kicker}</div>
          <h2 className="font-display mt-1 text-xl font-medium leading-snug md:text-2xl">{title}</h2>
          <p className="mt-1 text-sm text-paper/70">{t.door.body}</p>
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          <ALink variant="lamp" href={selfhelp.url} target="_blank" rel="noopener noreferrer" onClick={() => p.onHelp(selfhelp.id)} className="!py-3">
            <Sprout className="h-4 w-4" /> {t.hallway.selfhelp} <ArrowRight className="h-4 w-4" />
          </ALink>
          {nl && status.open && (
            <div className="flex items-center gap-2">
              <ALink variant="soft" href={`tel:${line.phone!.replace(/\s/g, "")}`} onClick={() => p.onHelp(line.id)} className="!py-1 text-xs">
                <Phone className="h-3 w-3" /> {t.door.callOpen} {line.phone}
              </ALink>
              <ALink variant="ghost" href={line.url} target="_blank" rel="noopener noreferrer" onClick={() => p.onHelp(line.id)} className="!py-1 text-xs">{t.door.chat}</ALink>
            </div>
          )}
        </div>
      </div>
      <div className="relative flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-5 py-2.5 md:px-6">
        <button onClick={() => setGlass((g) => !g)} aria-expanded={glass} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-lamp hover:bg-lamp/10">
          <ScanEye className="h-4 w-4" /> {t.chrome.glass}
        </button>
        <div className="flex items-center gap-2">
          <Btn variant="ghost" className="!py-1 text-xs" onClick={() => p.onOutcome("dismissed")}>{t.door.carryOn}</Btn>
          <button onClick={p.onQuickExit} className="inline-flex items-center gap-1.5 rounded-lg bg-clay px-2.5 py-1 text-[11px] font-semibold text-white"><LogOut className="h-3 w-3" /> {t.chrome.quickExit}</button>
        </div>
      </div>
      {glass && (
        <div className="relative px-5 pb-5 md:px-6">
          <Glass
            lang={p.lang}
            draft={{ i: "inst_demo0001", v: SHAPES.door.variant, f: SHAPES.door.format, t: "search", o: "", r: "", e: p.bucket, b: new Date().getHours() }}
            sent={p.sent}
            n={p.n}
            plan={p.plan}
            onWipe={p.onWipe}
          />
        </div>
      )}
    </section>
  );
}

/* ---------- quiet line: inside the re-warning window ---------- */
function Quiet(p: DoorwayProps) {
  const t = COPY[p.lang].quiet;
  const { primary } = routeFor(p.lang);
  return (
    <div className="dw-rise flex flex-wrap items-center gap-3 rounded-xl bg-night px-4 py-2.5 text-sm text-paper ring-1 ring-white/10">
      <DoorLogo className="h-5 w-5" />
      <span className="flex-1 text-paper/85">{t.text}</span>
      <a href={primary.url} target="_blank" rel="noopener noreferrer" onClick={() => p.onHelp(primary.id)} className="font-medium text-lamp underline-offset-4 hover:underline">
        {t.link} →
      </a>
    </div>
  );
}

/* ---------- control arm: what everyone else ships — a banner beside the results ---------- */
function Banner(p: DoorwayProps) {
  const t = COPY[p.lang].banner;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <span className="flex-1">{t.text} <a href="https://offlimits.nl/?src=doorway" target="_blank" rel="noopener noreferrer" onClick={() => p.onHelp("nl-offlimits")} className="font-medium underline">{t.link}</a></span>
      <button onClick={() => p.onOutcome("dismissed")} aria-label={t.dismiss} className="rounded p-1 hover:bg-amber-100"><X className="h-4 w-4" /></button>
    </div>
  );
}
