/** Only the full admitted directed relation layer is supported in NA3. */
export type RequiredPathsSpec = {
  roots: string[]
  relationScopeId: "directed-admitted"
}

export type DominatorResult = RequiredPathsSpec & {
  status: "exact" | "incomplete"
  /** null denotes ancestry through the analytical synthetic root, never an edge. */
  immediateDominatorByNode: Record<string, string | null>
  reachableNodeIds: string[]
  unreachableNodeIds: string[]
}

export type StructuralPath = { nodeIds: string[]; edgeIds: string[] }

export type DependencySelection = {
  analysisRevision: string
  relationScopeId: "directed-admitted"
  nodeId: string
}
