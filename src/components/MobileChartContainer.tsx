"use client"
import * as React from "react"
import { ChartContainer } from "./ChartContainer"
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
  /** Last-resort horizontal scroll fallback for legacy or intentionally wide charts. */
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
  const [internalChip, setInternalChip] = React.useState<string | undefined>(
    () => activeChip ?? chips.find((chip) => !chip.disabled)?.id
  )
  const [detailOpen, setDetailOpen] = React.useState(initialDetailOpen)

  React.useEffect(() => {
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

  const onSelectChip = React.useCallback(
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
      role="list"
      aria-label="Mobile chart controls"
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
  ) : mobile?.summary

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

  const childrenWithDefaults = React.useMemo(() => {
    if (!chartDefaults || !React.isValidElement(children)) return children
    const childProps = children.props as Record<string, unknown>
    const injected: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(chartDefaults)) {
      if (childProps[key] == null) injected[key] = value
    }
    return Object.keys(injected).length > 0
      ? React.cloneElement(
          children as React.ReactElement<Record<string, unknown>>,
          injected
        )
      : children
  }, [children, chartDefaults])

  const hasSheetDetail = !!detail && detailMode === "sheet"
  const hasInlineDetail = !!detail && detailMode === "inline"
  const detailsVisible = hasInlineDetail || (hasSheetDetail && detailOpen)

  const detailToggle = hasSheetDetail ? (
    <button
      type="button"
      className="semiotic-mobile-detail-toggle"
      aria-expanded={detailOpen}
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
    <div className="semiotic-mobile-chart-shell">
      <style>{`
        .semiotic-mobile-chart-shell {
          display: grid;
          gap: 10px;
          width: 100%;
        }
        .semiotic-mobile-summary-card {
          display: grid;
          gap: 10px;
        }
        .semiotic-mobile-summary-copy {
          font-size: 13px;
          line-height: 1.45;
        }
        .semiotic-mobile-chip-row {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 2px;
          -webkit-overflow-scrolling: touch;
        }
        .semiotic-mobile-chip {
          display: inline-flex;
          flex: 0 0 auto;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          min-height: 40px;
          min-width: 44px;
          border: 1px solid var(--semiotic-border, #d8d8d8);
          border-radius: 999px;
          padding: 7px 12px;
          background: var(--semiotic-bg, #fff);
          color: var(--semiotic-text, #222);
          font: inherit;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .semiotic-mobile-chip[aria-pressed="true"] {
          border-color: var(--semiotic-accent, #1f7a6d);
          background: color-mix(in srgb, var(--semiotic-accent, #1f7a6d) 14%, transparent);
        }
        .semiotic-mobile-chip:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }
        .semiotic-mobile-chip-description {
          display: block;
          max-width: 160px;
          margin-top: 2px;
          color: var(--semiotic-text-secondary, #666);
          font-size: 10px;
          font-weight: 500;
          line-height: 1.2;
        }
        .semiotic-mobile-control-stack {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .semiotic-mobile-detail-toggle {
          min-height: 32px;
          border: 1px solid var(--semiotic-border, #d8d8d8);
          border-radius: 999px;
          padding: 5px 10px;
          background: transparent;
          color: var(--semiotic-text, #222);
          font: inherit;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .semiotic-mobile-detail-panel {
          border: 1px solid var(--semiotic-border, #d8d8d8);
          border-radius: 16px;
          background: var(--semiotic-bg, #fff);
          color: var(--semiotic-text, #222);
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.16);
          overflow: hidden;
        }
        .semiotic-mobile-detail-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          border-bottom: 1px solid var(--semiotic-border, #d8d8d8);
          font-size: 13px;
          font-weight: 800;
        }
        .semiotic-mobile-detail-body {
          padding: 12px;
          font-size: 13px;
          line-height: 1.5;
        }
        @media (max-width: ${breakpoint}px) {
          .semiotic-mobile-detail-panel[data-mode="sheet"] {
            position: sticky;
            bottom: 8px;
            z-index: 2;
            max-height: min(55vh, 420px);
            overflow: auto;
          }
        }
      `}</style>
      <ChartContainer
        {...containerProps}
        controls={mergedControls}
        mobile={mergedMobile}
      >
        {childrenWithDefaults}
      </ChartContainer>
      {detailsVisible && (
        <section
          className="semiotic-mobile-detail-panel"
          data-mode={detailMode}
          aria-label={typeof detailTitle === "string" ? detailTitle : "Chart details"}
        >
          <div className="semiotic-mobile-detail-header">
            <span>{detailTitle}</span>
            {hasSheetDetail && (
              <button
                type="button"
                className="semiotic-mobile-detail-toggle"
                onClick={() => setDetailOpen(false)}
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
