import { useState } from "react";
import { EyeOff, HardDrive, ScanEye, Trash2, Check, ShieldCheck } from "lucide-react";
import { COPY, type Lang } from "../../lib/content";
import { FIELDS, FIELD_EXPLAINED, type Payload } from "../../lib/payload";

/**
 * THE GLASS DOOR — the person can audit the anonymity claim at the exact moment they have to
 * decide whether to trust it. Shows the real object, field by field, what never leaves,
 * what stays local (with a wipe button), and how to verify it independently.
 */
export function Glass({
  lang,
  draft,
  sent,
  n,
  plan,
  onWipe,
}: {
  lang: Lang;
  draft: Record<string, string | number>;
  sent: Payload | null;
  n: number;
  plan: string | null;
  onWipe: () => void;
}) {
  const t = COPY[lang].glassPanel;
  const [wiped, setWiped] = useState(false);
  const data: Record<string, string | number> = sent ? { ...sent } : draft;

  return (
    <div className="dw-rise rounded-xl bg-black/30 p-4 text-paper ring-1 ring-white/10" role="region" aria-label={t.title}>
      <div className="flex items-center gap-2 text-lamp">
        <ScanEye className="h-4 w-4" />
        <h3 className="font-display text-base font-medium">{t.title}</h3>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-paper/70">{t.lead}</p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-sage">
            <ShieldCheck className="h-3.5 w-3.5" /> {t.leaves}
          </div>
          <div className="rounded-lg bg-black/40 p-3 font-mono text-[11.5px] leading-6">
            <span className="text-paper/40">{"{"}</span>
            {FIELDS.map((k) => {
              const pending = !sent && (k === "o" || k === "r");
              return (
                <div key={k} className="group pl-3">
                  <span className="text-lamp">"{k}"</span>
                  <span className="text-paper/40">: </span>
                  <span className={pending ? "italic text-paper/45" : "text-sage"}>
                    {pending ? t.pending : typeof data[k] === "number" ? data[k] : `"${data[k]}"`}
                  </span>
                  <span className="text-paper/40">,</span>
                  <div className="-mt-1 pb-1 font-sans text-[10.5px] leading-snug text-paper/50">↳ {FIELD_EXPLAINED[k][lang]}</div>
                </div>
              );
            })}
            <span className="text-paper/40">{"}"}</span>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-paper/55">{t.protoNote}</p>
        </div>

        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-clay">
              <EyeOff className="h-3.5 w-3.5" /> <span className="text-[#e58f78]">{t.never}</span>
            </div>
            <ul className="space-y-1 text-xs text-paper/75">
              {t.neverList.map((x) => (
                <li key={x} className="flex gap-2">
                  <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#e58f78]" />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-sky">
              <HardDrive className="h-3.5 w-3.5" /> <span className="text-[#7cc0dd]">{t.stays}</span>
            </div>
            <ul className="space-y-1 text-xs text-paper/75">
              {t.staysItems(n, plan).map((x) => (
                <li key={x}>• {x}</li>
              ))}
            </ul>
            <button
              onClick={() => {
                onWipe();
                setWiped(true);
              }}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-paper ring-1 ring-white/10 transition hover:bg-white/15"
            >
              {wiped ? <Check className="h-3.5 w-3.5 text-sage" /> : <Trash2 className="h-3.5 w-3.5" />}
              {wiped ? t.wiped : t.wipe}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-white/10 pt-3">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-paper/55">{t.verify}</div>
        <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs text-paper/70">
          {t.verifySteps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p className="mt-2 text-[11px] italic text-paper/45">{t.copyStatus}</p>
      </div>
    </div>
  );
}
