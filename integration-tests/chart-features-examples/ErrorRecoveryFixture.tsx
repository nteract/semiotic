import React, { useState } from "react"
import { BarChart } from "../../dist/ordinal.module.min.js"
import { LineChart } from "../../dist/xy.module.min.js"
import { ChartContainer, ThemeProvider } from "../../dist/semiotic.module.min.js"

const rows = [
  { category: "North", value: 12 },
  { category: "South", value: 8 }
]
const controlStyle = {
  color: "var(--semiotic-text, #202020)",
  backgroundColor: "var(--semiotic-surface, #fff)"
}
const invalidRows = [{ category: "invalid", value: 12 }]
const colorBy = (row: (typeof rows)[number]) => {
  if (row.category === "invalid")
    throw new Error("Invalid region in chart data")
  return row.category
}

export function ChartStatesFixture({ dark }: { dark: boolean }) {
  return (
    <ThemeProvider theme={dark ? "dark" : "light"}>
      <div data-testid="chart-states" style={{ background: "var(--semiotic-bg)", color: "var(--semiotic-text)" }}>
        <LineChart loading loadingLabel="Chargement du graphique" width={120} height={24} />
        <BarChart data={[]} categoryAccessor="category" valueAccessor="value" emptyContent="Aucune donnée" />
        <ChartContainer loading loadingLabel="Chargement du tableau" height={32}>
          <div />
        </ChartContainer>
        <ErrorRecoveryFixture />
      </div>
    </ThemeProvider>
  )
}

export function ErrorRecoveryFixture() {
  const [valid, setValid] = useState(false)
  const [compact, setCompact] = useState(false)
  return (
    <main style={{ padding: 20 }}>
      <button style={controlStyle} onClick={() => setValid(!valid)}>
        {valid ? "Break data" : "Repair data"}
      </button>
      <button style={controlStyle} onClick={() => setCompact(!compact)}>Resize chart</button>
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
