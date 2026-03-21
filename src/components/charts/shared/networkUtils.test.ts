import { describe, it, expect, vi } from "vitest"
import { inferNodesFromEdges, createEdgeStyleFn } from "./networkUtils"

describe("inferNodesFromEdges", () => {
  const edges = [
    { source: "A", target: "B" },
    { source: "B", target: "C" },
  ]

  it("infers nodes when nodes is undefined", () => {
    const result = inferNodesFromEdges(undefined, edges, "source", "target")
    expect(result).toEqual([{ id: "A" }, { id: "B" }, { id: "C" }])
  })

  it("infers nodes when nodes is an empty array", () => {
    const result = inferNodesFromEdges([], edges, "source", "target")
    expect(result).toEqual([{ id: "A" }, { id: "B" }, { id: "C" }])
  })

  it("returns provided nodes when non-empty", () => {
    const nodes = [{ id: "X" }]
    const result = inferNodesFromEdges(nodes, edges, "source", "target")
    expect(result).toBe(nodes)
  })
})

describe("createEdgeStyleFn", () => {
  const defaultNodeStyleFn = vi.fn((d: any) => ({ fill: `color-${d.id}` }))
  const baseArgs = {
    colorBy: undefined as string | undefined,
    colorScale: undefined as ((v: string) => string) | undefined,
    nodeStyleFn: defaultNodeStyleFn,
    edgeOpacity: 0.6,
  }

  it('edgeColorBy="source" without colorBy falls back to nodeStyleFn', () => {
    const styleFn = createEdgeStyleFn({
      ...baseArgs,
      edgeColorBy: "source",
    })
    const edge = { source: { id: "A", index: 0 }, target: { id: "B", index: 1 } }
    const result = styleFn(edge)
    expect(defaultNodeStyleFn).toHaveBeenCalledWith(edge.source, 0)
    expect(result.fill).toBe("color-A")
    expect(result.fillOpacity).toBe(0.6)
  })

  it('edgeColorBy="target" without colorBy falls back to nodeStyleFn', () => {
    const nodeStyleFn = vi.fn((d: any) => ({ fill: `tgt-${d.id}` }))
    const styleFn = createEdgeStyleFn({
      ...baseArgs,
      edgeColorBy: "target",
      nodeStyleFn,
    })
    const edge = { source: { id: "A", index: 0 }, target: { id: "B", index: 1 } }
    const result = styleFn(edge)
    expect(nodeStyleFn).toHaveBeenCalledWith(edge.target, 1)
    expect(result.fill).toBe("tgt-B")
  })

  it('edgeColorBy="gradient" returns #999 with reduced opacity', () => {
    const styleFn = createEdgeStyleFn({
      ...baseArgs,
      edgeColorBy: "gradient",
    })
    const result = styleFn({ source: "A", target: "B" })
    expect(result.fill).toBe("#999")
    expect(result.fillOpacity).toBeCloseTo(0.6 * 0.7)
  })

  it("edgeColorBy as a function calls the function", () => {
    const customFn = (d: any) => `custom-${d.source}`
    const styleFn = createEdgeStyleFn({
      ...baseArgs,
      edgeColorBy: customFn,
    })
    const result = styleFn({ source: "A", target: "B" })
    expect(result.fill).toBe("custom-A")
  })

  it('edgeColorBy="source" when d.source is a string (not object) sets src to null', () => {
    const nodeStyleFn = vi.fn(() => ({ fill: "should-not-be-called" }))
    const styleFn = createEdgeStyleFn({
      ...baseArgs,
      edgeColorBy: "source",
      nodeStyleFn,
    })
    const result = styleFn({ source: "A", target: "B" })
    // src is null, so neither colorBy nor nodeStyleFn branch is hit
    expect(nodeStyleFn).not.toHaveBeenCalled()
    expect(result.fill).toBeUndefined()
    expect(result.fillOpacity).toBe(0.6)
  })
})
