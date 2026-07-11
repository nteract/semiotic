/**
 * Outbound Vega-Lite + the IDID-over-Vega-Lite binding (v0.1).
 *
 * `toVegaLite` is the inverse of `fromVegaLite`: a Semiotic ChartConfig back to
 * a Vega-Lite spec. Round-tripping through the dominant interchange format —
 * *with the IDID metadata preserved* — is the portability claim in runnable
 * form.
 *
 * The binding functions (`attachIDID` / `readIDID`, `attachIDIDAnnotations` /
 * `readIDIDAnnotations`) define WHERE the three portable primitives ride on a
 * Vega-Lite spec so the spec and its IDID metadata travel together. The
 * convention is documented in `/spec/README.md`.
 *
 * Pure, dependency-free, no chart-family imports.
 */
import type { ChartConfig } from "../../export/chartConfig"
import type { VegaLiteEncoding, VegaLiteSpec } from "../fromVegaLite"
import type {
  PortableAnnotated,
  PortableAudienceProfile,
  PortableChartCapability,
} from "./spec"
import { IDID_SPEC_VERSION } from "./spec"
import type {
  PortabilityDiagnostic,
  PortabilityExportResult,
  PortabilityLoss,
} from "./result"

// ── toVegaLite ───────────────────────────────────────────────────────────────

type AnyProps = Record<string, any>

/** Options for the strict, typed outbound Vega-Lite adapter. */
export interface ToVegaLiteOptions {
  /**
   * Allow a documented approximation. The default is false, so a caller never
   * receives a visually plausible but semantically different Vega-Lite spec by
   * accident.
   */
  allowLossy?: boolean
}

/** Typed result for Vega-Lite export. A refused result deliberately has no spec. */
export interface VegaLiteExportResult extends PortabilityExportResult<VegaLiteSpec> {
  spec?: VegaLiteSpec
}

/** Reverse of fromVegaLite's CURVE_MAP. */
const CURVE_TO_INTERPOLATE: Record<string, string> = {
  linear: "linear",
  monotoneX: "monotone-x",
  monotoneY: "monotone-y",
  step: "step",
  stepAfter: "step-after",
  stepBefore: "step-before",
  basis: "basis",
  cardinal: "cardinal",
  catmullRom: "catmull-rom",
}

function quant(field: string): VegaLiteEncoding {
  return { field, type: "quantitative" }
}
function nominal(field: string): VegaLiteEncoding {
  return { field, type: "nominal" }
}

/** Whether the chart's x is a time field, read from props. */
function xType(props: AnyProps): "quantitative" | "temporal" {
  return props.xScaleType === "time" ? "temporal" : "quantitative"
}

function withAxisTitle(enc: VegaLiteEncoding, label: unknown): VegaLiteEncoding {
  if (typeof label === "string") enc.axis = { title: label }
  return enc
}

const REQUIRED_ACCESSORS: Record<string, readonly string[]> = {
  BarChart: ["categoryAccessor", "valueAccessor"],
  StackedBarChart: ["categoryAccessor", "valueAccessor", "stackBy"],
  GroupedBarChart: ["categoryAccessor", "valueAccessor", "groupBy"],
  LineChart: ["xAccessor", "yAccessor"],
  AreaChart: ["xAccessor", "yAccessor"],
  StackedAreaChart: ["xAccessor", "yAccessor", "areaBy"],
  Scatterplot: ["xAccessor", "yAccessor"],
  BubbleChart: ["xAccessor", "yAccessor", "sizeBy"],
  Heatmap: ["xAccessor", "yAccessor", "valueAccessor"],
  PieChart: ["valueAccessor", "categoryAccessor"],
  DonutChart: ["valueAccessor", "categoryAccessor"],
  DotPlot: ["categoryAccessor", "valueAccessor"],
  Histogram: ["valueAccessor"],
}

const OPTIONAL_ACCESSORS: Record<string, readonly string[]> = {
  LineChart: ["lineBy", "colorBy"],
  AreaChart: ["colorBy"],
  StackedAreaChart: ["colorBy"],
  Scatterplot: ["colorBy"],
  BubbleChart: ["colorBy"],
  Heatmap: ["colorBy"],
  Histogram: ["categoryAccessor"],
}

function accessorDiagnostics(component: string, props: AnyProps): PortabilityDiagnostic[] {
  const diagnostics: PortabilityDiagnostic[] = []
  for (const key of REQUIRED_ACCESSORS[component] || []) {
    if (typeof props[key] !== "string" || props[key].length === 0) {
      diagnostics.push({
        code: "UNSERIALIZABLE_ACCESSOR",
        severity: "error",
        path: `/props/${key}`,
        message: `${component} requires a string ${key} for Vega-Lite export.`,
      })
    }
  }
  for (const key of OPTIONAL_ACCESSORS[component] || []) {
    if (props[key] !== undefined && (typeof props[key] !== "string" || props[key].length === 0)) {
      diagnostics.push({
        code: "UNSERIALIZABLE_ACCESSOR",
        severity: "error",
        path: `/props/${key}`,
        message: `${component} can export ${key} only as a non-empty string field name.`,
      })
    }
  }
  return diagnostics
}

/**
 * Translate a Semiotic ChartConfig into Vega-Lite through an explicit result.
 * Unsupported components are refused by default; pass `allowLossy` only when
 * the caller has chosen to accept the listed semantic loss.
 */
export function toVegaLiteResult(
  config: ChartConfig,
  options: ToVegaLiteOptions = {},
): VegaLiteExportResult {
  const lossReport: PortabilityLoss[] = []
  const provenance = {
    adapter: "semiotic/vega-lite",
    direction: "export" as const,
    sourceFormat: "semiotic-chart-config",
    targetFormat: "vega-lite",
    ...(typeof config.version === "string" ? { specVersion: config.version } : {}),
  }
  const props: AnyProps = config.props || {}
  const accessorErrors = accessorDiagnostics(config.component, props)
  if (accessorErrors.length > 0) {
    return {
      status: "refused",
      diagnostics: accessorErrors,
      lossReport: accessorErrors.map(({ code, message, path }) => ({ code, message, path })),
      provenance,
    }
  }
  const enc: Record<string, VegaLiteEncoding> = {}
  let mark: VegaLiteSpec["mark"]

  const component = config.component

  switch (component) {
    case "BarChart":
    case "StackedBarChart":
    case "GroupedBarChart": {
      mark = "bar"
      const horizontal = props.orientation === "horizontal"
      const cat = withAxisTitle(nominal(props.categoryAccessor), props.categoryLabel)
      const val = withAxisTitle(quant(props.valueAccessor), props.valueLabel)
      if (horizontal) {
        enc.y = cat
        enc.x = val
      } else {
        enc.x = cat
        enc.y = val
      }
      if (component === "StackedBarChart" && props.stackBy) {
        enc.color = nominal(props.stackBy)
      } else if (component === "GroupedBarChart" && props.groupBy) {
        enc.color = nominal(props.groupBy)
        lossReport.push({
          code: "GROUPED_BAR_APPROXIMATION",
          path: "/props/groupBy",
          message: 'GroupedBarChart maps groupBy to color; Vega-Lite needs xOffset for an exact grouped layout.',
        })
      }
      break
    }
    case "LineChart": {
      mark = props.curve || props.showPoints ? { type: "line" } : "line"
      if (typeof mark === "object") {
        if (props.curve && CURVE_TO_INTERPOLATE[props.curve]) {
          mark.interpolate = CURVE_TO_INTERPOLATE[props.curve]
        }
        if (props.showPoints) mark.point = true
      }
      enc.x = withAxisTitle({ field: props.xAccessor, type: xType(props) }, props.xLabel)
      enc.y = withAxisTitle(quant(props.yAccessor), props.yLabel)
      if (props.lineBy) enc.color = nominal(props.lineBy)
      else if (props.colorBy) enc.color = nominal(props.colorBy)
      break
    }
    case "AreaChart":
    case "StackedAreaChart": {
      mark = props.curve ? { type: "area" } : "area"
      if (typeof mark === "object" && props.curve && CURVE_TO_INTERPOLATE[props.curve]) {
        mark.interpolate = CURVE_TO_INTERPOLATE[props.curve]
      }
      if (typeof mark === "object" && props.areaOpacity !== undefined) {
        mark.opacity = props.areaOpacity
      }
      enc.x = withAxisTitle({ field: props.xAccessor, type: xType(props) }, props.xLabel)
      enc.y = withAxisTitle(quant(props.yAccessor), props.yLabel)
      if (component === "StackedAreaChart" && props.areaBy) enc.color = nominal(props.areaBy)
      break
    }
    case "Scatterplot":
    case "BubbleChart": {
      mark = "point"
      enc.x = withAxisTitle(quant(props.xAccessor), props.xLabel)
      enc.y = withAxisTitle(quant(props.yAccessor), props.yLabel)
      if (props.colorBy) enc.color = nominal(props.colorBy)
      if (component === "BubbleChart" && props.sizeBy) {
        enc.size = quant(props.sizeBy)
        if (Array.isArray(props.sizeRange)) enc.size.scale = { range: props.sizeRange }
      }
      break
    }
    case "Heatmap": {
      mark = "rect"
      enc.x = withAxisTitle(nominal(props.xAccessor), props.xLabel)
      enc.y = withAxisTitle(nominal(props.yAccessor), props.yLabel)
      if (props.valueAccessor) enc.color = quant(props.valueAccessor)
      break
    }
    case "PieChart":
    case "DonutChart": {
      mark = component === "DonutChart" ? { type: "arc", innerRadius: props.innerRadius ?? 60 } : "arc"
      if (props.valueAccessor) enc.theta = quant(props.valueAccessor)
      if (props.categoryAccessor) enc.color = nominal(props.categoryAccessor)
      break
    }
    case "DotPlot": {
      mark = "tick"
      const horizontal = props.orientation === "horizontal"
      const cat = withAxisTitle(nominal(props.categoryAccessor), props.categoryLabel)
      const val = withAxisTitle(quant(props.valueAccessor), props.valueLabel)
      if (horizontal) {
        enc.y = cat
        enc.x = val
      } else {
        enc.x = cat
        enc.y = val
      }
      break
    }
    case "Histogram": {
      mark = "bar"
      if (props.valueAccessor) {
        enc.x = withAxisTitle(quant(props.valueAccessor), props.valueLabel)
        enc.x.bin = props.bins ? { maxbins: props.bins } : true
        enc.y = { aggregate: "count", type: "quantitative" }
      }
      if (props.categoryAccessor) enc.color = nominal(props.categoryAccessor)
      break
    }
    default: {
      const message = `Component "${component}" has no supported Vega-Lite single-view equivalent.`
      return {
        status: "refused",
        diagnostics: [{
          code: "UNSUPPORTED_COMPONENT",
          severity: "error",
          path: "/component",
          message,
        }],
        lossReport: [{ code: "UNSUPPORTED_COMPONENT", path: "/component", message }],
        provenance,
      }
    }
  }

  // Shared color scheme
  if (props.colorScheme && enc.color) {
    enc.color.scale = { ...(enc.color.scale || {}), scheme: props.colorScheme }
  }

  const spec: VegaLiteSpec = { mark }
  if (Array.isArray(props.data)) spec.data = { values: props.data }
  if (Object.keys(enc).length > 0) spec.encoding = enc
  if (typeof props.title === "string") spec.title = props.title
  if (typeof props.width === "number") spec.width = props.width
  if (typeof props.height === "number") spec.height = props.height

  if (lossReport.length > 0 && !options.allowLossy) {
    return {
      status: "refused",
      diagnostics: lossReport.map(({ code, message, path }) => ({
        code,
        severity: "error" as const,
        message,
        path,
      })),
      lossReport,
      provenance,
    }
  }

  return {
    status: lossReport.length > 0 ? "lossy" : "success",
    spec,
    artifact: spec,
    diagnostics: lossReport.map(({ code, message, path }) => ({
      code,
      severity: "warning" as const,
      message,
      path,
    })),
    lossReport,
    provenance,
  }
}

/**
 * Convenience wrapper for the supported subset. Returns undefined on refusal
 * rather than synthesizing a placeholder chart; use `toVegaLiteResult()` when
 * a caller needs the structured diagnostic and loss report.
 */
export function toVegaLite(
  config: ChartConfig,
  options?: ToVegaLiteOptions,
): VegaLiteSpec | undefined {
  return toVegaLiteResult(config, options).spec
}

// ── IDID-over-Vega-Lite binding ──────────────────────────────────────────────

/** The metadata block that rides under `usermeta.idid`. */
export interface IDIDVegaLiteMeta {
  specVersion: string
  capability?: PortableChartCapability
  audience?: PortableAudienceProfile
  /** Provenanced annotations carried alongside the spec. */
  annotations?: PortableAnnotated[]
}

const ANNOTATION_LAYER_ROLE = "annotation-layer"

/**
 * Attach a capability descriptor and/or an audience profile to a Vega-Lite
 * spec under `usermeta.idid`. A non-IDID renderer ignores `usermeta`; an
 * IDID-aware host reads it (e.g. to route the capability through a suggestion
 * engine). Returns a new spec; the input is not mutated.
 */
export function attachIDID(
  spec: VegaLiteSpec,
  meta: { capability?: PortableChartCapability; audience?: PortableAudienceProfile }
): VegaLiteSpec {
  // Descriptor and annotation attachment must compose in either order. Keep
  // an existing IDID block, then overwrite only fields supplied by this call.
  const idid: IDIDVegaLiteMeta = {
    ...readIDID(spec),
    specVersion: IDID_SPEC_VERSION,
  }
  if (meta.capability !== undefined) idid.capability = meta.capability
  if (meta.audience !== undefined) idid.audience = meta.audience
  return {
    ...spec,
    usermeta: { ...(spec.usermeta as object | undefined), idid },
  }
}

/** Read the IDID metadata block from a Vega-Lite spec, if present. */
export function readIDID(spec: VegaLiteSpec): IDIDVegaLiteMeta | undefined {
  const usermeta = spec.usermeta as { idid?: IDIDVegaLiteMeta } | undefined
  return usermeta?.idid
}

/**
 * Attach provenanced/lifecycled annotations to a Vega-Lite spec.
 *
 * The annotations are stored verbatim (with their provenance/lifecycle blocks)
 * under the spec's `usermeta.idid.annotations` — that is the round-trip
 * contract, and it composes with capability/audience metadata under the same
 * key. As a courtesy to non-IDID renderers, each annotation that has a
 * representable shape also emits a best-effort `rule`/`text` mark in an
 * appended layer, so a plain Vega-Lite renderer still draws something. When no
 * annotation is representable, no layer is added (avoiding an invalid empty
 * layer) and the metadata still rides on `usermeta`. Returns a new spec; the
 * input is not mutated.
 */
export function attachIDIDAnnotations(
  spec: VegaLiteSpec,
  annotations: ReadonlyArray<PortableAnnotated>
): VegaLiteSpec {
  const existing = readIDID(spec)
  const idid: IDIDVegaLiteMeta = {
    ...existing,
    specVersion: IDID_SPEC_VERSION,
    annotations: [...annotations],
  }

  const courtesyMarks = annotations
    .map(annotationToMark)
    .filter((m): m is AnyProps => m !== null)
    .map((m) => ({ ...m, usermeta: { idid: { role: ANNOTATION_LAYER_ROLE } } }))

  // No representable marks → keep the spec shape, only augment usermeta.
  if (courtesyMarks.length === 0) {
    return { ...spec, usermeta: { ...(spec.usermeta as object | undefined), idid } }
  }

  // Build a layered spec: existing layers (or the base view) plus courtesy marks.
  const baseLayers = Array.isArray((spec as AnyProps).layer)
    ? (spec as AnyProps).layer
    : [stripTopLevel(spec)]
  const { mark: _m, encoding: _e, data: _d, transform: _t, usermeta: _u, ...topLevel } = spec as AnyProps
  // A layered spec has no top-level `mark`, which VegaLiteSpec types as
  // required — cast through unknown rather than fake a mark.
  return {
    ...topLevel,
    usermeta: { ...(spec.usermeta as object | undefined), idid },
    layer: [...baseLayers, ...courtesyMarks],
  } as unknown as VegaLiteSpec
}

/** Read provenanced annotations back from a Vega-Lite spec. */
export function readIDIDAnnotations(spec: VegaLiteSpec): PortableAnnotated[] {
  const annotations = readIDID(spec)?.annotations
  return Array.isArray(annotations) ? annotations : []
}

// ── annotation → best-effort Vega-Lite mark ─────────────────────────────────

function stripTopLevel(spec: VegaLiteSpec): VegaLiteSpec {
  // Keep only the view-level fields for a layer entry (drop width/height/title).
  const { mark, encoding, data, transform } = spec as AnyProps
  const entry: AnyProps = {}
  if (mark) entry.mark = mark
  if (encoding) entry.encoding = encoding
  if (data) entry.data = data
  if (transform) entry.transform = transform
  return entry as VegaLiteSpec
}

function annotationToMark(annotation: PortableAnnotated): AnyProps | null {
  const a = annotation as AnyProps
  switch (a.type) {
    case "y-threshold":
      return { mark: "rule", encoding: { y: { datum: a.value } } }
    case "x-threshold":
      return { mark: "rule", encoding: { x: { datum: a.value } } }
    case "callout":
    case "label":
    case "text":
      if (typeof a.label === "string") {
        return { mark: { type: "text", text: a.label } }
      }
      return null
    default:
      return null
  }
}
