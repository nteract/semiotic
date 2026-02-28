import React from "react"
import PageLayout from "../../components/PageLayout"
import PropTable from "../../components/PropTable"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Key props for each chart (subset for the API index -- full lists live on
// the individual chart pages).
// ---------------------------------------------------------------------------

const lineChartKeyProps = [
  { name: "data", type: "array", required: true, default: null, description: "Array of data points or array of line objects with coordinates." },
  { name: "xAccessor", type: "string | function", required: false, default: '"x"', description: "Field name or function to access x values." },
  { name: "yAccessor", type: "string | function", required: false, default: '"y"', description: "Field name or function to access y values." },
  { name: "lineBy", type: "string | function", required: false, default: null, description: "Group data into multiple lines by field or function." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Determine line color by field or function." },
  { name: "curve", type: "string", required: false, default: '"linear"', description: 'Interpolation: "linear", "monotoneX", "step", "basis", etc.' },
  { name: "showPoints", type: "boolean", required: false, default: "false", description: "Show data points on the line." },
  { name: "fillArea", type: "boolean", required: false, default: "false", description: "Fill the area under the line." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Escape hatch to pass any XYFrame prop." },
]

const areaChartKeyProps = [
  { name: "data", type: "array", required: true, default: null, description: "Array of data points, optionally grouped by category." },
  { name: "xAccessor", type: "string | function", required: false, default: '"x"', description: "Field name or function to access x values." },
  { name: "yAccessor", type: "string | function", required: false, default: '"y"', description: "Field name or function to access y values." },
  { name: "areaBy", type: "string | function", required: false, default: null, description: "Group data into multiple areas by field or function." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Determine area color by field or function." },
  { name: "curve", type: "string", required: false, default: '"monotoneX"', description: 'Interpolation: "linear", "monotoneX", "step", etc.' },
  { name: "areaOpacity", type: "number", required: false, default: "0.7", description: "Opacity of the filled area." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Escape hatch to pass any XYFrame prop." },
]

const stackedAreaChartKeyProps = [
  { name: "data", type: "array", required: true, default: null, description: "Array of data points, grouped by category." },
  { name: "xAccessor", type: "string | function", required: false, default: '"x"', description: "Field name or function to access x values." },
  { name: "yAccessor", type: "string | function", required: false, default: '"y"', description: "Field name or function to access y values." },
  { name: "areaBy", type: "string | function", required: false, default: null, description: "Group data into multiple stacked areas." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Determine area color for each stack." },
  { name: "normalize", type: "boolean", required: false, default: "false", description: "Normalize to 100% stacked (proportional) areas." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Escape hatch to pass any XYFrame prop." },
]

const scatterplotKeyProps = [
  { name: "data", type: "array", required: true, default: null, description: "Array of data points with x and y properties." },
  { name: "xAccessor", type: "string | function", required: false, default: '"x"', description: "Field name or function to access x values." },
  { name: "yAccessor", type: "string | function", required: false, default: '"y"', description: "Field name or function to access y values." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Determine point color by field or function." },
  { name: "sizeBy", type: "string | function", required: false, default: null, description: "Determine point size by field or function." },
  { name: "sizeRange", type: "[number, number]", required: false, default: "[3, 15]", description: "Min and max radius when sizeBy is specified." },
  { name: "pointRadius", type: "number", required: false, default: "5", description: "Default point radius when sizeBy is not specified." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Escape hatch to pass any XYFrame prop." },
]

const bubbleChartKeyProps = [
  { name: "data", type: "array", required: true, default: null, description: "Array of data points with x, y, and size properties." },
  { name: "xAccessor", type: "string | function", required: false, default: '"x"', description: "Field name or function to access x values." },
  { name: "yAccessor", type: "string | function", required: false, default: '"y"', description: "Field name or function to access y values." },
  { name: "sizeBy", type: "string | function", required: true, default: null, description: "Field name or function to determine bubble size (required)." },
  { name: "sizeRange", type: "[number, number]", required: false, default: "[5, 40]", description: "Min and max radius for bubbles." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Determine bubble color by field or function." },
  { name: "bubbleOpacity", type: "number", required: false, default: "0.6", description: "Opacity of the bubbles." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Escape hatch to pass any XYFrame prop." },
]

const heatmapKeyProps = [
  { name: "data", type: "array", required: true, default: null, description: "Array of data points with x, y, and value properties." },
  { name: "xAccessor", type: "string | function", required: false, default: '"x"', description: "Field name or function to access x values." },
  { name: "yAccessor", type: "string | function", required: false, default: '"y"', description: "Field name or function to access y values." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access cell values for color encoding." },
  { name: "colorScheme", type: "string", required: false, default: '"blues"', description: '"blues", "reds", "greens", "viridis", or "custom".' },
  { name: "showValues", type: "boolean", required: false, default: "false", description: "Show values as text labels in cells." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Escape hatch to pass any XYFrame prop." },
]

const barChartKeyProps = [
  { name: "data", type: "array", required: true, default: null, description: "Array of data points with category and value fields." },
  { name: "categoryAccessor", type: "string | function", required: false, default: '"category"', description: "Field name or function to access category values." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access numeric values." },
  { name: "orientation", type: '"vertical" | "horizontal"', required: false, default: '"vertical"', description: "Chart orientation." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Determine bar color by field or function." },
  { name: "sort", type: "boolean | string | function", required: false, default: "false", description: 'Sort bars: true, "asc", "desc", or custom comparator.' },
  { name: "frameProps", type: "object", required: false, default: null, description: "Escape hatch to pass any OrdinalFrame prop." },
]

const stackedBarChartKeyProps = [
  { name: "data", type: "array", required: true, default: null, description: "Array of data points with category, subcategory, and value fields." },
  { name: "categoryAccessor", type: "string | function", required: false, default: '"category"', description: "Field name or function to access category values." },
  { name: "stackBy", type: "string | function", required: true, default: null, description: "Field name or function for subcategory stacking." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access numeric values." },
  { name: "orientation", type: '"vertical" | "horizontal"', required: false, default: '"vertical"', description: "Chart orientation." },
  { name: "normalize", type: "boolean", required: false, default: "false", description: "Normalize to 100% (percentage stacked)." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Escape hatch to pass any OrdinalFrame prop." },
]

const swarmPlotKeyProps = [
  { name: "data", type: "array", required: true, default: null, description: "Array of data points with category and value fields." },
  { name: "categoryAccessor", type: "string | function", required: false, default: '"category"', description: "Field name or function to access category values." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access numeric values." },
  { name: "orientation", type: '"vertical" | "horizontal"', required: false, default: '"vertical"', description: "Chart orientation." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Determine point color by field or function." },
  { name: "sizeBy", type: "string | function", required: false, default: null, description: "Determine point size by field or function." },
  { name: "pointRadius", type: "number", required: false, default: "4", description: "Default point radius." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Escape hatch to pass any OrdinalFrame prop." },
]

const boxPlotKeyProps = [
  { name: "data", type: "array", required: true, default: null, description: "Array of data points; multiple points per category compute quartiles." },
  { name: "categoryAccessor", type: "string | function", required: false, default: '"category"', description: "Field name or function to access category values." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access numeric values." },
  { name: "orientation", type: '"vertical" | "horizontal"', required: false, default: '"vertical"', description: "Chart orientation." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Determine box color by field or function." },
  { name: "showOutliers", type: "boolean", required: false, default: "true", description: "Show outlier points beyond the whiskers." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Escape hatch to pass any OrdinalFrame prop." },
]

const dotPlotKeyProps = [
  { name: "data", type: "array", required: true, default: null, description: "Array of data points with category and value fields." },
  { name: "categoryAccessor", type: "string | function", required: false, default: '"category"', description: "Field name or function to access category values." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access numeric values." },
  { name: "orientation", type: '"vertical" | "horizontal"', required: false, default: '"horizontal"', description: "Chart orientation (horizontal is typical for dot plots)." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Determine dot color by field or function." },
  { name: "sort", type: "boolean | string | function", required: false, default: "true", description: 'Sort by value: true, "asc", "desc", or custom comparator.' },
  { name: "dotRadius", type: "number", required: false, default: "5", description: "Radius of the dots." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Escape hatch to pass any OrdinalFrame prop." },
]

const forceDirectedGraphKeyProps = [
  { name: "nodes", type: "array", required: true, default: null, description: "Array of node objects with an id property." },
  { name: "edges", type: "array", required: true, default: null, description: "Array of edge objects with source and target properties." },
  { name: "nodeIDAccessor", type: "string | function", required: false, default: '"id"', description: "Field name or function to access node IDs." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Determine node color by field or function." },
  { name: "nodeSize", type: "number | string | function", required: false, default: "8", description: "Fixed size, field name, or function for node radius." },
  { name: "nodeSizeRange", type: "[number, number]", required: false, default: "[5, 20]", description: "Min and max radius for dynamic node sizing." },
  { name: "showLabels", type: "boolean", required: false, default: "false", description: "Show text labels on each node." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Escape hatch to pass any NetworkFrame prop." },
]

const chordDiagramKeyProps = [
  { name: "edges", type: "array", required: true, default: null, description: "Array of edge objects with source, target, and value properties." },
  { name: "nodes", type: "array", required: false, default: "(inferred)", description: "Array of node objects. Inferred from edges if not provided." },
  { name: "sourceAccessor", type: "string | function", required: false, default: '"source"', description: "Field name or function to access source node." },
  { name: "targetAccessor", type: "string | function", required: false, default: '"target"', description: "Field name or function to access target node." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access edge value (chord width)." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Determine node color by field or function." },
  { name: "showLabels", type: "boolean", required: false, default: "true", description: "Show labels around the circumference." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Escape hatch to pass any NetworkFrame prop." },
]

const sankeyDiagramKeyProps = [
  { name: "edges", type: "array", required: true, default: null, description: "Array of edge objects with source, target, and value properties." },
  { name: "nodes", type: "array", required: false, default: "(inferred)", description: "Array of node objects. Inferred from edges if not provided." },
  { name: "sourceAccessor", type: "string | function", required: false, default: '"source"', description: "Field name or function to access source node." },
  { name: "targetAccessor", type: "string | function", required: false, default: '"target"', description: "Field name or function to access target node." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access edge value (flow width)." },
  { name: "orientation", type: '"horizontal" | "vertical"', required: false, default: '"horizontal"', description: "Layout orientation." },
  { name: "nodeAlign", type: '"justify" | "left" | "right" | "center"', required: false, default: '"justify"', description: "Node alignment strategy." },
  { name: "showLabels", type: "boolean", required: false, default: "true", description: "Show node labels." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Escape hatch to pass any NetworkFrame prop." },
]

const treeDiagramKeyProps = [
  { name: "data", type: "object", required: true, default: null, description: "Hierarchical data object with a children property." },
  { name: "layout", type: "string", required: false, default: '"tree"', description: '"tree", "cluster", "partition", "treemap", or "circlepack".' },
  { name: "orientation", type: '"vertical" | "horizontal" | "radial"', required: false, default: '"vertical"', description: "Projection orientation." },
  { name: "childrenAccessor", type: "string | function", required: false, default: '"children"', description: "Field name or function to access children array." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access node value (for treemap/circlepack sizing)." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Determine node color by field or function." },
  { name: "showLabels", type: "boolean", required: false, default: "true", description: "Show node labels." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Escape hatch to pass any NetworkFrame prop." },
]

const realtimeLineChartKeyProps = [
  { name: "data", type: "array", required: false, default: "[]", description: "Controlled data array with time and value fields." },
  { name: "timeAccessor", type: "string | function", required: false, default: '"time"', description: "Field name or function to access the time value." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access the numeric value." },
  { name: "size", type: "[number, number]", required: false, default: "[500, 300]", description: "Chart dimensions as [width, height]." },
  { name: "windowMode", type: '"sliding" | "growing"', required: false, default: '"sliding"', description: '"sliding" discards old points beyond windowSize; "growing" keeps all.' },
  { name: "windowSize", type: "number", required: false, default: "200", description: "Ring buffer capacity in sliding mode." },
  { name: "stroke", type: "string", required: false, default: '"#007bff"', description: "Line color." },
  { name: "enableHover", type: "boolean | object", required: false, default: null, description: "Enable hover annotations." },
]

const realtimeBarChartKeyProps = [
  { name: "binSize", type: "number", required: true, default: null, description: "Time interval for binning data points into bars." },
  { name: "data", type: "array", required: false, default: "[]", description: "Controlled data array with time and value fields." },
  { name: "timeAccessor", type: "string | function", required: false, default: '"time"', description: "Field name or function to access the time value." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access the numeric value." },
  { name: "size", type: "[number, number]", required: false, default: "[500, 300]", description: "Chart dimensions as [width, height]." },
  { name: "windowMode", type: '"sliding" | "growing"', required: false, default: '"sliding"', description: 'Data retention strategy.' },
  { name: "categoryAccessor", type: "string | function", required: false, default: null, description: "Category accessor for stacked bars." },
  { name: "fill", type: "string", required: false, default: null, description: "Bar fill color in non-stacked mode." },
  { name: "enableHover", type: "boolean | object", required: false, default: null, description: "Enable hover annotations on bars." },
]

const realtimeSwarmChartKeyProps = [
  { name: "data", type: "array", required: false, default: "[]", description: "Controlled data array with time and value fields." },
  { name: "timeAccessor", type: "string | function", required: false, default: '"time"', description: "Field name or function to access the time value." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access the numeric value." },
  { name: "size", type: "[number, number]", required: false, default: "[500, 300]", description: "Chart dimensions as [width, height]." },
  { name: "windowMode", type: '"sliding" | "growing"', required: false, default: '"sliding"', description: 'Data retention strategy.' },
  { name: "categoryAccessor", type: "string | function", required: false, default: null, description: "Category accessor for color-coding dots by group." },
  { name: "radius", type: "number", required: false, default: null, description: "Dot radius in pixels." },
  { name: "fill", type: "string", required: false, default: null, description: "Dot fill color when no categoryAccessor is set." },
  { name: "enableHover", type: "boolean | object", required: false, default: null, description: "Enable hover annotations on dots." },
]

const realtimeWaterfallChartKeyProps = [
  { name: "data", type: "array", required: false, default: "[]", description: "Controlled data array. Positive values = gains, negative = losses." },
  { name: "timeAccessor", type: "string | function", required: false, default: '"time"', description: "Field name or function to access the time value." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access the delta value." },
  { name: "size", type: "[number, number]", required: false, default: "[500, 300]", description: "Chart dimensions as [width, height]." },
  { name: "windowMode", type: '"sliding" | "growing"', required: false, default: '"sliding"', description: 'Data retention strategy.' },
  { name: "positiveColor", type: "string", required: false, default: null, description: "Fill color for positive (gain) bars." },
  { name: "negativeColor", type: "string", required: false, default: null, description: "Fill color for negative (loss) bars." },
  { name: "connectorStroke", type: "string", required: false, default: null, description: "Stroke color for connector lines between bars." },
  { name: "enableHover", type: "boolean | object", required: false, default: null, description: "Enable hover annotations on bars." },
]

// ---------------------------------------------------------------------------
// Chart registry -- the single source of truth for the index
// ---------------------------------------------------------------------------

const chartCategories = [
  {
    id: "xy-charts",
    title: "XY Charts",
    description: "Continuous data plotted on x/y axes. All XY charts wrap XYFrame.",
    charts: [
      {
        name: "LineChart",
        slug: "line-chart",
        importStatement: 'import { LineChart } from "semiotic"',
        description: "Visualizes trends and time series as connected lines.",
        keyProps: lineChartKeyProps,
      },
      {
        name: "AreaChart",
        slug: "area-chart",
        importStatement: 'import { AreaChart } from "semiotic"',
        description: "Filled area under a line -- emphasizes volume over time.",
        keyProps: areaChartKeyProps,
      },
      {
        name: "StackedAreaChart",
        slug: "stacked-area-chart",
        importStatement: 'import { StackedAreaChart } from "semiotic"',
        description: "Stacked filled areas showing part-to-whole composition over a continuous axis.",
        keyProps: stackedAreaChartKeyProps,
      },
      {
        name: "Scatterplot",
        slug: "scatterplot",
        importStatement: 'import { Scatterplot } from "semiotic"',
        description: "Point-based XY visualization for exploring correlations.",
        keyProps: scatterplotKeyProps,
      },
      {
        name: "BubbleChart",
        slug: "bubble-chart",
        importStatement: 'import { BubbleChart } from "semiotic"',
        description: "Scatterplot with a third dimension encoded as bubble size.",
        keyProps: bubbleChartKeyProps,
      },
      {
        name: "Heatmap",
        slug: "heatmap",
        importStatement: 'import { Heatmap } from "semiotic"',
        description: "Grid of colored cells encoding value intensity.",
        keyProps: heatmapKeyProps,
      },
    ],
  },
  {
    id: "categorical-charts",
    title: "Categorical Charts",
    description: "Discrete/ordinal data. All categorical charts wrap OrdinalFrame.",
    charts: [
      {
        name: "BarChart",
        slug: "bar-chart",
        importStatement: 'import { BarChart } from "semiotic"',
        description: "Rectangular bars proportional to category values.",
        keyProps: barChartKeyProps,
      },
      {
        name: "StackedBarChart",
        slug: "stacked-bar-chart",
        importStatement: 'import { StackedBarChart } from "semiotic"',
        description: "Bars subdivided into stacked segments for part-to-whole comparison.",
        keyProps: stackedBarChartKeyProps,
      },
      {
        name: "SwarmPlot",
        slug: "swarm-plot",
        importStatement: 'import { SwarmPlot } from "semiotic"',
        description: "Individual data points arranged to avoid overlap within categories.",
        keyProps: swarmPlotKeyProps,
      },
      {
        name: "BoxPlot",
        slug: "box-plot",
        importStatement: 'import { BoxPlot } from "semiotic"',
        description: "Statistical summary (quartiles, median, outliers) per category.",
        keyProps: boxPlotKeyProps,
      },
      {
        name: "DotPlot",
        slug: "dot-plot",
        importStatement: 'import { DotPlot } from "semiotic"',
        description: "Minimal Cleveland dot plot for precise value comparison across categories.",
        keyProps: dotPlotKeyProps,
      },
    ],
  },
  {
    id: "network-charts",
    title: "Network Charts",
    description: "Relational and hierarchical data. All network charts wrap NetworkFrame.",
    charts: [
      {
        name: "ForceDirectedGraph",
        slug: "force-directed-graph",
        importStatement: 'import { ForceDirectedGraph } from "semiotic"',
        description: "Force-simulated network layout for exploring relationships between nodes.",
        keyProps: forceDirectedGraphKeyProps,
      },
      {
        name: "ChordDiagram",
        slug: "chord-diagram",
        importStatement: 'import { ChordDiagram } from "semiotic"',
        description: "Circular layout showing flow magnitude between entities.",
        keyProps: chordDiagramKeyProps,
      },
      {
        name: "SankeyDiagram",
        slug: "sankey-diagram",
        importStatement: 'import { SankeyDiagram } from "semiotic"',
        description: "Flow diagram with proportional ribbons connecting stages.",
        keyProps: sankeyDiagramKeyProps,
      },
      {
        name: "TreeDiagram",
        slug: "tree-diagram",
        importStatement: 'import { TreeDiagram } from "semiotic"',
        description: "Hierarchical layout: tree, cluster, treemap, circlepack, or partition.",
        keyProps: treeDiagramKeyProps,
      },
    ],
  },
  {
    id: "realtime-charts",
    title: "Realtime Charts",
    description: "Canvas-rendered charts optimized for streaming data. All realtime charts wrap RealtimeFrame.",
    charts: [
      {
        name: "RealtimeLineChart",
        slug: "realtime-line-chart",
        importStatement: 'import { RealtimeLineChart } from "semiotic"',
        description: "Continuously updating line from streaming data.",
        keyProps: realtimeLineChartKeyProps,
      },
      {
        name: "RealtimeBarChart",
        slug: "realtime-bar-chart",
        importStatement: 'import { RealtimeBarChart } from "semiotic"',
        description: "Binned bar chart that updates as new data arrives.",
        keyProps: realtimeBarChartKeyProps,
      },
      {
        name: "RealtimeSwarmChart",
        slug: "realtime-swarm-chart",
        importStatement: 'import { RealtimeSwarmChart } from "semiotic"',
        description: "Streaming scatter/swarm dots for monitoring individual events.",
        keyProps: realtimeSwarmChartKeyProps,
      },
      {
        name: "RealtimeWaterfallChart",
        slug: "realtime-waterfall-chart",
        importStatement: 'import { RealtimeWaterfallChart } from "semiotic"',
        description: "Cumulative delta bars that update with streaming data.",
        keyProps: realtimeWaterfallChartKeyProps,
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  intro: {
    fontSize: "16px",
    lineHeight: "1.7",
    color: "var(--text-secondary)",
    marginBottom: "32px",
    maxWidth: "72ch",
  },
  categoryHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginTop: "48px",
    marginBottom: "8px",
  },
  categoryDescription: {
    fontSize: "14px",
    color: "var(--text-secondary)",
    marginBottom: "24px",
  },
  card: {
    border: "1px solid var(--surface-3)",
    borderRadius: "8px",
    padding: "20px 24px",
    marginBottom: "24px",
    background: "var(--surface-1)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "8px",
  },
  componentName: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0,
  },
  docsLink: {
    fontSize: "13px",
    color: "var(--accent)",
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
  componentDescription: {
    fontSize: "14px",
    color: "var(--text-secondary)",
    marginBottom: "12px",
  },
  importCode: {
    fontFamily: "var(--font-code)",
    fontSize: "13px",
    color: "var(--accent)",
    background: "var(--surface-2)",
    padding: "4px 8px",
    borderRadius: "4px",
    display: "inline-block",
    marginBottom: "16px",
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChartsApiPage() {
  return (
    <PageLayout
      title="Charts API Reference"
      breadcrumbs={[
        { label: "API Reference", path: "/api" },
        { label: "Charts", path: "/api/charts" },
      ]}
    >
      <p style={styles.intro}>
        A machine-readable index of every Semiotic Chart component. Each entry
        includes the import statement, a description, and the key props. For
        full documentation with live examples, follow the link to the
        individual chart page.
      </p>

      {chartCategories.map((category) => (
        <section key={category.id} data-section={category.id}>
          <h2
            id={category.id}
            data-component={category.id}
            style={styles.categoryHeader}
          >
            {category.title}
          </h2>
          <p style={styles.categoryDescription}>{category.description}</p>

          {category.charts.map((chart) => (
            <div
              key={chart.name}
              data-component={chart.name}
              style={styles.card}
            >
              <div style={styles.cardHeader}>
                <h3
                  id={chart.slug}
                  data-component={chart.name}
                  style={styles.componentName}
                >
                  {chart.name}
                </h3>
                <Link
                  to={`/charts/${chart.slug}`}
                  style={styles.docsLink}
                >
                  Full docs &rarr;
                </Link>
              </div>

              <p style={styles.componentDescription}>
                {chart.description}
              </p>

              <code style={styles.importCode}>{chart.importStatement}</code>

              <PropTable
                componentName={chart.name}
                props={chart.keyProps}
              />
            </div>
          ))}
        </section>
      ))}
    </PageLayout>
  )
}
