import React from "react"
import { StackedAreaChart } from "semiotic"
import PlaygroundLayout from "../../components/PlaygroundLayout"

// ---------------------------------------------------------------------------
// Control schema
// ---------------------------------------------------------------------------

const controls = [
  { name: "curve", type: "select", label: "Curve", group: "Area",
    default: "linear", options: ["linear", "monotoneX", "step", "basis"] },
  { name: "areaOpacity", type: "number", label: "Area Opacity", group: "Area",
    default: 0.7, min: 0, max: 1, step: 0.05 },
  { name: "showLine", type: "boolean", label: "Show Line", group: "Area",
    default: true },
  { name: "normalize", type: "boolean", label: "Normalize (100%)", group: "Area",
    default: false },
  { name: "enableHover", type: "boolean", label: "Enable Hover", group: "Interaction",
    default: true },
  { name: "showGrid", type: "boolean", label: "Show Grid", group: "Layout",
    default: false },
  { name: "showLegend", type: "boolean", label: "Show Legend", group: "Layout",
    default: true },
  { name: "xLabel", type: "string", label: "X Label", group: "Labels",
    default: "" },
  { name: "yLabel", type: "string", label: "Y Label", group: "Labels",
    default: "" },
  { name: "title", type: "string", label: "Title", group: "Labels",
    default: "" },
]

// ---------------------------------------------------------------------------
// Datasets
// ---------------------------------------------------------------------------

const quarterlyRevenue = [
  { quarter: 1, amount: 120, product: "Software" },
  { quarter: 2, amount: 145, product: "Software" },
  { quarter: 3, amount: 160, product: "Software" },
  { quarter: 4, amount: 185, product: "Software" },
  { quarter: 5, amount: 210, product: "Software" },
  { quarter: 6, amount: 230, product: "Software" },
  { quarter: 7, amount: 255, product: "Software" },
  { quarter: 8, amount: 290, product: "Software" },
  { quarter: 1, amount: 80, product: "Hardware" },
  { quarter: 2, amount: 75, product: "Hardware" },
  { quarter: 3, amount: 90, product: "Hardware" },
  { quarter: 4, amount: 85, product: "Hardware" },
  { quarter: 5, amount: 95, product: "Hardware" },
  { quarter: 6, amount: 88, product: "Hardware" },
  { quarter: 7, amount: 100, product: "Hardware" },
  { quarter: 8, amount: 92, product: "Hardware" },
  { quarter: 1, amount: 40, product: "Services" },
  { quarter: 2, amount: 55, product: "Services" },
  { quarter: 3, amount: 62, product: "Services" },
  { quarter: 4, amount: 70, product: "Services" },
  { quarter: 5, amount: 78, product: "Services" },
  { quarter: 6, amount: 85, product: "Services" },
  { quarter: 7, amount: 95, product: "Services" },
  { quarter: 8, amount: 110, product: "Services" },
]

const monthlyExpenses = [
  { month: 1, cost: 4200, category: "Payroll" },
  { month: 2, cost: 4200, category: "Payroll" },
  { month: 3, cost: 4350, category: "Payroll" },
  { month: 4, cost: 4350, category: "Payroll" },
  { month: 5, cost: 4500, category: "Payroll" },
  { month: 6, cost: 4500, category: "Payroll" },
  { month: 7, cost: 4650, category: "Payroll" },
  { month: 8, cost: 4650, category: "Payroll" },
  { month: 9, cost: 4800, category: "Payroll" },
  { month: 10, cost: 4800, category: "Payroll" },
  { month: 11, cost: 4950, category: "Payroll" },
  { month: 12, cost: 4950, category: "Payroll" },
  { month: 1, cost: 1800, category: "Infrastructure" },
  { month: 2, cost: 1850, category: "Infrastructure" },
  { month: 3, cost: 1900, category: "Infrastructure" },
  { month: 4, cost: 2000, category: "Infrastructure" },
  { month: 5, cost: 2100, category: "Infrastructure" },
  { month: 6, cost: 2050, category: "Infrastructure" },
  { month: 7, cost: 2200, category: "Infrastructure" },
  { month: 8, cost: 2300, category: "Infrastructure" },
  { month: 9, cost: 2350, category: "Infrastructure" },
  { month: 10, cost: 2400, category: "Infrastructure" },
  { month: 11, cost: 2500, category: "Infrastructure" },
  { month: 12, cost: 2600, category: "Infrastructure" },
  { month: 1, cost: 900, category: "Marketing" },
  { month: 2, cost: 1200, category: "Marketing" },
  { month: 3, cost: 1500, category: "Marketing" },
  { month: 4, cost: 1100, category: "Marketing" },
  { month: 5, cost: 1400, category: "Marketing" },
  { month: 6, cost: 1800, category: "Marketing" },
  { month: 7, cost: 1300, category: "Marketing" },
  { month: 8, cost: 1600, category: "Marketing" },
  { month: 9, cost: 2000, category: "Marketing" },
  { month: 10, cost: 1700, category: "Marketing" },
  { month: 11, cost: 2200, category: "Marketing" },
  { month: 12, cost: 2500, category: "Marketing" },
  { month: 1, cost: 500, category: "Office & Travel" },
  { month: 2, cost: 450, category: "Office & Travel" },
  { month: 3, cost: 600, category: "Office & Travel" },
  { month: 4, cost: 550, category: "Office & Travel" },
  { month: 5, cost: 700, category: "Office & Travel" },
  { month: 6, cost: 650, category: "Office & Travel" },
  { month: 7, cost: 800, category: "Office & Travel" },
  { month: 8, cost: 750, category: "Office & Travel" },
  { month: 9, cost: 850, category: "Office & Travel" },
  { month: 10, cost: 900, category: "Office & Travel" },
  { month: 11, cost: 950, category: "Office & Travel" },
  { month: 12, cost: 1000, category: "Office & Travel" },
]

const datasets = [
  {
    label: "Quarterly Revenue by Product (3 products, 8 quarters)",
    data: quarterlyRevenue,
    xAccessor: "quarter",
    yAccessor: "amount",
    areaBy: "product",
    colorBy: "product",
    codeString: `[
  { quarter: 1, amount: 120, product: "Software" },
  { quarter: 1, amount: 80, product: "Hardware" },
  { quarter: 1, amount: 40, product: "Services" },
  // ...3 products across 8 quarters
]`,
  },
  {
    label: "Monthly Expenses by Category (4 categories, 12 months)",
    data: monthlyExpenses,
    xAccessor: "month",
    yAccessor: "cost",
    areaBy: "category",
    colorBy: "category",
    codeString: `[
  { month: 1, cost: 4200, category: "Payroll" },
  { month: 1, cost: 1800, category: "Infrastructure" },
  { month: 1, cost: 900, category: "Marketing" },
  { month: 1, cost: 500, category: "Office & Travel" },
  // ...4 categories across 12 months
]`,
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StackedAreaChartPlayground() {
  return (
    <PlaygroundLayout
      title="Stacked Area Chart Playground"
      breadcrumbs={[
        { label: "Playground", path: "/playground" },
        { label: "Stacked Area Chart", path: "/playground/stacked-area-chart" },
      ]}
      prevPage={{ title: "Bubble Chart Playground", path: "/playground/bubble-chart" }}
      nextPage={{ title: "Donut Chart Playground", path: "/playground/donut-chart" }}
      chartComponent={StackedAreaChart}
      componentName="StackedAreaChart"
      controls={controls}
      datasets={datasets}
      dataProps={(ds) => {
        const props = {
          data: ds.data,
          xAccessor: ds.xAccessor,
          yAccessor: ds.yAccessor,
          areaBy: ds.areaBy,
          height: 400,
        }
        if (ds.colorBy) props.colorBy = ds.colorBy
        return props
      }}
    >
      <p>
        Experiment with StackedAreaChart props in real time. Stacked area charts
        show how individual series contribute to a total over a continuous axis,
        making them excellent for revenue breakdowns, resource allocation, and
        composition trends. Toggle the normalize option to switch between
        absolute values and a 100% view.
      </p>
    </PlaygroundLayout>
  )
}
