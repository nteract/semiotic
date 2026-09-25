import React, { useEffect, useRef, useState } from "react"
import { ProcessSankey } from "../../dist/network.module.min.js"

export function ProcessTimeFixture() {
  const params = new URLSearchParams(location.search)
  const dates = params.get("time") === "dates"
  const [narrow, setNarrow] = useState(false)
  const [formatted, setFormatted] = useState(false)
  const ref = useRef(null)
  const stamp = (hour) => (dates ? `2026-01-01T${hour}:00` : String(hour))
  useEffect(() => {
    window.__processTimeChart = ref.current
    return () => {
      delete window.__processTimeChart
    }
  }, [])
  return (
    <>
      <button onClick={() => setNarrow(true)}>Resize process</button>
      <button onClick={() => setFormatted(true)}>Use time formatter</button>
      <ProcessSankey
        ref={ref}
        width={narrow ? 420 : 640}
        height={360}
        margin={{ top: 30, right: 40, bottom: 40, left: 40 }}
        domain={[stamp(12), stamp(20)]}
        nodes={[
          { id: "a", label: "Intake", xExtent: [stamp(12), stamp(20)] },
          { id: "b", label: "Treatment", xExtent: [stamp(12), stamp(20)] }
        ]}
        edges={[
          {
            id: "ab",
            source: "a",
            target: "b",
            value: 4,
            startTime: stamp(14),
            endTime: stamp(18)
          }
        ]}
        nodeLabel="label"
        timeFormat={
          formatted
            ? (value) =>
                value instanceof Date
                  ? `date ${value.toISOString()}`
                  : `number ${value}`
            : undefined
        }
        layoutExecution="sync"
      />
    </>
  )
}
