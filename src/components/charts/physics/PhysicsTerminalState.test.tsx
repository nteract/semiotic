/**
 * The event-tape terminal-state contract.
 *
 * Every physics chart driven by an authored event tape owes the same thing: its
 * end state must be computable from the authored inputs alone. If the outcome
 * only exists as the residue of a simulation, then reduced motion, SSR, snapshot
 * export, and `describeChart` cannot state it — the chart is a movie, not a
 * reading.
 *
 * Three charts are tape-driven:
 *   - CrucibleChart      → compiles `terminalState` / `terminalSpawns`
 *   - ChainReactionChart → derives task state from the data at `currentTime`
 *   - GauntletChart      → `resolveGauntletTerminalStates` (this contract)
 *
 * The load-bearing assertion is that Gauntlet's *pure* answer matches the answer
 * a real simulated run produces. Anything less and the two paths can drift.
 */
import * as React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, waitFor } from "@testing-library/react"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import GauntletChart from "./GauntletChart"
import { buildLayout, createInitialState } from "./gauntletPhysics"
import { resolveGauntletTerminalStates } from "./gauntletTerminal"
import { compileCruciblePlan } from "./cruciblePhysics"
import { compileDependencyMachine } from "./dependencyMachine"
import { initialRuntime } from "./chainReactionRuntime"
import type { GauntletProjectState } from "./gauntletTypes"

const SIZE: [number, number] = [720, 400]

const projects = [
  { id: "strong", positives: ["lift-a", "lift-b", "lift-c"], negatives: [] },
  { id: "fragile", positives: ["lift-a"], negatives: ["drag-a"] }
]

const positiveProperties = [
  { id: "lift-a", label: "Lift A", value: 3 },
  { id: "lift-b", label: "Lift B", value: 2 },
  { id: "lift-c", label: "Lift C", value: 2 }
]

const negativeProperties = [
  { id: "drag-a", label: "Drag A", load: 1.2 },
  { id: "drag-b", label: "Drag B", load: 1.5 }
]

const gates = [
  { id: "design", label: "Design", time: 0.4 },
  { id: "permit", label: "Permit", time: 0.9 }
]

const events = [
  {
    id: "design-review",
    label: "Design review",
    time: 0.4,
    gateId: "design",
    effects: [{ popPositive: ["lift-b"], addNegative: ["drag-b"] }]
  },
  {
    id: "permit-outcome",
    label: "Permit outcome",
    time: 0.9,
    gateId: "permit",
    final: true,
    effects: [{ stage: "permit outcome" }]
  }
]

const positiveById = new Map(positiveProperties.map((p) => [p.id, p]))
const negativeById = new Map(negativeProperties.map((p) => [p.id, p]))

function initialStates(): GauntletProjectState[] {
  return projects.map((datum, index) =>
    createInitialState(
      datum,
      index,
      {
        idAccessor: "id",
        positiveAccessor: "positives",
        negativeAccessor: "negatives"
      },
      positiveProperties,
      negativeById
    )
  ) as GauntletProjectState[]
}

function pureTerminal(): GauntletProjectState[] {
  const layout = buildLayout(SIZE, gates, 30)
  return resolveGauntletTerminalStates({
    projects: initialStates(),
    events,
    layout,
    positiveProperties: positiveById,
    negativeProperties: negativeById
  })
}

/** The parts of a project state that constitute the settled reading. */
function reading(state: GauntletProjectState) {
  return {
    id: state.id,
    activePositiveIds: [...state.activePositiveIds].sort(),
    negativeIds: [...state.negativeIds].sort(),
    poppedPositiveIds: [...state.poppedPositiveIds].sort(),
    eventsApplied: [...state.eventsApplied],
    outcome: state.outcome,
    stage: state.stage,
    viability: state.viability
  }
}

describe("GauntletChart terminal state", () => {
  it("is computable with no simulation at all", () => {
    const terminal = pureTerminal()
    expect(terminal).toHaveLength(2)

    const strong = terminal.find((state) => state.id === "strong")!
    // The tape popped lift-b and attached drag-b.
    expect(strong.activePositiveIds).not.toContain("lift-b")
    expect(strong.activePositiveIds).toContain("lift-a")
    expect(strong.negativeIds).toContain("drag-b")
    // A `final` event must resolve an outcome.
    expect(strong.outcome).toBeTruthy()
    expect(strong.eventsApplied).toEqual(["design-review", "permit-outcome"])
  })

  it("is deterministic — same inputs, same reading", () => {
    expect(pureTerminal().map(reading)).toEqual(pureTerminal().map(reading))
  })

  it("leaves an authored event history for accessible readouts", () => {
    const strong = pureTerminal().find((state) => state.id === "strong")!
    expect(strong.eventHistory?.map((item) => item.id)).toEqual([
      "design-review",
      "permit-outcome"
    ])
    expect(strong.lastEvent?.label).toBe("Permit outcome")
  })
})

describe("GauntletChart terminal state matches a simulated run", () => {
  let cleanupCanvas: () => void
  let restoreMedia: () => void

  beforeEach(() => {
    cleanupCanvas = setupCanvasMock()
    const original = window.matchMedia
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false
      }))
    })
    restoreMedia = () => {
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        writable: true,
        value: original
      })
    }
  })

  afterEach(() => {
    restoreMedia()
    cleanupCanvas()
  })

  async function runSimulated(
    extra: Partial<React.ComponentProps<typeof GauntletChart>> = {}
  ): Promise<GauntletProjectState[]> {
    let simulated: GauntletProjectState[] = []
    render(
      <GauntletChart
        data={projects}
        idAccessor="id"
        positiveAccessor="positives"
        negativeAccessor="negatives"
        positiveProperties={positiveProperties}
        negativeProperties={negativeProperties}
        gates={gates}
        events={events}
        size={SIZE}
        seed={11}
        onStateChange={(states) => {
          simulated = states as GauntletProjectState[]
        }}
        {...extra}
      />
    )
    await waitFor(() => {
      expect(
        simulated.every((state) => state.eventsApplied.includes("permit-outcome"))
      ).toBe(true)
    })
    return simulated
  }

  // This is the assertion that keeps the two paths honest. If someone changes an
  // effect rule in the live tick without changing the pure fold, this fails.
  // Crash detection is off here because it is a *physics*-derived outcome source
  // (see below) that no pure function can predict; with it off, the authored
  // tape is the whole story and the two paths must agree exactly.
  it("agrees with what running the chart actually produces", async () => {
    const simulated = await runSimulated({ crashDetection: false })
    const pure = pureTerminal()

    expect(simulated).toHaveLength(pure.length)
    for (const state of simulated) {
      const expected = pure.find((candidate) => candidate.id === state.id)!
      const actual = reading(state)
      const wanted = reading(expected)
      // Compare the settled reading, not transient physics (positions, delay
      // accrued from wall-clock, crash geometry).
      expect(actual.activePositiveIds).toEqual(wanted.activePositiveIds)
      expect(actual.negativeIds).toEqual(wanted.negativeIds)
      expect(actual.poppedPositiveIds).toEqual(wanted.poppedPositiveIds)
      expect(actual.eventsApplied).toEqual(wanted.eventsApplied)
      expect(actual.outcome).toEqual(wanted.outcome)
      expect(actual.viability).toBeCloseTo(wanted.viability, 5)
    }
  })

  /**
   * Named, not hidden: GauntletChart has a second outcome source that is not in
   * the tape. With `crashDetection` armed (the default), a core whose simulated
   * trajectory touches the crash line is killed and its outcome overridden. The
   * pure resolver returns "the outcome the plan earns on paper"; this documents
   * that the physical override is real and deliberate, so a reader of the pure
   * result knows what it does and does not cover.
   */
  it("still lets armed crash detection override the tape outcome", async () => {
    const simulated = await runSimulated({ crashDetection: true })
    const pure = pureTerminal()

    // The authored effects still apply identically — only the outcome/killed
    // fields can diverge, and only via physics.
    for (const state of simulated) {
      const expected = pure.find((candidate) => candidate.id === state.id)!
      expect(reading(state).activePositiveIds).toEqual(
        reading(expected).activePositiveIds
      )
      expect(reading(state).eventsApplied).toEqual(reading(expected).eventsApplied)
      if (state.killed) {
        expect(state.outcome).toBe("bad_design_crash")
        expect(state.crashX).toBeTypeOf("number")
      }
    }
  })
})

describe("the other tape-driven physics charts satisfy the same contract", () => {
  it("CrucibleChart compiles a terminal state without simulating", () => {
    const plan = compileCruciblePlan({
      data: [
        { id: "a", label: "A", category: "ore", amount: 4 },
        { id: "b", label: "B", category: "ore", amount: 6 }
      ],
      phases: [{ id: "charge", duration: 1 }, { id: "pour", duration: 1 }],
      products: [{ id: "ingot", label: "Ingot", outletId: "cast" }],
      outlets: [{ id: "cast", label: "Cast" }],
      events: [
        {
          id: "combine",
          at: { phaseId: "pour", progress: 0.5 },
          effects: [
            { type: "combine" as const, sourceIds: ["a", "b"], productId: "ingot" }
          ]
        }
      ],
      size: SIZE
    })

    // The plan carries both ends of the run as data, so a snapshot render never
    // has to advance a clock.
    expect(plan.initialState).toBeTruthy()
    expect(plan.terminalState).toBeTruthy()
    expect(plan.terminalState.products.ingot?.status).toBe("complete")
    expect(plan.terminalState.eventsApplied).toContain("combine")
    expect(Array.isArray(plan.terminalSpawns)).toBe(true)
  })

  it("ChainReactionChart derives its settled state without simulating", () => {
    const machine = compileDependencyMachine({
      data: [
        { id: "brief", title: "Brief", lane: "Product", dependsOn: [], status: "done", completed: 1 },
        { id: "privacy", title: "Privacy", lane: "Product", dependsOn: ["brief"], status: "blocked", blocker: "Legal" },
        { id: "schema", title: "Schema", lane: "Data", dependsOn: ["privacy"], status: "waiting" }
      ],
      taskIDAccessor: "id",
      labelAccessor: "title",
      laneAccessor: "lane",
      dependencyAccessor: "dependsOn",
      statusAccessor: "status",
      completionTimeAccessor: "completed",
      blockerAccessor: "blocker"
    })
    expect(machine.valid).toBe(true)

    const runtime = initialRuntime(machine, "snapshot", 10, true)

    // Derived, not simulated: a blocked prerequisite must leave its dependent
    // unarmed even though nothing ever moved.
    expect(runtime.completed.has("brief")).toBe(true)
    expect(runtime.blockers.has("privacy")).toBe(true)
    expect(runtime.armed.has("schema")).toBe(false)
  })
})
