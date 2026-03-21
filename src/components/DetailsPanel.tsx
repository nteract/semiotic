"use client"
import * as React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useChartObserver } from "./store/useObservation"
import type { ChartObservation, ClickObservation } from "./store/ObservationStore"

export interface DetailsPanelProps {
  /**
   * Render function receiving the clicked datum and the full observation.
   * Return null to hide the panel for a given datum.
   */
  children: (
    datum: Record<string, any>,
    observation: ClickObservation
  ) => React.ReactNode

  /** Panel position relative to the chart. Default: "right" */
  position?: "right" | "bottom" | "overlay"

  /** Panel width (for "right" position) or height (for "bottom"). Default: 300 */
  size?: number

  /** Observation trigger type. Default: "click" */
  trigger?: "click" | "hover"

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

  /** CSS class for the panel container */
  className?: string

  /** Inline style overrides */
  style?: React.CSSProperties
}

const ANIMATION_DURATION = 200

export function DetailsPanel({
  children,
  position = "right",
  size = 300,
  trigger = "click",
  chartId,
  observation: directObservation,
  dismissOnEmpty = true,
  showClose = true,
  onToggle,
  className,
  style,
}: DetailsPanelProps) {
  const [selectedDatum, setSelectedDatum] = useState<Record<string, any> | null>(null)
  const [selectedObservation, setSelectedObservation] = useState<ClickObservation | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const animTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const observationTypes = trigger === "click"
    ? (["click", "click-end"] as ChartObservation["type"][])
    : (["hover", "hover-end"] as ChartObservation["type"][])

  const { latest: storeLatest } = useChartObserver({
    types: observationTypes,
    chartId,
    limit: 1,
  })

  // Use direct observation prop if provided, otherwise fall back to store
  const latest = directObservation !== undefined ? directObservation : storeLatest

  useEffect(() => {
    if (!latest) return

    if (latest.type === "click" || latest.type === "hover") {
      const obs = latest as ClickObservation
      setSelectedDatum(obs.datum)
      setSelectedObservation(obs)
      if (!isOpen) {
        setIsOpen(true)
        setIsAnimating(true)
        clearTimeout(animTimerRef.current)
        animTimerRef.current = setTimeout(() => setIsAnimating(false), ANIMATION_DURATION)
      }
    } else if (dismissOnEmpty && (latest.type === "click-end" || latest.type === "hover-end")) {
      handleClose()
    }
  }, [latest])

  useEffect(() => {
    onToggle?.(isOpen)
  }, [isOpen, onToggle])

  const handleClose = useCallback(() => {
    setIsAnimating(true)
    setIsOpen(false)
    clearTimeout(animTimerRef.current)
    animTimerRef.current = setTimeout(() => {
      setIsAnimating(false)
      setSelectedDatum(null)
      setSelectedObservation(null)
    }, ANIMATION_DURATION)
  }, [])

  useEffect(() => {
    return () => clearTimeout(animTimerRef.current)
  }, [])

  if (!selectedDatum && !isAnimating) return null

  const content = selectedDatum && selectedObservation
    ? children(selectedDatum, selectedObservation)
    : null

  if (content === null && !isAnimating) return null

  const panelStyle = getPanelStyle(position, size, isOpen, isAnimating)

  return (
    <div
      ref={panelRef}
      className={`semiotic-details-panel semiotic-details-${position}${className ? ` ${className}` : ""}`}
      style={{ ...panelStyle, ...style }}
    >
      {showClose && (
        <button
          className="semiotic-details-close"
          onClick={handleClose}
          aria-label="Close details"
          style={closeButtonStyle}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 2l8 8M10 2l-8 8" />
          </svg>
        </button>
      )}
      <div className="semiotic-details-content" style={{ overflow: "auto", flex: 1 }}>
        {content}
      </div>
    </div>
  )
}

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
  width: 20,
  height: 20,
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

DetailsPanel.displayName = "DetailsPanel"
