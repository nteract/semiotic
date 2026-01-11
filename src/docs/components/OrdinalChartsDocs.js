import * as React from "react"
import { useState } from "react"
import DocumentComponent from "../layout/DocumentComponent"
import {
  BarChart,
  StackedBarChart,
  SwarmPlot,
  BoxPlot,
  DotPlot
} from "../../components"
import { TooltipProvider } from "../../components/store/TooltipStore"

const components = []

components.push({
  name: "Ordinal Charts"
})

const OrdinalChartsDocs = () => {
  const [barOrientation, setBarOrientation] = useState("vertical")
  const [stackedMode, setStackedMode] = useState("normal")

  const barData = [
    { category: "Product A", value: 450, type: "Electronics" },
    { category: "Product B", value: 380, type: "Clothing" },
    { category: "Product C", value: 520, type: "Electronics" },
    { category: "Product D", value: 290, type: "Food" },
    { category: "Product E", value: 410, type: "Clothing" },
    { category: "Product F", value: 340, type: "Food" }
  ]

  const stackedData = [
    { quarter: "Q1", product: "Widget", value: 100 },
    { quarter: "Q1", product: "Gadget", value: 150 },
    { quarter: "Q1", product: "Doohickey", value: 80 },
    { quarter: "Q2", product: "Widget", value: 120 },
    { quarter: "Q2", product: "Gadget", value: 180 },
    { quarter: "Q2", product: "Doohickey", value: 90 },
    { quarter: "Q3", product: "Widget", value: 90 },
    { quarter: "Q3", product: "Gadget", value: 200 },
    { quarter: "Q3", product: "Doohickey", value: 110 },
    { quarter: "Q4", product: "Widget", value: 140 },
    { quarter: "Q4", product: "Gadget", value: 170 },
    { quarter: "Q4", product: "Doohickey", value: 95 }
  ]

  const swarmData = []
  const categories = ["Group A", "Group B", "Group C", "Group D"]
  categories.forEach((category) => {
    for (let i = 0; i < 20; i++) {
      swarmData.push({
        category,
        value: Math.random() * 30 + (categories.indexOf(category) * 10 + 10)
      })
    }
  })

  const boxData = []
  categories.forEach((category) => {
    const mean = categories.indexOf(category) * 5 + 20
    for (let i = 0; i < 30; i++) {
      const value = mean + (Math.random() - 0.5) * 15
      boxData.push({ category, value })
    }
  })

  const dotData = [
    { item: "Feature A", score: 85, priority: "High" },
    { item: "Feature B", score: 92, priority: "High" },
    { item: "Feature C", score: 78, priority: "Medium" },
    { item: "Feature D", score: 95, priority: "High" },
    { item: "Feature E", score: 65, priority: "Low" },
    { item: "Feature F", score: 88, priority: "Medium" },
    { item: "Feature G", score: 71, priority: "Low" }
  ]

  const examples = []

  // BarChart
  const orientationOptions = ["vertical", "horizontal"].map((d) => (
    <option key={d} value={d}>
      {d}
    </option>
  ))

  const buttons = [
    <form key="bar-orientation">
      <label htmlFor="bar-orientation">Bar Orientation: </label>
      <select
        value={barOrientation}
        onChange={(e) => setBarOrientation(e.target.value)}
      >
        {orientationOptions}
      </select>
    </form>
  ]

  examples.push({
    name: "BarChart",
    demo: (
      <TooltipProvider>
        <BarChart
          data={barData}
          width={500}
          height={350}
          orientation={barOrientation}
          categoryLabel="Products"
          valueLabel="Sales ($K)"
          colorBy="type"
          sort="desc"
        />
      </TooltipProvider>
    ),
    source: `<BarChart
  data={data}
  width={500}
  height={350}
  orientation="${barOrientation}"
  categoryLabel="Products"
  valueLabel="Sales ($K)"
  colorBy="type"
  sort="desc"
/>`
  })

  // StackedBarChart
  const stackedModeOptions = ["normal", "normalized"].map((d) => (
    <option key={d} value={d}>
      {d}
    </option>
  ))

  const stackedButtons = [
    <form key="stacked-mode">
      <label htmlFor="stacked-mode">Mode: </label>
      <select
        value={stackedMode}
        onChange={(e) => setStackedMode(e.target.value)}
      >
        {stackedModeOptions}
      </select>
    </form>
  ]

  examples.push({
    name: "StackedBarChart",
    demo: (
      <TooltipProvider>
        <StackedBarChart
          data={stackedData}
          width={500}
          height={350}
          stackBy="product"
          categoryAccessor="quarter"
          colorBy="product"
          categoryLabel="Quarter"
          valueLabel={stackedMode === "normalized" ? "Percentage" : "Sales ($K)"}
          normalize={stackedMode === "normalized"}
          showLegend={true}
        />
      </TooltipProvider>
    ),
    source: `<StackedBarChart
  data={data}
  width={500}
  height={350}
  stackBy="product"
  categoryAccessor="quarter"
  colorBy="product"
  categoryLabel="Quarter"
  valueLabel="${stackedMode === "normalized" ? "Percentage" : "Sales ($K)"}"
  normalize={${stackedMode === "normalized"}}
  showLegend={true}
/>`
  })

  // SwarmPlot
  examples.push({
    name: "SwarmPlot",
    demo: (
      <TooltipProvider>
        <SwarmPlot
          data={swarmData}
          width={500}
          height={350}
          categoryLabel="Groups"
          valueLabel="Measurement"
          colorBy="category"
          pointRadius={4}
        />
      </TooltipProvider>
    ),
    source: `<SwarmPlot
  data={data}
  width={500}
  height={350}
  categoryLabel="Groups"
  valueLabel="Measurement"
  colorBy="category"
  pointRadius={4}
/>`
  })

  // BoxPlot
  examples.push({
    name: "BoxPlot",
    demo: (
      <TooltipProvider>
        <BoxPlot
          data={boxData}
          width={500}
          height={350}
          categoryLabel="Groups"
          valueLabel="Value"
          colorBy="category"
          showOutliers={true}
        />
      </TooltipProvider>
    ),
    source: `<BoxPlot
  data={data}
  width={500}
  height={350}
  categoryLabel="Groups"
  valueLabel="Value"
  colorBy="category"
  showOutliers={true}
/>`
  })

  // DotPlot
  examples.push({
    name: "DotPlot",
    demo: (
      <TooltipProvider>
        <DotPlot
          data={dotData}
          width={500}
          height={350}
          categoryAccessor="item"
          valueAccessor="score"
          categoryLabel="Features"
          valueLabel="Score"
          colorBy="priority"
          sort="desc"
          showGrid={true}
          dotRadius={6}
        />
      </TooltipProvider>
    ),
    source: `<DotPlot
  data={data}
  width={500}
  height={350}
  categoryAccessor="item"
  valueAccessor="score"
  categoryLabel="Features"
  valueLabel="Score"
  colorBy="priority"
  sort="desc"
  showGrid={true}
  dotRadius={6}
/>`
  })

  return (
    <DocumentComponent
      name="Ordinal Charts"
      components={components}
      examples={examples}
      buttons={[...buttons, ...stackedButtons]}
    >
      <p>
        Ordinal chart components provide simplified APIs for creating
        categorical data visualizations. All ordinal charts are built on top of
        OrdinalFrame and inherit its powerful features.
      </p>

      <h2>BarChart</h2>
      <p>
        Display categorical data with rectangular bars. Supports both vertical
        and horizontal orientations, sorting, and color encoding.
      </p>
      <p>
        <strong>Key props:</strong> <code>orientation</code>,{" "}
        <code>sort</code> (true, false, "asc", "desc", or function),{" "}
        <code>colorBy</code>, <code>barPadding</code>
      </p>

      <h2>StackedBarChart</h2>
      <p>
        Show part-to-whole relationships with stacked bars. Supports normal and
        normalized (100%) modes with automatic legend generation.
      </p>
      <p>
        <strong>Key props:</strong> <code>stackBy</code> (required),{" "}
        <code>normalize</code>, <code>showLegend</code>,{" "}
        <code>orientation</code>
      </p>

      <h2>SwarmPlot</h2>
      <p>
        Visualize distribution of values across categories with non-overlapping
        points. Also known as beeswarm plots.
      </p>
      <p>
        <strong>Key props:</strong> <code>pointRadius</code>,{" "}
        <code>colorBy</code>, <code>sizeBy</code>,{" "}
        <code>categoryPadding</code>
      </p>

      <h2>BoxPlot</h2>
      <p>
        Display statistical distributions showing quartiles, median, and
        outliers. Perfect for comparing distributions across categories.
      </p>
      <p>
        <strong>Key props:</strong> <code>showOutliers</code>,{" "}
        <code>outlierRadius</code>, <code>colorBy</code>,{" "}
        <code>orientation</code>
      </p>
      <p>
        <strong>Statistics shown:</strong> minimum (excluding outliers), first
        quartile, median, third quartile, maximum (excluding outliers), and
        outliers
      </p>

      <h2>DotPlot</h2>
      <p>
        Cleveland dot plots for precise value comparison across categories.
        Excellent for ranking and comparison tasks.
      </p>
      <p>
        <strong>Key props:</strong> <code>sort</code>, <code>showGrid</code>,{" "}
        <code>dotRadius</code>, <code>colorBy</code>
      </p>
      <p>
        <strong>Sorting:</strong> Supports "asc", "desc", true (desc), false
        (no sort), or custom function
      </p>

      <h3>Advanced Usage</h3>
      <p>
        All ordinal chart components accept a <code>frameProps</code> prop that
        passes any OrdinalFrame prop for advanced customization:
      </p>
      <pre>
        {`<BarChart
  data={data}
  colorBy="category"
  frameProps={{
    pieceHoverAnnotation: true,
    customHoverBehavior: (d) => console.log(d),
    oLabel: (d) => <text>{d}</text>
  }}
/>`}
      </pre>

      <h3>Color Schemes</h3>
      <p>
        All ordinal charts support the following color schemes: category10,
        tableau10, set3, or custom color arrays.
      </p>
    </DocumentComponent>
  )
}

OrdinalChartsDocs.title = "Ordinal Charts"

export default OrdinalChartsDocs
