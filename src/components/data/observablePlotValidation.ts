import type { ObservablePlotSpec } from "./fromObservablePlot"
import type { PortabilityDiagnostic } from "./portability/result"
import { isRecord, isRecordArray } from "./vegaLiteValidation"

// SSR and browsers must classify paint strings identically. CSS Color named
// colors are stable; no DOM or renderer dependency is needed to recognize them.
const CSS_NAMES = /* @__PURE__ */ new Set(
  /* @__PURE__ */ "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgrey darkgreen darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray grey green greenyellow honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgrey lightgreen lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen transparent currentcolor none".split(
    " "
  )
)

export function isPlotPaint(value: unknown): value is string {
  if (typeof value !== "string") return false
  const color = value.trim().toLowerCase()
  return (
    CSS_NAMES.has(color) ||
    /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/.test(color) ||
    /^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([\d\s.,%+\-/a-z]+\)$/.test(
      color
    )
  )
}

/** Validate shapes before calling the legacy adapter, and report ignored keys. */
export function observablePlotDiagnostics(
  value: unknown
): PortabilityDiagnostic[] {
  const diagnostics: PortabilityDiagnostic[] = []
  const add = (path: string, message: string, invalid = false) =>
    diagnostics.push({
      code: invalid ? "INVALID_PLOT_SPEC" : "UNSUPPORTED_PLOT_SEMANTIC",
      severity: "error",
      path,
      message
    })
  if (!isRecord(value)) {
    add("/", "A Plot spec must be an object.", true)
    return diagnostics
  }
  if (value.marks !== undefined && !isRecordArray(value.marks))
    add("/marks", "marks must be an array.", true)
  if (
    value.data !== undefined &&
    !isRecordArray(value.data)
  )
    add("/data", "data must be an array of row objects.", true)
  for (const key of Object.keys(value)) {
    if (
      ![
        "marks",
        "data",
        "width",
        "height",
        "title",
        "x",
        "y",
        "color",
        "r"
      ].includes(key)
    )
      add(`/${key}`, `Plot ${key} is not translated.`)
  }
  for (const axis of ["x", "y", "color", "r"]) {
    const scale = value[axis]
    if (scale === undefined) continue
    if (!isRecord(scale)) {
      add(`/${axis}`, "A scale must be an object.", true)
      continue
    }
    const allowed =
      axis === "color" ? ["scheme"] : axis === "r" ? [] : ["label", "type"]
    if (
      axis === "color" &&
      scale.scheme !== undefined &&
      !["category10", "set3"].includes(String(scale.scheme))
    )
      add("/color/scheme", "The source color scheme is not preserved exactly.")
    for (const key of Object.keys(scale))
      if (!allowed.includes(key))
        add(`/${axis}/${key}`, `Plot scale ${key} is not translated.`)
  }
  if (Array.isArray(value.marks))
    value.marks.forEach((mark, index) => {
      const path = `/marks/${index}`
      if (
        !isRecord(mark) ||
        typeof mark.type !== "string" ||
        !mark.type.length
      ) {
        add(path, "A mark needs a non-empty type string.", true)
        return
      }
      if (
        mark.data !== undefined &&
        !isRecordArray(mark.data)
      )
        add(`${path}/data`, "Mark data must be an array of row objects.", true)
      for (const key of Object.keys(mark))
        if (!["type", "data", "options"].includes(key))
          add(`${path}/${key}`, `Mark ${key} is not translated.`)
      if (mark.options === undefined) return
      if (!isRecord(mark.options)) {
        add(`${path}/options`, "Mark options must be an object.", true)
        return
      }
      const markType = mark.type.toLowerCase()
      for (const [key, channel] of Object.entries(mark.options)) {
        if (
          ["r"].includes(key) &&
          !["dot", "dotx", "doty", "circle"].includes(markType)
        )
          add(
            `${path}/options/${key}`,
            "Radius is translated only for point marks."
          )
        if (
          ["z", "curve"].includes(key) &&
          !["line", "linex", "liney", "area", "areax", "areay"].includes(
            markType
          )
        )
          add(
            `${path}/options/${key}`,
            `${key} is translated only for line and area marks.`
          )
        if (!["x", "y", "fill", "stroke", "r", "z", "curve"].includes(key))
          add(
            `${path}/options/${key}`,
            `Plot option ${key} or transform must be materialized before import.`
          )
        else if (
          channel !== undefined &&
          typeof channel !== "string" &&
          !(key === "r" && typeof channel === "number")
        )
          add(
            `${path}/options/${key}`,
            "The supported channel must be a field string (or a numeric radius)."
          )
      }
    })
  return diagnostics
}

export function malformedPlotDiagnostics(
  spec: ObservablePlotSpec
): PortabilityDiagnostic[] {
  return observablePlotDiagnostics(spec).filter(
    (d) => d.code === "INVALID_PLOT_SPEC"
  )
}
