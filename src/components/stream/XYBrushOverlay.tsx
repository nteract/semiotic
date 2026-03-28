/**
 * XYBrushOverlay — d3-brush SVG overlay for XY frames.
 *
 * Renders a transparent SVG positioned above the canvas. Supports x, y, and
 * xy brush dimensions, bin snapping, and streaming brush tracking (shrinks/
 * clears the brush as data scrolls past the selected range).
 *
 * Key design decisions:
 *   - d3-brush lifecycle depends on [width, height, dimension, snap, binSize]
 *     only — scales are read from a ref to avoid teardown mid-drag.
 *   - Bin snapping only applies on "end" events (not during drag) to avoid jitter.
 *   - Streaming tracking guards against y-only dimension (no x-domain to track).
 *   - isProgrammaticMoveRef prevents re-entrant brush events from .move() calls.
 *
 * Consumed by: StreamXYFrame (rendered when brush prop is set).
 */
import * as React from "react"
import { useRef, useEffect } from "react"
import { select as d3Select } from "d3-selection"
import { brush as d3Brush, brushX as d3BrushX, brushY as d3BrushY } from "d3-brush"
import type { StreamScales } from "./types"

export interface XYBrushOverlayProps {
  width: number
  height: number
  totalWidth: number
  totalHeight: number
  margin: { top: number; right: number; bottom: number; left: number }
  dimension: "x" | "y" | "xy"
  scales: StreamScales | null
  onBrush: (extent: { x: [number, number]; y: [number, number] } | null) => void
  binSize?: number
  snap?: "continuous" | "bin"
  streaming?: boolean
}

export function XYBrushOverlay({
  width,
  height,
  totalWidth,
  totalHeight,
  margin,
  dimension,
  scales,
  onBrush,
  binSize,
  snap,
  streaming
}: XYBrushOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const brushRef = useRef<any>(null)

  const onBrushRef = useRef(onBrush)
  onBrushRef.current = onBrush
  const scalesRef = useRef(scales)
  scalesRef.current = scales

  const isProgrammaticMoveRef = useRef(false)
  const activeBrushExtentRef = useRef<{ x: [number, number]; y: [number, number] } | null>(null)

  useEffect(() => {
    if (!svgRef.current) return

    const g = d3Select(svgRef.current).select(".brush-g")

    const brushFn =
      dimension === "x"
        ? d3BrushX()
        : dimension === "y"
          ? d3BrushY()
          : d3Brush()

    brushFn.extent([[0, 0], [width, height]])

    brushFn.on("brush end", (event: any) => {
      if (isProgrammaticMoveRef.current) return

      const s = scalesRef.current
      if (!s) return

      if (!event.selection) {
        activeBrushExtentRef.current = null
        onBrushRef.current(null)
        return
      }

      let xRange: [number, number]
      let yRange: [number, number]

      if (dimension === "x") {
        const [px0, px1] = event.selection as [number, number]
        xRange = [s.x.invert(px0), s.x.invert(px1)]
        yRange = [s.y.invert(height), s.y.invert(0)]
      } else if (dimension === "y") {
        const [py0, py1] = event.selection as [number, number]
        xRange = [s.x.invert(0), s.x.invert(width)]
        yRange = [s.y.invert(py1), s.y.invert(py0)]
      } else {
        const [[px0, py0], [px1, py1]] = event.selection as [[number, number], [number, number]]
        xRange = [s.x.invert(px0), s.x.invert(px1)]
        yRange = [s.y.invert(py1), s.y.invert(py0)]
      }

      // Snap to bin boundaries on "end" event only (avoids jitter during drag)
      if (event.type === "end" && snap === "bin" && binSize && binSize > 0 && dimension !== "y") {
        xRange = [
          Math.floor(xRange[0] / binSize) * binSize,
          Math.ceil(xRange[1] / binSize) * binSize
        ]
        const snappedPx0 = s.x(xRange[0])
        const snappedPx1 = s.x(xRange[1])
        isProgrammaticMoveRef.current = true
        if (dimension === "x") {
          g.call(brushFn.move as any, [snappedPx0, snappedPx1])
        } else if (dimension === "xy") {
          const sel = event.selection as [[number, number], [number, number]]
          g.call(brushFn.move as any, [[snappedPx0, sel[0][1]], [snappedPx1, sel[1][1]]])
        }
        isProgrammaticMoveRef.current = false
      }

      const extent = { x: xRange, y: yRange }
      activeBrushExtentRef.current = extent
      onBrushRef.current(extent)
    })

    g.call(brushFn as any)
    brushRef.current = brushFn

    g.select(".selection")
      .attr("fill", "steelblue")
      .attr("fill-opacity", 0.15)
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1)

    return () => {
      brushFn.on("brush end", null)
      brushRef.current = null
    }
  }, [width, height, dimension, snap, binSize])

  // Streaming brush tracking: reposition brush as scale domain shifts
  useEffect(() => {
    if (!streaming || !scales || !brushRef.current || !activeBrushExtentRef.current) return
    if (!svgRef.current) return
    // Streaming tracking only applies when we have an x-brush (x or xy dimension)
    if (dimension === "y") return

    const ext = activeBrushExtentRef.current
    const domain = scales.x.domain() as [number, number]
    const visibleMin = domain[0]

    const g = d3Select(svgRef.current).select(".brush-g")

    // Brush fully off-screen (scrolled away)
    if (ext.x[1] <= visibleMin) {
      isProgrammaticMoveRef.current = true
      g.call(brushRef.current.move as any, null)
      isProgrammaticMoveRef.current = false
      activeBrushExtentRef.current = null
      onBrushRef.current(null)
      return
    }

    // Determine effective left edge (shrink if partially off-screen)
    let effectiveMin = ext.x[0]
    let extentChanged = false

    if (ext.x[0] < visibleMin) {
      effectiveMin = visibleMin
      if (snap === "bin" && binSize && binSize > 0) {
        effectiveMin = Math.ceil(visibleMin / binSize) * binSize
      }
      if (effectiveMin >= ext.x[1]) {
        isProgrammaticMoveRef.current = true
        g.call(brushRef.current.move as any, null)
        isProgrammaticMoveRef.current = false
        activeBrushExtentRef.current = null
        onBrushRef.current(null)
        return
      }
      extentChanged = true
    }

    const px0 = scales.x(effectiveMin)
    const px1 = scales.x(ext.x[1])

    isProgrammaticMoveRef.current = true
    if (dimension === "x") {
      g.call(brushRef.current.move as any, [px0, px1])
    } else {
      const py0 = scales.y(ext.y[1])
      const py1 = scales.y(ext.y[0])
      g.call(brushRef.current.move as any, [[px0, py0], [px1, py1]])
    }
    isProgrammaticMoveRef.current = false

    if (extentChanged) {
      const newExtent = { x: [effectiveMin, ext.x[1]] as [number, number], y: ext.y }
      activeBrushExtentRef.current = newExtent
      onBrushRef.current(newExtent)
    }
  }, [scales, streaming, dimension, snap, binSize])

  return (
    <svg
      ref={svgRef}
      width={totalWidth}
      height={totalHeight}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "all"
      }}
    >
      <g className="brush-g" transform={`translate(${margin.left},${margin.top})`} />
    </svg>
  )
}
