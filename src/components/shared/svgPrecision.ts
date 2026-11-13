import { mapSvgAttributes } from "./svgRoot"

const PRECISION_ATTRIBUTES = new Set([
  "d",
  "transform",
  "gradientTransform",
  "patternTransform",
  "points",
  "viewBox",
  "x",
  "y",
  "x1",
  "x2",
  "y1",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "width",
  "height",
  "dx",
  "dy",
  "offset",
  "startOffset",
  "stroke-width",
  "stroke-dasharray",
  "stroke-dashoffset",
  "font-size",
  "letter-spacing"
])
const SVG_NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi

function resolvedPrecision(precision: number | undefined): number | undefined {
  if (!Number.isFinite(precision)) return undefined
  return Math.max(0, Math.min(8, Math.floor(precision as number)))
}

function roundSvgNumber(token: string, precision: number): string {
  const value = Number(token)
  if (!Number.isFinite(value)) return token
  const factor = 10 ** precision
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor
  return String(rounded)
}

/**
 * Round the numeric tokens in an SVG geometry value without changing its
 * token boundaries. Compact path syntax permits adjacent numbers such as
 * `M.4.5`; after rounding those to integers, concatenating `01` would turn a
 * coordinate pair into one number. A whitespace separator is legal in path,
 * transform, and point-list grammars, so retain the original gaps and insert
 * one only where the source deliberately used an implicit numeric boundary.
 */
function roundSvgGeometryValue(
  value: string,
  precision: number,
  linearCount = 0,
  pathData = false
): string {
  const numberPattern = new RegExp(SVG_NUMBER.source, SVG_NUMBER.flags)
  let roundedValue = ""
  let cursor = 0
  let hasPreviousNumber = false
  let match: RegExpExecArray | null
  let index = 0
  let arcCommand = false
  let parameterIndex = 0

  while ((match = numberPattern.exec(value))) {
    const gap = value.slice(cursor, match.index)
    if (pathData && /[a-df-z]/i.test(gap)) {
      arcCommand = /a[^a-df-z]*$/i.test(gap)
      parameterIndex = 0
    }
    // Arc flags consume one character even when adjacent to the next flag
    // or endpoint: A10 10 0 0110 10 means flags 0,1 and endpoint 10,10.
    let token = match[0]
    const arcParameter = parameterIndex++ % 7
    if (arcCommand && (arcParameter === 3 || arcParameter === 4)) {
      token = token[0]
      if (token !== "0" && token !== "1") return value
      numberPattern.lastIndex = match.index + 1
    }
    if (hasPreviousNumber && gap.length === 0) roundedValue += " "
    else roundedValue += gap
    roundedValue += roundSvgNumber(
      token,
      index++ < linearCount ? Math.max(8, precision) : precision
    )
    cursor = match.index + token.length
    hasPreviousNumber = true
  }

  return roundedValue + value.slice(cursor)
}

/** Apply the documented renderChart precision contract to SVG geometry only. */
export function serializeSvgPrecision(svg: string, precision?: number): string {
  const resolved = resolvedPrecision(precision)
  if (resolved === undefined) return svg
  return mapSvgAttributes(svg, (name, value) => {
    if (
      !PRECISION_ATTRIBUTES.has(name) ||
      /\b(?:var|calc|url)\(/i.test(value)
    ) {
      return undefined
    }
    if (
      name === "transform" ||
      name === "gradientTransform" ||
      name === "patternTransform"
    ) {
      return value.replace(
        /(matrix|translate|scale|rotate|skewX|skewY)\(([^)]*)\)/g,
        (_all, operation: string, args: string) => {
          const linearCount =
            operation === "matrix"
              ? 4
              : operation === "scale"
                ? 2
                : operation === "translate"
                  ? 0
                  : 1
          return `${operation}(${roundSvgGeometryValue(args, resolved, linearCount)})`
        }
      )
    }
    const paintPrecision = name.startsWith("stroke-")
      ? Math.max(2, resolved)
      : resolved
    return roundSvgGeometryValue(value, paintPrecision, 0, name === "d")
  })
}
