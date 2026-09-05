import { QUALIFICATION } from "./items"
import type { PreparedBasket } from "./types"

export function money(value: number | null, digits = 2): string {
  return value === null ? "Unavailable" : `$${value.toFixed(digits)}`
}
export function signedMoney(value: number | null): string {
  return value === null
    ? "Unavailable"
    : `${value < 0 ? "-" : value > 0 ? "+" : ""}$${Math.abs(value).toFixed(2)}`
}
export function percent(value: number | null): string {
  return value === null ? "Unavailable" : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`
}
export function monthName(month: string): string {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]
  return `${months[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`
}
export function summary(receipt: PreparedBasket): string {
  const dates = `${monthName(receipt.state.before)} to ${monthName(receipt.state.after)}`
  if (receipt.status === "unavailable")
    return `${dates}: the comparison total is unavailable because required prices are missing. No item has been silently dropped. ${receipt.scope}`
  if (receipt.status === "empty")
    return `${dates}: an empty basket costs $0.00 in both months. Percentage change is unavailable because the baseline is zero.`
  return `${dates}: ${money(receipt.beforeUSD)} becomes ${money(receipt.afterUSD)}, a change of ${signedMoney(receipt.differenceUSD)} (${percent(receipt.percentageChange)}). ${receipt.scope} ${QUALIFICATION}.`
}
export function contributionSummary(receipt: PreparedBasket): string {
  if (receipt.status === "unavailable")
    return "Available item changes are shown below, but they do not establish a complete basket difference."
  const leaders = receipt.rows.filter((row) => receipt.largestContributionIds.includes(row.itemId))
  if (!leaders.length)
    return "No selected item contributes a price difference between these months."
  return `${leaders.map((row) => row.label).join(" and ")} ${leaders.length > 1 ? "tie for" : "has"} the largest contribution by absolute dollar amount: ${leaders.map((row) => signedMoney(row.contributionUSD)).join(" and ")}. Quantities matter as well as unit-price changes.`
}
