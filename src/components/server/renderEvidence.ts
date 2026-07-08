/**
 * Render evidence — machine-readable ground truth about what a server render
 * actually produced, emitted from the same scene the SVG converter walks.
 *
 * The chart-reading literature's consistent failure mode is models
 * hallucinating about what a chart contains — worst of all about what is
 * *absent* from it. Render evidence is the artifact an agent can quote
 * instead of trusting its eyes: did marks render, how many, of what kind,
 * over what domains. It is computed during `renderChartWithEvidence`
 * (`semiotic/server`) and returned alongside the SVG through the MCP
 * `renderChart` tool, so repair loops can react to "this rendered zero data
 * marks" without pixel inspection.
 *
 * Evidence reflects the *rendered scene*, never the input props — that is
 * the point. A config can be valid and still render empty; evidence is how
 * that difference becomes visible to a non-visual caller.
 */

export interface RenderEvidence {
  /** HOC component name as passed to renderChart. */
  component: string
  frameType: "xy" | "ordinal" | "network" | "geo" | "physics"
  /** "ok" when the scene produced data marks; "empty" when it did not. */
  status: "ok" | "empty"
  /** True when zero data marks rendered. */
  empty: boolean
  /** Total data-mark scene nodes (grid/axes/legend chrome never counts). */
  markCount: number
  /** Tally of scene nodes by their scene `type` (point, line, rect, …). */
  markCountByType: Record<string, number>
  /** Outer SVG dimensions. */
  width: number
  height: number
  /** Resolved numeric x-domain (XY frames; time domains in epoch ms). */
  xDomain?: [number, number]
  /** Resolved numeric y/value domain (XY + ordinal frames). */
  yDomain?: [number, number]
  /** Ordinal category domain, in render order. */
  categories?: string[]
  /** Network node / edge counts. */
  nodeCount?: number
  edgeCount?: number
  /** Number of legend entries rendered (when a legend rendered). */
  legendItems?: number
  /** Number of annotations supplied to the render. */
  annotationCount: number
  /** The accessible name the SVG carries (description ?? title ?? generated). */
  ariaLabel: string
  /** Stable warning codes (EMPTY_SCENE, NO_SCALES). */
  warnings: string[]
}

/**
 * Internal mutable slot threaded through the frame renderers. Only
 * `renderChartWithEvidence` allocates one; the public string-returning
 * render APIs pass nothing and pay nothing.
 */
export interface EvidenceSink {
  evidence?: RenderEvidence
}

/** Tally scene nodes by their `type` field. */
export function tallyByType(
  nodes: ReadonlyArray<{ type?: string }>
): { count: number; byType: Record<string, number> } {
  const byType: Record<string, number> = {}
  for (const n of nodes) {
    const t = typeof n?.type === "string" && n.type.length > 0 ? n.type : "node"
    byType[t] = (byType[t] ?? 0) + 1
  }
  return { count: nodes.length, byType }
}

/** Coerce a d3 domain endpoint (number | Date | string) to a finite number, or null. */
function toFiniteNumber(v: unknown): number | null {
  const n = v instanceof Date ? v.getTime() : typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

/** Convert a d3 scale domain to a serializable [number, number], or undefined. */
export function numericDomain(
  domain: ReadonlyArray<unknown> | undefined
): [number, number] | undefined {
  if (!domain || domain.length < 2) return undefined
  const lo = toFiniteNumber(domain[0])
  const hi = toFiniteNumber(domain[domain.length - 1])
  if (lo === null || hi === null) return undefined
  return [lo, hi]
}

interface BuildEvidenceInput {
  frameType: RenderEvidence["frameType"]
  width: number
  height: number
  marks: ReadonlyArray<{ type?: string }>
  /** Frame props type title/description as ReactNode; only string values
   *  contribute to the accessible name (matching what wrapSVG emits as
   *  <title>/<desc> text). */
  title?: unknown
  description?: unknown
  annotations?: unknown
  xDomain?: [number, number]
  yDomain?: [number, number]
  categories?: string[]
  nodeCount?: number
  edgeCount?: number
  legendItems?: number
  extraWarnings?: string[]
}

/** Assemble evidence from a computed scene. Component name is stamped later
 *  by `renderChartWithEvidence`, which knows the HOC-level name. */
export function buildEvidence(input: BuildEvidenceInput): RenderEvidence {
  const { count, byType } = tallyByType(input.marks)
  const empty = count === 0
  const warnings = [...(input.extraWarnings ?? [])]
  if (empty && !warnings.includes("EMPTY_SCENE")) warnings.push("EMPTY_SCENE")
  const annotationCount = Array.isArray(input.annotations)
    ? input.annotations.length
    : 0
  const ariaLabel =
    (typeof input.description === "string" && input.description) ||
    (typeof input.title === "string" && input.title) ||
    `${input.frameType} chart, ${count} marks`
  return {
    component: "", // stamped by renderChartWithEvidence
    frameType: input.frameType,
    status: empty ? "empty" : "ok",
    empty,
    markCount: count,
    markCountByType: byType,
    width: input.width,
    height: input.height,
    ...(input.xDomain ? { xDomain: input.xDomain } : {}),
    ...(input.yDomain ? { yDomain: input.yDomain } : {}),
    ...(input.categories ? { categories: input.categories } : {}),
    ...(input.nodeCount !== undefined ? { nodeCount: input.nodeCount } : {}),
    ...(input.edgeCount !== undefined ? { edgeCount: input.edgeCount } : {}),
    ...(input.legendItems !== undefined ? { legendItems: input.legendItems } : {}),
    annotationCount,
    ariaLabel,
    warnings,
  }
}
