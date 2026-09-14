import { prepareAtlasEvaluation, type AtlasEvaluationResponse } from "./prepare"
import type { AtlasWorkloadOptions } from "../../../../../scripts/network-atlas/workloads"

// Owned by this application: the public pure Core import works in an ordinary
// module worker. No analysis is scheduled from chart hover or animation.
self.onmessage = (event: MessageEvent<{ generation: number; options: AtlasWorkloadOptions }>) => {
  const { generation, options } = event.data
  let response: AtlasEvaluationResponse
  try {
    response = { generation, ok: true, result: prepareAtlasEvaluation(options, generation) }
  } catch (error) {
    response = { generation, ok: false, message: String(error) }
  }
  self.postMessage(response)
}
