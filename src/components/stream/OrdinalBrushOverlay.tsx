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
 *   - As on the XY brush, a controlled `extent` moves the brush whenever it,
 *     the scales or the plot change, and again after each gesture or keyboard
 *     step (so the caller's value wins), but never mid-drag; programmatic moves
 *     report nothing. `onBrushEnd` fires once per pointer release, keyboard
 *     step or reset that changed the selection.
 *
 * Consumed by: StreamOrdinalFrame (rendered when brush prop is set).
 * Wired by: useOrdinalBrush hook in HOC charts.
 */
import * as React from "react"
import { useRef, useEffect, useState } from "react"
import { select as d3Select } from "d3-selection"
import { brushX as d3BrushX, brushY as d3BrushY, type BrushBehavior, type D3BrushEvent } from "d3-brush"
import type { OrdinalScales } from "./ordinalTypes"
import { useBrushAccessibility, type BrushKeyboardAction } from "./brushAccessibility"
import { applyBrushSelectionStyle } from "./brushTheme"
import { axisEndMeta, pixelRange, rangeOf, sameRange } from "./brushControl"
import type { OrdinalBrushEndMeta, OrdinalBrushExtent, OrdinalBrushExtentInput } from "./ordinalBrushTypes"

export interface OrdinalBrushOverlayProps {
  width: number
  height: number
  totalWidth: number
  totalHeight: number
  margin: { top: number; right: number; bottom: number; left: number }
  scales: OrdinalScales | null
  onBrush: (extent: { r: [number, number] } | null) => void
  /** Controlled selection: the brush moves to it, `null` clears it. Unset leaves the brush uncontrolled. */
  extent?: OrdinalBrushExtentInput | null
  /** Called once per pointer release, keyboard step or reset that changed the selection. */
  onBrushEnd?: (extent: OrdinalBrushExtent | null, meta: OrdinalBrushEndMeta) => void
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
  onBrush,
  extent: controlledExtent,
  onBrushEnd
}: OrdinalBrushOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const brushRef = useRef<BrushBehavior<unknown> | null>(null)
  const onBrushRef = useRef(onBrush)
  onBrushRef.current = onBrush
  const scalesRef = useRef(scales)
  scalesRef.current = scales
  const isProgrammaticMoveRef = useRef(false)
  const activeBrushExtentRef = useRef<{ r: [number, number] } | null>(null)
  const onBrushEndRef = useRef(onBrushEnd)
  onBrushEndRef.current = onBrushEnd
  const controlledExtentRef = useRef(controlledExtent)
  controlledExtentRef.current = controlledExtent
  // The selection when the current pointer gesture began; null between gestures.
  const gestureRef = useRef<{ from: OrdinalBrushExtent | null } | null>(null)
  // Bumped after a gesture or keyboard step so a controlled brush re-syncs to
  // the caller's value in the same render as any update the change caused.
  const [syncTick, setSyncTick] = useState(0)

  const isHorizontal = scales?.projection === "horizontal"
  const isHorizontalRef = useRef(isHorizontal)
  isHorizontalRef.current = isHorizontal
  /** The brushed axis's length in pixels. */
  const axisSize = () => (isHorizontalRef.current ? width : height)

  const handleKeyboardAction = (action: BrushKeyboardAction) => {
    const s = scalesRef.current
    const brush = brushRef.current
    if (!s || !brush || !svgRef.current) return
    const g = d3Select(svgRef.current).select<SVGGElement>(".brush-g")
    const previous = activeBrushExtentRef.current
    if (action.type === "clear") {
      isProgrammaticMoveRef.current = true
      g.call(brush.move, null)
      isProgrammaticMoveRef.current = false
      activeBrushExtentRef.current = null
      onBrushRef.current(null)
      if (previous) onBrushEndRef.current?.(null, axisEndMeta("keyboard", null, axisSize(), !isHorizontalRef.current))
      if (controlledExtentRef.current !== undefined) setSyncTick((tick) => tick + 1)
      return
    }
    const horizontalAction = action.direction === "left" || action.direction === "right"
    if (horizontalAction !== !!isHorizontalRef.current) return
    const domain = s.r.domain() as [number, number]
    const [minimum, maximum] = [Math.min(...domain), Math.max(...domain)]
    const amount = (maximum - minimum) / 20
    const existing = previous?.r ?? [
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
    const selection: [number, number] = isHorizontalRef.current ? [s.r(start), s.r(end)] : [s.r(end), s.r(start)]
    isProgrammaticMoveRef.current = true
    g.call(brush.move, selection)
    isProgrammaticMoveRef.current = false
    activeBrushExtentRef.current = extent
    onBrushRef.current(extent)
    if (!sameRange(previous?.r, extent.r)) {
      onBrushEndRef.current?.(extent, axisEndMeta("keyboard", selection, axisSize(), !isHorizontalRef.current))
    }
    if (controlledExtentRef.current !== undefined) setSyncTick((tick) => tick + 1)
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

    brushFn.on("start", () => {
      if (!isProgrammaticMoveRef.current) gestureRef.current = { from: activeBrushExtentRef.current }
    })

    /** The end of a pointer gesture: report a changed selection, then let a controlled brush re-sync. */
    const finishGesture = (extent: OrdinalBrushExtent | null, selection: [number, number] | null) => {
      const gesture = gestureRef.current
      gestureRef.current = null
      if (gesture && !sameRange(gesture.from?.r, extent?.r)) {
        onBrushEndRef.current?.(extent, axisEndMeta("pointer", selection, isHorizontal ? width : height, !isHorizontal))
      }
      if (controlledExtentRef.current !== undefined) setSyncTick((tick) => tick + 1)
    }

    brushFn.on("brush end", (event: D3BrushEvent<unknown>) => {
      if (isProgrammaticMoveRef.current) return
      const s = scalesRef.current
      if (!s) return

      if (!event.selection) {
        activeBrushExtentRef.current = null
        onBrushRef.current(null)
        if (event.type === "end") finishGesture(null, null)
        return
      }

      // brushX maps pixels to r left to right; brushY top = high, bottom = low.
      const selection = event.selection as [number, number]
      const extent = { r: rangeOf(s.r, selection, !isHorizontalRef.current) }
      activeBrushExtentRef.current = extent
      onBrushRef.current(extent)
      if (event.type === "end") finishGesture(extent, selection)
    })

    g.call(brushFn)
    brushRef.current = brushFn

    applyBrushSelectionStyle(g.select(".selection"), 0.15)

    return () => {
      brushFn.on("start brush end", null)
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

  // Controlled selection: move the brush to the caller's extent (or clear it),
  // never mid-drag, without reporting the move.
  const controlled = controlledExtent !== undefined
  const [cr0, cr1] = controlledExtent?.r ?? []
  const cleared = controlledExtent === null
  useEffect(() => {
    const brush = brushRef.current
    const target = controlledExtentRef.current
    if (target === undefined || !scales || !brush || !svgRef.current || gestureRef.current) return
    const size = isHorizontal ? width : height
    const selection = target ? pixelRange(scales.r, target.r, size) : null
    isProgrammaticMoveRef.current = true
    d3Select(svgRef.current).select<SVGGElement>(".brush-g").call(brush.move, selection)
    isProgrammaticMoveRef.current = false
    activeBrushExtentRef.current = selection ? { r: rangeOf(scales.r, selection, !isHorizontal) } : null
  }, [controlled, cleared, cr0, cr1, scales, syncTick, width, height, isHorizontal])

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
