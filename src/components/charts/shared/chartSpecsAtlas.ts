import { PROP_BAGS, type ChartPropSpec, type ChartSpec } from "./chartSpecCore"

const preparedAtlas: ChartPropSpec = {
  type: "object",
  description:
    "PreparedNetworkAtlas returned by prepareNetworkAtlas(spec, source) from semiotic/atlas/core. Prepare upstream, then serialize the complete admitted artifact; never invent derived indices or revisions.",
  schema: {
    required: [
      "sourceGraphRef",
      "analysisRevision",
      "spec",
      "source",
      "sections",
      "motifs",
      "forest",
      "residualEdges",
      "ports",
      "ledger",
      "completeness",
      "provenance"
    ],
    properties: {
      sourceGraphRef: { type: "string", minLength: 1 },
      analysisRevision: { type: "string", minLength: 1 },
      spec: {
        type: "object",
        required: ["schemaVersion", "dataRevision"],
        properties: {
          schemaVersion: { const: "0.2" },
          dataRevision: { type: "string" }
        }
      },
      source: {
        type: "object",
        required: ["nodes", "edges"],
        properties: { nodes: { type: "array" }, edges: { type: "array" } }
      },
      provenance: {
        type: "object",
        required: ["sourceRevision"],
        properties: { sourceRevision: { type: "string" } }
      },
      ...Object.fromEntries(
        [
          "sections",
          "motifs",
          "forest",
          "residualEdges",
          "ports",
          "ledger",
          "completeness"
        ].map((key) => [key, { type: "object" }])
      )
    }
  }
}

const projection = (
  description: string,
  required: string[]
): ChartPropSpec => ({
  type: "object",
  description,
  schema: {
    required: ["atlas", ...required],
    properties: {
      atlas: { type: "object", ...preparedAtlas.schema },
      order: { type: "array", items: { type: "string" } }
    }
  }
})

// Atlas readers expose only these common props, rather than silently accepting
// unrelated axes, arbitrary data accessors or simulation controls.
const common = Object.fromEntries(
  [
    "width",
    "height",
    "className",
    "title",
    "description",
    "summary",
    "accessibleTable",
    "chartId",
    "onObservation",
    "annotations",
    "frameProps"
  ].map((key) => [key, PROP_BAGS.common[key]])
)
const selection: ChartPropSpec = {
  type: "object",
  description:
    "Canonical local graph selection. A stale revision or relation scope never selects a different graph.",
  schema: {
    required: ["nodeId", "analysisRevision", "relationScopeId"],
    properties: {
      nodeId: { type: "string" },
      analysisRevision: { type: "string" },
      relationScopeId: { const: "directed-admitted" }
    }
  }
}
const linked: Record<string, ChartPropSpec> = {
  linkedHover: {
    type: ["boolean", "string", "object"],
    description: "Link hover by canonical nodeId through LinkedCharts."
  },
  linkedSelection: {
    type: "object",
    schema: {
      required: ["name"],
      additionalProperties: false,
      properties: { name: { type: "string" } }
    }
  },
  onSelectNode: { type: "function", omitFromSchema: true }
}

export const ATLAS_CHART_SPECS: Record<string, ChartSpec> = {
  MotifBraidChart: {
    importPath: "semiotic/atlas",
    docsRoute: "/charts/motif-braid-chart",
    name: "MotifBraidChart",
    category: "network",
    description:
      "Evidence-backed journey reader from semiotic/atlas. Labeled rounded squares mark each depth, shared prefixes split only when paths diverge, and strand widths taper with per-step counts. Motif overlap is not a population partition.",
    required: ["atlas"],
    dataShape: "none",
    dataAccessors: [],
    propBags: [],
    ownProps: {
      ...common,
      atlas: preparedAtlas,
      colorScheme: PROP_BAGS.common.colorScheme,
      linkedHover: linked.linkedHover,
      selection: { type: "object", omitFromSchema: true },
      onClick: PROP_BAGS.common.onClick
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: false,
      supportsSelection: true,
      supportsLinkedHover: true,
      supportsPush: false,
      supportsSSR: true,
      colorModel: "categorical",
      layoutMode: "custom",
      specialFeatures: [
        "network-atlas",
        "prepared-evidence",
        "revision-scoped-selection"
      ]
    }
  },
  DependencyForestChart: {
    importPath: "semiotic/atlas",
    docsRoute: "/charts/dependency-forest-chart",
    name: "DependencyForestChart",
    category: "network",
    description:
      "Dependency X-Ray reader from semiotic/atlas. Distinguishes display backbone, residual original edges and declared-root required paths. Inspect a local matrix and bypass witnesses using semiotic/atlas/core.",
    required: ["forest"],
    dataShape: "none",
    dataAccessors: [],
    propBags: [],
    ownProps: {
      ...common,
      ...linked,
      forest: projection(
        "Complete prepareDependencyForest(atlas) result from semiotic/atlas/core.",
        [
          "order",
          "children",
          "components",
          "requiredChildren",
          "sceneSeeds",
          "forest",
          "residual"
        ]
      ),
      reading: {
        type: "string",
        enum: ["organize", "required-paths"],
        default: "organize"
      },
      selection,
      collapsedNodeIds: {
        type: "array",
        schema: { items: { type: "string" } }
      },
      highlightedEdgeIds: {
        type: "array",
        schema: { items: { type: "string" } }
      },
      colors: {
        type: "object",
        schema: {
          additionalProperties: false,
          properties: {
            backbone: { type: "string" },
            residual: { type: "string" },
            required: { type: "string" }
          }
        }
      }
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: false,
      supportsSelection: true,
      supportsLinkedHover: true,
      supportsPush: false,
      supportsSSR: true,
      colorModel: "categorical",
      layoutMode: "custom",
      specialFeatures: [
        "network-atlas",
        "prepared-evidence",
        "revision-scoped-selection"
      ]
    }
  },
  FlowCircuitChart: {
    importPath: "semiotic/atlas",
    docsRoute: "/charts/flow-circuit-chart",
    name: "FlowCircuitChart",
    category: "physics",
    description:
      "Flow Circuit reader from semiotic/atlas. Renders an admitted aggregate interval tape using fixed apparatus. Observed and modeled editions stay separate; missing measurements remain null. Replay never infers process dynamics from physics.",
    required: ["circuit", "edition", "reading"],
    dataShape: "none",
    dataAccessors: [],
    propBags: [],
    ownProps: {
      ...common,
      ...linked,
      circuit: projection(
        "Complete prepareFlowCircuit(atlas, semantics) result from semiotic/atlas/core.",
        [
          "order",
          "overlapPolicy",
          "modules",
          "matches",
          "backboneEdgeIds",
          "residualEdgeIds"
        ]
      ),
      edition: {
        type: "object",
        description:
          "CircuitEdition validated by admitCircuitEdition(circuit, edition). Null means unmeasured, never zero.",
        schema: {
          required: [
            "id",
            "synthetic",
            "sourceRevision",
            "analysisRevision",
            "kind",
            "label",
            "unit",
            "timing",
            "individualTimings",
            "entries",
            "assumptions",
            "evidenceRefs"
          ],
          properties: {
            id: { type: "string" },
            synthetic: { type: "boolean" },
            sourceRevision: { type: "string" },
            analysisRevision: { type: "string" },
            kind: { enum: ["observed", "modeled"] },
            label: { type: "string" },
            unit: { enum: ["records", "roots", "attempts"] },
            timing: { enum: ["aggregate-intervals", "incomplete"] },
            individualTimings: { const: "unavailable" },
            entries: { type: "array", minItems: 1 },
            assumptions: {
              type: "array",
              minItems: 1,
              items: { type: "string" }
            },
            evidenceRefs: { type: "array" }
          }
        }
      },
      reading: {
        type: "object",
        description:
          "readCircuitEdition(edition, mode, time) result. Must refer to the same edition and analysis revision as circuit.",
        schema: {
          required: [
            "editionId",
            "kind",
            "mode",
            "requestedTime",
            "observedAt",
            "entry",
            "status"
          ],
          properties: {
            editionId: { type: "string" },
            kind: { enum: ["observed", "modeled"] },
            mode: {
              enum: ["observed-snapshot", "observed-replay", "modeled-scenario"]
            },
            requestedTime: { type: "number" },
            observedAt: { type: "number" },
            entry: { type: "object" },
            status: { enum: ["exact", "incomplete"] }
          }
        }
      },
      selection,
      colors: {
        type: "object",
        description:
          "Semantic role overrides: observed, modeled, required, residual."
      },
      particleBudget: {
        type: "number",
        default: 24,
        schema: { minimum: 0, maximum: 200 }
      },
      placementSeed: { type: "number", default: 1 },
      reducedMotion: { type: "boolean", default: false },
      highlightedEdgeIds: {
        type: "array",
        schema: { items: { type: "string" } }
      },
      layoutSelection: { type: "object", omitFromSchema: true }
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: false,
      supportsSelection: true,
      supportsLinkedHover: true,
      supportsPush: false,
      supportsSSR: true,
      colorModel: "categorical",
      layoutMode: "custom",
      specialFeatures: [
        "network-atlas",
        "prepared-evidence",
        "revision-scoped-selection"
      ]
    }
  }
}
