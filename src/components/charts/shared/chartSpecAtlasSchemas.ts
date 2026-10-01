/** Structural wire contracts for prepared Atlas artifacts (see recipes/atlas/types).
 * Graph identity, coverage and evidence admission remain the core preparers' job.
 */
type Schema = Readonly<Record<string, unknown>>

const object = (
  required: Record<string, Schema>,
  optional: Record<string, Schema> = {}
): Schema => ({
  type: "object",
  required: Object.keys(required),
  properties: { ...required, ...optional }
})
const array = (items: Schema): Schema => ({ type: "array", items })
const dictionary = (values: Schema): Schema => ({
  type: "object",
  additionalProperties: values
})
const text = { type: "string" }
const number = { type: "number" }
const boolean = { type: "boolean" }
const strings = /* @__PURE__ */ array(text)
const nullableNumber = { type: ["number", "null"], minimum: 0 }
const evidenceStatus = { enum: ["exact", "estimated", "unknown", "incomplete"] }
const completenessStatus = {
  enum: ["known", "unknown", "incomplete", "truncated", "unsupported-template"]
}
const countUnit = { enum: ["entity", "occurrence", "embedding", "work-item"] }
const unitKind = { enum: ["stock", "rate", "capacity"] }
const circuitUnit = { enum: ["records", "roots", "attempts"] }
const editionKind = { enum: ["observed", "modeled"] }
const motifTemplate = {
  enum: [
    "serial-chain",
    "repeated-state-episode",
    "fan-out",
    "fan-in",
    "split-rejoin-diamond",
    "shared-upstream-source",
    "connector-bypass"
  ]
}
const roles = /* @__PURE__ */ dictionary({ anyOf: [text, strings] })
const node = /* @__PURE__ */ object(
  { id: text },
  {
    sectionId: text,
    completeness: completenessStatus
  }
)
const edge = /* @__PURE__ */ object({ id: text, source: text, target: text })
const sceneSeeds = /* @__PURE__ */ object({ nodes: /* @__PURE__ */ array(node), edges: /* @__PURE__ */ array(edge) })
const requiredPathsSpec = /* @__PURE__ */ object({
  roots: strings,
  relationScopeId: { const: "directed-admitted" }
})
const forest = /* @__PURE__ */ object({
  kind: { const: "rooted-backbone" },
  roots: strings,
  rankingPolicyId: text,
  backboneEdgeIds: strings,
  primaryParentEdgeIdByNode: /* @__PURE__ */ dictionary(text)
})
const residual = /* @__PURE__ */ object({ residualEdgeIds: strings, originalEdgeIds: strings })
const match = /* @__PURE__ */ object(
  {
    id: text,
    template: motifTemplate,
    roles,
    nodePath: strings,
    edgeIds: strings,
    intersectSectionIds: strings,
    entityIds: strings,
    entityWeights: /* @__PURE__ */ dictionary(number),
    entityCount: number,
    flags: /* @__PURE__ */ object({
      occurrence: boolean,
      temporal: boolean,
      trajectorySupported: boolean,
      enriched: boolean
    })
  },
  {
    startSectionId: text,
    completionSectionId: text,
    truncation: /* @__PURE__ */ object({
      disclosed: { const: true },
      omitted: number,
      fullCount: number
    })
  }
)

export const preparedAtlasSchema = /* @__PURE__ */ object(
  {
    sourceGraphRef: { type: "string", minLength: 1 },
    analysisRevision: { type: "string", minLength: 1 },
    spec: /* @__PURE__ */ object(
      {
        schemaVersion: { const: "0.2" },
        dataRevision: text,
        coordinate: {
          oneOf: [
            /* @__PURE__ */ object({ kind: { const: "ordinal" }, sectionIds: strings }),
            /* @__PURE__ */ object({ kind: { const: "numeric" }, field: text, unit: text })
          ]
        },
        relations: /* @__PURE__ */ object({
          directed: { const: true },
          edgeIdRequired: { const: true },
          parallelEdges: { const: "keep-by-id" },
          selfLoops: { const: "keep-by-id" }
        }),
        evidencePolicyId: text,
        measures: /* @__PURE__ */ dictionary(
          /* @__PURE__ */ object(
            { unitKind, countUnit },
            {
              timeDenominator: text,
              description: text
            }
          )
        ),
        motifs: /* @__PURE__ */ object(
          {
            catalogId: text,
            catalogVersion: text,
            countUnit,
            anchor: { const: "completion" }
          },
          { denominatorRef: text, timeWindowMs: number, matchBudget: number }
        ),
        forest: /* @__PURE__ */ object(
          {
            display: {
              oneOf: [
                /* @__PURE__ */ object({
                  kind: { const: "rooted-backbone" },
                  roots: strings,
                  rankingPolicyId: text
                }),
                /* @__PURE__ */ object(
                  { kind: { const: "observed-prefix" } },
                  {
                    roots: strings,
                    rankingPolicyId: text,
                    referencePartition: text
                  }
                )
              ]
            }
          },
          { requiredPaths: requiredPathsSpec }
        ),
        temporal: {
          oneOf: [
            /* @__PURE__ */ object({ kind: { const: "snapshot" } }),
            /* @__PURE__ */ object({ kind: { const: "window" }, start: number, end: number })
          ]
        }
      },
      {
        comparison: /* @__PURE__ */ object(
          { partitions: strings, denominatorMeasureId: text },
          {
            referencePartition: text
          }
        )
      }
    ),
    source: /* @__PURE__ */ object(
      {
        graphRef: text,
        revision: text,
        nodes: /* @__PURE__ */ array(node),
        edges: /* @__PURE__ */ array(edge),
        measureValues: /* @__PURE__ */ array(
          /* @__PURE__ */ object({
            measureId: text,
            subjectId: text,
            value: number,
            status: evidenceStatus
          })
        )
      },
      {
        occurrences: /* @__PURE__ */ array(
          /* @__PURE__ */ object(
            {
              id: text,
              entityId: text,
              nodePath: strings,
              complete: boolean
            },
            {
              entityCount: number,
              stepEntityCounts: /* @__PURE__ */ array(number),
              missingPrehistory: boolean,
              partition: text,
              groupKeys: /* @__PURE__ */ dictionary(text)
            }
          )
        )
      }
    ),
    sections: /* @__PURE__ */ object({
      kind: { const: "ordinal" },
      sectionIds: strings,
      nodeIdsBySection: /* @__PURE__ */ dictionary(strings)
    }),
    motifs: /* @__PURE__ */ object({
      catalogId: text,
      catalogVersion: text,
      matches: /* @__PURE__ */ array(match),
      incompleteCandidates: /* @__PURE__ */ array(
        /* @__PURE__ */ object({
          template: motifTemplate,
          occurrenceId: text,
          reason: { const: "missing-prehistory" }
        })
      ),
      unsupportedTemplates: /* @__PURE__ */ array(motifTemplate)
    }),
    forest,
    residualEdges: residual,
    ports: /* @__PURE__ */ object({
      hops: /* @__PURE__ */ array(
        /* @__PURE__ */ object({ from: text, to: text, occurrenceIds: strings }, { via: text })
      ),
      graphAdjacency: /* @__PURE__ */ array(
        /* @__PURE__ */ object({ source: text, target: text, edgeId: text })
      )
    }),
    ledger: /* @__PURE__ */ object({
      entries: /* @__PURE__ */ array(
        /* @__PURE__ */ object(
          {
            measureId: text,
            subjectId: text,
            subjectKind: { enum: ["node", "section", "global"] },
            value: number,
            status: evidenceStatus,
            unitKind,
            countUnit
          },
          { timeDenominator: text }
        )
      )
    }),
    completeness: /* @__PURE__ */ object(
      {
        nodes: /* @__PURE__ */ dictionary(completenessStatus),
        motifs: /* @__PURE__ */ dictionary(completenessStatus),
        traces: completenessStatus
      },
      {
        truncation: /* @__PURE__ */ object({
          disclosed: { const: true },
          template: motifTemplate,
          omitted: number
        })
      }
    ),
    provenance: /* @__PURE__ */ object({
      sourceRevision: text,
      analysisRevision: text,
      generation: number,
      relationScope: text,
      motifCatalogVersion: text,
      coordinatePolicy: text,
      forestRoots: strings,
      rankingPolicyId: text,
      population: countUnit,
      temporalHorizon: text,
      evidencePolicyId: text
    })
  },
  {
    prefixForest: /* @__PURE__ */ object(
      {
        kind: { const: "observed-prefix" },
        rootIds: strings,
        order: strings,
        nodes: /* @__PURE__ */ array(
          /* @__PURE__ */ object({
            id: text,
            stateId: text,
            prefix: strings,
            parentId: { type: ["string", "null"] },
            childIds: strings,
            entityCount: number,
            occurrenceIds: strings,
            partitionCounts: /* @__PURE__ */ dictionary(number)
          })
        )
      },
      { referencePartition: text }
    ),
    comparison: /* @__PURE__ */ object(
      {
        partitions: strings,
        denominatorMeasureId: text,
        rows: /* @__PURE__ */ array(
          /* @__PURE__ */ object({
            partition: text,
            assigned: number,
            motifUsers: /* @__PURE__ */ dictionary(number),
            outcomes: /* @__PURE__ */ dictionary(number)
          })
        )
      },
      { referencePartition: text }
    ),
    requiredPaths: /* @__PURE__ */ object({
      roots: strings,
      relationScopeId: { const: "directed-admitted" },
      status: { enum: ["exact", "incomplete"] },
      immediateDominatorByNode: /* @__PURE__ */ dictionary({ type: ["string", "null"] }),
      reachableNodeIds: strings,
      unreachableNodeIds: strings
    })
  }
)

export const dependencyProjectionSchema = /* @__PURE__ */ object({
  atlas: preparedAtlasSchema,
  order: strings,
  children: /* @__PURE__ */ dictionary(strings),
  components: /* @__PURE__ */ array(strings),
  requiredChildren: /* @__PURE__ */ dictionary(strings),
  sceneSeeds,
  forest,
  residual
})

export const circuitProjectionSchema = /* @__PURE__ */ object({
  atlas: preparedAtlasSchema,
  order: strings,
  overlapPolicy: { const: "role-priority:id-asc" },
  modules: /* @__PURE__ */ array(
    /* @__PURE__ */ object(
      {
        id: text,
        nodeId: text,
        kind: {
          enum: [
            "stage",
            "distributor",
            "queue",
            "retry",
            "join-all",
            "selector",
            "dependency",
            "junction"
          ]
        },
        semantics: /* @__PURE__ */ object(
          { nodeId: text, label: text, unit: circuitUnit },
          {
            routing: text,
            queueDiscipline: { const: "fifo" },
            retryPolicy: text,
            join: /* @__PURE__ */ object({
              kind: { enum: ["all", "first-success"] },
              memberNodeIds: strings
            }),
            dependencyNodeIds: strings
          }
        ),
        relatedMatchIds: strings,
        roles,
        ports: /* @__PURE__ */ array(
          /* @__PURE__ */ object({
            edgeId: text,
            direction: { enum: ["in", "out"] },
            endpointId: text
          })
        )
      },
      { selectedMatchId: text }
    )
  ),
  matches: /* @__PURE__ */ array(match),
  backboneEdgeIds: strings,
  residualEdgeIds: strings
})

const nodeMeasurements = {
  arrivals: nullableNumber,
  completions: nullableNumber,
  capacity: nullableNumber,
  queued: nullableNumber
}
const tapeEntry = /* @__PURE__ */ object({
  id: { type: "string", minLength: 1 },
  at: { type: "number", minimum: 0 },
  nodes: /* @__PURE__ */ dictionary(/* @__PURE__ */ object({ ...nodeMeasurements, status: evidenceStatus })),
  flows: /* @__PURE__ */ array(
    /* @__PURE__ */ object({ edgeId: text, perSecond: nullableNumber, unit: circuitUnit })
  ),
  totals: /* @__PURE__ */ object({
    ...nodeMeasurements,
    roots: nullableNumber,
    attempts: nullableNumber,
    retries: nullableNumber,
    successes: nullableNumber,
    errors: nullableNumber
  })
})

export const circuitEditionSchema = /* @__PURE__ */ object(
  {
    id: { type: "string", minLength: 1 },
    synthetic: boolean,
    sourceRevision: text,
    analysisRevision: text,
    kind: editionKind,
    label: text,
    unit: circuitUnit,
    timing: { enum: ["aggregate-intervals", "incomplete"] },
    individualTimings: { const: "unavailable" },
    entries: { .../* @__PURE__ */ array(tapeEntry), minItems: 1 },
    assumptions: { ...strings, minItems: 1 },
    evidenceRefs: strings
  },
  {
    model: /* @__PURE__ */ object({
      id: text,
      observedEditionId: text,
      assumptions: /* @__PURE__ */ dictionary({ type: ["number", "string"] }),
      guardrails: {
        .../* @__PURE__ */ array(
          /* @__PURE__ */ object({
            label: text,
            status: { enum: ["pass", "fail", "unverified"] },
            detail: text
          })
        ),
        minItems: 1
      }
    })
  }
)

export const circuitReadingSchema = /* @__PURE__ */ object({
  editionId: text,
  kind: editionKind,
  mode: { enum: ["observed-snapshot", "observed-replay", "modeled-scenario"] },
  requestedTime: number,
  observedAt: number,
  entry: tapeEntry,
  status: { enum: ["exact", "incomplete"] }
})
