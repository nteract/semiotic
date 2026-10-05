import * as React from "react"
import { CandlestickChart, LineChart } from "../../dist/xy.module.min.js"
import type { ChartMode } from "../../dist/semiotic.d.ts"
import { resolveChartSize } from "../../dist/semiotic-utils.module.min.js"

const rows = [
  { x: 0, low: 3, high: 7, open: 4, close: 6, y: 6 },
  { x: 1, low: 4, high: 10, open: 8, close: 5, y: 5 },
  { x: 2, low: 5, high: 9, open: 6, close: 8, y: 8 }
]

export function CandlestickSizingFixture() {
  const [state, setState] = React.useState<
    "range" | "ohlc" | "empty" | "loading"
  >("range")
  const [mode, setMode] = React.useState<ChartMode | undefined>()
  const [responsive, setResponsive] = React.useState(false)
  const [narrow, setNarrow] = React.useState(false)
  const [fullContent, setFullContent] = React.useState(false)
  const slotWidth = narrow ? 320 : 480
  const resolved = resolveChartSize("CandlestickChart", {
    mode,
    responsiveWidth: responsive,
    containerSize: { width: slotWidth }
  })
  const data = state === "empty" || state === "loading" ? [] : rows
  const shared = {
    data,
    mode,
    responsiveWidth: responsive,
    loading: state === "loading",
    animate: false,
    emptyContent: fullContent ? (
      <div
        data-testid="full-content"
        style={{
          height: "100%",
          background: "#e2e8f0",
          display: "grid",
          placeItems: "center"
        }}
      >
        No observations
      </div>
    ) : (
      <span data-testid="empty-message">No observations</span>
    ),
    loadingContent: (
      <span data-testid="loading-message">Fetching observations</span>
    )
  }
  if (new URLSearchParams(window.location.search).has("skeleton")) {
    return (
      <main>
        <button onClick={() => setNarrow(!narrow)}>Resize skeleton</button>
        <div
          data-testid="skeleton-host"
          style={{ width: slotWidth, height: narrow ? 96 : 240 }}
        >
          <CandlestickChart
            mode="context"
            data={[]}
            loading
            responsiveWidth
            responsiveHeight
          />
        </div>
      </main>
    )
  }
  return (
    <main
      style={{
        fontFamily: "Arial, sans-serif",
        color: "#172033",
        background: "white",
        padding: 16
      }}
    >
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        {(["range", "ohlc", "empty", "loading"] as const).map((value) => (
          <button key={value} onClick={() => setState(value)}>
            Show {value}
          </button>
        ))}
        <button onClick={() => setMode(undefined)}>Primary mode</button>
        <button onClick={() => setMode("context")}>Context mode</button>
        <button onClick={() => setResponsive(!responsive)}>
          Responsive width
        </button>
        <button onClick={() => setNarrow(!narrow)}>Narrow container</button>
        <button onClick={() => setFullContent(!fullContent)}>
          Full-size content
        </button>
        <output data-testid="resolved-size">
          {resolved.width}×{resolved.height}
        </output>
      </div>
      <div
        data-testid="sizing-comparison"
        style={{ display: "flex", gap: 24, width: "max-content", padding: 8 }}
      >
        <section
          data-testid="candlestick-slot"
          style={{ width: responsive ? slotWidth : undefined }}
        >
          <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>
            Candlestick / range
          </h2>
          <CandlestickChart
            {...shared}
            {...(state === "ohlc" && {
              openAccessor: "open",
              closeAccessor: "close"
            })}
          />
        </section>
        <section
          data-testid="line-slot"
          style={{ width: responsive ? slotWidth : undefined }}
        >
          <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Line</h2>
          <LineChart {...shared} />
        </section>
      </div>
    </main>
  )
}
