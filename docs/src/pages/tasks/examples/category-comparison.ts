import type { BarChartProps } from "semiotic/ordinal"

export const regionalTotals = [
  { region: "North", total: 12 },
  { region: "South", total: 30 },
  { region: "West", total: 18 },
]

export const categoryComparisonProps = {
  data: regionalTotals,
  categoryAccessor: "region",
  valueAccessor: "total",
  sort: false,
  title: "Regional totals",
  description: "Synthetic regional totals in the same unit: North 12, South 30, West 18.",
  summary:
    "South has the largest total, 30. The three regions total 60 units. Open the data table for exact values.",
  accessibleTable: true,
  valueLabel: "Units",
  height: 300,
} satisfies BarChartProps<(typeof regionalTotals)[number]>
