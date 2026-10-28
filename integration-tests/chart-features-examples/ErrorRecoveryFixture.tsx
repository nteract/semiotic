import React, { useState } from "react"
import { BarChart } from "../../dist/ordinal.module.min.js"

const rows = [
  { category: "North", value: 12 },
  { category: "South", value: 8 }
]
const invalidRows = [{ category: "invalid", value: 12 }]
const colorBy = (row: (typeof rows)[number]) => {
  if (row.category === "invalid")
    throw new Error("Invalid region in chart data")
  return row.category
}

export function ErrorRecoveryFixture() {
  const [valid, setValid] = useState(false)
  const [compact, setCompact] = useState(false)
  return (
    <main style={{ padding: 20 }}>
      <button onClick={() => setValid(!valid)}>
        {valid ? "Break data" : "Repair data"}
      </button>
      <button onClick={() => setCompact(!compact)}>Resize chart</button>
      <section
        data-testid="recovering-chart"
        style={{ width: compact ? 360 : 600 }}
      >
        <BarChart
          data={valid ? rows : invalidRows}
          colorBy={colorBy}
          colorScheme={["#c83232", "#3264c8"]}
          categoryAccessor="category"
          valueAccessor="value"
          responsiveWidth
          height={300}
          margin={{ left: 50, right: 20, top: 20, bottom: 40 }}
          showLegend={false}
          animate={false}
          tooltip={(row) => (
            <span>
              {row.category}: {row.value} units
            </span>
          )}
        />
      </section>
    </main>
  )
}
