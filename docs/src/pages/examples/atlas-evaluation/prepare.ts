import { prepareNetworkAtlas, prepareDependencyForest } from "semiotic/atlas/core"
import {
  atlasWorkload,
  type AtlasWorkloadOptions,
} from "../../../../../scripts/network-atlas/workloads"
import { atlasAcceptanceFacts } from "../../../../../scripts/network-atlas/acceptance"

export function prepareAtlasEvaluation(options: AtlasWorkloadOptions, generation: number) {
  const fixture = atlasWorkload(options)
  const start = performance.now()
  const result = prepareNetworkAtlas(fixture.spec, fixture.source, { generation })
  if (!result.ok) throw new Error(result.issues.map((issue) => issue.message).join("; "))
  const preparedAt = performance.now()
  const forest = prepareDependencyForest(result.atlas)
  const projectedAt = performance.now()
  return {
    forest,
    groups: fixture.groups,
    facts: atlasAcceptanceFacts(result.atlas),
    timings: { preparationMs: preparedAt - start, projectionMs: projectedAt - preparedAt },
  }
}

export type AtlasEvaluation = ReturnType<typeof prepareAtlasEvaluation>
export type AtlasEvaluationResponse =
  | { generation: number; ok: true; result: AtlasEvaluation }
  | { generation: number; ok: false; message: string }
