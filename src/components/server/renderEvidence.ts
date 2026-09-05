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

import type { SemanticViabilityDiagnostic } from "../ai/chartCapabilityTypes"
import type {
  ArtifactTransferStatus,
  PortableArtifactContract
} from "../artifact/serialization"
import type { ArtifactIdentityBinding } from "../artifact/identity"

export type SemanticViabilityStatus =
  "meaningful" | "degraded" | "degenerate" | "not-assessed"

export interface RenderEvidence {
  /** SHA-256 of the final serialized SVG plus resolved coordinate context, including chart chrome. */
  sceneHash?: string
  /** Version 2 replaces the evidence envelope's legacy mark-count-only hash. */
  sceneHashVersion?: 2
  /** HOC component name as passed to renderChart. */
  component: string
  frameType: "xy" | "ordinal" | "network" | "geo" | "physics" | "value"
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
  /** Number of annotations that actually produced SVG nodes. */
  annotationCount: number
  /** Number of annotation entries supplied by the caller before filtering. */
  annotationInputCount?: number
  /** Requested annotations that did not produce SVG nodes. */
  unrenderedAnnotationCount?: number
  /** Type names for requested annotations that did not produce SVG nodes. */
  unrenderedAnnotationTypes?: string[]
  /** The accessible name the SVG carries (description ?? title ?? generated). */
  ariaLabel: string
  /** Stable warning codes (EMPTY_SCENE, NO_SCALES, UNRENDERED_ANNOTATIONS). */
  warnings: string[]
  /**
   * Whether a capability-owned post-render check found the painted encoding
   * meaningful. Optional for compatibility with externally supplied evidence;
   * `renderChartWithEvidence` always populates it.
   */
  semanticStatus?: SemanticViabilityStatus
  /** Structured chart-family diagnostics supporting `semanticStatus`. */
  semanticDiagnostics?: SemanticViabilityDiagnostic[]
  /**
   * The resolved margin Semiotic actually used — after auto-reservation for a
   * legend, a title, or any other chrome that grows a side beyond the caller's
   * input. This is ground truth for reconstructing the plot rectangle by
   * hand (e.g. a caller hand-drawing an SSR overlay); it is exactly what the
   * emitted SVG's `data-area` group is translated by.
   */
  margin?: { top: number; right: number; bottom: number; left: number }
  /** The plot rectangle after resolving `margin` against the outer `width`/`height`. */
  plot?: { x: number; y: number; width: number; height: number }
  /** Optional interpretation contract carried beside the rendered scene. */
  artifactContract?: PortableArtifactContract
  /** Explicit preservation/version result for `artifactContract`. */
  artifactTransfer?: ArtifactTransferStatus
  /** Whether the attached contract identifies this rendered component/config/data. */
  artifactBinding?: ArtifactIdentityBinding
}

/**
 * Internal mutable slot threaded through the frame renderers. Only
 * `renderChartWithEvidence` allocates one; the public string-returning
 * render APIs pass nothing and pay nothing.
 */
export interface EvidenceSink {
  evidence?: RenderEvidence
}

export interface CompositeEvidenceInput {
  frameType: RenderEvidence["frameType"]
  width: number
  height: number
  parts: ReadonlyArray<RenderEvidence | undefined>
  /** Semantic marks painted directly by the composite rather than a child frame. */
  additionalMarkCountByType?: Readonly<Record<string, number>>
  title?: unknown
  description?: unknown
  categories?: string[]
  nodeCount?: number
  edgeCount?: number
  legendItems?: number
  extraWarnings?: string[]
  /** The primary child domains, when the composition has one primary scene. */
  xDomain?: [number, number]
  yDomain?: [number, number]
}

/**
 * Combine evidence from a chart-owned multi-scene renderer.
 *
 * The aggregation consumes the evidence emitted by each actual child frame
 * plus explicit semantic marks painted by the compositor (for example SPLOM
 * diagonal histograms or ChainReaction task/dependency glyphs). It therefore
 * avoids both expensive synthetic mark arrays and optimistic input-row counts.
 */
export function buildCompositeEvidence(
  input: CompositeEvidenceInput
): RenderEvidence {
  const parts = input.parts.filter(
    (part): part is RenderEvidence => part != null
  )
  const markCountByType: Record<string, number> = {}
  for (const part of parts) {
    for (const [type, count] of Object.entries(part.markCountByType)) {
      markCountByType[type] = (markCountByType[type] ?? 0) + count
    }
  }
  for (const [type, count] of Object.entries(
    input.additionalMarkCountByType ?? {}
  )) {
    if (count > 0) markCountByType[type] = (markCountByType[type] ?? 0) + count
  }
  const markCount = Object.values(markCountByType).reduce(
    (sum, count) => sum + count,
    0
  )
  const empty = markCount === 0
  const warnings = Array.from(
    new Set([
      ...parts.flatMap((part) => part.warnings),
      ...(input.extraWarnings ?? []),
      ...(empty ? ["EMPTY_SCENE"] : [])
    ])
  )
  const ariaLabel =
    (typeof input.description === "string" && input.description) ||
    (typeof input.title === "string" && input.title) ||
    `${input.frameType} chart, ${markCount} marks`

  return {
    component: "",
    frameType: input.frameType,
    status: empty ? "empty" : "ok",
    empty,
    markCount,
    markCountByType,
    width: input.width,
    height: input.height,
    ...(input.xDomain ? { xDomain: input.xDomain } : {}),
    ...(input.yDomain ? { yDomain: input.yDomain } : {}),
    ...(input.categories ? { categories: input.categories } : {}),
    ...(input.nodeCount !== undefined ? { nodeCount: input.nodeCount } : {}),
    ...(input.edgeCount !== undefined ? { edgeCount: input.edgeCount } : {}),
    ...(input.legendItems !== undefined
      ? { legendItems: input.legendItems }
      : {}),
    annotationCount: parts.reduce((sum, part) => sum + part.annotationCount, 0),
    ariaLabel,
    warnings,
    semanticStatus: "not-assessed",
    semanticDiagnostics: []
  }
}

/** Tally scene nodes by their `type` field. */
export function tallyByType(nodes: ReadonlyArray<{ type?: string }>): {
  count: number
  byType: Record<string, number>
} {
  const byType: Record<string, number> = {}
  for (const n of nodes) {
    const t = typeof n?.type === "string" && n.type.length > 0 ? n.type : "node"
    byType[t] = (byType[t] ?? 0) + 1
  }
  return { count: nodes.length, byType }
}

/** Coerce a d3 domain endpoint (number | Date | string) to a finite number, or null. */
function toFiniteNumber(v: unknown): number | null {
  const n =
    v instanceof Date ? v.getTime() : typeof v === "number" ? v : Number(v)
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
  /** Static annotation pass accounting; omitted by callers that have none. */
  annotationRender?: {
    inputCount: number
    renderedCount: number
    unrenderedCount: number
    unrenderedTypes: string[]
  }
  xDomain?: [number, number]
  yDomain?: [number, number]
  categories?: string[]
  nodeCount?: number
  edgeCount?: number
  legendItems?: number
  extraWarnings?: string[]
  /** The resolved margin (after auto-reservation) the caller's frame used. */
  margin?: { top: number; right: number; bottom: number; left: number }
}

/** Assemble evidence from a computed scene. Component name is stamped later
 *  by `renderChartWithEvidence`, which knows the HOC-level name. */
export function buildEvidence(input: BuildEvidenceInput): RenderEvidence {
  const { count, byType } = tallyByType(input.marks)
  const empty = count === 0
  const warnings = [...(input.extraWarnings ?? [])]
  if (empty && !warnings.includes("EMPTY_SCENE")) warnings.push("EMPTY_SCENE")
  if (
    input.annotationRender &&
    input.annotationRender.unrenderedCount > 0 &&
    !warnings.includes("UNRENDERED_ANNOTATIONS")
  ) {
    warnings.push("UNRENDERED_ANNOTATIONS")
  }
  const annotationInputCount = Array.isArray(input.annotations)
    ? input.annotations.length
    : 0
  const annotationCount =
    input.annotationRender?.renderedCount ?? annotationInputCount
  const ariaLabel =
    (typeof input.description === "string" && input.description) ||
    (typeof input.title === "string" && input.title) ||
    `${input.frameType} chart, ${count} marks`
  const margin = input.margin
  const plot = margin
    ? {
        x: margin.left,
        y: margin.top,
        width: input.width - margin.left - margin.right,
        height: input.height - margin.top - margin.bottom
      }
    : undefined
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
    ...(input.legendItems !== undefined
      ? { legendItems: input.legendItems }
      : {}),
    annotationCount,
    ...(input.annotationRender
      ? {
          annotationInputCount: input.annotationRender.inputCount,
          unrenderedAnnotationCount: input.annotationRender.unrenderedCount,
          ...(input.annotationRender.unrenderedTypes.length > 0
            ? {
                unrenderedAnnotationTypes:
                  input.annotationRender.unrenderedTypes
              }
            : {})
        }
      : {}),
    ariaLabel,
    warnings,
    semanticStatus: "not-assessed",
    semanticDiagnostics: [],
    ...(margin ? { margin } : {}),
    ...(plot ? { plot } : {})
  }
}
