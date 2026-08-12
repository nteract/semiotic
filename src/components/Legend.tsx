import * as React from "react"

import {
  LegendGroup,
  LegendItem,
  ItemType,
  LegendProps
} from "./types/legendTypes"
import {
  layoutVerticalLegendGroups,
  resolveLegendMetrics,
  type LegendMetrics
} from "./legendLayout"

export { GradientLegend } from "./GradientLegend"

const typeHash: Record<
  "fill" | "line",
  (style: React.CSSProperties, swatchSize: number) => React.ReactElement
> = {
  fill: (style, swatchSize) => (
    <rect style={style} width={swatchSize} height={swatchSize} />
  ),
  line: (style, swatchSize) => (
    <line style={style} x1={0} y1={0} x2={swatchSize} y2={swatchSize} />
  )
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

type LegendItemRenderContext = {
  legendGroup: LegendGroup
  customClickBehavior?: (item: LegendItem) => void
  customHoverBehavior?: (item: LegendItem | null) => void
  highlightedCategory?: string | null
  isolatedCategories?: Set<string>
  focusedGroupIndex: number
  focusedItemIndex: number
  groupIndex: number
  onFocusedIndexChange: (groupIndex: number, itemIndex: number) => void
  interactive: boolean
  useIsolateAria: boolean
  metrics: LegendMetrics
}

function renderCategoricalLegendItem(
  context: LegendItemRenderContext,
  item: LegendItem,
  index: number,
  transform: string,
  previousKey: string,
  nextKey: string
) {
  const {
    legendGroup: { type = "fill", styleFn, items },
    customClickBehavior,
    customHoverBehavior,
    highlightedCategory,
    isolatedCategories,
    focusedGroupIndex,
    focusedItemIndex,
    groupIndex,
    onFocusedIndexChange,
    interactive,
    useIsolateAria,
    metrics: { swatchSize, labelGap }
  } = context
  const isolated =
    !!isolatedCategories?.size && isolatedCategories.has(item.label)
  const highlighted =
    highlightedCategory != null && item.label === highlightedCategory
  return (
    <g
      key={`legend-item-${index}`}
      transform={transform}
      onClick={
        customClickBehavior ? () => customClickBehavior(item) : undefined
      }
      onMouseEnter={
        customHoverBehavior ? () => customHoverBehavior(item) : undefined
      }
      onMouseLeave={
        customHoverBehavior ? () => customHoverBehavior(null) : undefined
      }
      tabIndex={
        interactive
          ? groupIndex === focusedGroupIndex && index === focusedItemIndex
            ? 0
            : -1
          : undefined
      }
      role={interactive ? "option" : undefined}
      aria-selected={interactive && useIsolateAria ? isolated : undefined}
      aria-current={
        interactive && !useIsolateAria && highlighted ? true : undefined
      }
      aria-label={item.label}
      onKeyDown={
        interactive
          ? (event: React.KeyboardEvent<SVGGElement>) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                customClickBehavior?.(item)
              }
              if (event.key === previousKey || event.key === nextKey) {
                event.preventDefault()
                const nextIndex =
                  (index + (event.key === nextKey ? 1 : -1) + items.length) %
                  items.length
                onFocusedIndexChange(groupIndex, nextIndex)
                const sibling =
                  event.currentTarget.parentElement?.children[nextIndex]
                if (sibling instanceof SVGElement) sibling.focus()
              }
            }
          : undefined
      }
      onFocus={
        interactive
          ? (event: React.FocusEvent<SVGGElement>) => {
              onFocusedIndexChange(groupIndex, index)
              customHoverBehavior?.(item)
              event.currentTarget
                .querySelector(".semiotic-legend-focus-ring")
                ?.setAttribute("visibility", "visible")
            }
          : undefined
      }
      onBlur={
        interactive
          ? (event: React.FocusEvent<SVGGElement>) => {
              customHoverBehavior?.(null)
              event.currentTarget
                .querySelector(".semiotic-legend-focus-ring")
                ?.setAttribute("visibility", "hidden")
            }
          : undefined
      }
      style={{
        cursor: interactive ? "pointer" : "default",
        opacity: itemOpacity(item, highlightedCategory, isolatedCategories),
        transition: "opacity 150ms ease",
        pointerEvents: "all",
        outline: "none"
      }}
    >
      {interactive && (
        <rect
          className="semiotic-legend-focus-ring"
          x={-2}
          y={-2}
          width={swatchSize + labelGap + 2 + item.label.length * 7}
          height={swatchSize + 4}
          fill="none"
          stroke="var(--semiotic-focus, #005fcc)"
          strokeWidth={2}
          rx={3}
          visibility="hidden"
        />
      )}
      {renderType(item, index, type, styleFn, swatchSize)}
      {isolated && <CheckMark swatchSize={swatchSize} />}
      <text
        y={swatchSize / 2}
        x={swatchSize + labelGap}
        dominantBaseline="central"
        fontSize={12}
        style={{ fontSize: "var(--semiotic-legend-font-size, 12px)" }}
        fill="var(--semiotic-text, #333)"
      >
        {item.label}
      </text>
    </g>
  )
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
  const { items } = legendGroup
  const renderedItems: React.ReactElement[] = []
  let itemOffset = 0
  const interactive = !!(customClickBehavior || customHoverBehavior)
  const useIsolateAria =
    legendInteraction === "isolate" ||
    (legendInteraction === undefined && isolatedCategories != null)
  const context: LegendItemRenderContext = {
    legendGroup,
    customClickBehavior,
    customHoverBehavior,
    highlightedCategory,
    isolatedCategories,
    focusedGroupIndex,
    focusedItemIndex,
    groupIndex,
    onFocusedIndexChange,
    interactive,
    useIsolateAria,
    metrics
  }
  items.forEach((item, index) => {
    renderedItems.push(
      renderCategoricalLegendItem(
        context,
        item,
        index,
        `translate(0,${itemOffset})`,
        "ArrowUp",
        "ArrowDown"
      )
    )
    itemOffset += metrics.rowHeight
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
  const { items } = legendGroup
  const renderedItems: React.ReactElement[] = []
  const { swatchSize, labelGap, itemGap, rowHeight, align } = metrics
  const interactive = !!(customClickBehavior || customHoverBehavior)
  const useIsolateAria =
    legendInteraction === "isolate" ||
    (legendInteraction === undefined && isolatedCategories != null)
  const context: LegendItemRenderContext = {
    legendGroup,
    customClickBehavior,
    customHoverBehavior,
    highlightedCategory,
    isolatedCategories,
    focusedGroupIndex,
    focusedItemIndex,
    groupIndex,
    onFocusedIndexChange,
    interactive,
    useIsolateAria,
    metrics
  }
  const itemWidths = items.map(
    (item) => swatchSize + labelGap + item.label.length * 7
  )
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
  if (items.length > 0)
    rows.push({ start: rowStart, end: items.length, width: rowWidth })

  rows.forEach((row, rowIndex) => {
    const rowOffset =
      align === "center"
        ? Math.max(0, ((maxWidth ?? row.width) - row.width) / 2)
        : align === "end"
          ? Math.max(0, (maxWidth ?? row.width) - row.width)
          : 0
    let itemOffset = rowOffset
    for (let i = row.start; i < row.end; i++) {
      renderedItems.push(
        renderCategoricalLegendItem(
          context,
          items[i],
          i,
          `translate(${itemOffset},${rowIndex * rowHeight})`,
          "ArrowLeft",
          "ArrowRight"
        )
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
      itemCount: group.items.length
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
          fontSize={12}
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
        {renderLegendGroupVertical(
          l,
          customClickBehavior,
          customHoverBehavior,
          highlightedCategory,
          isolatedCategories,
          focusedGroupIndex,
          focusedItemIndex,
          i,
          onFocusedIndexChange,
          legendInteraction,
          metrics
        )}
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
  const groupResults: {
    label?: string
    items: React.ReactElement[]
    offset: number
    totalRows?: number
    totalHeight?: number
  }[] = []

  legendGroups.forEach((l, i) => {
    let groupWidth = 0
    if (l.label) groupWidth += 16
    const renderedItems = renderLegendGroupHorizontal(
      l,
      customClickBehavior,
      customHoverBehavior,
      highlightedCategory,
      isolatedCategories,
      focusedGroupIndex,
      focusedItemIndex,
      i,
      onFocusedIndexChange,
      legendInteraction,
      metrics,
      metrics.maxWidth ?? width
    )
    groupWidth += renderedItems.offset + 5
    groupResults.push({
      label: l.label,
      ...renderedItems,
      offset: groupWidth,
      totalRows: renderedItems.totalRows,
      totalHeight: renderedItems.totalHeight
    })
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
          fontSize={12}
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

  return <g>{renderedGroups}</g>
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

  const handleFocusedIndexChange = React.useCallback(
    (groupIdx: number, itemIdx: number) => {
      setFocusedGroupIndex(groupIdx)
      setFocusedItemIndex(itemIdx)
    },
    []
  )

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
    <g
      role={isInteractive ? "listbox" : undefined}
      aria-multiselectable={
        isInteractive &&
        (legendInteraction === "isolate" ||
          (legendInteraction === undefined && isolatedCategories != null))
          ? true
          : undefined
      }
      aria-label="Chart legend"
      style={{ fontFamily: "var(--semiotic-font-family, sans-serif)" }}
    >
      {title !== undefined && title !== "" && orientation === "vertical" && (
        <text
          className="legend-title"
          y={16}
          x={width / 2}
          textAnchor="middle"
          fontSize={12}
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
