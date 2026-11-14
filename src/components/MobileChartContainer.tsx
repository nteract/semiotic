"use client"
import type * as React from "react"
import {
  useState,
  useId,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  isValidElement,
  cloneElement
} from "react"
import { ChartContainer } from "./ChartContainer"
import { useMobileChartContainerStyles } from "./mobileChartContainerStyles"
import type {
  ChartContainerMobileOptions,
  ChartContainerProps,
} from "./ChartContainer"
import type {
  ChartMode,
  MobileInteractionProp,
} from "./charts/shared/types"
import type { MobileVisualizationContract } from "./charts/shared/auditMobileVisualization"

export interface MobileChartChip {
  id: string
  label: React.ReactNode
  description?: React.ReactNode
  disabled?: boolean
}

export type MobileChartDetailMode = "sheet" | "inline" | "none"

export interface MobileChartContainerProps
  extends Omit<ChartContainerProps, "mobile"> {
  /** Overrides for the underlying ChartContainer mobile contract. */
  mobile?: ChartContainerMobileOptions
  /** Width at or below which the mobile affordances should activate. Default 480. */
  breakpoint?: number
  /** Child chart mode injected by ChartContainer. Default "mobile". */
  chartMode?: ChartMode | false
  /** Touch-first interaction policy injected into the child chart. Default true. */
  mobileInteraction?: MobileInteractionProp
  /** Semantic mobile contract injected into the child chart. */
  mobileSemantics?: MobileVisualizationContract
  /** Mobile-only summary card rendered between the ChartContainer header and plot. */
  mobileSummary?: React.ReactNode
  /** Optional mobile chip controls rendered in the summary card. */
  chips?: MobileChartChip[]
  /** Controlled active chip id. */
  activeChip?: string
  /** Called when a chip is tapped. */
  onChipChange?: (chip: MobileChartChip) => void
  /** Optional detail content rendered below the chart as an inline card or sticky sheet. */
  detail?: React.ReactNode
  /** Detail panel heading. Default "Details". */
  detailTitle?: React.ReactNode
  /** Detail panel placement. Default "sheet". */
  detailMode?: MobileChartDetailMode
  /** Initial open state for sheet details. Inline details are always visible. */
  initialDetailOpen?: boolean
  /** Last-resort horizontal scroll fallback for legacy or wide charts. */
  allowHorizontalScroll?: boolean
  /** Hide toolbar controls at the mobile breakpoint. */
  hideToolbar?: boolean
  /**
   * Props injected into a single child chart only when that child has not
   * already declared the same prop. Use for chart-specific mobile defaults
   * such as { directLabel: true, showLegend: false }.
   */
  chartDefaults?: Record<string, unknown>
}

export function MobileChartContainer({
  children,
  controls,
  mobile,
  breakpoint = 480,
  chartMode = "mobile",
  mobileInteraction = true,
  mobileSemantics,
  mobileSummary,
  chips = [],
  activeChip,
  onChipChange,
  detail,
  detailTitle = "Details",
  detailMode = "sheet",
  initialDetailOpen = false,
  allowHorizontalScroll = false,
  hideToolbar = false,
  chartDefaults,
  ...containerProps
}: MobileChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const containerStyles = useMobileChartContainerStyles(containerRef, breakpoint)
  const [internalChip, setInternalChip] = useState<string | undefined>(
    () => activeChip ?? chips.find((chip) => !chip.disabled)?.id
  )
  const [detailOpen, setDetailOpen] = useState(initialDetailOpen)
  const detailId = `semiotic-mobile-details-${useId().replace(/:/g, "")}`
  const detailToggleRef = useRef<HTMLButtonElement>(null)
  const detailPanelRef = useRef<HTMLElement>(null)
  const closeDetails = useCallback(() => {
    setDetailOpen(false)
    detailToggleRef.current?.focus()
  }, [])

  useEffect(() => {
    if (activeChip !== undefined) return
    if (!chips.length) {
      setInternalChip(undefined)
      return
    }
    if (!chips.some((chip) => chip.id === internalChip && !chip.disabled)) {
      setInternalChip(chips.find((chip) => !chip.disabled)?.id)
    }
  }, [activeChip, chips, internalChip])

  const selectedChipId = activeChip ?? internalChip

  const onSelectChip = useCallback(
    (chip: MobileChartChip) => {
      if (chip.disabled) return
      if (activeChip === undefined) setInternalChip(chip.id)
      onChipChange?.(chip)
    },
    [activeChip, onChipChange]
  )

  const chipControls = chips.length ? (
    <div
      className="semiotic-mobile-chip-row"
      role="group"
      aria-label="Chart views"
    >
      {chips.map((chip) => {
        const selected = chip.id === selectedChipId
        return (
          <button
            key={chip.id}
            type="button"
            className="semiotic-mobile-chip"
            aria-pressed={selected}
            disabled={chip.disabled}
            onClick={() => onSelectChip(chip)}
            title={typeof chip.description === "string" ? chip.description : undefined}
          >
            <span>{chip.label}</span>
            {chip.description && (
              <small className="semiotic-mobile-chip-description">
                {chip.description}
              </small>
            )}
          </button>
        )
      })}
    </div>
  ) : null

  const summaryCard = mobileSummary || chipControls ? (
    <div className="semiotic-mobile-summary-card">
      {mobileSummary && (
        <div className="semiotic-mobile-summary-copy">{mobileSummary}</div>
      )}
      {chipControls}
    </div>
  ) : (
      mobile?.summary
    )

  const mergedMobile: ChartContainerMobileOptions = {
    breakpoint,
    chartMode,
    mobileInteraction,
    semantics: mobileSemantics,
    allowHorizontalScroll,
    hideToolbar,
    ...mobile,
    summary: summaryCard,
  }

  const childrenWithDefaults = useMemo(() => {
    if (!chartDefaults || !isValidElement(children)) return children
    const childProps = children.props as Record<string, unknown>
    const injected: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(chartDefaults)) {
      if (childProps[key] == null) injected[key] = value
    }
    return Object.keys(injected).length > 0
      ? cloneElement(
          children as React.ReactElement<Record<string, unknown>>,
          injected
        )
      : children
  }, [children, chartDefaults])

  const hasSheetDetail = !!detail && detailMode === "sheet"
  const hasInlineDetail = !!detail && detailMode === "inline"
  const detailsVisible = hasInlineDetail || (hasSheetDetail && detailOpen)

  useEffect(() => {
    if (hasSheetDetail && detailOpen) detailPanelRef.current?.focus()
  }, [detailOpen, hasSheetDetail])

  const detailToggle = hasSheetDetail ? (
    <button
      ref={detailToggleRef}
      type="button"
      className="semiotic-mobile-detail-toggle"
      aria-expanded={detailOpen}
      aria-controls={detailsVisible ? detailId : undefined}
      onClick={() => setDetailOpen((open) => !open)}
    >
      {detailOpen ? "Hide details" : "Show details"}
    </button>
  ) : null

  const mergedControls = controls || detailToggle ? (
    <div className="semiotic-mobile-control-stack">
      {controls}
      {detailToggle}
    </div>
  ) : undefined

  return (
    <div
      ref={containerRef}
      className="semiotic-mobile-chart-shell"
      data-semiotic-mobile-breakpoint={breakpoint}
    >
      {containerStyles}
      <ChartContainer
        {...containerProps}
        controls={mergedControls}
        mobile={mergedMobile}
      >
        {childrenWithDefaults}
      </ChartContainer>
      {detailsVisible && (
        <section
          ref={detailPanelRef}
          id={detailId}
          tabIndex={-1}
          className="semiotic-mobile-detail-panel"
          data-mode={detailMode}
          aria-label={typeof detailTitle === "string" ? detailTitle : "Chart details"}
          onKeyDown={(event) => {
            if (hasSheetDetail && event.key === "Escape") {
              event.preventDefault()
              event.stopPropagation()
              closeDetails()
            }
          }}
        >
          <div className="semiotic-mobile-detail-header">
            <span>{detailTitle}</span>
            {hasSheetDetail && (
              <button
                type="button"
                className="semiotic-mobile-detail-toggle"
                onClick={closeDetails}
              >
                Close
              </button>
            )}
          </div>
          <div className="semiotic-mobile-detail-body">{detail}</div>
        </section>
      )}
    </div>
  )
}

export default MobileChartContainer
