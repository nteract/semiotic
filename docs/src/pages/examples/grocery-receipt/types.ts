export type QuantityUnit = "lb" | "dozen" | "gallon"

export interface GroceryItem {
  itemId: string
  seriesId: string
  label: string
  sourceTitle: string
  quantityUnit: QuantityUnit
  defaultQuantity: number
}

export interface PriceRow {
  id: string
  seriesId: string
  itemId: string
  month: string
  priceUSD: number | null
  quantityUnit: QuantityUnit
  sourceStatus: "observed" | "unavailable"
  footnotes: string[]
  snapshotId: string
}

export interface SourceFile {
  file: string
  url: string
  retrievedAt: string
  sha256: string
  bytes: number
  request?: Record<string, unknown>
}

export interface GrocerySnapshot {
  schemaVersion: 1
  storyId: "E01"
  editionId: string
  retrievedAt: string
  transformVersion: string
  geography: string
  months: string[]
  items: GroceryItem[]
  rows: PriceRow[]
  sources: SourceFile[]
}

export interface BasketState {
  version: 1
  editionId: string
  before: string
  after: string
  mode: "basket" | "comparable-subset"
  quantities: { itemId: string; quantity: number; quantityUnit: QuantityUnit }[]
}

export interface ReceiptRow extends GroceryItem {
  quantity: number
  beforePriceUSD: number | null
  afterPriceUSD: number | null
  beforeUSD: number | null
  afterUSD: number | null
  contributionUSD: number | null
  included: boolean
  missingMonths: string[]
  sourceRowIds: string[]
}

export interface PreparedBasket {
  state: BasketState
  stateId: string
  scope: string
  status: "available" | "unavailable" | "empty"
  rows: ReceiptRow[]
  excludedItemIds: string[]
  beforeUSD: number | null
  afterUSD: number | null
  differenceUSD: number | null
  percentageChange: number | null
  largestContributionIds: string[]
  history: {
    month: string
    monthIndex: number
    costUSD: number | null
    yearChangePct: number | null
  }[]
}
