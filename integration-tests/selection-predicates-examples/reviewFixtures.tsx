import React, { useEffect, useRef, useState } from "react"
import { LinkedCharts, useSelection } from "../../dist/semiotic.module.min.js"
import { OrbitDiagram } from "../../dist/network.module.min.js"
import { BigNumber } from "../../dist/semiotic-value.module.min.js"
import { Scatterplot, ScatterplotMatrix } from "../../dist/xy.module.min.js"
import type { StreamNetworkFrameHandle } from "../../src/components/stream/networkTypes"

declare global {
  interface Window {
    orbitSelectionRef: React.RefObject<StreamNetworkFrameHandle | null>
  }
}

function OrbitSelection() {
  const ref = useRef<StreamNetworkFrameHandle>(null)
  useEffect(() => {
    window.orbitSelectionRef = ref
  }, [])
  const hover = useSelection({ name: "orbit-hover" })
  const selection = useSelection({ name: "orbit-selected" })
  const [width, setWidth] = useState(300)
  return (
    <>
      <button onClick={() => setWidth(340)}>Resize orbit</button>
      <output data-testid="orbit-hover-state">{String(hover.isActive)}</output>
      <output data-testid="orbit-selection-state">
        {String(selection.isActive)}
      </output>
      <div data-testid="orbit-review">
        <OrbitDiagram
          data={{ name: "Root", children: [{ name: "A" }, { name: "B" }] }}
          width={width}
          height={300}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          nodeRadius={12}
          animated={false}
          showLegend={false}
          linkedHover={{ name: "orbit-hover", fields: ["name"] }}
          selection={{ name: "orbit-selected" }}
          tooltip={(d) => <span>Orbit node: {d.name}</span>}
          frameProps={{ ref }}
        />
      </div>
    </>
  )
}

const matrixData = [
  { id: "A", a: 1, b: 1, c: 1 },
  { id: "B", a: 9, b: 9, c: 9 }
]

function MatrixSelection() {
  const [fields, setFields] = useState(["a", "b", "c"])
  const [activated, setActivated] = useState("")
  return (
    <>
      <button onClick={() => setFields(["a", "b"])}>
        Remove unrelated field
      </button>
      <output data-testid="matrix-activated">{activated}</output>
      <div data-testid="matrix-review">
        <ScatterplotMatrix
          data={matrixData}
          fields={fields}
          cellSize={160}
          pointRadius={7}
          pointOpacity={1}
          unselectedOpacity={0.1}
          colorBy="id"
          colorScheme={{ A: "#1460aa", B: "#e96c2c" }}
          showLegend={false}
          diagonal="histogram"
          onClick={d => setActivated(d.id)}
          tooltip={(d) => <span>Matrix row: {d.id}</span>}
        />
      </div>
    </>
  )
}

function KeyboardMatrices() {
  const [activations, setActivations] = useState(0)
  const parentSelection = useSelection({ name: "splom" })
  return <>
    <BigNumber value={42} label="Sales" summary="Sales for the current quarter" onClick={() => setActivations(count => count + 1)} />
    <output data-testid="activations">{activations}</output>
    <output data-testid="parent-selection">{String(parentSelection.isActive)}</output>
    {["First matrix", "Second matrix"].map(title => <ScatterplotMatrix key={title} title={title}
      data={matrixData} fields={["a", "b", "c"]} cellSize={108}
      pointRadius={6} pointOpacity={1} hoverMode={false} accessibleTable={false} />)}
    <button>After matrices</button>
  </>
}

function BrushedScatterplot() {
  const [width, setWidth] = useState(320)
  return <>
    <button onClick={() => setWidth(420)}>Resize scatterplot</button>
    <div data-testid="brushed-scatterplot">
      <Scatterplot data={[{ x: 5, y: 5, id: "Center" }]} xAccessor="x" yAccessor="y"
        width={width} height={220} xExtent={[0, 10]} yExtent={[0, 10]}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        pointRadius={9} brush tooltip={d => <span>Reading {d.id}</span>} />
    </div>
  </>
}

export function SelectionReviewFixtures() {
  const fixture = new URLSearchParams(location.search).get("review")
  if (fixture === "brush-hover") return <BrushedScatterplot />
  if (fixture === "keyboard") return <LinkedCharts><KeyboardMatrices /></LinkedCharts>
  return fixture === "orbit" ? (
    <LinkedCharts showLegend={false}>
      <OrbitSelection />
    </LinkedCharts>
  ) : (
    <MatrixSelection />
  )
}
