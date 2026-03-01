import React from "react"
import { BarChart } from "semiotic"
import PlaygroundLayout from "../../components/PlaygroundLayout"

// ---------------------------------------------------------------------------
// Control schema
// ---------------------------------------------------------------------------

const controls = [
  { name: "orientation", type: "select", label: "Orientation", group: "Bars",
    default: "vertical", options: ["vertical", "horizontal"] },
  { name: "barPadding", type: "number", label: "Bar Padding", group: "Bars",
    default: 5, min: 0, max: 30, step: 1 },
  { name: "sort", type: "select", label: "Sort", group: "Bars",
    default: "none", options: ["none", "asc", "desc"] },
  { name: "enableHover", type: "boolean", label: "Enable Hover", group: "Interaction",
    default: true },
  { name: "showGrid", type: "boolean", label: "Show Grid", group: "Layout",
    default: false },
  { name: "showLegend", type: "boolean", label: "Show Legend", group: "Layout",
    default: true },
  { name: "categoryLabel", type: "string", label: "Category Label", group: "Labels",
    default: "" },
  { name: "valueLabel", type: "string", label: "Value Label", group: "Labels",
    default: "" },
  { name: "title", type: "string", label: "Title", group: "Labels",
    default: "" },
]

// ---------------------------------------------------------------------------
// Datasets
// ---------------------------------------------------------------------------

const departmentSales = [
  { category: "Electronics", value: 42000 },
  { category: "Clothing", value: 28000 },
  { category: "Home", value: 35000 },
  { category: "Sports", value: 18000 },
  { category: "Books", value: 12000 },
  { category: "Toys", value: 22000 },
]

const byRegion = [
  { category: "Electronics", value: 42000, region: "North" },
  { category: "Clothing", value: 28000, region: "North" },
  { category: "Home", value: 35000, region: "South" },
  { category: "Sports", value: 18000, region: "South" },
  { category: "Books", value: 12000, region: "East" },
  { category: "Toys", value: 22000, region: "East" },
]

const monthlyTotals = [
  { category: "Jan", value: 31000 },
  { category: "Feb", value: 28000 },
  { category: "Mar", value: 34000 },
  { category: "Apr", value: 29000 },
  { category: "May", value: 36000 },
  { category: "Jun", value: 42000 },
  { category: "Jul", value: 38000 },
  { category: "Aug", value: 45000 },
  { category: "Sep", value: 40000 },
  { category: "Oct", value: 48000 },
  { category: "Nov", value: 52000 },
  { category: "Dec", value: 58000 },
]

const datasets = [
  {
    label: "Department Sales (6 categories)",
    data: departmentSales,
    codeString: `[
  { category: "Electronics", value: 42000 },
  { category: "Clothing", value: 28000 },
  { category: "Home", value: 35000 },
  { category: "Sports", value: 18000 },
  { category: "Books", value: 12000 },
  { category: "Toys", value: 22000 },
]`,
  },
  {
    label: "Colored by Region",
    data: byRegion,
    colorBy: "region",
    codeString: `[
  { category: "Electronics", value: 42000, region: "North" },
  { category: "Clothing", value: 28000, region: "North" },
  { category: "Home", value: 35000, region: "South" },
  // ...6 categories with region
]`,
  },
  {
    label: "Monthly Totals (12 categories)",
    data: monthlyTotals,
    codeString: `[
  { category: "Jan", value: 31000 },
  { category: "Feb", value: 28000 },
  // ...12 months
]`,
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BarChartPlayground() {
  return (
    <PlaygroundLayout
      title="Bar Chart Playground"
      breadcrumbs={[
        { label: "Playground", path: "/playground" },
        { label: "Bar Chart", path: "/playground/bar-chart" },
      ]}
      prevPage={{ title: "Line Chart Playground", path: "/playground/line-chart" }}
      nextPage={{ title: "Scatterplot Playground", path: "/playground/scatterplot" }}
      chartComponent={BarChart}
      componentName="BarChart"
      controls={controls}
      datasets={datasets}
      dataProps={(ds) => {
        const props = {
          data: ds.data,
          categoryAccessor: "category",
          valueAccessor: "value",
          height: 400,
        }
        if (ds.colorBy) props.colorBy = ds.colorBy
        return props
      }}
      mapProps={(name, value) => {
        // "none" means no sorting — skip the prop
        if (name === "sort" && value === "none") return undefined
        return value
      }}
    >
      <p>
        Experiment with BarChart props in real time. Adjust the controls below
        the chart to see how each prop affects the visualization, then copy the
        generated code.
      </p>
    </PlaygroundLayout>
  )
}
