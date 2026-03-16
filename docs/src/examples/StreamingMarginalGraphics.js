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
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        // Simulate a bivariate stream: x drifts with noise, y is correlated + noise
        const x = 50 + Math.sin(i * 0.03) * 30 + (Math.random() - 0.5) * 20
        const y = x * 0.8 + (Math.random() - 0.5) * 25 + 20
        chartRef.current.push({ time: i, x, y })
      }
    }, 80)
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
            windowSize={200}
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
