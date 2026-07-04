import React from "react"
import { Scatterplot } from "semiotic"
import PlaygroundLayout from "../../components/PlaygroundLayout"

// ---------------------------------------------------------------------------
// Control schema
// ---------------------------------------------------------------------------

const controls = [
  { name: "pointRadius", type: "number", label: "Point Radius", group: "Points",
    default: 5, min: 1, max: 15, step: 1 },
  { name: "pointOpacity", type: "number", label: "Point Opacity", group: "Points",
    default: 0.8, min: 0.1, max: 1, step: 0.05 },
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

const heightWeight = [
  { x: 160, y: 55 }, { x: 165, y: 62 }, { x: 170, y: 68 },
  { x: 155, y: 50 }, { x: 175, y: 75 }, { x: 180, y: 82 },
  { x: 168, y: 65 }, { x: 172, y: 70 }, { x: 163, y: 58 },
  { x: 178, y: 78 }, { x: 158, y: 52 }, { x: 183, y: 85 },
  { x: 167, y: 63 }, { x: 174, y: 72 }, { x: 162, y: 57 },
]

const groupedData = [
  { x: 2.5, y: 45, group: "A" }, { x: 3.1, y: 52, group: "A" },
  { x: 2.8, y: 48, group: "A" }, { x: 3.5, y: 55, group: "A" },
  { x: 2.2, y: 42, group: "A" },
  { x: 5.0, y: 70, group: "B" }, { x: 5.5, y: 78, group: "B" },
  { x: 4.8, y: 65, group: "B" }, { x: 5.2, y: 72, group: "B" },
  { x: 6.0, y: 82, group: "B" },
  { x: 7.5, y: 30, group: "C" }, { x: 8.0, y: 35, group: "C" },
  { x: 7.2, y: 28, group: "C" }, { x: 8.5, y: 38, group: "C" },
  { x: 7.8, y: 32, group: "C" },
]

const bubbleData = [
  { x: 10, y: 80, size: 20 }, { x: 25, y: 60, size: 35 },
  { x: 40, y: 90, size: 15 }, { x: 55, y: 45, size: 50 },
  { x: 70, y: 70, size: 25 }, { x: 30, y: 30, size: 40 },
  { x: 60, y: 85, size: 30 }, { x: 15, y: 55, size: 45 },
  { x: 45, y: 40, size: 20 }, { x: 80, y: 60, size: 35 },
  { x: 50, y: 75, size: 28 }, { x: 35, y: 50, size: 38 },
]

const datasets = [
  {
    label: "Height vs Weight (15 points)",
    data: heightWeight,
    codeString: `[
  { x: 160, y: 55 },
  { x: 165, y: 62 },
  { x: 170, y: 68 },
  // ...15 points
]`,
  },
  {
    label: "3 Groups with Color",
    data: groupedData,
    colorBy: "group",
    codeString: `[
  { x: 2.5, y: 45, group: "A" },
  { x: 5.0, y: 70, group: "B" },
  { x: 7.5, y: 30, group: "C" },
  // ...15 points across 3 groups
]`,
  },
  {
    label: "Bubble Style with Sizes",
    data: bubbleData,
    sizeBy: "size",
    codeString: `[
  { x: 10, y: 80, size: 20 },
  { x: 25, y: 60, size: 35 },
  // ...12 points with size
]`,
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ScatterplotPlayground() {
  return (
    <PlaygroundLayout
      title="Scatterplot Playground"
      breadcrumbs={[
        { label: "Playground", path: "/playground" },
        { label: "Scatterplot", path: "/playground/scatterplot" },
      ]}
      prevPage={{ title: "Bar Chart Playground", path: "/playground/bar-chart" }}
      nextPage={{ title: "Force Directed Graph Playground", path: "/playground/force-directed-graph" }}
      chartComponent={Scatterplot}
      componentName="Scatterplot"
      controls={controls}
      datasets={datasets}
      dataProps={(ds) => {
        const props = {
          data: ds.data,
          xAccessor: "x",
          yAccessor: "y",
          height: 400,
        }
        if (ds.colorBy) props.colorBy = ds.colorBy
        if (ds.sizeBy) props.sizeBy = ds.sizeBy
        return props
      }}
    >
      <p>
        Experiment with Scatterplot props in real time. Adjust the controls below
        the chart to see how each prop affects the visualization, then copy the
        generated code.
      </p>
    </PlaygroundLayout>
  )
}
