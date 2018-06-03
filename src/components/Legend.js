//@flow

import React from "react"
import PropTypes from "prop-types"

const typeHash = {
  fill: style => <rect style={style} width={20} height={20} />,
  line: style => <line style={style} x1={0} y1={0} x2={20} y2={20} />
}

type SupportedLegendGlyps = "fill" | "line"

type ItemType = SupportedLegendGlyps | Function

type LegendGroup = {
  type?: ItemType,
  styleFn: Function,
  items: Array<Object>,
  label: string
}

type Props = {
    legendGroups: Array<LegendGroup>,
    title?: string,
    width?: number,
    height?: number,
    orientation?: string
}

function renderType(item:Object, i:number, type:ItemType, styleFn:Function) {
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

class Legend extends React.Component<Props, null> {
  renderLegendGroup(legendGroup:LegendGroup) {
    const { type = "fill", styleFn, items } = legendGroup
    const renderedItems = []
    let itemOffset = 0
    items.forEach((item, i) => {
      const renderedType = renderType(item, i, type, styleFn)
      renderedItems.push(
        <g key={`legend-item-${i}`} transform={`translate(0,${itemOffset})`}>
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

  renderLegendGroupHorizontal(legendGroup:LegendGroup) {
    const { type = "fill", styleFn, items } = legendGroup
    const renderedItems = []
    let itemOffset = 0
    items.forEach((item, i) => {
      const renderedType = renderType(item, i, type, styleFn)
      renderedItems.push(
        <g key={`legend-item-${i}`} transform={`translate(${itemOffset},0)`}>
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

  renderGroup({ legendGroups, width }:{ legendGroups: Array<LegendGroup>, width: number }) {
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
          {this.renderLegendGroup(l)}
        </g>
      )
      offset += l.items.length * 25 + 10
    })

    return renderedGroups
  }

  renderHorizontalGroup({ legendGroups, title, height }:{ legendGroups:Array<LegendGroup>, title: string, height: number }) {
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

      const renderedItems = this.renderLegendGroupHorizontal(l)

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

  render() {
    const {
      legendGroups,
      title = "Legend",
      width = 100,
      height = 20,
      orientation = "vertical"
    } = this.props
    const renderedGroups =
      orientation === "vertical"
        ? this.renderGroup({
            legendGroups,
            title,
            width,
            orientation
          })
        : this.renderHorizontalGroup({
            legendGroups,
            title,
            height,
            orientation,
            title
          })

    return (
      <g>
        {title !== false && (
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
}

Legend.propTypes = {
  title: PropTypes.string,
  width: PropTypes.number,
  legendGroups: PropTypes.array
}

export default Legend
