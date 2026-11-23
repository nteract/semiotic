import { aggregateRows } from "./aggregateRows"
import { fromVegaInterpolation } from "./vegaLiteCurves"
import type { VegaLiteEncoding, VegaLiteSpec } from "./fromVegaLite"
import type { PortabilityDiagnostic } from "./portability/result"

export const compositionKeys = ["hconcat", "vconcat", "concat", "facet", "repeat", "params", "selection"] as const

export function pointOpacityProp(component: string) {
  return component === "BubbleChart" ? "bubbleOpacity" : "pointOpacity"
}

export function isCategory(type?: string): boolean {
  return type === "nominal" || type === "ordinal"
}

export function isHorizontalBar(x?: VegaLiteEncoding, y?: VegaLiteEncoding): boolean {
  return (x?.type === "quantitative" || x?.type === "temporal") && isCategory(y?.type)
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

/** Array iteration visits sparse slots, unlike Array.prototype.some/every. */
export function isRecordArray(value: unknown): value is Record<string, unknown>[] {
  if (!Array.isArray(value)) return false
  for (const row of value) if (!isRecord(row)) return false
  return true
}

export const pointerSegment = (value: string) =>
  value.replace(/~/g, "~0").replace(/\//g, "~1")

/** Vega interprets dots, brackets, and escapes in field references. */
export function hasVegaFieldPath(field: string): boolean {
  return [".", "[", "]", "\\"].some(character => field.includes(character))
}

/** Reject malformed wire inputs before the compatibility translator reads them. */
export function vegaLiteShapeDiagnostics(
  value: unknown
): PortabilityDiagnostic[] {
  const diagnostics: PortabilityDiagnostic[] = []
  const invalid = (path: string, message: string) =>
    diagnostics.push({
      code: "INVALID_SPEC",
      severity: "error",
      path,
      message
    })
  if (!isRecord(value)) {
    invalid("/", "A Vega-Lite spec must be an object.")
    return diagnostics
  }
  if (value.encoding !== undefined) {
    if (!isRecord(value.encoding))
      invalid("/encoding", "encoding must be an object.")
    else
      for (const [channel, encoding] of Object.entries(value.encoding)) {
        const path = `/encoding/${pointerSegment(channel)}`
        if (!isRecord(encoding))
          invalid(
            path,
            "An encoding must be an object."
          )
        else
          for (const key of ["scale", "axis"] as const) {
            if (encoding[key] !== undefined && !isRecord(encoding[key])) {
              invalid(
                `${path}/${key}`,
                `${key} must be an object in the supported subset.`
              )
            }
          }
      }
  }
  if (value.data !== undefined) {
    if (!isRecord(value.data)) invalid("/data", "data must be an object.")
    else if (
      value.data.values !== undefined &&
      !isRecordArray(value.data.values)
    ) {
      invalid("/data/values", "data.values must be an array of row objects.")
      if (
        isRecord(value.encoding) &&
        Object.values(value.encoding).some(
          (enc) => isRecord(enc) && enc.aggregate !== undefined
        )
      )
        diagnostics[diagnostics.length - 1].code = "INVALID_AGGREGATE_DATA"
    }
  }
  for (const key of ["layer", "transform", "params"]) {
    if (value[key] !== undefined && !isRecordArray(value[key]))
      invalid(`/${key}`, `${key} must be an array of objects.`)
  }
  if (Array.isArray(value.layer)) {
    for (let index = 0; index < value.layer.length; index++) {
      const layer = value.layer[index]
      if (!isRecord(layer)) continue
      for (const diagnostic of vegaLiteShapeDiagnostics(layer)) {
        diagnostics.push({ ...diagnostic, path: `/layer/${index}${diagnostic.path === "/" ? "" : diagnostic.path}` })
      }
    }
  }
  return diagnostics
}

/** The strict subset is an allowlist: unhandled semantics cannot silently succeed. */
export function vegaLiteSemanticDiagnostics(
  spec: VegaLiteSpec
): PortabilityDiagnostic[] {
  const diagnostics: PortabilityDiagnostic[] = []
  const unsupported = (path: string) =>
    diagnostics.push({
      code: "UNSUPPORTED_ENCODING",
      severity: "error",
      path,
      message: `${path} has no faithful translation in the supported Vega-Lite subset.`
    })
  const keys = (value: object, allowed: string[], path: string) => {
    for (const key of Object.keys(value))
      if (!allowed.includes(key)) unsupported(`${path}/${pointerSegment(key)}`)
  }
  const mark = typeof spec.mark === "string" ? spec.mark : spec.mark?.type
  const symbol = ["point", "circle", "square"].includes(mark)
  const continuous = symbol || mark === "line" || mark === "area"
  const channels = mark === "arc" ? ["theta", "color"] : ["x", "y", "color"]
  if (symbol) channels.push("size", "opacity")
  keys(
    spec,
    [
      "$schema",
      "mark",
      "data",
      "encoding",
      "width",
      "height",
      "title",
      "usermeta",
      "layer",
      ...compositionKeys,
      "transform"
    ],
    ""
  )
  if (spec.data) keys(spec.data, ["values", "url"], "/data")
  if (typeof spec.title === "object" && spec.title)
    keys(spec.title, ["text"], "/title")
  if (isRecord(spec.mark)) {
    const allowed = ["type"]
    if (mark === "line") allowed.push("interpolate", "point")
    if (mark === "area") allowed.push("interpolate", "opacity")
    if (mark === "arc") allowed.push("innerRadius")
    keys(spec.mark, allowed, "/mark")
    if (mark === "line" && spec.mark.point !== undefined && typeof spec.mark.point !== "boolean") {
      unsupported("/mark/point")
    }
    if (spec.mark.interpolate !== undefined && !fromVegaInterpolation(spec.mark.interpolate))
      unsupported("/mark/interpolate")
  }
  const encoding = spec.encoding ?? {}
  const { x, y, color, theta } = encoding
  if (mark === "arc" && !theta?.field && !theta?.aggregate) unsupported("/encoding/theta")
  if ((mark === "arc" && !color?.field) || (mark === "rect" && !color?.field && !color?.aggregate) ||
      (mark === "bar" && (x?.bin || y?.bin) && color)) unsupported("/encoding/color")
  if (continuous || mark === "rect" || mark === "tick" || (mark === "bar" && !x?.bin && !y?.bin)) {
    for (const axis of ["x", "y"] as const) {
      const channel = encoding[axis]
      if (!channel?.field && !channel?.aggregate) unsupported(`/encoding/${axis}`)
    }
  }
  for (const [binned, measure, channel] of [[x, y, "y"], [y, x, "x"]] as const) {
    if (binned?.bin && measure && measure.aggregate !== "count") unsupported(`/encoding/${channel}`)
  }
  if (mark === "bar" && x && y && !x.bin && !y.bin) {
    const horizontal = isHorizontalBar(x, y)
    const [dimension, measure] = horizontal ? [y, x] : [x, y]
    const dimensionPath = horizontal ? "/encoding/y" : "/encoding/x"
    const path = horizontal ? "/encoding/x" : "/encoding/y"
    if (dimension.type && !isCategory(dimension.type)) unsupported(`${dimensionPath}/type`)
    if (measure.type && measure.type !== "quantitative") unsupported(`${path}/type`)
    if (dimension.stack !== undefined) unsupported(`${dimensionPath}/stack`)
    const overlaid = measure.stack === null || measure.stack === false
    if (color?.field && overlaid) unsupported(`${path}/stack`)
    if (typeof dimension.field === "string" && dimension.field && spec.data?.values) {
      const fields = [dimension.field]
      if (typeof color?.field === "string" && color.field) fields.push(color.field)
      const rows = measure.aggregate ? aggregateRows(spec.data.values, fields, []) : spec.data.values
      const seen = new Set<string>()
      for (const row of rows) {
        const key = JSON.stringify(fields.map(field => String(row[field])))
        if (seen.has(key)) { unsupported(path); break }
        seen.add(key)
      }
    }
  }
  if (mark === "area" && color?.field && x?.aggregate && !y?.aggregate &&
      x.stack === undefined && y?.stack === undefined) unsupported("/encoding/x/stack")
  for (const [channel, enc] of Object.entries(encoding)) {
    const path = `/encoding/${pointerSegment(channel)}`
    if (!channels.includes(channel)) {
      unsupported(path)
      continue
    }
    const allowed = ["field", "type", "aggregate", "scale"]
    if (channel === "x" || channel === "y") allowed.push("axis", "bin", "stack")
    if (channel === "opacity") allowed.push("value")
    keys(enc, allowed, path)
    if (
      enc.field !== undefined &&
      (typeof enc.field !== "string" || !enc.field.length || hasVegaFieldPath(enc.field))
    )
      unsupported(`${path}/field`)
    if (
      enc.type !== undefined &&
      !["quantitative", "nominal", "ordinal", "temporal"].includes(enc.type)
    )
      unsupported(`${path}/type`)
    if (
      channel === "opacity" &&
      (enc.field !== undefined || typeof enc.value !== "number")
    )
      unsupported(path)
    if (enc.type === "temporal" && (!continuous || channel !== "x")) unsupported(`${path}/type`)
    if (
      continuous &&
      (channel === "x" || channel === "y") &&
      isCategory(enc.type)
    )
      unsupported(`${path}/type`)
    if (channel === "color" && (mark === "rect" ? isCategory(enc.type) : enc.type === "quantitative"))
      unsupported(`${path}/type`)
    if (channel === "size" && enc.type !== undefined && enc.type !== "quantitative") unsupported(`${path}/type`)
    if (enc.axis) keys(enc.axis, ["title"], `${path}/axis`)
    if (enc.bin !== undefined && enc.bin !== false) {
      if (mark !== "bar" || channel !== "x") unsupported(`${path}/bin`)
      if (isRecord(enc.bin)) keys(enc.bin, ["maxbins"], `${path}/bin`)
      else if (enc.bin !== true) unsupported(`${path}/bin`)
    }
    if (
      enc.stack !== undefined &&
      ![null, false, true, "zero", "normalize"].includes(enc.stack)
    )
      unsupported(`${path}/stack`)
    if (
      enc.stack !== undefined && (
        !["bar", "area"].includes(mark) ||
        (mark === "area" && channel === "x" && Boolean(enc.stack)) ||
        (enc.stack === "normalize" && (!color?.field || x?.bin || y?.bin))
      )
    ) unsupported(`${path}/stack`)
    if (enc.scale) {
      const scaleKeys =
        channel === "color"
          ? ["scheme", "range"]
          : continuous && channel !== "size"
            ? ["type"]
            : []
      keys(enc.scale, scaleKeys, `${path}/scale`)
      if (
        enc.scale.type !== undefined &&
        !(
          channel === "x"
            ? ["linear", "log", "time"]
            : ["linear", "log", "symlog"]
        ).includes(enc.scale.type)
      )
        unsupported(`${path}/scale/type`)
      if (
        enc.scale.scheme !== undefined &&
        !["category10", "set3"].includes(enc.scale.scheme)
      )
        unsupported(`${path}/scale/scheme`)
      if (channel === "color" && enc.scale.range !== undefined &&
          (!Array.isArray(enc.scale.range) || enc.scale.range.length === 0 ||
           Array.from(enc.scale.range).some(color => typeof color !== "string" || !color.trim()))) {
        unsupported(`${path}/scale/range`)
      }
    }
  }
  return diagnostics
}
