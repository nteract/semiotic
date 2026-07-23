import * as React from "react"

import { LegendGroup, LegendItem, ItemType, LegendProps, GradientLegendConfig } from "./types/legendTypes"
import {
  layoutVerticalLegendGroups,
  resolveLegendMetrics,
  type LegendMetrics,
} from "./legendLayout"

const typeHash: Record<"fill" | "line", (style: React.CSSProperties, swatchSize: number) => React.ReactElement> = {
  fill: (style, swatchSize) => <rect style={style} width={swatchSize} height={swatchSize} />,
  line: (style, swatchSize) => <line style={style} x1={0} y1={0} x2={swatchSize} y2={swatchSize} />
}

function renderType(
  item: LegendItem,
  i: number,
  type: ItemType,
  styleFn: (item: LegendItem, index: number) => React.CSSProperties,
  swatchSize: number
) {
  let renderedType
  if (typeof type === "function") {
    renderedType = type(item)
  } else {
    const Type = typeHash[type]
    const style = styleFn(item, i)
    renderedType = Type(style, swatchSize)
  }
  return renderedType
}

/** Checkmark SVG for isolated items — centered on the swatch */
function CheckMark({ swatchSize }: { swatchSize: number }) {
  return (
    <path
      d={`M${swatchSize * 0.25},${swatchSize * 0.55} L${swatchSize * 0.45},${swatchSize * 0.75} L${swatchSize * 0.8},${swatchSize * 0.3}`}
      fill="none"
      stroke="white"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

/** Compute opacity for a legend item based on highlight/isolate state */
function itemOpacity(
  item: LegendItem,
  highlightedCategory: string | null | undefined,
  isolatedCategories: Set<string> | undefined
): number {
  // Isolation mode: dim items not in the isolated set
  if (isolatedCategories && isolatedCategories.size > 0) {
    return isolatedCategories.has(item.label) ? 1 : 0.3
  }
  // Highlight mode: dim non-highlighted items
  if (highlightedCategory != null) {
    return item.label === highlightedCategory ? 1 : 0.3
  }
  return 1
}

const renderLegendGroupVertical = (
  legendGroup: LegendGroup,
  customClickBehavior: ((item: LegendItem) => void) | undefined,
  customHoverBehavior: ((item: LegendItem | null) => void) | undefined,
  highlightedCategory: string | null | undefined,
  isolatedCategories: Set<string> | undefined,
  focusedGroupIndex: number,
  focusedItemIndex: number,
  groupIndex: number,
  onFocusedIndexChange: (groupIndex: number, itemIndex: number) => void,
  legendInteraction: string | undefined,
  metrics: LegendMetrics
) => {
  const { type = "fill", styleFn, items } = legendGroup
  const renderedItems: React.ReactElement[] = []
  let itemOffset = 0
  const interactive = !!(customClickBehavior || customHoverBehavior)
  const useIsolateAria = legendInteraction === "isolate" || (legendInteraction === undefined && isolatedCategories != null)
  const { swatchSize, labelGap, rowHeight } = metrics
  items.forEach((item, i) => {
    const renderedType = renderType(item, i, type, styleFn, swatchSize)
    const opacity = itemOpacity(item, highlightedCategory, isolatedCategories)
    const isIsolated = isolatedCategories && isolatedCategories.size > 0 && isolatedCategories.has(item.label)
    const isHighlighted = highlightedCategory != null && item.label === highlightedCategory
    renderedItems.push(
      <g
        key={`legend-item-${i}`}
        transform={`translate(0,${itemOffset})`}
        onClick={
          customClickBehavior ? () => customClickBehavior(item) : undefined
        }
        onMouseEnter={
          customHoverBehavior ? () => customHoverBehavior(item) : undefined
        }
        onMouseLeave={
          customHoverBehavior ? () => customHoverBehavior(null) : undefined
        }
        tabIndex={interactive ? (groupIndex === focusedGroupIndex && i === focusedItemIndex ? 0 : -1) : undefined}
        role={interactive ? "option" : undefined}
        aria-selected={interactive && useIsolateAria ? (isIsolated || false) : undefined}
        aria-current={interactive && !useIsolateAria ? (isHighlighted || undefined) : undefined}
        aria-label={item.label}
        onKeyDown={interactive ? (e: React.KeyboardEvent<SVGGElement>) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            if (customClickBehavior) customClickBehavior(item)
          }
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault()
            const dir = e.key === "ArrowDown" ? 1 : -1
            const nextIndex = (i + dir + items.length) % items.length
            onFocusedIndexChange(groupIndex, nextIndex)
            const sibling = e.currentTarget.parentElement?.children[nextIndex]
            if (sibling instanceof SVGElement) {
              (sibling as SVGGElement).focus()
            }
          }
        } : undefined}
        onFocus={interactive ? (e: React.FocusEvent<SVGGElement>) => {
          onFocusedIndexChange(groupIndex, i)
          if (customHoverBehavior) customHoverBehavior(item)
          const ring = e.currentTarget.querySelector(".semiotic-legend-focus-ring")
          if (ring) ring.setAttribute("visibility", "visible")
        } : undefined}
        onBlur={interactive ? (e: React.FocusEvent<SVGGElement>) => {
          if (customHoverBehavior) customHoverBehavior(null)
          const ring = e.currentTarget.querySelector(".semiotic-legend-focus-ring")
          if (ring) ring.setAttribute("visibility", "hidden")
        } : undefined}
        style={{
          cursor: interactive ? "pointer" : "default",
          opacity,
          transition: "opacity 150ms ease",
          pointerEvents: "all",
          outline: "none",
        }}
      >
        {interactive && <rect
          className="semiotic-legend-focus-ring"
          x={-2} y={-2}
          width={swatchSize + labelGap + 2 + item.label.length * 7}
          height={swatchSize + 4}
          fill="none"
          stroke="var(--semiotic-focus, #005fcc)"
          strokeWidth={2}
          rx={3}
          visibility="hidden"
        />}
        {renderedType}
        {isIsolated && <CheckMark swatchSize={swatchSize} />}
        <text y={swatchSize / 2} x={swatchSize + labelGap} dominantBaseline="central" style={{ fontSize: "var(--semiotic-legend-font-size, 12px)" }} fill="var(--semiotic-text, #333)">
          {item.label}
        </text>
      </g>
    )
    itemOffset += rowHeight
  })
  return renderedItems
}

const renderLegendGroupHorizontal = (
  legendGroup: LegendGroup,
  customClickBehavior: ((item: LegendItem) => void) | undefined,
  customHoverBehavior: ((item: LegendItem | null) => void) | undefined,
  highlightedCategory: string | null | undefined,
  isolatedCategories: Set<string> | undefined,
  focusedGroupIndex: number,
  focusedItemIndex: number,
  groupIndex: number,
  onFocusedIndexChange: (groupIndex: number, itemIndex: number) => void,
  legendInteraction: string | undefined,
  metrics: LegendMetrics,
  maxWidth?: number
) => {
  const { type = "fill", styleFn, items } = legendGroup
  const renderedItems: React.ReactElement[] = []
  const { swatchSize, labelGap, itemGap, rowHeight, align } = metrics
  const interactive = !!(customClickBehavior || customHoverBehavior)
  const useIsolateAria = legendInteraction === "isolate" || (legendInteraction === undefined && isolatedCategories != null)
  const itemWidths = items.map((item) => swatchSize + labelGap + item.label.length * 7)
  const rows: Array<{ start: number; end: number; width: number }> = []
  let rowStart = 0
  let rowWidth = 0
  itemWidths.forEach((width, i) => {
    const nextWidth = rowWidth === 0 ? width : rowWidth + itemGap + width
    if (maxWidth && maxWidth > 0 && rowWidth > 0 && nextWidth > maxWidth) {
      rows.push({ start: rowStart, end: i, width: rowWidth })
      rowStart = i
      rowWidth = width
    } else {
      rowWidth = nextWidth
    }
  })
  if (items.length > 0) rows.push({ start: rowStart, end: items.length, width: rowWidth })

  rows.forEach((row, rowIndex) => {
    const rowOffset =
      align === "center"
        ? Math.max(0, ((maxWidth ?? row.width) - row.width) / 2)
        : align === "end"
          ? Math.max(0, (maxWidth ?? row.width) - row.width)
          : 0
    let itemOffset = rowOffset
    for (let i = row.start; i < row.end; i++) {
    const item = items[i]
    const renderedType = renderType(item, i, type, styleFn, swatchSize)
    const opacity = itemOpacity(item, highlightedCategory, isolatedCategories)
    const isIsolated = isolatedCategories && isolatedCategories.size > 0 && isolatedCategories.has(item.label)
    const isHighlighted = highlightedCategory != null && item.label === highlightedCategory

    const yOffset = rowIndex * rowHeight

    renderedItems.push(
      <g
        key={`legend-item-${i}`}
        transform={`translate(${itemOffset},${yOffset})`}
        onClick={
          customClickBehavior ? () => customClickBehavior(item) : undefined
        }
        onMouseEnter={
          customHoverBehavior ? () => customHoverBehavior(item) : undefined
        }
        onMouseLeave={
          customHoverBehavior ? () => customHoverBehavior(null) : undefined
        }
        tabIndex={interactive ? (groupIndex === focusedGroupIndex && i === focusedItemIndex ? 0 : -1) : undefined}
        role={interactive ? "option" : undefined}
        aria-selected={interactive && useIsolateAria ? (isIsolated || false) : undefined}
        aria-current={interactive && !useIsolateAria ? (isHighlighted || undefined) : undefined}
        aria-label={item.label}
        onKeyDown={interactive ? (e: React.KeyboardEvent<SVGGElement>) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            if (customClickBehavior) customClickBehavior(item)
          }
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault()
            const dir = e.key === "ArrowRight" ? 1 : -1
            const nextIndex = (i + dir + items.length) % items.length
            onFocusedIndexChange(groupIndex, nextIndex)
            const sibling = e.currentTarget.parentElement?.children[nextIndex]
            if (sibling instanceof SVGElement) {
              (sibling as SVGGElement).focus()
            }
          }
        } : undefined}
        onFocus={interactive ? (e: React.FocusEvent<SVGGElement>) => {
          onFocusedIndexChange(groupIndex, i)
          if (customHoverBehavior) customHoverBehavior(item)
          const ring = e.currentTarget.querySelector(".semiotic-legend-focus-ring")
          if (ring) ring.setAttribute("visibility", "visible")
        } : undefined}
        onBlur={interactive ? (e: React.FocusEvent<SVGGElement>) => {
          if (customHoverBehavior) customHoverBehavior(null)
          const ring = e.currentTarget.querySelector(".semiotic-legend-focus-ring")
          if (ring) ring.setAttribute("visibility", "hidden")
        } : undefined}
        style={{
          cursor: interactive ? "pointer" : "default",
          opacity,
          transition: "opacity 150ms ease",
          pointerEvents: "all",
          outline: "none",
        }}
      >
        {interactive && <rect
          className="semiotic-legend-focus-ring"
          x={-2} y={-2}
          width={swatchSize + labelGap + 2 + item.label.length * 7}
          height={swatchSize + 4}
          fill="none"
          stroke="var(--semiotic-focus, #005fcc)"
          strokeWidth={2}
          rx={3}
          visibility="hidden"
        />}
        {renderedType}
        {isIsolated && <CheckMark swatchSize={swatchSize} />}
        <text y={swatchSize / 2} x={swatchSize + labelGap} dominantBaseline="central" style={{ fontSize: "var(--semiotic-legend-font-size, 12px)" }} fill="var(--semiotic-text, #333)">
          {item.label}
        </text>
      </g>
    )
    itemOffset += itemWidths[i] + itemGap
    }
  })

  const totalWidth = Math.max(0, ...rows.map((row) => row.width))
  const totalRows = rows.length
  const totalHeight = totalRows * rowHeight
  return { items: renderedItems, offset: totalWidth, totalRows, totalHeight }
}

const renderVerticalGroup = ({
  legendGroups,
  width,
  customClickBehavior,
  customHoverBehavior,
  highlightedCategory,
  isolatedCategories,
  focusedGroupIndex,
  focusedItemIndex,
  onFocusedIndexChange,
  legendInteraction,
  metrics
}: {
  legendGroups: LegendGroup[]
  width: number
  customClickBehavior?: (item: LegendItem) => void
  customHoverBehavior?: (item: LegendItem | null) => void
  highlightedCategory?: string | null
  isolatedCategories?: Set<string>
  focusedGroupIndex: number
  focusedItemIndex: number
  onFocusedIndexChange: (groupIndex: number, itemIndex: number) => void
  legendInteraction?: string
  metrics: LegendMetrics
}) => {
  const renderedGroups: React.ReactElement[] = []
  const groupLayouts = layoutVerticalLegendGroups(
    legendGroups.map((group) => ({
      hasLabel: Boolean(group.label),
      itemCount: group.items.length,
    })),
    metrics.rowHeight
  )

  legendGroups.forEach((l, i) => {
    const layout = groupLayouts[i]
    renderedGroups.push(
      <line
        key={`legend-top-line legend-symbol-${i}`}
        stroke="gray"
        x1={0}
        y1={layout.lineY}
        x2={width}
        y2={layout.lineY}
      />
    )
    if (l.label && layout.labelY != null) {
      renderedGroups.push(
        <text
          key={`legend-text-${i}`}
          y={layout.labelY}
          className="legend-group-label"
          style={{ fontSize: "var(--semiotic-legend-font-size, 12px)" }}
          fill="var(--semiotic-text, #333)"
        >
          {l.label}
        </text>
      )
    }

    renderedGroups.push(
      <g
        key={`legend-group-${i}`}
        className="legend-item"
        transform={`translate(0,${layout.itemsY})`}
    >
        {renderLegendGroupVertical(l, customClickBehavior, customHoverBehavior, highlightedCategory, isolatedCategories, focusedGroupIndex, focusedItemIndex, i, onFocusedIndexChange, legendInteraction, metrics)}
      </g>
    )
  })

  return renderedGroups
}

const renderHorizontalGroup = ({
  legendGroups,
  title: _title,
  height,
  width,
  customClickBehavior,
  customHoverBehavior,
  highlightedCategory,
  isolatedCategories,
  focusedGroupIndex,
  focusedItemIndex,
  onFocusedIndexChange,
  legendInteraction,
  metrics
}: {
  legendGroups: LegendGroup[]
  title: string | boolean
  height: number
  width: number
  customClickBehavior?: (item: LegendItem) => void
  customHoverBehavior?: (item: LegendItem | null) => void
  highlightedCategory?: string | null
  isolatedCategories?: Set<string>
  focusedGroupIndex: number
  focusedItemIndex: number
  onFocusedIndexChange: (groupIndex: number, itemIndex: number) => void
  legendInteraction?: string
  metrics: LegendMetrics
}) => {
  // First pass: compute total width of all items
  let totalItemsWidth = 0
  const groupResults: { label?: string; items: React.ReactElement[]; offset: number; totalRows?: number; totalHeight?: number }[] = []

  legendGroups.forEach((l, i) => {
    let groupWidth = 0
    if (l.label) groupWidth += 16
    const renderedItems = renderLegendGroupHorizontal(l, customClickBehavior, customHoverBehavior, highlightedCategory, isolatedCategories, focusedGroupIndex, focusedItemIndex, i, onFocusedIndexChange, legendInteraction, metrics, metrics.maxWidth ?? width)
    groupWidth += renderedItems.offset + 5
    groupResults.push({ label: l.label, ...renderedItems, offset: groupWidth, totalRows: renderedItems.totalRows, totalHeight: renderedItems.totalHeight })
    totalItemsWidth += groupWidth + 12
  })

  const availableWidth = metrics.maxWidth ?? width
  const startOffset =
    totalItemsWidth > availableWidth
      ? 0
      : metrics.align === "center"
        ? Math.max(0, (availableWidth - totalItemsWidth) / 2)
        : metrics.align === "end"
          ? Math.max(0, availableWidth - totalItemsWidth)
          : 0
  let offset = startOffset

  const renderedGroups: React.ReactElement[] = []
  const verticalOffset = 0

  groupResults.forEach((result, i) => {
    const l = legendGroups[i]
    if (l.label) {
      renderedGroups.push(
        <text
          key={`legend-text-${i}`}
          transform={`translate(${offset},${verticalOffset}) rotate(90)`}
          textAnchor="start"
          className="legend-group-label"
          style={{ fontSize: "var(--semiotic-legend-font-size, 12px)" }}
          fill="var(--semiotic-text, #333)"
        >
          {l.label}
        </text>
      )
      offset += 16
    }

    renderedGroups.push(
      <g
        key={`legend-group-${i}`}
        className="legend-item"
        transform={`translate(${offset},${verticalOffset})`}
      >
        {result.items}
      </g>
    )
    offset += result.offset + 5

    if (legendGroups[i + 1]) {
      const separatorHeight = result.totalHeight || height
      renderedGroups.push(
        <line
          key={`legend-top-line legend-symbol-${i}`}
          stroke="gray"
          x1={offset}
          y1={verticalOffset - 8}
          x2={offset}
          y2={separatorHeight + verticalOffset + 8}
        />
      )
    }
    offset += 12
  })

  return (
    <g>
      {renderedGroups}
    </g>
  )
}

/** Gradient legend for continuous/sequential color scales */
export function GradientLegend({
  config,
  orientation = "vertical",
  width = 100,
}: {
  config: GradientLegendConfig
  orientation?: "vertical" | "horizontal"
  width?: number
}) {
  const { colorFn, domain, label, format } = config
  const fmt = format || ((v: number) => String(Math.round(v * 100) / 100))
  const STEPS = 64
  const reactId = React.useId()
  const gradientId = `grad-legend-${reactId}`

  if (orientation === "horizontal") {
    const BAR_HEIGHT = 12
    const barWidth = Math.min(width, 200)
    const totalWidth = barWidth
    const startX = Math.max(0, (width - totalWidth) / 2)

    const stops: React.ReactElement[] = []
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS
      stops.push(
        <stop key={i} offset={`${t * 100}%`} stopColor={colorFn(domain[0] + t * (domain[1] - domain[0]))} />
      )
    }

    return (
      <g aria-label={label || "Gradient legend"}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            {stops}
          </linearGradient>
        </defs>
        {label && (
          <text x={startX + barWidth / 2} y={-4} textAnchor="middle" fontSize={11} fill="var(--semiotic-text, #333)">
            {label}
          </text>
        )}
        <rect x={startX} y={0} width={barWidth} height={BAR_HEIGHT} fill={`url(#${gradientId})`} rx={2} />
        <text x={startX} y={BAR_HEIGHT + 12} textAnchor="start" fontSize={10} fill="var(--semiotic-text-secondary, #666)">
          {fmt(domain[0])}
        </text>
        <text x={startX + barWidth} y={BAR_HEIGHT + 12} textAnchor="end" fontSize={10} fill="var(--semiotic-text-secondary, #666)">
          {fmt(domain[1])}
        </text>
      </g>
    )
  }

  // Vertical
  const BAR_WIDTH = 14
  const BAR_HEIGHT = 100

  const stops: React.ReactElement[] = []
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS
    // SVG gradient goes top to bottom, so top = max, bottom = min
    stops.push(
      <stop key={i} offset={`${t * 100}%`} stopColor={colorFn(domain[1] - t * (domain[1] - domain[0]))} />
    )
  }

  return (
    <g aria-label={label || "Gradient legend"}>
      {label && (
        <text x={0} y={-6} textAnchor="start" fontSize={11} fill="var(--semiotic-text, #333)">
          {label}
        </text>
      )}
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          {stops}
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={BAR_WIDTH} height={BAR_HEIGHT} fill={`url(#${gradientId})`} rx={2} />
      <text x={BAR_WIDTH + 5} y={10} fontSize={10} fill="var(--semiotic-text-secondary, #666)">
        {fmt(domain[1])}
      </text>
      <text x={BAR_WIDTH + 5} y={BAR_HEIGHT} fontSize={10} fill="var(--semiotic-text-secondary, #666)">
        {fmt(domain[0])}
      </text>
    </g>
  )
}

export default function Legend(props: LegendProps) {
  const {
    legendGroups,
    customClickBehavior,
    customHoverBehavior,
    highlightedCategory,
    isolatedCategories,
    legendInteraction,
    title = "Legend",
    width = 100,
    height = 20,
    orientation = "vertical",
    legendLayout
  } = props
  const metrics = resolveLegendMetrics(legendLayout)

  const [focusedGroupIndex, setFocusedGroupIndex] = React.useState(0)
  const [focusedItemIndex, setFocusedItemIndex] = React.useState(0)

  const handleFocusedIndexChange = React.useCallback((groupIdx: number, itemIdx: number) => {
    setFocusedGroupIndex(groupIdx)
    setFocusedItemIndex(itemIdx)
  }, [])

  const renderedGroups =
    orientation === "vertical"
      ? renderVerticalGroup({
          legendGroups: legendGroups || [],
          width,
          customClickBehavior,
          customHoverBehavior,
          highlightedCategory,
          isolatedCategories,
          focusedGroupIndex,
          focusedItemIndex,
          onFocusedIndexChange: handleFocusedIndexChange,
          legendInteraction,
          metrics
        })
      : renderHorizontalGroup({
          legendGroups: legendGroups || [],
          title,
          height,
          width,
          customClickBehavior,
          customHoverBehavior,
          highlightedCategory,
          isolatedCategories,
          focusedGroupIndex,
          focusedItemIndex,
          onFocusedIndexChange: handleFocusedIndexChange,
          legendInteraction,
          metrics
        })

  const isInteractive = Boolean(customClickBehavior || customHoverBehavior)

  return (
    <g role={isInteractive ? "listbox" : undefined} aria-multiselectable={isInteractive && (legendInteraction === "isolate" || (legendInteraction === undefined && isolatedCategories != null)) ? true : undefined} aria-label="Chart legend" style={{ fontFamily: "var(--semiotic-font-family, sans-serif)" }}>
      {title !== undefined && title !== "" && orientation === "vertical" && (
        <text
          className="legend-title"
          y={16}
          x={width / 2}
          textAnchor="middle"
          style={{ fontSize: "var(--semiotic-legend-font-size, 12px)" }}
          fill="var(--semiotic-text, #333)"
        >
          {title}
        </text>
      )}
      {renderedGroups}
    </g>
  )
}
