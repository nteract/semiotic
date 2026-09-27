import React, { useEffect, useMemo, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import {
  CirclePack,
  OrbitDiagram,
  TreeDiagram,
  Treemap
} from "../../dist/network.module.min.js"
import type { StreamNetworkFrameHandle } from "../../src/components/stream/networkTypes"
import type { Datum } from "../../src/components/charts/shared/datumTypes"

declare global {
  interface Window {
    hierarchyRef: React.RefObject<StreamNetworkFrameHandle | null>
  }
}
const kind = new URLSearchParams(location.search).get("kind") || "treemap"
const margin = { left: 20, right: 20, top: 40, bottom: 20 }
const tooltip = (d: Datum) =>
  d.depth !== undefined ? (
    <div>Hierarchy link at depth {d.depth}</div>
  ) : (
    <div>
      {d.record ?? d.name}: {d.amount ?? "group"}
    </div>
  )

function App() {
  const [width, setWidth] = useState(560)
  const [changed, setChanged] = useState(false)
  const ref = useRef<StreamNetworkFrameHandle>(null)
  useEffect(() => {
    window.hierarchyRef = ref
  }, [])
  const data = useMemo(
    () => ({
      name: "root",
      children: [
        {
          name: "A",
          children: [
            { name: "Other", record: "A/Other", amount: changed ? 1 : 4 },
            { name: "Zero", record: "A/Zero", amount: 0 }
          ]
        },
        {
          name: "B",
          children: [
            { name: "Other", record: "B/Other", amount: changed ? 8 : 2 }
          ]
        },
        { name: "Other__1", record: "Authored suffix", amount: 3 }
      ]
    }),
    [changed]
  )
  const props = {
    data,
    width,
    height: 400,
    margin,
    valueAccessor: "amount",
    showLabels: false,
    showLegend: false,
    colorByDepth: false,
    animate: false,
    tooltip,
    title: "Repeated hierarchy names",
    description: "Both Other leaves retain their own values.",
    frameProps: {
      ref,
      padding: 0,
      nodeStyle: () => ({ fill: "#139f6b", stroke: "#ffffff" })
    }
  }
  return (
    <main>
      <button onClick={() => setWidth(460)}>Resize chart</button>
      <button onClick={() => setChanged(true)}>Replace values</button>
      <section data-testid="chart">
        {kind === "treemap" ? (
          <Treemap {...props} padding={0} />
        ) : kind === "circlepack" ? (
          <CirclePack {...props} padding={0} />
        ) : kind === "orbit" ? (
          <OrbitDiagram {...props} animated={false} />
        ) : (
          <TreeDiagram {...props} layout={kind} />
        )}
      </section>
    </main>
  )
}
createRoot(document.getElementById("root")!).render(<App />)
