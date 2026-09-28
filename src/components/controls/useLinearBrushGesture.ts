"use client"
import * as React from "react"
import {
  createBrush,
  moveBrush,
  resizeBrush,
  sameBrushValue,
  shiftBrush,
  snapBrushValue,
  type LinearBrushTrack,
} from "./linearBrushGeometry"
import type { LinearBrushValue } from "./linearBrushTypes"

export type LinearBrushPointerMode = "start" | "end" | "move" | "create"

interface Gesture {
  pointerId: number
  mode: LinearBrushPointerMode | "pending"
  /** The value when the pointer went down. */
  startValue: LinearBrushValue
  /** The selection resizes and moves start from (the domain when empty). */
  base: [number, number]
  originFraction: number
  originPx: number
  /** Where a created selection is anchored. */
  anchor: number
  current: LinearBrushValue
}

export interface LinearBrushGestureOptions {
  track: LinearBrushTrack | null
  orientation: "x" | "y"
  /** Track length when the element has no layout box yet. */
  fallbackLength: number
  /** The value shown when no gesture is active. */
  value: LinearBrushValue
  /** With no selection, the end handles sit at the domain ends and can be dragged. */
  fullExtentWhenEmpty: boolean
  minSpan: number
  step: number
  snap: boolean
  allowCreate: boolean
  clearOnBackgroundClick: boolean
  disabled: boolean
  onStart(value: LinearBrushValue, mode: LinearBrushPointerMode): void
  onChange(value: LinearBrushValue, mode: LinearBrushPointerMode, startValue: LinearBrushValue): void
  onEnd(value: LinearBrushValue, mode: LinearBrushPointerMode, startValue: LinearBrushValue): void
  /** A click on the background without a drag. */
  onBackgroundClick(): void
  focusPart(part: "start" | "end" | "range"): void
}

/** Movement below this many px is a click, not a new selection. */
const CREATE_THRESHOLD = 3

/**
 * Pointer gestures for LinearBrush: drag an end, move the selection, drag the
 * background to create, click it to clear. Every gesture is computed from the
 * pointer-down snapshot, so a lagging controlled value cannot make it drift.
 */
export function useLinearBrushGesture(options: LinearBrushGestureOptions) {
  const optionsRef = React.useRef(options)
  optionsRef.current = options
  const gestureRef = React.useRef<Gesture | null>(null)
  const [draft, setDraft] = React.useState<{ value: LinearBrushValue } | null>(null)
  const [activeMode, setActiveMode] = React.useState<LinearBrushPointerMode | null>(null)

  const position = (event: React.PointerEvent<HTMLElement>) => {
    const { orientation, fallbackLength } = optionsRef.current
    const rect = event.currentTarget.getBoundingClientRect()
    const measured = orientation === "x" ? rect.width : rect.height
    const length = measured > 0 ? measured : fallbackLength
    const px = orientation === "x" ? event.clientX - rect.left : event.clientY - rect.top
    return { px, fraction: length > 0 ? px / length : 0 }
  }

  const begin = (gesture: Gesture, mode: LinearBrushPointerMode) => {
    gesture.mode = mode
    setActiveMode(mode)
    optionsRef.current.focusPart(mode === "start" || mode === "end" ? mode : "range")
    optionsRef.current.onStart(gesture.startValue, mode)
  }

  const update = (gesture: Gesture, event: React.PointerEvent<HTMLElement>) => {
    const { track, snap, step, minSpan, allowCreate } = optionsRef.current
    if (!track) return
    const { px, fraction } = position(event)
    if (gesture.mode === "pending") {
      if (!allowCreate || Math.abs(px - gesture.originPx) < CREATE_THRESHOLD) return
      begin(gesture, "create")
    }
    const raw = track.fromFraction(fraction)
    const pointer = snap ? snapBrushValue(raw, step, track) : raw
    let next: [number, number]
    if (gesture.mode === "start" || gesture.mode === "end") {
      next = resizeBrush(gesture.base, gesture.mode, pointer, track, minSpan)
    } else if (gesture.mode === "move") {
      next = moveBrush(gesture.base, fraction - gesture.originFraction, track)
      if (snap) next = shiftBrush(next, snapBrushValue(next[0], step, track) - next[0], track)
    } else {
      next = createBrush(gesture.anchor, pointer, track, minSpan)
    }
    if (sameBrushValue(next, gesture.current)) return
    gesture.current = next
    setDraft({ value: next })
    optionsRef.current.onChange(next, gesture.mode as LinearBrushPointerMode, gesture.startValue)
  }

  const finish = (gesture: Gesture, element: HTMLElement, released: boolean) => {
    gestureRef.current = null
    if (element.hasPointerCapture?.(gesture.pointerId)) element.releasePointerCapture?.(gesture.pointerId)
    setDraft(null)
    setActiveMode(null)
    if (gesture.mode === "pending") {
      if (released) optionsRef.current.onBackgroundClick()
      return
    }
    optionsRef.current.onEnd(gesture.current, gesture.mode, gesture.startValue)
  }

  const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    const { track, disabled, value, fullExtentWhenEmpty, allowCreate, clearOnBackgroundClick, snap, step } = optionsRef.current
    if (!track || disabled || event.button !== 0 || event.ctrlKey || gestureRef.current) return
    const part = (event.target as Element).closest?.("[data-semiotic-brush-part]")?.getAttribute("data-semiotic-brush-part")
    const hasHandles = value != null || fullExtentWhenEmpty
    const mode: Gesture["mode"] | null =
      (part === "start" || part === "end") && hasHandles ? part
        : (part === "selection" || part === "move") && value ? "move"
          : allowCreate || clearOnBackgroundClick ? "pending"
            : null
    if (!mode) return
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    const { px, fraction } = position(event)
    const raw = track.fromFraction(fraction)
    const gesture: Gesture = {
      pointerId: event.pointerId,
      mode,
      startValue: value,
      base: value ?? [track.min, track.max],
      originFraction: fraction,
      originPx: px,
      anchor: snap ? snapBrushValue(raw, step, track) : raw,
      current: value,
    }
    gestureRef.current = gesture
    if (mode !== "pending") begin(gesture, mode)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current
    if (gesture && gesture.pointerId === event.pointerId) update(gesture, event)
  }

  // The release position is applied first: browsers can coalesce away the
  // last move when the release lands in the same frame.
  const onPointerUp = (event: React.PointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    update(gesture, event)
    finish(gesture, event.currentTarget, true)
  }

  const onPointerCancel = (event: React.PointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current
    if (gesture && gesture.pointerId === event.pointerId) finish(gesture, event.currentTarget, false)
  }

  return {
    /** The in-progress value, or null outside a gesture. */
    draft,
    activeMode,
    isActive: () => gestureRef.current != null,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onLostPointerCapture: onPointerCancel,
    },
  }
}
