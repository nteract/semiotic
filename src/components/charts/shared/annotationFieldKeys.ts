import { levenshtein } from "./stringDistance"
import type { Datum } from "./datumTypes"

/**
 * Field names annotation renderers read (browser rules, the static SVG path,
 * layout, lifecycle, and provenance). Annotations also carry arbitrary data
 * fields as coordinates (`{ type: "label", month: 3, revenue: 1200 }`), so an
 * unknown key is not an error by itself; this list only powers typo
 * suggestions ("fil" → "fill").
 */
export const KNOWN_ANNOTATION_FIELDS = [
  "type", "id", "stableId", "provenance", "lifecycle", "status", "emphasis", "rank", "priority",
  "x", "y", "x0", "x1", "y0", "y1", "dx", "dy", "nx", "ny", "px", "py", "coordinates", "points",
  "pointId", "nodeId", "category", "field", "value", "threshold", "anchor", "position",
  "label", "title", "text", "note", "content", "shortText", "mobileText", "wrap",
  "labelPosition", "labelBackground", "labelColor", "textAnchor", "dominantBaseline",
  "fontSize", "fontWeight", "fontStyle", "fontFamily", "letterSpacing", "titleFontWeight",
  "color", "fill", "fillOpacity", "opacity", "stroke", "strokeWidth", "strokeDasharray", "strokeColor",
  "width", "height", "radius", "radiusPadding", "padding", "layer", "style", "className",
  "connector", "disable", "subject", "bracketType", "endCap", "showBand", "filter",
  "method", "steps", "trainEnd", "bandwidth", "order", "upperAccessor", "lowerAccessor",
  "confidenceAccessor", "bandColor", "bandOpacity", "uncertaintyOpacity",
  "anomalyColor", "anomalyRadius", "anomalyStyle", "cohesion", "depth", "defensive", "gradient"
] as const

const KNOWN = /* @__PURE__ */ new Set<string>(KNOWN_ANNOTATION_FIELDS)

export interface AnnotationFieldTypo {
  /** Position in the annotations array. */
  index: number
  type: string
  key: string
  suggestion: string
}

/** Short keys need a closer match before they read as a typo, not a data field. */
function typoDistanceLimit(key: string): number {
  return key.length <= 5 ? 1 : 2
}

/**
 * Keys on annotation objects that no renderer reads but that sit one or two
 * edits from a field that is read. Keys that name a data field or accessor
 * (annotation coordinates) are never reported.
 */
export function findAnnotationFieldTypos(
  annotations: unknown,
  { dataKeys = [], accessorFields = [] }: { dataKeys?: Iterable<string>; accessorFields?: Iterable<string> } = {}
): AnnotationFieldTypo[] {
  if (!Array.isArray(annotations)) return []
  const coordinateKeys = new Set<string>([...dataKeys, ...accessorFields])
  const typos: AnnotationFieldTypo[] = []
  annotations.forEach((annotation, index) => {
    if (!annotation || typeof annotation !== "object" || Array.isArray(annotation)) return
    for (const key of Object.keys(annotation as Datum)) {
      if (KNOWN.has(key) || coordinateKeys.has(key) || key.startsWith("_") || key.length < 3) continue
      let best: string | undefined
      let bestDistance = typoDistanceLimit(key) + 1
      for (const candidate of KNOWN_ANNOTATION_FIELDS) {
        const distance = levenshtein(key.toLowerCase(), candidate.toLowerCase())
        if (distance < bestDistance) {
          best = candidate
          bestDistance = distance
        }
      }
      // Distance 0 is a case slip (`Fill`); renderers read keys case-sensitively.
      if (!best) continue
      const type = (annotation as Datum).type
      typos.push({ index, type: typeof type === "string" ? type : "", key, suggestion: best })
    }
  })
  return typos
}
