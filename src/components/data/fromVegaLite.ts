import { portableScheme } from "./portableEncodingNames"
import { fromVegaInterpolation } from "./vegaLiteCurves"
import { compositionKeys, isHorizontalOrdinal, pointOpacityProp, isRecord, vegaLiteShapeDiagnostics, vegaLiteSemanticDiagnostics } from "./vegaLiteValidation"
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

function normalizeMark(mark: VegaLiteSpec["mark"] | undefined): Datum {
  return isRecord(mark) ? mark : { type: typeof mark === "string" ? mark : "" }
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
  const normalized = unwrapIDIDEnrichedVegaLiteSpec(spec)
  const diagnostics: PortabilityDiagnostic[] = []
  function reject(code: string, path: string, message: string) {
    diagnostics.push({ code, severity: "error", path, message })
  }

  if (Array.isArray(spec.layer) && normalized === spec) {
    reject("UNSUPPORTED_COMPOSITION", "/layer", "Only the single base view in an IDID-enriched annotation layer can be imported.")
  }
  if (normalized.mark === undefined) {
    reject("MISSING_MARK", "/mark", "A Vega-Lite spec needs a supported single-view mark.")
  } else {
    const { type } = normalizeMark(normalized.mark as VegaLiteSpec["mark"])
    const supported = ["bar", "line", "area", "point", "circle", "rect", "arc", "tick"]
    if (!supported.includes(type)) {
      reject("UNSUPPORTED_MARK", "/mark", `Vega-Lite mark "${type || "(missing)"}" has no supported Semiotic translation.`)
    }
  }
  if (Array.isArray(normalized.transform) && normalized.transform.length > 0) {
    reject("UNSUPPORTED_TRANSFORM", "/transform", "Vega-Lite transforms must be materialized before strict import.")
  }
  for (const key of compositionKeys) {
    if (normalized[key] !== undefined) {
      reject("UNSUPPORTED_COMPOSITION", `/${key}`, `Vega-Lite "${key}" is not part of the supported single-view import subset.`)
    }
  }
  if (typeof normalized.data?.url === "string") {
    reject("UNSUPPORTED_DATA_URL", "/data/url", "Strict import accepts inline data.values only; load URL data before importing.")
  }

  diagnostics.push(...vegaLiteSemanticDiagnostics(normalized), ...vegaLiteAggregationDiagnostics(normalized))
  return diagnostics
}

// ── Main ─────────────────────────────────────────────────────────────────

export function fromVegaLite(spec: VegaLiteSpec): ChartConfig & { warnings?: string[] } {
  const malformed = vegaLiteShapeDiagnostics(spec)
  return malformed.length
    ? buildConfig("Scatterplot", {}, malformed.map(d => d.message))
    : translateVegaLite(spec)
}

function translateVegaLite(spec: VegaLiteSpec, silent = false, createdAt?: string): ChartConfig & { warnings?: string[] } {
  // attachIDIDAnnotations() represents courtesy marks as a Vega-Lite layer.
  // Recover its one actual chart layer before inspecting `mark`; arbitrary
  // layered specs remain on the legacy warning/fallback path below.
  spec = unwrapIDIDEnrichedVegaLiteSpec(spec)
  const warnings: string[] = []
  const markProps = normalizeMark(spec.mark)
  const markType = markProps.type ?? ""
  const { data, encoding: enc } = aggregateVegaLite(spec, warnings)
  const { x, y, color, size, theta, opacity } = enc

  // Data handling
  if (!data && spec.data?.url) {
    warnings.push("Load data.url into inline data.values before import.")
  }

  if (spec.transform?.length) {
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
      'Import each concat, hconcat or vconcat view separately.'
    )
  }
  if (spec.facet || enc.facet || enc.row || enc.column) {
    warnings.push("Faceted views are unsupported; use LinkedCharts or separate charts.")
  }
  if (spec.repeat) {
    warnings.push(
      'Import each repeat field combination separately.'
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
  const title = typeof spec.title === "string" ? spec.title : spec.title?.text
  if (title) props.title = title

  // Color encoding (shared across all chart types)
  if (color?.field) {
    props.colorBy = color.field
    const scheme = Array.isArray(color.scale?.range) ? color.scale.range : portableScheme(color.scale?.scheme, "vega")
    if (scheme) props.colorScheme = scheme
  }

  function finish(component: string) {
    if (opacity?.value !== undefined) props[pointOpacityProp(component)] = opacity.value
    if (data) props.data = data
    return buildConfig(component, props, warnings, silent, createdAt)
  }

  // Handle bin → Histogram
  if (x?.bin || y?.bin) {
    const binned = x?.bin ? x : y!
    setAxisProps(props, "valueAccessor", "valueLabel", binned)
    if (color?.field) props.categoryAccessor = color.field
    if (typeof binned.bin === "object" && binned.bin.maxbins) props.bins = binned.bin.maxbins
    return finish("Histogram")
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
      if (markProps.point === true || isRecord(markProps.point)) {
        props.showPoints = true
      }
      break
    }
    case "area": {
      const stackAxis = spec.encoding?.x?.aggregate && !spec.encoding?.y?.aggregate && y?.stack === undefined ? x : y
      const stack = color?.field && stackOffset(stackAxis)
      component = stack ? "StackedAreaChart" : "AreaChart"
      if (color?.field) props.areaBy = color.field
      setXYAccessors(x, y, props)
      if (stack === "normalize") props.normalize = true
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
      setXYAccessors(x, y, props, false)
      // For heatmap, color encoding is the value
      if (color?.field) {
        props.valueAccessor = color.field
        // Don't set colorBy for heatmap, it uses valueAccessor
        delete props.colorBy
      }
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
      const value = theta?.field || y?.field
      const category = (!theta?.field && x?.field) || color?.field
      if (value) props.valueAccessor = value
      if (category) props.categoryAccessor = category
      break
    }
    case "tick": {
      component = "DotPlot"
      const horizontal = isHorizontalOrdinal(x, y)
      if (!horizontal) props.orientation = "vertical"
      setOrdinalAccessors(x, y, props, horizontal)
      break
    }
    default: {
      warnings.push(`Unsupported mark type "${markType}". Defaulting to Scatterplot.`)
      component = "Scatterplot"
      setXYAccessors(x, y, props)
      break
    }
  }

  if (markType === "line" || markType === "area") {
    const curve = fromVegaInterpolation(markProps.interpolate)
    if (curve) props.curve = curve
  }
  return finish(component)
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
  const lossReport = errors.map(({ code, message, path }) => ({ code, message, path }))
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
      lossReport,
      provenance,
    }
  }

  const config = translateVegaLite(spec, true, options.createdAt)
  const warningDiagnostics: PortabilityDiagnostic[] = (config.warnings || []).map((message) => ({
    code: "LEGACY_TRANSLATION_WARNING",
    severity: "warning",
    message,
  }))
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

function stackOffset(channel?: VegaLiteEncoding) {
  return channel?.stack === undefined ? "zero" : channel.stack
}

function resolveBarComponent(
  x: VegaLiteEncoding | undefined,
  y: VegaLiteEncoding | undefined,
  color: VegaLiteEncoding | undefined,
  props: Datum,
): string {
  const horizontal = isHorizontalOrdinal(x, y)
  setOrdinalAccessors(x, y, props, horizontal)
  const stack = stackOffset(horizontal ? x : y)
  if (!color?.field || !stack) return "BarChart"
  props.stackBy = color.field
  if (stack === "normalize") props.normalize = true
  return "StackedBarChart"
}

function setOrdinalAccessors(
  x: VegaLiteEncoding | undefined, y: VegaLiteEncoding | undefined,
  props: Datum, horizontal: boolean
) {
  if (horizontal) props.orientation = "horizontal"
  setAxisProps(props, "categoryAccessor", "categoryLabel", horizontal ? y : x)
  setAxisProps(props, "valueAccessor", "valueLabel", horizontal ? x : y)
}

function setAxisProps(props: Datum, accessor: string, label: string, channel?: VegaLiteEncoding) {
  if (channel?.field) props[accessor] = channel.field
  if (channel?.axis?.title) props[label] = channel.axis.title
}

function setXYAccessors(
  x: VegaLiteEncoding | undefined,
  y: VegaLiteEncoding | undefined,
  props: Datum,
  continuous = true,
): void {
  setAxisProps(props, "xAccessor", "xLabel", x)
  setAxisProps(props, "yAccessor", "yLabel", y)
  if (!continuous) return
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
