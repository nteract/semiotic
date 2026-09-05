import { contributionSummary, summary } from "./format"
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
