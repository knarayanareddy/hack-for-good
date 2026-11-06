# CLAUDE.md — Context for AI Coding Assistants

This is the challenge repository for the **UNICRI Stop Before It Starts** challenge at **Hackathon for Good #8** (6-8 November 2026, The Hague).

## What This Repo Is

A hackathon challenge repository — not a software project. It contains starter code, data files, templates and documentation. Participants fork this repo and build their solutions on top of it.

## The Challenge

Build a plug-and-play prevention package that platforms can install in days to warn people searching for child sexual abuse material (CSAM) and guide them to help services. The target is small and mid-sized platforms in the Netherlands (e.g. a 20K-member forum with one part-time moderator), with the design ready to scale to other countries and languages. Three building blocks: the warning message, the route to help, and the plug-and-play integration layer.

## Repo Structure

```
BRIEF.md                    Challenge brief in markdown
SAFETY.md                   Safety rules (non-negotiable)
CONTRIBUTING.md             How teams fork, branch, and contribute
research/
  EVIDENCE.md               Evidence summaries with source links
  PERSONAS.md               User personas (4 profiles + platform)
  READING.md                Full reading list organised by topic
submission/
  TEAM_README_TEMPLATE.md   Template for team submissions
  ONE_PAGER_TEMPLATE.md     Template for rationale and test plan
  PITCH_GUIDE.md            3-minute pitch structure and jury criteria
data/
  help-services.json        Dutch and international help services
  legal-confidentiality.json  Legal consequences per country
  message-blocks.json       Warning message building blocks (NL + EN)
contract/
  PLUGIN_CONTRACT.md        What the platform passes in, what the module returns
  schemas/                  JSON Schema files for all data types
mock-platform/
  index.html                Mock platform home page
  search.html               Search page with trigger detection
  platform.js               Platform logic
  fake-triggers.json        Fake trigger terms (test-trigger-* only)
  style.css                 Platform styles
starter-widget/
  widget.js                 Starter warning widget code
  widget.css                Widget styles
  demo.html                 Standalone widget demo
starter-backend/
  server.js                 Express backend for the module
tools/
  check-safety.js           Safety check script (npm run check)
  generate-traffic.js       Synthetic traffic generator
  dashboard/                Impact dashboard
test/
  check-safety.test.js      Tests for the safety check
integrations/
  discourse-example.md      Example Discourse integration
  wordpress-plugin/         Example WordPress plugin
```

## Safety Rules — CRITICAL

AI assistants working in this repository MUST follow these rules:

1. **No real abuse-related search terms.** The ONLY trigger terms allowed are fake placeholders starting with `test-trigger-` (e.g. `test-trigger-red`, `test-trigger-amber`). Never generate, suggest or include real abuse-related terms.
2. **No real people, chats or user data.** Everything is synthetic.
3. **No tooling that identifies, exposes or tracks individuals.**
4. **Measurement is aggregate only** — counts suppressed below 10.
5. **Do not invent facts.** Phone numbers, URLs, legal articles and research findings must come from verified sources. If unsure, add a `[VERIFY]` marker.
6. **Write message texts in your own words** — do not copy from existing platforms.

Run `npm run check` before every commit. It enforces the trigger-term rule.

## Technical Stack

- **Runtime:** Node 20+
- **Module system:** ES modules (`"type": "module"` in package.json)
- **Frontend:** Vite dev server
- **Backend:** Express
- **Validation:** Ajv (JSON Schema)
- **Tests:** Node built-in test runner (`node --test`)
- **No database** — everything is file-based or in-memory

## Key Commands

```bash
npm run dev                # Start mock platform + backend (Vite + Express via concurrently)
npm run check              # Run safety check
npm test                   # Run tests
npm run generate:traffic   # Generate synthetic traffic data → tools/dashboard/generated/
npm run dashboard          # Open impact dashboard at localhost:3002
```

## Key File Locations

- Safety rules: `SAFETY.md`
- Plug-in contract: `contract/PLUGIN_CONTRACT.md`
- Help services data: `data/help-services.json`
- Message blocks: `data/message-blocks.json`
- Legal/confidentiality data: `data/legal-confidentiality.json`
- Fake triggers: `mock-platform/fake-triggers.json`
- Safety check script: `tools/check-safety.js`
