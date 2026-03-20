import * as React from "react"

import { LegendGroup, LegendItem, ItemType, LegendProps, GradientLegendConfig } from "./types/legendTypes"

const SWATCH = 16

const typeHash: Record<"fill" | "line", (style: React.CSSProperties) => React.ReactElement> = {
  fill: (style) => <rect style={style} width={SWATCH} height={SWATCH} />,
  line: (style) => <line style={style} x1={0} y1={0} x2={SWATCH} y2={SWATCH} />
}

function renderType(
  item: LegendItem,
  i: number,
  type: ItemType,
  styleFn: (item: LegendItem, index: number) => React.CSSProperties
) {
  let renderedType
  if (typeof type === "function") {
    renderedType = type(item)
  } else {
    const Type = typeHash[type]
    const style = styleFn(item, i)
    renderedType = Type(style)
  }
  return renderedType
}

/** Checkmark SVG for isolated items — centered on the swatch */
function CheckMark() {
  return (
    <path
      d={`M${SWATCH * 0.25},${SWATCH * 0.55} L${SWATCH * 0.45},${SWATCH * 0.75} L${SWATCH * 0.8},${SWATCH * 0.3}`}
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
  legendInteraction?: string
) => {
  const { type = "fill", styleFn, items } = legendGroup
  const renderedItems: React.ReactElement[] = []
  let itemOffset = 0
  const interactive = !!(customClickBehavior || customHoverBehavior)
  const useIsolateAria = legendInteraction === "isolate" || (legendInteraction === undefined && isolatedCategories != null)
  const ROW_HEIGHT = 22
  items.forEach((item, i) => {
    const renderedType = renderType(item, i, type, styleFn)
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
          width={SWATCH + 8 + item.label.length * 7}
          height={SWATCH + 4}
          fill="none"
          stroke="var(--semiotic-focus, #005fcc)"
          strokeWidth={2}
          rx={3}
          visibility="hidden"
        />}
        {renderedType}
        {isIsolated && <CheckMark />}
        <text y={SWATCH / 2} x={SWATCH + 6} dominantBaseline="central" fontSize={12} fill="var(--semiotic-text, #333)">
          {item.label}
        </text>
      </g>
    )
    itemOffset += ROW_HEIGHT
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
  legendInteraction?: string
) => {
  const { type = "fill", styleFn, items } = legendGroup
  const renderedItems: React.ReactElement[] = []
  let itemOffset = 0
  const interactive = !!(customClickBehavior || customHoverBehavior)
  const useIsolateAria = legendInteraction === "isolate" || (legendInteraction === undefined && isolatedCategories != null)
  items.forEach((item, i) => {
    const renderedType = renderType(item, i, type, styleFn)
    const opacity = itemOpacity(item, highlightedCategory, isolatedCategories)
    const isIsolated = isolatedCategories && isolatedCategories.size > 0 && isolatedCategories.has(item.label)
    const isHighlighted = highlightedCategory != null && item.label === highlightedCategory
    renderedItems.push(
      <g
        key={`legend-item-${i}`}
        transform={`translate(${itemOffset},0)`}
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
          width={SWATCH + 8 + item.label.length * 7}
          height={SWATCH + 4}
          fill="none"
          stroke="var(--semiotic-focus, #005fcc)"
          strokeWidth={2}
          rx={3}
          visibility="hidden"
        />}
        {renderedType}
        {isIsolated && <CheckMark />}
        <text y={SWATCH / 2} x={SWATCH + 6} dominantBaseline="central" fontSize={12} fill="var(--semiotic-text, #333)">
          {item.label}
        </text>
      </g>
    )
    itemOffset += SWATCH + 10 + item.label.length * 7
  })
  return { items: renderedItems, offset: itemOffset }
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
  legendInteraction
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
}) => {
  let offset = 24

  const renderedGroups: React.ReactElement[] = []

  legendGroups.forEach((l, i) => {
    offset += 5
    renderedGroups.push(
      <line
        key={`legend-top-line legend-symbol-${i}`}
        stroke="gray"
        x1={0}
        y1={offset}
        x2={width}
        y2={offset}
      />
    )
    offset += 8
    if (l.label) {
      offset += 16
      renderedGroups.push(
        <text
          key={`legend-text-${i}`}
          y={offset}
          className="legend-group-label"
          fontSize={12}
          fill="var(--semiotic-text, #333)"
        >
          {l.label}
        </text>
      )
      offset += 8
    }

    renderedGroups.push(
      <g
        key={`legend-group-${i}`}
        className="legend-item"
        transform={`translate(0,${offset})`}
      >
        {renderLegendGroupVertical(l, customClickBehavior, customHoverBehavior, highlightedCategory, isolatedCategories, focusedGroupIndex, focusedItemIndex, i, onFocusedIndexChange, legendInteraction)}
      </g>
    )
    offset += l.items.length * 22 + 8
  })

  return renderedGroups
}

const renderHorizontalGroup = ({
  legendGroups,
  title,
  height,
  width,
  customClickBehavior,
  customHoverBehavior,
  highlightedCategory,
  isolatedCategories,
  focusedGroupIndex,
  focusedItemIndex,
  onFocusedIndexChange,
  legendInteraction
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
}) => {
  // First pass: compute total width of all items
  let totalItemsWidth = 0
  const groupResults: { label?: string; items: React.ReactElement[]; offset: number }[] = []

  legendGroups.forEach((l, i) => {
    let groupWidth = 0
    if (l.label) groupWidth += 16
    const renderedItems = renderLegendGroupHorizontal(l, customClickBehavior, customHoverBehavior, highlightedCategory, isolatedCategories, focusedGroupIndex, focusedItemIndex, i, onFocusedIndexChange, legendInteraction)
    groupWidth += renderedItems.offset + 5
    groupResults.push({ label: l.label, ...renderedItems, offset: groupWidth })
    totalItemsWidth += groupWidth + 12
  })

  // Center horizontally
  const startOffset = Math.max(0, (width - totalItemsWidth) / 2)
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
      renderedGroups.push(
        <line
          key={`legend-top-line legend-symbol-${i}`}
          stroke="gray"
          x1={offset}
          y1={verticalOffset - 8}
          x2={offset}
          y2={height + verticalOffset + 8}
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
        <text x={BAR_WIDTH / 2} y={-6} textAnchor="middle" fontSize={11} fill="var(--semiotic-text, #333)">
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
    orientation = "vertical"
  } = props

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
          legendInteraction
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
          legendInteraction
        })

  const isInteractive = Boolean(customClickBehavior || customHoverBehavior)

  return (
    <g role={isInteractive ? "listbox" : undefined} aria-multiselectable={isInteractive && legendInteraction === "isolate" ? true : undefined} aria-label="Chart legend">
      {title !== undefined && title !== "" && orientation === "vertical" && (
        <text
          className="legend-title"
          y={16}
          x={width / 2}
          textAnchor="middle"
          fontSize={12}
          fill="var(--semiotic-text, #333)"
        >
          {title}
        </text>
      )}
      {renderedGroups}
    </g>
  )
}
