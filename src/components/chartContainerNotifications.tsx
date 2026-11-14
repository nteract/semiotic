"use client"
import type * as React from "react"
import { useEffect, useId, useRef, useState } from "react"
import type {
  ChartNotification,
  ChartNotificationLevel
} from "./ChartContainer"
import { chartActionButtonStyle as actionButtonStyle } from "./chartContainerStyles"
import { SR_ONLY_STYLE as SR_ONLY } from "./screenReaderStyles"

const NOTIFICATION_LEVEL_COLORS: Record<ChartNotificationLevel, string> = {
  info: "var(--semiotic-info, #2563eb)",
  success: "var(--semiotic-success, #16a34a)",
  warning: "var(--semiotic-warning, #d97706)",
  error: "var(--semiotic-error, var(--semiotic-danger, #dc2626))",
  neutral: "var(--semiotic-text-secondary, #6b7280)"
}

/** Higher = more severe. The bell adopts the icon + color of the most severe
 *  currently-visible notification. */
const NOTIFICATION_LEVEL_SEVERITY: Record<ChartNotificationLevel, number> = {
  error: 4,
  warning: 3,
  info: 2,
  success: 1,
  neutral: 0
}

/** The glyph shown on the bell, chosen by the most severe visible level so the
 *  toolbar icon telegraphs severity at a glance. Uses `currentColor` so the
 *  caller can tint it with the level color. */
function NotificationLevelIcon({ level }: { level: ChartNotificationLevel }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true
  }
  const warning = level === "error" || level === "warning"
  const round = level === "info" || level === "success"
  const path = warning
    ? "M8 1.8 15 14H1L8 1.8Z M8 6.4v3.4"
    : level === "success"
      ? "M5 8.2 7 10.2 11 5.8"
      : level === "info"
        ? "M8 7.4V11"
        : "M8 2a3.5 3.5 0 0 0-3.5 3.5c0 4-1.5 5-1.5 5h10s-1.5-1-1.5-5A3.5 3.5 0 0 0 8 2Z M6.5 13a1.5 1.5 0 0 0 3 0"
  return (
    <svg {...common}>
      {round && <circle cx="8" cy="8" r="6.4" />}
      <path d={path} />
      {(warning || level === "info") && (
        <circle
          cx="8"
          cy={warning ? "11.8" : "5"}
          r="0.5"
          fill="currentColor"
          stroke="none"
        />
      )}
    </svg>
  )
}

/**
 * A single notification card, as rendered inside the popover, with its class
 * hooks, dismiss affordance, and level styling.
 */
function NotificationCard({
  notification,
  level,
  onDismiss
}: {
  notification: ChartNotification
  level: ChartNotificationLevel
  onDismiss?: () => void
}) {
  const color =
    NOTIFICATION_LEVEL_COLORS[level] ?? NOTIFICATION_LEVEL_COLORS.info
  const dismissible = notification.dismissible !== false
  return (
    <div
      className={`semiotic-chart-notification semiotic-chart-notification--${level}`}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 4,
        borderLeft: `3px solid ${color}`,
        background: "var(--semiotic-surface, rgba(127, 127, 127, 0.08))"
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {notification.source && (
          <div
            className="semiotic-chart-notification-source"
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--semiotic-text-secondary, #666)"
            }}
          >
            {notification.source}
          </div>
        )}
        {notification.title && (
          <div
            className="semiotic-chart-notification-title"
            style={{ fontSize: 12, fontWeight: 600, color }}
          >
            {notification.title}
          </div>
        )}
        <div
          className="semiotic-chart-notification-message"
          style={{
            fontSize: 12,
            lineHeight: 1.45,
            color: "var(--semiotic-text, #333)"
          }}
        >
          {notification.message}
        </div>
      </div>
      {dismissible && (
        <button
          className="semiotic-chart-notification-dismiss"
          aria-label={
            notification.title
              ? `Dismiss notification: ${notification.title}`
              : "Dismiss notification"
          }
          title="Dismiss"
          onClick={onDismiss}
          style={{
            ...actionButtonStyle,
            width: 24,
            height: 24,
            fontSize: 13,
            lineHeight: 1,
            flex: "none"
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}

/** A notification paired with the resolved key + level the bell renders with.
 *  Computed once by the container so `hasHeader` and the bell agree on the
 *  visible set (dismissal state lives in the container, above the bell). */
export interface VisibleNotification {
  notification: ChartNotification
  index: number
  key: string
  level: ChartNotificationLevel
}

/**
 * The notifications affordance: a compact toolbar bell carrying a count badge
 * and the icon + color of the most severe visible notification. Clicking it
 * opens a popover with the full notification cards — an overlay, so arriving or
 * dismissing notices never reflows the chart body (no layout swirl).
 *
 * Presentational: the container owns dismissal state and passes the already-
 * filtered `visible` set, so the header can hide itself once every notification
 * has been dismissed. Also renders a screen-reader-only live region that
 * announces the current count + most-severe level, so streamed notifications
 * are still voiced while the popover is collapsed.
 */
export function ChartNotificationBell({
  visible,
  onDismiss,
  fallbackFocusRef
}: {
  visible: VisibleNotification[]
  onDismiss: (entry: VisibleNotification) => void
  fallbackFocusRef: React.RefObject<HTMLDivElement | null>
}) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const dialogId = useId()

  useEffect(() => {
    if (open) popoverRef.current?.focus({ preventScroll: true })
  }, [open])

  const dismiss = (entry: VisibleNotification) => {
    const popover = popoverRef.current
    if (popover?.contains(popover.ownerDocument.activeElement)) {
      const buttons = [
        ...popover.querySelectorAll<HTMLButtonElement>(
          ".semiotic-chart-notification-dismiss"
        )
      ]
      const index = visible
        .filter(({ notification }) => notification.dismissible !== false)
        .findIndex(({ key }) => key === entry.key)
      const next = buttons[index + 1] ?? buttons[index - 1]
      // Move before React removes the card (and possibly the whole header).
      const target =
        next ??
        (visible.length > 1 ? buttonRef.current : fallbackFocusRef.current)
      target?.focus({ preventScroll: true })
    }
    onDismiss(entry)
  }

  // Collapse the popover once nothing is left to show.
  useEffect(() => {
    if (visible.length === 0 && open) setOpen(false)
  }, [visible.length, open])

  // Dismiss on outside click / Escape, returning focus to the toggle.
  useEffect(() => {
    if (!open) return
    const onDocPointer = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    const document = wrapperRef.current!.ownerDocument
    document.addEventListener("mousedown", onDocPointer)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onDocPointer)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  if (visible.length === 0) return null

  const mostSevere = visible.reduce<ChartNotificationLevel>(
    (acc, v) =>
      NOTIFICATION_LEVEL_SEVERITY[v.level] > NOTIFICATION_LEVEL_SEVERITY[acc]
        ? v.level
        : acc,
    visible[0].level
  )
  const color =
    NOTIFICATION_LEVEL_COLORS[mostSevere] ?? NOTIFICATION_LEVEL_COLORS.info
  const count = visible.length
  const summary = `${count} chart notification${
    count === 1 ? "" : "s"
  }, most severe: ${mostSevere}`

  return (
    <div
      ref={wrapperRef}
      className="semiotic-chart-notifications"
      style={{ position: "relative", display: "inline-flex" }}
    >
      <span style={SR_ONLY} role="status" aria-live="polite">
        {summary}
      </span>
      <button
        ref={buttonRef}
        className="semiotic-chart-action semiotic-chart-notifications-toggle"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        aria-label={`${summary}. ${open ? "Hide" : "Show"} notifications`}
        title={summary}
        onClick={() => setOpen((o) => !o)}
        style={{ ...actionButtonStyle, color, position: "relative" }}
      >
        <NotificationLevelIcon level={mostSevere} />
        <span
          className="semiotic-chart-notifications-badge"
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -3,
            right: -3,
            minWidth: 15,
            height: 15,
            padding: "0 3px",
            boxSizing: "border-box",
            borderRadius: 8,
            background: color,
            color: "#fff",
            fontSize: 9,
            fontWeight: 700,
            lineHeight: "15px",
            textAlign: "center"
          }}
        >
          {count > 99 ? "99+" : count}
        </span>
      </button>
      {open && (
        <div
          ref={popoverRef}
          id={dialogId}
          tabIndex={-1}
          className="semiotic-chart-notifications-popover"
          role="dialog"
          aria-label="Chart notifications"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 20,
            width: 320,
            maxWidth: "min(360px, 90vw)",
            maxHeight: 320,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: 10,
            textAlign: "left",
            background: "var(--semiotic-bg, #fff)",
            border: "1px solid var(--semiotic-border, #e0e0e0)",
            borderRadius: 6,
            boxShadow: "0 6px 24px rgba(0, 0, 0, 0.16)"
          }}
        >
          {visible.map((entry) => (
            <NotificationCard
              key={entry.key}
              notification={entry.notification}
              level={entry.level}
              onDismiss={() => dismiss(entry)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
