"use client"

/**
 * Physics frame semantic items, default tooltip, and accessible data table.
 */
import * as React from "react"
import { useDataSummary } from "../../DataSummaryContext"
import { defaultTooltipStyle } from "../../Tooltip/Tooltip"
import type { PhysicsBodyState } from "./PhysicsKernel"
import type { PhysicsSimulationState } from "./PhysicsPipelineStore"
import type {
  PhysicsHoverData,
  PhysicsSemanticItem,
  StreamPhysicsFrameProps
} from "./StreamPhysicsTypes"

export const SR_ONLY_STYLE: React.CSSProperties = {
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

function bodySemanticShape(body: PhysicsBodyState): Pick<
  PhysicsSemanticItem,
  "height" | "shape" | "width"
> {
  if (body.shape.type === "circle") {
    const diameter = Math.max(4, body.shape.radius * 2)
    return {
      height: diameter,
      shape: "circle",
      width: diameter
    }
  }
  return {
    height: body.shape.height,
    shape: "rect",
    width: body.shape.width
  }
}

function defaultBodySemanticLabel(body: PhysicsBodyState): string {
  const datum = body.datum
  if (datum && typeof datum === "object") {
    const record = datum as Record<string, unknown>
    const label = record.label ?? record.name ?? record.id
    if (
      typeof label === "string" ||
      typeof label === "number" ||
      typeof label === "boolean"
    ) {
      return String(label)
    }
  }
  return body.id
}

function defaultBodySemanticDescription(body: PhysicsBodyState): string {
  const rows = physicsTooltipRows(body.datum ?? body)
  if (!rows.length) return `Physics body ${body.id}`
  return rows.map(([key, value]) => `${key}: ${value}`).join(", ")
}

function createBodySemanticItems(
  bodies: readonly PhysicsBodyState[],
  simulationState: PhysicsSimulationState,
  bodySemanticItems: StreamPhysicsFrameProps["bodySemanticItems"],
  limit: number
): PhysicsSemanticItem[] {
  if (!bodySemanticItems) return []
  const maxItems = Math.max(0, Math.floor(limit))
  if (!maxItems) return []
  const items: PhysicsSemanticItem[] = []
  for (let index = 0; index < bodies.length && items.length < maxItems; index += 1) {
    const body = bodies[index]
    const context = { index, simulationState }
    const override =
      typeof bodySemanticItems === "function"
        ? bodySemanticItems(body, context)
        : undefined
    if (override === false) continue
    const shape = bodySemanticShape(body)
    items.push({
      datum: body.datum ?? body,
      description: defaultBodySemanticDescription(body),
      group: "body",
      label: defaultBodySemanticLabel(body),
      ...shape,
      ...(override ?? {}),
      bodyId: override?.bodyId ?? body.id,
      id: override?.id ?? `body:${body.id}`,
      x: override?.x ?? body.x,
      y: override?.y ?? body.y
    })
  }
  return items
}

function semanticItemsChanged(
  previous: readonly PhysicsSemanticItem[],
  next: readonly PhysicsSemanticItem[]
): boolean {
  if (previous.length !== next.length) return true
  for (let index = 0; index < previous.length; index += 1) {
    const a = previous[index]
    const b = next[index]
    if (
      a.id !== b.id ||
      a.label !== b.label ||
      a.description !== b.description ||
      a.group !== b.group ||
      a.bodyId !== b.bodyId ||
      Math.round(a.x) !== Math.round(b.x) ||
      Math.round(a.y) !== Math.round(b.y)
    ) {
      return true
    }
  }
  return false
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
;(DefaultPhysicsTooltip as unknown as { ownsChrome: boolean }).ownsChrome = true


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


export {
  physicsHoverData,
  createBodySemanticItems,
  semanticItemsChanged,
  DefaultPhysicsTooltip,
  PhysicsSemanticDataTable
}
