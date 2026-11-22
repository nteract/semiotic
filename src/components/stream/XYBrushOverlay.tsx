/**
 * XYBrushOverlay — d3-brush SVG overlay for XY frames.
 *
 * Renders a transparent SVG positioned above the canvas. Supports x, y, and
 * xy brush dimensions, bin snapping, and streaming brush tracking (shrinks/
 * clears the brush as data scrolls past the selected range).
 *
 * Key design decisions:
 *   - d3-brush lifecycle depends on [width, height, dimension, snap, binSize, snapDuring]
 *     only — scales and binBoundaries are read from refs to avoid teardown mid-drag.
 *   - Data-driven snapping (binBoundaries) uses binary search to snap to actual bin
 *     edges. Falls back to uniform grid math (binSize) when no boundaries are provided.
 *   - Bin snapping applies on "end" events by default. Set snapDuring=true to also
 *     snap during drag (the "brush" event).
 *   - Streaming tracking guards against y-only dimension (no x-domain to track).
 *   - isProgrammaticMoveRef prevents re-entrant brush events from .move() calls.
 *   - A controlled `extent` moves the brush whenever it, the scales or the plot
 *     change, and again after each gesture or keyboard step (so the caller's
 *     value wins), but never mid-drag. Programmatic moves report nothing.
 *   - `onBrushEnd` fires once per pointer release, keyboard step or reset that
 *     changed the selection.
 *
 * Consumed by: StreamXYFrame (rendered when brush prop is set).
 */
import * as React from "react"
import { useRef, useLayoutEffect, useEffect, useMemo, useState } from "react"
import { select as d3Select } from "d3-selection"
import { brush as d3Brush, brushX as d3BrushX, brushY as d3BrushY, type BrushBehavior, type D3BrushEvent } from "d3-brush"
import type { StreamScales } from "./types"
import { useBrushAccessibility, type BrushKeyboardAction } from "./brushAccessibility"
import { applyBrushSelectionStyle } from "./brushTheme"
import { invertHeatmapBandValue, projectHeatmapBandDataValue } from "./heatmapBandTicks"
import type { XYBrushEndMeta, XYBrushExtent, XYBrushExtentInput } from "./xyBrushTypes"
import { axisEndMeta, pixelRange, rangeOf, sameRange } from "./brushControl"

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
  /** Sorted bin boundary values for data-driven snapping (overrides uniform grid math when snap="bin"). Defensively sorted internally. */
  binBoundaries?: number[]
  /** When true, snap during drag (not just on release). Default false. */
  snapDuring?: boolean
  streaming?: boolean
  /** Controlled selection: the brush moves to it, `null` clears it. Unset leaves the brush uncontrolled. */
  extent?: XYBrushExtentInput | null
  /** Called once per pointer release, keyboard step or reset that changed the selection. */
  onBrushEnd?: (extent: XYBrushExtent | null, meta: XYBrushEndMeta) => void
}

type Dimension = XYBrushOverlayProps["dimension"]
type BrushSelection = [number, number] | [[number, number], [number, number]]

function dataEndpoint(
  scale: { (value: number): number; invert: (pixel: number) => number; domain: () => unknown[] },
  endpoint: 0 | 1
): number {
  const edge = scale.domain()[endpoint]
  const pixel = scale(edge instanceof Date ? edge.getTime() : Number(edge))
  const value = invertHeatmapBandValue(scale, pixel) as number | Date
  return value instanceof Date ? value.getTime() : value
}

function boundedRange(
  range: [number, number],
  domain: [number, number],
  direction: -1 | 1,
  resize: boolean,
): [number, number] {
  const [minimum, maximum] = [Math.min(...domain), Math.max(...domain)]
  const amount = (maximum - minimum) / 20
  let [start, end] = range
  if (resize) {
    if (direction < 0) start = Math.max(minimum, start - amount)
    else end = Math.min(maximum, end + amount)
  } else {
    const width = end - start
    start = Math.max(minimum, Math.min(maximum - width, start + direction * amount))
    end = start + width
  }
  return [start, end]
}

/** Binary search for the largest boundary <= value (floor). */
function floorBinBoundary(value: number, boundaries: number[]): number {
  let lo = 0, hi = boundaries.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (boundaries[mid] <= value) lo = mid
    else hi = mid - 1
  }
  return boundaries[lo]
}

/** Binary search for the smallest boundary >= value (ceil). */
function ceilBinBoundary(value: number, boundaries: number[]): number {
  let lo = 0, hi = boundaries.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (boundaries[mid] >= value) hi = mid
    else lo = mid + 1
  }
  return boundaries[lo]
}

/**
 * Snap a range [lo, hi] to the nearest bin boundaries using floor/ceil semantics:
 * the low end snaps down, the high end snaps up (ensuring the selection never
 * shrinks below what the user dragged).
 */
function snapRangeToBinBoundaries(range: [number, number], boundaries: number[]): [number, number] {
  if (boundaries.length === 0) return range
  return [floorBinBoundary(range[0], boundaries), ceilBinBoundary(range[1], boundaries)]
}

/** The d3 brush selection that draws `extent`; `null` when its brushed axis is missing or unplaceable. */
function selectionOf(
  s: StreamScales,
  extent: XYBrushExtentInput,
  dimension: Dimension,
  width: number,
  height: number
): BrushSelection | null {
  const x = pixelRange(s.x, extent.x, width)
  const y = pixelRange(s.y, extent.y, height)
  if (!x || !y || (dimension !== "y" && !extent.x) || (dimension !== "x" && !extent.y)) return null
  return dimension === "x" ? x : dimension === "y" ? y : [[x[0], y[0]], [x[1], y[1]]]
}

/** The data extent a d3 brush selection covers; the unbrushed axis spans the plot. */
function extentOf(
  s: StreamScales,
  selection: BrushSelection,
  dimension: Dimension,
  width: number,
  height: number
): XYBrushExtent {
  const [[px0, py0], [px1, py1]] = dimension === "x"
    ? [[(selection as [number, number])[0], 0], [(selection as [number, number])[1], height]]
    : dimension === "y"
      ? [[0, (selection as [number, number])[0]], [width, (selection as [number, number])[1]]]
      : selection as [[number, number], [number, number]]
  return { x: rangeOf(s.x, [px0, px1], false), y: rangeOf(s.y, [py0, py1], true) }
}

/** Whether a selection reaches the start / end of the brushed axis (x, or y for a y brush). */
function endMeta(
  source: XYBrushEndMeta["source"],
  selection: BrushSelection | null,
  dimension: Dimension,
  width: number,
  height: number
): XYBrushEndMeta {
  if (!selection || dimension !== "xy") {
    return axisEndMeta(source, selection as [number, number] | null, dimension === "y" ? height : width, dimension === "y")
  }
  const [[left], [right]] = selection as [[number, number], [number, number]]
  return axisEndMeta(source, [left, right], width, false)
}

function sameExtent(a: XYBrushExtent | null, b: XYBrushExtent | null): boolean {
  if (!a || !b) return a === b
  return sameRange(a.x, b.x) && sameRange(a.y, b.y)
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
  binBoundaries,
  snapDuring,
  streaming,
  extent: controlledExtent,
  onBrushEnd
}: XYBrushOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  // d3-brush's `BrushBehavior` is generic over the datum bound to the
  // brush group selection. We don't bind data to the group, so
  // `unknown` is the right datum type at the seam.
  const brushRef = useRef<BrushBehavior<unknown> | null>(null)

  const onBrushRef = useRef(onBrush)
  onBrushRef.current = onBrush
  const onBrushEndRef = useRef(onBrushEnd)
  onBrushEndRef.current = onBrushEnd
  const controlledExtentRef = useRef(controlledExtent)
  controlledExtentRef.current = controlledExtent
  const controlled = controlledExtent !== undefined
  // The selection when the current pointer gesture began; null between gestures.
  const gestureRef = useRef<{ from: XYBrushExtent | null } | null>(null)
  // Bumped after a gesture or keyboard step so a controlled brush re-syncs to
  // the caller's value in the same render as any update the change caused.
  const [syncTick, setSyncTick] = useState(0)
  const scalesRef = useRef(scales)
  scalesRef.current = scales
  // Defensively sort binBoundaries — binary search requires ascending order
  const sortedBoundaries = useMemo(
    () => binBoundaries ? [...binBoundaries].sort((a, b) => a - b) : undefined,
    [binBoundaries]
  )
  const binBoundariesRef = useRef(sortedBoundaries)
  binBoundariesRef.current = sortedBoundaries

  const isProgrammaticMoveRef = useRef(false)
  const activeBrushExtentRef = useRef<{ x: [number, number]; y: [number, number] } | null>(null)

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
      if (previous) onBrushEndRef.current?.(null, endMeta("keyboard", null, dimension, width, height))
      if (controlledExtentRef.current !== undefined) setSyncTick((tick) => tick + 1)
      return
    }

    const xDomain: [number, number] = [dataEndpoint(s.x, 0), dataEndpoint(s.x, 1)]
    const yDomain: [number, number] = [dataEndpoint(s.y, 0), dataEndpoint(s.y, 1)]
    const existing = previous
    let xRange: [number, number] = existing?.x ?? [
      xDomain[0] + (xDomain[1] - xDomain[0]) * 0.4,
      xDomain[0] + (xDomain[1] - xDomain[0]) * 0.6,
    ]
    let yRange: [number, number] = existing?.y ?? [
      yDomain[0] + (yDomain[1] - yDomain[0]) * 0.4,
      yDomain[0] + (yDomain[1] - yDomain[0]) * 0.6,
    ]
    const horizontal = action.direction === "left" || action.direction === "right"
    const direction = action.direction === "left" || action.direction === "down" ? -1 : 1
    if (horizontal && dimension !== "y") xRange = boundedRange(xRange, xDomain, direction, action.resize)
    if (!horizontal && dimension !== "x") yRange = boundedRange(yRange, yDomain, direction, action.resize)
    if ((horizontal && dimension === "y") || (!horizontal && dimension === "x")) return

    const extent = { x: xRange, y: yRange }
    const selection = selectionOf(s, extent, dimension, width, height)
    if (!selection) return
    isProgrammaticMoveRef.current = true
    g.call(brush.move, selection)
    isProgrammaticMoveRef.current = false
    activeBrushExtentRef.current = extent
    onBrushRef.current(extent)
    if (!sameExtent(previous, extent)) {
      onBrushEndRef.current?.(extent, endMeta("keyboard", selection, dimension, width, height))
    }
    if (controlledExtentRef.current !== undefined) setSyncTick((tick) => tick + 1)
  }
  const brushA11y = useBrushAccessibility({
    label: dimension === "xy" ? "Two-dimensional data range brush" : `${dimension.toUpperCase()} data range brush`,
    onAction: handleKeyboardAction,
  })

  useLayoutEffect(() => {
    if (!svgRef.current) return

    // Type the brush group selection as `SVGGElement` so the
    // brush's typed `move` / behavior call signatures resolve.
    const g = d3Select(svgRef.current).select<SVGGElement>(".brush-g")

    const brushFn =
      dimension === "x"
        ? d3BrushX()
        : dimension === "y"
          ? d3BrushY()
          : d3Brush()

    brushFn.extent([[0, 0], [width, height]])

    brushFn.on("start", () => {
      if (!isProgrammaticMoveRef.current) gestureRef.current = { from: activeBrushExtentRef.current }
    })

    /** The end of a pointer gesture: report a changed selection, then let a controlled brush re-sync. */
    const finishGesture = (extent: XYBrushExtent | null, selection: BrushSelection | null) => {
      const gesture = gestureRef.current
      gestureRef.current = null
      if (gesture && !sameExtent(gesture.from, extent)) {
        onBrushEndRef.current?.(extent, endMeta("pointer", selection, dimension, width, height))
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

      let selection = event.selection as BrushSelection
      const covered = extentOf(s, selection, dimension, width, height)
      let xRange = covered.x
      const yRange = covered.y

      // Snap to bin boundaries: on "end" always, on "brush" only when snapDuring is true
      const shouldSnap = snap === "bin" && dimension !== "y" &&
        (event.type === "end" || (event.type === "brush" && snapDuring))
      if (shouldSnap) {
        const boundaries = binBoundariesRef.current
        if (boundaries && boundaries.length > 0) {
          // Data-driven snapping: snap to actual bin edges
          xRange = snapRangeToBinBoundaries(xRange, boundaries)
        } else if (binSize && binSize > 0) {
          // Fallback: uniform grid math (backward compatible)
          xRange = [
            Math.floor(xRange[0] / binSize) * binSize,
            Math.ceil(xRange[1] / binSize) * binSize
          ]
        }
        const snappedPx0 = projectHeatmapBandDataValue(s.x, xRange[0])
        const snappedPx1 = projectHeatmapBandDataValue(s.x, xRange[1])
        if (snappedPx0 != null && snappedPx1 != null) {
          isProgrammaticMoveRef.current = true
          if (dimension === "x") {
            selection = [snappedPx0, snappedPx1]
            g.call(brushFn.move, selection)
          } else if (dimension === "xy") {
            const sel = event.selection as [[number, number], [number, number]]
            selection = [[snappedPx0, sel[0][1]], [snappedPx1, sel[1][1]]]
            g.call(brushFn.move, selection)
          }
          isProgrammaticMoveRef.current = false
        }
      }

      const extent = { x: xRange, y: yRange }
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
  }, [width, height, dimension, snap, binSize, snapDuring])

  // Controlled selection: move the brush to the caller's extent (or clear it),
  // never mid-drag, without reporting the move.
  const [cx0, cx1] = controlledExtent?.x ?? []
  const [cy0, cy1] = controlledExtent?.y ?? []
  const cleared = controlledExtent === null
  useEffect(() => {
    const brush = brushRef.current
    const target = controlledExtentRef.current
    if (target === undefined || !scales || !brush || !svgRef.current || gestureRef.current) return
    const selection = target ? selectionOf(scales, target, dimension, width, height) : null
    isProgrammaticMoveRef.current = true
    d3Select(svgRef.current).select<SVGGElement>(".brush-g").call(brush.move, selection)
    isProgrammaticMoveRef.current = false
    activeBrushExtentRef.current = selection ? extentOf(scales, selection, dimension, width, height) : null
  }, [controlled, cleared, cx0, cx1, cy0, cy1, scales, syncTick, width, height, dimension, snap, binSize, snapDuring])

  // Streaming brush tracking: reposition brush as scale domain shifts
  useEffect(() => {
    if (!streaming || !scales || !brushRef.current || !activeBrushExtentRef.current) return
    if (!svgRef.current) return
    // Streaming tracking only applies when we have an x-brush (x or xy dimension)
    if (dimension === "y") return

    const ext = activeBrushExtentRef.current
    const visibleMin = dataEndpoint(scales.x, 0)

    const g = d3Select(svgRef.current).select<SVGGElement>(".brush-g")

    // Brush fully off-screen (scrolled away)
    if (ext.x[1] <= visibleMin) {
      isProgrammaticMoveRef.current = true
      g.call(brushRef.current.move, null)
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
      if (snap === "bin") {
        const boundaries = binBoundariesRef.current
        if (boundaries && boundaries.length > 0) {
          // Snap up to the smallest bin boundary >= visibleMin (ceil)
          effectiveMin = ceilBinBoundary(visibleMin, boundaries)
        } else if (binSize && binSize > 0) {
          effectiveMin = Math.ceil(visibleMin / binSize) * binSize
        }
      }
      if (effectiveMin >= ext.x[1]) {
        isProgrammaticMoveRef.current = true
        g.call(brushRef.current.move, null)
        isProgrammaticMoveRef.current = false
        activeBrushExtentRef.current = null
        onBrushRef.current(null)
        return
      }
      extentChanged = true
    }

    const px0 = projectHeatmapBandDataValue(scales.x, effectiveMin)
    const px1 = projectHeatmapBandDataValue(scales.x, ext.x[1])
    if (px0 == null || px1 == null) return

    isProgrammaticMoveRef.current = true
    if (dimension === "x") {
      g.call(brushRef.current.move, [px0, px1])
    } else {
      const py0 = projectHeatmapBandDataValue(scales.y, ext.y[1])
      const py1 = projectHeatmapBandDataValue(scales.y, ext.y[0])
      if (py0 == null || py1 == null) {
        isProgrammaticMoveRef.current = false
        return
      }
      g.call(brushRef.current.move, [[px0, py0], [px1, py1]])
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
      {...brushA11y.svgProps}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "all"
      }}
    >
      <title>{brushA11y.svgProps["aria-label"]}</title>
      <desc id={brushA11y.descriptionId}>{brushA11y.description}</desc>
      <g className="brush-g" transform={`translate(${margin.left},${margin.top})`} />
    </svg>
  )
}
