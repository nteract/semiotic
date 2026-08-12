import { describe, expect, it } from "vitest"
import { LineChart } from "../xy/LineChart"

interface TypedRow {
  timestamp: number
  amount: number
}

const xAccessor = (datum: TypedRow) => datum.timestamp
const yAccessor = (datum: TypedRow) => datum.amount

// Named callbacks are a common public-API pattern. Keep this as JSX so the
// generic component's inference/assignability is checked end to end.
const chart = (
  <LineChart<TypedRow>
    data={[{ timestamp: 1, amount: 42 }]}
    xAccessor={xAccessor}
    yAccessor={yAccessor}
  />
)

describe("ChartAccessor JSX contract", () => {
  it("accepts named callbacks narrowed to the chart datum type", () => {
    expect(chart.props.xAccessor).toBe(xAccessor)
    expect(chart.props.yAccessor).toBe(yAccessor)
  })
})
