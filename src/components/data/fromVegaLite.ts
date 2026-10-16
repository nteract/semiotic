import { isRecord, vegaLiteShapeDiagnostics, vegaLiteSemanticDiagnostics } from "./vegaLiteValidation"
import type { Datum } from "../charts/shared/datumTypes"
/**
 * Vega-Lite to Semiotic translator.
 * Converts a Vega-Lite spec into a Semiotic ChartConfig.
 *
 * Scope: core marks (bar, line, point, area, rect, arc, circle, square, tick)
 * with basic encodings. No layers, facets, selections, or complex transforms.
 */
import type { ChartConfig } from "../export/chartConfig"
import { aggregateVegaLite, vegaLiteAggregationDiagnostics } from "./vegaLiteAggregation"
import type {
  PortabilityDiagnostic,
  PortabilityImportResult,
} from "./portability/result"

// ── Types ────────────────────────────────────────────────────────────────

export interface VegaLiteEncoding {
  field?: string
  type?: "quantitative" | "nominal" | "ordinal" | "temporal"
  aggregate?: string
  scale?: { type?: string; scheme?: string; range?: Array<string | number>; domain?: Array<string | number | boolean | Date> }
  axis?: { title?: string; labelAngle?: number }
  value?: string | number | boolean | null
  bin?: boolean | { maxbins?: number }
  stack?: boolean | string | null
}

export interface VegaLiteSpec {
  mark: string | ({ type: string } & Datum)
  data?: { values?: Datum[]; url?: string }
  encoding?: Record<string, VegaLiteEncoding>
  width?: number
  height?: number
  title?: string | { text: string }
  transform?: Datum[]
  layer?: VegaLiteSpec[]
  hconcat?: VegaLiteSpec[]
  vconcat?: VegaLiteSpec[]
  concat?: VegaLiteSpec[]
  facet?: Datum
  repeat?: Datum | string[]
  params?: Datum[]
  selection?: Datum
  usermeta?: Datum & { idid?: Datum }
}

/** Strictness for the typed, experimental Vega-Lite import result. */
export interface FromVegaLiteOptions {
  /**
   * Strict is the safe default: unsupported composition or marks return a
   * typed refusal instead of a plausible fallback chart. `lossy` retains the
   * legacy fallback behavior, but reports every known loss explicitly.
   */
  mode?: "strict" | "lossy"
  /** Supply an authored timestamp for reproducible imported configurations. */
  createdAt?: string
}

/** Typed result for the experimental, loss-aware Vega-Lite importer. */
export type VegaLiteImportResult = PortabilityImportResult<ChartConfig>

// ── Helpers ──────────────────────────────────────────────────────────────

function normalizeMark(mark: string | ({ type: string } & Datum) | undefined): {
  type: string
  markProps: Datum
} {
  if (!mark || (typeof mark !== "string" && !isRecord(mark))) return { type: "", markProps: {} }
  if (typeof mark === "string") {
    return { type: mark, markProps: {} }
  }
  const { type, ...markProps } = mark
  return { type, markProps }
}

function extractTitle(title?: string | { text: string }): string | undefined {
  if (!title) return undefined
  if (typeof title === "string") return title
  return title.text
}

function isCategory(type?: string): boolean {
  return type === "nominal" || type === "ordinal"
}

function isQuantitative(type?: string): boolean {
  return type === "quantitative" || type === "temporal"
}

function readIDIDMetadata(spec: VegaLiteSpec): Datum | undefined {
  return spec?.usermeta?.idid
}

function isIDIDAnnotationLayer(layer: VegaLiteSpec): boolean {
  return layer?.usermeta?.idid?.role === "annotation-layer"
}

/**
 * Recover the one base view emitted by attachIDIDAnnotations(). This is
 * narrow: arbitrary Vega-Lite layer composition remains
 * unsupported and must not be guessed as a chart configuration.
 */
export function unwrapIDIDEnrichedVegaLiteSpec(spec: VegaLiteSpec): VegaLiteSpec {
  if (!readIDIDMetadata(spec) || !Array.isArray(spec.layer)) return spec

  const baseLayers = spec.layer.filter((layer) => !isIDIDAnnotationLayer(layer))
  if (baseLayers.length !== 1) return spec

  const { layer: _layer, ...outer } = spec
  const { usermeta: _baseUsermeta, ...base } = baseLayers[0]
  return { ...outer, ...base }
}

function strictImportDiagnostics(spec: VegaLiteSpec): PortabilityDiagnostic[] {
  const original = spec
  const recovered = unwrapIDIDEnrichedVegaLiteSpec(spec)
  const normalized = recovered
  const diagnostics: PortabilityDiagnostic[] = []

  if (Array.isArray(original.layer) && recovered === spec) {
    diagnostics.push({
      code: "UNSUPPORTED_COMPOSITION",
      severity: "error",
      path: "/layer",
      message: "Only the single base view in an IDID-enriched annotation layer can be imported.",
    })
  }
  if (normalized.mark === undefined) {
    diagnostics.push({
      code: "MISSING_MARK",
      severity: "error",
      path: "/mark",
      message: "A Vega-Lite spec needs a supported single-view mark.",
    })
  } else {
    const { type } = normalizeMark(normalized.mark as VegaLiteSpec["mark"])
    const supported = new Set(["bar", "line", "area", "point", "circle", "square", "rect", "arc", "tick"])
    if (!supported.has(type)) {
      diagnostics.push({
        code: "UNSUPPORTED_MARK",
        severity: "error",
        path: "/mark",
        message: `Vega-Lite mark "${type || "(missing)"}" has no supported Semiotic translation.`,
      })
    }
  }
  if (Array.isArray(normalized.transform) && normalized.transform.length > 0) {
    diagnostics.push({
      code: "UNSUPPORTED_TRANSFORM",
      severity: "error",
      path: "/transform",
      message: "Vega-Lite transforms must be materialized before strict import.",
    })
  }
  for (const key of ["hconcat", "vconcat", "concat", "facet", "repeat", "params", "selection"] as const) {
    if (normalized[key] !== undefined) {
      diagnostics.push({
        code: "UNSUPPORTED_COMPOSITION",
        severity: "error",
        path: `/${key}`,
        message: `Vega-Lite "${key}" is not part of the supported single-view import subset.`,
      })
    }
  }
  if (typeof normalized.data?.url === "string") {
    diagnostics.push({
      code: "UNSUPPORTED_DATA_URL",
      severity: "error",
      path: "/data/url",
      message: "Strict import accepts inline data.values only; load URL data before importing.",
    })
  }

  diagnostics.push(...vegaLiteSemanticDiagnostics(normalized), ...vegaLiteAggregationDiagnostics(normalized))
  return diagnostics
}

/** Map Vega-Lite color scheme names to Semiotic equivalents */
const SCHEME_MAP: Record<string, string> = {
  category10: "category10",
  category20: "category20",
  category20b: "category20",
  category20c: "category20",
  accent: "accent",
  dark2: "dark2",
  paired: "paired",
  pastel1: "pastel1",
  pastel2: "pastel2",
  set1: "set1",
  set2: "set2",
  set3: "set3",
  tableau10: "category10",
  tableau20: "category20",
}

/** Map Vega-Lite interpolation names to Semiotic curve names */
const CURVE_MAP: Record<string, string> = {
  linear: "linear",
  "monotone-x": "monotoneX",
  "monotone-y": "monotoneY",
  monotone: "monotoneX",
  step: "step",
  "step-after": "stepAfter",
  "step-before": "stepBefore",
  basis: "basis",
  cardinal: "cardinal",
  "catmull-rom": "catmullRom",
}

// ── Main ─────────────────────────────────────────────────────────────────

export function fromVegaLite(spec: VegaLiteSpec): ChartConfig & { warnings?: string[] } {
  return translateVegaLite(spec)
}

function translateVegaLite(spec: VegaLiteSpec, silent = false, createdAt?: string): ChartConfig & { warnings?: string[] } {
  const malformed = vegaLiteShapeDiagnostics(spec)
  if (malformed.length) return buildConfig("Scatterplot", {}, malformed.map(d => d.message), silent, createdAt)
  // attachIDIDAnnotations() represents courtesy marks as a Vega-Lite layer.
  // Recover its one actual chart layer before inspecting `mark`; arbitrary
  // layered specs remain on the legacy warning/fallback path below.
  spec = unwrapIDIDEnrichedVegaLiteSpec(spec)
  const warnings: string[] = []
  const { type: markType, markProps } = normalizeMark(spec.mark)
  const { data, encoding: enc } = aggregateVegaLite(spec, warnings)
  const x = enc.x
  const y = enc.y
  const color = enc.color
  const size = enc.size
  const theta = enc.theta
  const opacity = enc.opacity

  // Data handling
  if (!data && spec.data?.url) {
    warnings.push("Load data.url into inline data.values before import.")
  }

  if (spec.transform && spec.transform.length > 0) {
    warnings.push("Materialize Vega-Lite transforms before import.")
  }

  // Unsupported composition features
  if (spec.layer) {
    warnings.push(
      'Layered specs ("layer") are unsupported; provide one mark.'
    )
  }
  if (spec.hconcat || spec.vconcat || spec.concat) {
    warnings.push(
      'Concatenated views ("hconcat"/"vconcat"/"concat") are unsupported; import each view separately.'
    )
  }
  if (spec.facet || enc.facet || enc.row || enc.column) {
    warnings.push("Faceted views are unsupported; use LinkedCharts or separate charts.")
  }
  if (spec.repeat) {
    warnings.push(
      'Repeated views ("repeat") are unsupported; import each field combination separately.'
    )
  }
  if (spec.params || spec.selection) {
    warnings.push("Selections/params are unsupported; use LinkedCharts and selection props.")
  }

  // Determine component and build props
  const props: Datum = {}

  // Layout
  if (spec.width) props.width = spec.width
  if (spec.height) props.height = spec.height
  const title = extractTitle(spec.title)
  if (title) props.title = title

  // Color encoding (shared across all chart types)
  if (color?.field) {
    props.colorBy = color.field
    if (color.scale?.scheme) {
      const mapped = Object.prototype.hasOwnProperty.call(SCHEME_MAP, color.scale.scheme) ? SCHEME_MAP[color.scale.scheme] : undefined
      if (mapped) props.colorScheme = mapped
    }
    if (Array.isArray(color.scale?.range)) props.colorScheme = color.scale.range
  }

  // Opacity
  if (opacity?.value !== undefined) {
    props.pointOpacity = opacity.value
  }

  // Handle bin → Histogram
  if (x?.bin || y?.bin) {
    const component = "Histogram"
    if (data) props.data = data
    // For histogram, the binned field becomes the value, category is the grouping
    if (x?.bin) {
      props.valueAccessor = x.field
      if (x.axis?.title) props.valueLabel = x.axis.title
    } else if (y?.bin) {
      props.valueAccessor = y.field
      if (y.axis?.title) props.valueLabel = y.axis.title
    }
    if (color?.field) props.categoryAccessor = color.field
    const binConfig = x?.bin || y?.bin
    const maxbins = typeof binConfig === "object"
      ? binConfig.maxbins
      : undefined
    if (maxbins) props.bins = maxbins

    return buildConfig(component, props, warnings, silent, createdAt)
  }

  let component: string

  switch (markType) {
    case "bar": {
      component = resolveBarComponent(x, y, color, props)
      break
    }
    case "line": {
      component = "LineChart"
      setXYAccessors(x, y, props)
      if (color?.field) {
        props.lineBy = color.field
      }
      if (markProps.point === true) {
        props.showPoints = true
      }
      break
    }
    case "area": {
      if (color?.field) {
        component = "StackedAreaChart"
        props.areaBy = color.field
      } else {
        component = "AreaChart"
      }
      setXYAccessors(x, y, props)
      if (x?.stack === "normalize" || y?.stack === "normalize") props.normalize = true
      if (markProps.opacity !== undefined) {
        props.areaOpacity = markProps.opacity
      }
      break
    }
    case "point":
    case "circle":
    case "square": {
      if (size?.field) {
        component = "BubbleChart"
        props.sizeBy = size.field
        if (size.scale?.range) {
          props.sizeRange = size.scale.range
        }
      } else {
        component = "Scatterplot"
      }
      setXYAccessors(x, y, props)
      break
    }
    case "rect": {
      component = "Heatmap"
      if (x?.field) props.xAccessor = x.field
      if (y?.field) props.yAccessor = y.field
      // For heatmap, color encoding is the value
      if (color?.field) {
        props.valueAccessor = color.field
        // Don't set colorBy for heatmap, it uses valueAccessor
        delete props.colorBy
      }
      if (x?.axis?.title) props.xLabel = x.axis.title
      if (y?.axis?.title) props.yLabel = y.axis.title
      break
    }
    case "arc": {
      if (markProps.innerRadius && markProps.innerRadius > 0) {
        component = "DonutChart"
        props.innerRadius = markProps.innerRadius
      } else {
        component = "PieChart"
      }
      // Arc uses theta for value, color for category
      if (theta?.field) {
        props.valueAccessor = theta.field
      } else if (y?.field) {
        props.valueAccessor = y.field
      }
      if (color?.field) {
        props.categoryAccessor = color.field
        // For pie/donut, colorBy is implicit from categoryAccessor
      }
      if (x?.field && !theta?.field) {
        props.categoryAccessor = x.field
      }
      break
    }
    case "tick": {
      component = "DotPlot"
      if (isCategory(x?.type)) {
        props.categoryAccessor = x!.field
        if (y?.field) props.valueAccessor = y.field
        if (x?.axis?.title) props.categoryLabel = x.axis.title
        if (y?.axis?.title) props.valueLabel = y.axis.title
      } else if (isCategory(y?.type)) {
        props.categoryAccessor = y!.field
        if (x?.field) props.valueAccessor = x.field
        props.orientation = "horizontal"
        if (y?.axis?.title) props.categoryLabel = y.axis.title
        if (x?.axis?.title) props.valueLabel = x.axis.title
      } else {
        // Default: x is category
        if (x?.field) props.categoryAccessor = x.field
        if (y?.field) props.valueAccessor = y.field
      }
      break
    }
    default: {
      warnings.push(`Unsupported mark type "${markType}". Defaulting to Scatterplot.`)
      component = "Scatterplot"
      setXYAccessors(x, y, props)
      break
    }
  }

  if ((markType === "line" || markType === "area") && markProps.interpolate &&
      Object.prototype.hasOwnProperty.call(CURVE_MAP, markProps.interpolate)) {
    props.curve = CURVE_MAP[markProps.interpolate]
  }
  if (data) props.data = data
  return buildConfig(component, props, warnings, silent, createdAt)
}

/**
 * Strict, loss-aware Vega-Lite import.
 *
 * `fromVegaLite()` remains the stable compatibility helper and therefore
 * preserves fallback behavior for unsupported marks. Portability integrations
 * should use this result API, whose default is to refuse unsupported semantics
 * rather than return a chart that merely looks plausible.
 */
export function fromVegaLiteResult(
  spec: VegaLiteSpec,
  options: FromVegaLiteOptions = {},
): VegaLiteImportResult {
  const malformed = vegaLiteShapeDiagnostics(spec)
  const diagnostics = malformed.length ? malformed : strictImportDiagnostics(spec)
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error")
  const idid = readIDIDMetadata(spec)
  const provenance = {
    adapter: "semiotic/vega-lite",
    direction: "import" as const,
    sourceFormat: "vega-lite",
    targetFormat: "semiotic-chart-config",
    ...(typeof idid?.specVersion === "string" ? { specVersion: idid.specVersion } : {}),
    ...(idid ? { metadata: { idid } } : {}),
  }

  if (errors.length > 0 && (options.mode !== "lossy" || malformed.length > 0)) {
    return {
      status: "refused",
      diagnostics,
      lossReport: errors.map(({ code, message, path }) => ({ code, message, path })),
      provenance,
    }
  }

  const config = translateVegaLite(spec, true, options.createdAt)
  const warningDiagnostics: PortabilityDiagnostic[] = (config.warnings || []).map((message) => ({
    code: "LEGACY_TRANSLATION_WARNING",
    severity: "warning",
    message,
  }))
  const lossReport = errors.map(({ code, message, path }) => ({ code, message, path }))
  // In lossy mode, strict-subset failures describe approximated or discarded
  // semantics rather than a refusal. Keep them in `lossReport`, but surface
  // them as warnings so callers can use error-level diagnostics as a reliable
  // refusal signal.
  const surfacedDiagnostics = options.mode === "lossy"
    ? diagnostics.map((diagnostic) =>
          diagnostic.severity === "error"
        ? { ...diagnostic, severity: "warning" as const }
        : diagnostic
        )
    : diagnostics

  return {
    status: lossReport.length > 0 ? "lossy" : "success",
    config,
    diagnostics: [...surfacedDiagnostics, ...warningDiagnostics],
    lossReport,
    provenance,
  }
}

// ── Internal helpers ─────────────────────────────────────────────────────

function resolveBarComponent(
  x: VegaLiteEncoding | undefined,
  y: VegaLiteEncoding | undefined,
  color: VegaLiteEncoding | undefined,
  props: Datum,
): string {
  let component: string
  const isStacked = color?.field &&
    // Explicitly stacked or not explicitly unstacked
    x?.stack !== false && y?.stack !== false &&
    x?.stack !== null && y?.stack !== null

  if (isStacked) {
    component = "StackedBarChart"
    props.stackBy = color!.field
    if (x?.stack === "normalize" || y?.stack === "normalize") props.normalize = true
  } else {
    component = "BarChart"
  }

  // Determine orientation from encoding types
  if (isCategory(x?.type) && isQuantitative(y?.type)) {
    // Vertical bars: x = category, y = value
    props.categoryAccessor = x!.field
    props.valueAccessor = y!.field
    if (x?.axis?.title) props.categoryLabel = x.axis.title
    if (y?.axis?.title) props.valueLabel = y.axis.title
  } else if (isQuantitative(x?.type) && isCategory(y?.type)) {
    // Horizontal bars: y = category, x = value
    props.categoryAccessor = y!.field
    props.valueAccessor = x!.field
    props.orientation = "horizontal"
    if (y?.axis?.title) props.categoryLabel = y.axis.title
    if (x?.axis?.title) props.valueLabel = x.axis.title
  } else {
    // Fallback: guess from field names
    if (x?.field) props.categoryAccessor = x.field
    if (y?.field) props.valueAccessor = y.field
    if (x?.axis?.title) props.categoryLabel = x.axis.title
    if (y?.axis?.title) props.valueLabel = y.axis.title
  }

  return component
}

function setXYAccessors(
  x: VegaLiteEncoding | undefined,
  y: VegaLiteEncoding | undefined,
  props: Datum,
): void {
  if (x?.field) props.xAccessor = x.field
  if (y?.field) props.yAccessor = y.field
  if (x?.axis?.title) props.xLabel = x.axis.title
  if (y?.axis?.title) props.yLabel = y.axis.title
  if (x?.type === "temporal") props.xScaleType = "time"
  else if (x?.scale?.type === "log") props.xScaleType = "log"
  if (y?.scale?.type === "log" || y?.scale?.type === "symlog") props.yScaleType = y.scale.type
}

function buildConfig(
  component: string,
  props: Datum,
  warnings: string[],
  silent = false,
  createdAt?: string,
): ChartConfig & { warnings?: string[] } {
  const config: ChartConfig & { warnings?: string[] } = {
    component,
    props,
    version: "1",
    createdAt: createdAt ?? new Date().toISOString(),
  }
  if (warnings.length > 0) {
    config.warnings = warnings
    for (const w of silent ? [] : warnings) {
      console.warn(`[semiotic/fromVegaLite] ${w}`)
    }
  }
  return config
}
