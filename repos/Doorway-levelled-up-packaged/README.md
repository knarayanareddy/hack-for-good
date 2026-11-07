# Doorway v2 — A Door, Not a Sign
### *Stop Before It Starts · UNICRI × UAE Ministry of Interior · Hackathon for Good #8*

> **“Everyone on this track built a better sign. We built a door — and made the wall glass.”**

Doorway v2 is a lightweight, privacy-preserving, plug-and-play intervention module that interrupts individuals attempting to search for Child Sexual Abuse Material (CSAM) on public platforms, forums, and communities. Instead of repeating identical punitive warnings that habituate into "wallpaper," Doorway transitions through five psychological shapes (**The Shift**), provides verifiable client-side privacy (**The Glass Door**), and equips platform moderators with differential-privacy reporting (**The Desk**).

---

## ⚡ Quick Start

### Option 1: Instant Standalone (Zero Install)
The production bundle is compiled into a single self-contained file using `vite-plugin-singlefile`.
* Simply double-click or open [`dist/index.html`](dist/index.html) in any modern web browser.
* No Node.js, package managers, or internet connection required.

### Option 2: Run Development Server
```bash
# 1. Install dependencies
npm install

# 2. Launch Vite dev server
npm run dev
# Opens at http://localhost:5173 (or 5174)
```

### Option 3: Production Preview
```bash
npm run build
npm run preview
# Serves the built bundle on http://localhost:4173
```

---

## 🧭 Application Overview

The interactive web demo is focused on direct, distraction-free evaluation across two core surfaces:

### 1. Live Prototype (`tab: demo`)
* **Mock Platform (*Modelspoor.nl*):** A simulated Dutch hobby forum with 20,000 members and one part-time moderator.
* **Search Interception:** Type `test-trigger-red` into the forum search box (under **SAFETY rule 1**, only synthetic test terms exist in this codebase).
* **The Shift:** Test all 5 exposure shapes sequentially, or jump to any stage via the right-hand demo sidebar.
* **Emergency Quick Exit:** Double-tap <kbd>Esc</kbd> at any time from anywhere to instantly switch the page to a neutral Dutch weather report (*Weerbericht*).

### 2. The Desk (`tab: desk`)
* **Operator Console:** The dashboard built specifically for small-platform moderators and trust-and-safety teams.
* **The Open Door Ladder:** 5-rung progressive compliance ladder earning a public, verifiable trust badge for regulators (EU Digital Services Act audit-ready).
* **Watch $k$-Suppression Work:** Real-time demonstration of $k$-anonymity ($k = 10$). Counts remain censored until $\ge 10$ events accumulate.
* **Stepped-Wedge A/B Study Arm:** Platform-level comparison between active Doorway friction vs. standard control banner.

*(Note: The comprehensive design critique and answers to the five judging questions are preserved in [`docs/`](docs/) alongside the architecture blueprints and threat models).*

---

## 🔄 The 5 Triggers & "The Shift"

Traditional warning banners repeat the exact same text every time. Doorway replaces static repetition with a progressive 5-stage state machine:

| Step | Shape | Internal Question | Friction | Key Behavioral Mechanic |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **The Gate** | *"What is this?"* | Results Held | Legal fact (Art. 252) + accident normalization (~50% first encounter by mistake). |
| **2** | **The Fork** | *"Where do I stand?"* | Results Held | Self-triage across 6 honest paths (Accident, Want to stop, Struggling, Other people, Under-18, Work). |
| **3** | **The Wave** | *"What do I do with this urge?"* | Results Held | 15s/90s **Urge Surfing** breathing guide (Adem in / Adem uit) + If–Then coping plan. No scores or badges. |
| **4** | **The Hallway** | *"What happens if I reach out?"* | Results Held | Answers the 3 core fears (anonymity, police, phone fright) + 1-click opening lines + live line hours check. |
| **5+** | **The Open Door** | *"Is it still open?"* | Results Shown | Non-confrontational presence. Unconditional helpline access; optional pass-through to search results. |

---

## 🛡️ Privacy & The 8-Field Counter Whitelist

Doorway enforces **Privacy by Construction**. The host platform calls Doorway with a simple boolean `fire({ trigger: "search" })` — Doorway **never receives search text, user IDs, or IPs**.

When an outcome occurs, telemetry is strictly validated against an 8-field categorical whitelist ([`src/lib/payload.ts`](src/lib/payload.ts)):

```json
{
  "i": "inst_demo0001",  // Platform install ID (never the user)
  "v": "legal-01",       // Copy variant shown
  "f": "gate",           // Shape format (gate, fork, wave, hallway, chat, quiet)
  "t": "search",         // Trigger surface (search, chat, upload) - never query text
  "o": "clicked_help",   // Outcome (clicked_help, left_page, dismissed, continued)
  "r": "nl-offlimits",   // Destination route ID
  "e": "1",              // Exposure bucket (1, 2, 3, 4, 5+ - never exact counts)
  "b": 16                // Local hour of day (0–23 - never an exact timestamp)
}
```

* **The Glass Door (`Glass.tsx`):** On every single screen, clicking **"Wat verstuurt dit?"** opens the live inspection panel showing the raw JSON payload and the local storage state.
* **$k \ge 10$ Suppression:** The reporting API suppresses any aggregate bucket with fewer than 10 events to prevent de-anonymization on small communities.

---

## 📂 Repository File Structure

```
Doorway-levelled-up-packaged/
├── dist/
│   └── index.html               # 389 KB self-contained standalone offline bundle
├── docs/
│   ├── DOORWAY-blueprint.html   # Master 18-section architecture & pitch dossier
│   ├── 01-one-pager.md          # Project executive brief
│   ├── 02-threat-model.md       # Privacy guarantees & attack surfaces
│   ├── 03-the-gap-to-real.md    # Analysis of production implementation hurdles
│   ├── 04-open-verifications.md # Verification checklist & evidence audit
│   ├── 05-adoption-review.md    # Platform adoption incentives & economics
│   ├── unicri.pdf               # UNICRI hackathon challenge brief
│   └── unicri.txt               # Raw text specification
├── src/
│   ├── components/
│   │   ├── demo/                # Mock forum & platform simulator
│   │   ├── desk/                # The Desk operator dashboard & k-suppression
│   │   ├── verdict/             # Design review & judging answers
│   │   ├── widget/              # Doorway shapes (Gate, Fork, Wave, Hallway, Glass)
│   │   └── ui.tsx               # Design system primitives & tokens
│   ├── lib/
│   │   ├── content.ts           # Dual-language NL/EN copy & translations
│   │   ├── payload.ts           # 8-field Counter schema & k-suppression math
│   │   ├── routes.ts            # Offlimits, Helpwanted, & ReDirection routes
│   │   ├── shift.ts             # Anti-habituation scheduler (The Shift)
│   │   └── store.tsx            # Zero-PII React context & local storage
│   ├── utils/
│   │   └── cn.ts                # Tailwind utility merger
│   ├── App.tsx                  # Top-level shell with Esc x2 quick exit
│   ├── index.css                # Typography & theme rules
│   └── main.tsx                 # React DOM mount point
├── index.html                   # Development HTML root
├── package.json                 # Project configuration & scripts
├── tsconfig.json                # TypeScript compiler configuration
├── vite.config.ts               # Vite bundler config with SingleFile plugin
└── README.md                    # Project documentation (this file)
```

---

## 📜 License & Acknowledgements
Built for **Hackathon for Good #8 (The Hague, Nov 2026)** under the challenge sponsored by the **United Nations Interregional Crime and Justice Research Institute (UNICRI)** and the **UAE Ministry of Interior**.
* Reference research dossier: Ó Ciardha et al. (2026), Scanlan et al. (2024), Lucy Faithfull Foundation Best Practice Guide v3.
* All data and search triggers are synthetic.
