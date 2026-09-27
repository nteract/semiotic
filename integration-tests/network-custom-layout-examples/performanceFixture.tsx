import * as React from "react"
import { ZoomableNetworkCustomChart } from "semiotic/network/zoom"
import type { ZoomableNetworkCustomChartHandle } from "semiotic/network/zoom"
import { axisFixedForceLayout, netEnsembleLayout, transitDiagramLayout } from "semiotic/recipes"
import type { NetworkCustomLayout } from "semiotic/network"

declare global {
  interface Window { networkPerformanceHandle: ZoomableNetworkCustomChartHandle | null }
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
      nodes={nodes} edges={edges} layout={layouts[kind]} width={width} height={400}
      margin={{ left: 20, right: 20, top: 40, bottom: 20 }} animate={false}
      tooltip={(datum) => <span>{String(datum.label ?? datum.id)}</span>}
      title={`${kind} layout`} accessibleTable={false} />
  </>
}
