import { useMemo, useState } from "react";
import { ChevronDown, Copy, Check, Phone, MessageCircle, Sprout, Clock } from "lucide-react";
import { COPY, type Lang } from "../../lib/content";
import { ROUTES, lineStatus } from "../../lib/routes";
import { ALink, Btn, Tag } from "../ui";

/**
 * THE HALLWAY — rehearse the call before making it.
 * The dossier's 73.9% (people who found a service and still did not get help) is a drop-off AFTER the click.
 * Nobody designs the ten seconds before contact. This does: answers the three fears up front, hands over a
 * first sentence, and checks (locally) whether the line is open — so we never send someone to a phone that
 * does not ring (Offlimits handles ~2.6 contacts a day; self-help is always offered alongside).
 */
export function Hallway({
  lang,
  onHelp,
  onLeave,
}: {
  lang: Lang;
  onHelp: (routeId: string) => void;
  onLeave: () => void;
}) {
  const t = COPY[lang].hallway;
  const status = useMemo(() => lineStatus(), []);
  const [open, setOpen] = useState<number | null>(0);
  const [copied, setCopied] = useState<number | null>(null);
  const nl = lang === "nl";
  const self = nl ? ROUTES["nl-stoppen"] : ROUTES["fi-redirection"];
  const line = ROUTES["nl-offlimits"];

  const copy = async (i: number) => {
    try {
      await navigator.clipboard.writeText(t.firsts[i]);
    } catch {
      /* clipboard unavailable — the sentence is still on screen to read aloud */
    }
    setCopied(i);
    setTimeout(() => setCopied(null), 1800);
  };

  const Status = (
    <span className={`inline-flex items-center gap-1.5 text-xs ${status.open ? "text-sage" : "text-paper/60"}`}>
      <span className={`h-2 w-2 rounded-full ${status.open ? "bg-sage dw-glow" : "bg-paper/35"}`} />
      {status.open ? t.openNow(status.closesAt) : t.closedNow(status.opensAt)}
    </span>
  );

  return (
    <div className="dw-rise">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-lamp">{t.kicker}</div>
      <h2 className="font-display mt-2 text-2xl font-medium leading-snug text-paper md:text-[28px]">{t.title}</h2>
      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-paper/75">{t.sub}</p>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.05fr_1fr]">
        {/* Left: fears answered, first sentence */}
        <div className="space-y-4">
          <div className="space-y-2">
            {t.faq.map((f, i) => (
              <div key={f.q} className="rounded-xl bg-white/5 ring-1 ring-white/10">
                <button
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-paper"
                  aria-expanded={open === i}
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  {f.q}
                  <ChevronDown className={`h-4 w-4 shrink-0 text-paper/60 transition ${open === i ? "rotate-180" : ""}`} />
                </button>
                {open === i && <p className="px-4 pb-3 text-sm leading-relaxed text-paper/75">{f.a}</p>}
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-lamp/10 p-4 ring-1 ring-lamp/30">
            <p className="text-sm font-medium text-paper">{t.firstTitle}</p>
            <div className="mt-2 space-y-2">
              {t.firsts.map((s, i) => (
                <button
                  key={s}
                  onClick={() => copy(i)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg bg-night/60 px-3 py-2.5 text-left text-sm text-paper ring-1 ring-white/10 transition hover:ring-lamp/60"
                >
                  <span className="font-display italic">“{s}”</span>
                  <span className="flex shrink-0 items-center gap-1 text-[11px] text-lamp">
                    {copied === i ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === i ? t.copied : t.copy}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: channels, honest about opening hours */}
        <div className="space-y-3">
          <ALink
            href={self.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onHelp(self.id)}
            variant={nl && status.open ? "soft" : "lamp"}
            className="w-full !justify-start !py-3.5"
          >
            <Sprout className="h-5 w-5 shrink-0" />
            <span>
              <span className="block">{t.selfhelp}</span>
              <span className="block text-[11px] font-normal opacity-75">{t.selfhelpSub}</span>
            </span>
          </ALink>

          <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-paper/80"><Clock className="h-3.5 w-3.5" /> {line.name}</span>
              {Status}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <ALink
                href={`tel:${line.phone!.replace(/\s/g, "")}`}
                onClick={() => onHelp(line.id)}
                variant={nl && status.open ? "lamp" : "soft"}
                className="!justify-start"
              >
                <Phone className="h-4 w-4 shrink-0" />
                <span>
                  <span className="block leading-tight">{t.phone}</span>
                  <span className="block text-[11px] font-normal opacity-75">{line.phone}</span>
                </span>
              </ALink>
              <ALink href={line.url} target="_blank" rel="noopener noreferrer" onClick={() => onHelp(line.id)} variant="soft" className="!justify-start">
                <MessageCircle className="h-4 w-4 shrink-0" />
                <span className="leading-tight">{t.chat}</span>
              </ALink>
            </div>
            {!status.open && nl && <p className="mt-2 text-xs text-lamp">{t.closedTip}</p>}
            <p className="mt-2 text-[11px] text-paper/50">{t.othersNote}</p>
          </div>

          {(!self.verified || !line.verified) && (
            <div className="flex flex-wrap gap-1.5">
              {!self.verified && <Tag tone="night">route unverified · organiser data flags it</Tag>}
            </div>
          )}
          <Btn variant="ghost" onClick={onLeave} className="!px-2">{t.leave}</Btn>
        </div>
      </div>
    </div>
  );
}
