# Ground Truth Circle — ACAPS Benchmark Prototype

A trusted expert network and forecasting platform built for the **ACAPS Ground Truth Challenge** at **Hackathon for Good #8 (The Hague)**.

Ground Truth Circle enables humanitarian experts, local NGO leaders, and conflict researchers to challenge, enrich, and forecast ACAPS risk analyses over a 6-month horizon with 4 differential levels of anonymity, double-blind neutral second looks, and structured multi-perspective Delphi roundtables.

---

## 🌟 Key Features

1. **Multi-Tier Onboarding & Trust Verification**:
   - Single-use invite circle codes (`CHAD-7QX2`, `SAHEL-4KD9`, `HORN-2MP8`, etc.)
   - 2-hop cryptographic peer vouches with vouchee accountability.
2. **4-Tier Differential Anonymity**:
   - **Sealed**: Zero identifying metadata, pseudonym changes across questions, region auto-stripped if small-cell k < 5.
   - **Alias**: Consistent craft pseudonym (e.g., "Saffron Otter"), track record accumulates without real name.
   - **Confidential**: Real name/org visible only to verified ACAPS moderators; peer-facing alias.
   - **Named**: Real name & organisation visible on the circle Honour Roll with opt-in public stage.
3. **Double-Blind Neutral Second Look**:
   - Experts commit their instinctive forecast first without seeing ACAPS consensus to eliminate anchoring bias.
   - If divergent by ≥25 points, a structured neutral divergence interview prompts for new local information without steering.
4. **Relevance-Gated Dispatch**:
   - In-app notification feed capped at 1–3 asks/week strictly matched to declared countries and themes.
   - Every suppression is logged in the user's transparency receipt.
5. **Dynamic Persona Picking & Profile Persistence**:
   - Full demo switcher across 28 realistic regional personas and the ACAPS Moderator console.
   - Seamless custom persona creation via Pulse and Join flows with instant session persistence in PostgreSQL.
   - Profile editing in **My Space** (`/me`) with retroactive privacy masking and domain expertise updates.
6. **Integrity & Poser Defense**:
   - Tri-factor quarantine: Speed-run detection (<15s), copy-paste detection, and partisan claim-sentiment divergence tracking.
   - Automated Delphi synthesis and moderation dashboard (`/moderator`).

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router, Turbopack, React 19)
- **Database**: PostgreSQL 16
- **ORM**: Drizzle ORM
- **Styling**: Tailwind CSS
- **Authentication**: HMAC-signed session cookies with browser ownership tracking

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 20+
- PostgreSQL running locally or remotely

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your `DATABASE_URL` is set:
```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db"
DEMO_MODE="on"
SESSION_SECRET="gtc-demo-secret-rotate-in-production"
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Push Database Schema & Seed Data
```bash
npx drizzle-kit push
```
The app will automatically seed real ACAPS risk radar data (139 risks), regional expert personas, Delphi questions, and signals on first launch.

### 5. Start Development or Production Server
```bash
# Production build & start
npm run build
npm run start

# Or dev mode
npm run dev
```

App is available at: `http://localhost:3000`

---

## 🗺️ Key Routes

- `/` — Landing page & challenge overview
- `/pulse` — Personalized expert pulse feed (weekly-capped asks)
- `/risks` — ACAPS Risk Radar browser (139 real risks)
- `/risks/[id]` — Risk detail and structured Delphi Roundtable
- `/me` — My Space (profile editing, calibration mirror, privacy meter)
- `/honour` — Circle Honour Roll & top-tier craft track records
- `/moderator` — ACAPS Moderator console, dispatch health & synthesis
- `/join` — 4-step invite onboarding flow
- `/review` — Comprehensive challenge architecture & solution briefing
