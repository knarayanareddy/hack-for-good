import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Lang } from "./content";
import { build, type Payload } from "./payload";
import { advance, type Shape, type ShiftState } from "./shift";

export type Tab = "pitch" | "demo" | "desk";

export interface Settings {
  lang: Lang;
  arm: "doorway" | "banner";
  realistic: boolean;
  fastWave: boolean;
  ladder: boolean[];
}

export interface LocalState extends ShiftState {
  plan: string | null;
}

const DEFAULT_SETTINGS: Settings = { lang: "nl", arm: "doorway", realistic: false, fastWave: true, ladder: [true, true, true, false, false] };
const EMPTY_LOCAL: LocalState = { n: 0, last: 0, seen: [], plan: null };

const K_SETTINGS = "doorway.demo.settings";
const K_LOCAL = "doorway.local.v2";
const K_EVENTS = "doorway.demo.events";

let storageBlocked = false;
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    storageBlocked = true;
    return fallback;
  }
}
function readArr<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    storageBlocked = true;
    return [];
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    storageBlocked = true;
  }
}

interface Ctx {
  settings: Settings;
  setSettings: (p: Partial<Settings>) => void;
  local: LocalState;
  advanceLocal: (variant: string) => void;
  savePlan: (plan: string | null) => void;
  wipeLocal: () => void;
  events: Payload[];
  emit: (raw: Record<string, unknown>) => Payload | null;
  clearEvents: () => void;
  exited: boolean;
  quickExit: () => void;
  returnFromExit: () => void;
  tab: Tab;
  setTab: (t: Tab) => void;
  previewRequest: { shape: Shape; nonce: number } | null;
  requestPreview: (s: Shape) => void;
  storageBlocked: boolean;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [settings, setS] = useState<Settings>(() => read(K_SETTINGS, DEFAULT_SETTINGS));
  const [local, setLocal] = useState<LocalState>(() => read(K_LOCAL, EMPTY_LOCAL));
  const [events, setEvents] = useState<Payload[]>(() => readArr<Payload>(K_EVENTS));
  const [exited, setExited] = useState(false);
  const [tab, setTab] = useState<Tab>("pitch");
  const [previewRequest, setPreview] = useState<Ctx["previewRequest"]>(null);

  useEffect(() => write(K_SETTINGS, settings), [settings]);
  useEffect(() => write(K_LOCAL, local), [local]);
  useEffect(() => write(K_EVENTS, events.slice(-800)), [events]);

  const setSettings = useCallback((p: Partial<Settings>) => setS((s) => ({ ...s, ...p })), []);
  const advanceLocal = useCallback((variant: string) => setLocal((l) => ({ ...advance(l, variant), plan: l.plan })), []);
  const savePlan = useCallback((plan: string | null) => setLocal((l) => ({ ...l, plan })), []);
  const wipeLocal = useCallback(() => {
    setLocal(EMPTY_LOCAL);
    try {
      localStorage.removeItem(K_LOCAL);
    } catch {
      /* nothing to wipe */
    }
  }, []);

  const emit = useCallback((raw: Record<string, unknown>) => {
    const res = build(raw);
    if (!res.ok) {
      console.warn("Counter rejected payload:", res.errors);
      return null;
    }
    setEvents((e) => [...e, res.payload]);
    return res.payload;
  }, []);
  const clearEvents = useCallback(() => setEvents([]), []);

  const quickExit = useCallback(() => setExited(true), []);
  const returnFromExit = useCallback(() => setExited(false), []);
  const requestPreview = useCallback((shape: Shape) => {
    setTab("demo");
    setPreview({ shape, nonce: Date.now() });
    window.scrollTo({ top: 0 });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      settings, setSettings, local, advanceLocal, savePlan, wipeLocal, events, emit, clearEvents,
      exited, quickExit, returnFromExit, tab, setTab, previewRequest, requestPreview, storageBlocked,
    }),
    [settings, setSettings, local, advanceLocal, savePlan, wipeLocal, events, emit, clearEvents, exited, quickExit, returnFromExit, tab, previewRequest, requestPreview],
  );
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("StoreProvider missing");
  return c;
}
