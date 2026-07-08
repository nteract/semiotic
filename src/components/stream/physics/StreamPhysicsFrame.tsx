"use client"

import * as React from "react"
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useId,
  useRef
} from "react"
import type { FrameGraphicsProp, FrameMargin } from "../useFrame"
import { useFrame } from "../useFrame"
import {
  useHydration,
  useHydrationLifecycle,
  useWasHydratingFromSSR
} from "../useHydration"
import { isServerEnvironment } from "../SceneToSVG"
import { getDevicePixelRatio, prepareCanvas } from "../canvasSetup"
import type { Style } from "../types"
import { useDataSummary } from "../../DataSummaryContext"
import { defaultTooltipStyle } from "../../Tooltip/Tooltip"
import { FlippingTooltip } from "../../Tooltip/FlippingTooltip"
import { resolvePhysicsCanvasTheme } from "./PhysicsCanvasTheme"
import type { PhysicsBodyState } from "./PhysicsKernel"
import {
  PhysicsWorkerSession,
  canUsePhysicsWorker
} from "./PhysicsWorkerClient"
import {
  PhysicsPipelineStore,
  type PhysicsPipelineConfig,
  type PhysicsPipelineControlSurface,
  type PhysicsPipelineSnapshot,
  type PhysicsPipelineTickResult,
  type PhysicsQueuedSpawn,
  type PhysicsSpawnPacingOptions,
  type PhysicsSimulationState
} from "./PhysicsPipelineStore"
import { renderPhysicsSettledSVG } from "./PhysicsSettledSVG"
import {
  DEFAULT_PHYSICS_WORKER_BODY_THRESHOLD,
  isPhysicsWorkerConfigSupported,
  isPhysicsWorkerPacingSupported,
  shouldUsePhysicsWorker,
  type PhysicsExecution,
  type PhysicsWorkerCommand,
  type PhysicsWorkerFrame,
  type PhysicsWorkerResponsePayload
} from "./PhysicsWorkerProtocol"
import { FocusRing, type FocusRingProps } from "../FocusRing"
import {
  AriaLiveTooltip,
  ScreenReaderSummary,
  SkipToTableLink
} from "../AccessibleDataTable"

const DEFAULT_SIZE: [number, number] = [640, 360]
const DEFAULT_MARGIN: FrameMargin = { top: 0, right: 0, bottom: 0, left: 0 }
const NAV_KEYS = new Set([
  "ArrowRight",
  "ArrowLeft",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown"
])
const SR_ONLY_STYLE: React.CSSProperties = {
  border: 0,
  clip: "rect(0 0 0 0)",
  height: 1,
  margin: -1,
  overflow: "hidden",
  padding: 0,
  position: "absolute",
  whiteSpace: "nowrap",
  width: 1
}
const PHYSICS_TABLE_SAMPLE_SIZE = 5
const PHYSICS_TABLE_PAGE_SIZE = 25
const DATA_TABLE_CLASS = "semiotic-accessible-data-table"
const DATA_TABLE_HIDDEN_CLASS = `${DATA_TABLE_CLASS} semiotic-accessible-data-table-hidden`
const DATA_TABLE_VISIBLE_CLASS = `${DATA_TABLE_CLASS} semiotic-accessible-data-table-visible`

const TABLE_PANEL_STYLE: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  zIndex:
    "var(--semiotic-data-table-z-index, var(--semiotic-overlay-z-index, 20))",
  padding: "14px 16px 12px",
  borderBottom:
    "1px solid var(--semiotic-data-table-border, var(--semiotic-border, #e0e0e0))",
  fontFamily:
    "var(--semiotic-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
  fontSize: 13,
  lineHeight: 1.5,
  color: "var(--semiotic-data-table-text, var(--semiotic-text, #333))",
  background:
    "var(--semiotic-data-table-bg, var(--semiotic-surface, var(--semiotic-bg, #fff)))",
  borderRadius:
    "var(--semiotic-border-radius, 0px) var(--semiotic-border-radius, 0px) 0 0"
}

const TABLE_SUMMARY_STYLE: React.CSSProperties = {
  marginBottom: 8,
  paddingRight: 28,
  color:
    "var(--semiotic-data-table-muted-text, var(--semiotic-text-secondary, #666))",
  fontSize: 12,
  letterSpacing: "0.01em"
}

const TABLE_CLOSE_STYLE: React.CSSProperties = {
  position: "absolute",
  top: 10,
  right: 10,
  width: 22,
  height: 22,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border:
    "1px solid var(--semiotic-data-table-border, var(--semiotic-border, #e0e0e0))",
  background:
    "var(--semiotic-data-table-bg, var(--semiotic-surface, var(--semiotic-bg, #fff)))",
  cursor: "pointer",
  color:
    "var(--semiotic-data-table-muted-text, var(--semiotic-text-secondary, #666))",
  fontSize: 13,
  lineHeight: 1,
  padding: 0,
  borderRadius: "var(--semiotic-border-radius, 4px)"
}

const TABLE_STYLE: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 12,
  marginTop: 4,
  fontVariantNumeric: "tabular-nums"
}

const TABLE_TH_STYLE: React.CSSProperties = {
  textAlign: "left",
  padding: "5px 10px",
  borderBottom:
    "2px solid var(--semiotic-data-table-border, var(--semiotic-border, #e0e0e0))",
  fontWeight: 600,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color:
    "var(--semiotic-data-table-muted-text, var(--semiotic-text-secondary, #666))"
}

const TABLE_TD_STYLE: React.CSSProperties = {
  padding: "4px 10px",
  borderBottom:
    "1px solid var(--semiotic-data-table-border, var(--semiotic-border, #e0e0e0))"
}

const TABLE_CAPTION_STYLE: React.CSSProperties = {
  textAlign: "left",
  fontSize: 11,
  color:
    "var(--semiotic-data-table-muted-text, var(--semiotic-text-secondary, #666))",
  marginBottom: 4,
  fontStyle: "italic"
}

const TABLE_SHOW_MORE_STYLE: React.CSSProperties = {
  marginTop: 8,
  padding: "4px 10px",
  fontSize: 12,
  cursor: "pointer",
  border:
    "1px solid var(--semiotic-data-table-border, var(--semiotic-border, #e0e0e0))",
  borderRadius: "var(--semiotic-border-radius, 4px)",
  background:
    "var(--semiotic-data-table-bg, var(--semiotic-surface, var(--semiotic-bg, #fff)))",
  color: "var(--semiotic-data-table-text, var(--semiotic-text, #333))",
  fontFamily: "inherit"
}

export interface PhysicsBodySelection {
  isActive?: boolean
  predicate?: (body: PhysicsBodyState) => boolean
}

export interface PhysicsBodyStyleContext {
  selected: boolean
  simulationState: PhysicsSimulationState
}

export interface StreamPhysicsExecutionState {
  execution: "sync" | "worker"
  liveBodies: number
  queuedBodies: number
  reason?: string
  requested: PhysicsExecution
}

export interface PhysicsSemanticItem {
  id?: string
  label: string
  description?: string
  datum?: unknown
  x: number
  y: number
  shape?: FocusRingProps["shape"]
  width?: number
  height?: number
  pathData?: string
  group?: string
}

export interface PhysicsHoverData {
  __semioticHoverData: true
  body: PhysicsBodyState
  data: unknown
  id: string
  type: "body"
  x: number
  y: number
}

export interface StreamPhysicsFrameProps {
  accessibleTable?: boolean
  backgroundGraphics?: FrameGraphicsProp
  bodyStyle?:
    | Style
    | ((body: PhysicsBodyState, context: PhysicsBodyStyleContext) => Style)
  className?: string
  config?: PhysicsPipelineConfig
  description?: string
  enableHover?: boolean
  foregroundGraphics?: FrameGraphicsProp
  hoverRadius?: number
  initialSpawns?: PhysicsQueuedSpawn[]
  initialSpawnPacing?: PhysicsSpawnPacingOptions
  margin?: Partial<FrameMargin>
  onSimulationExecutionChange?: (state: StreamPhysicsExecutionState) => void
  onBodyPointerDown?: (
    body: PhysicsBodyState | null,
    event: React.PointerEvent<HTMLCanvasElement>
  ) => void
  onBodyHover?: (
    body: PhysicsBodyState | null,
    hover: PhysicsHoverData | null
  ) => void
  onSemanticItemActivate?: (item: PhysicsSemanticItem) => void
  onSemanticItemFocus?: (item: PhysicsSemanticItem | null) => void
  onTick?: (
    result: PhysicsPipelineTickResult,
    controls: PhysicsPipelineControlSurface
  ) => void
  paused?: boolean
  responsiveHeight?: boolean
  responsiveWidth?: boolean
  selectedBodyStyle?:
    | Style
    | ((body: PhysicsBodyState, context: PhysicsBodyStyleContext) => Style)
  selection?: PhysicsBodySelection | null
  semanticItems?: PhysicsSemanticItem[]
  simulationExecution?: PhysicsExecution
  size?: [number, number]
  summary?: string
  suspendWhenHidden?: boolean
  title?: string
  tooltipContent?: (hover: PhysicsHoverData) => React.ReactNode
  workerBodyThreshold?: number
}

export interface StreamPhysicsFrameHandle
  extends PhysicsPipelineControlSurface {
  getData: () => PhysicsBodyState[]
  getStore: () => PhysicsPipelineStore
}

function createStore(
  config: PhysicsPipelineConfig | undefined,
  initialSpawns: PhysicsQueuedSpawn[] | undefined,
  initialSpawnPacing: PhysicsSpawnPacingOptions | undefined
): PhysicsPipelineStore {
  const store = new PhysicsPipelineStore(config)
  if (initialSpawns?.length) {
    store.enqueue(initialSpawns, initialSpawnPacing)
  }
  return store
}

function isSelected(
  body: PhysicsBodyState,
  selection: PhysicsBodySelection | null | undefined
): boolean {
  if (!selection?.isActive) return false
  return selection.predicate?.(body) ?? true
}

function resolveStyle(
  body: PhysicsBodyState,
  simulationState: PhysicsSimulationState,
  bodyStyle: StreamPhysicsFrameProps["bodyStyle"],
  selectedBodyStyle: StreamPhysicsFrameProps["selectedBodyStyle"],
  selection: StreamPhysicsFrameProps["selection"],
  fallbackFill: string,
  fallbackStroke: string
): Style {
  const selected = isSelected(body, selection)
  const context = { selected, simulationState }
  const base =
    typeof bodyStyle === "function" ? bodyStyle(body, context) : bodyStyle
  const selectedPatch = selected
    ? typeof selectedBodyStyle === "function"
      ? selectedBodyStyle(body, context)
      : selectedBodyStyle
    : undefined

  return {
    fill: fallbackFill,
    stroke: fallbackStroke,
    strokeWidth: 1,
    opacity: 0.9,
    ...base,
    ...selectedPatch
  }
}

function drawBody(
  ctx: CanvasRenderingContext2D,
  body: PhysicsBodyState,
  style: Style
): void {
  const fill = style.fill ?? "#4e79a7"
  const stroke = style.stroke
  const strokeWidth = style.strokeWidth ?? 0
  const opacity = style.opacity ?? 1
  const fillOpacity = style.fillOpacity ?? 1

  ctx.save()
  ctx.globalAlpha *= opacity
  ctx.beginPath()
  if (body.shape.type === "circle") {
    const radius = style.r ?? body.shape.radius
    ctx.arc(body.x, body.y, radius, 0, Math.PI * 2)
  } else {
    ctx.rect(
      body.x - body.shape.width / 2,
      body.y - body.shape.height / 2,
      body.shape.width,
      body.shape.height
    )
  }

  if (fill) {
    ctx.save()
    ctx.globalAlpha *= fillOpacity
    ctx.fillStyle = fill
    ctx.fill()
    ctx.restore()
  }
  if (stroke && strokeWidth > 0) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = strokeWidth
    if (style.strokeDasharray) {
      ctx.setLineDash(
        style.strokeDasharray
          .split(/[,\s]+/)
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value))
      )
    }
    ctx.stroke()
  }
  ctx.restore()
}

function documentIsVisible(): boolean {
  return typeof document === "undefined" ? true : !document.hidden
}

function primitiveValueText(value: unknown): string | null {
  if (value == null) return null
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value)
  }
  return null
}

function physicsHoverData(body: PhysicsBodyState): PhysicsHoverData {
  return {
    __semioticHoverData: true,
    body,
    data: body.datum ?? body,
    id: body.id,
    type: "body",
    x: body.x,
    y: body.y
  }
}

function physicsTooltipRows(data: unknown): Array<[string, string]> {
  if (!data || typeof data !== "object") return []
  return Object.entries(data as Record<string, unknown>)
    .map(([key, value]) => {
      if (key.startsWith("_")) return null
      const text = primitiveValueText(value)
      return text == null ? null : [key, text] as [string, string]
    })
    .filter((entry): entry is [string, string] => entry != null)
    .slice(0, 8)
}

function DefaultPhysicsTooltip({
  hover
}: {
  hover: PhysicsHoverData
}): React.ReactElement {
  const rows = physicsTooltipRows(hover.data)
  return (
    <div className="semiotic-tooltip" style={defaultTooltipStyle}>
      <div style={{ fontWeight: 700, marginBottom: rows.length ? 4 : 0 }}>
        {hover.id}
      </div>
      {rows.map(([key, value]) => (
        <div key={key}>
          <span style={{ opacity: 0.72 }}>{key}: </span>
          <span>{value}</span>
        </div>
      ))}
    </div>
  )
}

function semanticItemDataText(item: PhysicsSemanticItem): string {
  if (!item.datum || typeof item.datum !== "object") return ""
  return Object.entries(item.datum as Record<string, unknown>)
    .map(([key, value]) => {
      const text = primitiveValueText(value)
      return text == null ? null : `${key}: ${text}`
    })
    .filter((entry): entry is string => entry != null)
    .slice(0, 8)
    .join(", ")
}

function semanticItemsSummary(items: readonly PhysicsSemanticItem[]): string {
  const parts = [
    `${items.length} semantic item${items.length === 1 ? "" : "s"}.`
  ]
  const groups = new Map<string, number>()
  for (const item of items) {
    if (!item.group) continue
    groups.set(item.group, (groups.get(item.group) ?? 0) + 1)
  }
  if (groups.size) {
    parts.push(
      Array.from(groups)
        .map(([group, count]) => `${group}: ${count}`)
        .join(", ")
    )
  }
  return parts.join(" ")
}

function PhysicsSemanticDataTable(props: {
  chartTitle?: string
  items: readonly PhysicsSemanticItem[]
  tableId: string
}): React.ReactElement {
  const { chartTitle, items, tableId } = props
  const [srExpanded, setSrExpanded] = React.useState(false)
  const [visibleCount, setVisibleCount] = React.useState(
    PHYSICS_TABLE_SAMPLE_SIZE
  )
  const dataSummary = useDataSummary()
  const visible = dataSummary?.visible ?? false
  const isExpanded = srExpanded || visible
  const containerRef = React.useRef<HTMLDivElement>(null)
  const regionLabel = `Data summary for ${chartTitle ?? "physics chart"}`

  React.useEffect(() => {
    if (!isExpanded) setVisibleCount(PHYSICS_TABLE_SAMPLE_SIZE)
  }, [isExpanded])

  const handleFocus = React.useCallback(
    (event: React.FocusEvent) => {
      if (event.target !== event.currentTarget) return
      if (!srExpanded && !visible) setSrExpanded(true)
    },
    [srExpanded, visible]
  )

  const handleBlur = React.useCallback(
    (event: React.FocusEvent) => {
      if (visible) return
      if (containerRef.current?.contains(event.relatedTarget as Node)) return
      setSrExpanded(false)
    },
    [visible]
  )

  if (!items.length) {
    return <span id={tableId} tabIndex={-1} style={SR_ONLY_STYLE} />
  }

  if (!isExpanded) {
    return (
      <div
        id={tableId}
        className={DATA_TABLE_HIDDEN_CLASS}
        role="region"
        aria-label={regionLabel}
        tabIndex={-1}
        style={SR_ONLY_STYLE}
        onFocus={handleFocus}
      >
        <button type="button" onClick={() => setSrExpanded(true)}>
          View data summary ({items.length} semantic items)
        </button>
      </div>
    )
  }

  const shownCount = Math.min(visibleCount, items.length)
  const sampleItems = items.slice(0, shownCount)
  const remaining = items.length - shownCount
  const dismiss = () => {
    if (visible && dataSummary) dataSummary.setVisible(false)
    setSrExpanded(false)
  }
  const showMore = () => setVisibleCount((count) => count + PHYSICS_TABLE_PAGE_SIZE)

  return (
    <div
      ref={containerRef}
      id={tableId}
      className={DATA_TABLE_VISIBLE_CLASS}
      role="region"
      aria-label={regionLabel}
      tabIndex={-1}
      onBlur={handleBlur}
      style={TABLE_PANEL_STYLE}
    >
      <button
        type="button"
        className="semiotic-accessible-data-table-close"
        aria-label="Close data summary"
        onClick={dismiss}
        style={TABLE_CLOSE_STYLE}
      >
        &times;
      </button>
      <div
        className="semiotic-accessible-data-table-summary"
        role="note"
        style={TABLE_SUMMARY_STYLE}
      >
        {semanticItemsSummary(items)}
      </div>
      <table
        className="semiotic-accessible-data-table-table"
        role="table"
        aria-label={`Semantic items for ${chartTitle ?? "physics chart"}`}
        style={TABLE_STYLE}
      >
        <caption
          className="semiotic-accessible-data-table-caption"
          style={TABLE_CAPTION_STYLE}
        >
          {remaining > 0
            ? `First ${shownCount} of ${items.length} semantic items`
            : `All ${items.length} semantic items`}
        </caption>
        <thead>
          <tr>
            <th scope="col" style={TABLE_TH_STYLE}>
              Item
            </th>
            <th scope="col" style={TABLE_TH_STYLE}>
              Description
            </th>
            <th scope="col" style={TABLE_TH_STYLE}>
              Group
            </th>
            <th scope="col" style={TABLE_TH_STYLE}>
              Position
            </th>
            <th scope="col" style={TABLE_TH_STYLE}>
              Data
            </th>
          </tr>
        </thead>
        <tbody>
          {sampleItems.map((item, index) => (
            <tr key={item.id ?? `${item.label}-${index}`}>
              <th scope="row" style={TABLE_TD_STYLE}>
                {item.label}
              </th>
              <td style={TABLE_TD_STYLE}>{item.description ?? item.label}</td>
              <td style={TABLE_TD_STYLE}>{item.group ?? ""}</td>
              <td style={TABLE_TD_STYLE}>
                {Math.round(item.x)}, {Math.round(item.y)}
              </td>
              <td style={TABLE_TD_STYLE}>{semanticItemDataText(item)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {remaining > 0 ? (
        <button
          type="button"
          className="semiotic-accessible-data-table-show-more"
          onClick={showMore}
          style={TABLE_SHOW_MORE_STYLE}
        >
          Show {Math.min(PHYSICS_TABLE_PAGE_SIZE, remaining)} more{" "}
          {remaining === 1 ? "row" : "rows"} ({remaining} remaining)
        </button>
      ) : null}
    </div>
  )
}

export const StreamPhysicsFrame = forwardRef<
  StreamPhysicsFrameHandle,
  StreamPhysicsFrameProps
>(function StreamPhysicsFrame(props, ref) {
  const {
    accessibleTable = true,
    backgroundGraphics,
    bodyStyle,
    className,
    config,
    description,
    enableHover = true,
    foregroundGraphics,
    hoverRadius = 16,
    initialSpawns,
    initialSpawnPacing,
    margin: marginProp,
    onSimulationExecutionChange,
    onBodyHover,
    onBodyPointerDown,
    onSemanticItemActivate,
    onSemanticItemFocus,
    onTick,
    paused = false,
    responsiveHeight,
    responsiveWidth,
    selectedBodyStyle = {
      stroke: "#111827",
      strokeWidth: 2,
      opacity: 1
    },
    selection,
    semanticItems = [],
    simulationExecution = "auto",
    size: sizeProp = DEFAULT_SIZE,
    summary,
    suspendWhenHidden = true,
    title,
    tooltipContent,
    workerBodyThreshold = DEFAULT_PHYSICS_WORKER_BODY_THRESHOLD
  } = props

  const storeRef = useRef<PhysicsPipelineStore | null>(null)
  if (!storeRef.current) {
    storeRef.current = createStore(config, initialSpawns, initialSpawnPacing)
  }

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const semanticFocusIndexRef = useRef(-1)
  const lastFrameTimeRef = useRef(0)
  const dirtyRef = useRef(true)
  const executionStateKeyRef = useRef("")
  const svgInstanceId = useId().replace(/:/g, "")
  const workerActiveRef = useRef(false)
  const workerFailedRef = useRef(false)
  const workerGenerationRef = useRef(0)
  const workerPendingRef = useRef(false)
  const workerSessionRef = useRef<PhysicsWorkerSession | null>(null)
  const workerStartingRef = useRef(false)
  const frame = useFrame({
    sizeProp,
    responsiveWidth,
    responsiveHeight,
    userMargin: marginProp,
    marginDefault: DEFAULT_MARGIN,
    foregroundGraphics,
    backgroundGraphics
  })
  const {
    margin,
    rafRef,
    reducedMotionRef,
    renderFnRef,
    resolvedBackground,
    resolvedForeground,
    responsiveRef,
    scheduleRender,
    size
  } = frame
  const hydrated = useHydration()
  const wasHydratingFromSSR = useWasHydratingFromSSR()
  const [focusedSemanticItem, setFocusedSemanticItem] =
    React.useState<PhysicsSemanticItem | null>(null)
  const [hoverData, setHoverData] = React.useState<PhysicsHoverData | null>(
    null
  )
  const liveRegionId = `${svgInstanceId}-physics-live`

  const focusSemanticItem = useCallback(
    (index: number) => {
      if (!semanticItems.length) return
      const nextIndex = Math.max(0, Math.min(index, semanticItems.length - 1))
      semanticFocusIndexRef.current = nextIndex
      const item = semanticItems[nextIndex]
      setFocusedSemanticItem(item)
      onSemanticItemFocus?.(item)
    },
    [onSemanticItemFocus, semanticItems]
  )

  const clearSemanticFocus = useCallback(() => {
    semanticFocusIndexRef.current = -1
    setFocusedSemanticItem(null)
    onSemanticItemFocus?.(null)
  }, [onSemanticItemFocus])

  const clearHover = useCallback(() => {
    setHoverData((current) => {
      if (!current) return current
      onBodyHover?.(null, null)
      return null
    })
  }, [onBodyHover])

  const handleCanvasPointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!enableHover || !storeRef.current) return
      const rect = event.currentTarget.getBoundingClientRect()
      const body = storeRef.current.hitTest(
        event.clientX - rect.left,
        event.clientY - rect.top,
        hoverRadius
      )
      if (!body) {
        clearHover()
        return
      }
      const hover = physicsHoverData(body)
      setHoverData((current) => {
        if (
          current &&
          current.id === hover.id &&
          current.x === hover.x &&
          current.y === hover.y
        ) {
          return current
        }
        onBodyHover?.(body, hover)
        return hover
      })
    },
    [clearHover, enableHover, hoverRadius, onBodyHover]
  )

  useEffect(() => {
    if (!semanticItems.length) {
      clearSemanticFocus()
      return
    }
    const current = semanticFocusIndexRef.current
    if (current >= semanticItems.length) {
      focusSemanticItem(semanticItems.length - 1)
    } else if (current >= 0) {
      setFocusedSemanticItem(semanticItems[current])
    }
  }, [clearSemanticFocus, focusSemanticItem, semanticItems])

  useEffect(() => {
    if (!enableHover) clearHover()
  }, [clearHover, enableHover])

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!semanticItems.length) return

      if (event.key === "Escape") {
        event.preventDefault()
        clearSemanticFocus()
        return
      }

      if (
        (event.key === "Enter" || event.key === " ") &&
        semanticFocusIndexRef.current >= 0
      ) {
        event.preventDefault()
        onSemanticItemActivate?.(semanticItems[semanticFocusIndexRef.current])
        return
      }

      if (!NAV_KEYS.has(event.key)) return
      event.preventDefault()

      const current = semanticFocusIndexRef.current
      if (current < 0) {
        focusSemanticItem(0)
        return
      }

      const pageStep = Math.max(1, Math.floor(semanticItems.length * 0.1))
      let next = current
      if (event.key === "Home") next = 0
      else if (event.key === "End") next = semanticItems.length - 1
      else if (event.key === "PageDown") {
        next = Math.min(semanticItems.length - 1, current + pageStep)
      } else if (event.key === "PageUp") {
        next = Math.max(0, current - pageStep)
      } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        next = Math.min(semanticItems.length - 1, current + 1)
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        next = Math.max(0, current - 1)
      }
      focusSemanticItem(next)
    },
    [
      clearSemanticFocus,
      focusSemanticItem,
      onSemanticItemActivate,
      semanticItems
    ]
  )

  const paint = useCallback(() => {
    const canvas = canvasRef.current
    const store = storeRef.current
    if (!canvas || !store) return
    const dpr = getDevicePixelRatio()
    const ctx = prepareCanvas(canvas, size, margin, dpr)
    if (!ctx) return

    const theme = resolvePhysicsCanvasTheme(ctx)
    ctx.fillStyle = theme.background
    ctx.fillRect(-margin.left, -margin.top, size[0], size[1])

    const snapshot = store.snapshot()
    const bodies = store.readBodies()
    for (const body of bodies) {
      drawBody(
        ctx,
        body,
        resolveStyle(
          body,
          snapshot.simulationState,
          bodyStyle,
          selectedBodyStyle,
          selection,
          theme.primary,
          theme.text
        )
      )
    }
    dirtyRef.current = false
  }, [
    bodyStyle,
    margin,
    selectedBodyStyle,
    selection,
    size
  ])

  const reportExecutionState = useCallback(
    (execution: "sync" | "worker", reason?: string) => {
      const store = storeRef.current
      const key = `${simulationExecution}:${execution}:${reason ?? ""}`
      if (executionStateKeyRef.current === key) return
      executionStateKeyRef.current = key
      onSimulationExecutionChange?.({
        execution,
        liveBodies: store?.liveBodyCount() ?? 0,
        queuedBodies: store?.queueSize() ?? 0,
        reason,
        requested: simulationExecution
      })
    },
    [onSimulationExecutionChange, simulationExecution]
  )

  const stopWorker = useCallback(
    (reason?: string, report = true) => {
      workerGenerationRef.current += 1
      workerActiveRef.current = false
      workerPendingRef.current = false
      workerStartingRef.current = false
      workerSessionRef.current?.terminate()
      workerSessionRef.current = null
      if (report) reportExecutionState("sync", reason)
    },
    [reportExecutionState]
  )

  const workerUnsupportedReason = useCallback((): string | null => {
    if (!hydrated) return "hydrating"
    if (!canUsePhysicsWorker()) return "worker unavailable"
    if (!isPhysicsWorkerConfigSupported(config)) {
      return "config is not worker-cloneable"
    }
    if (!isPhysicsWorkerPacingSupported(initialSpawnPacing)) {
      return "spawn pacing is not worker-cloneable"
    }
    if (workerFailedRef.current) return "worker fallback"
    return null
  }, [config, hydrated, initialSpawnPacing])

  const workerChoice = useCallback(() => {
    const store = storeRef.current
    const reason = workerUnsupportedReason()
    if (!store || reason) return { reason, useWorker: false }
    const liveBodies = store.liveBodyCount()
    const queuedBodies = store.queueSize()
    const useWorker = shouldUsePhysicsWorker(
      simulationExecution,
      liveBodies,
      queuedBodies,
      workerBodyThreshold
    )
    return {
      reason: useWorker
        ? simulationExecution === "worker"
          ? "forced worker"
          : "body threshold"
        : "below threshold",
      useWorker
    }
  }, [simulationExecution, workerBodyThreshold, workerUnsupportedReason])

  const applyWorkerFrame = useCallback((frame: PhysicsWorkerFrame) => {
    const store = storeRef.current
    if (!store || !frame.snapshot) return store
    store.restore(frame.snapshot)
    dirtyRef.current = true
    return store
  }, [])

  const finishWorkerFrame = useCallback(
    (frame: PhysicsWorkerFrame, notifyTick = true) => {
      const store = applyWorkerFrame(frame)
      if (!store) return
      if (notifyTick) onTick?.(frame.result, store.controls())
      paint()

      const latest = store.snapshot()
      if (
        frame.result.shouldContinue &&
        !latest.paused &&
        latest.visible &&
        !reducedMotionRef.current
      ) {
        rafRef.current = requestAnimationFrame(() => renderFnRef.current())
      }
    },
    [applyWorkerFrame, onTick, paint, rafRef, reducedMotionRef, renderFnRef]
  )

  const handleWorkerError = useCallback(
    (error: unknown) => {
      workerFailedRef.current = true
      const message = error instanceof Error ? error.message : String(error)
      stopWorker(`worker failed: ${message || "unknown error"}`)
    },
    [stopWorker]
  )

  const startWorkerIfNeeded = useCallback(() => {
    const store = storeRef.current
    if (!store) return false

    const choice = workerChoice()
    if (!choice.useWorker) {
      if (workerActiveRef.current || workerStartingRef.current) {
        stopWorker(choice.reason ?? "sync fallback")
      } else {
        reportExecutionState("sync", choice.reason ?? "sync")
      }
      return false
    }

    if (workerActiveRef.current || workerStartingRef.current) return true

    const session = workerSessionRef.current ?? new PhysicsWorkerSession()
    workerSessionRef.current = session
    workerStartingRef.current = true
    const generation = workerGenerationRef.current + 1
    workerGenerationRef.current = generation

    session
      .initFromSnapshot(config, store.snapshot())
      .then((frame) => {
        if (workerGenerationRef.current !== generation) return
        workerStartingRef.current = false
        workerActiveRef.current = true
        workerFailedRef.current = false
        applyWorkerFrame(frame)
        reportExecutionState("worker", choice.reason ?? "worker")
        paint()
        const latest = storeRef.current?.snapshot()
        if (
          frame.result.shouldContinue &&
          latest &&
          !latest.paused &&
          latest.visible &&
          !reducedMotionRef.current
        ) {
          lastFrameTimeRef.current = 0
          scheduleRender()
        }
      })
      .catch((error) => {
        if (workerGenerationRef.current !== generation) return
        handleWorkerError(error)
      })

    return true
  }, [
    applyWorkerFrame,
    config,
    handleWorkerError,
    paint,
    reducedMotionRef,
    reportExecutionState,
    scheduleRender,
    stopWorker,
    workerChoice
  ])

  const frameFromPayload = useCallback(
    (payload: PhysicsWorkerResponsePayload): PhysicsWorkerFrame | null => {
      if (payload.type === "frame" || payload.type === "removed") {
        return payload.frame
      }
      return null
    },
    []
  )

  const postWorkerCommand = useCallback(
    (command: PhysicsWorkerCommand, notifyTick = true) => {
      const session = workerSessionRef.current
      if (!session || !workerActiveRef.current) return
      const generation = workerGenerationRef.current
      session
        .request(command)
        .then((payload) => {
          if (workerGenerationRef.current !== generation) return
          const frame = frameFromPayload(payload)
          if (frame) finishWorkerFrame(frame, notifyTick)
        })
        .catch(handleWorkerError)
    },
    [finishWorkerFrame, frameFromPayload, handleWorkerError]
  )

  const requestRender = useCallback(() => {
    const store = storeRef.current
    if (!store) return
    const usingWorker = startWorkerIfNeeded()
    const snapshot = store.snapshot()
    if (
      snapshot.paused ||
      !snapshot.visible ||
      !store.hasPendingWork() ||
      reducedMotionRef.current
    ) {
      renderFnRef.current()
      return
    }
    if (usingWorker && workerStartingRef.current) return
    lastFrameTimeRef.current = 0
    scheduleRender()
  }, [
    reducedMotionRef,
    renderFnRef,
    scheduleRender,
    startWorkerIfNeeded
  ])

  const renderFrame = useCallback(() => {
    rafRef.current = 0
    const store = storeRef.current
    if (!store) return

    if (workerActiveRef.current && workerSessionRef.current) {
      if (workerPendingRef.current) return
      let deltaSeconds = 0
      if (!reducedMotionRef.current) {
        const now = performance.now()
        deltaSeconds = lastFrameTimeRef.current
          ? (now - lastFrameTimeRef.current) / 1000
          : 0
        lastFrameTimeRef.current = now
      }
      const session = workerSessionRef.current
      const generation = workerGenerationRef.current
      workerPendingRef.current = true
      const request = reducedMotionRef.current
        ? session.settle()
        : session.tick(deltaSeconds)
      request
        .then((frame) => {
          workerPendingRef.current = false
          if (workerGenerationRef.current !== generation) return
          finishWorkerFrame(frame)
        })
        .catch((error) => {
          workerPendingRef.current = false
          if (workerGenerationRef.current !== generation) return
          handleWorkerError(error)

          const result = reducedMotionRef.current
            ? store.settleWithObservations()
            : store.tick(deltaSeconds)
          onTick?.(result, store.controls())
          paint()
        })
      return
    }

    let result: PhysicsPipelineTickResult | null = null
    if (reducedMotionRef.current) {
      result = store.settleWithObservations()
    } else {
      const now = performance.now()
      const deltaSeconds = lastFrameTimeRef.current
        ? (now - lastFrameTimeRef.current) / 1000
        : 0
      lastFrameTimeRef.current = now
      result = store.tick(deltaSeconds)
    }

    onTick?.(result, store.controls())
    paint()

    const latest = store.snapshot()
    if (
      result.shouldContinue &&
      !latest.paused &&
      latest.visible &&
      !reducedMotionRef.current
    ) {
      rafRef.current = requestAnimationFrame(() => renderFnRef.current())
    }
  }, [
    finishWorkerFrame,
    handleWorkerError,
    onTick,
    paint,
    rafRef,
    reducedMotionRef,
    renderFnRef
  ])

  renderFnRef.current = renderFrame

  useHydrationLifecycle({
    hydrated,
    wasHydratingFromSSR,
    storeRef: storeRef as React.RefObject<{
      cancelIntroAnimation?: () => void
    } | null>,
    dirtyRef,
    renderFnRef
  })

  useEffect(() => {
    if (!config) return
    workerFailedRef.current = false
    if (workerActiveRef.current || workerStartingRef.current) {
      stopWorker("config changed", false)
    }
    storeRef.current?.updateConfig(config)
    requestRender()
    // requestRender depends on paint/layout callbacks; config changes are the
    // intentional trigger here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, stopWorker])

  useEffect(() => {
    workerFailedRef.current = false
    requestRender()
    // requestRender depends on paint/layout callbacks; hydration and execution
    // settings are the intentional triggers here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, simulationExecution, workerBodyThreshold])

  useEffect(() => {
    const store = storeRef.current
    if (!store) return
    store.setPaused(paused)
    postWorkerCommand({ type: "setPaused", paused }, false)
    requestRender()
    // postWorkerCommand/requestRender depend on paint callbacks; paused is the
    // intentional trigger here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused])

  useEffect(() => {
    if (!suspendWhenHidden || typeof document === "undefined") return
    const update = () => {
      const store = storeRef.current
      if (!store) return
      const visible = documentIsVisible()
      store.setVisible(visible)
      postWorkerCommand({ type: "setVisible", visible }, false)
      requestRender()
    }
    update()
    document.addEventListener("visibilitychange", update)
    return () => document.removeEventListener("visibilitychange", update)
    // postWorkerCommand/requestRender depend on paint callbacks; visibility
    // listener registration only follows suspendWhenHidden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suspendWhenHidden])

  useEffect(() => {
    return () => stopWorker("unmount", false)
  }, [stopWorker])

  useEffect(() => {
    paint()
  }, [paint])

  useImperativeHandle(
    ref,
    (): StreamPhysicsFrameHandle => ({
      ...storeRef.current!.controls(),
      applyImpulse: (id, ix, iy) => {
        storeRef.current!.applyImpulse(id, ix, iy)
        postWorkerCommand({ type: "applyImpulse", id, ix, iy })
        requestRender()
      },
      clear: () => {
        storeRef.current!.clear()
        postWorkerCommand({ type: "clear" })
        requestRender()
      },
      getData: () => storeRef.current!.readBodies(),
      getStore: () => storeRef.current!,
      pause: () => {
        storeRef.current!.setPaused(true)
        postWorkerCommand({ type: "setPaused", paused: true }, false)
        requestRender()
      },
      push: (spawn, pacing) => {
        storeRef.current!.enqueue(spawn, pacing)
        if (isPhysicsWorkerPacingSupported(pacing)) {
          postWorkerCommand({ type: "enqueue", spawns: [spawn], pacing })
        } else if (workerActiveRef.current || workerStartingRef.current) {
          stopWorker("spawn pacing is not worker-cloneable")
        }
        requestRender()
      },
      pushMany: (spawns, pacing) => {
        storeRef.current!.enqueue(spawns, pacing)
        if (isPhysicsWorkerPacingSupported(pacing)) {
          postWorkerCommand({ type: "enqueue", spawns, pacing })
        } else if (workerActiveRef.current || workerStartingRef.current) {
          stopWorker("spawn pacing is not worker-cloneable")
        }
        requestRender()
      },
      remove: (ids) => {
        const removed = storeRef.current!.remove(ids)
        postWorkerCommand({ type: "remove", ids })
        requestRender()
        return removed
      },
      restore: (snapshot: PhysicsPipelineSnapshot) => {
        storeRef.current!.restore(snapshot)
        postWorkerCommand({ type: "restore", snapshot }, false)
        requestRender()
      },
      resume: () => {
        storeRef.current!.setPaused(false)
        postWorkerCommand({ type: "setPaused", paused: false }, false)
        requestRender()
      },
      settle: (maxSteps) => {
        const steps = storeRef.current!.settle(maxSteps)
        postWorkerCommand({ type: "settle", maxSteps })
        requestRender()
        return steps
      },
      settleWithObservations: (maxSteps) => {
        const result = storeRef.current!.settleWithObservations(maxSteps)
        postWorkerCommand({ type: "settle", maxSteps })
        requestRender()
        return result
      },
      step: (deltaSeconds) => {
        const result = storeRef.current!.tick(deltaSeconds)
        postWorkerCommand({ type: "tick", deltaSeconds })
        paint()
        return result
      }
    }),
    [paint, postWorkerCommand, requestRender, stopWorker]
  )

  const serverLikeRender =
    isServerEnvironment || (!hydrated && wasHydratingFromSSR)
  const wrapperClassName = ["stream-physics-frame", className]
    .filter(Boolean)
    .join(" ")
  const ariaLabel = description ?? title ?? "Physics chart"
  const tableId = `${svgInstanceId}-physics-table`
  const tooltipRendered =
    enableHover && hoverData
      ? tooltipContent
        ? tooltipContent(hoverData)
        : <DefaultPhysicsTooltip hover={hoverData} />
      : null
  const adjustedWidth = Math.max(1, size[0] - margin.left - margin.right)
  const adjustedHeight = Math.max(1, size[1] - margin.top - margin.bottom)
  const tooltipElement = tooltipRendered && hoverData ? (
    <FlippingTooltip
      x={hoverData.x - margin.left}
      y={hoverData.y - margin.top}
      containerWidth={adjustedWidth}
      containerHeight={adjustedHeight}
      margin={margin}
      className="stream-physics-tooltip"
    >
      {tooltipRendered}
    </FlippingTooltip>
  ) : null

  if (serverLikeRender) {
    const store =
      storeRef.current ?? createStore(config, initialSpawns, initialSpawnPacing)
    const { svg } = renderPhysicsSettledSVG(store, {
      width: size[0],
      height: size[1],
      title,
      className: "stream-physics-frame__svg",
      idPrefix: `physics-${svgInstanceId}`
    })
    return (
      <div
        ref={responsiveRef}
        className={wrapperClassName}
        role="img"
        aria-label={ariaLabel}
        style={{ width: size[0], height: size[1] }}
      >
        <ScreenReaderSummary summary={summary} />
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
    )
  }

  return (
    <div
      ref={responsiveRef}
      className={wrapperClassName}
      role="group"
      aria-label={ariaLabel}
      aria-describedby={focusedSemanticItem ? liveRegionId : undefined}
      tabIndex={0}
      style={{
        position: "relative",
        width: size[0],
        height: size[1]
      }}
      onKeyDown={onKeyDown}
    >
      {accessibleTable ? <SkipToTableLink tableId={tableId} /> : null}
      {accessibleTable ? (
        <PhysicsSemanticDataTable
          chartTitle={typeof title === "string" ? title : ariaLabel}
          items={semanticItems}
          tableId={tableId}
        />
      ) : null}
      <ScreenReaderSummary summary={summary} />
      <AriaLiveTooltip hoverPoint={hoverData} />
      <div id={liveRegionId} aria-live="polite" aria-atomic="true" style={SR_ONLY_STYLE}>
        {focusedSemanticItem
          ? focusedSemanticItem.description ?? focusedSemanticItem.label
          : ""}
      </div>
      {resolvedBackground}
      <canvas
        ref={canvasRef}
        width={size[0]}
        height={size[1]}
        aria-label={ariaLabel}
        onPointerDown={(event) => {
          clearSemanticFocus()
          clearHover()
          if (!onBodyPointerDown || !storeRef.current) return
          const rect = event.currentTarget.getBoundingClientRect()
          const body = storeRef.current.hitTest(
            event.clientX - rect.left,
            event.clientY - rect.top,
            16
          )
          onBodyPointerDown(body, event)
        }}
        onPointerMove={enableHover ? handleCanvasPointerMove : undefined}
        onPointerLeave={enableHover ? clearHover : undefined}
      />
      {resolvedForeground}
      <FocusRing
        active={focusedSemanticItem != null}
        hoverPoint={
          focusedSemanticItem
            ? { x: focusedSemanticItem.x, y: focusedSemanticItem.y }
            : null
        }
        margin={margin}
        size={size}
        shape={focusedSemanticItem?.shape}
        width={focusedSemanticItem?.width}
        height={focusedSemanticItem?.height}
        pathData={focusedSemanticItem?.pathData}
      />
      {tooltipElement}
    </div>
  )
})

StreamPhysicsFrame.displayName = "StreamPhysicsFrame"

export default StreamPhysicsFrame
