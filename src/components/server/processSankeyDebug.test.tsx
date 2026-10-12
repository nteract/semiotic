// @vitest-environment node
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ProcessSankey } from "../charts/network/ProcessSankey"
import { computeProcessSankeyLayout } from "../charts/network/processSankey/algorithm"
import { renderChart } from "./renderToStaticSVG"

const nodes = Array.from({ length: 8 }, (_, i) => ({ id: String(i) }))
const edges = nodes.slice(1).map((node, i) => ({
  id: `edge-${i}`,
  source: "0",
  target: node.id,
  value: 1,
  startTime: 1,
  endTime: 2
}))
const props = {
  nodes,
  edges,
  domain: [0, 3] as [number, number],
  width: 300,
  height: 90,
  margin: { top: 10, bottom: 10, left: 10, right: 10 },
  orientation: "horizontal" as const,
  packing: "off" as const
}

describe("ProcessSankey diagnostic chrome", () => {
  it("uses a fixture that compresses lane padding", () => {
    expect(
      computeProcessSankeyLayout(nodes, edges, {
        plotH: 70,
        packing: "off",
        domain: props.domain
      }).compressedPadding
    ).toBe(true)
  })

  it.each([false, true])(
    "respects showQualityReadout=%s in HOC and standalone SVG",
    (showQualityReadout) => {
      const surfaces = [
        renderToStaticMarkup(
          <ProcessSankey {...props} showQualityReadout={showQualityReadout} />
        ),
        renderChart("ProcessSankey", { ...props, showQualityReadout })
      ]
      for (const svg of surfaces) {
        expect(svg.includes("dense layout: lane gaps compressed")).toBe(
          showQualityReadout
        )
        expect(svg.includes("crossings:")).toBe(showQualityReadout)
        expect(svg).toContain("<path")
      }
    }
  )
})
