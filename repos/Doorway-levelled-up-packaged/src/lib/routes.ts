/**
 * Language-first routes (from the repo's routes.nl.json + organiser help-services.json).
 * Links go DIRECTLY to the service with ?src=doorway — nothing of ours is in the path (threat model R3),
 * and rel="noreferrer" keeps the forum URL out of the service's logs.
 */
import type { Lang } from "./content";

export interface Route {
  id: string; // matches ^[a-z]{2}-[a-z0-9-]{2,}$ so it can travel in field `r`
  name: string;
  kind: "phone" | "chat" | "selfhelp" | "youth";
  url: string;
  phone?: string;
  verified: boolean;
  note: string;
}

export const ROUTES: Record<string, Route> = {
  "nl-offlimits": {
    id: "nl-offlimits",
    name: "Preventielijn van Offlimits",
    kind: "phone",
    phone: "0800 266 64 36",
    url: "https://preventielijn.offlimits.nl/?src=doorway",
    verified: true,
    note: "Organiser data: anonymous, free, phone + chat. Exact police-reporting wording still open (docs/04 V1).",
  },
  "nl-stoppen": {
    id: "nl-stoppen",
    name: "Stoppen is mogelijk",
    kind: "selfhelp",
    url: "https://stoppen-is-mogelijk.eu/?src=doorway",
    verified: true,
    note: "Organiser data: anonymous self-help module.",
  },
  "fi-redirection": {
    id: "fi-redirection",
    name: "ReDirection (Protect Children)",
    kind: "selfhelp",
    url: "https://www.suojellaanlapsia.fi/en/redirection?src=doorway",
    verified: false,
    note: "Six languages. Marked unverified in organiser data — confirm before launch.",
  },
  "nl-helpwanted": {
    id: "nl-helpwanted",
    name: "Helpwanted",
    kind: "youth",
    url: "https://www.helpwanted.nl/?src=doorway",
    verified: false,
    note: "Named in the research dossier as the Dutch online-abuse helpline. NOT in organiser data: verify before any live use.",
  },
};

export const routeFor = (lang: Lang) => ({
  primary: lang === "nl" ? ROUTES["nl-offlimits"] : ROUTES["fi-redirection"],
  selfhelp: lang === "nl" ? ROUTES["nl-stoppen"] : ROUTES["fi-redirection"],
});

/** Offlimits line hours (routes.nl.json): Mo–Fr 09:00–22:00, Sa–Su 09:30–18:00, Amsterdam time. */
export function lineStatus(now = new Date()): { open: boolean; opensAt: string; closesAt: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const weekend = wd === "Sat" || wd === "Sun";
  const openMin = weekend ? 9 * 60 + 30 : 9 * 60;
  const closeMin = weekend ? 18 * 60 : 22 * 60;
  const cur = h * 60 + m;
  return {
    open: cur >= openMin && cur < closeMin,
    opensAt: weekend ? "09:30" : "09:00",
    closesAt: weekend ? "18:00" : "22:00",
  };
}
