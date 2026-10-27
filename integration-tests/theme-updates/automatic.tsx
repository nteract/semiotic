import * as React from "react"
// The imperative store hook is internal, so this fixture uses the matching
// source provider/chart graph. The other fixtures exercise published entries.
import { ThemeProvider, useTheme } from "../../src/components/ThemeProvider"
import { useThemeSelector } from "../../src/components/store/ThemeStore"
import { Scatterplot } from "../../src/components/charts/xy/Scatterplot"

function UpdateParent() {
  const update = useThemeSelector((state) => state.setTheme)
  return (
    <button
      onClick={() =>
        update({
          colors: { primary: "blue", categorical: ["blue"] },
          typography: { fontFamily: "serif", labelSize: 23 }
        })
      }
    >
      Update automatic parent
    </button>
  )
}

function Chart() {
  const theme = useTheme()
  return (
    <>
      <output
        data-testid="automatic-live-values"
        style={{
          color: "var(--semiotic-primary)",
          fontFamily: "var(--semiotic-font-family)"
        }}
      >
        {theme.colors.primary}:{theme.typography.labelSize}
      </output>
      <section
        data-testid="automatic-chart"
        style={{ position: "relative", width: 500, height: 300 }}
      >
        <Scatterplot
          data={[{ x: 5, y: 5, name: "Alpha", group: "A" }]}
          width={500}
          height={300}
          title="Automatic themed point"
          description="Alpha is at five, five"
          margin={{ left: 40, right: 20, top: 20, bottom: 40 }}
          xAccessor="x"
          yAccessor="y"
          xExtent={[0, 10]}
          yExtent={[0, 10]}
          pointRadius={10}
          pointOpacity={1}
          colorBy="group"
          showLegend={false}
          tooltip={(datum) => (
            <span>
              Point {String(datum.name)}: {String(datum.x)}, {String(datum.y)}
            </span>
          )}
        />
      </section>
    </>
  )
}

export function AutomaticThemeFixture() {
  return (
    <ThemeProvider
      theme={{ mode: "auto", colors: { primary: "red", categorical: ["red"] } }}
    >
      <UpdateParent />
      <ThemeProvider theme={{ typography: { labelSize: 22 } }}>
        <ThemeProvider>
          <Chart />
        </ThemeProvider>
      </ThemeProvider>
    </ThemeProvider>
  )
}
