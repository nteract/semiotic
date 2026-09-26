"use client"

/**
 * Physics frame semantic items, default tooltip, and accessible data table.
 */
import * as React from "react"
import { SR_ONLY_STYLE } from "../../screenReaderStyles"
export { SR_ONLY_STYLE } from "../../screenReaderStyles"
import { AccessibleTableMoreRows } from "../AccessibleTableMoreRows"
import { AccessibleTableShell } from "../AccessibleTableShell"
import { SAMPLE_SIZE as PHYSICS_TABLE_SAMPLE_SIZE, PAGE_SIZE as PHYSICS_TABLE_PAGE_SIZE, VISIBLE_TABLE_STYLE as TABLE_STYLE, VISIBLE_TH_STYLE as TABLE_TH_STYLE, VISIBLE_TD_STYLE as TABLE_TD_STYLE, CAPTION_STYLE as TABLE_CAPTION_STYLE } from "../accessibleTableStyles"
import { useAccessibleTableInteraction } from "../useAccessibleTableInteraction"
import { FlippingTooltip } from "../../Tooltip/FlippingTooltip"
import { hasOwnTooltipChrome, hasTooltipContent } from "../../Tooltip/tooltipChrome"
import type { FrameMargin } from "../useFrame"
import { defaultTooltipStyle } from "../../Tooltip/Tooltip"
import type { PhysicsBodyState } from "./PhysicsKernel"
import type { PhysicsSimulationState } from "./PhysicsPipelineStore"
import type {
  PhysicsHoverData,
  PhysicsSemanticItem,
  StreamPhysicsFrameProps
} from "./StreamPhysicsTypes"

/** Announce keyboard focus, outside the frame's atomic role="img". */
export function renderPhysicsAnnouncements(
  _items: PhysicsSemanticItem[],
  focusedSemanticItem: PhysicsSemanticItem | null,
  _hoverData: PhysicsHoverData | null,
  liveRegionId: string
) {
  return (
    <>
      <div
        id={liveRegionId}
        aria-live="polite"
        aria-atomic="true"
        style={SR_ONLY_STYLE}
      >
        {focusedSemanticItem
          ? (focusedSemanticItem.description ?? focusedSemanticItem.label)
          : ""}
      </div>
    </>
  )
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

export function renderPhysicsTooltip({
  enableHover,
  hoverData,
  tooltipContent,
  plotWidth,
  plotHeight,
  margin
}: {
  enableHover: boolean
  hoverData: PhysicsHoverData | null
  tooltipContent: StreamPhysicsFrameProps["tooltipContent"]
  plotWidth: number
  plotHeight: number
  margin: FrameMargin
}): React.ReactElement | null {
  if (!enableHover || !hoverData) return null
  const content = tooltipContent ? (
    tooltipContent(hoverData)
  ) : (
    <DefaultPhysicsTooltip hover={hoverData} />
  )
  if (!hasTooltipContent(content)) return null
  return (
    <FlippingTooltip
      contentOwnsChrome={hasOwnTooltipChrome(tooltipContent)}
      x={hoverData.x}
      y={hoverData.y}
      containerWidth={plotWidth}
      containerHeight={plotHeight}
      margin={margin}
      className="stream-physics-tooltip"
    >
      {content}
    </FlippingTooltip>
  )
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
  const [visibleCount, setVisibleCount] = React.useState(
    PHYSICS_TABLE_SAMPLE_SIZE
  )
  const interaction = useAccessibleTableInteraction()
  const { isExpanded, revealRows } = interaction
  const summary = React.useMemo(() => isExpanded ? semanticItemsSummary(items) : "", [isExpanded, items])
  const regionLabel = chartTitle
    ? `Data summary for ${chartTitle}`
    : `Data summary for physics chart ${tableId}`

  React.useEffect(() => {
    if (!isExpanded) setVisibleCount(PHYSICS_TABLE_SAMPLE_SIZE)
  }, [isExpanded])

  if (!items.length) {
    return <span id={tableId} tabIndex={-1} style={SR_ONLY_STYLE} />
  }

  const shell = { interaction, tableId, regionLabel, countLabel: `${items.length} semantic items` }
  if (!isExpanded) return <AccessibleTableShell {...shell} />


  const shownCount = Math.min(visibleCount, items.length)
  const sampleItems = items.slice(0, shownCount)
  const remaining = items.length - shownCount
  const showMore = (event: React.MouseEvent<HTMLButtonElement>) => {
    revealRows(event.currentTarget, shownCount, Math.min(shownCount + PHYSICS_TABLE_PAGE_SIZE, items.length), items.length)
    setVisibleCount((count) => count + PHYSICS_TABLE_PAGE_SIZE)
  }

  return (
    <AccessibleTableShell {...shell} summary={summary}>
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
            <tr key={item.id ?? `${item.label}-${index}`} tabIndex={-1}>
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
      <AccessibleTableMoreRows remaining={remaining} onClick={showMore} kind="row" />
    </AccessibleTableShell>
  )
}


export {
  physicsHoverData,
  createBodySemanticItems,
  semanticItemsChanged,
  DefaultPhysicsTooltip,
  PhysicsSemanticDataTable
}
