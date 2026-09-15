import * as React from "react"
import { useState } from "react"
import { NetworkCustomChart } from "../../dist/network.module.min.js"
import type { NetworkCustomLayout } from "../../src/components/stream/networkCustomLayout"

type LayoutCall = {
  width: number
  height: number
  nodes: number
  edges: number
}
declare global {
  interface Window {
    mountLayoutCalls: Record<string, LayoutCall[]>
    xyMountLayoutCalls: Record<string, LayoutCall[]>
  }
}
window.mountLayoutCalls = { fixed: [], responsive: [] }

const margin = { top: 0, right: 0, bottom: 0, left: 0 }
const fixedNodes = Array.from({ length: 52 }, (_, i) => ({ id: String(i) }))
const fixedEdges = Array.from({ length: 53 }, (_, i) => ({
  source: String(i % 51),
  target: String((i % 51) + 1)
}))
const smallNodes = fixedNodes.slice(0, 6)
const smallEdges = fixedEdges.slice(0, 5)
const makeLayout =
  (name: string): NetworkCustomLayout =>
  (ctx) => {
    window.mountLayoutCalls[name].push({
      width: ctx.dimensions.width,
      height: ctx.dimensions.height,
      nodes: ctx.nodes.length,
      edges: ctx.edges.length
    })
    return {
      sceneNodes: ctx.nodes.map((node, i) => ({
        type: "circle",
        id: node.id,
        cx: ctx.dimensions.width / 2,
        cy: 15 + i * 5,
        r: 2,
        style: { fill: "#2468ab" },
        datum: node
      })),
      overlays: (
        <text data-testid={`${name}-layout-width`} x={4} y={12}>
          {ctx.dimensions.width}
        </text>
      )
    }
  }
const fixedLayout = makeLayout("fixed")
const responsiveLayout = makeLayout("responsive")

export function MountLayoutFixture() {
  const [width, setWidth] = useState(918)
  const [, rerender] = useState(0)
  return (
    <div data-testid="mount-layout-fixture">
      <button
        data-testid="mount-layout-rerender"
        onClick={() => rerender((n) => n + 1)}
      >
        Rerender
      </button>
      <button data-testid="mount-layout-resize" onClick={() => setWidth(618)}>
        Resize
      </button>
      <div data-testid="fixed-layout">
        <NetworkCustomChart
          nodes={fixedNodes}
          edges={fixedEdges}
          layout={fixedLayout}
          width={720}
          height={300}
          margin={margin}
          animate={false}
        />
      </div>
      <div data-testid="responsive-layout" style={{ width }}>
        <NetworkCustomChart
          nodes={smallNodes}
          edges={smallEdges}
          layout={responsiveLayout}
          width={270}
          height={290}
          margin={margin}
          responsiveWidth
          animate={false}
        />
      </div>
    </div>
  )
}
