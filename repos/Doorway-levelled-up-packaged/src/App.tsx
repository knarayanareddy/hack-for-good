import { useEffect, useRef } from "react";
import { CloudSun, MonitorPlay, LayoutDashboard, Presentation } from "lucide-react";
import { StoreProvider, useStore, type Tab } from "./lib/store";
import { DoorLogo } from "./components/ui";
import { Pitch } from "./components/pitch/Pitch";
import { DemoPage } from "./components/demo/DemoPage";
import { Desk } from "./components/desk/Desk";
import { cn } from "./utils/cn";

const TABS: { id: Tab; label: string; icon: typeof MonitorPlay }[] = [
  { id: "pitch", label: "Pitch deck", icon: Presentation },
  { id: "demo", label: "Live prototype", icon: MonitorPlay },
  { id: "desk", label: "The Desk", icon: LayoutDashboard },
];

function Shell() {
  const { tab, setTab, exited, quickExit, returnFromExit } = useStore();
  const lastEsc = useRef(0);

  // Quick exit: Esc twice within 600 ms, from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const now = Date.now();
      if (now - lastEsc.current < 600) quickExit();
      lastEsc.current = now;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [quickExit]);

  if (exited) return <NeutralPage onReturn={returnFromExit} />;

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5 lg:px-6">
          <button onClick={() => setTab("pitch")} className="flex items-center gap-2.5">
            <DoorLogo className="h-8 w-8" />
            <div className="text-left leading-tight">
              <div className="font-display text-lg font-semibold">Doorway</div>
              <div className="hidden text-[11px] text-ink-soft sm:block">Stop Before It Starts · UNICRI × UAE MoI</div>
            </div>
          </button>
          <nav className="ml-auto flex gap-1 rounded-xl bg-paper-2 p-1 ring-1 ring-line" aria-label="Sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  window.scrollTo({ top: 0 });
                }}
                aria-current={tab === t.id ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                  tab === t.id ? "bg-ink text-paper shadow" : "text-ink-soft hover:text-ink",
                )}
              >
                <t.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.label.split(" ")[0]}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main>
        {tab === "pitch" && <Pitch onGoToDemo={() => setTab("demo")} />}
        {tab === "demo" && <DemoPage />}
        {tab === "desk" && <Desk />}
      </main>
      <footer className="mx-auto max-w-7xl px-4 py-8 text-xs leading-relaxed text-ink-soft lg:px-6">
        Prototype for Hackathon for Good #8. Synthetic data only; no real search terms exist anywhere in this build. Press Esc twice at any time for a quick exit. Open source: <a href="https://github.com/knarayanareddy/doorway" target="_blank" rel="noopener noreferrer" className="font-medium underline">github.com/knarayanareddy/doorway</a>
      </footer>
    </div>
  );
}

function NeutralPage({ onReturn }: { onReturn: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-soft to-white p-8 text-ink">
      <div className="mx-auto max-w-xl pt-16 text-center">
        <CloudSun className="mx-auto h-14 w-14 text-sky" />
        <h1 className="font-display mt-4 text-3xl">Weather Report</h1>
        <p className="mt-2 text-ink-soft">Today partly cloudy, 14°C. Tomorrow dry.</p>
        <div className="mt-12 rounded-xl bg-white p-4 text-left text-xs leading-relaxed text-ink-soft ring-1 ring-line">
          <strong className="text-ink">Demo note.</strong> In production, Quick exit replaces this tab with a neutral site and removes the Doorway page from back-history, so pressing “Back” does not return to it. Here, you can return to the demo:
          <div className="mt-2">
            <button onClick={onReturn} className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-paper">Return to the demo</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
