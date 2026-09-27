import { describe, expect, it, vi } from "vitest"
import { axisFixedForceLayout, axisFixedForcePositions } from "./axisFixedForce"
import { netEnsembleLayout } from "./netEnsembleLayout"
import { transitDiagramLayout } from "./transitDiagram"
import { renderChartWithEvidence } from "../server/renderToStaticSVG"
import type { Datum } from "../charts/shared/datumTypes"
import type { NetworkCustomLayout } from "../stream/networkCustomLayout"

const nodes = [{ id: "a", year: 0 }, { id: "b", year: 1 }, { id: "c", year: 2 }]
const edges = [{ source: "a", target: "b" }, { source: "b", target: "c" }]
const config = { fixedAccessor: "year", fixedDomain: [0, 2] as [number, number] }

it("resolves force endpoint callbacks once per edge against raw records, including their own data field", () => {
  const sourceAccessor = vi.fn((datum: Datum) => String(datum.source))
  const targetAccessor = vi.fn((datum: Datum) => String(datum.target))
  const fixedAccessor = vi.fn((datum: Datum) => Number(datum.year))
  const plot = { x: 0, y: 0, width: 600, height: 400 }
  const rawNodes = nodes.map((node) => ({ ...node, data: { metadata: true } }))
  const rawEdges = edges.map((edge) => ({ ...edge, data: { metadata: true } }))
  const result = axisFixedForcePositions(rawNodes, rawEdges, plot, {
    ...config, fixedAccessor, sourceAccessor, targetAccessor,
  })
  expect(result.positioned.map(({ id, x, y }) => ({ id, x, y }))).toEqual(
    axisFixedForcePositions(nodes, edges, plot, config).positioned.map(({ id, x, y }) => ({ id, x, y })))
  expect(sourceAccessor).toHaveBeenCalledTimes(edges.length)
  expect(targetAccessor).toHaveBeenCalledTimes(edges.length)
  expect(fixedAccessor).toHaveBeenCalledTimes(nodes.length)
  expect(sourceAccessor).toHaveBeenCalledWith(rawEdges[0])
})

describe("network recipe static rendering", () => {
  const recipes: Array<[string, NetworkCustomLayout]> = [
    ["force", (ctx) => axisFixedForceLayout({ ...ctx, config: {
      ...config, fixedAccessor: (datum: Datum) => Number(datum.year),
      sourceAccessor: (datum: Datum) => String(datum.source),
      targetAccessor: (datum: Datum) => String(datum.target),
    } })],
    ["ensemble", (ctx) => netEnsembleLayout({ ...ctx, config: { showLegend: false } })],
    ["transit", (ctx) => transitDiagramLayout({ ...ctx, config: { layoutMode: "automatic" } })],
  ]
  it.each(recipes)("renders finite %s marks through the server entry", (_name, layout) => {
    const result = renderChartWithEvidence("NetworkCustomChart", {
      nodes, edges, layout, width: 600, height: 400, title: "Network", description: "Three connected nodes",
    })
    expect(result.svg).not.toMatch(/NaN|Infinity/)
    expect(result.evidence.markCount).toBeGreaterThanOrEqual(_name === "force" ? 5 : 3)
    expect(result.svg).toContain("Network")
  })
})

describe("axis-fixed force invalid values (#1400)", () => {
  it.each(["x", "y"] as const)("omits invalid %s values and incident edges in pure, frame, and static layouts", (fixedAxis) => {
    const invalid = [undefined, null, "", " ", "bad", NaN, Infinity, -Infinity]
    const input = [...nodes, ...invalid.map((year, i) => ({ id: `invalid-${i}`, year }))]
    const links = [...edges, ...invalid.map((_, i) => ({ source: "a", target: `invalid-${i}` }))]
    const plot = { x: 0, y: 0, width: 600, height: 400 }
    for (const fixedAccessor of ["year", (datum: Datum) => datum.year as number]) {
      const options = { ...config, fixedAxis, fixedAccessor }
      const positioned = axisFixedForcePositions(input, links, plot, options)
      expect(positioned.positioned.map((node) => node.id)).toEqual(["a", "b", "c"])
      expect(positioned.positioned).toEqual(axisFixedForcePositions(nodes, edges, plot, options).positioned)
      expect(positioned.positioned.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y))).toBe(true)
      const result = renderChartWithEvidence("NetworkCustomChart", {
        nodes: input, edges: links, width: 600, height: 400,
        layout: (ctx: Parameters<NetworkCustomLayout>[0]) => axisFixedForceLayout({ ...ctx, config: options }),
      })
      expect(result.svg).not.toMatch(/NaN|Infinity/)
      expect(result.evidence.markCount).toBe(5)
    }
    expect(axisFixedForcePositions(input.slice(3), links, plot, config).positioned).toEqual([])
    expect(axisFixedForcePositions(nodes, edges, plot, { ...config, fixedDomain: [NaN, 2] }).positioned).toEqual([])
    expect(axisFixedForcePositions(nodes, edges, plot, { ...config, size: () => ({ width: NaN, height: 10 }) }).positioned).toEqual([])
  })
})
