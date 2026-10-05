import {
  prepareNetworkAtlas,
  prepareDependencyForest,
  prepareFlowCircuit,
  admitCircuitEdition,
  readCircuitEdition,
  type NetworkAtlasSpec,
  type CircuitEdition,
} from "semiotic/atlas/core"
import {
  prepareNetworkResolution,
  type ResolutionSpec,
} from "semiotic/experimental/network-resolution"

export const REVISION = "novel-network-lab-v1"
export const departments = ["Acquisition", "Editing", "Review", "Publication"] as const
const nodeDefinitions = [
  ["Intake", "Acquisition"],
  ["Register", "Acquisition"],
  ["Screen", "Acquisition"],
  ["Editor", "Editing"],
  ["Author", "Editing"],
  ["Archive", "Editing"],
  ["Copy", "Review"],
  ["Proof", "Review"],
  ["Legal", "Review"],
  ["Release", "Publication"],
  ["Print", "Publication"],
  ["Ebook", "Publication"],
  ["Audio", "Publication"],
  ["Delivered", "Publication"],
] as const

export interface Manuscript {
  id: string
  route: string
  nodePath: string[]
  edgeIds: string[]
}
export interface Handoff {
  id: string
  source: string
  target: string
  channel: string
  value: number
  manuscriptIds: string[]
}
const intake = ["Intake", "Register", "Screen", "Editor"]
const routes = [
  {
    name: "Direct print",
    count: 24,
    path: [...intake, "Copy", "Proof", "Release", "Print", "Delivered"],
  },
  {
    name: "Author and proof revision",
    count: 8,
    path: [
      ...intake,
      "Author",
      "Editor",
      "Copy",
      "Proof",
      "Copy",
      "Proof",
      "Release",
      "Ebook",
      "Delivered",
    ],
  },
  {
    name: "Proof revision",
    count: 6,
    path: [...intake, "Copy", "Proof", "Copy", "Proof", "Release", "Print", "Delivered"],
  },
  {
    name: "Legal and audio",
    count: 4,
    path: [
      ...intake,
      "Author",
      "Editor",
      "Author",
      "Editor",
      "Copy",
      "Copy",
      "Proof",
      "Legal",
      "Release",
      "Audio",
      "Delivered",
    ],
  },
  {
    name: "Expedited ebook",
    count: 3,
    path: ["Intake", "Editor", "Copy", "Proof", "Release", "Ebook", "Delivered"],
  },
  { name: "Archived", count: 3, path: [...intake, "Archive"] },
]

/** The event ledger is the only source of every view's topology and weights. */
export function makeLedger() {
  const manuscripts: Manuscript[] = []
  const byEdge = new Map<string, Handoff>()
  for (const route of routes)
    for (let i = 0; i < route.count; i++) {
      const id = `MS-${String(manuscripts.length + 1).padStart(3, "0")}`
      const edgeIds = route.path.slice(1).map((target, step) => {
        const source = route.path[step]
        const channel =
          source === "Copy" && target === "Proof" ? (i % 2 ? "manual" : "automated") : "standard"
        const edgeId = `${source}→${target}:${channel}`
        const edge = byEdge.get(edgeId) ?? {
          id: edgeId,
          source,
          target,
          channel,
          value: 0,
          manuscriptIds: [],
        }
        edge.value++
        edge.manuscriptIds.push(id)
        byEdge.set(edgeId, edge)
        return edgeId
      })
      manuscripts.push({ id, route: route.name, nodePath: [...route.path], edgeIds })
    }
  const edges = [...byEdge.values()]
  const nodes = nodeDefinitions.map(([id, department]) => ({
    id,
    nodeId: id,
    department,
    sectionId: department,
    visits: manuscripts.reduce(
      (sum, book) => sum + book.nodePath.filter((node) => node === id).length,
      0,
    ),
    manuscripts: manuscripts.filter((book) => book.nodePath.includes(id)).length,
    incoming: edges.filter((edge) => edge.target === id).reduce((sum, edge) => sum + edge.value, 0),
    outgoing: edges.filter((edge) => edge.source === id).reduce((sum, edge) => sum + edge.value, 0),
  }))
  return { nodes, edges, manuscripts }
}
export const ledger = makeLedger()
export const totalHandoffs = ledger.edges.reduce((sum, edge) => sum + edge.value, 0)
export const delivered = ledger.manuscripts.filter(
  (book) => book.nodePath.at(-1) === "Delivered",
).length

const atlasSpec: NetworkAtlasSpec = {
  schemaVersion: "0.2",
  dataRevision: REVISION,
  coordinate: { kind: "ordinal", sectionIds: [...departments] },
  relations: {
    directed: true,
    edgeIdRequired: true,
    parallelEdges: "keep-by-id",
    selfLoops: "keep-by-id",
  },
  evidencePolicyId: "complete-synthetic-ledger",
  measures: {},
  motifs: {
    catalogId: "novel-lab",
    catalogVersion: "1",
    countUnit: "entity",
    anchor: "completion",
  },
  forest: {
    display: { kind: "observed-prefix", roots: ["Intake"] },
    requiredPaths: { roots: ["Intake"], relationScopeId: "directed-admitted" },
  },
  temporal: { kind: "snapshot" },
}
// Aggregate identical node sequences into weighted cohorts for the Braid.
// The ledger retains every manuscript and channel-specific edge ID.
export const cohorts = [
  ...new Set(ledger.manuscripts.map((book) => JSON.stringify(book.nodePath))),
].map((signature, index) => {
  const books = ledger.manuscripts.filter((book) => JSON.stringify(book.nodePath) === signature)
  return {
    id: `route-${index + 1}`,
    entityId: `route-${index + 1}`,
    entityCount: books.length,
    nodePath: books[0].nodePath,
    complete: true,
  }
})
const admitted = prepareNetworkAtlas(atlasSpec, {
  graphRef: REVISION,
  revision: REVISION,
  nodes: ledger.nodes.map(({ id, sectionId }) => ({ id, sectionId })),
  edges: ledger.edges.map(({ id, source, target }) => ({ id, source, target })),
  occurrences: cohorts,
  measureValues: [],
})
if (!admitted.ok) throw new Error(JSON.stringify(admitted.issues))
export const atlas = admitted.atlas
export const forest = prepareDependencyForest(atlas)
export const circuit = prepareFlowCircuit(
  atlas,
  ledger.nodes.map((node) => ({ nodeId: node.id, label: node.id, unit: "records" as const })),
)
// Synthetic totals aggregated over one declared day, not a service-time model.
const intervalSeconds = 86400
const circuitEdition: CircuitEdition = {
  id: `${REVISION}:daily-totals`,
  synthetic: true,
  sourceRevision: REVISION,
  analysisRevision: atlas.analysisRevision,
  kind: "observed",
  label: "Synthetic daily handoffs",
  unit: "records",
  timing: "aggregate-intervals",
  individualTimings: "unavailable",
  assumptions: [
    "One synthetic 24-hour ledger. Records count stage visits, so revisions count again.",
    "Capacity and queue stock were not measured. No throughput or waiting-time estimate follows from these totals.",
  ],
  evidenceRefs: [REVISION],
  entries: [
    {
      id: "day-1",
      at: intervalSeconds,
      nodes: Object.fromEntries(
        ledger.nodes.map((node) => [
          node.id,
          {
            // Every visit completes in this synthetic batch. Include entry at
            // Intake and exits at Archive/Delivered, which have no graph edge.
            arrivals: node.visits / intervalSeconds,
            completions: node.visits / intervalSeconds,
            capacity: null,
            queued: null,
            status: "exact" as const,
          },
        ]),
      ),
      flows: ledger.edges.map((edge) => ({
        edgeId: edge.id,
        perSecond: edge.value / intervalSeconds,
        unit: "records" as const,
      })),
      totals: {
        arrivals: 48 / intervalSeconds,
        completions: delivered / intervalSeconds,
        capacity: null,
        queued: null,
        roots: 48,
        attempts: null,
        retries: null,
        successes: delivered,
        errors: null,
      },
    },
  ],
}
export const edition = admitCircuitEdition(circuit, circuitEdition)
export const reading = readCircuitEdition(edition, "observed-snapshot", intervalSeconds)
const resolutionSpec: ResolutionSpec = {
  schemaVersion: "0.1",
  id: REVISION,
  relationScopeId: "directed-admitted",
  rules: [
    { kind: "fold-serial-interiors", version: "1" },
    { kind: "contain-scc", version: "1" },
    { kind: "group-authored", version: "1", hierarchyRef: "departments" },
  ],
  pins: [],
  limits: { maxPages: 8, maxCandidates: 1000, maxWitnessEdges: 100, maxExploredEdges: 10000 },
}
const resolved = prepareNetworkResolution(atlas, resolutionSpec, {
  edgeSemantics: [],
  authoredHierarchies: [
    {
      id: "departments",
      groups: [
        {
          id: "editorial",
          label: "Editorial",
          sourceNodeIds: ["Editor", "Author", "Copy", "Proof", "Legal"],
        },
        { id: "formats", label: "Formats", sourceNodeIds: ["Print", "Ebook", "Audio"] },
      ],
    },
  ],
})
if (!resolved.ok) throw new Error(JSON.stringify(resolved.issues))
export const resolution = resolved.value

export type ViewId =
  "force" | "sankey" | "chord" | "braid" | "forest" | "circuit" | "atlas" | "loom"
export const views: {
  id: ViewId
  name: string
  component: string
  question: string
  strength: string
  limit: string
  encoding: string
  route: string
}[] = [
  {
    id: "force",
    name: "Force directed",
    component: "ForceDirectedGraph",
    question: "Which stages are connected?",
    strength: "Clusters and connections around a selected stage are easy to inspect.",
    limit:
      "Distance is a layout result, not elapsed time or dependency. Parallel records can overlap.",
    encoding:
      "Node radius: manuscript visits. Line width: square-root scaled handoffs. Color: department.",
    route: "force-directed-graph",
  },
  {
    id: "sankey",
    name: "Sankey",
    component: "SankeyDiagram",
    question: "Where is the handoff volume?",
    strength: "Wide ribbons make repeated editing work and the dominant print route prominent.",
    limit:
      "Handoffs are not unique manuscripts. Cycles revisit stages; ribbons alone cannot identify complete journeys.",
    encoding: "Ribbon width: handoffs, including repeat visits. Cycles remain in the graph.",
    route: "sankey-diagram",
  },
  {
    id: "chord",
    name: "Chord",
    component: "ChordDiagram",
    question: "Which pairs exchange the most work?",
    strength: "Large pairwise exchanges stand out around a common circular arrangement.",
    limit:
      "Parallel channels between a pair are aggregated. Ring order is neither chronology nor a journey.",
    encoding: "Ribbon width: combined pairwise handoffs. Direction is available in the ledger.",
    route: "chord-diagram",
  },
  {
    id: "braid",
    name: "Motif Braid",
    component: "MotifBraidChart",
    question: "Which journeys actually occurred?",
    strength:
      "Shared prefixes and repeated stages remain attached to supported manuscript journeys.",
    limit:
      "A state can appear at several steps. Strands group node sequences and do not separate parallel channels.",
    encoding: "Squares: journey steps. Strand width: manuscripts at each step.",
    route: "motif-braid-chart",
  },
  {
    id: "forest",
    name: "Dependency Forest",
    component: "DependencyForestChart",
    question: "Which stages are unavoidable?",
    strength:
      "Required-path structure separates a gateway such as Release from an optional stage such as Legal.",
    limit:
      "A dominator relationship is not necessarily a direct handoff. This is a structural claim from Intake.",
    encoding: "Required-path view from Intake; original edges remain as residual connections.",
    route: "dependency-forest-chart",
  },
  {
    id: "circuit",
    name: "Flow Circuit",
    component: "FlowCircuitChart",
    question: "What operational evidence is available?",
    strength:
      "Stage modules distinguish measured transfers from unmeasured queue stock and capacity.",
    limit:
      "The ledger has no service times, capacity, or queue measurements. The chart cannot establish a bottleneck.",
    encoding:
      "One daily aggregate; pipe rates are handoffs per second. Capacity and queues are unknown.",
    route: "flow-circuit-chart",
  },
  {
    id: "atlas",
    name: "Resolution Atlas",
    component: "ResolutionAtlasChart",
    question: "What changes when stages are grouped?",
    strength:
      "Aligned generations show chains and feedback components becoming groups while preserving original membership.",
    limit:
      "A connection between groups does not prove a path through the group's original endpoints. Inspect the Cutaway.",
    encoding:
      "Rectangles: groups. Hover: corresponding members across generations. Edges retain source IDs.",
    route: "resolution-atlas-chart",
  },
  {
    id: "loom",
    name: "Boundary Loom",
    component: "BoundaryLoomChart",
    question: "Which original edges remain between groups?",
    strength:
      "Separate edge columns preserve the two Copy → Proof channels and expose when an edge becomes internal.",
    limit:
      "Rows and columns make edge identity precise, but a long path requires following several columns.",
    encoding:
      "One column per original edge. Color: internal or boundary on the selected page. History cells: earlier ownership.",
    route: "boundary-loom-chart",
  },
]
export const questions: {
  id: string
  title: string
  node: string
  pair: [ViewId, ViewId]
  finding: string
}[] = [
  {
    id: "volume",
    title: "Volume versus connectivity",
    node: "Copy",
    pair: ["force", "sankey"],
    finding: `${ledger.nodes.find((n) => n.id === "Copy")!.visits} Copy visits come from 45 manuscripts. Repeat work increases handoff volume without adding new manuscripts.`,
  },
  {
    id: "journeys",
    title: "Pairwise links versus journeys",
    node: "Author",
    pair: ["chord", "braid"],
    finding:
      "Twelve manuscripts return to the author; four make two rounds. Pairwise totals alone do not distinguish one long journey from several short ones.",
  },
  {
    id: "gateway",
    title: "Required versus optional stages",
    node: "Release",
    pair: ["forest", "force"],
    finding:
      "All 45 delivered manuscripts pass through Release. Only four use Legal. The admitted graph also requires Release on every path from Intake to Delivered.",
  },
  {
    id: "grouping",
    title: "Grouping versus edge identity",
    node: "Copy",
    pair: ["atlas", "loom"],
    finding:
      "Copy and Proof form a feedback component. Grouping makes that cycle compact; the Loom retains both Copy → Proof channels as separate columns.",
  },
  {
    id: "operations",
    title: "Traffic versus a bottleneck",
    node: "Editor",
    pair: ["sankey", "circuit"],
    finding:
      "A busy stage is not sufficient evidence of a bottleneck. Handoff counts are measured in this synthetic ledger; service capacity and queue stock are absent.",
  },
]
