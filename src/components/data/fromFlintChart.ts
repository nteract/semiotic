import type { Datum } from "../charts/shared/datumTypes"
import { coerceTemporalStringRows } from "../charts/shared/temporalStrings"
import type { ChartConfig } from "../export/chartConfig"

/**
 * Flint Chart -> Semiotic translator.
 *
 * Flint's public request shape is intentionally small: inline or referenced
 * rows, optional field semantics, and a chart_spec object with chart type,
 * channel encodings, base size, canvas ceiling, and chart properties. This
 * adapter consumes that request as an ecosystem boundary format and emits a
 * Semiotic ChartConfig. It does not call Flint and does not attempt to compile
 * Flint to backend-native specs.
 *
 * Scope (experimental): bar, grouped bar, stacked bar, line, area, scatter,
 * heatmap, pie/donut, histogram, and boxplot with simple channel bindings.
 */

export type FlintEncodingType = "quantitative" | "nominal" | "ordinal" | "temporal"
export type FlintAggregate = "count" | "sum" | "average" | "mean"

export interface FlintSemanticAnnotation {
  semanticType?: string
  [key: string]: unknown
}

export interface FlintChartEncoding {
  field?: string
  type?: FlintEncodingType
  aggregate?: FlintAggregate
  sortOrder?: "ascending" | "descending"
  sortBy?: string
  scheme?: string
  [key: string]: unknown
}

export type FlintEncodingInput = FlintChartEncoding | string
export type FlintRawEncodingValue = FlintEncodingInput | FlintEncodingInput[]

export interface FlintChartSize {
  width: number
  height: number
}

export interface FlintChartAssemblyInput {
  data: { values: Datum[]; url?: never } | { url: string; values?: never }
  semantic_types?: Record<string, string | FlintSemanticAnnotation>
  chart_spec: {
    chartType: string
    encodings: Record<string, FlintRawEncodingValue>
    baseSize?: FlintChartSize
    canvasSize?: FlintChartSize
    chartProperties?: Record<string, unknown>
  }
  options?: Record<string, unknown>
  field_display_names?: Record<string, string>
}

export interface FlintChartConfigMetadata {
  chartType: string
  semanticTypes?: Record<string, string | FlintSemanticAnnotation>
  fieldDisplayNames?: Record<string, string>
  chartProperties?: Record<string, unknown>
  baseSize?: FlintChartSize
  canvasSize?: FlintChartSize
  dataUrl?: string
  options?: Record<string, unknown>
  unmappedEncodings?: Record<string, FlintRawEncodingValue>
}

export type FlintChartConfig = ChartConfig & { warnings?: string[]; flint: FlintChartConfigMetadata }

type NormalizedEncodings = Record<string, FlintChartEncoding>
type ChartKind =
  | "bar"
  | "groupedBar"
  | "stackedBar"
  | "line"
  | "area"
  | "scatter"
  | "heatmap"
  | "pie"
  | "histogram"
  | "boxplot"

const CURVE_MAP: Record<string, string> = {
  linear: "linear",
  monotone: "monotoneX",
  "monotone-x": "monotoneX",
  "monotone-y": "monotoneY",
  step: "step",
  "step-before": "stepBefore",
  "step-after": "stepAfter",
  basis: "basis",
  cardinal: "cardinal",
  "catmull-rom": "catmullRom",
}

const CATEGORICAL_SCHEMES: Record<string, string> = {
  category10: "category10",
  tableau10: "category10",
  accent: "accent",
  dark2: "dark2",
  paired: "paired",
  pastel1: "pastel1",
  pastel2: "pastel2",
  set1: "set1",
  set2: "set2",
  set3: "set3",
}

const HEATMAP_SCHEMES = new Set(["blues", "reds", "greens", "viridis", "custom"])

const FLINT_CHANNEL_ALIASES: Record<string, string> = {
  theta: "size",
  value: "size",
}

const CONSUMED_CHANNELS: Record<ChartKind, string[]> = {
  bar: ["x", "y", "color"],
  groupedBar: ["x", "y", "group", "color"],
  stackedBar: ["x", "y", "color", "group"],
  line: ["x", "y", "color", "detail", "strokeDash", "order"],
  area: ["x", "y", "color"],
  scatter: ["x", "y", "color", "size", "shape"],
  heatmap: ["x", "y", "color"],
  pie: ["size", "color", "angle", "value", "theta", "y"],
  histogram: ["x", "y", "color"],
  boxplot: ["x", "y", "color"],
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeChartType(chartType: string | undefined): ChartKind | undefined {
  const key = String(chartType || "").toLowerCase().replace(/[^a-z0-9]/g, "")
  if (key === "barchart" || key === "bar") return "bar"
  if (key === "groupedbarchart" || key === "groupedbar" || key === "clusteredbar") return "groupedBar"
  if (key === "stackedbarchart" || key === "stackedbar") return "stackedBar"
  if (key === "linechart" || key === "line") return "line"
  if (key === "areachart" || key === "area" || key === "streamgraph") return "area"
  if (key === "scatterplot" || key === "scatter" || key === "scatterchart" || key === "pointchart") return "scatter"
  if (key === "heatmap" || key === "heatmapchart") return "heatmap"
  if (key === "piechart" || key === "pie" || key === "donutchart" || key === "donut") return "pie"
  if (key === "histogram" || key === "histogramchart") return "histogram"
  if (key === "boxplot" || key === "boxplotchart" || key === "boxandwhisker" || key === "boxandwhiskerplot") return "boxplot"
  return undefined
}

function normalizeEncodings(
  raw: Record<string, FlintRawEncodingValue> | undefined,
  warnings: string[],
): NormalizedEncodings {
  const encodings: NormalizedEncodings = {}
  if (!raw || typeof raw !== "object") return encodings

  for (const [rawChannel, rawValue] of Object.entries(raw)) {
    const channel = FLINT_CHANNEL_ALIASES[rawChannel] || rawChannel
    let value = rawValue
    if (Array.isArray(value)) {
      if (value.length === 0) continue
      warnings.push(
        `Static-series array encoding on "${rawChannel}" is not supported; using the first field and preserving the full encoding in flint.unmappedEncodings.`,
      )
      value = value[0]
    }

    if (typeof value === "string") {
      encodings[channel] = { field: value }
    } else if (isObject(value)) {
      encodings[channel] = value as FlintChartEncoding
    } else if (value != null) {
      warnings.push(`Encoding "${rawChannel}" is not an object, string, or array and was ignored.`)
    }
  }
  return encodings
}

function field(encodings: NormalizedEncodings, channel: string): string | undefined {
  const v = encodings[channel]?.field
  return typeof v === "string" && v.length > 0 ? v : undefined
}

function isDiscrete(enc: FlintChartEncoding | undefined): boolean {
  return enc?.type === "nominal" || enc?.type === "ordinal"
}

function isContinuous(enc: FlintChartEncoding | undefined): boolean {
  return enc?.type === "quantitative" || enc?.type === "temporal"
}

function semanticType(
  fieldName: string | undefined,
  semanticTypes: Record<string, string | FlintSemanticAnnotation> | undefined,
): string | undefined {
  if (!fieldName || !semanticTypes) return undefined
  const entry = semanticTypes[fieldName]
  if (typeof entry === "string") return entry
  return typeof entry?.semanticType === "string" ? entry.semanticType : undefined
}

function looksTemporal(
  enc: FlintChartEncoding | undefined,
  fieldName: string | undefined,
  semanticTypes: Record<string, string | FlintSemanticAnnotation> | undefined,
): boolean {
  if (enc?.type === "temporal") return true
  const semantic = semanticType(fieldName, semanticTypes)
  return semantic ? /date|time|year|month|quarter|week/i.test(semantic) : false
}

function numericProp(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function stringProp(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function booleanProp(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined
}

function warnTemporalCoercion(fieldName: string | undefined, axis: "x" | "y", warnings: string[]): void {
  warnings.push(`Temporal ${axis} field "${fieldName || "unknown"}" contains unparseable date strings; those rows will be skipped by the time scale. Prefer Date objects, ISO date strings, or epoch timestamps.`)
}

function applySize(
  props: Datum,
  baseSize: FlintChartSize | undefined,
  canvasSize: FlintChartSize | undefined,
  warnings: string[],
): void {
  const source = baseSize || canvasSize
  if (!source) return

  let width = source.width
  let height = source.height
  if (baseSize && canvasSize) {
    if (canvasSize.width < baseSize.width) {
      width = canvasSize.width
      warnings.push("chart_spec.canvasSize.width is smaller than baseSize.width; clamped Semiotic width to the canvas ceiling.")
    }
    if (canvasSize.height < baseSize.height) {
      height = canvasSize.height
      warnings.push("chart_spec.canvasSize.height is smaller than baseSize.height; clamped Semiotic height to the canvas ceiling.")
    }
  }

  if (Number.isFinite(width)) props.width = width
  if (Number.isFinite(height)) props.height = height
}

function applyTitle(props: Datum, chartProperties: Record<string, unknown> | undefined): void {
  const title = stringProp(chartProperties?.title)
  if (title) props.title = title
}

function applyCategoricalScheme(
  props: Datum,
  scheme: string | undefined,
  warnings: string[],
): void {
  if (!scheme) return
  const schemeKey = scheme.toLowerCase()
  const mapped = CATEGORICAL_SCHEMES[schemeKey]
  if (mapped) props.colorScheme = mapped
  else warnings.push(`Flint color scheme "${scheme}" is not mapped to a Semiotic categorical colorScheme.`)
}

function applyHeatmapScheme(
  props: Datum,
  scheme: string | undefined,
  warnings: string[],
): void {
  if (!scheme) return
  const schemeKey = scheme.toLowerCase()
  if (HEATMAP_SCHEMES.has(schemeKey)) props.colorScheme = schemeKey
  else warnings.push(`Flint heatmap color scheme "${scheme}" is not available in Semiotic's Heatmap colorScheme enum.`)
}

function applyLabels(
  props: Datum,
  fields: { x?: string; y?: string; category?: string; value?: string },
  displayNames: Record<string, string> | undefined,
  family: "xy" | "ordinal",
): void {
  if (!displayNames) return
  if (family === "xy") {
    if (fields.x && displayNames[fields.x]) props.xLabel = displayNames[fields.x]
    if (fields.y && displayNames[fields.y]) props.yLabel = displayNames[fields.y]
  } else {
    if (fields.category && displayNames[fields.category]) props.categoryLabel = displayNames[fields.category]
    if (fields.value && displayNames[fields.value]) props.valueLabel = displayNames[fields.value]
  }
}

function resolveCategoryMeasure(encodings: NormalizedEncodings): {
  category?: string
  value?: string
  valueEncoding?: FlintChartEncoding
  orientation?: "horizontal"
} {
  const x = encodings.x
  const y = encodings.y
  const xField = field(encodings, "x")
  const yField = field(encodings, "y")

  if (isDiscrete(x) && !isDiscrete(y)) {
    return { category: xField, value: yField, valueEncoding: y }
  }
  if (isDiscrete(y) && !isDiscrete(x)) {
    return { category: yField, value: xField, valueEncoding: x, orientation: "horizontal" }
  }
  if (isContinuous(x) && !isContinuous(y) && yField) {
    return { category: yField, value: xField, valueEncoding: x, orientation: "horizontal" }
  }
  return { category: xField, value: yField, valueEncoding: y }
}

function normalizeAggregate(aggregate: FlintAggregate | undefined): "count" | "sum" | "mean" | undefined {
  if (aggregate === "count" || aggregate === "sum" || aggregate === "mean") return aggregate
  if (aggregate === "average") return "mean"
  return undefined
}

function aggregateRows(
  data: Datum[] | undefined,
  groupFields: Array<string | undefined>,
  valueField: string | undefined,
  aggregate: FlintAggregate | undefined,
  warnings: string[],
): { data: Datum[] | undefined; valueAccessor: string | undefined } {
  const agg = normalizeAggregate(aggregate)
  if (!agg) return { data, valueAccessor: valueField }
  if (!data) {
    warnings.push(`aggregate: "${aggregate}" requires inline data.values; leaving the requested value accessor unchanged.`)
    return { data, valueAccessor: valueField || "value" }
  }
  if (agg !== "count" && !valueField) {
    warnings.push(`aggregate: "${aggregate}" requires an encoded value field; leaving data unaggregated.`)
    return { data, valueAccessor: valueField }
  }

  const groups = new Map<string, { keys: Datum; values: number[]; count: number }>()
  const cleanGroupFields = groupFields.filter((d): d is string => !!d)

  for (const row of data) {
    const keys: Datum = {}
    for (const key of cleanGroupFields) keys[key] = row[key]
    const groupKey = JSON.stringify(keys)
    let bucket = groups.get(groupKey)
    if (!bucket) {
      bucket = { keys, values: [], count: 0 }
      groups.set(groupKey, bucket)
    }
    bucket.count += 1
    if (valueField) {
      const numeric = Number(row[valueField])
      if (Number.isFinite(numeric)) bucket.values.push(numeric)
    }
  }

  const aggregated: Datum[] = []
  for (const bucket of groups.values()) {
    let value = bucket.count
    if (agg === "sum") value = bucket.values.reduce((a, b) => a + b, 0)
    else if (agg === "mean") {
      value = bucket.values.length > 0
        ? bucket.values.reduce((a, b) => a + b, 0) / bucket.values.length
        : 0
    }
    aggregated.push({ ...bucket.keys, value })
  }

  return { data: aggregated, valueAccessor: "value" }
}

function setData(props: Datum, data: Datum[] | undefined): void {
  if (data) props.data = data
}

function applyCurve(
  props: Datum,
  chartProperties: Record<string, unknown> | undefined,
  warnings: string[],
): void {
  const interpolate = stringProp(chartProperties?.interpolate)
  if (!interpolate) return
  const curve = CURVE_MAP[interpolate]
  if (curve) props.curve = curve
  else warnings.push(`Flint interpolate "${interpolate}" is not mapped to a Semiotic curve.`)
}

function applyUnsupportedChartProperties(
  kind: ChartKind,
  chartProperties: Record<string, unknown> | undefined,
  supported: string[],
  warnings: string[],
): void {
  if (!chartProperties) return
  const supportedSet = new Set([...supported, "title"])
  const unsupported = Object.keys(chartProperties).filter((key) => !supportedSet.has(key))
  if (unsupported.length > 0) {
    warnings.push(
      `Flint chartProperties not mapped for ${kind}: ${unsupported.join(", ")}.`,
    )
  }
}

function warnOnUnmappedEncodings(
  kind: ChartKind,
  raw: Record<string, FlintRawEncodingValue> | undefined,
  warnings: string[],
): Record<string, FlintRawEncodingValue> | undefined {
  if (!raw) return undefined
  const consumed = new Set(CONSUMED_CHANNELS[kind])
  const unmapped: Record<string, FlintRawEncodingValue> = {}
  for (const [channel, value] of Object.entries(raw)) {
    const normalized = FLINT_CHANNEL_ALIASES[channel] || channel
    if (!consumed.has(normalized) || Array.isArray(value)) {
      unmapped[channel] = value
    }
  }
  if (Object.keys(unmapped).length === 0) return undefined

  const channels = Object.keys(unmapped)
  const facets = channels.filter((channel) => channel === "column" || channel === "row")
  if (facets.length > 0) {
    warnings.push(`Flint facet channel(s) ${facets.join(", ")} are not supported by this adapter; render multiple Semiotic charts instead.`)
  }
  const nonFacets = channels.filter((channel) => {
    const normalized = FLINT_CHANNEL_ALIASES[channel] || channel
    return channel !== "column" && channel !== "row" && !consumed.has(normalized)
  })
  if (nonFacets.length > 0) {
    warnings.push(`Flint encoding channel(s) not mapped for ${kind}: ${nonFacets.join(", ")}.`)
  }
  return unmapped
}

function buildOrdinalBar(
  kind: "bar" | "groupedBar" | "stackedBar",
  encodings: NormalizedEncodings,
  data: Datum[] | undefined,
  commonProps: Datum,
  chartProperties: Record<string, unknown> | undefined,
  displayNames: Record<string, string> | undefined,
  warnings: string[],
): { component: string; props: Datum; supportedProperties: string[] } {
  const props = { ...commonProps }
  const resolved = resolveCategoryMeasure(encodings)
  const seriesField =
    kind === "groupedBar"
      ? field(encodings, "group") || field(encodings, "color")
      : field(encodings, "color") || field(encodings, "group")
  const aggregate = aggregateRows(
    data,
    [resolved.category, seriesField],
    resolved.value,
    resolved.valueEncoding?.aggregate,
    warnings,
  )

  setData(props, aggregate.data)
  if (resolved.category) props.categoryAccessor = resolved.category
  if (aggregate.valueAccessor) props.valueAccessor = aggregate.valueAccessor
  if (resolved.orientation) props.orientation = resolved.orientation
  applyLabels(props, { category: resolved.category, value: resolved.value }, displayNames, "ordinal")

  const cornerRadius = numericProp(chartProperties?.cornerRadius)
  if (cornerRadius !== undefined) props.roundedTop = cornerRadius

  const stackMode = stringProp(chartProperties?.stackMode)
  if (stackMode === "normalize") props.normalize = true
  else if (stackMode && stackMode !== "stacked") {
    warnings.push(`Flint stackMode "${stackMode}" is not supported by Semiotic ${kind}; leaving default stacking behavior.`)
  }

  applyCategoricalScheme(props, encodings.color?.scheme, warnings)

  if (kind === "groupedBar") {
    if (seriesField) {
      props.groupBy = seriesField
      props.colorBy = seriesField
      props.showLegend = true
    }
    return { component: "GroupedBarChart", props, supportedProperties: ["cornerRadius"] }
  }
  if (kind === "stackedBar") {
    if (seriesField) {
      props.stackBy = seriesField
      props.colorBy = seriesField
      props.showLegend = true
    } else {
      warnings.push("Stacked Bar Chart has no color/group series field; emitted a BarChart instead.")
      return { component: "BarChart", props, supportedProperties: ["cornerRadius", "stackMode"] }
    }
    return { component: "StackedBarChart", props, supportedProperties: ["cornerRadius", "stackMode"] }
  }

  const color = field(encodings, "color")
  if (color) props.colorBy = color
  return { component: "BarChart", props, supportedProperties: ["cornerRadius"] }
}

function buildXY(
  kind: "line" | "area" | "scatter",
  encodings: NormalizedEncodings,
  data: Datum[] | undefined,
  commonProps: Datum,
  chartProperties: Record<string, unknown> | undefined,
  semanticTypes: Record<string, string | FlintSemanticAnnotation> | undefined,
  displayNames: Record<string, string> | undefined,
  warnings: string[],
): { component: string; props: Datum; supportedProperties: string[] } {
  const props = { ...commonProps }
  const x = field(encodings, "x")
  const y = field(encodings, "y")
  const color = field(encodings, "color")
  const detail = field(encodings, "detail")
  const size = field(encodings, "size")
  const shape = field(encodings, "shape")
  const aggregate = aggregateRows(
    data,
    [x, color || detail],
    y,
    encodings.y?.aggregate,
    warnings,
  )
  const wantsXTime = looksTemporal(encodings.x, x, semanticTypes)
  const wantsYTime = looksTemporal(encodings.y, y, semanticTypes)
  let nextData = aggregate.data
  if (wantsXTime) {
    const result = coerceTemporalStringRows(nextData, x)
    nextData = result.data
    if (result.failed) warnTemporalCoercion(x, "x", warnings)
  }
  if (wantsYTime) {
    const result = coerceTemporalStringRows(nextData, aggregate.valueAccessor)
    nextData = result.data
    if (result.failed) warnTemporalCoercion(aggregate.valueAccessor, "y", warnings)
  }

  setData(props, nextData)
  if (x) props.xAccessor = x
  if (aggregate.valueAccessor) props.yAccessor = aggregate.valueAccessor
  if (wantsXTime) props.xScaleType = "time"
  if (wantsYTime) props.yScaleType = "time"
  applyLabels(props, { x, y }, displayNames, "xy")

  if (kind === "line") {
    if (color || detail) {
      props.lineBy = color || detail
      props.colorBy = color || detail
    }
    applyCurve(props, chartProperties, warnings)
    const showPoints = booleanProp(chartProperties?.showPoints)
    if (showPoints !== undefined) props.showPoints = showPoints
    return { component: "LineChart", props, supportedProperties: ["interpolate", "showPoints"] }
  }

  if (kind === "area") {
    applyCurve(props, chartProperties, warnings)
    const opacity = numericProp(chartProperties?.opacity)
    if (opacity !== undefined) props.areaOpacity = opacity
    const stackMode = stringProp(chartProperties?.stackMode)
    if (stackMode === "normalize") props.normalize = true
    else if (stackMode && stackMode !== "stacked") {
      warnings.push(`Flint area stackMode "${stackMode}" is not supported by Semiotic; leaving default stacking behavior.`)
    }
    if (color) {
      props.areaBy = color
      props.colorBy = color
      return { component: "StackedAreaChart", props, supportedProperties: ["interpolate", "opacity", "stackMode"] }
    }
    return { component: "AreaChart", props, supportedProperties: ["interpolate", "opacity"] }
  }

  if (color) props.colorBy = color
  if (size) {
    props.sizeBy = size
    if (shape) {
      warnings.push("Flint shape encoding is not mapped for BubbleChart; Semiotic only maps shape onto Scatterplot in this adapter.")
    }
    const opacity = numericProp(chartProperties?.opacity)
    if (opacity !== undefined) props.bubbleOpacity = opacity
    applyCategoricalScheme(props, encodings.color?.scheme, warnings)
    return { component: "BubbleChart", props, supportedProperties: ["opacity"] }
  }
  if (shape) props.symbolBy = shape
  const opacity = numericProp(chartProperties?.opacity)
  if (opacity !== undefined) props.pointOpacity = opacity
  applyCategoricalScheme(props, encodings.color?.scheme, warnings)
  return { component: "Scatterplot", props, supportedProperties: ["opacity"] }
}

function buildHeatmap(
  encodings: NormalizedEncodings,
  data: Datum[] | undefined,
  commonProps: Datum,
  chartProperties: Record<string, unknown> | undefined,
  displayNames: Record<string, string> | undefined,
  warnings: string[],
): { component: string; props: Datum; supportedProperties: string[] } {
  const props = { ...commonProps }
  const x = field(encodings, "x")
  const y = field(encodings, "y")
  const value = field(encodings, "color")
  setData(props, data)
  if (x) props.xAccessor = x
  if (y) props.yAccessor = y
  if (value) props.valueAccessor = value
  const showTextLabels = booleanProp(chartProperties?.showTextLabels)
  if (showTextLabels !== undefined) props.showValues = showTextLabels
  applyLabels(props, { x, y }, displayNames, "xy")
  applyHeatmapScheme(props, encodings.color?.scheme || stringProp(chartProperties?.colorScheme), warnings)
  return { component: "Heatmap", props, supportedProperties: ["showTextLabels", "colorScheme"] }
}

function buildPie(
  chartType: string,
  encodings: NormalizedEncodings,
  data: Datum[] | undefined,
  commonProps: Datum,
  chartProperties: Record<string, unknown> | undefined,
  warnings: string[],
): { component: string; props: Datum; supportedProperties: string[] } {
  const props = { ...commonProps }
  const category = field(encodings, "color")
  const value = field(encodings, "size") || field(encodings, "angle") || field(encodings, "y")
  const aggregate = aggregateRows(
    data,
    [category],
    value,
    encodings.size?.aggregate || encodings.angle?.aggregate || encodings.y?.aggregate,
    warnings,
  )
  setData(props, aggregate.data)
  if (category) props.categoryAccessor = category
  if (aggregate.valueAccessor) props.valueAccessor = aggregate.valueAccessor
  const innerRadius = numericProp(chartProperties?.innerRadius)
  const isDonut = /donut/i.test(chartType) || (innerRadius !== undefined && innerRadius > 0)
  if (isDonut && innerRadius !== undefined) props.innerRadius = innerRadius
  const cornerRadius = numericProp(chartProperties?.cornerRadius)
  if (cornerRadius !== undefined) props.cornerRadius = cornerRadius
  if (chartProperties?.sortSlices != null) {
    warnings.push("Flint sortSlices is not mapped; preserve or sort slice order before calling unstable_fromFlintChart().")
  }
  applyCategoricalScheme(props, encodings.color?.scheme, warnings)
  return { component: isDonut ? "DonutChart" : "PieChart", props, supportedProperties: ["innerRadius", "cornerRadius", "sortSlices"] }
}

function buildHistogram(
  encodings: NormalizedEncodings,
  data: Datum[] | undefined,
  commonProps: Datum,
  chartProperties: Record<string, unknown> | undefined,
): { component: string; props: Datum; supportedProperties: string[] } {
  const props = { ...commonProps }
  const value = field(encodings, "x") || field(encodings, "y")
  const category = field(encodings, "color")
  setData(props, data)
  if (value) props.valueAccessor = value
  if (category) {
    props.categoryAccessor = category
    props.colorBy = category
  }
  const bins = numericProp(chartProperties?.binCount)
  if (bins !== undefined && bins > 0) props.bins = bins
  return { component: "Histogram", props, supportedProperties: ["binCount"] }
}

function buildBoxplot(
  encodings: NormalizedEncodings,
  data: Datum[] | undefined,
  commonProps: Datum,
  chartProperties: Record<string, unknown> | undefined,
  displayNames: Record<string, string> | undefined,
  warnings: string[],
): { component: string; props: Datum; supportedProperties: string[] } {
  const props = { ...commonProps }
  const resolved = resolveCategoryMeasure(encodings)
  setData(props, data)
  if (resolved.category) props.categoryAccessor = resolved.category
  if (resolved.value) props.valueAccessor = resolved.value
  if (resolved.orientation) props.orientation = resolved.orientation
  const color = field(encodings, "color")
  if (color) props.colorBy = color
  const showOutliers = booleanProp(chartProperties?.showOutliers)
  if (showOutliers !== undefined) props.showOutliers = showOutliers
  const whiskerMethod = stringProp(chartProperties?.whiskerMethod)
  if (whiskerMethod && whiskerMethod !== "iqr") {
    warnings.push(`Flint whiskerMethod "${whiskerMethod}" is not mapped; Semiotic BoxPlot keeps its default whisker calculation.`)
  }
  applyLabels(props, { category: resolved.category, value: resolved.value }, displayNames, "ordinal")
  return { component: "BoxPlot", props, supportedProperties: ["showOutliers", "whiskerMethod"] }
}

/**
 * Convert a Flint ChartAssemblyInput into a Semiotic ChartConfig.
 */
export function fromFlintChart(input: FlintChartAssemblyInput): FlintChartConfig {
  const warnings: string[] = []
  const chartSpec = input.chart_spec
  const chartType = chartSpec?.chartType
  const kind = normalizeChartType(chartType)
  const chartProperties = chartSpec?.chartProperties
  const data = Array.isArray(input.data?.values) ? input.data.values : undefined
  const dataUrl = typeof input.data?.url === "string" ? input.data.url : undefined
  const encodings = normalizeEncodings(chartSpec?.encodings, warnings)
  const commonProps: Datum = {}

  if (dataUrl) {
    warnings.push("data.url is preserved in flint.dataUrl but not fetched; resolve it to data.values before rendering.")
  }
  if (!kind) {
    warnings.push(`Unsupported Flint chartType "${chartType}". Defaulting to Scatterplot.`)
  }

  applySize(commonProps, chartSpec?.baseSize, chartSpec?.canvasSize, warnings)
  applyTitle(commonProps, chartProperties)

  const actualKind = kind || "scatter"
  let built: { component: string; props: Datum; supportedProperties: string[] }

  switch (actualKind) {
    case "bar":
    case "groupedBar":
    case "stackedBar":
      built = buildOrdinalBar(
        actualKind,
        encodings,
        data,
        commonProps,
        chartProperties,
        input.field_display_names,
        warnings,
      )
      break
    case "line":
    case "area":
    case "scatter":
      built = buildXY(
        actualKind,
        encodings,
        data,
        commonProps,
        chartProperties,
        input.semantic_types,
        input.field_display_names,
        warnings,
      )
      break
    case "heatmap":
      built = buildHeatmap(encodings, data, commonProps, chartProperties, input.field_display_names, warnings)
      break
    case "pie":
      built = buildPie(chartType, encodings, data, commonProps, chartProperties, warnings)
      break
    case "histogram":
      built = buildHistogram(encodings, data, commonProps, chartProperties)
      break
    case "boxplot":
      built = buildBoxplot(encodings, data, commonProps, chartProperties, input.field_display_names, warnings)
      break
  }

  applyUnsupportedChartProperties(actualKind, chartProperties, built.supportedProperties, warnings)
  const unmappedEncodings = warnOnUnmappedEncodings(actualKind, chartSpec?.encodings, warnings)

  const config: FlintChartConfig = {
    component: built.component,
    props: built.props,
    version: "1",
    createdAt: new Date().toISOString(),
    flint: {
      chartType: chartType || "",
      ...(input.semantic_types ? { semanticTypes: input.semantic_types } : {}),
      ...(input.field_display_names ? { fieldDisplayNames: input.field_display_names } : {}),
      ...(chartProperties ? { chartProperties } : {}),
      ...(chartSpec?.baseSize ? { baseSize: chartSpec.baseSize } : {}),
      ...(chartSpec?.canvasSize ? { canvasSize: chartSpec.canvasSize } : {}),
      ...(dataUrl ? { dataUrl } : {}),
      ...(input.options ? { options: input.options } : {}),
      ...(unmappedEncodings ? { unmappedEncodings } : {}),
    },
  }

  if (warnings.length > 0) {
    config.warnings = warnings
    for (const warning of warnings) {
      console.warn(`[semiotic/fromFlintChart] ${warning}`)
    }
  }

  return config
}
