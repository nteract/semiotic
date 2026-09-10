import React, { useCallback, useRef, useState } from "react"
import type { PhysicsPipelineControlSurface, PhysicsPipelineTickResult } from "semiotic/physics"

export const PHYSICS_STORY_SECONDS = 20

/** Stop both animated and reduced-motion runs at the same model-time boundary. */
export function usePhysicsStoryClock(runKey: string, onProgress?: (elapsed: number) => void) {
  const [reading, setReading] = useState({ runKey, elapsed: 0 })
  const progressRef = useRef(onProgress)
  progressRef.current = onProgress
  const lastReading = useRef({ runKey, bucket: -1 })
  const onTick = useCallback(
    (result: PhysicsPipelineTickResult, controls: PhysicsPipelineControlSurface) => {
      const complete = result.elapsedSeconds >= PHYSICS_STORY_SECONDS - 1e-8
      const elapsed = complete ? PHYSICS_STORY_SECONDS : result.elapsedSeconds
      if (complete) controls.pause()
      const bucket = Math.floor(elapsed * 4)
      if (lastReading.current.runKey !== runKey || lastReading.current.bucket !== bucket) {
        lastReading.current = { runKey, bucket }
        setReading({ runKey, elapsed })
        progressRef.current?.(elapsed)
      }
    },
    [runKey],
  )
  return {
    onTick,
    elapsed: reading.runKey === runKey ? reading.elapsed : 0,
  }
}

export function PhysicsStoryClock({ elapsed }: { elapsed: number }) {
  return (
    <div className="physics-story__clock">
      <progress aria-label="Model observation time" value={elapsed} max={PHYSICS_STORY_SECONDS} />
      <output aria-live="off" data-testid="physics-story-clock">
        {elapsed >= PHYSICS_STORY_SECONDS ? "Observation complete" : "Observing"}
        {" · "}
        {elapsed.toFixed(1)} / {PHYSICS_STORY_SECONDS} model seconds
      </output>
    </div>
  )
}
