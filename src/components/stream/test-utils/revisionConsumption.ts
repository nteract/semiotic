import {
  SceneRevisionDiagnostics,
  type SceneRevisionCheck,
} from "../sceneRevisionDiagnostics"
import type { UpdateResult } from "../pipelineUpdateContract"

export interface UnconsumedSceneRevisionProbe {
  diagnostics: SceneRevisionDiagnostics
  initial: SceneRevisionCheck
  later: SceneRevisionCheck
}

/**
 * Assert the contract that a later style/state result cannot conceal scene
 * work that a host has not consumed. Callers finish the probe with
 * `diagnostics.afterCompute(probe.later, false, false)` and assert its warning.
 */
export function assertUnconsumedSceneRevisionSurvivesLaterUpdate(
  initialResult: UpdateResult,
  laterResult: UpdateResult,
  hostName = "scene host",
): UnconsumedSceneRevisionProbe {
  const diagnostics = new SceneRevisionDiagnostics(hostName)
  const initial = diagnostics.beforeCompute(initialResult, false)
  if (!initial.sawSignals || !initial.wasUnconsumed) {
    throw new Error("Expected the initial result to contain an unconsumed scene revision")
  }

  const later = diagnostics.beforeCompute(laterResult, false)
  if (later.sawSignals || !later.wasUnconsumed || !later.warnUnconsumed) {
    throw new Error("A later non-scene update concealed an unconsumed scene revision")
  }

  return { diagnostics, initial, later }
}
