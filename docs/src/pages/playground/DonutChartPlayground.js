import React from "react"
import { DonutChart } from "semiotic"
import PlaygroundLayout from "../../components/PlaygroundLayout"

// ---------------------------------------------------------------------------
// Control schema
// ---------------------------------------------------------------------------

const controls = [
  { name: "innerRadius", type: "number", label: "Inner Radius", group: "Donut",
    default: 60, min: 20, max: 120, step: 5 },
  { name: "slicePadding", type: "number", label: "Slice Padding", group: "Donut",
    default: 2, min: 0, max: 10, step: 1 },
  { name: "startAngle", type: "number", label: "Start Angle", group: "Donut",
    default: 0, min: 0, max: 360, step: 15 },
  { name: "enableHover", type: "boolean", label: "Enable Hover", group: "Interaction",
    default: true },
  { name: "showLegend", type: "boolean", label: "Show Legend", group: "Layout",
    default: true },
  { name: "title", type: "string", label: "Title", group: "Labels",
    default: "" },
]

// ---------------------------------------------------------------------------
// Datasets
// ---------------------------------------------------------------------------

const budgetData = [
  { category: "Housing", amount: 1850 },
  { category: "Food & Dining", amount: 720 },
  { category: "Transportation", amount: 480 },
  { category: "Healthcare", amount: 350 },
  { category: "Entertainment", amount: 280 },
  { category: "Savings", amount: 620 },
]

const marketShareData = [
  { category: "Acme Corp", amount: 34 },
  { category: "Globex", amount: 27 },
  { category: "Initech", amount: 18 },
  { category: "Umbrella", amount: 12 },
  { category: "Others", amount: 9 },
]

const datasets = [
  {
    label: "Monthly Budget (6 categories)",
    data: budgetData,
    categoryAccessor: "category",
    valueAccessor: "amount",
    codeString: `[
  { category: "Housing", amount: 1850 },
  { category: "Food & Dining", amount: 720 },
  { category: "Transportation", amount: 480 },
  { category: "Healthcare", amount: 350 },
  { category: "Entertainment", amount: 280 },
  { category: "Savings", amount: 620 },
]`,
  },
  {
    label: "Market Share (5 brands)",
    data: marketShareData,
    categoryAccessor: "category",
    valueAccessor: "amount",
    codeString: `[
  { category: "Acme Corp", amount: 34 },
  { category: "Globex", amount: 27 },
  { category: "Initech", amount: 18 },
  { category: "Umbrella", amount: 12 },
  { category: "Others", amount: 9 },
]`,
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DonutChartPlayground() {
  return (
    <PlaygroundLayout
      title="Donut Chart Playground"
      breadcrumbs={[
        { label: "Playground", path: "/playground" },
        { label: "Donut Chart", path: "/playground/donut-chart" },
      ]}
      prevPage={{ title: "Stacked Area Chart Playground", path: "/playground/stacked-area-chart" }}
      nextPage={{ title: "Treemap Playground", path: "/playground/treemap" }}
      chartComponent={DonutChart}
      componentName="DonutChart"
      controls={controls}
      datasets={datasets}
      dataProps={(ds) => ({
        data: ds.data,
        categoryAccessor: ds.categoryAccessor,
        valueAccessor: ds.valueAccessor,
        height: 400,
        width: 400,
      })}
    >
      <p>
        Experiment with DonutChart props in real time. Donut charts are ideal for
        showing proportional breakdowns at a glance. Adjust the inner radius to
        control the hole size, tweak the start angle for orientation, and use
        slice padding to separate segments. Copy the generated code when you have
        the look you want.
      </p>
    </PlaygroundLayout>
  )
}
