/**
 * d3-brush overlay for MinimapChart.
 *
 * Kept in its own module so the Minimap HOC can lazy-load d3-brush (and
 * d3-selection/drag/transition) only when the brush surface mounts —
 * matching the StreamXYFrame XYBrushOverlayLazy pattern.
 */
"use client"
import * as React from "react"
import { useRef, useEffect } from "react"
import { brushX, brushY, type D3BrushEvent } from "d3-brush"
import { select } from "d3-selection"
import type { StreamScales } from "../../stream/types"

export interface MinimapBrushOverlayProps {
  width: number
  height: number
  margin: { top: number; right: number; bottom: number; left: number }
  scales: StreamScales | null
  brushDirection: "x" | "y"
  extent: [number, number] | null
  onBrush: (extent: [number, number] | null) => void
}

export function MinimapBrushOverlay({
  width,
  height,
  margin,
  scales,
  brushDirection,
  extent,
  onBrush,
}: MinimapBrushOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const moveBrushRef = useRef<((selection: [number, number] | null) => void) | null>(null)
  const isUpdatingRef = useRef(false)

  const totalWidth = width + margin.left + margin.right
  const totalHeight = height + margin.top + margin.bottom

  useEffect(() => {
    if (!svgRef.current || !scales) return

    const g = select(svgRef.current).select<SVGGElement>(".brush-group")

    const brush = brushDirection === "x"
      ? brushX().extent([[0, 0], [width, height]])
      : brushY().extent([[0, 0], [width, height]])

    brush.on("brush end", (event: D3BrushEvent<SVGElement>) => {
      if (isUpdatingRef.current) return
      if (!event.sourceEvent) return // programmatic — skip

      const sel = event.selection as [number, number] | null
      if (!sel) {
        onBrush(null)
        return
      }

      const scale = brushDirection === "x" ? scales.x : scales.y
      const inv = scale.invert
      if (!inv) return

      const domain: [number, number] = brushDirection === "x"
        ? [inv(sel[0]), inv(sel[1])]
        : [inv(sel[0]), inv(sel[1])]

      onBrush(domain)
    })

    g.call(brush)
    moveBrushRef.current = (selection) => {
      g.call(brush.move, selection)
    }

    g.select(".selection")
      .attr("fill", "steelblue")
      .attr("fill-opacity", 0.2)
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1)

    return () => {
      moveBrushRef.current = null
      brush.on("brush end", null)
    }
  }, [scales, width, height, brushDirection, onBrush])

  useEffect(() => {
    if (!moveBrushRef.current || !scales || !svgRef.current) return
    const scale = brushDirection === "x" ? scales.x : scales.y

    isUpdatingRef.current = true
    if (extent) {
      const pixelExtent: [number, number] = [scale(extent[0]), scale(extent[1])]
      moveBrushRef.current(pixelExtent)
    } else {
      moveBrushRef.current(null)
    }
    isUpdatingRef.current = false
  }, [extent, scales, brushDirection])

  return (
    <svg
      ref={svgRef}
      width={totalWidth}
      height={totalHeight}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "all",
      }}
    >
      <g className="brush-group" transform={`translate(${margin.left},${margin.top})`} />
    </svg>
  )
}
