import { describe, expect, it } from "vitest"
import { createMockCanvasContext } from "../../../test-utils/canvasMock"
import { PhysicsPipelineStore } from "../../stream/physics/PhysicsPipelineStore"
import {
  applyGauntletEffect,
  buildGauntletPhysics,
  planGauntletPropertyWork,
  replaceGauntletNegative,
  type GauntletProjectState
} from "./GauntletChart"
import { drawGauntletBody } from "./gauntletChrome"
import {
  buildLayout,
  defaultPlacement,
  projectCoreId,
  projectNegativeId
} from "./gauntletPhysics"
import { recordGauntletEvent } from "./gauntletEffects"
import {
  computeGauntletBodyForce,
  projectRouteTarget,
  spawnBodiesForGauntletEffect
} from "./gauntletRuntime"

describe("GauntletChart physics primitives", () => {
  it("scales its corridor and default bodies into a sparkline viewport", () => {
    const { initialSpawns, config, layout } = buildGauntletPhysics({
      data: [{ id: "compact", positives: ["signal"], negatives: ["burden"] }],
      positiveAccessor: "positives",
      negativeAccessor: "negatives",
      positiveProperties: [{ id: "signal" }],
      negativeProperties: [{ id: "burden" }],
      size: [118, 36]
    })

    expect(layout.floorY).toBeGreaterThan(layout.routeY)
    for (const spawn of initialSpawns) {
      expect(spawn.x).toBeGreaterThan(0)
      expect(spawn.x).toBeLessThan(118)
      expect(spawn.y).toBeGreaterThan(0)
      expect(spawn.y).toBeLessThan(36)
    }
    for (const collider of config.colliders ?? []) {
      if (collider.shape.type !== "segment") continue
      expect(collider.shape.x1).toBeGreaterThanOrEqual(0)
      expect(collider.shape.x2).toBeLessThanOrEqual(118)
      expect(collider.shape.y1).toBeGreaterThanOrEqual(0)
      expect(collider.shape.y2).toBeLessThanOrEqual(36)
    }
  })

  it("uses one project-local start time for a core and every satellite", () => {
    const { initialSpawns } = buildGauntletPhysics({
      data: [
        {
          id: "pr-1",
          arrival: 2.5,
          positives: ["value"],
          negatives: ["risk", "risk"]
        }
      ],
      idAccessor: "id",
      positiveAccessor: "positives",
      negativeAccessor: "negatives",
      startTimeAccessor: "arrival",
      positiveProperties: [{ id: "value" }],
      negativeProperties: [{ id: "risk" }]
    })

    expect(initialSpawns).toHaveLength(4)
    expect(initialSpawns.every((spawn) => spawn.spawnAt === 2.5)).toBe(true)
  })

  it("plans bounded property work deterministically and preserves occurrences", () => {
    const plan = planGauntletPropertyWork({
      attachedIds: ["expensive", "cheap", "cheap"],
      properties: [
        { id: "expensive", work: 5, priority: 0 },
        { id: "cheap", work: 2, priority: 1 }
      ],
      budget: 4
    })

    expect(plan).toMatchObject({
      ids: ["cheap", "cheap"],
      used: 4,
      remaining: 0,
      skippedIds: ["expensive"]
    })
  })

  it("replaces a bounded number of duplicate negatives without losing history", () => {
    const project: GauntletProjectState = {
      id: "pr-1",
      activePositiveIds: [],
      datum: { id: "pr-1" },
      delay: 0,
      eventsApplied: [],
      killed: false,
      metrics: {},
      missingPositiveIds: [],
      negativeIds: ["missing", "missing", "scope"],
      outcome: "in_process",
      poppedPositiveIds: [],
      poppedNegativeIds: [],
      stage: "review",
      viability: 70
    }
    const effect = replaceGauntletNegative(project, {
      from: "missing",
      to: "bad-tests",
      count: 2
    })
    const next = applyGauntletEffect(project, effect, {
      event: { id: "ai", time: 1 },
      negativeProperties: new Map(),
      positiveProperties: new Map(),
      project
    })

    expect(next.negativeIds).toEqual(["scope", "bad-tests", "bad-tests"])
    expect(next.poppedNegativeIds).toEqual(["missing", "missing"])
    expect(
      replaceGauntletNegative(next, { from: "absent", to: "bad-tests" })
    ).toEqual({})
  })

  it("holds a route at a capacity gate until its event is applied", () => {
    const layout = buildLayout(
      [720, 380],
      [
        { id: "review", x: 280, capacity: { unitsPerSecond: 2 } },
        { id: "ci", x: 500 }
      ],
      30
    )
    const project: GauntletProjectState = {
      id: "pr-1",
      activePositiveIds: [],
      datum: { id: "pr-1" },
      delay: 0,
      eventsApplied: [],
      killed: false,
      metrics: {},
      missingPositiveIds: [],
      negativeIds: [],
      outcome: "in_process",
      poppedPositiveIds: [],
      poppedNegativeIds: [],
      stage: "filed",
      viability: 100
    }
    const events = [
      { id: "review", gateId: "review", time: 1 },
      { id: "ci", gateId: "ci", time: 2 }
    ]
    const target = projectRouteTarget(
      3,
      project,
      layout,
      defaultPlacement(layout),
      events,
      new Map(layout.gates.map((gate) => [gate.id, gate])),
      "hold-last"
    )

    expect(target.x).toBe(280)
  })

  it("records each semantic event once when a tick is replayed before commit", () => {
    const project: GauntletProjectState = {
      id: "pr-1",
      activePositiveIds: [],
      datum: { id: "pr-1" },
      delay: 0,
      eventsApplied: [],
      eventHistory: [],
      killed: false,
      metrics: {},
      missingPositiveIds: [],
      negativeIds: [],
      outcome: "in_process",
      poppedPositiveIds: [],
      poppedNegativeIds: [],
      stage: "review",
      viability: 100
    }
    const once = recordGauntletEvent(project, {
      id: "merge-decision",
      label: "Merge Decision",
      time: 2.7,
      appliedAt: 2.8
    })
    const replayed = recordGauntletEvent(once, {
      id: "merge-decision",
      label: "Merge Decision",
      time: 2.7,
      appliedAt: 2.9
    })

    expect(replayed).toBe(once)
    expect(replayed.eventsApplied).toEqual(["merge-decision"])
    expect(replayed.eventHistory).toHaveLength(1)
  })

  it("places positives above the core, negatives below it, and only the core is load-bearing", () => {
    const { initialSpawns } = buildGauntletPhysics({
      data: [
        {
          id: "trial-1",
          positives: ["efficacy", "safety", "biomarker"],
          negatives: ["toxicity", "cost"]
        }
      ],
      idAccessor: "id",
      positiveAccessor: "positives",
      negativeAccessor: "negatives",
      positiveProperties: [
        { id: "efficacy", label: "Efficacy", buoyancy: 2.4, radius: 10 },
        { id: "safety", label: "Safety", buoyancy: 1.8, radius: 9 },
        { id: "biomarker", label: "Biomarker", buoyancy: 1.6, radius: 8 }
      ],
      negativeProperties: [
        { id: "toxicity", label: "Toxicity", load: 1.6, radius: 8 },
        { id: "cost", label: "Cost", load: 1.1, radius: 7 }
      ],
      size: [720, 380]
    })

    const core = initialSpawns.find((spawn) => spawn.id === projectCoreId("trial-1"))
    expect(core).toBeTruthy()
    const positives = initialSpawns.filter((spawn) => spawn.id.includes(":positive:"))
    const negatives = initialSpawns.filter((spawn) => spawn.id.includes(":negative:"))

    expect(positives.length).toBe(3)
    expect(negatives.length).toBe(2)
    expect(core!.bodyCollisions).toBe(true)
    positives.forEach((spawn) => expect(spawn.y).toBeLessThan(core!.y))
    negatives.forEach((spawn) => expect(spawn.y).toBeGreaterThan(core!.y))
    positives.forEach((spawn) => expect(spawn.bodyCollisions).toBe(false))
    negatives.forEach((spawn) => expect(spawn.bodyCollisions).toBe(false))
  })

  it("draws negative gauntlet properties as square drag marks", () => {
    const ctx = createMockCanvasContext() as unknown as CanvasRenderingContext2D
    drawGauntletBody(
      ctx,
      {
        id: "gauntlet:trial-1:negative:cost:0",
        x: 20,
        y: 30,
        prevX: 20,
        prevY: 30,
        vx: 0,
        vy: 0,
        angle: 0,
        mass: 1,
        shape: { type: "circle", radius: 7 },
        sleeping: false,
        datum: {
          __gauntlet: true,
          kind: "gauntlet-negative",
          projectId: "trial-1",
          property: { id: "cost", label: "Cost", short: "$", color: "#ef4444" },
          sourceDatum: { id: "trial-1" }
        }
      },
      {}
    )

    expect(ctx.rect).toHaveBeenCalledWith(-7, -7, 14, 14)
    expect(ctx.arc).not.toHaveBeenCalled()
  })

  it("pops negative gauntlet bodies by live body identity after prior removals shift state indices", () => {
    const sourceDatum = { id: "trial-1" }
    const store = new PhysicsPipelineStore()
    store.enqueue([
      {
        id: projectCoreId("trial-1"),
        x: 160,
        y: 160,
        mass: 7,
        shape: { type: "circle", radius: 28 },
        datum: {
          __gauntlet: true,
          kind: "gauntlet-core",
          projectId: "trial-1",
          sourceDatum
        }
      },
      {
        id: projectNegativeId("trial-1", "cost", 1),
        x: 150,
        y: 214,
        mass: 1,
        shape: { type: "circle", radius: 7 },
        datum: {
          __gauntlet: true,
          kind: "gauntlet-negative",
          projectId: "trial-1",
          property: { id: "cost", load: 1.1 },
          sourceDatum
        }
      },
      {
        id: projectNegativeId("trial-1", "supply", 2),
        x: 168,
        y: 214,
        mass: 1,
        shape: { type: "circle", radius: 7 },
        datum: {
          __gauntlet: true,
          kind: "gauntlet-negative",
          projectId: "trial-1",
          property: { id: "supply", load: 0.9 },
          sourceDatum
        }
      },
      {
        id: projectNegativeId("trial-1", "litigation", 3),
        x: 186,
        y: 214,
        mass: 1,
        shape: { type: "circle", radius: 7 },
        datum: {
          __gauntlet: true,
          kind: "gauntlet-negative",
          projectId: "trial-1",
          property: { id: "litigation", load: 1.2 },
          sourceDatum
        }
      }
    ])
    store.tick(0)

    const project: GauntletProjectState = {
      id: "trial-1",
      activePositiveIds: [],
      datum: sourceDatum,
      delay: 0,
      eventsApplied: [],
      killed: false,
      metrics: {},
      missingPositiveIds: [],
      negativeIds: ["cost", "supply", "litigation"],
      outcome: "in_process",
      poppedPositiveIds: [],
      poppedNegativeIds: ["toxicity"],
      stage: "phase-ii",
      viability: 48
    }
    const poppedIds: string[] = []

    spawnBodiesForGauntletEffect({
      project,
      effect: { popNegative: { candidates: ["litigation"], count: 1 } },
      controls: store.controls(),
      layout: buildLayout([720, 380], [], 30),
      positiveById: new Map(),
      negativeById: new Map([
        ["cost", { id: "cost", load: 1.1 }],
        ["supply", { id: "supply", load: 0.9 }],
        ["litigation", { id: "litigation", load: 1.2 }]
      ]),
      popBodies: (ids) => {
        poppedIds.push(...ids)
        return store.remove(ids)
      }
    })

    expect(poppedIds).toEqual([projectNegativeId("trial-1", "litigation", 3)])
    expect(store.readBodies().map((body) => body.id)).not.toContain(
      projectNegativeId("trial-1", "litigation", 3)
    )
  })

  it("net core force raises positive-heavy projects and sinks negative-heavy projects", () => {
    const layout = buildLayout([720, 380], [], 30)
    const sourceDatum = { id: "trial-1" }
    const coreBody = {
      id: projectCoreId("trial-1"),
      x: layout.startX,
      y: layout.routeY,
      prevX: layout.startX,
      prevY: layout.routeY,
      vx: 0,
      vy: 0,
      angle: 0,
      mass: 7,
      shape: { type: "circle" as const, radius: 28 },
      sleeping: false,
      datum: {
        __gauntlet: true,
        kind: "gauntlet-core",
        projectId: "trial-1",
        sourceDatum
      }
    }
    const baseProject: GauntletProjectState = {
      id: "trial-1",
      activePositiveIds: [],
      datum: sourceDatum,
      delay: 0,
      eventsApplied: [],
      killed: false,
      metrics: {},
      missingPositiveIds: [],
      negativeIds: [],
      outcome: "in_process",
      poppedPositiveIds: [],
      poppedNegativeIds: [],
      stage: "phase-ii",
      viability: 48
    }
    const forceFor = (activePositiveIds: string[], negativeIds: string[]) =>
      computeGauntletBodyForce({
        body: coreBody,
        bodies: [coreBody],
        layout,
        states: [{ ...baseProject, activePositiveIds, negativeIds }],
        projectPlacement: undefined,
        positiveById: new Map([
          ["p1", { id: "p1", buoyancy: 1 }],
          ["p2", { id: "p2", buoyancy: 1 }],
          ["p3", { id: "p3", buoyancy: 1 }]
        ]),
        negativeById: new Map([
          ["n1", { id: "n1", load: 1 }],
          ["n2", { id: "n2", load: 1 }],
          ["n3", { id: "n3", load: 1 }]
        ]),
        projectEvents: () => [{ id: "finish", time: 4, final: true }],
        gateById: new Map(),
        coreForceMode: "net",
        terminalBehavior: "hold-last",
        elapsed: 1
      })

    expect(forceFor(["p1", "p2", "p3"], ["n1"])?.y).toBeLessThan(0)
    expect(forceFor(["p1"], ["n1", "n2", "n3"])?.y).toBeGreaterThan(0)
  })
})
