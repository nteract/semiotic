import React, { useState } from "react"
import { MinimapChart } from "../../dist/xy.module.min.js"
import { ThemeProvider } from "../../dist/semiotic-themes-react.module.min.js"

const data = Array.from({ length: 101 }, (_, x) => ({ x, y: 50 + 40 * Math.sin(x / 8) }))
const margin = { top: 10, right: 20, bottom: 30, left: 40 }
const minimapLayout = { height: 60, margin: { top: 0, right: 20, bottom: 0, left: 40 } }

// Controlled minimaps that report each onBrush call, so a test can check that
// a drag keeps reporting while the parent re-renders with every extent.
function ControlledMinimap({ testId, brushDirection }) {
  const [extent, setExtent] = useState(undefined)
  const [calls, setCalls] = useState(0)
  return <div data-testid={testId} data-calls={calls} data-extent={extent ? extent.join(",") : ""}>
    <MinimapChart data={data} width={500} height={240} margin={margin}
      yExtent={[0, 100]}
      minimap={{ ...minimapLayout, brushDirection }}
      brushExtent={extent}
      onBrush={(next) => {
        setCalls((count) => count + 1)
        setExtent(next ?? undefined)
      }} />
  </div>
}

// Handles, a mask, and extent labels, committing only on release.
function StyledMinimap() {
  const [extent, setExtent] = useState([20, 60])
  const [ends, setEnds] = useState(0)
  return <div data-testid="minimap-styled" data-extent={extent ? extent.join(",") : ""} data-ends={ends}
    style={{ width: 500, background: "white" }}>
    <MinimapChart data={data} width={500} height={200} margin={margin}
      yExtent={[0, 100]}
      minimap={{
        height: 60,
        margin: { left: 40, right: 20 },
        brushStyle: { mask: true },
        handles: { move: true },
        showExtentLabels: true,
        extentLabelFormat: (value) => `Day ${Math.round(value)}\nof 100`,
        brushLabel: "Detail window",
      }}
      brushExtent={extent}
      onBrushEnd={(next) => {
        setEnds((count) => count + 1)
        setExtent(next ?? undefined)
      }} />
  </div>
}

export function MinimapControlledExample() {
  return <div>
    <ControlledMinimap testId="minimap-controlled-x" brushDirection="x" />
    <ControlledMinimap testId="minimap-controlled-y" brushDirection="y" />
    <ThemeProvider theme="dark">
      <ControlledMinimap testId="minimap-controlled-dark" brushDirection="x" />
    </ThemeProvider>
    <StyledMinimap />
  </div>
}
