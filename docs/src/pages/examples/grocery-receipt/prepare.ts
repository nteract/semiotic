import { ITEMS } from "./items"
import { stateIdentity, validateState } from "./state"
import type { BasketState, GrocerySnapshot, PreparedBasket, PriceRow, ReceiptRow } from "./types"

// BLS publishes these prices to 0.001 USD. Quarter-unit quantities give an
// exact integer accounting unit of 1/4000 USD; no money is rounded to cents
// during preparation, contribution checks, or annual-change calculations.
function priceMillis(row: PriceRow | undefined): number | null {
  if (!row || row.sourceStatus === "unavailable") return null
  return Math.round(row.priceUSD! * 1000)
}

export function prepareBasket(snapshot: GrocerySnapshot, input: BasketState): PreparedBasket {
  if (snapshot.schemaVersion !== 1 || snapshot.storyId !== "E01")
    throw new Error("Unsupported source edition.")
  if (snapshot.items.length !== ITEMS.length)
    throw new Error("The six-item source dictionary has changed.")
  for (const expected of ITEMS) {
    const actual = snapshot.items.filter((item) => item.itemId === expected.itemId)
    if (
      actual.length !== 1 ||
      actual[0].seriesId !== expected.seriesId ||
      actual[0].quantityUnit !== expected.quantityUnit ||
      actual[0].sourceTitle !== expected.sourceTitle
    ) {
      throw new Error(
        `Source definition or unit changed for ${expected.label}. Admit a new edition before calculating.`,
      )
    }
  }
  const state = validateState(input, snapshot)
  const lookup = new Map<string, PriceRow>()
  for (const row of snapshot.rows) {
    const item = snapshot.items.find((candidate) => candidate.itemId === row.itemId)
    const key = `${row.itemId}|${row.month}`
    if (
      !item ||
      row.seriesId !== item.seriesId ||
      row.quantityUnit !== item.quantityUnit ||
      row.snapshotId !== snapshot.editionId ||
      row.id !== `${row.seriesId}:${row.month}` ||
      lookup.has(key)
    ) {
      throw new Error("A source row has a mismatched identity, unit, edition, or duplicate month.")
    }
    if (row.sourceStatus === "observed") {
      if (
        row.priceUSD === null ||
        !Number.isFinite(row.priceUSD) ||
        row.priceUSD < 0 ||
        row.priceUSD > 10000 ||
        Math.abs(row.priceUSD * 1000 - Math.round(row.priceUSD * 1000)) > 1e-7
      ) {
        throw new Error("An observed source price is invalid or exceeds the admitted precision.")
      }
    } else if (row.sourceStatus !== "unavailable" || row.priceUSD !== null) {
      throw new Error(
        "Missing source prices must be explicitly unavailable, never numeric placeholders.",
      )
    }
    lookup.set(key, row)
  }
  const get = (itemId: string, month: string) => lookup.get(`${itemId}|${month}`)
  const rows: ReceiptRow[] = snapshot.items.map((item) => {
    const quantity = state.quantities.find((entry) => entry.itemId === item.itemId)!.quantity
    const before = get(item.itemId, state.before)
    const after = get(item.itemId, state.after)
    const a = priceMillis(before)
    const b = priceMillis(after)
    const missingMonths = [
      ...new Set([...(a === null ? [state.before] : []), ...(b === null ? [state.after] : [])]),
    ]
    const included = quantity > 0 && (state.mode === "basket" || missingMonths.length === 0)
    const beforeUSD =
      quantity === 0 ? 0 : !included || a === null ? null : (a * (quantity * 4)) / 4000
    const afterUSD =
      quantity === 0 ? 0 : !included || b === null ? null : (b * (quantity * 4)) / 4000
    return {
      ...item,
      quantity,
      included,
      missingMonths,
      beforePriceUSD: a === null ? null : a / 1000,
      afterPriceUSD: b === null ? null : b / 1000,
      beforeUSD,
      afterUSD,
      contributionUSD:
        quantity === 0
          ? 0
          : !included || a === null || b === null
            ? null
            : ((b - a) * (quantity * 4)) / 4000,
      sourceRowIds: [...new Set([before?.id, after?.id].filter((id): id is string => Boolean(id)))],
    }
  })
  const selected = rows.filter((row) => row.quantity > 0)
  const included = rows.filter((row) => row.included)
  const excluded = selected.filter((row) => !row.included)
  const empty = selected.length === 0
  const unavailable =
    !empty && (included.length === 0 || included.some((row) => row.missingMonths.length > 0))
  function cost(month: string): number | null {
    if (empty) return 0
    if (included.length === 0) return null
    let amount = 0
    for (const item of included) {
      const price = priceMillis(get(item.itemId, month))
      if (price === null) return null
      amount += price * (item.quantity * 4)
    }
    return amount
  }
  const a = unavailable ? null : cost(state.before)
  const b = unavailable ? null : cost(state.after)
  const contributions = included.filter((row) => row.contributionUSD !== null)
  const largest = contributions.length
    ? Math.max(...contributions.map((row) => Math.abs(row.contributionUSD!)))
    : 0
  const scope =
    state.mode === "comparable-subset"
      ? `Comparable subset: ${included.map((row) => row.label).join(", ") || "no eligible items"}. Excluded from both dates: ${excluded.map((row) => row.label).join(", ") || "none"}.`
      : empty
        ? "Empty basket: all six quantities are zero."
        : `Fixed basket: ${selected.map((row) => `${row.quantity} ${row.quantityUnit} ${row.label}`).join(", ")}.`
  return {
    state,
    stateId: stateIdentity(state),
    scope,
    status: empty ? "empty" : unavailable ? "unavailable" : "available",
    rows,
    excludedItemIds: excluded.map((row) => row.itemId),
    beforeUSD: a === null ? null : a / 4000,
    afterUSD: b === null ? null : b / 4000,
    differenceUSD: a === null || b === null ? null : (b - a) / 4000,
    percentageChange: a === null || b === null || a === 0 ? null : ((b - a) / a) * 100,
    largestContributionIds:
      largest === 0
        ? []
        : contributions
            .filter((row) => Math.abs(row.contributionUSD!) === largest)
            .map((row) => row.itemId),
    history: snapshot.months.map((month, monthIndex) => {
      const now = cost(month)
      const previous = cost(`${Number(month.slice(0, 4)) - 1}${month.slice(4)}`)
      return {
        month,
        monthIndex,
        costUSD: now === null ? null : now / 4000,
        yearChangePct:
          now === null || previous === null || previous === 0
            ? null
            : ((now - previous) / previous) * 100,
      }
    }),
  }
}
