import * as React from "react"
import type { AnnotationContext } from "../../realtime/types"
import type { Datum } from "./datumTypes"
import { applyAnnotationEmphasis, type AnnotationRenderPair } from "./annotationHierarchy"

export type AnnotationRule = (
  annotation: Datum,
  index: number,
  context: AnnotationContext
) => React.ReactNode | null

/**
 * Run the SVG-overlay annotation pass: dispatch each annotation through the
 * user's `svgAnnotationRules` (falling back to the default rules), drop the
 * ones that render nothing, then apply emphasis hierarchy. Shared verbatim by
 * the XY and ordinal overlays so the dispatch/filter/hierarchy logic lives in
 * one place.
 *
 * Falsy-node semantics match the pre-emphasis `.filter(Boolean)` exactly: a
 * rule returning `null`/`undefined` ("skip", e.g. the default rules' out-of-
 * bounds path) — or any other falsy node (`0`/`""`/`false`) — produces no
 * annotation and is dropped. A user rule that returns `null`/`undefined` falls
 * through to the default rule, preserving the existing override contract.
 */
export function renderAnnotationPass(
  annotations: ReadonlyArray<Datum>,
  defaultRule: AnnotationRule,
  userRule: AnnotationRule | undefined,
  context: AnnotationContext
): React.ReactNode[] {
  return renderAnnotationPassWithResult(annotations, defaultRule, userRule, context).nodes
}

/**
 * The same annotation pass as {@link renderAnnotationPass}, with the source
 * annotations that actually produced SVG nodes retained alongside the nodes.
 *
 * Server rendering uses this to report annotation evidence from the rendered
 * scene rather than from the input prop bag. Keeping this at the shared
 * dispatch boundary ensures custom rules, fallback semantics, and hierarchy
 * treatment stay identical in live and static renderers.
 */
export function renderAnnotationPassWithResult(
  annotations: ReadonlyArray<Datum>,
  defaultRule: AnnotationRule,
  userRule: AnnotationRule | undefined,
  context: AnnotationContext
): { nodes: React.ReactNode[]; renderedAnnotations: Datum[] } {
  const pairs: AnnotationRenderPair[] = []
  annotations.forEach((annotation, i) => {
    let node: React.ReactNode
    if (userRule) {
      const userResult = userRule(annotation, i, context)
      node = userResult !== null && userResult !== undefined ? userResult : defaultRule(annotation, i, context)
    } else {
      node = defaultRule(annotation, i, context)
    }
    if (node) pairs.push({ node, annotation })
  })
  return {
    nodes: applyAnnotationEmphasis(pairs),
    renderedAnnotations: pairs.map(pair => pair.annotation),
  }
}
