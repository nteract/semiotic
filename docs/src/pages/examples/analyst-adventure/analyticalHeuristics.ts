type Row = Record<string, any>
type ChartProps = Record<string, any>

function copyDefined(source: ChartProps, keys: readonly string[]) {
  return Object.fromEntries(
    keys
      .filter((key) => source[key] !== undefined)
      .map((key) => [key, source[key]]),
  )
}

const COMMON_DIAGNOSTIC_PROPS = [
  "title",
  "annotations",
  "enableHover",
  "showLegend",
  "showGrid",
  "colorBy",
  "colorScheme",
] as const

/**
 * Build the structural input consumed by suggestCharts. Flow fixtures retain
 * their authored field names in the game, so this adapter also exposes the
 * conventional `value` field expected by the generic geo/network profiler.
 */
export function adventureSuggestionInput(componentName: string, props: ChartProps) {
  if (componentName === "FlowMap") {
    const valueAccessor = props.valueAccessor ?? "value"
    return {
      type: "FeatureCollection",
      features: Array.isArray(props.areas) ? props.areas : [],
      points: Array.isArray(props.nodes) ? props.nodes : [],
      flows: Array.isArray(props.flows)
        ? props.flows.map((flow: Row) => ({
            ...flow,
            value: flow.value ?? flow[valueAccessor],
          }))
        : [],
    }
  }
  if (componentName === "SankeyDiagram") {
    const valueAccessor = props.valueAccessor ?? "value"
    return {
      nodes: Array.isArray(props.nodes) ? props.nodes : [],
      edges: Array.isArray(props.edges)
        ? props.edges.map((edge: Row) => ({
            ...edge,
            value: edge.value ?? edge[valueAccessor],
          }))
        : [],
    }
  }
  return undefined
}

function numericDateRows(rows: readonly Row[], accessor: unknown) {
  if (typeof accessor !== "string") return rows
  return rows.map((row) => {
    const value = row?.[accessor]
    return value instanceof Date ? { ...row, [accessor]: value.getTime() } : row
  })
}

/**
 * Keep diagnoseConfig focused on each public chart contract. Reader-only
 * metadata belongs to ChartContainer, while the hidden physics room is
 * represented by its closest public analytical recipe, GauntletChart.
 */
export function adventureDiagnosticProps(
  componentName: string,
  props: ChartProps,
  rows: readonly Row[],
) {
  const common = copyDefined(props, COMMON_DIAGNOSTIC_PROPS)

  if (componentName === "LineChart") {
    const line = copyDefined(props, [
      "xAccessor",
      "yAccessor",
      "xScaleType",
      "yScaleType",
      "lineBy",
      "colorBy",
      "colorScheme",
      "showPoints",
      "showGrid",
    ])
    return {
      ...common,
      ...line,
      data: numericDateRows(props.data ?? rows, props.xAccessor),
    }
  }

  if (componentName === "BarChart") {
    return {
      ...common,
      ...copyDefined(props, [
        "categoryAccessor",
        "valueAccessor",
        "orientation",
        "valueLabel",
        "sort",
        "barPadding",
      ]),
      data: props.data ?? rows,
    }
  }

  if (componentName === "FlowMap") {
    return {
      ...common,
      ...copyDefined(props, ["flows", "nodes", "valueAccessor", "lineIdAccessor"]),
    }
  }

  if (componentName === "SankeyDiagram") {
    return {
      ...common,
      ...copyDefined(props, [
        "nodes",
        "edges",
        "nodeIdAccessor",
        "sourceAccessor",
        "targetAccessor",
        "valueAccessor",
        "orientation",
        "nodeAlign",
        "showLabels",
        "edgeOpacity",
      ]),
    }
  }

  if (componentName === "GauntletChart") {
    return {
      title: props.title,
      data: rows.map((row) => ({
        ...row,
        positives: [
          row.denominatorPresent ? "denominator" : null,
          row.freshEvidence ? "freshness" : null,
          row.lineageComplete ? "lineage" : null,
        ].filter(Boolean),
        negatives:
          row.denominatorPresent && row.freshEvidence && row.lineageComplete
            ? []
            : ["caveat"],
      })),
      positiveProperties: [
        { id: "denominator", label: "Denominator", short: "D", color: "#55f6ff" },
        { id: "freshness", label: "Freshness", short: "F", color: "#ffd166" },
        { id: "lineage", label: "Lineage", short: "L", color: "#a7ff83" },
      ],
      negativeProperties: [
        { id: "caveat", label: "Analytical caveat", short: "!", color: "#ff4fd8" },
      ],
      gates: [
        { id: "denominator", label: "Denominator" },
        { id: "freshness", label: "Freshness" },
        { id: "lineage", label: "Lineage" },
      ],
      seed: 1984,
      paused: true,
      showProjection: true,
      showChrome: true,
    }
  }

  return { ...common, data: props.data ?? rows }
}
