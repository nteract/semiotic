import * as React from "react"
import { createRoot } from "react-dom/client"
import {
  CircularBrush,
  SentenceFilter,
  auditVisualizationControls
} from "semiotic/controls"

function App() {
  const [range, setRange] = React.useState({ start: 0, end: 24 })
  const [filters, setFilters] = React.useState({ amount: 10 })
  const [audit, setAudit] = React.useState("")
  const root = React.useRef<HTMLDivElement>(null)
  return (
    <main>
      <div ref={root}>
        <CircularBrush
          controlId="cycle"
          period={24}
          radius={80}
          value={range}
          onChange={setRange}
        />
        <output data-testid="range">
          {range.start},{range.end}
        </output>
        <SentenceFilter
          sentence="At least {amount}"
          filters={filters}
          definitions={{
            amount: { type: "number", label: "Amount", min: 0, max: 100 }
          }}
          onChange={(next) => setFilters({ amount: Number(next.amount) })}
        />
        <button
          data-viz-control-id="small"
          aria-label="Small target"
          style={{ width: 10, height: 10, padding: 0, border: 0 }}
        />
        <button
          data-viz-control-id="large"
          aria-label="Large target"
          style={{ width: 40, height: 40, padding: 0, border: 0 }}
        />
      </div>
      <button
        onClick={() =>
          setAudit(
            JSON.stringify(
              auditVisualizationControls({ element: root.current! })
            )
          )
        }
      >
        Audit controls
      </button>
      <output data-testid="audit">{audit}</output>
    </main>
  )
}
createRoot(document.getElementById("root")!).render(<App />)
