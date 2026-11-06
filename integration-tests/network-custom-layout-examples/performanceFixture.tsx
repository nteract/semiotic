import * as React from "react"
import { ZoomableNetworkCustomChart } from "semiotic/network/zoom"
import type { ZoomableNetworkCustomChartHandle } from "semiotic/network/zoom"
import { axisFixedForceLayout, netEnsembleLayout, transitDiagramLayout } from "semiotic/recipes"
import { StreamNetworkFrame } from "semiotic/network"
import type { NetworkCustomLayout, NetworkLayoutResult, StreamNetworkFrameHandle } from "semiotic/network"

declare global {
  interface Window {
    networkPerformanceHandle: ZoomableNetworkCustomChartHandle | null
    networkRetainedHandle: StreamNetworkFrameHandle | null
  }
}
const edges = [{ source: "a", target: "b", label: "A to B", data: { metadata: true }, line: "route" },
  { source: "b", target: "c", label: "B to C", data: { metadata: true }, line: "route" }]
const layouts: Record<string, NetworkCustomLayout> = {
  ensemble: (ctx) => netEnsembleLayout({ ...ctx, config: { showLegend: false, colorMode: "category", nodeRadius: 9 } }),
  force: (ctx) => axisFixedForceLayout({ ...ctx, config: { fixedAccessor: (datum) => Number(datum.year), sourceAccessor: (datum) => String(datum.source), targetAccessor: (datum) => String(datum.target), fixedDomain: [0, 2], size: () => ({ width: 55, height: 25 }) } }),
  transit: (ctx) => transitDiagramLayout({ ...ctx, config: { layoutMode: "automatic", showLabels: false } }),
}
export function PerformanceFixture() {
  const kind = new URLSearchParams(location.search).get("performance") ?? "ensemble"
  const [width, setWidth] = React.useState(600)
  const [updated, setUpdated] = React.useState(false)
  const nodes = React.useMemo(() => ["a", "b", "c"].map((id, year) => ({
    id, year, data: { metadata: true }, label: `${id.toUpperCase()} ${updated ? "current" : "original"}`, category: updated ? "new" : "old",
  })), [updated])
  return <>
    <button onClick={() => { setUpdated(true); setWidth(460) }}>Update and resize</button>
    <button onClick={() => window.networkPerformanceHandle?.zoomTo({ x: 12, y: 8, k: 1.15 }, 0)}>Zoom and pan</button>
    <ZoomableNetworkCustomChart ref={(handle) => { window.networkPerformanceHandle = handle }}
      nodes={kind === "force" ? [...nodes, { id: "invalid", year: NaN, label: "Invalid" }] : nodes}
      edges={kind === "force" ? [...edges, { source: "a", target: "invalid", label: "Invalid edge" }] : edges} layout={layouts[kind]} width={width} height={400}
      margin={{ left: 20, right: 20, top: 40, bottom: 20 }} animate={false}
      tooltip={(datum) => <span>{String(datum.label ?? datum.id)}</span>}
      title={`${kind} layout`} accessibleTable={false} />
  </>
}

// The frame exposes relayout(), which the high-level chart handle does not.
// Retain both the array and rectangle: replacing either would hide stale bounds.
export function RetainedLayoutFixture() {
  const [size, setSize] = React.useState<[number, number]>([600, 340])
  const [clicked, setClicked] = React.useState("none")
  const [scene] = React.useState(() => {
    let moved = false
    const node = {
      type: "rect" as const,
      x: 40,
      y: 40,
      w: 80,
      h: 60,
      id: "retained",
      datum: { id: "retained", label: "Retained rectangle" },
      style: { fill: "#358499", cursor: "pointer" }
    }
    const result: NetworkLayoutResult = {
      sceneNodes: [node],
      sceneEdges: [],
      edgeHitTesting: false
    }
    const layout: NetworkCustomLayout = ({ dimensions }) => {
      node.x = moved ? 220 : 40
      node.y = moved ? 160 : 40
      node.w = dimensions.width - 520
      node.h = dimensions.height - 280
      return result
    }
    return {
      layout,
      move: () => {
        moved = true
      }
    }
  })
  const renderAs =
    new URLSearchParams(location.search).get("renderer") === "svg"
      ? "svg"
      : "canvas"
  return (
    <>
      <button
        onClick={() => {
          scene.move()
          window.networkRetainedHandle!.relayout()
        }}
      >
        Relayout retained rectangle
      </button>
      <button onClick={() => setSize([800, 440])}>
        Resize push-mode chart
      </button>
      <button onClick={() => setClicked("none")}>Clear last click</button>
      <output data-testid="retained-click">{clicked}</output>
      <h2>Retained rectangle hits</h2>
      <StreamNetworkFrame
        ref={(handle) => {
          window.networkRetainedHandle = handle
        }}
        chartType="force"
        size={size}
        margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
        initialEdges={edges}
        customNetworkLayout={scene.layout}
        renderAs={renderAs}
        animate={false}
        enableHover
        description="Retained rectangles during relayout and resize"
        tooltipContent={(hover) => <span>{String(hover.data?.label)}</span>}
        customClickBehavior={(hover) =>
          setClicked(String(hover?.data?.label ?? "none"))
        }
      />
    </>
  )
}
