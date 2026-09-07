import React, { useEffect, useRef, useState } from "react"
import { LineChart } from "semiotic/xy"
import { BarChart, SwarmPlot } from "semiotic/ordinal"
import { ThemeProvider } from "semiotic/themes/react"
import { collectionChartProps, distributionChartProps, seasonRenderProps } from "./chart-config"
import type { PreparedGuide } from "./types"

export default function GuideCharts({
  guide,
  kind,
}: {
  guide: PreparedGuide
  kind: "season" | "collection" | "distribution"
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(740)
  useEffect(() => {
    if (!ref.current) return
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.max(180, Math.floor(entries[0].contentRect.width))),
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return (
    <ThemeProvider theme="light">
      <div ref={ref} data-testid={`${kind}-chart`}>
        {kind === "distribution" ? (
          <SwarmPlot {...distributionChartProps(guide)} width={width} />
        ) : kind === "season" ? (
          <LineChart {...seasonRenderProps(guide)} width={width} />
        ) : (
          <BarChart {...collectionChartProps(guide)} width={width} />
        )}
      </div>
    </ThemeProvider>
  )
}
