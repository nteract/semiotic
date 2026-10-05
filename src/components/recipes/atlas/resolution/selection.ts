import { sourceSetValues } from "./sets"
import type { CanonicalSelection, PreparedNetworkResolution } from "./types"

/** Explicit adapter to the existing atlas selection store; stale identities never broaden. */
export function resolutionSelectionFields(
  resolution: PreparedNetworkResolution,
  selection: CanonicalSelection
): Record<string, string[]> | null {
  if (
    selection.analysisRevision !== resolution.analysisRevision ||
    selection.revision.sourceRevision !== resolution.revision.sourceRevision ||
    selection.revision.graphRef !== resolution.revision.graphRef ||
    selection.revision.evidencePolicyId !==
      resolution.revision.evidencePolicyId ||
    selection.revision.atlasAnalysisRevision !==
      resolution.revision.atlasAnalysisRevision
  )
    return null
  if (selection.target.kind !== "source-set") return null
  const ref = selection.target.set
  if (ref.domain !== "node" && ref.domain !== "edge") return null
  try {
    return {
      [ref.domain === "node" ? "nodeId" : "edgeId"]: sourceSetValues(
        resolution.sets,
        ref
      )
    }
  } catch {
    return null
  }
}
