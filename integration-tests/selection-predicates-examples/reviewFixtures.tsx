import React, { useEffect, useRef, useState } from "react"
import { LinkedCharts, useSelection } from "../../dist/semiotic.module.min.js"
import { OrbitDiagram } from "../../dist/network.module.min.js"
import { ScatterplotMatrix } from "../../dist/xy.module.min.js"
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
  return (
    <>
      <button onClick={() => setFields(["a", "b"])}>
        Remove unrelated field
      </button>
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
          diagonal="label"
          tooltip={(d) => <span>Matrix row: {d.id}</span>}
        />
      </div>
    </>
  )
}

export function SelectionReviewFixtures() {
  return new URLSearchParams(location.search).get("review") === "orbit" ? (
    <LinkedCharts showLegend={false}>
      <OrbitSelection />
    </LinkedCharts>
  ) : (
    <MatrixSelection />
  )
}
