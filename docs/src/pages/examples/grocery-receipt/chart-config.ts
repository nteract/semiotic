import { contributionSummary, monthName, summary } from "./format"
import type { PreparedBasket } from "./types"

export function contributionChartProps(receipt: PreparedBasket) {
  return {
    data: receipt.rows
      .filter((row) => row.quantity > 0 && row.included && row.contributionUSD !== null)
      .map((row) => ({ itemId: row.itemId, item: row.label, change: row.contributionUSD! })),
    categoryAccessor: "item" as const,
    valueAccessor: "change" as const,
    orientation: "horizontal" as const,
    width: 720,
    height: 330,
    margin: { left: 155, right: 35, top: 20, bottom: 50 },
    title: "What changed the receipt",
    description: contributionSummary(receipt),
    summary: summary(receipt),
    accessibleTable: true,
    sort: false as const,
    enableHover: false,
  }
}

// Split at every missing value. Group identities prevent either renderer from
// connecting across a missing month, even if it filters null values itself.
export function historySeries(receipt: PreparedBasket, measure: "costUSD" | "yearChangePct") {
  let segment = 0
  return receipt.history.flatMap((row) => {
    if (row[measure] === null) {
      segment++
      return []
    }
    return [{ ...row, value: row[measure]!, segment: `segment-${segment}` }]
  })
}

/** The latest uninterrupted run through the comparison month. Never connect
 * across a missing cost or annual denominator, or draw an invented zero. */
export function trajectoryData(receipt: PreparedBasket) {
  let run: { month: string; monthIndex: number; costUSD: number; yearChangePct: number }[] = []
  for (const row of receipt.history) {
    if (row.month > receipt.state.after) break
    if (row.costUSD === null || row.yearChangePct === null) run = []
    else run.push({ ...row, costUSD: row.costUSD, yearChangePct: row.yearChangePct })
  }
  return run
}

export function trajectoryChartProps(receipt: PreparedBasket) {
  const data = trajectoryData(receipt)
  return {
    data,
    xAccessor: "costUSD" as const,
    yAccessor: "yearChangePct" as const,
    orderAccessor: "monthIndex",
    orderLabel: "Months since January 2019",
    pointIdAccessor: "month" as const,
    pointRadius: 3,
    width: 740,
    height: 380,
    margin: { left: 58, right: 24, top: 28, bottom: 55 },
    xLabel: "Basket cost (USD)",
    yLabel: "12-month change (%)",
    title: "Higher cost, slower change",
    description: data.length
      ? `One point per month, connected in calendar order from ${monthName(data[0].month)} through ${monthName(data.at(-1)!.month)}. Right means a more expensive basket; up means a faster annual rise. Only the latest uninterrupted run through the comparison month is connected.`
      : "No uninterrupted cost and annual-change pair ends in the comparison month.",
    summary: summary(receipt),
    accessibleTable: true,
    showGrid: true,
    annotations: [{ type: "y-threshold", value: 0, color: "#59685e", strokeDasharray: "4,4" }],
  }
}
