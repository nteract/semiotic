import React from "react"
import { BubbleChart } from "semiotic"
import PlaygroundLayout from "../../components/PlaygroundLayout"

// ---------------------------------------------------------------------------
// Control schema
// ---------------------------------------------------------------------------

const controls = [
  { name: "sizeRange", type: "number", label: "Size Range Min", group: "Bubbles",
    default: 5, min: 1, max: 20, step: 1, propPath: ["sizeRange", 0] },
  { name: "sizeRangeMax", type: "number", label: "Size Range Max", group: "Bubbles",
    default: 40, min: 20, max: 80, step: 5, propPath: ["sizeRange", 1] },
  { name: "bubbleOpacity", type: "number", label: "Bubble Opacity", group: "Bubbles",
    default: 0.6, min: 0, max: 1, step: 0.05 },
  { name: "bubbleStrokeWidth", type: "number", label: "Stroke Width", group: "Bubbles",
    default: 1, min: 0, max: 5, step: 0.5 },
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

const countryData = [
  { country: "United States", gdp: 63544, lifeExpectancy: 77.3, population: 331900000, continent: "Americas" },
  { country: "China", gdp: 12556, lifeExpectancy: 78.2, population: 1412000000, continent: "Asia" },
  { country: "Germany", gdp: 51204, lifeExpectancy: 81.3, population: 83200000, continent: "Europe" },
  { country: "Japan", gdp: 39313, lifeExpectancy: 84.6, population: 125700000, continent: "Asia" },
  { country: "Brazil", gdp: 8918, lifeExpectancy: 75.9, population: 214300000, continent: "Americas" },
  { country: "India", gdp: 2277, lifeExpectancy: 70.2, population: 1408000000, continent: "Asia" },
  { country: "United Kingdom", gdp: 46510, lifeExpectancy: 81.0, population: 67400000, continent: "Europe" },
  { country: "France", gdp: 43519, lifeExpectancy: 82.5, population: 67750000, continent: "Europe" },
  { country: "Nigeria", gdp: 2066, lifeExpectancy: 54.7, population: 218500000, continent: "Africa" },
  { country: "Australia", gdp: 51812, lifeExpectancy: 83.4, population: 25900000, continent: "Oceania" },
]

const cityData = [
  { city: "San Francisco", medianIncome: 112449, costIndex: 95, techWorkers: 320000 },
  { city: "New York", medianIncome: 67046, costIndex: 100, techWorkers: 410000 },
  { city: "Austin", medianIncome: 71576, costIndex: 62, techWorkers: 180000 },
  { city: "Seattle", medianIncome: 97185, costIndex: 78, techWorkers: 280000 },
  { city: "Denver", medianIncome: 72661, costIndex: 58, techWorkers: 120000 },
  { city: "Chicago", medianIncome: 58247, costIndex: 55, techWorkers: 190000 },
  { city: "Boston", medianIncome: 76298, costIndex: 82, techWorkers: 210000 },
  { city: "Miami", medianIncome: 44268, costIndex: 65, techWorkers: 75000 },
  { city: "Portland", medianIncome: 65740, costIndex: 60, techWorkers: 95000 },
  { city: "Atlanta", medianIncome: 59948, costIndex: 52, techWorkers: 145000 },
  { city: "Los Angeles", medianIncome: 65290, costIndex: 80, techWorkers: 350000 },
  { city: "Raleigh", medianIncome: 63891, costIndex: 45, techWorkers: 90000 },
]

const datasets = [
  {
    label: "Country GDP vs Life Expectancy (10 countries)",
    data: countryData,
    xAccessor: "gdp",
    yAccessor: "lifeExpectancy",
    sizeBy: "population",
    colorBy: "continent",
    codeString: `[
  { country: "United States", gdp: 63544, lifeExpectancy: 77.3, population: 331900000, continent: "Americas" },
  { country: "China", gdp: 12556, lifeExpectancy: 78.2, population: 1412000000, continent: "Asia" },
  { country: "Germany", gdp: 51204, lifeExpectancy: 81.3, population: 83200000, continent: "Europe" },
  // ...10 countries with GDP per capita, life expectancy, and population
]`,
  },
  {
    label: "US Cities: Income vs Cost of Living (12 cities)",
    data: cityData,
    xAccessor: "medianIncome",
    yAccessor: "costIndex",
    sizeBy: "techWorkers",
    codeString: `[
  { city: "San Francisco", medianIncome: 112449, costIndex: 95, techWorkers: 320000 },
  { city: "New York", medianIncome: 67046, costIndex: 100, techWorkers: 410000 },
  { city: "Austin", medianIncome: 71576, costIndex: 62, techWorkers: 180000 },
  // ...12 cities with income, cost index, and tech workforce size
]`,
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BubbleChartPlayground() {
  return (
    <PlaygroundLayout
      title="Bubble Chart Playground"
      breadcrumbs={[
        { label: "Playground", path: "/playground" },
        { label: "Bubble Chart", path: "/playground/bubble-chart" },
      ]}
      prevPage={{ title: "Sankey Diagram Playground", path: "/playground/sankey-diagram" }}
      nextPage={{ title: "Stacked Area Chart Playground", path: "/playground/stacked-area-chart" }}
      chartComponent={BubbleChart}
      componentName="BubbleChart"
      controls={controls}
      datasets={datasets}
      dataProps={(ds) => {
        const props = {
          data: ds.data,
          xAccessor: ds.xAccessor,
          yAccessor: ds.yAccessor,
          sizeBy: ds.sizeBy,
          height: 400,
        }
        if (ds.colorBy) props.colorBy = ds.colorBy
        return props
      }}
    >
      <p>
        Experiment with BubbleChart props in real time. Bubble charts encode a
        third numeric dimension as circle area, making them ideal for comparing
        items across three measures simultaneously. Adjust the size range,
        opacity, and stroke controls to refine the look, then copy the generated
        code.
      </p>
    </PlaygroundLayout>
  )
}
