// Server-side authoring only: keep validation and SVG rendering out of the React route.
import { prepareChart } from "semiotic/ai/core"
import { renderChartWithEvidence } from "semiotic/server"
import { categoryComparisonProps } from "./category-comparison"

export function checkCategoryComparison() {
  const result = prepareChart(
    { component: "BarChart", props: categoryComparisonProps },
    { render: renderChartWithEvidence },
  )
  if (!result.ok || !result.evidence || !result.svg) {
    throw new Error(result.reasons.join("; ") || "Render evidence is unavailable")
  }
  return result
}
