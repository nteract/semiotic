import { renderChartWithEvidence } from "semiotic/server"
import { trajectoryChartProps } from "./chart-config"
import { escapeMarkup, renderReceiptHTML } from "./exports"
import type { GrocerySnapshot, PreparedBasket } from "./types"

export function renderBasketHTML(receipt: PreparedBasket, snapshot: GrocerySnapshot) {
  const props = trajectoryChartProps(receipt)
  const chart =
    props.data.length > 1 ? renderChartWithEvidence("ConnectedScatterplot", props) : null
  const path = `<h2>Follow the bill through time</h2><p>${escapeMarkup(props.description)}</p>${chart?.svg ?? "<p>Not enough consecutive complete observations to draw a path.</p>"}
    <p>Purple begins the path; yellow ends it. Right means higher cost; up means faster annual change. A falling annual rate can coexist with a higher bill. This illustrative basket is not the official CPI.</p>
    <section tabindex="0" aria-label="Saved monthly basket history"><table><caption>Complete monthly history, including gaps. Annual change uses the same basket one year earlier.</caption><thead><tr><th>Month</th><th>Cost (USD)</th><th>12-month change (%)</th></tr></thead><tbody>${receipt.history.map((p) => `<tr><th>${p.month}</th><td>${p.costUSD ?? "Unavailable"}</td><td>${p.yearChangePct ?? "Unavailable"}</td></tr>`).join("")}</tbody></table></section>`
  return renderReceiptHTML(receipt, snapshot, path)
}
