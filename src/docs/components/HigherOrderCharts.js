import * as React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import { Scatterplot, LineChart, AreaChart, BubbleChart, BarChart, StackedBarChart, SwarmPlot, BoxPlot } from "../../components"
import { TooltipProvider } from "../../components/store/TooltipStore"

const components = []

components.push({
  name: "Higher-Order Chart Components"
})

const HigherOrderCharts = () => {
  const examples = []

  // XY Chart Examples
  examples.push({
    name: "Scatterplot",
    demo: (
      <TooltipProvider>
        <Scatterplot
          data={[
            { x: 1, y: 5, category: "A" },
            { x: 2, y: 8, category: "B" },
            { x: 3, y: 3, category: "A" },
            { x: 4, y: 12, category: "B" },
            { x: 5, y: 7, category: "A" },
            { x: 6, y: 15, category: "B" }
          ]}
          width={400}
          height={300}
          colorBy="category"
          xLabel="X Axis"
          yLabel="Y Axis"
        />
      </TooltipProvider>
    ),
    source: `<Scatterplot
  data={[
    { x: 1, y: 5, category: "A" },
    { x: 2, y: 8, category: "B" },
    { x: 3, y: 3, category: "A" },
    { x: 4, y: 12, category: "B" }
  ]}
  width={400}
  height={300}
  colorBy="category"
  xLabel="X Axis"
  yLabel="Y Axis"
/>`
  })

  examples.push({
    name: "LineChart",
    demo: (
      <TooltipProvider>
        <LineChart
          data={[
            { x: 1, y: 5, series: "A" },
            { x: 2, y: 8, series: "A" },
            { x: 3, y: 3, series: "A" },
            { x: 4, y: 12, series: "A" },
            { x: 1, y: 3, series: "B" },
            { x: 2, y: 6, series: "B" },
            { x: 3, y: 9, series: "B" },
            { x: 4, y: 7, series: "B" }
          ]}
          width={400}
          height={300}
          lineBy="series"
          colorBy="series"
          xLabel="Time"
          yLabel="Value"
        />
      </TooltipProvider>
    ),
    source: `<LineChart
  data={data}
  width={400}
  height={300}
  lineBy="series"
  colorBy="series"
  xLabel="Time"
  yLabel="Value"
/>`
  })

  examples.push({
    name: "AreaChart",
    demo: (
      <TooltipProvider>
        <AreaChart
          data={[
            { x: 1, y: 5, series: "A" },
            { x: 2, y: 8, series: "A" },
            { x: 3, y: 3, series: "A" },
            { x: 4, y: 12, series: "A" },
            { x: 1, y: 3, series: "B" },
            { x: 2, y: 6, series: "B" },
            { x: 3, y: 9, series: "B" },
            { x: 4, y: 7, series: "B" }
          ]}
          width={400}
          height={300}
          areaBy="series"
          colorBy="series"
          stacked={true}
          xLabel="Time"
          yLabel="Value"
        />
      </TooltipProvider>
    ),
    source: `<AreaChart
  data={data}
  width={400}
  height={300}
  areaBy="series"
  colorBy="series"
  stacked={true}
  xLabel="Time"
  yLabel="Value"
/>`
  })

  examples.push({
    name: "BubbleChart",
    demo: (
      <TooltipProvider>
        <BubbleChart
          data={[
            { x: 1, y: 5, size: 10, category: "A" },
            { x: 2, y: 8, size: 20, category: "B" },
            { x: 3, y: 3, size: 15, category: "A" },
            { x: 4, y: 12, size: 25, category: "B" },
            { x: 5, y: 7, size: 12, category: "A" }
          ]}
          width={400}
          height={300}
          sizeBy="size"
          colorBy="category"
          xLabel="X Axis"
          yLabel="Y Axis"
        />
      </TooltipProvider>
    ),
    source: `<BubbleChart
  data={data}
  width={400}
  height={300}
  sizeBy="size"
  colorBy="category"
  xLabel="X Axis"
  yLabel="Y Axis"
/>`
  })

  // Ordinal Chart Examples
  examples.push({
    name: "BarChart",
    demo: (
      <TooltipProvider>
        <BarChart
          data={[
            { category: "A", value: 25 },
            { category: "B", value: 40 },
            { category: "C", value: 15 },
            { category: "D", value: 30 }
          ]}
          width={400}
          height={300}
          categoryLabel="Category"
          valueLabel="Value"
          colorBy="category"
        />
      </TooltipProvider>
    ),
    source: `<BarChart
  data={[
    { category: "A", value: 25 },
    { category: "B", value: 40 },
    { category: "C", value: 15 },
    { category: "D", value: 30 }
  ]}
  width={400}
  height={300}
  categoryLabel="Category"
  valueLabel="Value"
  colorBy="category"
/>`
  })

  examples.push({
    name: "StackedBarChart",
    demo: (
      <TooltipProvider>
        <StackedBarChart
          data={[
            { category: "Q1", product: "A", value: 100 },
            { category: "Q1", product: "B", value: 150 },
            { category: "Q2", product: "A", value: 120 },
            { category: "Q2", product: "B", value: 180 },
            { category: "Q3", product: "A", value: 90 },
            { category: "Q3", product: "B", value: 200 }
          ]}
          width={400}
          height={300}
          stackBy="product"
          categoryLabel="Quarter"
          valueLabel="Sales"
          colorBy="product"
        />
      </TooltipProvider>
    ),
    source: `<StackedBarChart
  data={data}
  width={400}
  height={300}
  stackBy="product"
  categoryLabel="Quarter"
  valueLabel="Sales"
  colorBy="product"
/>`
  })

  examples.push({
    name: "SwarmPlot",
    demo: (
      <TooltipProvider>
        <SwarmPlot
          data={[
            { category: "A", value: 10 },
            { category: "A", value: 12 },
            { category: "A", value: 15 },
            { category: "A", value: 11 },
            { category: "B", value: 20 },
            { category: "B", value: 22 },
            { category: "B", value: 18 },
            { category: "C", value: 8 },
            { category: "C", value: 10 },
            { category: "C", value: 12 }
          ]}
          width={400}
          height={300}
          categoryLabel="Group"
          valueLabel="Value"
          colorBy="category"
        />
      </TooltipProvider>
    ),
    source: `<SwarmPlot
  data={data}
  width={400}
  height={300}
  categoryLabel="Group"
  valueLabel="Value"
  colorBy="category"
/>`
  })

  examples.push({
    name: "BoxPlot",
    demo: (
      <TooltipProvider>
        <BoxPlot
          data={[
            { category: "A", value: 10 },
            { category: "A", value: 12 },
            { category: "A", value: 15 },
            { category: "A", value: 18 },
            { category: "A", value: 20 },
            { category: "B", value: 15 },
            { category: "B", value: 18 },
            { category: "B", value: 20 },
            { category: "B", value: 22 },
            { category: "B", value: 25 }
          ]}
          width={400}
          height={300}
          categoryLabel="Group"
          valueLabel="Value"
          colorBy="category"
        />
      </TooltipProvider>
    ),
    source: `<BoxPlot
  data={data}
  width={400}
  height={300}
  categoryLabel="Group"
  valueLabel="Value"
  colorBy="category"
/>`
  })

  return (
    <DocumentComponent
      name="Higher-Order Chart Components"
      components={components}
      examples={examples}
    >
      <p>
        Semiotic includes a collection of higher-order chart components that
        provide simplified, opinionated APIs for common chart types. These
        components wrap the powerful XYFrame, OrdinalFrame, and NetworkFrame
        components with smart defaults and intuitive prop names.
      </p>
      <p>
        <strong>Why use higher-order components?</strong>
      </p>
      <ul>
        <li>
          <strong>Simplified API:</strong> Intuitive prop names like{" "}
          <code>xLabel</code>, <code>yLabel</code>, and <code>colorBy</code>{" "}
          instead of complex accessor functions
        </li>
        <li>
          <strong>Smart defaults:</strong> Pre-configured margins, axes, and
          styling for each chart type
        </li>
        <li>
          <strong>Progressive disclosure:</strong> Start simple, then use{" "}
          <code>frameProps</code> to access advanced Frame features when needed
        </li>
        <li>
          <strong>TypeScript support:</strong> Full type definitions with
          helpful JSDoc comments
        </li>
      </ul>
      <p>
        <strong>Available chart types:</strong>
      </p>
      <ul>
        <li>
          <strong>XY Charts:</strong> Scatterplot, LineChart, AreaChart,
          Heatmap, BubbleChart
        </li>
        <li>
          <strong>Ordinal Charts:</strong> BarChart, StackedBarChart,
          SwarmPlot, BoxPlot, DotPlot
        </li>
        <li>
          <strong>Network Charts:</strong> ForceDirectedGraph, ChordDiagram,
          SankeyDiagram, TreeDiagram
        </li>
      </ul>
      <p>
        Each component includes a <code>frameProps</code> prop that accepts any
        prop from the underlying Frame component, providing a clear path to
        advanced usage when needed.
      </p>
      <p>
        See the individual chart type pages for more detailed examples and API
        documentation.
      </p>
    </DocumentComponent>
  )
}

HigherOrderCharts.title = "Higher-Order Charts"

export default HigherOrderCharts
