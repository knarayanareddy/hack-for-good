import { useCallback, useEffect, useRef, useState } from "react";
import { Zap, RotateCcw, Eye, Info, CheckCircle2, ArrowRight } from "lucide-react";
import { Doorway } from "../widget/Doorway";
import { BrowserFrame, ForumHeader, HeldResults, ThreadList } from "./Forum";
import { useStore } from "../../lib/store";
import { SEQUENCE, SHAPES, bucketOf, pick, type Bucket, type Pick, type Shape } from "../../lib/shift";
import type { Outcome, Payload } from "../../lib/payload";
import { Btn, Tag } from "../ui";
import { cn } from "../../utils/cn";

interface Exposure {
  id: number;
  pick: Pick;
  preview: boolean;
  sent: Payload | null;
  resolved: Outcome | null;
}

export function DemoPage() {
  const s = useStore();
  const { lang, arm, realistic, fastWave } = s.settings;
  const [exposure, setExposure] = useState<Exposure | null>(null);
  const [searched, setSearched] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<Payload | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const idRef = useRef(0);
  const nRef = useRef(s.local.n);
  nRef.current = s.local.n;

  const show = useCallback((p: Pick, preview: boolean) => {
    idRef.current += 1;
    setExposure({ id: idRef.current, pick: p, preview, sent: null, resolved: null });
    setNote(null);
  }, []);

  const fire = useCallback(() => {
    setSearched(null);
    setLastSent(null);
    const p: Pick =
      arm === "banner"
        ? { shape: "banner", bucket: bucketOf(s.local.n + 1), state: "CONTROL" }
        : pick(s.local, { realistic, storageBlocked: s.storageBlocked });
    show(p, false);
    if (p.shape !== "quiet") s.advanceLocal(SHAPES[p.shape].variant);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arm, realistic, s.local, s.storageBlocked, show, s.advanceLocal]);

  const preview = useCallback(
    (shape: Shape) => {
      setSearched(null);
      const idx = SEQUENCE.indexOf(shape as (typeof SEQUENCE)[number]) + 1;
      show({ shape, bucket: (idx ? bucketOf(idx) : "1") as Bucket, state: "PREVIEW" }, true);
    },
    [show],
  );

  // jump-in from the Verdict page
  const lastNonce = useRef<number | null>(null);
  useEffect(() => {
    if (s.previewRequest && s.previewRequest.nonce !== lastNonce.current) {
      lastNonce.current = s.previewRequest.nonce;
      preview(s.previewRequest.shape);
    }
  }, [s.previewRequest, preview]);

  const onSearch = (q: string) => {
    if (q.toLowerCase().startsWith("test-trigger-")) fire(); // the PLATFORM decides; Doorway only hears "true"
    else {
      setExposure(null);
      setSearched(q);
    }
  };

  const record = (o: Outcome, route?: string) => {
    if (!exposure) return;
    let sent = exposure.sent;
    if (!exposure.preview && !sent) {
      const meta = SHAPES[exposure.pick.shape];
      sent = s.emit({
        i: "inst_demo0001",
        v: meta.variant,
        f: meta.format,
        t: "search",
        o,
        r: route ?? (lang === "nl" ? "nl-offlimits" : "fi-redirection"),
        e: exposure.pick.bucket,
        b: new Date().getHours(),
      });
      if (sent) setLastSent(sent);
    }
    return sent;
  };

  const onOutcome = (o: Outcome, route?: string) => {
    if (!exposure) return;
    const sent = record(o, route) ?? exposure.sent;
    if (o === "left_page") {
      setExposure(null);
      setNote(lang === "nl" ? "Je ging terug naar het forum. Er is niets over jou bewaard." : "You went back to the forum. Nothing about you was kept.");
    } else {
      setExposure({ ...exposure, sent, resolved: o });
    }
  };
  const onHelp = (route: string) => {
    if (!exposure) return;
    const sent = record("clicked_help", route);
    if (sent && !exposure.sent) setExposure({ ...exposure, sent });
  };

  const resetAll = () => {
    s.wipeLocal();
    setExposure(null);
    setSearched(null);
    setNote(null);
    setLastSent(null);
  };

  const n = s.local.n;
  const nextShape = pick(s.local, { realistic, storageBlocked: s.storageBlocked });
  const resolved = exposure?.resolved;
  const widgetVisible = !!exposure && !resolved;
  const showResultsList = exposure && resolved && resolved !== "left_page";

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_330px] lg:px-6">
      {/* ------------ the mock platform ------------ */}
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
          <Tag tone="sky">Mock platform</Tag>
          <span>
            A Dutch hobby forum with one part-time moderator. The forum decides a search tripped a trigger; Doorway only hears{" "}
            <code className="rounded bg-ink/8 px-1 font-mono text-[11px]">fire({"{"} trigger: "search" {"}"})</code> — never the text.
          </span>
        </div>
        <BrowserFrame>
          <ForumHeader lang={lang} onSearch={onSearch} />
          <div className="min-h-[420px] bg-white">
            {exposure && widgetVisible && exposure.pick.shape !== "quiet" && exposure.pick.shape !== "banner" && exposure.pick.shape !== "door" && (
              <div className="p-3 md:p-4">
                <Doorway key={exposure.id} {...widgetProps(exposure)} />
              </div>
            )}
            {exposure && widgetVisible && ["gate", "fork", "wave", "hallway"].includes(exposure.pick.shape) && <HeldResults lang={lang} />}

            {exposure && widgetVisible && (exposure.pick.shape === "door" || exposure.pick.shape === "quiet" || exposure.pick.shape === "banner") && (
              <>
                <div className="p-3 md:p-4">
                  <Doorway key={exposure.id} {...widgetProps(exposure)} />
                </div>
                <ThreadList lang={lang} query="…" placeholderOnly />
              </>
            )}

            {showResultsList && <ThreadList lang={lang} query="…" placeholderOnly />}
            {!exposure && searched && <ThreadList lang={lang} query={searched} />}
            {!exposure && !searched && (
              <>
                {note && (
                  <div className="dw-rise m-4 flex items-center gap-2 rounded-xl bg-sage-soft px-4 py-3 text-sm text-ink ring-1 ring-sage/30">
                    <CheckCircle2 className="h-4 w-4 text-sage" /> {note}
                  </div>
                )}
                <ThreadList lang={lang} />
              </>
            )}
          </div>
        </BrowserFrame>

        {/* the loop closes: what was recorded */}
        <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-widest text-ink-soft">Counter · what the platform's dashboard receives</div>
            <Btn variant="outline" className="!px-3 !py-1.5 text-xs" onClick={() => s.setTab("desk")}>Open The Desk <ArrowRight className="h-3.5 w-3.5" /></Btn>
          </div>
          {lastSent ? (
            <pre className="mt-2 overflow-x-auto rounded-lg bg-night p-3 font-mono text-[11.5px] leading-5 text-sage">{JSON.stringify(lastSent)}</pre>
          ) : (
            <p className="mt-2 text-sm text-ink-soft">
              Act on a shape (choose, go back, or tap a help link) and the eight-field aggregate appears here. {s.events.length} aggregate events counted in this browser so far — all suppressed below 10 on the Desk.
            </p>
          )}
        </div>
      </div>

      {/* ------------ demo controls (not part of the forum) ------------ */}
      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-2xl bg-night p-4 text-paper shadow-lg">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-lamp"><Zap className="h-3.5 w-3.5" /> Demo controls</div>

          <Btn variant="lamp" className="mt-3 w-full !justify-center !py-3" onClick={fire}>
            Fire a trigger {arm === "doorway" && <span className="text-xs opacity-70">→ {SHAPES[nextShape.shape].label}</span>}
          </Btn>
          <p className="mt-2 text-[11px] leading-snug text-paper/55">
            …or type <code className="rounded bg-white/10 px-1 font-mono">test-trigger-red</code> in the forum search. (Only fake <code className="font-mono">test-trigger-*</code> terms exist anywhere in this build — SAFETY rule 1.)
          </p>

          {/* the Shift timeline */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-paper/60">
              <span>The Shift · exposures on this device</span>
              <span className="font-mono text-paper">{n}</span>
            </div>
            <ol className="grid grid-cols-5 gap-1.5">
              {SEQUENCE.map((sh, i) => {
                const done = n >= i + 1 && !(i === 4 && n < 5);
                const next = arm === "doorway" && nextShape.shape === sh;
                return (
                  <li key={sh}>
                    <button
                      onClick={() => preview(sh)}
                      title={`${SHAPES[sh].label}: “${SHAPES[sh].question}” — click to preview`}
                      className={cn(
                        "w-full rounded-lg px-1 py-2 text-center text-[10.5px] font-medium ring-1 transition",
                        next ? "bg-lamp text-night ring-lamp" : done ? "bg-white/15 text-paper ring-white/20" : "bg-white/5 text-paper/60 ring-white/10 hover:bg-white/10",
                      )}
                    >
                      <div className="font-mono text-[9px] opacity-70">{i + 1}{i === 4 ? "+" : ""}</div>
                      {sh === "door" ? "Door" : SHAPES[sh].label}
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="mt-2 text-[11px] leading-snug text-paper/55">
              {arm === "banner" ? "Control arm: the same static banner every time." : nextShape.shape === "quiet" ? `Next: quiet line — ${nextShape.reason}.` : `Next: ${SHAPES[nextShape.shape].label} — “${SHAPES[nextShape.shape].question}”`}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            <Btn variant="soft" className="!px-2.5 !py-1.5 text-xs" onClick={() => preview("quiet")}><Eye className="h-3.5 w-3.5" /> Quiet</Btn>
            <Btn variant="soft" className="!px-2.5 !py-1.5 text-xs" onClick={() => preview("banner")}><Eye className="h-3.5 w-3.5" /> Banner</Btn>
            <Btn variant="ghost" className="!px-2.5 !py-1.5 text-xs" onClick={resetAll}><RotateCcw className="h-3.5 w-3.5" /> Reset device</Btn>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-line">
          <Row label="Language of the person" hint="Language-first routing: NL → Offlimits, else ReDirection">
            <Seg value={lang} onChange={(v) => s.setSettings({ lang: v })} opts={[["nl", "Nederlands"], ["en", "English"]]} />
          </Row>
          <Row label="Install arm" hint="Randomised per platform install, never per person">
            <Seg value={arm} onChange={(v) => { s.setSettings({ arm: v }); setExposure(null); }} opts={[["doorway", "Doorway"], ["banner", "Banner (control)"]]} />
          </Row>
          <Row label="Re-warning windows" hint="Realistic: 10 min → 6 h → 72 h. Off = every fire advances the Shift.">
            <Seg value={realistic ? "on" : "off"} onChange={(v) => s.setSettings({ realistic: v === "on" })} opts={[["off", "Demo"], ["on", "Realistic"]]} />
          </Row>
          <Row label="Wave length" hint="Real: 90 s. Demo: 15 s.">
            <Seg value={fastWave ? "fast" : "real"} onChange={(v) => s.setSettings({ fastWave: v === "fast" })} opts={[["fast", "15 s"], ["real", "90 s"]]} />
          </Row>
        </div>

        <div className="flex gap-2 rounded-2xl bg-lamp-soft p-3 text-xs leading-relaxed text-lamp-deep ring-1 ring-lamp/30">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Front-end prototype. The Shift and Counter logic are ported from the repo's pure core; nothing is sent over a network. Try a full cycle: fire five times and watch the shape change each time.
          </span>
        </div>
      </aside>
    </div>
  );

  function widgetProps(e: Exposure) {
    return {
      shape: e.pick.shape,
      bucket: e.pick.bucket,
      lang,
      fastWave,
      n: Math.max(n, 1),
      plan: s.local.plan,
      sent: e.sent,
      preview: e.preview,
      onOutcome,
      onHelp,
      onSavePlan: s.savePlan,
      onWipe: s.wipeLocal,
      onQuickExit: s.quickExit,
    };
  }
}

function Row({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-ink">{label}</div>
      <div className="mt-1.5">{children}</div>
      <div className="mt-1 text-[11px] leading-snug text-ink-soft">{hint}</div>
    </div>
  );
}

function Seg<T extends string>({ value, onChange, opts }: { value: T; onChange: (v: T) => void; opts: [T, string][] }) {
  return (
    <div className="inline-flex w-full rounded-lg bg-paper-2 p-0.5 ring-1 ring-line" role="group">
      {opts.map(([v, l]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={cn("flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition", value === v ? "bg-ink text-paper shadow" : "text-ink-soft hover:text-ink")}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
