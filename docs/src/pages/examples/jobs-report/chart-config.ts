import type { WaterfallChartProps, LineChartProps } from "semiotic/xy"
import type { DotPlot } from "semiotic/ordinal"
import type { ComponentProps } from "react"
import {
  dateName,
  monthName,
  months,
  prepareMonth,
  type JobsSnapshot,
  type PreparedMonth,
} from "./model"

export function waterfallProps(selected: PreparedMonth) {
  const { first, third, latest } = selected
  const data =
    first && latest
      ? [
          { step: "First estimate", change: first.change },
          ...(third ? [{ step: "Revision to third", change: third.change - first.change }] : []),
          {
            step: third ? "Since the third" : "Revision since first",
            change: latest.change - (third ?? first).change,
          },
        ]
      : []
  return {
    data,
    xAccessor: "step",
    yAccessor: "change",
    pointIdAccessor: "step",
    width: 760,
    height: 340,
    margin: { top: 32, right: 25, bottom: 56, left: 80 },
    title: `${monthName(selected.month)}: revisions`,
    description:
      "Each floating bar adds or subtracts a revision. Its endpoint is the running estimate, in jobs; bar length is the change between drafts, not another month's employment.",
    summary: selected.summary,
    accessibleTable: true,
    enableHover: false,
    positiveColor: "#215a75",
    negativeColor: "#a53f30",
    connectorStroke: "#716b61",
    yLabel: "Jobs",
    showGrid: true,
    showLegend: false,
  } satisfies WaterfallChartProps<{ step: string; change: number }>
}

export function lineProps(snapshot: JobsSnapshot, asOf: string, reportedThen: boolean) {
  // Keep separate segments at the missing October first estimate. Never bridge it.
  const data = months.flatMap((month, index) => {
    const row = prepareMonth(snapshot, month, asOf)
    const value = reportedThen ? row.first : row.latest
    return value
      ? [
          {
            month: index + 1,
            change: value.change,
            segment: reportedThen && month > "2025-10" ? "after gap" : "series",
          },
        ]
      : []
  })
  return {
    data,
    xAccessor: "month",
    yAccessor: "change",
    lineBy: "segment",
    width: 760,
    height: 300,
    margin: { top: 30, right: 25, bottom: 55, left: 80 },
    title: reportedThen ? "First estimates" : `${dateName(asOf)} vintage`,
    description:
      "Seasonally adjusted U.S. nonfarm payroll change, in jobs. Horizontal positions 1–24 mean January 2024 through December 2025. The first-estimate series has an explicit October 2025 gap.",
    summary:
      "The complete comparison table below gives reference months, publication dates and exact values. A first-estimate line combines different vintages; it is not a coherent annual total.",
    accessibleTable: true,
    showLegend: false,
    showPoints: true,
    colorScheme: [reportedThen ? "#215a75" : "#a53f30", "#215a75"],
    yLabel: "Jobs",
    xLabel: "Reference month",
    yExtent: [-200000, 400000],
    enableHover: false,
  } satisfies LineChartProps<{ month: number; change: number; segment: string }>
}

export function pairedProps(snapshot: JobsSnapshot, year: string) {
  const data = months
    .filter((month) => month.startsWith(year))
    .flatMap((month) => {
      const row = prepareMonth(snapshot, month)
      return [
        ...(row.first
          ? [{ month: monthName(month), change: row.first.change, stage: "First" }]
          : []),
        ...(row.latest
          ? [{ month: monthName(month), change: row.latest.change, stage: "Mar 6, 2026" }]
          : []),
      ]
    })
  return {
    data,
    categoryAccessor: "month",
    valueAccessor: "change",
    colorBy: "stage",
    colorScheme: { First: "#215a75", "Mar 6, 2026": "#a53f30" },
    sort: false,
    width: 760,
    height: 500,
    margin: { top: 40, left: 145, bottom: 65, right: 35 },
    orientation: "horizontal",
    valueExtent: [-200000, 400000],
    dotRadius: 5,
    title: `${year}: first and later estimates`,
    valueLabel: "Monthly employment change · jobs",
    description:
      "Blue dots show first estimates; red dots show the March 6, 2026 vintage. Both years use the same scale. October 2025 has no first dot. Exact values and dates appear in the table.",
    summary:
      "Distance between dots shows how much the estimate changed. Dots across zero show a change in estimated direction. No line or first dot is invented for missing October data.",
    accessibleTable: true,
    enableHover: false,
    showLegend: true,
    legendPosition: "bottom",
  } satisfies ComponentProps<typeof DotPlot>
}
