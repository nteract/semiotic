"use client"

import * as React from "react"
import { SR_ONLY_STYLE } from "./AriaLiveTooltip"
import type { useAccessibleTableInteraction } from "./useAccessibleTableInteraction"
import {
  DATA_TABLE_HIDDEN_CLASS,
  DATA_TABLE_VISIBLE_CLASS,
  HIDDEN_TRIGGER_STYLE,
  VISIBLE_PANEL_STYLE,
  CLOSE_BUTTON_STYLE,
  SUMMARY_NOTE_STYLE
} from "./accessibleTableStyles"

/** One focusable shell for all accessible summary families and portal targets. */
export function AccessibleTableShell({
  interaction,
  tableId,
  regionLabel,
  countLabel,
  summary,
  children,
  className = DATA_TABLE_VISIBLE_CLASS
}: {
  interaction: ReturnType<typeof useAccessibleTableInteraction>
  tableId?: string
  regionLabel: string
  countLabel: string
  summary?: string
  children?: React.ReactNode
  className?: string
}) {
  const {
    isExpanded,
    containerRef,
    triggerRef,
    open,
    handleFocus,
    handleBlur,
    dismiss,
    announcement
  } = interaction
  return (
    <div
      ref={containerRef}
      id={tableId}
      className={isExpanded ? className : DATA_TABLE_HIDDEN_CLASS}
      tabIndex={-1}
      onFocus={isExpanded ? undefined : handleFocus}
      onBlur={isExpanded ? handleBlur : undefined}
      style={isExpanded ? VISIBLE_PANEL_STYLE : SR_ONLY_STYLE}
      role="region"
      aria-label={regionLabel}
    >
      {isExpanded ? (
        <>
          <div role="status" aria-atomic="true" style={SR_ONLY_STYLE}>
            {announcement}
          </div>
          <button
            type="button"
            className="semiotic-accessible-data-table-close"
            onClick={dismiss}
            aria-label="Close data summary"
            style={CLOSE_BUTTON_STYLE}
          >
            &times;
          </button>
          <div
            className="semiotic-accessible-data-table-summary"
            role="note"
            style={SUMMARY_NOTE_STYLE}
          >
            {summary}
          </div>
          {children}
        </>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={open}
          style={HIDDEN_TRIGGER_STYLE}
        >
          View data summary ({countLabel})
        </button>
      )}
    </div>
  )
}
