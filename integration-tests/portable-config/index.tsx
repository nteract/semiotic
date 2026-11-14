import * as React from "react"
import { createRoot } from "react-dom/client"
import { LineChart } from "../../dist/semiotic.module.min.js"
import {
  toConfig,
  toURL,
  fromURL,
  fromConfig
} from "../../dist/semiotic-utils-core.module.min.js"

const start = Date.UTC(2026, 10, 14)
const config = toConfig("LineChart", {
  data: [10, 20, 30].map((value, index) => ({
    date: new Date(start + index * 86400000),
    value
  })),
  xAccessor: "date",
  yAccessor: "value",
  xScaleType: "time",
  xExtent: [start, start + 2 * 86400000],
  yExtent: [0, 40],
  height: 280,
  responsiveWidth: true,
  showPoints: true,
  margin: { left: 40, right: 20, top: 20, bottom: 40 },
  title: "Shared dates",
  description: "Three daily readings increase from ten to thirty."
})
const restored = fromConfig(
  fromURL(`https://example.test/chart?${toURL(config)}#reading`)
)
const rows = restored.props.data as Array<{ date: Date; value: number }>

function Fixture() {
  const [narrow, setNarrow] = React.useState(false)
  return (
    <>
      <button onClick={() => setNarrow((value) => !value)}>Resize chart</button>
      <p role="status">
        {rows.filter((row) => row.date instanceof Date).length} Dates restored
      </p>
      <div data-testid="chart" style={{ width: narrow ? 360 : 600 }}>
        <LineChart
          {...restored.props}
          tooltip={(d) => (
            <span>
              {d.date.toISOString().slice(0, 10)}: {d.value}
            </span>
          )}
        />
      </div>
    </>
  )
}
createRoot(document.getElementById("root")!).render(<Fixture />)
