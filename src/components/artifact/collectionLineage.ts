import { scopedCorrectionReferences } from "./collectionCorrectionScope"
import type {
  ArtifactCollectionContract,
  ArtifactCollectionLineage,
  ArtifactLineageEdge,
  ArtifactLineageNode,
  ArtifactLineageNodeKind,
  CollectionClaimReference
} from "./collection"

function lineagePart(value: string): string {
  return value.replace(/%|:/g, (character) =>
    character === "%" ? "%25" : "%3A"
  )
}

function lineageId(kind: ArtifactLineageNodeKind, ...parts: string[]): string {
  return `${kind}:${parts.map(lineagePart).join(":")}`
}

/** Build a portable dependency graph from the collection's declared records. */
export function buildArtifactCollectionLineage(
  collection: ArtifactCollectionContract
): ArtifactCollectionLineage {
  const nodes = new Map<string, ArtifactLineageNode>()
  const edges = new Map<string, ArtifactLineageEdge>()
  const sourceNodeIdsBySourceId = new Map<string, Set<string>>()
  const sourceNodeIdsByArtifactAndSourceId = new Map<string, Set<string>>()
  const claimNodesByClaimId = new Map<
    string,
    Array<{ artifactId: string; nodeId: string }>
  >()
  const addNode = (node: ArtifactLineageNode) => nodes.set(node.id, node)
  const addEdge = (edge: ArtifactLineageEdge) =>
    edges.set(JSON.stringify([edge.source, edge.target, edge.relation]), edge)
  const registerSourceNode = (
    sourceId: string,
    nodeId: string,
    artifactId?: string
  ) => {
    const registry = artifactId
      ? sourceNodeIdsByArtifactAndSourceId
      : sourceNodeIdsBySourceId
    const key = artifactId ? JSON.stringify([artifactId, sourceId]) : sourceId
    const nodeIds = registry.get(key) ?? new Set<string>()
    nodeIds.add(nodeId)
    registry.set(key, nodeIds)
  }
  for (const artifact of collection.artifacts) {
    for (const claim of artifact.claims) {
      const nodeId = lineageId("claim", artifact.artifact.id, claim.id)
      claimNodesByClaimId.set(claim.id, [
        ...(claimNodesByClaimId.get(claim.id) ?? []),
        { artifactId: artifact.artifact.id, nodeId }
      ])
    }
  }
  const correctionTargets = new Map<string, CollectionClaimReference[]>()
  for (const correction of collection.corrections ?? []) {
    const affected = scopedCorrectionReferences(
      collection,
      correction,
      "affected"
    )
    for (const replacement of scopedCorrectionReferences(
      collection,
      correction,
      "replacement"
    )) {
      for (const previous of affected) {
        const key = JSON.stringify([
          replacement.artifactId,
          replacement.claimId,
          previous.claimId
        ])
        correctionTargets.set(key, [
          ...(correctionTargets.get(key) ?? []),
          previous
        ])
      }
    }
  }
  for (const source of collection.sourceRegistry ?? []) {
    const sourceNodeId = lineageId("source", source.id)
    addNode({
      id: sourceNodeId,
      kind: "source",
      label: source.label
    })
    registerSourceNode(source.id, sourceNodeId)
  }
  for (const artifact of collection.artifacts) {
    const artifactId = lineageId("artifact", artifact.artifact.id)
    addNode({
      id: artifactId,
      kind: "artifact",
      label: artifact.artifact.title,
      artifactId: artifact.artifact.id
    })
    for (const source of artifact.time?.sources ?? []) {
      const kind: ArtifactLineageNodeKind =
        source.kind === "snapshot" ||
        source.kind === "quality-check" ||
        source.kind === "processing-job"
          ? source.kind
          : "source"
      const sourceId =
        kind === "source"
          ? lineageId(kind, artifact.artifact.id, source.kind, source.id)
          : lineageId(kind, artifact.artifact.id, source.id)
      addNode({
        id: sourceId,
        kind,
        label: source.label,
        artifactId: artifact.artifact.id
      })
      registerSourceNode(source.id, sourceId, artifact.artifact.id)
      addEdge({ source: sourceId, target: artifactId, relation: "produces" })
      if (source.version) {
        const schemaId = lineageId(
          "schema",
          artifact.artifact.id,
          source.kind,
          source.id,
          source.version
        )
        addNode({
          id: schemaId,
          kind: "schema",
          label: source.version,
          artifactId: artifact.artifact.id
        })
        addEdge({ source: schemaId, target: sourceId, relation: "contains" })
      }
    }
    const artifactEvidenceIds = new Set(
      artifact.evidence.map((evidence) => evidence.id)
    )
    for (const evidence of artifact.evidence) {
      const evidenceId = lineageId(
        "evidence",
        artifact.artifact.id,
        evidence.id
      )
      addNode({
        id: evidenceId,
        kind: "evidence",
        label: evidence.label,
        artifactId: artifact.artifact.id
      })
      addEdge({
        source: artifactId,
        target: evidenceId,
        relation: "contains"
      })
      for (const inputId of evidence.transformation?.inputEvidenceIds ?? []) {
        if (!artifactEvidenceIds.has(inputId)) continue
        addEdge({
          source: lineageId("evidence", artifact.artifact.id, inputId),
          target: evidenceId,
          relation: "produces"
        })
      }
    }
    for (const claim of artifact.claims) {
      const claimId = lineageId("claim", artifact.artifact.id, claim.id)
      addNode({
        id: claimId,
        kind: "claim",
        label: claim.text,
        artifactId: artifact.artifact.id
      })
      addEdge({ source: artifactId, target: claimId, relation: "contains" })
      for (const evidenceId of claim.evidenceIds) {
        addEdge({
          source: lineageId("evidence", artifact.artifact.id, evidenceId),
          target: claimId,
          relation: "supports"
        })
      }
      for (const previous of claim.supersedes ?? []) {
        const scopedTargets = correctionTargets.get(
          JSON.stringify([artifact.artifact.id, claim.id, previous])
        )
        const candidates = claimNodesByClaimId.get(previous) ?? []
        const localTargets = candidates.filter(
          (candidate) => candidate.artifactId === artifact.artifact.id
        )
        const targets = scopedTargets
          ? scopedTargets.map((target) => ({
              artifactId: target.artifactId,
              nodeId: lineageId("claim", target.artifactId, target.claimId)
            }))
          : localTargets.length > 0
            ? localTargets
            : candidates.length === 1
              ? candidates
              : []
        for (const target of targets) {
          addEdge({
            source: claimId,
            target: target.nodeId,
            relation: "supersedes"
          })
        }
      }
    }
  }
  for (const dependency of collection.claimDependencies ?? []) {
    const evidenceNodeIds = dependency.evidenceIds
      .map((evidenceId) =>
        lineageId("evidence", dependency.artifactId, evidenceId)
      )
      .filter((nodeId) => nodes.has(nodeId))
    for (const sourceId of dependency.sourceIds ?? []) {
      const sourceNodeIds = new Set([
        ...(sourceNodeIdsBySourceId.get(sourceId) ?? []),
        ...(sourceNodeIdsByArtifactAndSourceId.get(
          JSON.stringify([dependency.artifactId, sourceId])
        ) ?? [])
      ])
      for (const sourceNodeId of sourceNodeIds) {
        for (const evidenceNodeId of evidenceNodeIds) {
          addEdge({
            source: sourceNodeId,
            target: evidenceNodeId,
            relation: "produces"
          })
        }
      }
    }
  }
  for (const correction of collection.corrections ?? []) {
    const affected = scopedCorrectionReferences(
      collection,
      correction,
      "affected"
    )
    const replacements = scopedCorrectionReferences(
      collection,
      correction,
      "replacement"
    )
    for (const replacement of replacements) {
      for (const previous of affected) {
        addEdge({
          source: lineageId(
            "claim",
            replacement.artifactId,
            replacement.claimId
          ),
          target: lineageId("claim", previous.artifactId, previous.claimId),
          relation: "supersedes"
        })
      }
    }
  }
  for (const action of collection.actions ?? []) {
    const actionId = lineageId("action", action.id)
    addNode({ id: actionId, kind: "action", label: action.action })
    for (const claimId of action.claimIds) {
      const candidates = claimNodesByClaimId.get(claimId) ?? []
      const targets = action.artifactId
        ? candidates.filter((target) => target.artifactId === action.artifactId)
        : candidates.length === 1
          ? candidates
          : []
      for (const target of targets) {
        addEdge({
          source: actionId,
          target: target.nodeId,
          relation: "acts-on"
        })
      }
    }
  }
  return {
    nodes: [...nodes.values()].sort((left, right) =>
      left.id < right.id ? -1 : left.id > right.id ? 1 : 0
    ),
    edges: [...edges.values()].sort((left, right) => {
      const leftKey = `${left.source}\0${left.target}\0${left.relation}`
      const rightKey = `${right.source}\0${right.target}\0${right.relation}`
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0
    })
  }
}
