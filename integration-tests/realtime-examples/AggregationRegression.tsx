import React, { useEffect, useRef, useState } from "react"
import {
  RealtimeLineChart,
  type RealtimeLineChartHandle
} from "semiotic/realtime"

export function AggregationRegression() {
  const ref = useRef<RealtimeLineChartHandle>(null)
  const [result, setResult] = useState("")

  useEffect(() => {
    ref.current?.pushMany([
      { time: 0, value: 1 },
      { time: 2_000_000, value: 2 }
    ])
    ref.current?.flush()
  }, [])

  const run = () => {
    const handle = ref.current!
    handle.clear()
    const cleared = handle.getData().length
    handle.pushMany(
      Array.from({ length: 150_000 }, (_, time) => ({ time, value: 1 }))
    )
    handle.push({ time: 2_000_000, value: 2 })
    const released = handle
      .getData()
      .map(({ count, value }) => ({ count, value }))
    handle.flush()
    setResult(
      JSON.stringify({
        cleared,
        released,
        flushed: handle.getData().map(({ count, value }) => ({ count, value }))
      })
    )
  }

  return (
    <>
      <button onClick={run}>Run 150,000-event batch</button>
      <output data-testid="aggregate-result">{result}</output>
      <RealtimeLineChart
        ref={ref}
        width={500}
        height={250}
        title="Aggregated event-time batches"
        aggregate={{ size: 1_000_000 }}
        eventTime={{ lateness: 1_000_000 }}
      />
    </>
  )
}
