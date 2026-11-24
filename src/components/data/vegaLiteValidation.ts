import { coerceDateLikeValue, detectDateAccessor } from "../charts/shared/temporalStrings"
import type { Datum } from "../charts/shared/datumTypes"
import { aggregateRows, isDataField } from "./aggregateRows"
import { fromVegaInterpolation } from "./vegaLiteCurves"
import type { VegaLiteEncoding, VegaLiteSpec } from "./fromVegaLite"
import type { PortabilityDiagnostic } from "./portability/result"

export type VegaLiteImportError = PortabilityDiagnostic & { severity: "error" }

export const compositionKeys = ["hconcat", "vconcat", "concat", "facet", "repeat", "params", "selection"] as const

export function pointOpacityProp(component: string) {
  return component === "BubbleChart" ? "bubbleOpacity" : "pointOpacity"
}

export function isCategory(type?: string): boolean {
  return type === "nominal" || type === "ordinal"
}

export function vegaLiteFieldType(channel?: VegaLiteEncoding) {
  if (channel?.type !== undefined) return channel.type
  const scale = channel?.scale?.type
  if (channel?.aggregate || channel?.bin || scale === "linear" || scale === "log" || scale === "symlog") return "quantitative"
  return scale === "time" || scale === "utc" ? "temporal" : "nominal"
}

export function isHorizontalOrdinal(x?: VegaLiteEncoding, y?: VegaLiteEncoding): boolean {
  return !isCategory(vegaLiteFieldType(x)) && isCategory(vegaLiteFieldType(y))
}

function supportsChannelType(channel: string, type: string, mark: string, continuous: boolean) {
  const quantitative = type === "quantitative"
  if (channel === "color") return mark === "rect" ? quantitative : isCategory(type)
  if (channel === "size" || channel === "theta") return quantitative
  if (channel === "x" || channel === "y") {
    if (continuous) return quantitative || (channel === "x" && type === "temporal")
    if (mark === "rect") return isCategory(type)
  }
  return quantitative || isCategory(type)
}

export function areaStackAxis({ x, y, color }: Record<string, VegaLiteEncoding>) {
  const axis = x?.stack || (!y?.stack && x?.aggregate && !y?.aggregate) ? "x" : "y"
  const [measure, dimension] = axis === "x" ? [x, y] : [y, x]
  if (measure?.stack === false || measure?.stack === null) return
  if ((x?.aggregate || y?.aggregate || color?.aggregate) &&
      (!color?.field || color.aggregate || (color.field === dimension?.field && !dimension.aggregate))) return
  return axis
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
  value: unknown,
  base = ""
): VegaLiteImportError[] {
  const diagnostics: VegaLiteImportError[] = []
  function invalid(relative: string, expected: string, code = "INVALID_SPEC") {
    const path = base + relative || "/"
    diagnostics.push({ code, severity: "error", path, message: `${path} must be ${expected}.` })
  }
  if (!isRecord(value)) {
    invalid("", "an object")
    return diagnostics
  }
  if (value.encoding !== undefined) {
    if (!isRecord(value.encoding))
      invalid("/encoding", "an object")
    else
      for (const [channel, encoding] of Object.entries(value.encoding)) {
        const path = `/encoding/${pointerSegment(channel)}`
        if (!isRecord(encoding)) {
          invalid(path, "an object")
          continue
        }
        if (encoding.field !== undefined && !isDataField(encoding.field)) {
          invalid(`${path}/field`, "a nonempty string")
        }
        if (encoding.type !== undefined && !["quantitative", "ordinal", "temporal", "nominal", "geojson"].includes(encoding.type as string)) {
          invalid(`${path}/type`, "a Vega-Lite field type")
        }
        for (const key of ["scale", "axis"] as const) {
          if (encoding[key] !== undefined && !isRecord(encoding[key])) {
            invalid(`${path}/${key}`, "an object")
          }
        }
      }
  }
  if (value.data !== undefined) {
    if (!isRecord(value.data)) invalid("/data", "an object")
    else if (
      value.data.values !== undefined &&
      !isRecordArray(value.data.values)
    ) {
      const aggregated = isRecord(value.encoding) && Object.values(value.encoding).some(
        enc => isRecord(enc) && enc.aggregate !== undefined
      )
      invalid("/data/values", "an array of row objects", aggregated ? "INVALID_AGGREGATE_DATA" : undefined)
    }
  }
  for (const key of ["layer", "transform", "params"]) {
    if (value[key] !== undefined && !isRecordArray(value[key]))
      invalid(`/${key}`, "an array of objects")
  }
  if (Array.isArray(value.layer)) {
    for (let index = 0; index < value.layer.length; index++) {
      const layer = value.layer[index]
      if (!isRecord(layer)) continue
      for (const error of vegaLiteShapeDiagnostics(layer, `${base}/layer/${index}`)) diagnostics.push(error)
    }
  }
  return diagnostics
}

/** Ordinal frame keys coerce each category to a string. */
export function repeatedCategories(data: Datum[], fields: string[], aggregate = false): boolean {
  const rows = aggregate ? aggregateRows(data, fields, []) : data
  const seen = new Set<string>()
  for (const row of rows) {
    const key = JSON.stringify(fields.map(field => String(row[field])))
    if (seen.has(key)) return true
    seen.add(key)
  }
  return false
}

export function vegaTimeValue(value: unknown): number {
  if (typeof value === "string") return Date.parse(value)
  return value instanceof Date || typeof value === "number" ? Number(value) : NaN
}

export function temporalCoordinateLoss(data: Datum[] | undefined, field: string, base: string, aggregated = false) {
  let readsDates: boolean | undefined
  for (const [index, row] of (data ?? []).entries()) {
    const value = row[field]
    if (typeof value === "number" || typeof value === "string" || value instanceof Date) {
      readsDates ??= detectDateAccessor(value)
      const numeric = Number(value)
      const vegaTime = vegaTimeValue(value)
      const chartTime = readsDates ? coerceDateLikeValue(value) : numeric
      if (Number.isFinite(new Date(vegaTime).getTime()) && (aggregated || chartTime === vegaTime)) continue
    }
    const path = `${base}/${index}/${pointerSegment(field)}`
    return {
      code: "UNSUPPORTED_TEMPORAL_VALUE",
      path,
      message: `${path} cannot retain its time coordinate. Supply epoch milliseconds for all rows.`
    }
  }
}

/** The strict subset is an allowlist: unhandled semantics cannot silently succeed. */
export function vegaLiteSemanticDiagnostics(
  spec: VegaLiteSpec
): VegaLiteImportError[] {
  const diagnostics: VegaLiteImportError[] = []
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
  if (continuous && x?.field && vegaLiteFieldType(x) === "temporal") {
    const loss = temporalCoordinateLoss(spec.data?.values, x.field, "/data/values", x.aggregate !== undefined)
    if (loss) diagnostics.push({ ...loss, severity: "error" })
  }
  if (mark === "arc" && typeof color?.field === "string" && spec.data?.values &&
      repeatedCategories(spec.data.values, [color.field], Boolean(theta?.aggregate))) {
    unsupported("/encoding/color/field")
  }
  if (mark === "arc" && !theta?.field && !theta?.aggregate) unsupported("/encoding/theta")
  if ((mark === "arc" && !color?.field) || (mark === "rect" && !color?.field && !color?.aggregate) ||
      (mark === "bar" && (x?.bin || y?.bin) && color)) unsupported("/encoding/color")
  const ordinal = mark === "tick" || (mark === "bar" && !x?.bin && !y?.bin)
  if (continuous || mark === "rect" || ordinal) {
    for (const axis of ["x", "y"] as const) {
      const channel = encoding[axis]
      if (!channel?.field && !channel?.aggregate) unsupported(`/encoding/${axis}`)
    }
  }
  for (const [binned, measure, channel] of [[x, y, "y"], [y, x, "x"]] as const) {
    if (binned?.bin && measure && measure.aggregate !== "count") unsupported(`/encoding/${channel}`)
  }
  if (ordinal && x && y) {
    const horizontal = isHorizontalOrdinal(x, y)
    const [dimension, measure] = horizontal ? [y, x] : [x, y]
    const dimensionPath = horizontal ? "/encoding/y" : "/encoding/x"
    const path = horizontal ? "/encoding/x" : "/encoding/y"
    if (!isCategory(vegaLiteFieldType(dimension))) unsupported(`${dimensionPath}/type`)
    if (vegaLiteFieldType(measure) !== "quantitative") unsupported(`${path}/type`)
    if (mark === "bar") {
      if (dimension.stack !== undefined) unsupported(`${dimensionPath}/stack`)
      if (color?.field && (measure.stack === null || measure.stack === false)) unsupported(`${path}/stack`)
      if (dimension.field && spec.data?.values) {
        const fields = [dimension.field]
        if (color?.field) fields.push(color.field)
        if (repeatedCategories(spec.data.values, fields, Boolean(measure.aggregate))) unsupported(path)
      }
    }
  }
  if (mark === "area") {
    const axis = areaStackAxis(encoding)
    if (axis === "x" || (axis && !color?.field && x?.field && spec.data?.values &&
        repeatedCategories(spec.data.values, [x.field]))) unsupported(`/encoding/${axis}/stack`)
  }
  for (const [channel, enc] of Object.entries(encoding)) {
    const path = `/encoding/${pointerSegment(channel)}`
    if (!channels.includes(channel)) {
      unsupported(path)
      continue
    }
    const allowed = channel === "opacity" ? ["value"] : ["field", "type", "aggregate", "scale"]
    if (channel === "x" || channel === "y") allowed.push("axis", "bin", "stack")
    keys(enc, allowed, path)
    const fieldType = vegaLiteFieldType(enc)
    if (isCategory(fieldType) && enc.aggregate !== undefined && enc.aggregate !== "count") unsupported(`${path}/aggregate`)
    if (isCategory(fieldType) && enc.field && enc.aggregate === undefined && spec.data?.values &&
        (mark !== "arc" || channel !== "color") && repeatedCategories(spec.data.values, [enc.field], true)) {
      unsupported(`${path}/field`)
    }
    if (enc.field && hasVegaFieldPath(enc.field))
      unsupported(`${path}/field`)
    if (!supportsChannelType(channel, fieldType, mark, continuous)) unsupported(`${path}/type`)
    if (
      channel === "opacity" &&
      (enc.field !== undefined || typeof enc.value !== "number")
    )
      unsupported(path)
    if (enc.axis) keys(enc.axis, ["title"], `${path}/axis`)
    if (enc.bin !== undefined && enc.bin !== false) {
      unsupported(`${path}/bin`)
      if (isRecord(enc.bin)) keys(enc.bin, ["maxbins"], `${path}/bin`)
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
