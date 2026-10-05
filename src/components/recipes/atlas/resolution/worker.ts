import type { PreparedNetworkAtlas } from "../types"
import { contentId } from "./identity"
import { prepareNetworkResolution } from "./prepare"
import type {
  PrepareResult,
  PreparedNetworkResolution,
  ResolutionBindings,
  ResolutionSpec
} from "./types"

export interface ResolutionRequestIdentity {
  requestId: string
  generation: number
  baseRevision: string
  sourceRevision: string
  graphRef: string
  specHash: string
  inputHash: string
  evidencePolicyId: string
}
export interface ResolutionWorkerRequest extends ResolutionRequestIdentity {
  kind: "prepare-resolution/v1"
  atlas: PreparedNetworkAtlas
  spec: ResolutionSpec
  bindings: ResolutionBindings
}
export interface ResolutionWorkerResponse extends ResolutionRequestIdentity {
  kind: "prepared-resolution/v1"
  result: PrepareResult
}
export interface ResolutionPublication {
  pending?: ResolutionRequestIdentity
  value?: PreparedNetworkResolution
  generation: number
}

// Bind the complete snapshot, including section order and atlas validation inputs.
function requestInputHash(
  atlas: PreparedNetworkAtlas,
  spec: ResolutionSpec,
  bindings: ResolutionBindings
): string {
  return contentId("request-input", [spec, bindings, atlas])
}

export function createResolutionRequest(
  atlas: PreparedNetworkAtlas,
  spec: ResolutionSpec,
  bindings: ResolutionBindings,
  requestId: string,
  generation: number
): ResolutionWorkerRequest {
  if (!requestId || !Number.isSafeInteger(generation) || generation < 0)
    throw new Error("Invalid request identity")
  return JSON.parse(
    JSON.stringify({
      kind: "prepare-resolution/v1",
      atlas,
      spec,
      bindings,
      requestId,
      generation,
      baseRevision: atlas.analysisRevision,
      sourceRevision: atlas.source.revision,
      graphRef: atlas.source.graphRef,
      specHash: contentId("spec", spec),
      inputHash: requestInputHash(atlas, spec, bindings),
      evidencePolicyId: atlas.spec.evidencePolicyId
    })
  )
}

/** Run in a host worker or upstream process. Synchronous preparation never runs on hover. */
export function handleResolutionRequest(
  request: ResolutionWorkerRequest
): ResolutionWorkerResponse {
  const { atlas, spec, bindings, kind: _kind, ...identity } = request
  if (
    request.kind !== "prepare-resolution/v1" ||
    identity.baseRevision !== atlas.analysisRevision ||
    identity.sourceRevision !== atlas.source.revision ||
    identity.graphRef !== atlas.source.graphRef ||
    identity.evidencePolicyId !== atlas.spec.evidencePolicyId ||
    identity.specHash !== contentId("spec", spec) ||
    identity.inputHash !== requestInputHash(atlas, spec, bindings)
  )
    throw new Error("Incoherent resolution worker request")
  return {
    ...identity,
    kind: "prepared-resolution/v1",
    result: prepareNetworkResolution(atlas, spec, bindings)
  }
}

export function beginResolutionRequest(
  store: ResolutionPublication,
  request: ResolutionWorkerRequest
): boolean {
  if (request.generation <= store.generation) return false
  const {
    atlas: _atlas,
    spec: _spec,
    bindings: _bindings,
    kind: _kind,
    ...identity
  } = request
  store.pending = identity
  store.generation = request.generation
  return true
}

export function cancelResolutionRequest(
  store: ResolutionPublication,
  requestId: string
): void {
  if (store.pending?.requestId === requestId) delete store.pending
}

/** Compare every identity field. Cancellation and supersession retain the last coherent value. */
export function publishResolutionResponse(
  store: ResolutionPublication,
  response: ResolutionWorkerResponse
): boolean {
  if (
    response.kind !== "prepared-resolution/v1" ||
    !store.pending ||
    Object.entries(store.pending).some(
      ([key, value]) =>
        response[key as keyof ResolutionRequestIdentity] !== value
    )
  )
    return false
  if (!response.result.ok) {
    delete store.pending
    return false
  }
  const value = response.result.value
  if (
    value.revision.atlasAnalysisRevision !== response.baseRevision ||
    value.revision.sourceRevision !== response.sourceRevision ||
    value.revision.graphRef !== response.graphRef ||
    value.revision.evidencePolicyId !== response.evidencePolicyId ||
    contentId("spec", value.spec) !== response.specHash
  )
    return false
  store.value = value
  delete store.pending
  return true
}
