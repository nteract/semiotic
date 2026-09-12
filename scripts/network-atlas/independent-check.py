#!/usr/bin/env python3
"""Independent standard-library audit of Network Atlas reference fixtures.

No TypeScript calculation adapter is imported. This checks fixture arithmetic
and small-graph counterexamples; it does not implement or benchmark charts.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

FIXTURES = Path(__file__).resolve().parent / "fixtures"
EXPECTED_PATH = Path(__file__).resolve().parent / "expected/independent-check-results.json"


def load(name: str) -> dict:
    path = FIXTURES / name
    return json.loads(path.read_text())


def bps(part: int, whole: int) -> int:
    if whole == 0 or (part * 10000) % whole != 0:
        raise AssertionError(f"non-integral basis points: {part}/{whole}")
    return (part * 10000) // whole


def edge_ids(graph: dict) -> list[str]:
    return [edge["id"] for edge in graph["edges"]]


def has_walk(edges: list[dict], path: list[str]) -> bool:
    remaining = {(edge["source"], edge["target"]) for edge in edges}
    for src, dst in zip(path, path[1:]):
        if (src, dst) not in remaining:
            return False
    return True


def disjoint_union(left: list[str], right: list[str], original: list[str]) -> None:
    left_set, right_set, original_set = set(left), set(right), set(original)
    assert left_set.isdisjoint(right_set), "backbone and residual overlap"
    assert left_set | right_set == original_set, "original != backbone ⊎ residual"
    assert len(left) == len(left_set) and len(right) == len(right_set)
    assert len(original) == len(original_set)


def check_checkout(data: dict) -> dict:
    mobile = data["inputs"]["mobile"]
    desktop = data["inputs"]["desktop"]
    expected = data["expected"]
    mc, mt = mobile["control"], mobile["treatment"]
    dc, dt = desktop["control"], desktop["treatment"]
    results = {
        "mobileControlLoopBps": bps(mc["loopUsers"], mc["assigned"]),
        "mobileTreatmentLoopBps": bps(mt["loopUsers"], mt["assigned"]),
        "mobileControlConversionBps": bps(mc["purchases"], mc["assigned"]),
        "mobileTreatmentConversionBps": bps(mt["purchases"], mt["assigned"]),
        "overallControlConversionBps": bps(
            mc["purchases"] + dc["purchases"], mc["assigned"] + dc["assigned"]
        ),
        "overallTreatmentConversionBps": bps(
            mt["purchases"] + dt["purchases"], mt["assigned"] + dt["assigned"]
        ),
        "denominator": "assigned",
    }
    for key, value in results.items():
        assert value == expected[key], f"checkout {key}: {value} != {expected[key]}"
    return results


def check_search(data: dict) -> dict:
    inp, expected = data["inputs"], data["expected"]
    non_loop = inp["completedSessions"] - inp["loopingSessions"]
    results = {
        "loopingPurchaseBps": bps(inp["loopingPurchases"], inp["loopingSessions"]),
        "nonLoopingPurchaseBps": bps(inp["nonLoopingPurchases"], non_loop),
        "overallPurchaseBps": bps(
            inp["loopingPurchases"] + inp["nonLoopingPurchases"],
            inp["completedSessions"],
        ),
        "catalogEligibleLoopSessions": inp["catalogEligibleLoopSessions"],
    }
    for key, value in results.items():
        assert value == expected[key], f"search {key}: {value} != {expected[key]}"
    return results


def check_hot_partition(data: dict) -> dict:
    inp, expected = data["inputs"], data["expected"]
    installed = inp["partitionCount"] * inp["capacityPerPartition"]
    other = inp["arrivalsPerSecond"] - inp["hotPartitionArrivalsPerSecond"]
    queued = (inp["arrivalsPerSecond"] - inp["completionsPerSecond"]) * inp["windowSeconds"]
    results = {
        "installedCapacity": installed,
        "otherPartitionsArrivalsPerSecond": other,
        "queuedPerMinute": queued,
    }
    for key, value in results.items():
        assert value == expected[key], f"hot-partition {key}: {value} != {expected[key]}"
    return results


def check_retry(data: dict) -> dict:
    inp, expected = data["inputs"], data["expected"]
    roots_plus_retries = inp["rootsPerSecond"] + inp["retriesPerSecond"]
    assert roots_plus_retries == inp["attemptsPerSecond"]
    assert roots_plus_retries == expected["rootsPlusRetries"]
    assert inp["attemptsPerSecond"] == 3 * inp["rootsPerSecond"]
    assert inp["rootsPerSecond"] != inp["attemptsPerSecond"]
    assert expected["rootCountDoesNotTriple"] is True
    assert expected["queueGrowthEstablished"] is False
    return {
        "rootsPlusRetries": roots_plus_retries,
        "rootCountDoesNotTriple": True,
        "queueGrowthEstablished": False,
    }


def check_supplier(data: dict) -> dict:
    inp, expected = data["inputs"], data["expected"]
    exposed = sum(inp["suppliers"][name] for name in inp["dependsOnX"])
    remaining = inp["cExpandableTo"]
    demand = inp["demandPerWeek"]
    shortfall = demand - remaining
    needed = (demand * inp["outputRetentionTargetBps"]) // 10000
    additional = needed - remaining
    results = {
        "exposedAllocation": exposed,
        "exposureBps": bps(exposed, demand),
        "remainingUnderXOutage": remaining,
        "shortfallBps": bps(shortfall, demand),
        "additionalIndependentUnitsPerWeek": additional,
        "dominance": expected["dominance"],
    }
    for key in (
        "exposedAllocation",
        "exposureBps",
        "remainingUnderXOutage",
        "shortfallBps",
        "additionalIndependentUnitsPerWeek",
    ):
        assert results[key] == expected[key], f"supplier {key}"
    assert "product" in expected["dominance"]["doesNotDominate"]["X"]
    assert expected["dominance"]["dominates"]["X"] == ["A", "B"]
    return results


def check_etl_kernel(data: dict) -> dict:
    expected = data["expected"]
    values = {
        (row["measureId"], row["subjectId"]): row["value"]
        for row in data["source"]["measureValues"]
    }
    admitted = values[("work-items", "ingest")]
    completed = values[("completed", "load")]
    dead = values[("work-items", "dead_letter")]
    queued = values[("queued", "write_hot")]
    assert admitted == expected["admitted"]
    assert completed == expected["completedAtLoad"]
    assert dead == expected["deadLetter"]
    assert queued == expected["queuedHot"]
    assert completed + dead + queued == admitted
    assert list(expected["conservation"]) == [completed, dead, queued]
    original = edge_ids(data["source"])
    disjoint_union(expected["backboneEdgeIds"], expected["residualEdgeIds"], original)
    unknown = [
        node["id"]
        for node in data["source"]["nodes"]
        if node.get("completeness") == "unknown"
    ]
    assert unknown == expected["unknownNodeIds"]
    return {
        "admitted": admitted,
        "conservation": [completed, dead, queued],
        "backboneEdgeIds": expected["backboneEdgeIds"],
        "residualEdgeIds": expected["residualEdgeIds"],
        "unknownNodeIds": unknown,
    }


def check_ghost(data: dict) -> dict:
    expected = data["expected"]
    supported = {tuple(path) for path in expected["supportedRoutes"]}
    for path in expected["unsupportedRoutes"]:
        assert tuple(path) not in supported
    for path in expected["graphWalkExists"]:
        assert has_walk(data["source"]["edges"], path)
    occurrence_paths = {tuple(row["nodePath"]) for row in data["source"]["occurrences"]}
    assert occurrence_paths == supported
    return {"unsupportedRejected": True, "graphWalkNotAJourney": True}


def check_overlap(data: dict) -> dict:
    entities = {row["entityId"] for row in data["source"]["occurrences"]}
    assert len(entities) == data["expected"]["uniqueEntities"] == 1
    return {"uniqueEntities": 1, "overlappingTemplates": data["expected"]["overlappingTemplates"]}


def check_missing_prehistory(data: dict) -> dict:
    flagged = [row for row in data["source"]["occurrences"] if row.get("missingPrehistory")]
    assert flagged, "missing-prehistory occurrence required"
    assert data["expected"]["motifStatus"] == "incomplete"
    assert data["expected"]["notZeroMatches"] is True
    return {"motifStatus": "incomplete"}


def check_edge_coverage(data: dict) -> dict:
    expected = data["expected"]
    original = edge_ids(data["source"])
    assert original == expected["originalEdgeIds"]
    disjoint_union(expected["backboneEdgeIds"], expected["residualEdgeIds"], original)
    node_ids = [node["id"] for node in data["source"]["nodes"]]
    assert "__proto__" in node_ids
    assert "constructor" in original
    return {
        "originalEdgeIds": original,
        "backboneEdgeIds": expected["backboneEdgeIds"],
        "residualEdgeIds": expected["residualEdgeIds"],
    }


def check_zero_capacity_bypass(data: dict) -> dict:
    expected = data["expected"]
    assert data["inputs"]["bypass"]["usableCapacity"] == 0
    assert expected["structural"]["XDominatesAWithoutBypass"] is True
    assert expected["structural"]["XDominatesAWithBypass"] is False
    assert expected["capacityShortfallBpsUnchanged"] == 7000
    return expected["structural"] | {
        "capacityShortfallBpsUnchanged": 7000
    }


def check_and_prerequisites(data: dict) -> dict:
    expected = data["expected"]
    assert data["inputs"]["ordinaryPathThroughBIfALost"] is True
    assert expected["completionIfALost"] is False
    assert expected["dominatorReachabilityIsNotCompletion"] is True
    return expected


def check_permutation(data: dict) -> dict:
    assert data["baseFixture"] == "etl-snapshot-v1.json"
    assert "main-transport" in data["policies"]
    assert "tree-only" in data["policies"]
    return {"invariant": data["expected"]["invariant"]}


def main() -> int:
    write = "--write" in sys.argv
    results = {
        "method": "Independent Python standard-library fixture audit; no TypeScript formulas imported",
        "synthetic": True,
        "fixtures": {
            "checkout-ab-v1": check_checkout(load("checkout-ab-v1.json")),
            "search-no-result-v1": check_search(load("search-no-result-v1.json")),
            "etl-hot-partition-v1": check_hot_partition(load("etl-hot-partition-v1.json")),
            "retry-incident-v1": check_retry(load("retry-incident-v1.json")),
            "supplier-redundancy-v1": check_supplier(load("supplier-redundancy-v1.json")),
            "etl-snapshot-v1": check_etl_kernel(load("etl-snapshot-v1.json")),
            "ghost-route": check_ghost(load("ghost-route.json")),
            "overlap-entity": check_overlap(load("overlap-entity.json")),
            "missing-prehistory": check_missing_prehistory(load("missing-prehistory.json")),
            "edge-coverage": check_edge_coverage(load("edge-coverage.json")),
            "zero-capacity-bypass": check_zero_capacity_bypass(load("zero-capacity-bypass.json")),
            "and-prerequisites": check_and_prerequisites(load("and-prerequisites.json")),
            "display-backbone-permutation": check_permutation(
                load("display-backbone-permutation.json")
            ),
        },
    }
    payload = json.dumps(results, indent=2, sort_keys=True) + "\n"
    if write or not EXPECTED_PATH.exists():
        EXPECTED_PATH.parent.mkdir(parents=True, exist_ok=True)
        EXPECTED_PATH.write_text(payload)
        print(json.dumps({"wrote": str(EXPECTED_PATH), "fixtures": len(results["fixtures"])}))
        return 0
    committed = EXPECTED_PATH.read_text()
    if committed != payload:
        sys.stderr.write("independent-check results drifted from committed expected JSON\n")
        return 1
    print(json.dumps({"verifiedFixtures": len(results["fixtures"]), "output": str(EXPECTED_PATH)}))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as error:
        sys.stderr.write(f"independent-check failed: {error}\n")
        raise SystemExit(1)
