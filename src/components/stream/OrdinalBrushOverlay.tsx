/**
 * OrdinalBrushOverlay — d3-brush SVG overlay for ordinal frames.
 *
 * Renders a transparent SVG positioned above the canvas. Brushes along the
 * r-axis (value axis) only: horizontal projection → brushX, vertical → brushY.
 *
 * Key design decisions:
 *   - Outer SVG has pointerEvents:"none", inner brush-g has "all", so
 *     axes/legends rendered underneath remain clickable.
 *   - d3-brush lifecycle (useEffect) depends on [width, height, isHorizontal]
 *     only — NOT scales. Scales are read from a ref to avoid brush teardown
 *     mid-drag (scales change every render due to new object identity).
 *   - A separate useEffect repositions the brush when scales change (streaming).
 *
 * Consumed by: StreamOrdinalFrame (rendered when brush prop is set).
 * Wired by: useOrdinalBrush hook in HOC charts.
 */
import * as React from "react"
import { useRef, useEffect } from "react"
import { select as d3Select } from "d3-selection"
import { brushX as d3BrushX, brushY as d3BrushY, type BrushBehavior, type D3BrushEvent } from "d3-brush"
import type { OrdinalScales } from "./ordinalTypes"
import { useBrushAccessibility, type BrushKeyboardAction } from "./brushAccessibility"

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
  const brushRef = useRef<BrushBehavior<unknown> | null>(null)
  const onBrushRef = useRef(onBrush)
  onBrushRef.current = onBrush
  const scalesRef = useRef(scales)
  scalesRef.current = scales
  const isProgrammaticMoveRef = useRef(false)
  const activeBrushExtentRef = useRef<{ r: [number, number] } | null>(null)

  const isHorizontal = scales?.projection === "horizontal"
  const isHorizontalRef = useRef(isHorizontal)
  isHorizontalRef.current = isHorizontal

  const handleKeyboardAction = (action: BrushKeyboardAction) => {
    const s = scalesRef.current
    const brush = brushRef.current
    if (!s || !brush || !svgRef.current) return
    const g = d3Select(svgRef.current).select<SVGGElement>(".brush-g")
    if (action.type === "clear") {
      isProgrammaticMoveRef.current = true
      g.call(brush.move, null)
      isProgrammaticMoveRef.current = false
      activeBrushExtentRef.current = null
      onBrushRef.current(null)
      return
    }
    const horizontalAction = action.direction === "left" || action.direction === "right"
    if (horizontalAction !== !!isHorizontalRef.current) return
    const domain = s.r.domain() as [number, number]
    const [minimum, maximum] = [Math.min(...domain), Math.max(...domain)]
    const amount = (maximum - minimum) / 20
    const existing = activeBrushExtentRef.current?.r ?? [
      minimum + (maximum - minimum) * 0.4,
      minimum + (maximum - minimum) * 0.6,
    ] as [number, number]
    const direction = action.direction === "left" || action.direction === "down" ? -1 : 1
    let [start, end] = existing
    if (action.resize) {
      if (direction < 0) start = Math.max(minimum, start - amount)
      else end = Math.min(maximum, end + amount)
    } else {
      const range = end - start
      start = Math.max(minimum, Math.min(maximum - range, start + direction * amount))
      end = start + range
    }
    const extent = { r: [start, end] as [number, number] }
    isProgrammaticMoveRef.current = true
    if (isHorizontalRef.current) g.call(brush.move, [s.r(start), s.r(end)])
    else g.call(brush.move, [s.r(end), s.r(start)])
    isProgrammaticMoveRef.current = false
    activeBrushExtentRef.current = extent
    onBrushRef.current(extent)
  }
  const brushA11y = useBrushAccessibility({
    label: "Ordinal value range brush",
    onAction: handleKeyboardAction,
  })

  useEffect(() => {
    if (!svgRef.current) return

    const g = d3Select(svgRef.current).select<SVGGElement>(".brush-g")

    // Horizontal: r maps to x → brushX. Vertical: r maps to y → brushY.
    const brushFn = isHorizontal ? d3BrushX() : d3BrushY()
    brushFn.extent([[0, 0], [width, height]])

    brushFn.on("brush end", (event: D3BrushEvent<unknown>) => {
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

    g.call(brushFn)
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
    const g = d3Select(svgRef.current).select<SVGGElement>(".brush-g")

    const px0 = scales.r(ext.r[0])
    const px1 = scales.r(ext.r[1])

    if (isHorizontal) {
      isProgrammaticMoveRef.current = true
      g.call(brushRef.current.move, [px0, px1])
      isProgrammaticMoveRef.current = false
    } else {
      isProgrammaticMoveRef.current = true
      g.call(brushRef.current.move, [px1, px0]) // inverted for vertical
      isProgrammaticMoveRef.current = false
    }
  }, [scales, isHorizontal])

  return (
    <svg
      ref={svgRef}
      width={totalWidth}
      height={totalHeight}
      {...brushA11y.svgProps}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none"
      }}
    >
      <title>{brushA11y.svgProps["aria-label"]}</title>
      <desc id={brushA11y.descriptionId}>{brushA11y.description}</desc>
      <g className="brush-g" transform={`translate(${margin.left},${margin.top})`} style={{ pointerEvents: "all" }} />
    </svg>
  )
}
