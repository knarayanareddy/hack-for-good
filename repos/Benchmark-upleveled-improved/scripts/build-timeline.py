#!/usr/bin/env python3
"""Build src/data/timeline.json from the benchmark repo's data/risk-radar.json (the ingest.py output that carries the
dated history fields). Only what the ACAPS export holds is copied: nothing is inferred, no duration is computed.

Usage: python3 scripts/build-timeline.py /path/to/benchmark/data/risk-radar.json
"""
import json, sys

src = sys.argv[1] if len(sys.argv) > 1 else "../benchmark/data/risk-radar.json"
out = {}
for r in json.load(open(src)):
    triggers = []
    for t in r.get("triggerList", []):
        ch, th = t.get("completionHistory") or [], t.get("trendHistory") or []
        if not ch and not th:
            continue
        triggers.append({
            "id": t["triggerId"], "title": t.get("title") or None,
            "completionHistory": ch, "trendHistory": th,
            "dateEnteredISO": t.get("dateEnteredISO") or None, "lastUpdateISO": t.get("lastUpdateISO") or None,
        })
    ru = r.get("rationaleUpdates") or []
    if not triggers and not ru and not r.get("riskTrend"):
        continue
    out[r["id"]] = {"riskTrend": r.get("riskTrend") or None, "rationaleUpdates": ru, "triggers": triggers}
json.dump(out, open("src/data/timeline.json", "w"), ensure_ascii=False, indent=1)
print(len(out), "risks with timeline data")
