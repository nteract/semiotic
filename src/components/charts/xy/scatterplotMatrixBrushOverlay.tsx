/**
 * Per-cell d3-brush overlay for ScatterplotMatrix.
 * Isolated so the matrix can lazy-load d3-brush only in brush mode.
 */
"use client"
import type { Datum } from "../shared/datumTypes"
import * as React from "react"
import { useRef, useEffect } from "react"
import { brush as d3Brush, type D3BrushEvent } from "d3-brush"
import { select as d3Select } from "d3-selection"
import type { StreamXYFrameHandle } from "../../stream/types"
import { isTwoDimensionalBrushSelection } from "./scatterplotMatrixInteractionTypes"

const CELL_MARGIN = { top: 4, bottom: 4, left: 4, right: 4 }

export interface ScatterplotMatrixBrushOverlayProps {
  frameRef: React.RefObject<StreamXYFrameHandle | null>
  cellSize: number
  onBrush: (extent: [number, number][] | null) => void
}

export function ScatterplotMatrixBrushOverlay({
  frameRef,
  cellSize,
  onBrush,
}: ScatterplotMatrixBrushOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  const chartW = cellSize - CELL_MARGIN.left - CELL_MARGIN.right
  const chartH = cellSize - CELL_MARGIN.top - CELL_MARGIN.bottom

  useEffect(() => {
    if (!svgRef.current) return

    const g = d3Select(svgRef.current).select<SVGGElement>(".brush-g")
    const brush = d3Brush()
      .extent([[0, 0], [chartW, chartH]])
      .on("brush end", (event: D3BrushEvent<Datum>) => {
        const scales = frameRef.current?.getScales()
        if (!scales) return

        if (!isTwoDimensionalBrushSelection(event.selection)) {
          onBrush(null)
          return
        }

        const [[px0, py0], [px1, py1]] = event.selection
        const dataExtent: [number, number][] = [
          [scales.x.invert(px0), scales.y.invert(py0)],
          [scales.x.invert(px1), scales.y.invert(py1)],
        ]
        onBrush(dataExtent)
      })

    g.call(brush)

    g.select(".selection")
      .attr("fill", "steelblue")
      .attr("fill-opacity", 0.15)
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1)

    return () => {
      brush.on("brush end", null)
    }
  }, [chartW, chartH, frameRef, onBrush])

  return (
    <svg
      ref={svgRef}
      width={cellSize}
      height={cellSize}
      style={{ position: "absolute", top: 0, left: 0 }}
    >
      <g className="brush-g" transform={`translate(${CELL_MARGIN.left},${CELL_MARGIN.top})`} />
    </svg>
  )
}
