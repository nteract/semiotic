import { describe, expect, it, vi } from "vitest"
import type { Datum } from "../charts/shared/datumTypes"
import type { SerializedSelections } from "../export/selectionSerializer"
import { buildNavigationTree } from "./navigationTree"
import { buildRuntimeModelBase, createRefs } from "./vacpAdapterModel"
import {
  SEMIOTIC_VACP_ACTIVATE_NAVIGATION_ACTION,
  SEMIOTIC_VACP_CLEAR_SELECTION_ACTION,
  SEMIOTIC_VACP_INSPECT_DATA_ACTION,
  SEMIOTIC_VACP_SET_INTERVAL_SELECTION_ACTION,
  SEMIOTIC_VACP_SET_POINT_SELECTION_ACTION,
  createSemioticVACPBridge,
  installSemioticVACPBridge,
  type SemioticVACPChart,
} from "./vacpAdapter"
import {
  VACP_DATA_SCHEMA_ACTION,
  VACP_SCHEMA_VERSION,
  type VacpRef,
  type VacpStateUpdate,
} from "./vacpTypes"

const NOW = "2026-07-25T12:00:00.000Z"
const sales = [
  { month: "Jan", sales: 4200, region: "East" },
  { month: "Feb", sales: 5100, region: "West" },
  { month: "Mar", sales: 6800, region: "East" },
]

function chart(
  overrides: Partial<SemioticVACPChart> = {}
): SemioticVACPChart {
  return {
    chartId: "sales",
    component: "LineChart",
    title: "Monthly sales",
    props: {
      data: sales,
      xAccessor: "month",
      yAccessor: "sales",
      lineBy: "region",
      title: "Monthly sales",
    },
    audience: {
      name: "Operations agents",
      familiarity: { LineChart: 5 },
      receptionModality: "agent",
    },
    ...overrides,
  }
}

function stateUpdate(
  value: Awaited<ReturnType<ReturnType<typeof createSemioticVACPBridge>["getState"]>>
): VacpStateUpdate {
  if (!("mode" in value)) throw new Error("Expected a VACP state update.")
  return value
}

describe("createSemioticVACPBridge capabilities", () => {
  it("maps chart grounding, config, encodings, and bounded data handles to a valid 0.1.0 graph", () => {
    const bridge = createSemioticVACPBridge({
      appId: "revenue-app",
      viewId: "quarterly-review",
      title: "Revenue review",
      charts: [chart()],
      now: () => NOW,
    })

    const snapshot = bridge.getCapabilities()
    expect(snapshot.version).toBe(VACP_SCHEMA_VERSION)
    expect(snapshot.createdAt).toBe(NOW)
    expect(snapshot.graph.version).toBe("0.1.0")
    expect(bridge.refs.app).toBe("vacp://revenue-app")
    expect(bridge.refs.visualization("sales")).toBe(
      "vacp://revenue-app/view/quarterly-review/visualization/sales"
    )

    const refs = new Set(snapshot.graph.nodes.map((node) => node.ref))
    expect(snapshot.graph.nodes.map((node) => node.kind)).toEqual(
      expect.arrayContaining([
        "App",
        "View",
        "Visualization",
        "Param",
        "EncodingChannel",
        "Axis",
        "DataHandle",
      ])
    )
    for (const edge of snapshot.graph.edges) {
      expect(refs.has(edge.from), `edge source ${edge.from}`).toBe(true)
      expect(refs.has(edge.to), `edge target ${edge.to}`).toBe(true)
    }
    for (const action of snapshot.graph.actions) {
      if (action.targetRef) {
        expect(refs.has(action.targetRef), `action target ${action.targetRef}`).toBe(
          true
        )
      }
    }

    const visualization = snapshot.graph.nodes.find(
      (node) => node.ref === bridge.refs.visualization("sales")
    )
    expect(visualization?.data?.component).toBe("LineChart")
    expect(visualization?.data?.audience).toMatchObject({
      name: "Operations agents",
      receptionModality: "agent",
    })
    expect(JSON.stringify(visualization?.data?.grounding)).toContain(
      "line chart"
    )

    const config = snapshot.graph.nodes.find(
      (node) => node.ref === bridge.refs.config("sales")
    )
    expect(config?.data?.component).toBe("LineChart")
    expect((config?.data?.props as Datum).data).toBeUndefined()
    expect((config?.data?.props as Datum).xAccessor).toBe("month")

    const handle = snapshot.graph.nodes.find(
      (node) => node.ref === bridge.refs.data("sales")
    )
    expect(handle?.data).toMatchObject({
      collection: "data",
      rowCount: 3,
      schemaAction: VACP_DATA_SCHEMA_ACTION,
    })
    expect(JSON.stringify(snapshot.graph)).not.toContain(
      '"month":"Jan","sales":4200'
    )
  })

  it("caps capability grounding at one representative leaf per branch", () => {
    const options = {
      appId: "bounded-grounding",
      charts: [chart({ grounding: { maxLeaves: 100 } })],
      now: () => NOW,
    }
    const model = buildRuntimeModelBase(
      options,
      createRefs(options.appId, "main")
    )

    expect(JSON.stringify(model.charts[0]?.grounding.structure)).toContain(
      "…and 1 more points"
    )
  })

  it("keeps semantic refs stable across chart and row reordering", () => {
    const first = chart()
    const second = chart({
      chartId: "profit",
      title: "Monthly profit",
      props: {
        data: sales,
        xAccessor: "month",
        yAccessor: "sales",
      },
    })
    let charts = [first, second]
    const bridge = createSemioticVACPBridge({
      appId: "finance",
      charts: () => charts,
      now: () => NOW,
    })

    const before = bridge
      .getCapabilities()
      .graph.nodes.map((node) => node.ref)
      .sort()
    charts = [
      { ...second, props: { ...second.props, data: [...sales].reverse() } },
      { ...first, props: { ...first.props, data: [...sales].reverse() } },
    ]
    const after = bridge
      .getCapabilities()
      .graph.nodes.map((node) => node.ref)
      .sort()
    expect(after).toEqual(before)
  })

  it("supports capability scoping and can omit edges, actions, and node data", () => {
    const bridge = createSemioticVACPBridge({
      appId: "scoped",
      charts: [chart()],
      now: () => NOW,
    })
    const scoped = bridge.getCapabilities({
      prefixes: [bridge.refs.visualization("sales")],
      includeActions: false,
      includeEdges: false,
      includeNodeData: false,
    })

    expect(scoped.graph.nodes.length).toBeGreaterThan(2)
    expect(
      scoped.graph.nodes.every((node) =>
        node.ref.startsWith(`${bridge.refs.visualization("sales")}`)
      )
    ).toBe(true)
    expect(scoped.graph.nodes.every((node) => node.data === undefined)).toBe(
      true
    )
    expect(scoped.graph.actions).toEqual([])
    expect(scoped.graph.edges).toEqual([])
  })

  it("rejects duplicate chart identities rather than producing ambiguous refs", () => {
    const bridge = createSemioticVACPBridge({
      appId: "duplicate",
      charts: [chart(), chart()],
    })
    expect(() => bridge.getCapabilities()).toThrow(
      'Duplicate VACP chartId "sales".'
    )
  })

  it("rejects duplicate stable annotation identities rather than emitting duplicate refs", () => {
    const bridge = createSemioticVACPBridge({
      appId: "duplicate-annotations",
      charts: [
        chart({
          props: {
            data: sales,
            xAccessor: "month",
            yAccessor: "sales",
            annotations: [
              { id: "peak", month: "Feb", sales: 5100 },
              { stableId: "peak", month: "Mar", sales: 6800 },
            ],
          },
        }),
      ],
    })
    expect(() => bridge.getCapabilities()).toThrow(
      'Duplicate stable annotation id "peak" in VACP chart "sales".'
    )
  })
})

describe("VACP data handles", () => {
  it("exposes exact data schema but keeps raw sampling opt-in", async () => {
    const bridge = createSemioticVACPBridge({
      appId: "schema",
      charts: [chart()],
      now: () => NOW,
    })
    const actions = bridge
      .getCapabilities()
      .graph.actions.map((action) => action.name)
    expect(actions).toContain(VACP_DATA_SCHEMA_ACTION)
    expect(actions).not.toContain(SEMIOTIC_VACP_INSPECT_DATA_ACTION)

    const result = await bridge.execute({
      callId: "schema-1",
      name: VACP_DATA_SCHEMA_ACTION,
      params: {
        handleRef: bridge.refs.data("sales"),
        detail: "full",
        sampleRows: 3,
      },
    })
    expect(result).toMatchObject({
      callId: "schema-1",
      ok: true,
      result: {
        handleRef: bridge.refs.data("sales"),
        detail: "full",
        table: null,
        rowCount: 3,
        sampledRows: 3,
      },
    })
    if (result.ok) {
      expect(result.result).toMatchObject({
        columns: [
          { name: "month", type: "VARCHAR" },
          { name: "region", type: "VARCHAR" },
          { name: "sales", type: "DOUBLE" },
        ],
        numeric: {
          sales: { min: 4200, max: 6800, avg: 5366.666666666667 },
        },
      })
    }
  })

  it("discovers sparse columns across all rows while bounding full summaries", async () => {
    const sparseRows = [
      { id: 1, value: 10 },
      { id: 2, value: 20 },
      { id: 3, value: 30, lateField: "present" },
    ]
    const bridge = createSemioticVACPBridge({
      appId: "sparse-schema",
      charts: [
        chart({
          props: {
            data: sparseRows,
            xAccessor: "id",
            yAccessor: "value",
          },
        }),
      ],
      dataAccess: { maxSchemaRows: 1 },
      now: () => NOW,
    })
    const result = await bridge.execute({
      callId: "schema-sparse",
      name: VACP_DATA_SCHEMA_ACTION,
      params: {
        handleRef: bridge.refs.data("sales"),
        detail: "full",
        sampleRows: 100,
      },
    })
    expect(result).toMatchObject({
      ok: true,
      result: {
        sampledRows: 1,
        columns: expect.arrayContaining([
          { name: "lateField", type: "VARCHAR" },
        ]),
      },
    })
  })

  it("bounds the explicit data-sample action and reports truncation", async () => {
    const bridge = createSemioticVACPBridge({
      appId: "sample",
      charts: [chart()],
      dataAccess: { sample: true, maxSampleRows: 2 },
      now: () => NOW,
    })
    expect(
      bridge
        .getCapabilities()
        .graph.actions.some(
          (action) => action.name === SEMIOTIC_VACP_INSPECT_DATA_ACTION
        )
    ).toBe(true)

    const result = await bridge.execute({
      callId: "sample-1",
      name: SEMIOTIC_VACP_INSPECT_DATA_ACTION,
      params: {
        handleRef: bridge.refs.data("sales"),
        offset: 1,
        limit: 500,
      },
    })
    expect(result).toMatchObject({
      ok: true,
      result: {
        offset: 1,
        limit: 2,
        rowCount: 3,
        rows: [sales[1], sales[2]],
        truncated: false,
      },
    })
  })
})

describe("VACP selection state and execution", () => {
  it("validates point/interval mutations, exposes live state, and clears the named store", async () => {
    let selections: SerializedSelections = {}
    const setPoint = vi.fn(
      (name: string, clientId: string, fields: Record<string, unknown[]>) => {
        selections = {
          ...selections,
          [name]: {
            name,
            resolution: "union",
            clauses: [
              {
                clientId,
                type: "point",
                fields: Object.fromEntries(
                  Object.entries(fields).map(([field, values]) => [
                    field,
                    { type: "point" as const, values },
                  ])
                ),
              },
            ],
          },
        }
      }
    )
    const setInterval = vi.fn(
      (
        name: string,
        clientId: string,
        fields: Record<string, [number, number]>
      ) => {
        selections = {
          ...selections,
          [name]: {
            name,
            resolution: "crossfilter",
            clauses: [
              {
                clientId,
                type: "interval",
                fields: Object.fromEntries(
                  Object.entries(fields).map(([field, range]) => [
                    field,
                    { type: "interval" as const, range },
                  ])
                ),
              },
            ],
          },
        }
      }
    )
    const clear = vi.fn((name: string) => {
      selections = {
        ...selections,
        [name]: {
          name,
          resolution: selections[name]?.resolution ?? "union",
          clauses: [],
        },
      }
    })

    const bridge = createSemioticVACPBridge({
      appId: "selections",
      charts: [
        chart({
          selections: [
            {
              name: "focus",
              fields: ["region", "sales"],
              mode: "both",
            },
          ],
        }),
      ],
      getSelections: () => selections,
      selectionActions: {
        setPointSelection: setPoint,
        setIntervalSelection: setInterval,
        clearSelection: clear,
      },
      now: () => NOW,
    })
    const selectionRef = bridge.refs.selection("focus")
    expect(
      bridge
        .getCapabilities()
        .graph.actions.map((action) => action.name)
    ).toEqual(
      expect.arrayContaining([
        SEMIOTIC_VACP_SET_POINT_SELECTION_ACTION,
        SEMIOTIC_VACP_SET_INTERVAL_SELECTION_ACTION,
        SEMIOTIC_VACP_CLEAR_SELECTION_ACTION,
      ])
    )

    const invalid = await bridge.execute({
      callId: "invalid",
      name: SEMIOTIC_VACP_SET_POINT_SELECTION_ACTION,
      params: {
        selectionRef,
        fields: { undeclared: ["x"] },
      },
    })
    expect(invalid).toMatchObject({
      callId: "invalid",
      ok: false,
      error: {
        message: expect.stringContaining(
          'Field "undeclared" is not allowed'
        ),
      },
    })
    expect(setPoint).not.toHaveBeenCalled()

    expect(
      await bridge.execute({
        callId: "point",
        name: SEMIOTIC_VACP_SET_POINT_SELECTION_ACTION,
        params: {
          selectionRef,
          fields: { region: ["East"] },
        },
      })
    ).toMatchObject({ callId: "point", ok: true })
    expect(setPoint).toHaveBeenCalledWith(
      "focus",
      "__semiotic-vacp__:focus",
      { region: ["East"] }
    )
    expect((await bridge.getState()).state[selectionRef]).toMatchObject({
      clauses: [{ type: "point" }],
    })

    expect(
      await bridge.execute({
        callId: "interval",
        name: SEMIOTIC_VACP_SET_INTERVAL_SELECTION_ACTION,
        params: {
          selectionRef,
          fields: { sales: [7000, 4000] },
        },
      })
    ).toMatchObject({
      ok: true,
      result: { fields: { sales: [4000, 7000] } },
    })
    expect(setInterval).toHaveBeenCalledWith(
      "focus",
      "__semiotic-vacp__:focus",
      { sales: [4000, 7000] }
    )

    expect(
      await bridge.execute({
        callId: "clear",
        name: SEMIOTIC_VACP_CLEAR_SELECTION_ACTION,
        params: { selectionRef },
      })
    ).toMatchObject({ ok: true, result: { cleared: true } })
    expect(clear).toHaveBeenCalledWith("focus")
    expect((await bridge.getState()).state[selectionRef]).toMatchObject({
      clauses: [],
    })
  })

  it("recomputes currently valid actions and refuses a stale action without mutation", async () => {
    let enabled = true
    const mutate = vi.fn()
    const bridge = createSemioticVACPBridge({
      appId: "dynamic",
      charts: () => [
        chart({
          selections: enabled
            ? [{ name: "focus", fields: ["region"], mode: "point" }]
            : [],
        }),
      ],
      selectionActions: { setPointSelection: mutate },
    })
    expect(
      bridge
        .getCapabilities()
        .graph.actions.some(
          (action) =>
            action.name === SEMIOTIC_VACP_SET_POINT_SELECTION_ACTION
        )
    ).toBe(true)

    enabled = false
    const result = await bridge.execute({
      callId: "stale",
      name: SEMIOTIC_VACP_SET_POINT_SELECTION_ACTION,
      params: {
        selectionRef: bridge.refs.selection("focus"),
        fields: { region: ["East"] },
      },
    })
    expect(result).toMatchObject({
      callId: "stale",
      ok: false,
      error: { message: expect.stringContaining("currently unavailable") },
    })
    expect(mutate).not.toHaveBeenCalled()
  })
})

describe("VACP state updates", () => {
  it("returns deterministic scoped full tokens followed by structural deltas", async () => {
    let selections: SerializedSelections = {}
    let tick = 0
    const bridge = createSemioticVACPBridge({
      appId: "deltas",
      charts: [
        chart({
          selections: [
            { name: "focus", fields: ["region"], mode: "point" },
          ],
        }),
      ],
      getSelections: () => selections,
      now: () => new Date(Date.parse(NOW) + tick++ * 1000),
    })
    const selectionRef = bridge.refs.selection("focus")
    const first = stateUpdate(
      await bridge.getState({
        mode: "full",
        refs: [selectionRef],
        includeSummary: false,
      })
    )
    expect(first.mode).toBe("full")
    if (first.mode !== "full") throw new Error("Expected full state.")
    expect(Object.keys(first.snapshot.state)).toEqual([selectionRef])
    expect(first.snapshot.summary).toBeUndefined()

    const same = stateUpdate(
      await bridge.getState({
        mode: "full",
        refs: [selectionRef],
        includeSummary: false,
      })
    )
    expect(same.token).toBe(first.token)

    selections = {
      focus: {
        name: "focus",
        resolution: "union",
        clauses: [
          {
            clientId: "human",
            type: "point",
            fields: {
              region: { type: "point", values: ["West"] },
            },
          },
        ],
      },
    }
    const delta = stateUpdate(
      await bridge.getState({
        mode: "delta",
        since: first.token,
        refs: [selectionRef],
        includeSummary: false,
      })
    )
    expect(delta.mode).toBe("delta")
    if (delta.mode !== "delta") throw new Error("Expected delta state.")
    expect(delta.baseToken).toBe(first.token)
    expect(delta.token).not.toBe(first.token)
    expect(delta.delta.changed[selectionRef]).toMatchObject({
      clauses: [{ clientId: "human" }],
    })
    expect(delta.delta.removed).toEqual([])
    expect(delta.delta.summaryChanged).toBeUndefined()

    const unknownBaseline = stateUpdate(
      await bridge.getState({
        mode: "delta",
        since: "st_unknown",
        refs: [selectionRef],
      })
    )
    expect(unknownBaseline.mode).toBe("full")
  })

  it("treats a container ref as a descendant-state scope", async () => {
    const bridge = createSemioticVACPBridge({
      appId: "scope-state",
      charts: [chart()],
      now: () => NOW,
    })
    const update = stateUpdate(
      await bridge.getState({
        mode: "full",
        refs: [bridge.refs.visualization("sales")],
      })
    )
    if (update.mode !== "full") throw new Error("Expected full state.")
    const keys = Object.keys(update.snapshot.state)
    expect(keys).toContain(bridge.refs.visualization("sales"))
    expect(keys).toContain(bridge.refs.config("sales"))
    expect(keys).toContain(bridge.refs.data("sales"))
    expect(
      keys.every((key) =>
        key.startsWith(`${bridge.refs.visualization("sales")}`)
      )
    ).toBe(true)
  })
})

describe("VACP semantic navigation", () => {
  it("activates unique durable datum matches and keeps target refs stable after reordering", async () => {
    let rows = sales
    let tree = buildNavigationTree("LineChart", {
      data: rows,
      xAccessor: "month",
      yAccessor: "sales",
    })
    let activeId = tree.id
    const activated: string[] = []
    const bridge = createSemioticVACPBridge({
      appId: "navigation",
      charts: () => [
        chart({
          props: {
            data: rows,
            xAccessor: "month",
            yAccessor: "sales",
          },
          navigation: {
            tree,
            activeId,
            matchFields: ["month"],
            onActiveChange(node) {
              activeId = node.id
              activated.push(node.label)
            },
          },
        }),
      ],
      now: () => NOW,
    })

    const first = await bridge.execute({
      callId: "nav-1",
      name: SEMIOTIC_VACP_ACTIVATE_NAVIGATION_ACTION,
      params: {
        navigationRef: bridge.refs.navigation("sales"),
        match: { month: "Feb" },
      },
    })
    expect(first).toMatchObject({
      ok: true,
      result: {
        navigationRef: bridge.refs.navigation("sales"),
        match: { month: "Feb" },
      },
    })
    expect(activated).toEqual(["Feb: 5,100"])
    const firstTarget =
      first.ok && (first.result as { targetRef?: VacpRef }).targetRef

    rows = [...sales].reverse()
    tree = buildNavigationTree("LineChart", {
      data: rows,
      xAccessor: "month",
      yAccessor: "sales",
    })
    const second = await bridge.execute({
      callId: "nav-2",
      name: SEMIOTIC_VACP_ACTIVATE_NAVIGATION_ACTION,
      params: {
        navigationRef: bridge.refs.navigation("sales"),
        match: { month: "Feb" },
      },
    })
    expect(second.ok).toBe(true)
    const secondTarget =
      second.ok && (second.result as { targetRef?: VacpRef }).targetRef
    expect(secondTarget).toBe(firstTarget)

    const navigationState = (await bridge.getState()).state[
      bridge.refs.navigation("sales")
    ]
    expect(navigationState).toMatchObject({
      status: "ready",
      activeMatch: { month: "Feb" },
      activeTargetRef: firstTarget,
    })
  })

  it("suppresses the mutation action when match fields are missing or collide", () => {
    const duplicateRows = [
      { month: "Jan", sales: 10 },
      { month: "Jan", sales: 20 },
    ]
    const tree = buildNavigationTree("LineChart", {
      data: duplicateRows,
      xAccessor: "month",
      yAccessor: "sales",
    })
    const bridge = createSemioticVACPBridge({
      appId: "ambiguous-navigation",
      charts: [
        chart({
          props: {
            data: duplicateRows,
            xAccessor: "month",
            yAccessor: "sales",
          },
          navigation: {
            tree,
            matchFields: ["month"],
            onActiveChange: vi.fn(),
          },
        }),
      ],
      now: () => NOW,
    })
    const capabilities = bridge.getCapabilities()
    expect(
      capabilities.graph.actions.some(
        (action) =>
          action.name === SEMIOTIC_VACP_ACTIVATE_NAVIGATION_ACTION
      )
    ).toBe(false)
    const node = capabilities.graph.nodes.find(
      (candidate) => candidate.ref === bridge.refs.navigation("sales")
    )
    expect(node?.data).toMatchObject({
      status: "ambiguous",
      targetCount: 1,
    })
    expect(node?.description).toContain("do not uniquely identify")

    const nonJsonTree = buildNavigationTree("LineChart", {
      data: [{ month: Number.NaN, sales: 10 }],
      xAccessor: "month",
      yAccessor: "sales",
    })
    const nonJsonBridge = createSemioticVACPBridge({
      appId: "non-json-navigation",
      charts: [
        chart({
          props: {
            data: [{ month: Number.NaN, sales: 10 }],
            xAccessor: "month",
            yAccessor: "sales",
          },
          navigation: {
            tree: nonJsonTree,
            matchFields: ["month"],
            onActiveChange: vi.fn(),
          },
        }),
      ],
      now: () => NOW,
    })
    expect(
      nonJsonBridge
        .getCapabilities()
        .graph.actions.some(
          (action) =>
            action.name === SEMIOTIC_VACP_ACTIVATE_NAVIGATION_ACTION
        )
    ).toBe(false)
  })
})

describe("VACP action and installation lifecycle", () => {
  it("returns structured errors with the original call id and supports dynamic custom actions", async () => {
    let available = true
    const bridge = createSemioticVACPBridge({
      appId: "custom",
      charts: [chart()],
      actions: () => [
        {
          descriptor: {
            name: "semiotic.set_threshold",
            description: "Set a test threshold.",
            targetRef: `vacp://custom/view/main/visualization/sales`,
          },
          available: () => available,
          validate: (params) =>
            Number.isFinite((params as { value?: number })?.value)
              ? undefined
              : "value must be finite",
          execute: (params) => ({ accepted: (params as { value: number }).value }),
        },
      ],
      now: () => NOW,
    })
    expect(
      await bridge.execute({
        callId: "custom-bad",
        name: "semiotic.set_threshold",
        params: { value: "high" },
      })
    ).toEqual({
      callId: "custom-bad",
      ok: false,
      error: { message: "value must be finite" },
    })
    expect(
      await bridge.execute({
        callId: "custom-good",
        name: "semiotic.set_threshold",
        params: { value: 42 },
      })
    ).toEqual({
      callId: "custom-good",
      ok: true,
      result: { accepted: 42 },
    })

    available = false
    const stale = await bridge.execute({
      callId: "custom-stale",
      name: "semiotic.set_threshold",
      params: { value: 42 },
    })
    expect(stale).toMatchObject({
      callId: "custom-stale",
      ok: false,
      error: { message: expect.stringContaining("currently unavailable") },
    })
  })

  it("refuses to clobber a foreign global and only cleans up its own bridge", () => {
    const bridge = createSemioticVACPBridge({
      appId: "installation",
      charts: [chart()],
    })
    const foreign = { version: "foreign" }
    const occupied: Record<string, unknown> = { __vacp: foreign }
    const refused = installSemioticVACPBridge(bridge, { target: occupied })
    expect(refused.installed).toBe(false)
    expect(refused.reason).toContain("Refused to replace")
    expect(occupied.__vacp).toBe(foreign)
    expect(refused.cleanup()).toBe(false)

    const target: Record<string, unknown> = {}
    const installed = installSemioticVACPBridge(bridge, { target })
    expect(installed.installed).toBe(true)
    expect(target.__vacp).toBe(bridge)
    target.__vacp = foreign
    expect(installed.cleanup()).toBe(false)
    expect(target.__vacp).toBe(foreign)

    delete target.__vacp
    const owned = installSemioticVACPBridge(bridge, { target })
    expect(owned.cleanup()).toBe(true)
    expect(target.__vacp).toBeUndefined()
  })
})
