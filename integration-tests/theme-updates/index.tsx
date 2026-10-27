import * as React from "react"
import { createRoot } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { ThemeProvider, useTheme } from "semiotic/themes/react"
import { Scatterplot } from "semiotic/xy"
import { AutomaticThemeFixture } from "./automatic"

const data = [{ x: 5, y: 5, name: "Alpha", group: "A" }]
const initialOverride = {
  colors: { categorical: ["#c2185b"], background: "#ffeeee" },
  tooltip: { fontSize: "20px" }
}

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
