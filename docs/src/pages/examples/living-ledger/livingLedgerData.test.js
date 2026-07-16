import { describe, expect, it } from "vitest"
import {
  ALERT_LEVEL_RANK,
  CORAL_ALERT_DAYS,
  EVIDENCE_ROLES,
  FLAGSHIP_SYSTEM_IDS,
  FOREST_EVENT_DAY,
  ILLUSTRATIVE_DATA_NOTICE,
  OBSERVATION_EVENTS,
  PIPELINE_GATES,
  POLLINATION_WATCH_DAY,
  REPLAY_DATES,
  REPLAY_WINDOW,
  SERVICE_SYSTEMS,
  SERVICE_SYSTEM_IDS,
  SOURCE_MANIFEST,
  THRESHOLDS,
  dayIndexForDate,
  deriveSnapshot,
  ledgerRowsFor,
  networksFor,
  observationEvents,
  observationEventsFor,
  pulseSeriesFor,
} from "./livingLedgerData"

function stateFor(snapshot, systemId) {
  return snapshot.systems.find((system) => system.id === systemId)
}

function expectPathsToFollowEdges(network) {
  const nodeIds = new Set(network.nodes.map((node) => node.id))
  const edgeKeys = new Set(network.edges.map((edge) => `${edge.source}->${edge.target}`))
  for (const path of network.paths) {
    expect(path.length).toBeGreaterThan(1)
    for (const nodeId of path) expect(nodeIds.has(nodeId), nodeId).toBe(true)
    for (let index = 1; index < path.length; index += 1) {
      expect(edgeKeys.has(`${path[index - 1]}->${path[index]}`), path.join(" → ")).toBe(true)
    }
  }
}

function collectKeys(value, keys = []) {
  if (!value || typeof value !== "object") return keys
  for (const [key, child] of Object.entries(value)) {
    keys.push(key)
    collectKeys(child, keys)
  }
  return keys
}

describe("Living Ledger replay contract", () => {
  it("covers exactly 180 deterministic days ending July 12, 2026", () => {
    expect(REPLAY_WINDOW).toMatchObject({
      start: "2026-01-14",
      end: "2026-07-12",
      days: 180,
    })
    expect(REPLAY_DATES).toHaveLength(180)
    expect(REPLAY_DATES[0]).toBe(REPLAY_WINDOW.start)
    expect(REPLAY_DATES.at(-1)).toBe(REPLAY_WINDOW.end)
    expect(dayIndexForDate(REPLAY_WINDOW.start)).toBe(0)
    expect(dayIndexForDate(REPLAY_WINDOW.end)).toBe(179)

    const first = deriveSnapshot(179)
    const second = deriveSnapshot(179)
    expect(second).toEqual(first)
    first.systems[0].name = "mutated local result"
    expect(deriveSnapshot(179)).toEqual(second)
  })

  it("ships broad coverage without pretending the sources supplied these values", () => {
    expect(SERVICE_SYSTEMS.length).toBeGreaterThanOrEqual(7)
    expect(
      new Set(SERVICE_SYSTEMS.map((system) => system.bioregionId)).size,
    ).toBeGreaterThanOrEqual(7)
    expect(
      SERVICE_SYSTEMS.filter((system) => system.deepCase).map((system) => system.deepCase),
    ).toEqual(["coral", "forest", "pollination"])
    expect(SOURCE_MANIFEST.valuesAreIllustrative).toBe(true)
    expect(SOURCE_MANIFEST.notice).toBe(ILLUSTRATIVE_DATA_NOTICE)
    expect(SOURCE_MANIFEST.snapshot).toBe("living-ledger-2026-07")
    expect(SOURCE_MANIFEST.sources.every((source) => source.valuesInReplay)).toBe(true)

    const publicSourceUrls = Object.fromEntries(
      SOURCE_MANIFEST.sources
        .filter((source) => source.url)
        .map((source) => [source.id, source.url]),
    )
    expect(publicSourceUrls).toMatchObject({
      "noaa-coral-reef-watch-dhw": "https://coralreefwatch.noaa.gov/product/5km/index_5km_dhw.php",
      "umd-glad-forest-alerts": "https://www.glad.umd.edu/index.php/dataset/glad-forest-alerts",
      "copernicus-glofas":
        "https://global-flood.emergency.copernicus.eu/react/technical-information/products/",
      "global-mangrove-watch": "https://www.globalmangrovewatch.org/",
      "global-fishing-watch-effort":
        "https://globalfishingwatch.org/dataset-and-code-fishing-effort/",
    })
  })

  it("filters the same underlying state rather than recomputing another story", () => {
    const all = deriveSnapshot(179)
    const deep = deriveSnapshot(179, { deepCases: true })
    expect(deep.systems.map((system) => system.id)).toEqual(Object.values(FLAGSHIP_SYSTEM_IDS))
    for (const system of deep.systems) {
      expect(system).toEqual(stateFor(all, system.id))
    }

    const warnings = deriveSnapshot(179, { alertLevels: ["Warning", "Action"] })
    expect(warnings.systems.every((system) => ALERT_LEVEL_RANK[system.alert.level] >= 2)).toBe(true)
    expect(warnings.summary.monitoredSystemCount).toBe(warnings.systems.length)
    expect(() => deriveSnapshot(-1)).toThrow(RangeError)
    expect(() => deriveSnapshot(180)).toThrow(RangeError)
  })
})

describe("the three epistemic cases", () => {
  it("moves coral through the registered 4 and 8 °C-week lifecycle", () => {
    const threshold = THRESHOLDS.find((entry) => entry.id === "coral-heat-dhw")
    expect(threshold.levels).toEqual([
      { level: "warning", value: 4, persistence: "single-observation" },
      { level: "action", value: 8, persistence: "single-observation" },
    ])
    expect(threshold.provenance).toMatchObject({
      authority: "NOAA Coral Reef Watch",
      confidence: "high",
      nonTransferable: true,
      geographicRollupPermitted: false,
    })

    const beforeWarning = stateFor(
      deriveSnapshot(CORAL_ALERT_DAYS.warning - 1),
      SERVICE_SYSTEM_IDS.coral,
    )
    const warning = stateFor(deriveSnapshot(CORAL_ALERT_DAYS.warning), SERVICE_SYSTEM_IDS.coral)
    const beforeAction = stateFor(
      deriveSnapshot(CORAL_ALERT_DAYS.action - 1),
      SERVICE_SYSTEM_IDS.coral,
    )
    const action = stateFor(deriveSnapshot(CORAL_ALERT_DAYS.action), SERVICE_SYSTEM_IDS.coral)

    expect(beforeWarning.alert.level).toBe("Observe")
    expect(warning.alert.level).toBe("Warning")
    expect(warning.thresholdEvaluations.find((entry) => entry.level === "warning")).toMatchObject({
      observedValue: 4,
      crossed: true,
      serviceFailureClaim: false,
    })
    expect(beforeAction.alert.level).toBe("Warning")
    expect(action.alert.level).toBe("Action")
    expect(action.thresholdEvaluations.find((entry) => entry.level === "action")).toMatchObject({
      observedValue: 8,
      crossed: true,
      serviceFailureClaim: false,
    })
    expect(action.alert.lifecycle.map((event) => event.type)).toEqual(["issued", "escalated"])

    const pulse = pulseSeriesFor(SERVICE_SYSTEM_IDS.coral, CORAL_ALERT_DAYS.action)
    expect(pulse.thresholds[0]).toBe(threshold)
    expect(pulse.points[CORAL_ALERT_DAYS.warning]).toMatchObject({
      value: 4,
      thresholdState: "warning",
    })
    expect(pulse.points[CORAL_ALERT_DAYS.action]).toMatchObject({
      value: 8,
      thresholdState: "action",
    })
  })

  it("keeps the Congo event a pressure Watch, never a service-failure claim", () => {
    const before = stateFor(deriveSnapshot(FOREST_EVENT_DAY - 1), SERVICE_SYSTEM_IDS.forest)
    const event = stateFor(deriveSnapshot(FOREST_EVENT_DAY), SERVICE_SYSTEM_IDS.forest)
    const end = stateFor(deriveSnapshot(179), SERVICE_SYSTEM_IDS.forest)

    expect(before.alert.level).toBe("Observe")
    expect(event.alert).toMatchObject({
      level: "Watch",
      warningKind: "reference-anomaly",
      evidenceRole: "pressure",
      serviceFailure: false,
      outcomeClaim: false,
      thresholdId: null,
      maximumLevel: "Warning",
    })
    expect(event.alert.caution).toContain("Service implication not yet directly observed")
    expect(ALERT_LEVEL_RANK[end.alert.level]).toBeLessThanOrEqual(ALERT_LEVEL_RANK.Warning)
    expect(end.risk.serviceDeficit).toBe(0)
    expect(pulseSeriesFor(SERVICE_SYSTEM_IDS.forest, 179).evidenceRole).toBe("pressure")
  })

  it("keeps pollination at Model Watch and shows the managed-hive subsidy", () => {
    const before = stateFor(
      deriveSnapshot(POLLINATION_WATCH_DAY - 1),
      SERVICE_SYSTEM_IDS.pollination,
    )
    const watched = stateFor(deriveSnapshot(179), SERVICE_SYSTEM_IDS.pollination)
    expect(before.alert.level).toBe("Observe")
    expect(watched.alert).toMatchObject({
      level: "Watch",
      warningKind: "trend-change",
      confidence: "medium",
      thresholdId: null,
      maximumLevel: "Watch",
    })
    expect(watched.eesv.ecologicalSupply.value).toBeLessThan(watched.eesv.demand.value)
    expect(watched.eesv.anthropogenicContribution).toMatchObject({
      value: 21,
      evidenceRole: "service-flow",
    })
    expect(watched.serviceAdequacy).toBeGreaterThanOrEqual(0.9)
    expect(watched.triage.quadrant).toBe("Subsidized")

    const rows = ledgerRowsFor(SERVICE_SYSTEM_IDS.pollination, 179)
    expect(rows).toHaveLength(6)
    expect(rows.find((row) => row.dimension === "ecologicalSupply").note).toContain(
      "Managed hives are next door",
    )
    expect(rows.find((row) => row.dimension === "anthropogenicContribution").note).toContain(
      "cover part of the modeled gap",
    )
  })
})

describe("claims, freshness and evidence", () => {
  it("does not borrow an unrelated observation source for demand or exposure", () => {
    const coral = stateFor(deriveSnapshot(179), SERVICE_SYSTEM_IDS.coral)
    const sourceIds = new Set([
      ...Object.values(coral.eesv).flatMap((estimate) => estimate?.sourceIds ?? []),
      ...coral.risk.exposure.sourceIds,
    ])
    expect(sourceIds).toContain("noaa-coral-reef-watch-dhw")
    expect(sourceIds).toContain("authored-service-system-inputs")
    expect(sourceIds).not.toContain("authored-wetland-observations")
  })

  it("contains counts and dimensions, but no synthetic global score", () => {
    const snapshot = deriveSnapshot(179)
    expect(snapshot.globalScore).toBeUndefined()
    expect(snapshot.healthScore).toBeUndefined()
    expect(snapshot.overallScore).toBeUndefined()
    expect(snapshot.aggregationPolicy).toMatchObject({
      globalScorePermitted: false,
      crossUnitAggregationPermitted: false,
      unknownPresentedAsHealthy: false,
    })
    const keys = collectKeys(snapshot)
    expect(keys).not.toContain("healthScore")
    expect(keys).not.toContain("overallScore")
    expect(snapshot.summary.countsByAlertLevel).toEqual(
      expect.objectContaining({ Observe: expect.any(Number), Watch: expect.any(Number) }),
    )
  })

  it("does not turn a stale feed into a healthy station", () => {
    const cooling = stateFor(deriveSnapshot(179), SERVICE_SYSTEM_IDS.cooling)
    expect(cooling).toMatchObject({
      freshness: "stale",
      currentStatus: "unknown",
      triage: { quadrant: "Unobserved" },
      risk: { evidenceStatus: "unknown", freshness: "stale" },
      alert: { level: "Watch", warningKind: "data-observability" },
    })
    expect(cooling.alert.caution).toContain("not evidence of normal")

    const pulse = pulseSeriesFor(SERVICE_SYSTEM_IDS.cooling, 179)
    expect(pulse.points.at(-1)).toMatchObject({
      value: null,
      dataGap: true,
      freshness: "stale",
    })
    expect(pulse.points.at(-1).carriedValue).toBeTypeOf("number")
  })

  it("keeps estimate roles, source links and missing cells explicit", () => {
    const sourceIds = new Set(SOURCE_MANIFEST.sources.map((source) => source.id))
    for (const system of deriveSnapshot(179).systems) {
      const estimates = [
        system.ecosystemCondition,
        ...Object.values(system.eesv),
        system.risk.exposure,
        system.risk.velocity,
      ].filter(Boolean)
      for (const estimate of estimates) {
        expect(EVIDENCE_ROLES).toContain(estimate.evidenceRole)
        expect(["current", "aging", "stale", "unknown"]).toContain(estimate.freshness)
        expect(estimate.authoredIllustration).toBe(true)
        expect(estimate.sourceIds.length).toBeGreaterThan(0)
        for (const sourceId of estimate.sourceIds)
          expect(sourceIds.has(sourceId), sourceId).toBe(true)
      }
    }

    const relational = ledgerRowsFor(SERVICE_SYSTEM_IDS.relational, 179)
    expect(relational.find((row) => row.dimension === "demand")).toMatchObject({
      estimate: null,
      status: "not-assessed",
      supplyDemandComparable: false,
    })
  })
})

describe("dependency and evidence paths", () => {
  it("returns traversable forward and backward paths for every system", () => {
    for (const system of SERVICE_SYSTEMS) {
      const networks = networksFor(system.id)
      expect(networks.systemId).toBe(system.id)
      expectPathsToFollowEdges(networks.dependency)
      expectPathsToFollowEdges(networks.evidence)
    }
  })

  it("keeps the flagship distinctions in the networks", () => {
    const coral = networksFor(SERVICE_SYSTEM_IDS.coral)
    expect(coral.dependency.paths).toContainEqual([
      "coral:reef",
      "coral:rugosity",
      "coral:waves",
      "coral:protection",
      "coral:homes",
    ])
    expect(coral.evidence.paths).toContainEqual([
      "coral:noaa",
      "coral:dhw",
      "coral:evaluation",
      "coral:alert",
    ])

    const forest = networksFor(SERVICE_SYSTEM_IDS.forest)
    expect(forest.evidence.nodes).toContainEqual(
      expect.objectContaining({ kind: "evidence-gap", label: "Service implication unobserved" }),
    )
    expect(forest.dependency.edges.find((edge) => edge.edgeType === "pressure")).toMatchObject({
      source: "forest:disturbance",
      target: "forest:canopy",
    })

    const pollination = networksFor(SERVICE_SYSTEM_IDS.pollination)
    expect(pollination.dependency.edges).toContainEqual(
      expect.objectContaining({
        source: "pollination:hives",
        target: "pollination:service",
        relation: "supplements",
      }),
    )
    expect(pollination.evidence.paths).toContainEqual([
      "pollination:hive-input",
      "pollination:model",
      "pollination:watch",
    ])
  })

  it("returns fresh network objects so a view cannot pollute another view", () => {
    const first = networksFor(SERVICE_SYSTEM_IDS.coral)
    const second = networksFor(SERVICE_SYSTEM_IDS.coral)
    first.dependency.nodes[0].label = "changed in a component"
    expect(second).toEqual(networksFor(SERVICE_SYSTEM_IDS.coral))
    expect(second.dependency.nodes[0].label).not.toBe("changed in a component")
    expect(() => networksFor("not-a-system")).toThrow("Unknown service system")
  })
})

describe("observation pipeline", () => {
  it("walks accepted observations through every named gate", () => {
    expect(OBSERVATION_EVENTS).toBe(observationEvents)
    const accepted = observationEvents.find((event) => event.id === "reef-14-dhw-102")
    expect(accepted.journey.map((step) => step.gateId)).toEqual(
      PIPELINE_GATES.map((gate) => gate.id),
    )
    expect(accepted.journey.every((step) => step.status === "passed")).toBe(true)
    expect(observationEventsFor(accepted.arrivalDay)[0]).toBeTruthy()
    const settled = observationEventsFor(accepted.finalDay).find(
      (event) => event.id === accepted.id,
    )
    expect(settled.pipelineStatus).toBe("settled")
    expect(settled.completedJourney).toHaveLength(PIPELINE_GATES.length)
  })

  it("queues late evidence, quarantines bad units and resolves review", () => {
    const late = observationEvents.find((event) => event.id === "sundarbans-extent-90-late")
    expect(late).toMatchObject({ late: true, outcome: "late-accepted" })
    expect(late.journey[0].status).toBe("late")

    const failed = observationEvents.find((event) => event.id === "danube-discharge-88-bad-unit")
    expect(failed.outcome).toBe("quarantine")
    expect(failed.journey.at(-1)).toMatchObject({
      gateId: "validate",
      status: "failed",
    })
    expect(failed.journey.some((step) => step.gateId === "update-indicator")).toBe(false)
    const failedAtEnd = observationEventsFor(179).find((event) => event.id === failed.id)
    expect(failedAtEnd.pipelineStatus).toBe("quarantine")

    const reviewed = observationEvents.find((event) => event.id === "congo-disturbance-cluster-118")
    expect(reviewed.outcome).toBe("accepted-after-review")
    expect(
      reviewed.journey.filter((step) => step.gateId === "corroborate").map((step) => step.status),
    ).toEqual(["review", "resolved"])
    expect(observationEventsFor(179).find((event) => event.id === reviewed.id).pipelineStatus).toBe(
      "settled",
    )
  })

  it("only includes events that have arrived and respects system filters", () => {
    const day = 100
    const events = observationEventsFor(day)
    expect(events.every((event) => event.arrivalDay <= day)).toBe(true)
    const coralOnly = observationEventsFor(179, { systemId: SERVICE_SYSTEM_IDS.coral })
    expect(coralOnly.length).toBeGreaterThan(0)
    expect(coralOnly.every((event) => event.serviceSystemId === SERVICE_SYSTEM_IDS.coral)).toBe(
      true,
    )
  })
})
