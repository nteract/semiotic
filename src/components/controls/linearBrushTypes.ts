import type { CSSProperties, ReactNode } from "react"
import type { ControlObservationCallback, VisualizationControlType } from "./controlContract"

/** A selected range `[start, end]` with `start <= end`, or `null` when nothing is selected. */
export type LinearBrushValue = [number, number] | null

/**
 * A continuous scale that maps values to track pixels, such as a d3 linear,
 * time, or log scale. Time scales may return Dates from `invert`.
 */
export interface LinearBrushScale {
  (value: number): number
  invert(pixel: number): number | Date
  range(): number[]
  domain(): Array<number | Date>
}

/** What produced a change. */
export type LinearBrushChangeSource = "pointer" | "keyboard" | "double-click" | "background-click"

/** The gesture behind a change. */
export type LinearBrushGestureMode = "start" | "end" | "move" | "create" | "keyboard" | "reset" | "clear"

export interface LinearBrushChangeMeta {
  source: LinearBrushChangeSource
  mode: LinearBrushGestureMode
  /** Whether the value differs from the value when the gesture began. */
  changed: boolean
  /** The selection reaches the domain start, or nothing is selected. */
  atDomainStart: boolean
  /** The selection reaches the domain end, or nothing is selected. */
  atDomainEnd: boolean
}

export interface LinearBrushHandleRenderContext {
  /** Which handle: an edge, or the center move handle. */
  side: "start" | "end" | "move"
  value: number
  /** Position along the track, 0 at its left (x) or top (y) edge, 1 at the other. */
  fraction: number
  /** This handle is being dragged. */
  active: boolean
  /** Any brush gesture is in progress. */
  dragging: boolean
  /** This handle has keyboard focus. */
  focused: boolean
  orientation: "x" | "y"
}

export interface LinearBrushLabelRenderContext {
  kind: "start" | "end" | "domain-start" | "domain-end"
  value: number
  text: string
  /** The label ends at its anchor ("before") or starts at it ("after"). */
  placement: "before" | "after"
  fraction: number
  /** 1 when the label steps down a row to clear the other extent label. */
  row: 0 | 1
}

export interface LinearBrushProps {
  /** Controlled selection. Pass `null` for no selection. */
  value?: readonly [number, number] | null
  /** Initial selection when uncontrolled. */
  defaultValue?: readonly [number, number] | null
  /** Called whenever the selection changes, including every pointer move. */
  onChange?: (value: LinearBrushValue, meta: LinearBrushChangeMeta) => void
  /** Called when a pointer gesture begins changing the selection. */
  onChangeStart?: (value: LinearBrushValue, meta: LinearBrushChangeMeta) => void
  /** Called once per pointer release, keyboard change, clear, or reset. */
  onChangeEnd?: (value: LinearBrushValue, meta: LinearBrushChangeMeta) => void

  /** Value domain `[min, max]`; mapped linearly along the track. Ignored when `scale` is given. */
  domain?: readonly [number, number]
  /** A scale from values to track pixels, such as the chart's own x scale. */
  scale?: LinearBrushScale
  /** "x" brushes horizontally (default); "y" vertically, with the minimum at the bottom. */
  orientation?: "x" | "y"
  /** Put the minimum on the right (x) or top (y). Ignored when `scale` is given. */
  reverse?: boolean

  /**
   * Track width in px. Defaults to 100% of the parent. With `inset`, a size
   * hint for pointer math and label placement before layout.
   */
  width?: number
  /** Track height in px (a size hint with `inset`). @default 40 */
  height?: number
  /**
   * Overlay mode: position the track absolutely inside the nearest positioned
   * ancestor, inset by these px (for example a chart's margins).
   */
  inset?: number | { top?: number; right?: number; bottom?: number; left?: number }

  /** Keyboard step in value units. @default span / 20 */
  step?: number
  /** Shift+arrow and PageUp/PageDown step. @default span / 5 */
  largeStep?: number
  /** Round pointer values to `step`. */
  snap?: boolean
  /** Smallest selection span in value units. @default 0 */
  minSpan?: number
  /** Dragging on the background draws a new selection. @default true */
  allowCreate?: boolean
  /** Clicking the background clears the selection. @default true */
  clearOnBackgroundClick?: boolean
  /** Escape clears the selection. @default true */
  clearable?: boolean
  /** Double-clicking the brush sets `resetValue`. */
  resetOnDoubleClick?: boolean
  /** @default null */
  resetValue?: LinearBrushValue
  /** With no selection, hide the selection ("hidden", default) or show handles at the domain ends ("full-extent"). */
  emptySelection?: "hidden" | "full-extent"
  disabled?: boolean

  selectionStyle?: CSSProperties
  /** Merged over `selectionStyle` while a gesture is in progress. */
  activeSelectionStyle?: CSSProperties
  /** Dim the track outside the selection; `true` uses the theme surface color. */
  maskStyle?: boolean | CSSProperties
  /** @default true */
  showHandles?: boolean
  /** A handle at the selection's center that moves it. */
  showMoveHandle?: boolean
  /** Built-in handle size in px. @default 12 */
  handleSize?: number
  /** Pointer target size of each edge in px. @default 24 */
  hitSize?: number
  handleStyle?: CSSProperties
  /** Merged over `handleStyle` for the handle being dragged. */
  activeHandleStyle?: CSSProperties
  /**
   * Custom handle content, placed relative to a zero-width anchor on the edge
   * (or the top center for the move handle). Must not contain focusable
   * elements: the handle itself is the focusable slider.
   */
  renderHandle?: (context: LinearBrushHandleRenderContext) => ReactNode

  /** Label each end of the selection with its value. */
  showExtentLabels?: boolean
  /** Also label the domain ends, where there is room beside the extent labels. */
  showDomainLabels?: boolean
  /** Formats values for labels and `aria-valuetext`. A newline makes a two-line label. */
  formatValue?: (value: number) => string
  renderExtentLabel?: (context: LinearBrushLabelRenderContext) => ReactNode
  /** Labels sit below (default) or above an x track; right or left of a y track. */
  labelPosition?: "below" | "above"
  /** Gap between the track and its labels in px. @default 4 */
  labelOffset?: number
  /** Label width in px along an x track; estimated from the text when omitted. */
  labelWidth?: number
  /**
   * The px range, relative to the track start, that labels stay inside. They
   * flip inward at its edges. @default [0, track length]
   */
  labelBounds?: readonly [number, number]
  labelStyle?: CSSProperties

  /** Accessible name prefix. @default "Range" */
  label?: string
  /** Screen-reader instructions; a default describes the keyboard controls. */
  description?: string
  /** @default "range-boundary" */
  controlType?: VisualizationControlType
  controlId?: string
  onObservation?: ControlObservationCallback
  chartId?: string
  /** @default "LinearBrush" */
  chartType?: string
  className?: string
  style?: CSSProperties
}
