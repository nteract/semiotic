import React, { useRef, useEffect, useState } from "react"
import { StreamXYFrame } from "semiotic"
import theme from "../theme"
import MarkdownText from "../MarkdownText"

function useContainerWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, width]
}

const StreamingMarginalGraphics = () => {
  const chartRef = useRef()
  const indexRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()

  useEffect(() => {
    // Box-Muller transform: pulls a sample from a standard normal so the
    // cloud has a natural Gaussian shape (dense in the middle, thinner
    // tails) instead of the boxy uniform-noise look the previous data
    // generator produced.
    const gauss = () => {
      const u = 1 - Math.random()
      const v = Math.random()
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
    }
    const id = setInterval(() => {
      if (!chartRef.current) return
      // Push three samples per tick — at the configured `windowSize` of
      // 250 the chart keeps ~80 ticks of history (≈ 4s at the 50ms
      // cadence below), enough motion to see the cluster slide while
      // still looking like a populated cloud rather than a sparse
      // trail.
      const i = indexRef.current++
      // Cluster mean drifts on a slow sine so the user can see the
      // distribution moving while the marginals reshape in lockstep.
      const cx = 50 + Math.sin(i * 0.04) * 25
      const cy = 50 + Math.sin(i * 0.04 + Math.PI / 3) * 25
      for (let k = 0; k < 3; k++) {
        const x = cx + gauss() * 8
        // Strong positive correlation between x and y, with a small
        // independent residual so the cloud has visible spread.
        const y = cy + (x - cx) * 0.7 + gauss() * 6
        chartRef.current.push({ time: i * 3 + k, x, y })
      }
    }, 50)
    return () => clearInterval(id)
  }, [])

  return (
    <div>
      <MarkdownText
        text={`
Marginal graphics update live as streaming data arrives. This example pushes bivariate data points via the \`ref.push()\` API. The ridgeline (top) and histogram (right) reflect the current distribution within the sliding window.

The key is combining \`runtimeMode="streaming"\` with \`marginalGraphics\` on a \`StreamXYFrame\`. The marginals are recomputed on every render frame from the current window of data.
`}
      />
      <div
        ref={containerRef}
        style={{
          background: "var(--surface-1)",
          borderRadius: 8,
          padding: 16,
          border: "1px solid var(--surface-3)",
          overflow: "hidden",
        }}
      >
        {containerWidth && (
          <StreamXYFrame
            ref={chartRef}
            chartType="scatter"
            runtimeMode="streaming"
            size={[containerWidth, 400]}
            xAccessor="x"
            yAccessor="y"
            windowSize={250}
            pointStyle={() => ({
              fill: theme[1],
              fillOpacity: 0.7,
              r: 3,
            })}
            enableHover={true}
            showAxes={true}
            xLabel="X Value"
            yLabel="Y Value"
            margin={{ left: 70, right: 70, top: 70, bottom: 60 }}
            marginalGraphics={{
              top: {
                type: "ridgeline",
                fill: theme[3],
                fillOpacity: 0.5,
                stroke: theme[3],
              },
              right: {
                type: "histogram",
                fill: theme[3],
                fillOpacity: 0.5,
              },
            }}
          />
        )}
      </div>
    </div>
  )
}

export default StreamingMarginalGraphics
