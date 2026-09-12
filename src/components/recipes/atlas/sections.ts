import { idDictionary, setOwnValue } from "./ids"
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
  if (spec.coordinate.kind !== "ordinal") {
    return { kind: "ordinal", sectionIds: [], nodeIdsBySection: idDictionary() }
  }
  const nodeIdsBySection = idDictionary<string[]>()
  for (const sectionId of spec.coordinate.sectionIds) {
    setOwnValue(nodeIdsBySection, sectionId, [])
  }
  for (const node of source.nodes) {
    if (!node.sectionId) continue
    const bucket = nodeIdsBySection[node.sectionId]
    if (bucket) bucket.push(node.id)
  }
  return {
    kind: "ordinal",
    sectionIds: [...spec.coordinate.sectionIds],
    nodeIdsBySection
  }
}
