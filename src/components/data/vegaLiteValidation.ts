import type { VegaLiteSpec } from "./fromVegaLite"
import type { PortabilityDiagnostic } from "./portability/result"

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

/** Array iteration visits sparse slots, unlike Array.prototype.some/every. */
export function isRecordArray(value: unknown): value is Record<string, unknown>[] {
  if (!Array.isArray(value)) return false
  for (const row of value) if (!isRecord(row)) return false
  return true
}

const pointer = (value: string) =>
  value.replace(/~/g, "~0").replace(/\//g, "~1")

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
        if (!isRecord(encoding))
          invalid(
            `/encoding/${pointer(channel)}`,
            "An encoding must be an object."
          )
        else
          for (const key of ["scale", "axis"] as const) {
            if (encoding[key] !== undefined && !isRecord(encoding[key])) {
              invalid(
                `/encoding/${pointer(channel)}/${key}`,
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
  if (
    value.layer !== undefined &&
    !isRecordArray(value.layer)
  ) {
    invalid("/layer", "layer must be an array of spec objects.")
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
      if (!allowed.includes(key)) unsupported(`${path}/${pointer(key)}`)
  }
  const mark = typeof spec.mark === "string" ? spec.mark : spec.mark?.type
  const continuous = ["line", "area", "point", "circle", "square"].includes(
    mark
  )
  const channels = ["x", "y", "color"]
  if (["point", "circle", "square"].includes(mark))
    channels.push("size", "opacity")
  if (mark === "arc") channels.push("theta")
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
      "hconcat",
      "vconcat",
      "concat",
      "facet",
      "repeat",
      "params",
      "selection",
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
    if (
      spec.mark.interpolate !== undefined &&
      ![
        "linear",
        "monotone-x",
        "monotone-y",
        "monotone",
        "step",
        "step-after",
        "step-before",
        "basis",
        "cardinal",
        "catmull-rom"
      ].includes(spec.mark.interpolate)
    )
      unsupported("/mark/interpolate")
  }
  for (const [channel, enc] of Object.entries(spec.encoding || {})) {
    const path = `/encoding/${pointer(channel)}`
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
      (typeof enc.field !== "string" || !enc.field.length)
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
    if (channel === "y" && enc.type === "temporal") unsupported(`${path}/type`)
    if (
      continuous &&
      (channel === "x" || channel === "y") &&
      ["nominal", "ordinal"].includes(enc.type || "")
    )
      unsupported(`${path}/type`)
    if (!continuous && enc.type === "temporal") unsupported(`${path}/type`)
    if (channel === "color" && mark !== "rect" && enc.type === "quantitative")
      unsupported(`${path}/type`)
    if (enc.axis) keys(enc.axis, ["title"], `${path}/axis`)
    if (enc.bin !== undefined && enc.bin !== false) {
      if (mark !== "bar") unsupported(`${path}/bin`)
      if (isRecord(enc.bin)) keys(enc.bin, ["maxbins"], `${path}/bin`)
      else if (enc.bin !== true) unsupported(`${path}/bin`)
    }
    if (
      enc.stack !== undefined &&
      ![null, false, true, "zero", "normalize"].includes(enc.stack)
    )
      unsupported(`${path}/stack`)
    if (enc.stack !== undefined && !["bar", "area"].includes(mark))
      unsupported(`${path}/stack`)
    if (enc.scale) {
      const scaleKeys =
        channel === "color"
          ? ["scheme", "range"]
          : channel === "size"
            ? ["range"]
            : continuous
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
