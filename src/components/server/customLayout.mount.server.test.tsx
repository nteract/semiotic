import { describe, expect, it, vi } from "vitest"
import { renderChartWithEvidence } from "semiotic/server"
import type { NetworkCustomLayout } from "../stream/networkCustomLayout"

describe("static custom-layout work", () => {
  it("runs a network layout once per render with real data and emits evidence", () => {
    const layout = vi.fn<NetworkCustomLayout>((ctx) => ({
      sceneNodes: ctx.nodes.map((node, i) => ({
        type: "circle",
        cx: 40 + i * 60,
        cy: 50,
        r: 8,
        style: { fill: ctx.resolveColor(node.id) },
        datum: node,
        id: node.id
      }))
    }))
    const config = {
      nodes: [{ id: "a" }, { id: "b" }],
      edges: [{ source: "a", target: "b" }],
      layout,
      width: 400,
      height: 300,
      title: "Custom graph",
      description: "Two connected nodes"
    }
    const first = renderChartWithEvidence("NetworkCustomChart", config)
    expect(layout).toHaveBeenCalledTimes(1)
    expect(layout.mock.calls[0][0].nodes).toHaveLength(2)
    expect(first.evidence.markCount).toBe(2)
    expect(first.svg.match(/<circle\b/g)).toHaveLength(2)
    const second = renderChartWithEvidence("NetworkCustomChart", config)
    expect(layout).toHaveBeenCalledTimes(2)
    expect(second.evidence.markCount).toBe(2)
  })
})
