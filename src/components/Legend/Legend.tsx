import * as React from "react"

import { LegendGroup, ItemType, LegendProps } from "./types/legendTypes"

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

const renderLegendGroupVertical = (
  legendGroup: LegendGroup,
  customClickBehavior?: Function
) => {
  const { type = "fill", styleFn, items } = legendGroup
  const renderedItems = []
  let itemOffset = 0
  items.forEach((item, i) => {
    const renderedType = renderType(item, i, type, styleFn)
    renderedItems.push(
      <g
        key={`legend-item-${i}`}
        transform={`translate(0,${itemOffset})`}
        onClick={
          customClickBehavior ? () => customClickBehavior(item) : undefined
        }
        style={{
          cursor: customClickBehavior ? "pointer" : "default"
        }}
      >
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
  customClickBehavior?: Function
) => {
  const { type = "fill", styleFn, items } = legendGroup
  const renderedItems = []
  let itemOffset = 0
  items.forEach((item, i) => {
    const renderedType = renderType(item, i, type, styleFn)
    renderedItems.push(
      <g
        key={`legend-item-${i}`}
        transform={`translate(${itemOffset},0)`}
        onClick={
          customClickBehavior ? () => customClickBehavior(item) : undefined
        }
        style={{
          cursor: customClickBehavior ? "pointer" : "default"
        }}
      >
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
  customClickBehavior
}: {
  legendGroups: LegendGroup[]
  width: number
  customClickBehavior?: Function
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
        {renderLegendGroupVertical(l, customClickBehavior)}
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
  customClickBehavior
}: {
  legendGroups: LegendGroup[]
  title: string | boolean
  height: number
  customClickBehavior?: Function
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

    const renderedItems = renderLegendGroupHorizontal(l, customClickBehavior)

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
          customClickBehavior
        })
      : renderHorizontalGroup({
          legendGroups,
          title,
          height,
          customClickBehavior
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
