"use client"
import * as React from "react"
import { exportChart } from "./export/exportChart"
import { copyConfig as copyConfigFn } from "./export/chartConfig"
import type { ChartConfig, CopyFormat } from "./export/chartConfig"
import { ChartErrorBoundary } from "./ChartErrorBoundary"
import { DataSummaryProvider, useDataSummaryToggle } from "./DataSummaryContext"
import { describeChart, type DescribeLevel } from "./ai/describeChart"
import { buildNavigationTree } from "./ai/navigationTree"
import { AccessibleNavTree } from "./AccessibleNavTree"

const SR_ONLY: React.CSSProperties = {
  position: "absolute", width: 1, height: 1, overflow: "hidden",
  clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0, padding: 0, margin: -1,
}

export type ChartNotificationLevel =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "neutral"

/**
 * One entry in a ChartContainer's notification stack — chart-level context
 * that has no single mark to anchor to: an audit or data-pitfall finding, a
 * data-quality result that couldn't be placed on the plot, or any
 * user-authored notice about the chart as a whole.
 */
export interface ChartNotification {
  /** Stable identity — keys dismissal across re-renders. Falls back to the
   *  array index, so pass an `id` whenever the list can reorder or stream. */
  id?: string
  /** Maps to the theme's semantic role color. Default: "info". */
  level?: ChartNotificationLevel
  /** Short bold lead-in (e.g. the finding name). */
  title?: string
  /** Body content. */
  message: React.ReactNode
  /** Small uppercase origin tag (e.g. "datapitfalls · Graphical Gaffes"). */
  source?: string
  /** Default true. Set false for must-see notices that can't be dismissed. */
  dismissible?: boolean
}

export interface ChartContainerProps {
  /** Chart title */
  title?: string
  /** Subtitle / description */
  subtitle?: string
  /** Chart children (any Semiotic chart component) */
  children: React.ReactNode

  /** Width — passed to child chart if not set on child. Default: "100%" */
  width?: number | string
  /** Height of the chart area (excluding header). Default: 400 */
  height?: number

  /** Built-in actions. Each can be true (default config), false (hidden), or config object */
  actions?: {
    export?:
      | boolean
      | { format?: "svg" | "png"; scale?: number; filename?: string }
    fullscreen?: boolean
    /** Enable "Copy Config" action button. Requires chartConfig prop. */
    copyConfig?: boolean | { format?: CopyFormat }
    /** Enable "Data Summary" action button — shows statistical summary + sample rows */
    dataSummary?: boolean
  }
  /**
   * Chart configuration. Enables the "Copy Config" toolbar action and the
   * `describe`/`navigable` a11y affordances. Only `component` and `props` are
   * required — the `version`/`createdAt` serialization metadata is optional
   * here and synthesized when copying.
   */
  chartConfig?: Omit<ChartConfig, "version" | "createdAt"> &
    Partial<Pick<ChartConfig, "version" | "createdAt">>
  /**
   * Auto-generate a layered (L1–L3) natural-language description from
   * `chartConfig` and expose it at the container level — the opt-in path to a
   * fuller accessible reading than the bare chart's terse aria-label. Requires
   * `chartConfig`. `true` renders a screen-reader-only note; pass
   * `{ visible: true }` to also show it as a visible caption, or `{ levels }`
   * to choose verbosity. Backed by `describeChart()`.
   */
  describe?: boolean | { levels?: DescribeLevel[]; visible?: boolean }
  /**
   * Mount a structured, screen-reader-navigable tree of the chart (chart →
   * axes/series → data points), built from `chartConfig` — the Olli /
   * Data Navigator model, as an opt-in at the container layer. Requires
   * `chartConfig`. `true` renders it screen-reader-only; `{ visible: true }`
   * shows it; `{ maxLeaves }` caps leaves per branch. Backed by
   * `buildNavigationTree()` + `AccessibleNavTree`.
   */
  navigable?: boolean | { visible?: boolean; maxLeaves?: number }
  /** Additional controls rendered in the toolbar after built-in actions */
  controls?: React.ReactNode
  /**
   * Persistent content rendered between the header and chart body. Useful for
   * data-source notices, refresh actions, and other status banners that should
   * remain visible while the chart is loading.
   */
  banner?: React.ReactNode
  /**
   * Chart-level notices rendered as a dismissible, severity-leveled stack
   * between the header and the chart body — the surface for findings that
   * have no mark to anchor to (a data-pitfalls or audit finding about the
   * whole chart, an unplaceable data-quality result) and for any custom
   * user-authored notice. The stack is an `aria-live="polite"` status region,
   * so notifications that arrive while streaming are announced.
   */
  notifications?: ChartNotification[]
  /**
   * Called when a notification's dismiss button is clicked. Dismissal state
   * is tracked internally (keyed by `notification.id`, falling back to array
   * index) whether or not this is provided — use the callback to sync your
   * own store or telemetry.
   */
  onNotificationDismiss?: (notification: ChartNotification, index: number) => void

  /** Loading state — shows skeleton placeholder */
  loading?: boolean
  /** Error state — shows error message (overrides children) */
  error?: string | React.ReactNode
  /** Wrap children in ChartErrorBoundary */
  errorBoundary?: boolean

  /** Status indicator (wired to streaming staleness) */
  status?: "live" | "stale" | "paused" | "error" | "static"

  /** Details panel rendered alongside the chart (e.g. DetailsPanel component) */
  detailsPanel?: React.ReactNode

  /** CSS class for the outer container */
  className?: string
  /** Inline style overrides */
  style?: React.CSSProperties
}

export interface ChartContainerHandle {
  /** Export chart to SVG or PNG */
  export: (options?: {
    format?: "svg" | "png"
    scale?: number
    filename?: string
  }) => Promise<void>
  /** Toggle fullscreen */
  toggleFullscreen: () => void
  /** Copy chart config to clipboard */
  copyConfig: (format?: CopyFormat) => Promise<void>
  /** The chart container DOM element */
  element: HTMLDivElement | null
}

/** Toolbar button that toggles the data summary panel via context. */
function DataSummaryButton() {
  const toggle = useDataSummaryToggle()
  if (!toggle) return null
  return (
    <button
      className="semiotic-chart-action"
      onClick={toggle}
      title="Data summary"
      aria-label="Toggle data summary"
      style={actionButtonStyle}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="1" y="1" width="12" height="3" rx="0.5" />
        <rect x="1" y="6" width="8" height="3" rx="0.5" />
        <rect x="1" y="11" width="5" height="2" rx="0.5" />
      </svg>
    </button>
  )
}

const NOTIFICATION_LEVEL_COLORS: Record<ChartNotificationLevel, string> = {
  info: "var(--semiotic-info, #2563eb)",
  success: "var(--semiotic-success, #16a34a)",
  warning: "var(--semiotic-warning, #d97706)",
  error: "var(--semiotic-error, var(--semiotic-danger, #dc2626))",
  neutral: "var(--semiotic-text-secondary, #6b7280)",
}

/** Higher = more severe. The bell adopts the icon + color of the most severe
 *  currently-visible notification. */
const NOTIFICATION_LEVEL_SEVERITY: Record<ChartNotificationLevel, number> = {
  error: 4,
  warning: 3,
  info: 2,
  success: 1,
  neutral: 0,
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
    "aria-hidden": true,
  }
  switch (level) {
    case "error":
    case "warning":
      // Warning triangle — color separates error (red) from warning (amber).
      return (
        <svg {...common}>
          <path d="M8 1.8 15 14H1L8 1.8Z" />
          <path d="M8 6.4v3.4" />
          <circle cx="8" cy="11.8" r="0.5" fill="currentColor" stroke="none" />
        </svg>
      )
    case "success":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6.4" />
          <path d="M5 8.2 7 10.2 11 5.8" />
        </svg>
      )
    case "info":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6.4" />
          <path d="M8 7.4V11" />
          <circle cx="8" cy="5" r="0.5" fill="currentColor" stroke="none" />
        </svg>
      )
    case "neutral":
    default:
      // Bell — the neutral, conventional notification glyph.
      return (
        <svg {...common}>
          <path d="M8 2a3.5 3.5 0 0 0-3.5 3.5c0 4-1.5 5-1.5 5h10s-1.5-1-1.5-5A3.5 3.5 0 0 0 8 2Z" />
          <path d="M6.5 13a1.5 1.5 0 0 0 3 0" />
        </svg>
      )
  }
}

/**
 * A single notification card, as rendered inside the popover. Extracted so the
 * card markup stays identical to the pre-popover stack (same class hooks,
 * dismiss affordance, and level styling).
 */
function NotificationCard({
  notification,
  level,
  onDismiss,
}: {
  notification: ChartNotification
  level: ChartNotificationLevel
  onDismiss?: () => void
}) {
  const color = NOTIFICATION_LEVEL_COLORS[level] ?? NOTIFICATION_LEVEL_COLORS.info
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
        background: "var(--semiotic-surface, rgba(127, 127, 127, 0.08))",
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
              color: "var(--semiotic-text-secondary, #666)",
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
            color: "var(--semiotic-text, #333)",
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
            width: 18,
            height: 18,
            fontSize: 13,
            lineHeight: 1,
            flex: "none",
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
interface VisibleNotification {
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
function ChartNotificationBell({
  visible,
  onDismiss,
}: {
  visible: VisibleNotification[]
  onDismiss: (entry: VisibleNotification) => void
}) {
  const [open, setOpen] = React.useState(false)
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  // Collapse the popover once nothing is left to show.
  React.useEffect(() => {
    if (visible.length === 0 && open) setOpen(false)
  }, [visible.length, open])

  // Dismiss on outside click / Escape, returning focus to the toggle.
  React.useEffect(() => {
    if (!open) return
    const onDocPointer = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
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
            textAlign: "center",
          }}
        >
          {count > 99 ? "99+" : count}
        </span>
      </button>
      {open && (
        <div
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
            boxShadow: "0 6px 24px rgba(0, 0, 0, 0.16)",
          }}
        >
          {visible.map((entry) => (
            <NotificationCard
              key={entry.key}
              notification={entry.notification}
              level={entry.level}
              onDismiss={() => onDismiss(entry)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  live: { bg: "#22c55e", color: "#fff" },
  stale: { bg: "#ef4444", color: "#fff" },
  paused: { bg: "#eab308", color: "#000" },
  error: { bg: "#ef4444", color: "#fff" },
  static: { bg: "#6b7280", color: "#fff" },
}

function Skeleton({ height }: { height: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading chart"
      style={{
        width: "100%",
        height,
        background:
          "linear-gradient(90deg, var(--semiotic-border, #e0e0e0) 25%, var(--semiotic-bg, #f5f5f5) 50%, var(--semiotic-border, #e0e0e0) 75%)",
        backgroundSize: "200% 100%",
        animation: "semiotic-skeleton-pulse 1.5s ease-in-out infinite",
        borderRadius: 4,
      }}
    />
  )
}

function ErrorDisplay({ error }: { error: string | React.ReactNode }) {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        minHeight: 120,
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: 400,
          fontSize: 14,
          color: "var(--semiotic-text-secondary, #666)",
          lineHeight: 1.5,
        }}
      >
        {error}
      </div>
    </div>
  )
}

export const ChartContainer = React.forwardRef<
  ChartContainerHandle,
  ChartContainerProps
>(function ChartContainer(
  {
    title,
    subtitle,
    children,
    width = "100%",
    height = 400,
    actions,
    chartConfig,
    describe,
    navigable,
    controls,
    banner,
    notifications,
    onNotificationDismiss,
    loading = false,
    error,
    errorBoundary = false,
    status,
    detailsPanel,
    className,
    style,
  },
  ref
) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const chartBodyRef = React.useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = React.useState(false)

  // Notification dismissal lives here (above the bell) so `hasHeader` can react
  // to the visible count — an all-dismissed, notifications-only container must
  // not render an empty toolbar. Keyed by `notification.id`, array-index
  // fallback.
  const [dismissedNotifications, setDismissedNotifications] = React.useState<
    ReadonlySet<string>
  >(() => new Set<string>())

  // Prune keys that no longer exist in the current list so the set can't grow
  // unboundedly while notifications stream, and a removed notification's key
  // can't keep a fresh notification that later reuses it hidden.
  React.useEffect(() => {
    setDismissedNotifications((prev) => {
      if (prev.size === 0) return prev
      const currentKeys = new Set(
        (notifications ?? []).map((n, i) => n.id ?? String(i))
      )
      let changed = false
      const next = new Set<string>()
      for (const key of prev) {
        if (currentKeys.has(key)) next.add(key)
        else changed = true
      }
      return changed ? next : prev
    })
  }, [notifications])

  const visibleNotifications = React.useMemo<VisibleNotification[]>(() => {
    if (!notifications) return []
    return notifications
      .map((notification, index) => ({
        notification,
        index,
        key: notification.id ?? String(index),
        level: notification.level ?? "info",
      }))
      .filter(({ key }) => !dismissedNotifications.has(key))
  }, [notifications, dismissedNotifications])

  const handleNotificationDismiss = React.useCallback(
    (entry: VisibleNotification) => {
      setDismissedNotifications((prev) => new Set(prev).add(entry.key))
      onNotificationDismiss?.(entry.notification, entry.index)
    },
    [onNotificationDismiss]
  )

  const showExport = actions?.export !== false && actions?.export !== undefined
  const showFullscreen =
    actions?.fullscreen !== false && actions?.fullscreen !== undefined
  const showCopyConfig =
    actions?.copyConfig !== false && actions?.copyConfig !== undefined && chartConfig
  const showDataSummary = actions?.dataSummary === true

  // Opt-in auto-description (ChartContainer is the layer for full-accessibility
  // chrome — title, caption, description — rather than the bare chart).
  const describeText = React.useMemo(() => {
    if (!describe || !chartConfig?.component || !chartConfig?.props) return ""
    const levels = typeof describe === "object" ? describe.levels : undefined
    try {
      return describeChart(chartConfig.component, chartConfig.props, levels ? { levels } : {}).text
    } catch {
      return ""
    }
  }, [describe, chartConfig])
  const describeVisible = typeof describe === "object" && describe.visible === true

  // Opt-in structured navigation tree (Olli / Data Navigator model), built from
  // the same chartConfig and mounted at the container layer.
  const navTree = React.useMemo(() => {
    if (!navigable || !chartConfig?.component || !chartConfig?.props) return null
    const maxLeaves = typeof navigable === "object" ? navigable.maxLeaves : undefined
    try {
      return buildNavigationTree(chartConfig.component, chartConfig.props, maxLeaves ? { maxLeaves } : {})
    } catch {
      return null
    }
  }, [navigable, chartConfig])
  const navVisible = typeof navigable === "object" && navigable.visible === true

  const exportConfig = React.useMemo(
    () => (typeof actions?.export === "object" ? actions.export : {}),
    [actions?.export]
  )
  const copyConfigFormat =
    typeof actions?.copyConfig === "object" ? actions.copyConfig.format : "json"

  const handleExport = React.useCallback(async (options?: {
    format?: "svg" | "png"
    scale?: number
    filename?: string
  }) => {
    if (!chartBodyRef.current) return
    await exportChart(chartBodyRef.current, {
      ...exportConfig,
      ...options,
    })
  }, [exportConfig])

  const toggleFullscreen = React.useCallback(() => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }, [])

  const handleCopyConfig = React.useCallback(async (format?: CopyFormat) => {
    if (!chartConfig) return
    await copyConfigFn(
      {
        ...chartConfig,
        version: chartConfig.version ?? "1",
        createdAt: chartConfig.createdAt ?? new Date().toISOString(),
      },
      format || copyConfigFormat || "json"
    )
  }, [chartConfig, copyConfigFormat])

  React.useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleChange)
    return () => document.removeEventListener("fullscreenchange", handleChange)
  }, [])

  React.useImperativeHandle(
    ref,
    () => ({
      export: handleExport,
      toggleFullscreen,
      copyConfig: handleCopyConfig,
      element: containerRef.current,
    }),
    [handleExport, toggleFullscreen, handleCopyConfig]
  )

  const hasNotifications = visibleNotifications.length > 0
  const hasHeader = title || subtitle || controls || showExport || showFullscreen || showCopyConfig || showDataSummary || status || hasNotifications

  const innerContent = loading ? (
    <Skeleton height={height} />
  ) : error ? (
    <ErrorDisplay error={error} />
  ) : errorBoundary ? (
    <ChartErrorBoundary>{children}</ChartErrorBoundary>
  ) : (
    children
  )

  const wrapper = (node: React.ReactNode) =>
    showDataSummary ? <DataSummaryProvider>{node}</DataSummaryProvider> : node

  return wrapper(
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes semiotic-skeleton-pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}`,
        }}
      />
      <div
        ref={containerRef}
        className={
          "semiotic-chart-container" + (className ? ` ${className}` : "")
        }
        style={{
          width,
          border: "1px solid var(--semiotic-border, #e0e0e0)",
          borderRadius: "var(--semiotic-border-radius, 8px)",
          overflow: "hidden",
          background: "var(--semiotic-bg, #fff)",
          fontFamily: "var(--semiotic-font-family, sans-serif)",
          position: "relative",
          ...(isFullscreen
            ? {
                display: "flex",
                flexDirection: "column",
                width: "100%",
                height: "100%",
              }
            : {}),
          ...style,
        }}
      >
        {hasHeader && (
          <div
            className="semiotic-chart-header"
            style={{
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 8,
              borderBottom: "1px solid var(--semiotic-border, #e0e0e0)",
            }}
          >
            <div
              className="semiotic-chart-title-area"
              style={{ minWidth: 0, flex: "1 1 200px" }}
            >
              {title && (
                <div
                  className="semiotic-chart-title"
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--semiotic-text, #333)",
                  }}
                >
                  {title}
                </div>
              )}
              {subtitle && (
                <div
                  className="semiotic-chart-subtitle"
                  style={{
                    fontSize: 12,
                    color: "var(--semiotic-text-secondary, #666)",
                    marginTop: title ? 2 : 0,
                  }}
                >
                  {subtitle}
                </div>
              )}
            </div>
            <div
              className="semiotic-chart-toolbar"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginLeft: "auto",
              }}
            >
              {controls}
              {hasNotifications && (
                <ChartNotificationBell
                  visible={visibleNotifications}
                  onDismiss={handleNotificationDismiss}
                />
              )}
              {showExport && (
                <button
                  className="semiotic-chart-action"
                  onClick={() => handleExport()}
                  title="Export chart"
                  aria-label="Export chart"
                  style={actionButtonStyle}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 2v8M3.5 7L7 10.5 10.5 7" />
                    <path d="M2 12h10" />
                  </svg>
                </button>
              )}
              {showDataSummary && <DataSummaryButton />}
              {showFullscreen && (
                <button
                  className="semiotic-chart-action"
                  onClick={toggleFullscreen}
                  title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  style={actionButtonStyle}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {isFullscreen ? (
                      <>
                        <path d="M9 1v4h4" />
                        <path d="M5 13V9H1" />
                        <path d="M13 5H9V1" />
                        <path d="M1 9h4v4" />
                      </>
                    ) : (
                      <>
                        <path d="M1 5V1h4" />
                        <path d="M13 9v4H9" />
                        <path d="M9 1h4v4" />
                        <path d="M5 13H1V9" />
                      </>
                    )}
                  </svg>
                </button>
              )}
              {showCopyConfig && (
                <button
                  className="semiotic-chart-action"
                  onClick={() => handleCopyConfig()}
                  title="Copy config"
                  aria-label="Copy chart configuration"
                  style={actionButtonStyle}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="5" y="5" width="8" height="8" rx="1" />
                    <path d="M9 5V2a1 1 0 00-1-1H2a1 1 0 00-1 1v6a1 1 0 001 1h3" />
                  </svg>
                </button>
              )}
              {status && (
                <div
                  className="semiotic-chart-status"
                  aria-live="polite"
                  aria-atomic="true"
                  style={{
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    background: STATUS_COLORS[status].bg,
                    color: STATUS_COLORS[status].color,
                    lineHeight: "18px",
                  }}
                >
                  {status}
                </div>
              )}
            </div>
          </div>
        )}

        {banner && (
          <div className="semiotic-chart-banner">
            {banner}
          </div>
        )}

        {describeText && (
          <div
            className="semiotic-chart-description"
            role="note"
            style={describeVisible ? {
              padding: "8px 16px",
              fontSize: 12,
              lineHeight: 1.5,
              color: "var(--semiotic-text-secondary, #666)",
              borderBottom: "1px solid var(--semiotic-border, #e0e0e0)",
            } : SR_ONLY}
          >
            {describeText}
          </div>
        )}

        {navTree && (
          <div
            className="semiotic-chart-nav"
            style={navVisible ? {
              padding: "8px 8px",
              borderBottom: "1px solid var(--semiotic-border, #e0e0e0)",
              maxHeight: 240,
              overflow: "auto",
            } : undefined}
          >
            <AccessibleNavTree
              tree={navTree}
              label={typeof title === "string" && title ? `${title} — navigable structure` : "Chart navigable structure"}
              visible={navVisible}
              chartId={typeof chartConfig?.props?.chartId === "string" ? chartConfig.props.chartId : undefined}
            />
          </div>
        )}

        <div
          className="semiotic-chart-body"
          ref={chartBodyRef}
          style={{
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            ...(isFullscreen ? { flex: 1 } : { height }),
          }}
        >
          {innerContent}
          {detailsPanel}
        </div>

      </div>
    </>
  )
})

const actionButtonStyle: React.CSSProperties = {
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
}
