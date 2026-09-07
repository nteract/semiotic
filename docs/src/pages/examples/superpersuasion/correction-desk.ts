import type { ArtifactContract } from "semiotic/artifact"
import type { GroupedBarChartProps } from "semiotic/ordinal"
import {
  inspectSourceHandoff,
  originalRows,
  sourceChartProps,
  sourceCorrectionSidecar,
} from "../../tasks/examples/source-correction"

export function correctionComparisonProps(rows: typeof originalRows) {
  const data = originalRows.flatMap((original) => [
    { ...original, edition: "Published" },
    { ...rows.find((row) => row.region === original.region)!, edition: "Current" },
  ])
  return {
    data,
    categoryAccessor: "region",
    valueAccessor: "total",
    groupBy: "edition",
    colorBy: "edition",
    colorScheme: { Published: "#ba7138", Current: "#24766d" },
    orientation: "horizontal",
    valueExtent: [0, 40],
    valueLabel: "Illustrative units",
    height: 310,
    responsiveWidth: true,
    showGrid: true,
    showLegend: false,
    barPadding: 26,
    title: "What changed in the source",
    description: `Published and current totals for three fictional regions. ${sourceChartProps(rows).summary}`,
    summary:
      "Paired bars compare the published figures with the current figures. Read the values below the chart.",
    accessibleTable: true,
    styleRules: [
      {
        when: { field: "edition", eq: "Published" },
        style: {
          fill: {
            type: "hatch",
            background: "#f5e4d1",
            stroke: "#915221",
            spacing: 5,
            lineWidth: 1,
          },
          stroke: "#915221",
          strokeWidth: 1,
        },
      },
    ],
  } satisfies GroupedBarChartProps<(typeof data)[number]>
}

export function correctionDownload(
  props: ReturnType<typeof sourceChartProps>,
  contract: ArtifactContract,
  includeContext: boolean,
) {
  const packet = includeContext ? JSON.parse(sourceCorrectionSidecar(contract).content) : undefined
  const inspection = inspectSourceHandoff(props, packet)
  if (inspection.status === "refused") throw new Error(inspection.message)
  return {
    format: "semiotic-superpersuasion-handoff/v1",
    chart: { component: "BarChart", props },
    ...(packet ? { context: packet } : {}),
  }
}
