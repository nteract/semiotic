import { useEffect, useRef, useState } from "react"
import type { AxisLabelAssessment } from "./axisLabelAssessment"

/** Inspect actual tick nodes after paint, including rotation and edge anchoring. */
export function useAxisLabelAssessment(enabled: boolean, revision: unknown) {
  const ref = useRef<SVGSVGElement>(null)
  const [assessment, setAssessment] = useState<AxisLabelAssessment>({
    status: "not-assessed",
    checked: 0,
    unsupported: 0,
    collisions: 0,
    overflows: 0,
    findings: []
  })
  useEffect(() => {
    const svg = ref.current
    if (!enabled || !svg) return
    let active = true
    import("./browserAxisLabelAssessment").then(
      ({ readAxisLabelAssessment }) => {
        if (!active) return
        const next = readAxisLabelAssessment(svg)
        setAssessment((previous) =>
          JSON.stringify(previous) === JSON.stringify(next) ? previous : next
        )
      }
    )
    return () => {
      active = false
    }
  }, [enabled, revision])
  return { ref, assessment }
}
