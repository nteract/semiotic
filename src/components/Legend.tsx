import { moveLegendFocus } from "./legendKeyboard"
import * as React from "react"
import { LEGEND_FONT_STYLE, LEGEND_LABEL_STYLE } from "./legendStyles"

import {
  LegendGroup,
  LegendItem,
  ItemType,
  LegendProps
} from "./types/legendTypes"
import {
  estimateLegendTextWidth,
  fitLegendRows,
  fitSideLegend,
  legendDisplayLabel,
  legendMoreLabel,
  legendMoreTitle,
  legendRowsFor,
  resolveLegendMetrics,
  sideLegendSlotOffset,
  truncateLegendLabel,
  type LegendMetrics,
  type SideLegendFit,
  type SideLegendGroupFit
} from "./legendGeometry"

export { GradientLegend } from "./GradientLegend"

function renderType(
  item: LegendItem,
  i: number,
  type: ItemType,
  styleFn: (item: LegendItem, index: number) => React.CSSProperties,
  swatchSize: number
) {
  if (typeof type === "function") return type(item)
  const style = styleFn(item, i)
  return type === "fill"
    ? <rect style={style} width={swatchSize} height={swatchSize} />
    : <line style={style} x1={0} y1={0} x2={swatchSize} y2={swatchSize} />
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

type LegendRenderContext = Omit<LegendItemRenderContext, "legendGroup" | "groupIndex">

function renderCategoricalLegendItem(
  context: LegendItemRenderContext,
  item: LegendItem,
  index: number,
  transform: string,
  horizontal: boolean,
  maxLabelWidth = Number.POSITIVE_INFINITY
) {
  const {
    legendGroup: { type = "fill", styleFn },
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
  const displayLabel = legendDisplayLabel(item.label)
  const text = truncateLegendLabel(displayLabel, maxLabelWidth)
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
      aria-label={displayLabel}
      onKeyDown={
        interactive
          ? (event: React.KeyboardEvent<SVGGElement>) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                customClickBehavior?.(item)
              }
              moveLegendFocus(event, horizontal)
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
          width={swatchSize + labelGap + 2 + estimateLegendTextWidth(text)}
          height={swatchSize + 4}
          fill="none"
          stroke="var(--semiotic-focus, #005fcc)"
          strokeWidth={2}
          rx={3}
          visibility="hidden"
        />
      )}
      {text !== displayLabel && <title>{displayLabel}</title>}
      {renderType(item, index, type, styleFn, swatchSize)}
      {isolated && <CheckMark swatchSize={swatchSize} />}
      <text
        y={swatchSize / 2}
        x={swatchSize + labelGap}
        dominantBaseline="central"
        fontSize={12}
        style={LEGEND_LABEL_STYLE}
        fill="var(--semiotic-text, #333)"
      >
        {text}
      </text>
    </g>
  )
}

const renderLegendGroupVertical = (
  context: LegendItemRenderContext,
  fit: SideLegendFit,
  groupFit: SideLegendGroupFit
) => {
  const { items } = context.legendGroup
  const rendered: React.ReactElement[] = []
  for (let index = 0; index < groupFit.visibleCount; index++) {
    const item = items[index]
    if (!item) continue
    const { x, y } = sideLegendSlotOffset(fit, groupFit, index)
    rendered.push(renderCategoricalLegendItem(
      context, item, index, `translate(${x},${y})`, false, fit.labelWidth
    ))
  }
  if (groupFit.hiddenCount > 0) {
    const { x, y } = sideLegendSlotOffset(fit, groupFit, groupFit.visibleCount)
    rendered.push(renderMoreSlot(context, x, y, groupFit.visibleCount))
  }
  return rendered
}

/** The "+N more" slot standing in for items a bounded legend cannot fit. */
function renderMoreSlot(
  context: LegendItemRenderContext,
  x: number,
  y: number,
  visibleCount: number
) {
  const { items } = context.legendGroup
  return (
    <text
      key="legend-more"
      className="semiotic-legend-more"
      transform={`translate(${x},${y})`}
      y={context.metrics.swatchSize / 2}
      dominantBaseline="central"
      fontSize={12}
      style={LEGEND_LABEL_STYLE}
      fill="var(--semiotic-text-secondary, #666)"
    >
      <title>{legendMoreTitle(items, visibleCount)}</title>
      {legendMoreLabel(items.length - visibleCount)}
    </text>
  )
}

const renderLegendGroupHorizontal = (
  context: LegendItemRenderContext,
  maxWidth: number | undefined,
  maxRows: number
) => {
  const { items } = context.legendGroup
  const renderedItems: React.ReactElement[] = []
  const { swatchSize, labelGap, itemGap, rowHeight, align } = context.metrics
  const labelOffset = swatchSize + labelGap
  const fit = fitLegendRows(
    items.map((item) => labelOffset + estimateLegendTextWidth(legendDisplayLabel(item.label))),
    { itemGap, labelOffset, maxWidth, maxRows }
  )

  fit.rows.forEach((row, rowIndex) => {
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
          true,
          fit.widths[i] - labelOffset
        )
      )
      itemOffset += fit.widths[i] + itemGap
    }
    if (fit.hiddenCount > 0 && rowIndex === fit.rows.length - 1) {
      renderedItems.push(
        renderMoreSlot(context, rowOffset + fit.moreX, rowIndex * rowHeight, fit.visibleCount)
      )
    }
  })

  const totalRows = fit.rows.length
  const totalHeight = totalRows * rowHeight
  return { items: renderedItems, offset: fit.width, totalRows, totalHeight }
}

const renderVerticalGroup = (
  legendGroups: LegendGroup[],
  width: number,
  context: LegendRenderContext,
  layoutConfig: LegendProps["legendLayout"],
  maxHeight: number | undefined
) => {
  const renderedGroups: React.ReactElement[] = []
  // Without a height bound this is the historic single column. Frames pass
  // their remaining height, and `width` is then the most the legend may use.
  const fit = fitSideLegend(
    legendGroups,
    layoutConfig,
    maxHeight != null ? { maxWidth: width, maxHeight } : undefined
  )
  const groupLabelWidth = maxHeight != null ? width : Number.POSITIVE_INFINITY

  legendGroups.forEach((l, i) => {
    const layout = fit.groups[i]
    const groupLabel = l.label ? truncateLegendLabel(l.label, groupLabelWidth) : l.label
    renderedGroups.push(
      <line
        key={`legend-top-line legend-symbol-${i}`}
        aria-hidden="true"
        stroke="var(--semiotic-border, #808080)"
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
          aria-hidden={context.interactive || undefined}
          fontSize={12}
          style={LEGEND_LABEL_STYLE}
          fill="var(--semiotic-text, #333)"
        >
          {groupLabel !== l.label && <title>{l.label}</title>}
          {groupLabel}
        </text>
      )
    }

    renderedGroups.push(
      <g
        key={`legend-group-${i}`}
        className="legend-item"
        role={context.interactive ? "group" : undefined}
        aria-label={l.label}
        transform={`translate(0,${layout.itemsY})`}
      >
        {renderLegendGroupVertical({ ...context, legendGroup: l, groupIndex: i }, fit, layout)}
      </g>
    )
  })

  return renderedGroups
}

const renderHorizontalGroup = (
  legendGroups: LegendGroup[],
  width: number,
  height: number,
  context: LegendRenderContext,
  maxHeight: number | undefined
) => {
  const { metrics } = context
  // Frames pass the band reserved for the legend; rows beyond it end in
  // "+N more" rather than running off the chart.
  const maxRows = maxHeight != null
    ? legendRowsFor(maxHeight, metrics.rowHeight, legendGroups.length)
    : Number.POSITIVE_INFINITY
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
      { ...context, legendGroup: l, groupIndex: i }, metrics.maxWidth ?? width, maxRows
    )
    groupWidth += renderedItems.offset + 5
    groupResults.push({
      ...renderedItems,
      offset: groupWidth
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
          aria-hidden={context.interactive || undefined}
          fontSize={12}
          style={LEGEND_LABEL_STYLE}
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
        role={context.interactive ? "group" : undefined}
        aria-label={l.label}
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
          aria-hidden="true"
          stroke="var(--semiotic-border, #808080)"
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
    legendLayout,
    maxHeight
  } = props
  const metrics = resolveLegendMetrics(legendLayout)

  const [focusedIndex, setFocusedIndex] = React.useState({ group: 0, item: 0 })
  const rootRef = React.useRef<SVGGElement>(null)
  const focusedElementRef = React.useRef<SVGGElement | null>(null)
  const groups = legendGroups || []
  const focusedGroupIndex = groups[focusedIndex.group]?.items.length
    ? focusedIndex.group
    : groups.findIndex((group) => group.items.length > 0)
  const focusedItemIndex = Math.min(
    focusedIndex.item,
    (groups[focusedGroupIndex]?.items.length ?? 1) - 1
  )

  React.useEffect(() => {
    const previous = focusedElementRef.current
    if (previous && !previous.isConnected && document.activeElement === document.body) {
      rootRef.current?.querySelector<SVGGElement>("[tabindex='0']")?.focus()
    }
  })

  const handleFocusedIndexChange = React.useCallback(
    (groupIdx: number, itemIdx: number) => {
      setFocusedIndex({ group: groupIdx, item: itemIdx })
    },
    []
  )

  const isInteractive = Boolean(customClickBehavior || customHoverBehavior)
  const context: LegendRenderContext = {
    customClickBehavior, customHoverBehavior, highlightedCategory, isolatedCategories,
    focusedGroupIndex, focusedItemIndex, onFocusedIndexChange: handleFocusedIndexChange,
    interactive: isInteractive,
    useIsolateAria: legendInteraction === "isolate" || (legendInteraction === undefined && isolatedCategories != null),
    metrics,
  }
  const renderedGroups = orientation === "vertical"
    ? renderVerticalGroup(groups, width, context, legendLayout, maxHeight)
    : renderHorizontalGroup(groups, width, height, context, maxHeight)

  return (
    <g
      ref={rootRef}
      onFocusCapture={(event) => {
        if (event.target instanceof SVGElement && event.target.getAttribute("role") === "option") {
          focusedElementRef.current = event.target as SVGGElement
        }
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          focusedElementRef.current = null
        }
      }}
      role={isInteractive ? "listbox" : undefined}
      aria-multiselectable={
        isInteractive &&
        context.useIsolateAria
          ? true
          : undefined
      }
      aria-label={typeof title === "string" && title ? title : "Chart legend"}
      aria-orientation={isInteractive ? orientation === "vertical" ? "vertical" : "horizontal" : undefined}
      style={LEGEND_FONT_STYLE}
    >
      {title !== undefined && title !== "" && orientation === "vertical" && (
        <text
          className="legend-title"
          aria-hidden={isInteractive || undefined}
          y={16}
          x={width / 2}
          textAnchor="middle"
          fontSize={12}
          style={LEGEND_LABEL_STYLE}
          fill="var(--semiotic-text, #333)"
        >
          {title}
        </text>
      )}
      {renderedGroups}
    </g>
  )
}
