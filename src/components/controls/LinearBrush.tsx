"use client"
// One namespace import: the ESM build keeps every external import statement,
// so named imports would add bytes to every `semiotic/controls` consumer.
import * as React from "react"
import { SR_ONLY_STYLE } from "../screenReaderStyles"
import { createControlObservationAdapter, type ControlInputSource } from "./controlContract"
import {
  brushEdgeFlags,
  brushValueForKey,
  createLinearBrushTrack,
  normalizeBrushValue,
  sameBrushValue,
} from "./linearBrushGeometry"
import { formatBrushValue, placeLinearBrushLabels } from "./linearBrushLabels"
import { linearBrushHandleThickness } from "./linearBrushMetrics"
import {
  DEFAULT_ACTIVE_GRIP_COLOR,
  DEFAULT_ACTIVE_HANDLE_STYLE,
  DEFAULT_ACTIVE_SELECTION_STYLE,
  DEFAULT_DESCRIPTION,
  DEFAULT_GRIP_COLOR,
  DEFAULT_HANDLE_STYLE,
  DEFAULT_LABEL_FONT_SIZE,
  DEFAULT_LABEL_STYLE,
  DEFAULT_MASK_STYLE,
  DEFAULT_SELECTION_STYLE,
  FOCUS_OUTLINE,
  NO_OUTLINE,
} from "./linearBrushDefaults"
import { useLinearBrushGesture, type LinearBrushPointerMode } from "./useLinearBrushGesture"
import type {
  LinearBrushChangeMeta,
  LinearBrushChangeSource,
  LinearBrushGestureMode,
  LinearBrushHandleRenderContext,
  LinearBrushProps,
  LinearBrushValue,
} from "./linearBrushTypes"

export type {
  LinearBrushChangeMeta,
  LinearBrushChangeSource,
  LinearBrushGestureMode,
  LinearBrushHandleRenderContext,
  LinearBrushLabelRenderContext,
  LinearBrushProps,
  LinearBrushScale,
  LinearBrushValue,
} from "./linearBrushTypes"

type SliderPart = "start" | "end" | "range"

/** A track fraction as a CSS percentage, rounded to 1/10000 of a percent. */
const percent = (fraction: number) => `${Math.round(fraction * 1e6) / 1e4}%`

/**
 * Merge style layers so a key set by a later layer also lands later, as a
 * stylesheet cascades: a caller's `border` shorthand overrides default
 * longhands, and an active `borderColor` then overrides the shorthand.
 */
function mergeStyles(...layers: Array<React.CSSProperties | null | undefined | false>): React.CSSProperties {
  const merged: Record<string, unknown> = {}
  for (const layer of layers) {
    if (!layer) continue
    for (const [key, value] of Object.entries(layer)) {
      delete merged[key]
      merged[key] = value
    }
  }
  return merged as React.CSSProperties
}

function isFocusVisible(element: Element): boolean {
  try {
    return element.matches(":focus-visible")
  } catch {
    return true
  }
}

/** Track length along the brushed axis from layout, for label placement. */
function useTrackLength(ref: React.RefObject<HTMLDivElement | null>, orientation: "x" | "y", fallback: number, enabled: boolean) {
  const [measured, setMeasured] = React.useState(0)
  React.useEffect(() => {
    const element = ref.current
    if (!enabled || !element || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(([entry]) => {
      setMeasured(orientation === "x" ? entry.contentRect.width : entry.contentRect.height)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, orientation, enabled])
  return measured > 0 ? measured : fallback
}

/** Along-axis position and size of a part spanning `[from, to]` of the track. */
function spanStyle(orientation: "x" | "y", from: number, to: number): React.CSSProperties {
  return orientation === "x"
    ? { position: "absolute", top: 0, bottom: 0, left: percent(from), width: percent(to - from) }
    : { position: "absolute", left: 0, right: 0, top: percent(from), height: percent(to - from) }
}

/**
 * The built-in handle look, filling its sized parent. It takes no pointer
 * events: its parent is the stable hit target, so remounting the visual when a
 * gesture starts or ends never changes what a click lands on.
 */
function HandleVisual({ axis, style, grip }: { axis: "x" | "y"; style: React.CSSProperties; grip: string }) {
  return (
    <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, pointerEvents: "none", ...style }}>
      {[0.35, 0.65].map((at) => (
        <div
          key={at}
          style={axis === "x"
            ? { position: "absolute", left: percent(at), top: "30%", bottom: "30%", width: 1, marginLeft: -0.5, background: grip }
            : { position: "absolute", top: percent(at), left: "30%", right: "30%", height: 1, marginTop: -0.5, background: grip }}
        />
      ))}
    </div>
  )
}

/**
 * `LinearBrush` — an accessible one-dimensional range brush. Controlled
 * (`value`) or uncontrolled (`defaultValue`): drag an end to resize, drag the
 * selection to move it, drag the background to draw a new one, click the
 * background to clear. `onChange` fires on every change and `onChangeEnd`
 * once per release or keyboard step, so a consumer can follow the drag or
 * commit on release.
 *
 * Positions are fractions of the track, so it is responsive and renders the
 * same on the server. Give it a `domain` (or the chart's `scale`) and lay it
 * over a chart with `inset`.
 *
 * **Accessibility.** A `role="group"` holds three `role="slider"` elements —
 * the start, the whole range, and the end — with `aria-valuetext` from
 * `formatValue`. Arrows step, Shift/PageUp/PageDown take large steps,
 * Home/End go to the limits, and Escape clears.
 */
export function LinearBrush(props: LinearBrushProps): React.ReactElement {
  const {
    value: controlledValue,
    defaultValue = null,
    onChange,
    onChangeStart,
    onChangeEnd,
    domain,
    scale,
    orientation = "x",
    reverse = false,
    width,
    height = 40,
    inset,
    snap = false,
    minSpan = 0,
    allowCreate = true,
    clearOnBackgroundClick = true,
    clearable = true,
    resetOnDoubleClick = false,
    resetValue = null,
    emptySelection = "hidden",
    disabled = false,
    selectionStyle,
    activeSelectionStyle,
    maskStyle,
    showHandles = true,
    showMoveHandle = false,
    handleSize = 12,
    hitSize = 24,
    handleStyle,
    activeHandleStyle,
    renderHandle,
    showExtentLabels = false,
    showDomainLabels = false,
    formatValue = formatBrushValue,
    renderExtentLabel,
    labelPosition = "below",
    labelOffset = 4,
    labelWidth,
    labelBounds,
    labelStyle,
    label = "Range",
    description = DEFAULT_DESCRIPTION,
    controlType = "range-boundary",
    controlId,
    onObservation,
    chartId,
    chartType = "LinearBrush",
    className,
    style,
  } = props

  const domainLow = domain?.[0]
  const domainHigh = domain?.[1]
  const track = React.useMemo(
    () => createLinearBrushTrack({
      domain: domainLow != null && domainHigh != null ? [domainLow, domainHigh] : undefined,
      scale,
      orientation,
      reverse,
    }),
    [domainLow, domainHigh, scale, orientation, reverse]
  )
  const span = track ? track.max - track.min : 0
  const step = props.step ?? span / 20
  const largeStep = props.largeStep ?? span / 5
  const fullExtentWhenEmpty = emptySelection === "full-extent"
  const isDisabled = disabled || !track

  const controlled = controlledValue !== undefined
  const [internalValue, setInternalValue] = React.useState<LinearBrushValue>(() =>
    defaultValue ? [defaultValue[0], defaultValue[1]] : null
  )
  const committed = track ? normalizeBrushValue(controlled ? controlledValue : internalValue, track) : null

  const rootRef = React.useRef<HTMLDivElement>(null)
  const sliderRefs = { start: React.useRef<HTMLDivElement>(null), range: React.useRef<HTMLDivElement>(null), end: React.useRef<HTMLDivElement>(null) }
  const focusedRef = React.useRef<SliderPart | null>(null)
  const [focus, setFocus] = React.useState<{ part: SliderPart; visible: boolean } | null>(null)
  const observedStartRef = React.useRef(false)
  const descriptionId = `semiotic-linear-brush-${React.useId().replace(/:/g, "")}`

  const observe = React.useMemo(
    () => createControlObservationAdapter({ controlType, controlId, chartId, chartType, onObservation }),
    [controlType, controlId, chartId, chartType, onObservation]
  )

  const emit = (
    next: LinearBrushValue,
    source: LinearBrushChangeSource,
    mode: LinearBrushGestureMode,
    startValue: LinearBrushValue,
    phases: { change: boolean; end: boolean }
  ) => {
    if (!track) return
    const meta: LinearBrushChangeMeta = { source, mode, changed: !sameBrushValue(next, startValue), ...brushEdgeFlags(next, track) }
    const observationSource: ControlInputSource = source === "keyboard" ? "keyboard" : "pointer"
    if (phases.change) {
      // The start is announced before the consumer hears the first change.
      if (next && !observedStartRef.current) {
        observe("control-start", next, observationSource)
        observedStartRef.current = true
      }
      if (!controlled) setInternalValue(next)
      onChange?.(next, meta)
      if (next) observe("control-change", next, observationSource)
    }
    if (phases.end) {
      onChangeEnd?.(next, meta)
      if (next && observedStartRef.current) observe("control-end", next, observationSource)
      observedStartRef.current = false
    }
  }

  // Focus that follows a pointer gesture shows no focus ring.
  const pointerFocusRef = React.useRef(false)
  const focusPart = (part: SliderPart) => {
    const element = sliderRefs[part].current ?? sliderRefs.range.current
    if (!element) return
    if (element.ownerDocument.activeElement === element) {
      setFocus({ part, visible: false })
      return
    }
    pointerFocusRef.current = true
    element.focus({ preventScroll: true })
    pointerFocusRef.current = false
  }

  const gesture = useLinearBrushGesture({
    track,
    orientation,
    fallbackLength: orientation === "x" ? width ?? 0 : height,
    value: committed,
    fullExtentWhenEmpty,
    minSpan,
    step,
    snap,
    allowCreate,
    clearOnBackgroundClick,
    disabled: isDisabled,
    onStart: (startValue, mode) => {
      if (!track) return
      observedStartRef.current = false
      onChangeStart?.(startValue, { source: "pointer", mode, changed: false, ...brushEdgeFlags(startValue, track) })
    },
    onChange: (next, mode, startValue) => emit(next, "pointer", mode, startValue, { change: true, end: false }),
    onEnd: (next, mode, startValue) => emit(next, "pointer", mode, startValue, { change: false, end: true }),
    onBackgroundClick: () => {
      if (clearOnBackgroundClick && committed) emit(null, "background-click", "clear", committed, { change: true, end: true })
    },
    focusPart,
  })

  const current = gesture.draft ? gesture.draft.value : committed
  const shown: [number, number] | null = current ?? (fullExtentWhenEmpty && track ? [track.min, track.max] : null)

  // A cleared selection removes its end sliders; keep keyboard focus in the brush.
  React.useEffect(() => {
    if (!shown && (focusedRef.current === "start" || focusedRef.current === "end")) {
      sliderRefs.range.current?.focus({ preventScroll: true })
    }
  })

  const onKeyDown = (part: SliderPart) => (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (isDisabled || !track || gesture.isActive()) return
    const result = brushValueForKey(part, event.key, event.shiftKey, current, track, { step, largeStep, minSpan, clearable })
    if (!result) return
    event.preventDefault()
    if (sameBrushValue(result.value, current)) return
    emit(result.value, "keyboard", result.value ? "keyboard" : "clear", current, { change: true, end: true })
  }

  const onDoubleClick = () => {
    if (!resetOnDoubleClick || isDisabled || !track) return
    const next = normalizeBrushValue(resetValue, track)
    if (!sameBrushValue(next, committed)) emit(next, "double-click", "reset", committed, { change: true, end: true })
  }

  const focusHandlers = (part: SliderPart) => ({
    onFocus: (event: React.FocusEvent<HTMLDivElement>) => {
      focusedRef.current = part
      setFocus({ part, visible: !pointerFocusRef.current && isFocusVisible(event.currentTarget) })
    },
    onBlur: () => {
      focusedRef.current = null
      setFocus(null)
    },
  })

  const labelFontSize = typeof labelStyle?.fontSize === "number" ? labelStyle.fontSize : DEFAULT_LABEL_FONT_SIZE
  const trackLength = useTrackLength(rootRef, orientation, orientation === "x" ? width ?? 0 : height, showExtentLabels)

  const activeMode: LinearBrushPointerMode | null = gesture.activeMode
  const dragging = activeMode != null
  const fractions = shown && track
    ? [track.toFraction(shown[0]), track.toFraction(shown[1])].sort((a, b) => a - b) as [number, number]
    : null
  const valueText = (value: number) => formatValue(value).replace(/\n/g, " ")
  const describedBy = { "aria-describedby": descriptionId }
  const cursor = orientation === "x" ? "ew-resize" : "ns-resize"
  const insetBox = typeof inset === "number" ? { top: inset, right: inset, bottom: inset, left: inset } : inset

  const rootStyle: React.CSSProperties = {
    ...(insetBox
      ? { position: "absolute", top: insetBox.top ?? 0, right: insetBox.right ?? 0, bottom: insetBox.bottom ?? 0, left: insetBox.left ?? 0 }
      : { position: "relative", width: width ?? "100%", height }),
    userSelect: "none",
    WebkitUserSelect: "none",
    touchAction: orientation === "x" ? "pan-y" : "pan-x",
    pointerEvents: allowCreate || clearOnBackgroundClick ? "auto" : "none",
    cursor: isDisabled ? "default" : allowCreate ? "crosshair" : "default",
    ...style,
  }

  const partStyle = (extra: React.CSSProperties): React.CSSProperties => ({ pointerEvents: isDisabled ? "none" : "auto", ...extra })
  // Built-in handle boxes, centered on their anchor: "tall" pills sit on x
  // edges, "wide" ones on y edges and on an x brush's move handle.
  const thickness = linearBrushHandleThickness(handleSize)
  const handleBox = (shape: "tall" | "wide"): React.CSSProperties => ({
    width: shape === "tall" ? thickness : handleSize * 2,
    height: shape === "tall" ? handleSize * 2 : thickness,
    transform: "translate(-50%, -50%)",
  })

  const renderEdge = (side: "start" | "end") => {
    if (!shown || !fractions || !track) return null
    const edgeValue = side === "start" ? shown[0] : shown[1]
    const fraction = track.toFraction(edgeValue)
    const active = activeMode === side
    const context: LinearBrushHandleRenderContext = {
      side, value: edgeValue, fraction, active, dragging, focused: focus?.part === side, orientation,
    }
    const limitLow = side === "start" ? track.min : Math.min(track.max, shown[0] + Math.min(minSpan, span))
    const limitHigh = side === "start" ? Math.max(track.min, shown[1] - Math.min(minSpan, span)) : track.max
    // Half the selection at most, so a narrow selection keeps a movable middle.
    const hit = `min(${hitSize}px, max(${Math.min(hitSize, 8)}px, ${percent((fractions[1] - fractions[0]) / 2)}))`
    return (
      <div
        ref={sliderRefs[side]}
        data-semiotic-brush-part={side}
        role="slider"
        tabIndex={isDisabled ? -1 : 0}
        aria-label={`${label} ${side}`}
        aria-orientation={orientation === "x" ? "horizontal" : "vertical"}
        aria-valuemin={limitLow}
        aria-valuemax={limitHigh}
        aria-valuenow={edgeValue}
        aria-valuetext={valueText(edgeValue)}
        aria-disabled={isDisabled || undefined}
        {...describedBy}
        {...focusHandlers(side)}
        onKeyDown={onKeyDown(side)}
        style={partStyle({
          position: "absolute",
          zIndex: 2,
          cursor,
          ...NO_OUTLINE,
          ...(orientation === "x"
            ? { top: 0, bottom: 0, left: percent(fraction), width: hit, transform: "translateX(-50%)" }
            : { left: 0, right: 0, top: percent(fraction), height: hit, transform: "translateY(-50%)" }),
          ...(focus?.part === side && focus.visible ? FOCUS_OUTLINE : {}),
        })}
      >
        <div style={orientation === "x"
          ? { position: "absolute", left: "50%", top: 0, bottom: 0, width: 0, overflow: "visible" }
          : { position: "absolute", top: "50%", left: 0, right: 0, height: 0, overflow: "visible" }}>
          {renderHandle
            ? renderHandle(context)
            : showHandles && (
              <div style={{ position: "absolute", pointerEvents: "none", ...handleBox(orientation === "x" ? "tall" : "wide"), ...(orientation === "x" ? { left: 0, top: "50%" } : { top: 0, left: "50%" }) }}>
                <HandleVisual
                  key={active ? "active" : "idle"}
                  axis={orientation}
                  grip={active ? DEFAULT_ACTIVE_GRIP_COLOR : DEFAULT_GRIP_COLOR}
                  style={mergeStyles(DEFAULT_HANDLE_STYLE, handleStyle, active && DEFAULT_ACTIVE_HANDLE_STYLE, active && activeHandleStyle)}
                />
              </div>
            )}
        </div>
      </div>
    )
  }

  const selectionShown = shown && fractions
  const rangeText = current ? `${valueText(current[0])} to ${valueText(current[1])}` : "No range selected"
  const maskResolved = maskStyle === true ? DEFAULT_MASK_STYLE : maskStyle ? mergeStyles(DEFAULT_MASK_STYLE, maskStyle) : null

  const labels = showExtentLabels && shown && track && trackLength > 0
    ? placeLinearBrushLabels({
      value: shown,
      track,
      length: trackLength,
      orientation,
      format: formatValue,
      fontSize: labelFontSize,
      labelWidth,
      bounds: labelBounds,
      showDomainLabels,
    })
    : []
  const rowSize = Math.max(1, ...labels.map((entry) => entry.lines.length)) * labelFontSize * 1.2

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label={`${label} brush`}
      data-semiotic-control="linear-brush"
      data-viz-control={controlType}
      data-viz-control-id={controlId}
      data-dragging={dragging || undefined}
      className={["semiotic-linear-brush", className].filter(Boolean).join(" ")}
      style={rootStyle}
      {...gesture.handlers}
      onDoubleClick={onDoubleClick}
    >
      {maskResolved && fractions && ([[0, fractions[0]], [fractions[1], 1]] as const).map(([from, to]) => (
        <div key={from} data-semiotic-brush-part="mask" aria-hidden="true" style={{ ...spanStyle(orientation, from, to), ...maskResolved }} />
      ))}
      {renderEdge("start")}
      <div
        ref={sliderRefs.range}
        data-semiotic-brush-part={current ? "selection" : "background"}
        role="slider"
        tabIndex={isDisabled ? -1 : 0}
        aria-label={`${label} (move both ends)`}
        aria-orientation={orientation === "x" ? "horizontal" : "vertical"}
        aria-valuemin={track?.min ?? 0}
        aria-valuemax={track?.max ?? 0}
        aria-valuenow={current ? current[0] : track?.min ?? 0}
        aria-valuetext={rangeText}
        aria-disabled={isDisabled || undefined}
        {...describedBy}
        {...focusHandlers("range")}
        onKeyDown={onKeyDown("range")}
        style={partStyle({
          ...(selectionShown ? spanStyle(orientation, fractions[0], fractions[1]) : spanStyle(orientation, 0, 1)),
          zIndex: 1,
          ...NO_OUTLINE,
          cursor: current ? "move" : undefined,
          ...(focus?.part === "range" && focus.visible ? FOCUS_OUTLINE : {}),
        })}
      >
        {/* Remounted when the gesture state flips, so an active longhand
            (borderColor) never outlives the drag over a base shorthand
            (border). It takes no pointer events, so the slider stays the
            click target across the remount. */}
        {selectionShown && (
          <div
            key={dragging ? "active" : "idle"}
            data-semiotic-brush-selection={dragging ? "active" : "idle"}
            style={mergeStyles(
              { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, pointerEvents: "none" },
              DEFAULT_SELECTION_STYLE,
              selectionStyle,
              dragging && DEFAULT_ACTIVE_SELECTION_STYLE,
              dragging && activeSelectionStyle,
            )}
          />
        )}
      </div>
      {renderEdge("end")}
      {showMoveHandle && current && fractions && track && (
        <div
          data-semiotic-brush-part="move"
          aria-hidden="true"
          style={partStyle({
            position: "absolute",
            zIndex: 3,
            cursor: "move",
            ...(orientation === "x"
              ? { left: percent((fractions[0] + fractions[1]) / 2), top: 0 }
              : { top: percent((fractions[0] + fractions[1]) / 2), left: 0 }),
            // Custom content sets its own hit area around a zero-size anchor.
            ...(renderHandle ? { width: 0, height: 0 } : handleBox(orientation === "x" ? "wide" : "tall")),
          })}
        >
          {renderHandle
            ? renderHandle({
              side: "move",
              value: (current[0] + current[1]) / 2,
              fraction: (fractions[0] + fractions[1]) / 2,
              active: activeMode === "move",
              dragging,
              focused: focus?.part === "range",
              orientation,
            })
            : (
              <HandleVisual
                key={activeMode === "move" ? "active" : "idle"}
                axis={orientation}
                grip={activeMode === "move" ? DEFAULT_ACTIVE_GRIP_COLOR : DEFAULT_GRIP_COLOR}
                style={mergeStyles(DEFAULT_HANDLE_STYLE, handleStyle, activeMode === "move" && DEFAULT_ACTIVE_HANDLE_STYLE, activeMode === "move" && activeHandleStyle)}
              />
            )}
        </div>
      )}
      {labels.map((entry) => {
        const before = entry.placement === "before"
        const offset = labelOffset + entry.row * rowSize
        const position: React.CSSProperties = orientation === "x"
          ? {
            left: percent(entry.fraction),
            ...(labelPosition === "below" ? { top: `calc(100% + ${offset}px)` } : { bottom: `calc(100% + ${offset}px)` }),
            transform: before ? "translateX(-100%)" : undefined,
            textAlign: before ? "right" : "left",
          }
          : {
            top: percent(entry.fraction),
            ...(labelPosition === "below" ? { left: `calc(100% + ${offset}px)` } : { right: `calc(100% + ${offset}px)` }),
            transform: before ? "translateY(-100%)" : undefined,
          }
        return (
          <div
            key={entry.kind}
            data-semiotic-brush-label={entry.kind}
            data-placement={entry.placement}
            data-row={entry.row}
            aria-hidden="true"
            style={mergeStyles({ position: "absolute", whiteSpace: "pre", pointerEvents: "none" }, DEFAULT_LABEL_STYLE, labelStyle, position)}
          >
            {renderExtentLabel
              ? renderExtentLabel({ kind: entry.kind, value: entry.value, text: entry.text, placement: entry.placement, fraction: entry.fraction, row: entry.row })
              : entry.text}
          </div>
        )
      })}
      <span id={descriptionId} style={SR_ONLY_STYLE}>{description}</span>
    </div>
  )
}
