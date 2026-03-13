// @ts-nocheck
import * as React from "react"

import { LegendGroup, LegendItem, ItemType, LegendProps } from "./types/legendTypes"

const typeHash = {
  fill: (style: Object) => <rect style={style} width={20} height={20} />,
  line: (style: Object) => <line style={style} x1={0} y1={0} x2={20} y2={20} />
}

function renderType(
  item: Object,
  i: number,
  type: ItemType,
  styleFn: Function
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

/** Checkmark SVG for isolated items */
function CheckMark() {
  return (
    <path
      d="M2,6 L5,9 L10,3"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      transform="translate(-14, 5)"
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
  customClickBehavior?: Function,
  customHoverBehavior?: (item: LegendItem | null) => void,
  highlightedCategory?: string | null,
  isolatedCategories?: Set<string>
) => {
  const { type = "fill", styleFn, items } = legendGroup
  const renderedItems = []
  let itemOffset = 0
  const interactive = !!(customClickBehavior || customHoverBehavior)
  items.forEach((item, i) => {
    const renderedType = renderType(item, i, type, styleFn)
    const opacity = itemOpacity(item, highlightedCategory, isolatedCategories)
    const isIsolated = isolatedCategories && isolatedCategories.size > 0 && isolatedCategories.has(item.label)
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
        style={{
          cursor: interactive ? "pointer" : "default",
          opacity,
          transition: "opacity 150ms ease",
          pointerEvents: "all",
        }}
      >
        {isIsolated && <CheckMark />}
        {renderedType}
        <text y={15} x={30}>
          {item.label}
        </text>
      </g>
    )
    itemOffset += 25
  })
  return renderedItems
}

const renderLegendGroupHorizontal = (
  legendGroup: LegendGroup,
  customClickBehavior?: Function,
  customHoverBehavior?: (item: LegendItem | null) => void,
  highlightedCategory?: string | null,
  isolatedCategories?: Set<string>
) => {
  const { type = "fill", styleFn, items } = legendGroup
  const renderedItems = []
  let itemOffset = 0
  const interactive = !!(customClickBehavior || customHoverBehavior)
  items.forEach((item, i) => {
    const renderedType = renderType(item, i, type, styleFn)
    const opacity = itemOpacity(item, highlightedCategory, isolatedCategories)
    const isIsolated = isolatedCategories && isolatedCategories.size > 0 && isolatedCategories.has(item.label)
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
        style={{
          cursor: interactive ? "pointer" : "default",
          opacity,
          transition: "opacity 150ms ease",
          pointerEvents: "all",
        }}
      >
        {isIsolated && <CheckMark />}
        {renderedType}
        <text y={15} x={25}>
          {item.label}
        </text>
      </g>
    )
    itemOffset += 35
    itemOffset += item.label.length * 8
  })
  return { items: renderedItems, offset: itemOffset }
}

const renderVerticalGroup = ({
  legendGroups,
  width,
  customClickBehavior,
  customHoverBehavior,
  highlightedCategory,
  isolatedCategories
}: {
  legendGroups: LegendGroup[]
  width: number
  customClickBehavior?: Function
  customHoverBehavior?: (item: LegendItem | null) => void
  highlightedCategory?: string | null
  isolatedCategories?: Set<string>
}) => {
  let offset = 30

  const renderedGroups = []

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
    offset += 10
    if (l.label) {
      offset += 20
      renderedGroups.push(
        <text
          key={`legend-text-${i}`}
          y={offset}
          className="legend-group-label"
        >
          {l.label}
        </text>
      )
      offset += 10
    }

    renderedGroups.push(
      <g
        key={`legend-group-${i}`}
        className="legend-item"
        transform={`translate(0,${offset})`}
      >
        {renderLegendGroupVertical(l, customClickBehavior, customHoverBehavior, highlightedCategory, isolatedCategories)}
      </g>
    )
    offset += l.items.length * 25 + 10
  })

  return renderedGroups
}

const renderHorizontalGroup = ({
  legendGroups,
  title,
  height,
  customClickBehavior,
  customHoverBehavior,
  highlightedCategory,
  isolatedCategories
}: {
  legendGroups: LegendGroup[]
  title: string | boolean
  height: number
  customClickBehavior?: Function
  customHoverBehavior?: (item: LegendItem | null) => void
  highlightedCategory?: string | null
  isolatedCategories?: Set<string>
}) => {
  let offset = 0

  const renderedGroups = []

  const verticalOffset = title === false ? 10 : 40

  legendGroups.forEach((l, i) => {
    if (l.label) {
      renderedGroups.push(
        <text
          key={`legend-text-${i}`}
          transform={`translate(${offset},${verticalOffset}) rotate(90)`}
          textAnchor="start"
          className="legend-group-label"
        >
          {l.label}
        </text>
      )
      offset += 20
    }

    const renderedItems = renderLegendGroupHorizontal(l, customClickBehavior, customHoverBehavior, highlightedCategory, isolatedCategories)

    renderedGroups.push(
      <g
        key={`legend-group-${i}`}
        className="legend-item"
        transform={`translate(${offset},${verticalOffset})`}
      >
        {renderedItems.items}
      </g>
    )
    offset += renderedItems.offset + 5

    if (legendGroups[i + 1]) {
      renderedGroups.push(
        <line
          key={`legend-top-line legend-symbol-${i}`}
          stroke="gray"
          x1={offset}
          y1={verticalOffset - 10}
          x2={offset}
          y2={height + verticalOffset + 10}
        />
      )
    }
    offset += 15
  })

  return (
    <g>
      {title !== false && (
        <line
          x1={0}
          x2={offset + 10}
          y1={verticalOffset - 10}
          y2={verticalOffset - 10}
          stroke="gray"
          className="title-neatline"
        />
      )}
      {renderedGroups}
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
    title = "Legend",
    width = 100,
    height = 20,
    orientation = "vertical"
  } = props
  const renderedGroups =
    orientation === "vertical"
      ? renderVerticalGroup({
          legendGroups,
          width,
          customClickBehavior,
          customHoverBehavior,
          highlightedCategory,
          isolatedCategories
        })
      : renderHorizontalGroup({
          legendGroups,
          title,
          height,
          customClickBehavior,
          customHoverBehavior,
          highlightedCategory,
          isolatedCategories
        })

  return (
    <g>
      {title !== undefined && (
        <text
          className="legend-title"
          y={20}
          x={orientation === "horizontal" ? 0 : width / 2}
          textAnchor={orientation === "horizontal" ? "start" : "middle"}
        >
          {title}
        </text>
      )}
      {renderedGroups}
    </g>
  )
}
