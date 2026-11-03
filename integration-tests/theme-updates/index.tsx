import * as React from "react"
import { createRoot } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { ThemeProvider, useTheme } from "semiotic/themes/react"
import { Scatterplot } from "semiotic/xy"
import { BarChart, FunnelChart } from "semiotic/ordinal"
import { AutomaticThemeFixture } from "./automatic"

const data = [{ x: 5, y: 5, name: "Alpha", group: "A" }]
const initialOverride = {
  colors: { categorical: ["#c2185b"], background: "#ffeeee" },
  tooltip: { fontSize: "20px" }
}
const hatch = {
  type: "hatch" as const,
  background: "var(--semiotic-warning)",
  stroke: "var(--semiotic-text)",
  spacing: 8,
  lineWidth: 2,
  angle: 45
}
const hatchData = [{ category: "Capacity", value: 80 }]
const funnelData = [{ step: "Visit", value: 100 }, { step: "Signup", value: 50 }]
const hatchMargin = { left: 40, right: 20, top: 40, bottom: 40 }

function ThemeReadout() {
  const theme = useTheme()
  return (
    <output data-testid="theme-values">
      {JSON.stringify({
        mode: theme.mode,
        primary: theme.colors.primary,
        background: theme.colors.background,
        tooltip: theme.tooltip
      })}
    </output>
  )
}

// Deliberately never hydrated: nested automatic palettes must work through CSS.
const automaticMarkup = renderToString(
  <ThemeProvider theme={{ mode: "auto", colors: { primary: "#123456" } }}>
    <ThemeProvider theme={{ typography: { labelSize: 22 } }}>
      <div
        data-testid="automatic-colors"
        style={{
          background: "var(--semiotic-bg)",
          color: "var(--semiotic-text)"
        }}
      >
        Automatic nested palette
      </div>
    </ThemeProvider>
  </ThemeProvider>
)

function Fixture() {
  const [outer, setOuter] = React.useState<"dark" | "light" | "high-contrast">(
    "dark"
  )
  const [override, setOverride] = React.useState(true)
  const [small, setSmall] = React.useState(false)
  const [tick, setTick] = React.useState(0)
  const width = small ? 380 : 500
  return (
    <>
      <h1>Theme updates</h1>
      <button onClick={() => setOverride(false)}>Remove inner overrides</button>
      <button onClick={() => setOuter("light")}>Light parent</button>
      <button onClick={() => setOuter("high-contrast")}>
        High contrast parent
      </button>
      <button onClick={() => setSmall(true)}>Resize charts</button>
      <button onClick={() => setTick((value) => value + 1)}>
        Render again {tick}
      </button>
      <ThemeProvider theme={outer}>
        <ThemeProvider
          theme={override ? initialOverride : { typography: { labelSize: 16 } }}
        >
          <ThemeReadout />
          <section
            data-testid="canvas-chart"
            style={{ position: "relative", width, height: 300 }}
          >
            <Scatterplot
              data={data}
              width={width}
              height={300}
              title="Themed point"
              description="Alpha is at five, five"
              margin={{ left: 40, right: 20, top: 20, bottom: 40 }}
              xAccessor="x"
              yAccessor="y"
              xExtent={[0, 10]}
              yExtent={[0, 10]}
              pointRadius={10}
              colorBy="group"
              showLegend={false}
              pointOpacity={1}
              tooltip={(datum) => (
                <span>
                  Point {String(datum.name)}: {String(datum.x)},{" "}
                  {String(datum.y)}
                </span>
              )}
            />
          </section>
        </ThemeProvider>
        <ThemeProvider theme={{ colors: outer === "dark"
          ? { warning: "#ffd166", text: "#92400e" }
          : { warning: "#aabbcc", text: "#123456" }
        }}>
          <section data-testid="hatched-bar" style={{ position: "relative", width, height: 240 }}>
            <BarChart
              data={hatchData}
              categoryAccessor="category"
              valueAccessor="value"
              valueExtent={[0, 100]}
              width={width}
              height={240}
              margin={hatchMargin}
              title="Hatched capacity"
              description="Capacity is eighty out of one hundred"
              showAxes={false}
              showLegend={false}
              animate={false}
              styleRules={[{ when: { gt: 0 }, style: { fill: hatch } }]}
              tooltip={(datum) => <span>{String(datum.category)}: {String(datum.value)} units</span>}
            />
          </section>
          <section data-testid="hatched-funnel" style={{ position: "relative", width, height: 240 }}>
            <FunnelChart
              data={funnelData}
              orientation="vertical"
              stepAccessor="step"
              valueAccessor="value"
              width={width}
              height={240}
              margin={hatchMargin}
              title="Hatched conversion loss"
              description="Fifty of one hundred visitors leave before signing up"
              color="var(--semiotic-warning)"
              showAxes={false}
              showLabels={false}
              showLegend={false}
              animate={false}
              frameProps={{ rExtent: [0, 100] }}
            />
          </section>
        </ThemeProvider>
      </ThemeProvider>
      <section
        aria-label="Server-rendered automatic theme"
        dangerouslySetInnerHTML={{ __html: automaticMarkup }}
      />
      <AutomaticThemeFixture />
    </>
  )
}

createRoot(document.getElementById("root")!).render(<Fixture />)
