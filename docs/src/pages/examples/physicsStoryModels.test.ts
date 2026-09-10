import { describe, expect, it } from "vitest"
import type { GauntletLayout, GauntletProjectState } from "semiotic/physics"
import {
  buildEventDropPhysics,
  readEventDropOccupancy,
  PhysicsPipelineStore,
} from "semiotic/physics"
import type { EventDropProjectionMetadata } from "semiotic/physics"
import { watermarkPolicySummary } from "./WatermarkExperiment"
import { WATERMARK_SCENARIOS } from "./watermarksScenarios"
import { PR_TEMPLATES, SCENARIOS } from "./mergePressureScenarios"
import { buildReviewEvents } from "./mergePressureModel"
import { SYSTEMS } from "./stakeholderJourneyScenarios"

describe("the experiments hold their declared inputs fixed", () => {
  it("changes only the named review intervention on the same eight PRs", () => {
    const inputs = (id: string) => {
      const s = SCENARIOS[id]
      return {
        data: PR_TEMPLATES.slice(0, s.count),
        seed: s.seed,
        arrivalGap: s.arrivalGap,
        reviewRate: s.reviewRate,
        humanBudget: s.humanBudget,
        aiMode: s.aiMode,
      }
    }
    expect(inputs("humanPace").data).toHaveLength(8)
    expect(inputs("humanPace").data.reduce((n, pr) => n + pr.points, 0)).toBe(29)
    expect(inputs("aiBurst")).toEqual({ ...inputs("humanPace"), arrivalGap: 0.38 })
    expect(inputs("ciReturns")).toEqual({ ...inputs("aiBurst"), humanBudget: 3 })
    expect(inputs("aiTests")).toEqual({ ...inputs("ciReturns"), aiMode: "bad_tests" })
    expect(inputs("scaledReview")).toEqual({ ...inputs("aiBurst"), reviewRate: 15 })
  })

  it("changes only invitation at Habit in the community comparison", () => {
    const forces = (id: string) => {
      const s = SYSTEMS[id]
      return [s.invitationForce, s.invitationDamping, s.leadershipForce, s.leadershipDamping]
    }
    expect(forces("relay")).toEqual([80, ...forces("passive").slice(1)])
    expect(forces("passive")[0]).toBe(-240)
  })
})

describe("watermark story arithmetic", () => {
  it.each(WATERMARK_SCENARIOS)(
    "puts every $id event in the container its count describes",
    (scenario) => {
      for (const allowance of [18, 54]) {
        const frontier = Math.max(...scenario.events.map((event) => event.arrivalTime))
        const layout = buildEventDropPhysics({
          data: scenario.events.map((event) => ({
            ...event,
            admission: event.arrivalTime - allowance - 1e-6,
          })),
          timeAccessor: "eventTime",
          arrivalAccessor: "arrivalTime",
          watermarkAtArrivalAccessor: "admission",
          watermark: { value: frontier - allowance - 1e-6 },
          windows: { size: 12 },
          ballRadius: 7.5,
          seed: scenario.seed,
          size: [800, 400],
          timeScale: 40,
        })
        const store = new PhysicsPipelineStore(layout.config)
        store.enqueue(layout.initialSpawns, layout.initialSpawnPacing)
        store.settle(2400)
        expect(
          readEventDropOccupancy(
            layout.metadata as unknown as EventDropProjectionMetadata,
            store.readBodies(),
          ),
        ).toEqual({
          accepted: layout.projectionRows.map((row) => row.value),
          late: layout.projectionRows.reduce((sum, row) => sum + (row.secondary ?? 0), 0),
          inFlight: 0,
          total: scenario.events.length,
        })
      }
    },
  )

  it("uses a shared clock where each event happens before it arrives", () => {
    for (const scenario of WATERMARK_SCENARIOS) {
      expect(scenario.events.every((event) => event.eventTime <= event.arrivalTime)).toBe(true)
    }
  })

  it("buys three extra admissions with 36 seconds of extra waiting", () => {
    const events = WATERMARK_SCENARIOS.find((s) => s.id === "backfill")!.events
    expect(watermarkPolicySummary(events, 12, 18)).toEqual({ accepted: 7, late: 3 })
    expect(watermarkPolicySummary(events, 12, 54)).toEqual({ accepted: 10, late: 0 })
    for (const allowance of [0, 18, 36, 54]) {
      const layout = buildEventDropPhysics({
        data: events.map((event) => ({
          ...event,
          admission: event.arrivalTime - allowance - 1e-6,
        })),
        timeAccessor: "eventTime",
        arrivalAccessor: "arrivalTime",
        watermarkAtArrivalAccessor: "admission",
        watermark: { value: 70 - allowance - 1e-6 },
        windows: { size: 12 },
        ballRadius: 7.5,
        seed: 47,
        size: [800, 400],
      })
      expect(watermarkPolicySummary(events, 12, allowance)).toEqual({
        accepted: layout.projectionRows.reduce((n, row) => n + row.value, 0),
        late: layout.projectionRows.reduce((n, row) => n + (row.secondary ?? 0), 0),
      })
    }
  })

  it("accepts an arrival exactly at the declared closing instant", () => {
    expect(
      watermarkPolicySummary(
        [
          { id: "boundary", eventTime: 11, arrivalTime: 30, source: "test" },
          { id: "after", eventTime: 11, arrivalTime: 31, source: "test" },
        ],
        12,
        18,
      ),
    ).toEqual({ accepted: 1, late: 1 })
  })
})

const layout: GauntletLayout = {
  width: 760,
  height: 540,
  startX: 60,
  routeY: 220,
  crashY: 480,
  floorY: 530,
  socketX: 680,
  graveyardX: 600,
  graveyardY: 490,
  gates: ["ai-review", "human-review", "ci"].map((id, index) => ({
    id,
    x: 200 + index * 150,
    width: 10,
  })),
}
const project = (overrides: Partial<GauntletProjectState> = {}): GauntletProjectState => ({
  id: "pr",
  datum: { points: 2 },
  activePositiveIds: [],
  negativeIds: ["missing_tests"],
  missingPositiveIds: [],
  poppedPositiveIds: [],
  poppedNegativeIds: [],
  metrics: {},
  eventsApplied: [],
  killed: false,
  delay: 0,
  outcome: "pending",
  stage: "start",
  viability: 100,
  ...overrides,
})

describe("review decisions consume the latest ledger", () => {
  it("cannot compute CI from risks that an overdue review has just removed", () => {
    const next = (p: GauntletProjectState) => buildReviewEvents(SCENARIOS.aiBurst, p, layout)
    expect(next(project()).map((event) => event.id)).toEqual(["ai-review"])
    expect(next(project({ eventsApplied: ["ai-review"] })).map((event) => event.id)).toEqual([
      "human-review-1",
    ])
    const afterReview = next(
      project({ eventsApplied: ["ai-review", "human-review-1"], negativeIds: [] }),
    )
    expect(afterReview.map((event) => event.id)).toEqual(["ci-check-1"])
    expect(afterReview[0].effects?.[0].metricsDelta).toEqual({ ciPasses: 1 })
  })

  it("requires another CI check after a return review repairs missing tests", () => {
    const applied = ["ai-review", "human-review-1", "ci-check-1"]
    const returned = project({ eventsApplied: applied, metrics: { ciReturns: 1 } })
    expect(
      buildReviewEvents(SCENARIOS.ciReturns, returned, layout).map((event) => event.id),
    ).toEqual(["human-review-2"])
    const repaired = project({
      ...returned,
      eventsApplied: [...applied, "human-review-2"],
      negativeIds: [],
    })
    expect(
      buildReviewEvents(SCENARIOS.ciReturns, repaired, layout).map((event) => event.id),
    ).toEqual(["ci-final"])
    const checked = project({ ...repaired, eventsApplied: [...repaired.eventsApplied, "ci-final"] })
    expect(buildReviewEvents(SCENARIOS.ciReturns, checked, layout)).toEqual([
      expect.objectContaining({ id: "merge-decision", final: true }),
    ])
  })
})
