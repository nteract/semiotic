import * as React from "react"
import { useRef, useEffect } from "react"
import { select as d3Select } from "d3-selection"
import { brushX as d3BrushX, brushY as d3BrushY } from "d3-brush"
import type { OrdinalScales } from "./ordinalTypes"

interface OrdinalBrushOverlayProps {
  width: number
  height: number
  totalWidth: number
  totalHeight: number
  margin: { top: number; right: number; bottom: number; left: number }
  scales: OrdinalScales | null
  onBrush: (extent: { r: [number, number] } | null) => void
}

/**
 * SVG brush overlay for ordinal frames.
 * Brushes along the r-axis (value axis) only.
 * In horizontal projection, r maps to x-pixels → uses brushX.
 * In vertical projection, r maps to y-pixels → uses brushY.
 */
export function OrdinalBrushOverlay({
  width,
  height,
  totalWidth,
  totalHeight,
  margin,
  scales,
  onBrush
}: OrdinalBrushOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const brushRef = useRef<any>(null)
  const onBrushRef = useRef(onBrush)
  onBrushRef.current = onBrush
  const scalesRef = useRef(scales)
  scalesRef.current = scales
  const isProgrammaticMoveRef = useRef(false)
  const activeBrushExtentRef = useRef<{ r: [number, number] } | null>(null)

  const isHorizontal = scales?.projection === "horizontal"
  const isHorizontalRef = useRef(isHorizontal)
  isHorizontalRef.current = isHorizontal

  useEffect(() => {
    if (!svgRef.current) return

    const g = d3Select(svgRef.current).select(".brush-g")

    // Horizontal: r maps to x → brushX. Vertical: r maps to y → brushY.
    const brushFn = isHorizontal ? d3BrushX() : d3BrushY()
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

      const [px0, px1] = event.selection as [number, number]
      let rRange: [number, number]

      if (isHorizontalRef.current) {
        // brushX: pixel positions map to r values
        rRange = [s.r.invert(px0), s.r.invert(px1)]
      } else {
        // brushY: pixel positions map to r values (inverted: top=high, bottom=low)
        rRange = [s.r.invert(px1), s.r.invert(px0)]
      }

      const extent = { r: rRange }
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
    // Only recreate the d3-brush when dimensions or orientation change.
    // scales is read from scalesRef to avoid teardown on every render.
  }, [width, height, isHorizontal])

  // Reposition brush on scale changes (streaming)
  useEffect(() => {
    if (!scales || !brushRef.current || !activeBrushExtentRef.current) return
    if (!svgRef.current) return

    const ext = activeBrushExtentRef.current
    const g = d3Select(svgRef.current).select(".brush-g")

    const px0 = scales.r(ext.r[0])
    const px1 = scales.r(ext.r[1])

    if (isHorizontal) {
      isProgrammaticMoveRef.current = true
      g.call(brushRef.current.move as any, [px0, px1])
      isProgrammaticMoveRef.current = false
    } else {
      isProgrammaticMoveRef.current = true
      g.call(brushRef.current.move as any, [px1, px0]) // inverted for vertical
      isProgrammaticMoveRef.current = false
    }
  }, [scales, isHorizontal])

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
