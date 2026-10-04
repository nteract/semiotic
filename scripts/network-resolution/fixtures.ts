import { prepareNetworkAtlas } from "../../src/components/recipes/atlas/prepare"
import type {
  AtlasOccurrence,
  NetworkAtlasSource,
  NetworkAtlasSpec
} from "../../src/components/recipes/atlas/types"
import { prepareNetworkResolution } from "../../src/components/recipes/atlas/resolution/prepare"
import type {
  ResolutionBindings,
  ResolutionSpec
} from "../../src/components/recipes/atlas/resolution/types"

export const spec: ResolutionSpec = {
  schemaVersion: "0.1",
  id: "fixture",
  relationScopeId: "directed-admitted",
  rules: [],
  pins: [],
  limits: {
    maxPages: 12,
    maxCandidates: 10000,
    maxWitnessEdges: 1000,
    maxExploredEdges: 100000
  }
}

export function atlasFor(
  nodes: string[],
  edges: string[][],
  occurrences?: AtlasOccurrence[]
) {
  const source: NetworkAtlasSource = {
    graphRef: "authored-synthetic",
    revision: "fixture-v1",
    nodes: nodes.map((id) => ({ id, sectionId: "s" })),
    edges: edges.map(([id, source, target]) => ({ id, source, target })),
    measureValues: [],
    ...(occurrences !== undefined && { occurrences })
  }
  const atlasSpec: NetworkAtlasSpec = {
    schemaVersion: "0.2",
    coordinate: { kind: "ordinal", sectionIds: ["s"] },
    relations: {
      directed: true,
      edgeIdRequired: true,
      parallelEdges: "keep-by-id",
      selfLoops: "keep-by-id"
    },
    evidencePolicyId: "synthetic-complete",
    measures: {},
    motifs: {
      catalogId: "atlas",
      catalogVersion: "1",
      countUnit: "occurrence",
      anchor: "completion"
    },
    forest: { display: { kind: "observed-prefix" } },
    dataRevision: source.revision,
    temporal: { kind: "snapshot" }
  }
  const result = prepareNetworkAtlas(atlasSpec, source)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.atlas
}

export function resolveFixture(
  nodes: string[],
  edges: string[][],
  overrides: Partial<ResolutionSpec> = {},
  bindings?: ResolutionBindings,
  occurrences?: AtlasOccurrence[]
) {
  const result = prepareNetworkResolution(
    atlasFor(nodes, edges, occurrences),
    { ...spec, ...overrides },
    bindings
  )
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}

// Reconstructed from the supplied F01 description and edge-history ledger.
// These source records were not included in the supplied validation bundle.
export const flagshipNodes = [
  "r",
  "a1",
  "a2",
  "a3",
  "f",
  "l1",
  "l2",
  "l3",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z"
]
export const flagshipEdges = [
  ["e01", "r", "a1"],
  ["e02", "a1", "a2"],
  ["e03", "a2", "a3"],
  ["e04", "a3", "f"],
  ["e05", "f", "l1"],
  ["e06", "f", "l2"],
  ["e07", "f", "l3"],
  ["e08", "f", "u"],
  ["e09", "f", "u"],
  ["e10", "u", "v"],
  ["e11", "v", "w"],
  ["e12", "w", "u"],
  ["e13", "w", "z"],
  ["e14", "r", "x"],
  ["e15", "x", "y"],
  ["e16", "y", "z"],
  ["e17", "r", "z"],
  ["e18", "z", "z"]
]

export const flagshipPartitions = [
  flagshipNodes.map((id) => [id]),
  [
    ["r"],
    ["a1", "a2", "a3"],
    ["f", "l1", "l2", "l3"],
    ["u"],
    ["v"],
    ["w"],
    ["x"],
    ["y"],
    ["z"]
  ],
  [
    ["r"],
    ["a1", "a2", "a3"],
    ["f", "l1", "l2", "l3"],
    ["u", "v", "w"],
    ["x"],
    ["y"],
    ["z"]
  ],
  [
    ["r"],
    ["a1", "a2", "a3", "f", "l1", "l2", "l3"],
    ["u", "v", "w"],
    ["x", "y"],
    ["z"]
  ]
]

export const semanticsFor = (edges: string[][]) =>
  edges.map(([edgeId]) => ({
    edgeId,
    relationClass: "dependency",
    reachabilitySubduingAllowed: true
  }))

export function flagship() {
  return resolveFixture(
    flagshipNodes,
    flagshipEdges,
    {
      rules: [
        { kind: "fold-serial-interiors", version: "1" },
        { kind: "fold-pendant-fans", version: "1", minLeaves: 2 },
        { kind: "contain-scc", version: "1" },
        { kind: "group-authored", version: "1", hierarchyRef: "domains" },
        {
          kind: "annotate-dag-transitivity",
          version: "1",
          semanticPolicyId: "reachability/v1"
        }
      ],
      pageRuleCounts: [2, 1, 1, 1]
    },
    {
      edgeSemantics: semanticsFor(flagshipEdges),
      authoredHierarchies: [
        {
          id: "domains",
          groups: [
            {
              id: "left",
              label: "Left domain",
              sourceNodeIds: ["a1", "a2", "a3", "f", "l1", "l2", "l3"]
            },
            { id: "right", label: "Right domain", sourceNodeIds: ["x", "y"] }
          ]
        }
      ]
    }
  )
}
