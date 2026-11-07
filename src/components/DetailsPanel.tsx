"use client"
import type { Datum } from "./charts/shared/datumTypes"
import * as React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useChartObserver } from "./store/useObservation"
import type { ChartObservation, ClickObservation, HoverObservation } from "./store/ObservationStore"
import { withDisplayName } from "./charts/shared/withDisplayName"
import { useReducedMotion } from "./stream/useMediaPreferences"

export interface DetailsPanelProps {
  /** Render function for clicked data. Return null to hide the panel. */
  children: (datum: Datum, observation: ClickObservation) => React.ReactNode

  /** Observation trigger type. Default: "click" */
  trigger?: "click" | "hover"

  /** Panel position relative to the chart. Default: "right" */
  position?: "right" | "bottom" | "overlay"

  /** Panel width (for "right" position) or height (for "bottom"). Default: 300 */
  size?: number

  /** Filter observations by chart ID */
  chartId?: string

  /**
   * Direct observation feed — use when the chart pushes observations via
   * onObservation callback rather than through the ObservationStore.
   * When set, bypasses useChartObserver and reacts to this prop directly.
   */
  observation?: ChartObservation | null

  /** Whether clicking empty space dismisses the panel. Default: true */
  dismissOnEmpty?: boolean

  /** Custom close button. Set to false to hide. Default: true */
  showClose?: boolean

  /** Called when the panel opens or closes */
  onToggle?: (open: boolean) => void

  /** Accessible name for the details region or overlay dialog. Default: "Chart details" */
  ariaLabel?: string

  /** CSS class for the panel container */
  className?: string

  /** Inline style overrides */
  style?: React.CSSProperties
}

/** Precise callback typing for the hover component overload. */
interface HoverDetailsPanelProps extends Omit<DetailsPanelProps, "trigger" | "children"> {
  trigger: "hover"
  children: (datum: Datum, observation: HoverObservation) => React.ReactNode
}

type PanelState =
  | { phase: "closed"; observation: null }
  | { phase: "opening" | "open" | "closing"; observation: ClickObservation | HoverObservation }

const ANIMATION_DURATION = 200
const CLICK_TYPES: ChartObservation["type"][] = ["click", "click-end", "activate"]
const HOVER_TYPES: ChartObservation["type"][] = ["hover", "hover-end"]

function DetailsPanelComponent(props: HoverDetailsPanelProps): React.ReactElement | null
function DetailsPanelComponent(props: DetailsPanelProps): React.ReactElement | null
function DetailsPanelComponent(props: DetailsPanelProps | HoverDetailsPanelProps): React.ReactElement | null {
  const {
    position = "right", size = 300, trigger = "click", chartId,
    observation: directObservation, dismissOnEmpty = true, showClose = true,
    onToggle, ariaLabel = "Chart details", className, style,
  } = props
  const [panel, setPanel] = useState<PanelState>(() => ({ phase: "closed", observation: null }))
  // Event handlers and timer callbacks must see transitions before React commits.
  const panelStateRef = useRef(panel)
  const transition = useCallback((next: PanelState) => {
    panelStateRef.current = next
    setPanel(next)
  }, [])
  const selectedObservation = panel.observation
  const isOpen = panel.phase === "opening" || panel.phase === "open"
  const visible = panel.phase === "open"
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef<HTMLElement | SVGElement | null>(null)
  const focusOnOpenRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reducedMotion = useReducedMotion()

  const { latest: storeLatest } = useChartObserver({
    types: trigger === "click" ? CLICK_TYPES : HOVER_TYPES, chartId, limit: 1,
  })
  const latest = directObservation !== undefined ? directObservation : storeLatest
  const handledRef = useRef<{ latest: ChartObservation | null; trigger: string; chartId?: string } | null>(null)

  const handleClose = useCallback(() => {
    const current = panelStateRef.current
    if (current.phase === "closed" || current.phase === "closing") return
    if (panelRef.current?.contains(document.activeElement)) {
      const target = restoreFocusRef.current
      if (target?.isConnected) target.focus({ preventScroll: true })
    }
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    const closing: PanelState = reducedMotion
      ? { phase: "closed", observation: null }
      : { phase: "closing", observation: current.observation }
    transition(closing)
    if (!reducedMotion) timerRef.current = setTimeout(() => {
      if (panelStateRef.current !== closing) return
      timerRef.current = null
      transition({ phase: "closed", observation: null })
    }, ANIMATION_DURATION)
  }, [reducedMotion, transition])

  useEffect(() => {
    const previous = handledRef.current
    if (previous?.latest === latest && previous.trigger === trigger && previous.chartId === chartId) return
    handledRef.current = { latest, trigger, chartId }
    if (directObservation === null) {
      handleClose()
      return
    }
    if (!latest || (chartId && latest.chartId !== chartId)) return
    const accepted = trigger === "hover"
      ? latest.type === "hover"
      : latest.type === "click" || latest.type === "activate"
    if (accepted) {
      const observation = latest.type === "activate"
        ? { ...latest, type: "click" as const, x: 0, y: 0 }
        : latest as ClickObservation | HoverObservation
      const current = panelStateRef.current
      if (current.phase === "closed" || current.phase === "closing") {
        const active = document.activeElement
        restoreFocusRef.current = active instanceof HTMLElement || active instanceof SVGElement ? active : null
        focusOnOpenRef.current = position === "overlay" || (latest.type === "activate" && latest.inputType !== "pointer" && latest.inputType !== "touch")
      }
      if (timerRef.current !== null) clearTimeout(timerRef.current)
      timerRef.current = null
      transition({ phase: current.phase === "open" ? "open" : "opening", observation })
    } else if (dismissOnEmpty && (trigger === "hover" ? latest.type === "hover-end" : latest.type === "click-end")) {
      handleClose()
    }
  }, [chartId, directObservation, dismissOnEmpty, handleClose, latest, position, transition, trigger])

  const content = selectedObservation?.type === "hover" && props.trigger === "hover"
    ? (props.children as HoverDetailsPanelProps["children"])(selectedObservation.datum, selectedObservation)
    : selectedObservation?.type === "click" && props.trigger !== "hover"
      ? props.children(selectedObservation.datum, selectedObservation)
      : null
  const effectiveOpen = isOpen && content != null
  const previousOpenRef = useRef(false)
  useEffect(() => {
    if (previousOpenRef.current === effectiveOpen) return
    previousOpenRef.current = effectiveOpen
    onToggle?.(effectiveOpen)
  }, [effectiveOpen, onToggle])

  useEffect(() => {
    if (!effectiveOpen) {
      const current = panelStateRef.current
      if (current.phase === "open") transition({ ...current, phase: "opening" })
      return
    }
    if (focusOnOpenRef.current) {
      panelRef.current?.focus({ preventScroll: true })
      focusOnOpenRef.current = false
    }
    const show = () => {
      const current = panelStateRef.current
      if (current.phase === "opening") transition({ ...current, phase: "open" })
    }
    if (reducedMotion) {
      show()
      return
    }
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(show)
    })
    return () => cancelAnimationFrame(frame)
  }, [effectiveOpen, reducedMotion, transition])

  useEffect(() => () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
  }, [])

  if (content == null) return null
  const panelStyle = getPanelStyle(position, size, visible && isOpen, !reducedMotion)
  return (
    <div
      ref={panelRef}
      role={position === "overlay" ? "dialog" : "region"}
      aria-label={ariaLabel}
      aria-live={position === "overlay" ? undefined : "polite"}
      aria-hidden={!isOpen || undefined}
      inert={!isOpen || undefined}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault()
          event.stopPropagation()
          handleClose()
        }
      }}
      className={`semiotic-details-panel semiotic-details-${position}${className ? ` ${className}` : ""}`}
      style={{ ...panelStyle, ...style }}
    >
      {showClose && (
        <button
          type="button"
          className="semiotic-details-close"
          onClick={handleClose}
          aria-label="Close details"
          style={closeButtonStyle}
        >
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 2l8 8M10 2l-8 8" />
          </svg>
        </button>
      )}
      <div className="semiotic-details-content" style={{ overflow: "auto", flex: 1 }}>{content}</div>
    </div>
  )
}

export const DetailsPanel = /* @__PURE__ */ withDisplayName(DetailsPanelComponent, "DetailsPanel")

function getPanelStyle(
  position: "right" | "bottom" | "overlay",
  size: number,
  isOpen: boolean,
  isAnimating: boolean
): React.CSSProperties {
  const base: React.CSSProperties = {
    position: "absolute",
    background: "var(--semiotic-bg, #fff)",
    borderColor: "var(--semiotic-border, #e0e0e0)",
    borderStyle: "solid",
    borderWidth: 0,
    boxSizing: "border-box",
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    transition: isAnimating ? `transform ${ANIMATION_DURATION}ms ease-out, opacity ${ANIMATION_DURATION}ms ease-out` : undefined,
  }

  if (position === "right") {
    return {
      ...base,
      top: 0,
      right: 0,
      width: size,
      height: "100%",
      borderLeftWidth: 1,
      padding: "12px 16px",
      transform: isOpen ? "translateX(0)" : `translateX(${size}px)`,
      opacity: isOpen ? 1 : 0,
    }
  }

  if (position === "bottom") {
    return {
      ...base,
      bottom: 0,
      left: 0,
      width: "100%",
      height: size,
      borderTopWidth: 1,
      padding: "12px 16px",
      transform: isOpen ? "translateY(0)" : `translateY(${size}px)`,
      opacity: isOpen ? 1 : 0,
    }
  }

  // overlay
  return {
    ...base,
    top: "50%",
    left: "50%",
    transform: isOpen ? "translate(-50%, -50%) scale(1)" : "translate(-50%, -50%) scale(0.95)",
    opacity: isOpen ? 1 : 0,
    width: Math.min(size, 400),
    maxHeight: "80%",
    borderWidth: 1,
    borderRadius: 8,
    padding: "16px 20px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
  }
}

const closeButtonStyle: React.CSSProperties = {
  position: "absolute",
  top: 8,
  right: 8,
  width: 24,
  height: 24,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  borderRadius: 4,
  color: "var(--semiotic-text-secondary, #666)",
  padding: 0,
  zIndex: 1,
}

