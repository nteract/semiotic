import { describe, expect, it } from "vitest"
import { buildProcessSankeyScenes } from "./buildScenes"
import {
  cloneProcessSankeyWireDatum,
  toProcessSankeyWorkerRequest,
} from "./processSankeyLayoutAsync"
import { isHatchFill } from "../../shared/hatchFill"

const D = (y: number, m: number, d: number) => new Date(y, m - 1, d).getTime()
const DOMAIN: [number, number] = [D(2020, 1, 1), D(2021, 1, 1)]

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    nodes: [
      { id: "A", label: "A", __raw: { id: "A", status: "disputed", priority: 9 } },
      { id: "B", label: "B", __raw: { id: "B", status: "ok", priority: 1 } },
    ],
    edges: [
      {
        id: "e1",
        source: "A",
        target: "B",
        value: 3,
        startTime: D(2020, 3, 1),
        endTime: D(2020, 6, 1),
        __raw: { id: "e1", source: "A", target: "B", value: 3 },
      },
      // Duplicate edge id — fatal under static, warning under push.
      {
        id: "e1",
        source: "A",
        target: "B",
        value: 1,
        startTime: D(2020, 7, 1),
        endTime: D(2020, 9, 1),
        __raw: { id: "e1-dup", source: "A", target: "B", value: 1 },
      },
    ],
    domain: DOMAIN,
    plotW: 400,
    plotH: 300,
    ribbonLane: "both" as const,
    edgeOpacity: 0.4,
    colorOf: () => "#336699",
    layoutOpts: { packing: "off" as const, laneOrder: "insertion" as const },
    ...overrides,
  }
}

describe("ProcessSankey worker request parity", () => {
  it("clones plain author datums for the wire", () => {
    const raw = { id: "A", status: "disputed", nested: { n: 1 } }
    const cloned = cloneProcessSankeyWireDatum(raw)
    expect(cloned).toEqual(raw)
    expect(cloned).not.toBe(raw)
  })

  it("carries usageMode, selectionDatum, label density, and __raw on the wire", () => {
    const input = baseInput({
      usageMode: "push",
      selectionDatum: "scene",
      showLabels: "auto",
      labelPriorityAccessor: "priority",
      maxLabels: 2,
      styleRules: [
        {
          when: { field: "status", eq: "disputed" },
          style: {
            fill: {
              type: "hatch",
              background: "#fde68a",
              stroke: "#b45309",
            },
          },
        },
      ],
    })
    const request = toProcessSankeyWorkerRequest(input, { A: "#111", B: "#222" }, ["#333"])

    expect(request.input.usageMode).toBe("push")
    expect(request.input.selectionDatum).toBe("scene")
    expect(request.input.showLabels).toBe("auto")
    expect(request.input.labelPriorityAccessor).toBe("priority")
    expect(request.input.maxLabels).toBe(2)
    expect(request.input.nodes[0].__raw).toEqual({ id: "A", status: "disputed", priority: 9 })
    expect(request.input.edges[0].__raw).toEqual({
      id: "e1",
      source: "A",
      target: "B",
      value: 3,
    })
  })

  it("push usageMode keeps layout under duplicate edge ids (static is fatal)", () => {
    const staticResult = buildProcessSankeyScenes(baseInput({ usageMode: "static" }))
    expect(staticResult.layout).toBeNull()
    expect(staticResult.issues.some((i) => i.kind === "duplicate-edge" || i.kind === "duplicate-node")).toBe(true)

    const pushResult = buildProcessSankeyScenes(baseInput({ usageMode: "push" }))
    expect(pushResult.layout).not.toBeNull()
    // Wire request preserves push so the worker path matches.
    const wire = toProcessSankeyWorkerRequest(
      baseInput({ usageMode: "push" }),
      { A: "#111", B: "#222" },
      ["#333"],
    )
    expect(wire.input.usageMode).toBe("push")
    const workerShaped = buildProcessSankeyScenes({
      ...baseInput({ usageMode: wire.input.usageMode }),
      nodes: wire.input.nodes,
      edges: wire.input.edges,
      colorOf: (id, idx) => wire.colorById[id] ?? wire.fallbackPalette[idx % wire.fallbackPalette.length]!,
    })
    expect(workerShaped.layout).not.toBeNull()
  })

  it("declarative styleRules still hatch after __raw is cloned for the worker", () => {
    const input = baseInput({
      usageMode: "push",
      styleRules: [
        {
          when: { field: "status", eq: "disputed" },
          style: {
            fill: {
              type: "hatch",
              background: "#fde68a",
              stroke: "#b45309",
              spacing: 5,
            },
          },
        },
      ],
    })
    // Drop the second edge so layout is clean under either usage mode.
    input.edges = [input.edges[0]]

    const sync = buildProcessSankeyScenes(input)
    const disputedSync = sync.layoutConfig.bands.find((b) => b.id === "A")
    expect(isHatchFill(disputedSync?.hatchFill)).toBe(true)

    const wire = toProcessSankeyWorkerRequest(input, { A: "#111", B: "#222" }, ["#333"])
    const fromWire = buildProcessSankeyScenes({
      ...input,
      nodes: wire.input.nodes,
      edges: wire.input.edges,
      styleRules: wire.input.styleRules,
      usageMode: wire.input.usageMode,
      colorOf: (id, idx) => wire.colorById[id] ?? wire.fallbackPalette[idx % wire.fallbackPalette.length]!,
    })
    const disputedWire = fromWire.layoutConfig.bands.find((b) => b.id === "A")
    expect(isHatchFill(disputedWire?.hatchFill)).toBe(true)
    expect(disputedWire?.hatchFill?.background).toBe("#fde68a")
  })
})
