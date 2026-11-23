import { idDictionary } from "./ids"
import type {
  NetworkAtlasSource,
  NetworkAtlasSpec,
  SectionIndex
} from "./types"

/** Disjoint ordinal bands from declared stages. Membership is data, not a lens. */
export function buildSections(
  spec: NetworkAtlasSpec,
  source: NetworkAtlasSource
): SectionIndex {
  const sectionIds = spec.coordinate.kind === "ordinal" ? [...spec.coordinate.sectionIds] : []
  const nodeIdsBySection = idDictionary<string[]>()
  for (const sectionId of sectionIds) {
    nodeIdsBySection[sectionId] = []
  }
  for (const node of source.nodes) {
    if (!node.sectionId) continue
    nodeIdsBySection[node.sectionId]?.push(node.id)
  }
  return {
    kind: "ordinal",
    sectionIds,
    nodeIdsBySection
  }
}
