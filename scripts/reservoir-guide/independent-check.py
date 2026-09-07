"""Independent standard-library audit of raw CDEC CSVs and the dated report.

No TypeScript calculation adapter is imported. This checks source interpretation
and arithmetic; it is not independent human editorial review.
"""
import csv
import hashlib
import html
import json
import re
import sys
from pathlib import Path

edition = Path(sys.argv[1])
output = Path(sys.argv[2])
snapshot = json.loads((edition / "snapshot.json").read_text())
sources = json.loads((edition / "raw/retrieval.json").read_text())["sources"]
for source in sources:
    content = (edition / "raw" / source["file"]).read_bytes()
    assert len(content) == source["bytes"]
    assert hashlib.sha256(content).hexdigest() == source["sha256"]

report = (edition / "raw/reference-capacities-2025.html").read_text()
assert "Ending at midnight - 07/30/2025" in report
report_rows = {}
for row in re.findall(r"<tr\b[^>]*>(.*?)</tr>", report, re.S | re.I):
    cells = [html.unescape(re.sub(r"<[^>]+>", "", cell)).strip()
             for cell in re.findall(r"<td\b[^>]*>(.*?)</td>", row, re.S | re.I)]
    if len(cells) > 4 and cells[1] in ("SHA", "ORO", "FOL", "NML", "DNP", "CLE"):
        report_rows[cells[1]] = (int(cells[2].replace(",", "")), int(cells[4].replace(",", "")))

result = {"method": "Independent Python standard-library CSV/HTML audit; no TypeScript formulas imported", "editionId": snapshot["editionId"], "sourceChecksumsVerified": len(sources), "stations": {}}
total_storage = total_capacity = 0
for station in snapshot["reservoirs"]:
    station_id = station["id"]
    rows = list(csv.DictReader((edition / "raw" / station["sourceFile"]).open(newline="")))
    assert len(rows) == 12784
    assert len({row["DATE TIME"] for row in rows}) == len(rows)
    assert all(row["STATION_ID"] == station_id and row["SENSOR_NUMBER"] == "15" and row["UNITS"] == "AF" and row["DURATION"] == "D" for row in rows)
    eligible = lambda row: row["VALUE"] != "---" and row["DATA_FLAG"].strip() in ("", "r")
    selected = next(row for row in rows if row["DATE TIME"] == "20250730 0000")
    capacity, archived_storage = report_rows[station_id]
    storage = int(selected["VALUE"])
    assert archived_storage == storage
    assert next(c for c in snapshot["capacities"] if c["stationId"] == station_id)["acreFeet"] == capacity
    baseline = [int(row["VALUE"]) for row in rows if 1991 <= int(row["DATE TIME"][:4]) <= 2020 and row["DATE TIME"][4:8] == "0730" and eligible(row)]
    # Conservative documented-regime policy, independently applied.
    if station_id == "ORO":
        assert "storage values starting on 7/1/2024" in (edition / "raw" / station["metadataFile"]).read_text()
        baseline = []
    mean = sum(baseline) / len(baseline) if baseline else None
    lower = sum(value < storage for value in baseline)
    ties = sum(value == storage for value in baseline)
    counts = {"rows": len(rows), "missing": sum(r["VALUE"] == "---" for r in rows), "estimated": sum(r["VALUE"] != "---" and r["DATA_FLAG"].strip() == "e" for r in rows), "revised": sum(r["VALUE"] != "---" and r["DATA_FLAG"].strip() == "r" for r in rows), "eligible": sum(eligible(r) for r in rows)}
    assert counts == snapshot["counts"][station_id]
    leap = [r for r in rows if 1991 <= int(r["DATE TIME"][:4]) <= 2020 and r["DATE TIME"][4:8] == "0229" and eligible(r)]
    above = [r for r in rows if eligible(r) and int(r["VALUE"]) > capacity]
    result["stations"][station_id] = {"counts": counts, "storageAF": storage, "capacityAF": capacity, "percentCapacity": 100 * storage / capacity, "baselineN": len(baseline), "baselineSumAF": sum(baseline), "baselineMeanAF": mean, "percentMean": 100 * storage / mean if mean else None, "lower": lower, "ties": ties, "percentile": 100 * (lower + ties / 2) / len(baseline) if len(baseline) >= 20 else None, "eligibleLeapDates": [r["DATE TIME"][:8] for r in leap], "sourceDateTime": selected["DATE TIME"], "sourceObservationDateTime": selected["OBS DATE"], "aboveJuly2025ReferenceCount": len(above), "maximumReportedAF": max(int(r["VALUE"]) for r in rows if eligible(r))}
    total_storage += storage
    total_capacity += capacity

assert total_storage == 12164697 and total_capacity == 15831403
assert result["stations"]["SHA"]["percentile"] == 50
assert len(result["stations"]["SHA"]["eligibleLeapDates"]) == 7
result["collection"] = {"storageAF": total_storage, "capacityAF": total_capacity, "percent": 100 * total_storage / total_capacity, "unweightedMeanPercent": sum(s["percentCapacity"] for s in result["stations"].values()) / 6, "membership": list(result["stations"])}
result["aboveReferenceInterpretation"] = "These counts compare all historical reported volumes with July 30, 2025 reference capacities, not dated historical capacities. Different capacity/measurement conventions and storage above a nominal reference prevent treating such comparisons as errors or clamping them. Individual source records remain inspectable; this audit does not validate undocumented historical capacity changes."
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps({"verifiedSources": len(sources), "verifiedRows": 76704, "collection": result["collection"], "output": str(output)}))
