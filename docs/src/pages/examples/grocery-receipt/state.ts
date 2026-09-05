import type { BasketState, GrocerySnapshot } from "./types"

export function defaultState(snapshot: GrocerySnapshot): BasketState {
  return {
    version: 1,
    editionId: snapshot.editionId,
    before: "2019-06",
    after: "2025-06",
    mode: "basket",
    quantities: snapshot.items.map(({ itemId, quantityUnit, defaultQuantity }) => ({
      itemId,
      quantityUnit,
      quantity: defaultQuantity,
    })),
  }
}

export function validateState(value: unknown, snapshot: GrocerySnapshot): BasketState {
  if (!value || typeof value !== "object")
    throw new Error("The saved comparison is not a receipt state.")
  const state = value as BasketState
  if (state.version !== 1)
    throw new Error("This receipt version is unsupported. Open it in the edition that created it.")
  if (state.editionId !== snapshot.editionId)
    throw new Error(
      "This comparison belongs to another edition. Its quantities have not been reset.",
    )
  if (![state.before, state.after].every((month) => snapshot.months.includes(month))) {
    throw new Error("A comparison month is outside this edition's 2019-2025 coverage.")
  }
  if (!["basket", "comparable-subset"].includes(state.mode))
    throw new Error("Unknown comparison scope.")
  if (!Array.isArray(state.quantities) || state.quantities.length !== snapshot.items.length) {
    throw new Error("The saved comparison must identify all six items, including zero quantities.")
  }
  const seen = new Set<string>()
  for (const entry of state.quantities) {
    const item = snapshot.items.find((candidate) => candidate.itemId === entry?.itemId)
    if (!item || seen.has(entry.itemId))
      throw new Error("An item is unknown or duplicated. The selection is unresolved.")
    seen.add(entry.itemId)
    if (entry.quantityUnit !== item.quantityUnit)
      throw new Error(`The unit for ${item.label} has changed.`)
    if (
      !Number.isFinite(entry.quantity) ||
      entry.quantity < 0 ||
      entry.quantity > 100 ||
      !Number.isInteger(entry.quantity * 4)
    ) {
      throw new Error("Quantities must be between 0 and 100 in quarter-unit steps.")
    }
  }
  return {
    version: 1,
    editionId: state.editionId,
    before: state.before,
    after: state.after,
    mode: state.mode,
    quantities: snapshot.items.map((item) => ({
      ...state.quantities.find((entry) => entry.itemId === item.itemId)!,
    })),
  }
}

export function stateIdentity(state: BasketState): string {
  const quantities = [...state.quantities].sort((a, b) => a.itemId.localeCompare(b.itemId, "en"))
  return [
    "e01-v1",
    state.editionId,
    state.before,
    state.after,
    state.mode,
    ...quantities.map((row) => `${row.itemId}:${row.quantity}:${row.quantityUnit}`),
  ].join("|")
}

export function receiptSearch(state: BasketState): string {
  return `?receipt=${encodeURIComponent(JSON.stringify(state))}`
}

export function readReceiptSearch(search: string, snapshot: GrocerySnapshot): BasketState {
  const params = new URLSearchParams(search)
  if (!params.has("receipt")) return defaultState(snapshot)
  if (params.getAll("receipt").length !== 1 || search.length > 5000)
    throw new Error("The saved receipt link is malformed.")
  let value: unknown
  try {
    value = JSON.parse(params.get("receipt")!)
  } catch {
    throw new Error("The saved receipt could not be read. Choose reset to start a new comparison.")
  }
  return validateState(value, snapshot)
}
