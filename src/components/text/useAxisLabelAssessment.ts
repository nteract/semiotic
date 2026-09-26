import { useEffect, useRef, useState } from "react"
import type { AxisLabelAssessment } from "./axisLabelAssessment"
import { subscribeToCanvasFontInvalidation } from "../stream/fontLoading"

const notAssessed: AxisLabelAssessment = {
  status: "not-assessed",
  checked: 0,
  unsupported: 0,
  collisions: 0,
  overflows: 0,
  findings: []
}

/** Inspect actual tick nodes after paint, including rotation and edge anchoring. */
export function useAxisLabelAssessment(enabled: boolean, revision: unknown) {
  const ref = useRef<SVGSVGElement>(null)
  const [assessment, setAssessment] = useState(notAssessed)
  useEffect(() => {
    const svg = ref.current
    if (!enabled || !svg) return
    let active = true
    let unsubscribe = () => {}
    import("./browserAxisLabelAssessment").then(
      ({ readAxisLabelAssessment }) => {
        if (!active) return
        const refresh = () => {
          const next = readAxisLabelAssessment(svg)
          setAssessment((previous) =>
            JSON.stringify(previous) === JSON.stringify(next) ? previous : next
          )
        }
        refresh()
        unsubscribe = subscribeToCanvasFontInvalidation(refresh)
      }
    )
    return () => {
      active = false
      unsubscribe()
    }
  }, [enabled, revision])
  return { ref, assessment: enabled ? assessment : notAssessed }
}
