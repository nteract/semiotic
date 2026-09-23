import * as React from "react"
import { createRoot } from "react-dom/client"
import {
  NetworkCustomChart,
  networkEdgeHitTarget,
  networkHitTarget
} from "../../dist/network.module.min.js"
import type { NetworkCustomLayout } from "../../src/components/stream/networkCustomLayout"
import { ViewportFixture } from "./viewportFixture"

const nodes = [{ id: "card" }]
const edges: [] = []
const margin = { top: 20, left: 20, right: 20, bottom: 20 }
const curve = "M20,120 C20,20 180,20 180,120"
const band = "M240,40 L380,40 L380,140 L240,140 Z"
const layout: NetworkCustomLayout = () => ({
  sceneNodes: [
    networkHitTarget({
      x: 40,
      y: 200,
      width: 200,
      height: 120,
      datum: { id: "card" },
      id: "card"
    }),
    networkHitTarget({
      x: 50,
      y: 240,
      width: 180,
      height: 24,
      datum: { id: "row" },
      id: "row"
    })
  ],
  sceneEdges: [
    networkEdgeHitTarget({ pathD: curve, datum: { id: "curve" }, id: "curve" }),
    networkEdgeHitTarget({
      type: "ribbon",
      pathD: band,
      datum: { id: "band" },
      id: "band"
    }),
    networkEdgeHitTarget({
      x1: 20,
      y1: 170,
      x2: 180,
      y2: 170,
      datum: { id: "line" },
      id: "line"
    }),
    networkEdgeHitTarget({
      x1: 250,
      y1: 170,
      x2: 380,
      y2: 170,
      datum: { id: "table-only" },
      id: "table-only",
      interactive: false
    })
  ],
  overlays: (
    <g pointerEvents="none" data-testid="edge-geometry">
      <path d={curve} fill="none" stroke="navy" strokeWidth={2} />
      <path d={band} fill="steelblue" />
      <path d="M20,170 L180,170 M250,170 L380,170" stroke="navy" />
      <rect x={40} y={200} width={200} height={120} fill="lightgray" />
      <rect x={50} y={240} width={180} height={24} fill="steelblue" />
    </g>
  )
})

function App() {
  const [hover, setHover] = React.useState("none")
  return (
    <>
      <output data-testid="hover">{hover}</output>
      <div data-testid="edge-chart">
        <NetworkCustomChart
          nodes={nodes}
          edges={edges}
          layout={layout}
          width={460}
          height={380}
          margin={margin}
          animate={false}
          title="Overlay edge hit targets"
          accessibleTable
          onObservation={(observation) => {
            if (observation.type === "hover")
              setHover(String(observation.datum?.id ?? "none"))
            if (observation.type === "hover-end") setHover("none")
          }}
        />
      </div>
    </>
  )
}

createRoot(document.getElementById("root")!).render(
  new URLSearchParams(location.search).has("viewport") ? (
    <ViewportFixture />
  ) : (
    <App />
  )
)
