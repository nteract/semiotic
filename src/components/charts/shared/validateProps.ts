/**
 * Static props validation for AI code-generation pipelines.
 *
 * Validates component name, required props, prop types, enum values,
 * unknown props (typo detection), and data shape via the existing
 * validateArrayData / validateObjectData / validateNetworkData helpers.
 */

import { validateArrayData } from "./validateChartData"
import { validateObjectData } from "./validateChartData"
import { validateNetworkData } from "./validateChartData"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

type PropType = "string" | "number" | "boolean" | "array" | "object" | "function"

interface PropDef {
  type: PropType | PropType[]
  enum?: readonly string[]
}

type DataShape = "array" | "object" | "network" | "realtime"

interface ComponentSpec {
  /** Props that must be present */
  required: string[]
  /** Data shape — drives which validateChartData helper to call */
  dataShape: DataShape
  /** Accessor props to validate against data (key = prop name) */
  dataAccessors: string[]
  /** Per-prop type / enum constraints */
  props: Record<string, PropDef>
}

// ---------------------------------------------------------------------------
// Shared prop definitions (reused across many components)
// ---------------------------------------------------------------------------

const commonProps: Record<string, PropDef> = {
  width: { type: "number" },
  height: { type: "number" },
  margin: { type: "object" },
  className: { type: "string" },
  title: { type: "string" },
  enableHover: { type: "boolean" },
  showLegend: { type: "boolean" },
  showGrid: { type: "boolean" },
  colorBy: { type: ["string", "function"] },
  colorScheme: { type: ["string", "array"] },
  tooltip: { type: ["function", "object"] },
  frameProps: { type: "object" },
}

const xyAxisProps: Record<string, PropDef> = {
  xLabel: { type: "string" },
  yLabel: { type: "string" },
  xFormat: { type: "function" },
  yFormat: { type: "function" },
}

const ordinalAxisProps: Record<string, PropDef> = {
  categoryLabel: { type: "string" },
  valueLabel: { type: "string" },
  valueFormat: { type: "function" },
}

const curveEnum = [
  "linear", "monotoneX", "monotoneY", "step",
  "stepAfter", "stepBefore", "basis", "cardinal", "catmullRom",
] as const

const orientationEnum = ["vertical", "horizontal"] as const

// ---------------------------------------------------------------------------
// Validation map — one entry per component
// ---------------------------------------------------------------------------

const VALIDATION_MAP: Record<string, ComponentSpec> = {
  // -- XY Charts --
  LineChart: {
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["xAccessor", "yAccessor"],
    props: {
      ...commonProps,
      ...xyAxisProps,
      data: { type: "array" },
      xAccessor: { type: ["string", "function"] },
      yAccessor: { type: ["string", "function"] },
      lineBy: { type: ["string", "function"] },
      lineDataAccessor: { type: "string" },
      curve: { type: "string", enum: curveEnum as unknown as string[] },
      lineWidth: { type: "number" },
      showPoints: { type: "boolean" },
      pointRadius: { type: "number" },
      fillArea: { type: "boolean" },
      areaOpacity: { type: "number" },
    },
  },

  AreaChart: {
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["xAccessor", "yAccessor"],
    props: {
      ...commonProps,
      ...xyAxisProps,
      data: { type: "array" },
      xAccessor: { type: ["string", "function"] },
      yAccessor: { type: ["string", "function"] },
      areaBy: { type: ["string", "function"] },
      lineDataAccessor: { type: "string" },
      curve: { type: "string", enum: curveEnum as unknown as string[] },
      areaOpacity: { type: "number" },
      showLine: { type: "boolean" },
      lineWidth: { type: "number" },
    },
  },

  StackedAreaChart: {
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["xAccessor", "yAccessor"],
    props: {
      ...commonProps,
      ...xyAxisProps,
      data: { type: "array" },
      xAccessor: { type: ["string", "function"] },
      yAccessor: { type: ["string", "function"] },
      areaBy: { type: ["string", "function"] },
      lineDataAccessor: { type: "string" },
      curve: { type: "string", enum: curveEnum as unknown as string[] },
      areaOpacity: { type: "number" },
      showLine: { type: "boolean" },
      lineWidth: { type: "number" },
      normalize: { type: "boolean" },
    },
  },

  Scatterplot: {
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["xAccessor", "yAccessor"],
    props: {
      ...commonProps,
      ...xyAxisProps,
      data: { type: "array" },
      xAccessor: { type: ["string", "function"] },
      yAccessor: { type: ["string", "function"] },
      sizeBy: { type: ["string", "function"] },
      sizeRange: { type: "array" },
      pointRadius: { type: "number" },
      pointOpacity: { type: "number" },
    },
  },

  BubbleChart: {
    required: ["data", "sizeBy"],
    dataShape: "array",
    dataAccessors: ["xAccessor", "yAccessor"],
    props: {
      ...commonProps,
      ...xyAxisProps,
      data: { type: "array" },
      xAccessor: { type: ["string", "function"] },
      yAccessor: { type: ["string", "function"] },
      sizeBy: { type: ["string", "function"] },
      sizeRange: { type: "array" },
      bubbleOpacity: { type: "number" },
      bubbleStrokeWidth: { type: "number" },
      bubbleStrokeColor: { type: "string" },
    },
  },

  Heatmap: {
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["xAccessor", "yAccessor", "valueAccessor"],
    props: {
      ...commonProps,
      ...xyAxisProps,
      data: { type: "array" },
      xAccessor: { type: ["string", "function"] },
      yAccessor: { type: ["string", "function"] },
      valueAccessor: { type: ["string", "function"] },
      colorScheme: { type: "string", enum: ["blues", "reds", "greens", "viridis", "custom"] },
      customColorScale: { type: ["object", "function"] },
      showValues: { type: "boolean" },
      valueFormat: { type: "function" },
      cellBorderColor: { type: "string" },
      cellBorderWidth: { type: "number" },
    },
  },

  // -- Ordinal Charts --
  BarChart: {
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["categoryAccessor", "valueAccessor"],
    props: {
      ...commonProps,
      ...ordinalAxisProps,
      data: { type: "array" },
      categoryAccessor: { type: ["string", "function"] },
      valueAccessor: { type: ["string", "function"] },
      orientation: { type: "string", enum: orientationEnum as unknown as string[] },
      sort: { type: ["boolean", "string", "function"] },
      barPadding: { type: "number" },
    },
  },

  StackedBarChart: {
    required: ["data", "stackBy"],
    dataShape: "array",
    dataAccessors: ["categoryAccessor", "valueAccessor"],
    props: {
      ...commonProps,
      ...ordinalAxisProps,
      data: { type: "array" },
      categoryAccessor: { type: ["string", "function"] },
      stackBy: { type: ["string", "function"] },
      valueAccessor: { type: ["string", "function"] },
      orientation: { type: "string", enum: orientationEnum as unknown as string[] },
      normalize: { type: "boolean" },
      barPadding: { type: "number" },
    },
  },

  GroupedBarChart: {
    required: ["data", "groupBy"],
    dataShape: "array",
    dataAccessors: ["categoryAccessor", "valueAccessor"],
    props: {
      ...commonProps,
      ...ordinalAxisProps,
      data: { type: "array" },
      categoryAccessor: { type: ["string", "function"] },
      groupBy: { type: ["string", "function"] },
      valueAccessor: { type: ["string", "function"] },
      orientation: { type: "string", enum: orientationEnum as unknown as string[] },
      barPadding: { type: "number" },
    },
  },

  SwarmPlot: {
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["categoryAccessor", "valueAccessor"],
    props: {
      ...commonProps,
      ...ordinalAxisProps,
      data: { type: "array" },
      categoryAccessor: { type: ["string", "function"] },
      valueAccessor: { type: ["string", "function"] },
      orientation: { type: "string", enum: orientationEnum as unknown as string[] },
      sizeBy: { type: ["string", "function"] },
      sizeRange: { type: "array" },
      pointRadius: { type: "number" },
      pointOpacity: { type: "number" },
      categoryPadding: { type: "number" },
    },
  },

  BoxPlot: {
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["categoryAccessor", "valueAccessor"],
    props: {
      ...commonProps,
      ...ordinalAxisProps,
      data: { type: "array" },
      categoryAccessor: { type: ["string", "function"] },
      valueAccessor: { type: ["string", "function"] },
      orientation: { type: "string", enum: orientationEnum as unknown as string[] },
      showOutliers: { type: "boolean" },
      outlierRadius: { type: "number" },
      categoryPadding: { type: "number" },
    },
  },

  Histogram: {
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["categoryAccessor", "valueAccessor"],
    props: {
      ...commonProps,
      ...ordinalAxisProps,
      data: { type: "array" },
      categoryAccessor: { type: ["string", "function"] },
      valueAccessor: { type: ["string", "function"] },
      bins: { type: "number" },
      relative: { type: "boolean" },
      categoryPadding: { type: "number" },
    },
  },

  ViolinPlot: {
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["categoryAccessor", "valueAccessor"],
    props: {
      ...commonProps,
      ...ordinalAxisProps,
      data: { type: "array" },
      categoryAccessor: { type: ["string", "function"] },
      valueAccessor: { type: ["string", "function"] },
      orientation: { type: "string", enum: orientationEnum as unknown as string[] },
      bins: { type: "number" },
      curve: { type: "string" },
      showIQR: { type: "boolean" },
      categoryPadding: { type: "number" },
    },
  },

  DotPlot: {
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["categoryAccessor", "valueAccessor"],
    props: {
      ...commonProps,
      ...ordinalAxisProps,
      data: { type: "array" },
      categoryAccessor: { type: ["string", "function"] },
      valueAccessor: { type: ["string", "function"] },
      orientation: { type: "string", enum: orientationEnum as unknown as string[] },
      sort: { type: ["boolean", "string", "function"] },
      dotRadius: { type: "number" },
      categoryPadding: { type: "number" },
    },
  },

  PieChart: {
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["categoryAccessor", "valueAccessor"],
    props: {
      ...commonProps,
      data: { type: "array" },
      categoryAccessor: { type: ["string", "function"] },
      valueAccessor: { type: ["string", "function"] },
      startAngle: { type: "number" },
      slicePadding: { type: "number" },
    },
  },

  DonutChart: {
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["categoryAccessor", "valueAccessor"],
    props: {
      ...commonProps,
      data: { type: "array" },
      categoryAccessor: { type: ["string", "function"] },
      valueAccessor: { type: ["string", "function"] },
      innerRadius: { type: "number" },
      centerContent: { type: ["object", "string", "number"] },
      startAngle: { type: "number" },
      slicePadding: { type: "number" },
    },
  },

  // -- Network Charts --
  ForceDirectedGraph: {
    required: ["nodes", "edges"],
    dataShape: "network",
    dataAccessors: ["nodeIDAccessor", "sourceAccessor", "targetAccessor"],
    props: {
      ...commonProps,
      nodes: { type: "array" },
      edges: { type: "array" },
      nodeIDAccessor: { type: ["string", "function"] },
      sourceAccessor: { type: ["string", "function"] },
      targetAccessor: { type: ["string", "function"] },
      nodeLabel: { type: ["string", "function"] },
      nodeSize: { type: ["number", "string", "function"] },
      nodeSizeRange: { type: "array" },
      edgeWidth: { type: ["number", "string", "function"] },
      edgeColor: { type: "string" },
      edgeOpacity: { type: "number" },
      iterations: { type: "number" },
      forceStrength: { type: "number" },
      showLabels: { type: "boolean" },
    },
  },

  SankeyDiagram: {
    required: ["edges"],
    dataShape: "network",
    dataAccessors: ["sourceAccessor", "targetAccessor"],
    props: {
      ...commonProps,
      nodes: { type: "array" },
      edges: { type: "array" },
      sourceAccessor: { type: ["string", "function"] },
      targetAccessor: { type: ["string", "function"] },
      valueAccessor: { type: ["string", "function"] },
      nodeIdAccessor: { type: ["string", "function"] },
      edgeColorBy: { type: ["string", "function"], enum: ["source", "target", "gradient"] },
      orientation: { type: "string", enum: orientationEnum as unknown as string[] },
      nodeAlign: { type: "string", enum: ["justify", "left", "right", "center"] },
      nodePaddingRatio: { type: "number" },
      nodeWidth: { type: "number" },
      nodeLabel: { type: ["string", "function"] },
      showLabels: { type: "boolean" },
      edgeOpacity: { type: "number" },
      edgeSort: { type: "function" },
    },
  },

  ChordDiagram: {
    required: ["edges"],
    dataShape: "network",
    dataAccessors: ["sourceAccessor", "targetAccessor"],
    props: {
      ...commonProps,
      nodes: { type: "array" },
      edges: { type: "array" },
      sourceAccessor: { type: ["string", "function"] },
      targetAccessor: { type: ["string", "function"] },
      valueAccessor: { type: ["string", "function"] },
      nodeIdAccessor: { type: ["string", "function"] },
      edgeColorBy: { type: ["string", "function"], enum: ["source", "target"] },
      padAngle: { type: "number" },
      groupWidth: { type: "number" },
      sortGroups: { type: "function" },
      nodeLabel: { type: ["string", "function"] },
      showLabels: { type: "boolean" },
      edgeOpacity: { type: "number" },
    },
  },

  TreeDiagram: {
    required: ["data"],
    dataShape: "object",
    dataAccessors: [],
    props: {
      ...commonProps,
      data: { type: "object" },
      layout: { type: "string", enum: ["tree", "cluster", "partition", "treemap", "circlepack"] },
      orientation: { type: "string", enum: ["vertical", "horizontal", "radial"] },
      childrenAccessor: { type: ["string", "function"] },
      valueAccessor: { type: ["string", "function"] },
      nodeIdAccessor: { type: ["string", "function"] },
      colorByDepth: { type: "boolean" },
      edgeStyle: { type: "string", enum: ["line", "curve"] },
      nodeLabel: { type: ["string", "function"] },
      showLabels: { type: "boolean" },
      nodeSize: { type: "number" },
    },
  },

  Treemap: {
    required: ["data"],
    dataShape: "object",
    dataAccessors: [],
    props: {
      ...commonProps,
      data: { type: "object" },
      childrenAccessor: { type: ["string", "function"] },
      valueAccessor: { type: ["string", "function"] },
      nodeIdAccessor: { type: ["string", "function"] },
      colorByDepth: { type: "boolean" },
      showLabels: { type: "boolean" },
      nodeLabel: { type: ["string", "function"] },
    },
  },

  CirclePack: {
    required: ["data"],
    dataShape: "object",
    dataAccessors: [],
    props: {
      ...commonProps,
      data: { type: "object" },
      childrenAccessor: { type: ["string", "function"] },
      valueAccessor: { type: ["string", "function"] },
      nodeIdAccessor: { type: ["string", "function"] },
      colorByDepth: { type: "boolean" },
      showLabels: { type: "boolean" },
      nodeLabel: { type: ["string", "function"] },
      circleOpacity: { type: "number" },
    },
  },

  // -- Realtime Charts --
  RealtimeLineChart: {
    required: [],
    dataShape: "realtime",
    dataAccessors: [],
    props: {
      size: { type: "array" },
      margin: { type: "object" },
      className: { type: "string" },
      timeAccessor: { type: ["string", "function"] },
      valueAccessor: { type: ["string", "function"] },
      windowSize: { type: "number" },
      windowMode: { type: "string", enum: ["sliding", "stepping"] },
      arrowOfTime: { type: "string", enum: ["left", "right"] },
      stroke: { type: "string" },
      strokeWidth: { type: "number" },
      strokeDasharray: { type: "string" },
      timeExtent: { type: "array" },
      valueExtent: { type: "array" },
      extentPadding: { type: "number" },
      showAxes: { type: "boolean" },
      background: { type: "string" },
      enableHover: { type: ["boolean", "object"] },
      tooltipContent: { type: "function" },
      onHover: { type: "function" },
      annotations: { type: "array" },
      svgAnnotationRules: { type: "function" },
      tickFormatTime: { type: "function" },
      tickFormatValue: { type: "function" },
    },
  },

  RealtimeHistogram: {
    required: ["binSize"],
    dataShape: "realtime",
    dataAccessors: [],
    props: {
      binSize: { type: "number" },
      size: { type: "array" },
      margin: { type: "object" },
      className: { type: "string" },
      timeAccessor: { type: ["string", "function"] },
      valueAccessor: { type: ["string", "function"] },
      categoryAccessor: { type: ["string", "function"] },
      colors: { type: "object" },
      windowSize: { type: "number" },
      windowMode: { type: "string", enum: ["sliding", "stepping"] },
      arrowOfTime: { type: "string", enum: ["left", "right"] },
      fill: { type: "string" },
      stroke: { type: "string" },
      strokeWidth: { type: "number" },
      gap: { type: "number" },
      timeExtent: { type: "array" },
      valueExtent: { type: "array" },
      extentPadding: { type: "number" },
      showAxes: { type: "boolean" },
      background: { type: "string" },
      enableHover: { type: ["boolean", "object"] },
      tooltipContent: { type: "function" },
      onHover: { type: "function" },
      annotations: { type: "array" },
      svgAnnotationRules: { type: "function" },
      tickFormatTime: { type: "function" },
      tickFormatValue: { type: "function" },
    },
  },

  RealtimeSwarmChart: {
    required: [],
    dataShape: "realtime",
    dataAccessors: [],
    props: {
      size: { type: "array" },
      margin: { type: "object" },
      className: { type: "string" },
      timeAccessor: { type: ["string", "function"] },
      valueAccessor: { type: ["string", "function"] },
      categoryAccessor: { type: ["string", "function"] },
      colors: { type: "object" },
      windowSize: { type: "number" },
      windowMode: { type: "string", enum: ["sliding", "stepping"] },
      arrowOfTime: { type: "string", enum: ["left", "right"] },
      radius: { type: "number" },
      fill: { type: "string" },
      opacity: { type: "number" },
      stroke: { type: "string" },
      strokeWidth: { type: "number" },
      timeExtent: { type: "array" },
      valueExtent: { type: "array" },
      extentPadding: { type: "number" },
      showAxes: { type: "boolean" },
      background: { type: "string" },
      enableHover: { type: ["boolean", "object"] },
      tooltipContent: { type: "function" },
      onHover: { type: "function" },
      annotations: { type: "array" },
      svgAnnotationRules: { type: "function" },
      tickFormatTime: { type: "function" },
      tickFormatValue: { type: "function" },
    },
  },

  RealtimeWaterfallChart: {
    required: [],
    dataShape: "realtime",
    dataAccessors: [],
    props: {
      size: { type: "array" },
      margin: { type: "object" },
      className: { type: "string" },
      timeAccessor: { type: ["string", "function"] },
      valueAccessor: { type: ["string", "function"] },
      windowSize: { type: "number" },
      windowMode: { type: "string", enum: ["sliding", "stepping"] },
      arrowOfTime: { type: "string", enum: ["left", "right"] },
      positiveColor: { type: "string" },
      negativeColor: { type: "string" },
      connectorStroke: { type: "string" },
      connectorWidth: { type: "number" },
      gap: { type: "number" },
      stroke: { type: "string" },
      strokeWidth: { type: "number" },
      timeExtent: { type: "array" },
      valueExtent: { type: "array" },
      extentPadding: { type: "number" },
      showAxes: { type: "boolean" },
      background: { type: "string" },
      enableHover: { type: ["boolean", "object"] },
      tooltipContent: { type: "function" },
      onHover: { type: "function" },
      annotations: { type: "array" },
      svgAnnotationRules: { type: "function" },
      tickFormatTime: { type: "function" },
      tickFormatValue: { type: "function" },
    },
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function checkType(value: unknown, expected: PropType | PropType[]): boolean {
  const types = Array.isArray(expected) ? expected : [expected]
  const actual = Array.isArray(value) ? "array" : typeof value
  return types.includes(actual as PropType)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate props for a Semiotic HOC chart component.
 *
 * Checks: component name, required props, prop types, enum values,
 * unknown prop names (typo detection), and data shape + accessor validity.
 */
export function validateProps(
  componentName: string,
  props: Record<string, any>
): ValidationResult {
  const errors: string[] = []

  // 1. Component name check
  const spec = VALIDATION_MAP[componentName]
  if (!spec) {
    return {
      valid: false,
      errors: [
        `Unknown component "${componentName}". Valid components: ${Object.keys(VALIDATION_MAP).join(", ")}`,
      ],
    }
  }

  // 2. Required props
  for (const req of spec.required) {
    if (props[req] === undefined || props[req] === null) {
      errors.push(`"${req}" is required for ${componentName}.`)
    }
  }

  // 3. Prop types & enum values
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue
    const def = spec.props[key]
    if (!def) continue // unknown prop — checked in step 5

    // Type check
    if (!checkType(value, def.type)) {
      const expectedStr = Array.isArray(def.type)
        ? def.type.join(" | ")
        : def.type
      errors.push(
        `"${key}" should be ${expectedStr}, got ${Array.isArray(value) ? "array" : typeof value}.`
      )
      continue
    }

    // Enum check
    if (def.enum && typeof value === "string" && !def.enum.includes(value)) {
      errors.push(
        `"${key}" value "${value}" is not valid. Expected one of: ${def.enum.join(", ")}.`
      )
    }
  }

  // 4. Unknown props (warn on typos)
  const knownProps = new Set(Object.keys(spec.props))
  for (const key of Object.keys(props)) {
    if (props[key] === undefined) continue
    if (!knownProps.has(key)) {
      errors.push(
        `Unknown prop "${key}" for ${componentName}. Check for typos.`
      )
    }
  }

  // 5. Data shape + accessor validation (delegate to existing helpers)
  if (spec.dataShape === "array") {
    const data = props.data
    const accessors: Record<string, string | undefined> = {}
    for (const acc of spec.dataAccessors) {
      const val = props[acc]
      if (typeof val === "string") {
        accessors[acc] = val
      }
    }
    const dataError = validateArrayData({
      componentName,
      data,
      accessors: Object.keys(accessors).length > 0 ? accessors : undefined,
    })
    if (dataError) errors.push(dataError)
  } else if (spec.dataShape === "object") {
    const dataError = validateObjectData({
      componentName,
      data: props.data,
    })
    if (dataError) errors.push(dataError)
  } else if (spec.dataShape === "network") {
    const dataError = validateNetworkData({
      componentName,
      nodes: props.nodes,
      edges: props.edges,
      nodesRequired: spec.required.includes("nodes"),
      edgesRequired: spec.required.includes("edges"),
    })
    if (dataError) errors.push(dataError)
  }
  // realtime charts: no data validation (ref-based push API)

  return { valid: errors.length === 0, errors }
}
