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
const strings = array(text)
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
const roles = dictionary({ anyOf: [text, strings] })
const node = object(
  { id: text },
  {
    sectionId: text,
    completeness: completenessStatus
  }
)
const edge = object({ id: text, source: text, target: text })
const sceneSeeds = object({ nodes: array(node), edges: array(edge) })
const requiredPathsSpec = object({
  roots: strings,
  relationScopeId: { const: "directed-admitted" }
})
const forest = object({
  kind: { const: "rooted-backbone" },
  roots: strings,
  rankingPolicyId: text,
  backboneEdgeIds: strings,
  primaryParentEdgeIdByNode: dictionary(text)
})
const residual = object({ residualEdgeIds: strings, originalEdgeIds: strings })
const match = object(
  {
    id: text,
    template: motifTemplate,
    roles,
    nodePath: strings,
    edgeIds: strings,
    intersectSectionIds: strings,
    entityIds: strings,
    entityWeights: dictionary(number),
    entityCount: number,
    flags: object({
      occurrence: boolean,
      temporal: boolean,
      trajectorySupported: boolean,
      enriched: boolean
    })
  },
  {
    startSectionId: text,
    completionSectionId: text,
    truncation: object({
      disclosed: { const: true },
      omitted: number,
      fullCount: number
    })
  }
)

export const preparedAtlasSchema = object(
  {
    sourceGraphRef: { type: "string", minLength: 1 },
    analysisRevision: { type: "string", minLength: 1 },
    spec: object(
      {
        schemaVersion: { const: "0.2" },
        dataRevision: text,
        coordinate: {
          oneOf: [
            object({ kind: { const: "ordinal" }, sectionIds: strings }),
            object({ kind: { const: "numeric" }, field: text, unit: text })
          ]
        },
        relations: object({
          directed: { const: true },
          edgeIdRequired: { const: true },
          parallelEdges: { const: "keep-by-id" },
          selfLoops: { const: "keep-by-id" }
        }),
        evidencePolicyId: text,
        measures: dictionary(
          object(
            { unitKind, countUnit },
            {
              timeDenominator: text,
              description: text
            }
          )
        ),
        motifs: object(
          {
            catalogId: text,
            catalogVersion: text,
            countUnit,
            anchor: { const: "completion" }
          },
          { denominatorRef: text, timeWindowMs: number, matchBudget: number }
        ),
        forest: object(
          {
            display: {
              oneOf: [
                object({
                  kind: { const: "rooted-backbone" },
                  roots: strings,
                  rankingPolicyId: text
                }),
                object(
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
            object({ kind: { const: "snapshot" } }),
            object({ kind: { const: "window" }, start: number, end: number })
          ]
        }
      },
      {
        comparison: object(
          { partitions: strings, denominatorMeasureId: text },
          {
            referencePartition: text
          }
        )
      }
    ),
    source: object(
      {
        graphRef: text,
        revision: text,
        nodes: array(node),
        edges: array(edge),
        measureValues: array(
          object({
            measureId: text,
            subjectId: text,
            value: number,
            status: evidenceStatus
          })
        )
      },
      {
        occurrences: array(
          object(
            {
              id: text,
              entityId: text,
              nodePath: strings,
              complete: boolean
            },
            {
              entityCount: number,
              stepEntityCounts: array(number),
              missingPrehistory: boolean,
              partition: text,
              groupKeys: dictionary(text)
            }
          )
        )
      }
    ),
    sections: object({
      kind: { const: "ordinal" },
      sectionIds: strings,
      nodeIdsBySection: dictionary(strings)
    }),
    motifs: object({
      catalogId: text,
      catalogVersion: text,
      matches: array(match),
      incompleteCandidates: array(
        object({
          template: motifTemplate,
          occurrenceId: text,
          reason: { const: "missing-prehistory" }
        })
      ),
      unsupportedTemplates: array(motifTemplate)
    }),
    forest,
    residualEdges: residual,
    ports: object({
      hops: array(
        object({ from: text, to: text, occurrenceIds: strings }, { via: text })
      ),
      graphAdjacency: array(
        object({ source: text, target: text, edgeId: text })
      )
    }),
    ledger: object({
      entries: array(
        object(
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
    completeness: object(
      {
        nodes: dictionary(completenessStatus),
        motifs: dictionary(completenessStatus),
        traces: completenessStatus
      },
      {
        truncation: object({
          disclosed: { const: true },
          template: motifTemplate,
          omitted: number
        })
      }
    ),
    provenance: object({
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
    prefixForest: object(
      {
        kind: { const: "observed-prefix" },
        rootIds: strings,
        order: strings,
        nodes: array(
          object({
            id: text,
            stateId: text,
            prefix: strings,
            parentId: { type: ["string", "null"] },
            childIds: strings,
            entityCount: number,
            occurrenceIds: strings,
            partitionCounts: dictionary(number)
          })
        )
      },
      { referencePartition: text }
    ),
    comparison: object(
      {
        partitions: strings,
        denominatorMeasureId: text,
        rows: array(
          object({
            partition: text,
            assigned: number,
            motifUsers: dictionary(number),
            outcomes: dictionary(number)
          })
        )
      },
      { referencePartition: text }
    ),
    requiredPaths: object({
      roots: strings,
      relationScopeId: { const: "directed-admitted" },
      status: { enum: ["exact", "incomplete"] },
      immediateDominatorByNode: dictionary({ type: ["string", "null"] }),
      reachableNodeIds: strings,
      unreachableNodeIds: strings
    })
  }
)

export const dependencyProjectionSchema = object({
  atlas: preparedAtlasSchema,
  order: strings,
  children: dictionary(strings),
  components: array(strings),
  requiredChildren: dictionary(strings),
  sceneSeeds,
  forest,
  residual
})

export const circuitProjectionSchema = object({
  atlas: preparedAtlasSchema,
  order: strings,
  overlapPolicy: { const: "role-priority:id-asc" },
  modules: array(
    object(
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
        semantics: object(
          { nodeId: text, label: text, unit: circuitUnit },
          {
            routing: text,
            queueDiscipline: { const: "fifo" },
            retryPolicy: text,
            join: object({
              kind: { enum: ["all", "first-success"] },
              memberNodeIds: strings
            }),
            dependencyNodeIds: strings
          }
        ),
        relatedMatchIds: strings,
        roles,
        ports: array(
          object({
            edgeId: text,
            direction: { enum: ["in", "out"] },
            endpointId: text
          })
        )
      },
      { selectedMatchId: text }
    )
  ),
  matches: array(match),
  backboneEdgeIds: strings,
  residualEdgeIds: strings
})

const nodeMeasurements = {
  arrivals: nullableNumber,
  completions: nullableNumber,
  capacity: nullableNumber,
  queued: nullableNumber
}
const tapeEntry = object({
  id: { type: "string", minLength: 1 },
  at: { type: "number", minimum: 0 },
  nodes: dictionary(object({ ...nodeMeasurements, status: evidenceStatus })),
  flows: array(
    object({ edgeId: text, perSecond: nullableNumber, unit: circuitUnit })
  ),
  totals: object({
    ...nodeMeasurements,
    roots: nullableNumber,
    attempts: nullableNumber,
    retries: nullableNumber,
    successes: nullableNumber,
    errors: nullableNumber
  })
})

export const circuitEditionSchema = object(
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
    entries: { ...array(tapeEntry), minItems: 1 },
    assumptions: { ...strings, minItems: 1 },
    evidenceRefs: strings
  },
  {
    model: object({
      id: text,
      observedEditionId: text,
      assumptions: dictionary({ type: ["number", "string"] }),
      guardrails: {
        ...array(
          object({
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

export const circuitReadingSchema = object({
  editionId: text,
  kind: editionKind,
  mode: { enum: ["observed-snapshot", "observed-replay", "modeled-scenario"] },
  requestedTime: number,
  observedAt: number,
  entry: tapeEntry,
  status: { enum: ["exact", "incomplete"] }
})
