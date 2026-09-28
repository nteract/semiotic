import * as React from "react"
import { LineChart } from "semiotic/xy"

// Two series over minutes 0..11 of a 20-minute window: the right half of the
// plot is x-extent padding with no rendered path under the cursor.
const minutes = Array.from({ length: 12 }, (_, minute) => minute)
const data = [
  ...minutes.map((minute) => ({ series: "A", minute, value: minute })),
  ...minutes.map((minute) => ({ series: "B", minute, value: minute * 2 }))
]

type Row = { group: string; value: number }
const content = (datum: Record<string, unknown>) => {
  const rows = (datum.allSeries ?? []) as Row[]
  return (
    <div data-testid="multi-rows">
      {`${Math.round(Number(datum.xValue))}: ${rows
        .map((row) => `${row.group}=${Math.round(row.value)}`)
        .join(" ")}`}
    </div>
  )
}

export function LineMultiEdgeFixture() {
  const [width, setWidth] = React.useState(420)
  return (
    <main>
      <button onClick={() => setWidth(300)}>Narrow chart</button>
      <LineChart
        data={data}
        xAccessor="minute"
        yAccessor="value"
        lineBy="series"
        xExtent={[0, 20]}
        yExtent={[0, 30]}
        width={width}
        height={200}
        margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
        showLegend={false}
        animate={false}
        tooltip={{ mode: "multi", content }}
        frameProps={{ showAxes: false }}
      />
    </main>
  )
}
