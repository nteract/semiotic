import * as React from "react"
import { arc } from "d3-shape"
import { scaleLinear } from "d3-scale"

export const circleNodeGenerator = ({
  d,
  i,
  styleFn,
  renderMode,
  key,
  className,
  transform
}) => {
  //this is repetitious
  const style = styleFn(d, i)
  return (
    <rect
      key={key}
      transform={transform}
      width={d.nodeSize * 2}
      height={d.nodeSize * 2}
      ry={d.nodeSize * 2}
      rx={d.nodeSize * 2}
      x={-d.nodeSize}
      y={-d.nodeSize}
      {...style}
      style={style}
      className={className}
      aria-label={`Node ${d.id}`}
      tabIndex={-1}
    />
  )
}

export const gridProps = (gridSize) => {
  return {
    x: -gridSize / 2,
    y: -gridSize / 2,
    width: gridSize,
    height: gridSize
  }
}

export const sankeyNodeGenerator = ({
  d,
  i,
  styleFn,
  renderMode,
  key,
  className,
  transform
}) => {
  const height = d.direction !== "down" ? d.height : d.width
  const width = d.direction !== "down" ? d.width : d.height

  if (!d) {
    return <g />
  }

  return (
    <rect key={key}
      className={className}
      transform={transform}

      height={height}
      width={width}
      x={-width / 2}
      y={-height / 2}
      rx={0}
      ry={0}
      style={styleFn(d)}
      aria-label={`Node ${d.id}`}
      tabIndex={-1}
    />
  )
}

export const chordNodeGenerator =
  (size) =>
  ({ d, i, styleFn, renderMode, key, className }) => {
    if (!d) {
      return <g />
    }

    return (
      <path key={key}
        className={className}
        transform={`translate(${size[0] / 2},${size[1] / 2})`}

        d={d.d}
        style={styleFn(d, i)}
        aria-label={`Node ${d.id}`}
        tabIndex={-1}
      />
    )
  }

export const matrixNodeGenerator = (size, nodes) => {
  const gridSize = Math.min(...size)
  const stepSize = gridSize / (nodes.length + 1)

  return ({ d, i, styleFn, renderMode, key, className }) => {
    if (!d) {
      return <g />
    }

    const showText = stepSize > 6
    const showLine = stepSize > 3
    const showRect = stepSize > 0.5

    const textProps: {
      textAnchor: "inherit" | "middle" | "end" | "start"
      fontSize: string
    } = {
      textAnchor: "end",
      fontSize: `${stepSize / 2}px`
    }
    const style = styleFn(d, i)
    const renderModeValue = renderMode ? renderMode(d, i) : undefined

    return (
      <g key={key} className={className}>
        {showRect && (
          <rect
            x={stepSize / 2}
            y={d.y - stepSize / 2}
            width={gridSize - stepSize}
            height={stepSize}
            style={{ ...style, stroke: "none" }}
          />
        )}
        {showRect && (
          <rect
            y={stepSize / 2}
            x={d.y - stepSize / 2}
            height={gridSize - stepSize}
            width={stepSize}
            style={{ ...style, stroke: "none" }}
          />
        )}
        {showLine && (
          <line
            stroke="black"
            x1={0}
            x2={gridSize - stepSize / 2}
            y1={d.y - stepSize / 2}
            y2={d.y - stepSize / 2}
            style={style}
          />
        )}
        {showLine && (
          <line
            stroke="black"
            y1={0}
            y2={gridSize - stepSize / 2}
            x1={d.y - stepSize / 2}
            x2={d.y - stepSize / 2}
            style={style}
          />
        )}
        {showLine && i === nodes.length - 1 && (
          <line
            stroke="black"
            x1={0}
            x2={gridSize - stepSize / 2}
            y1={d.y + stepSize / 2}
            y2={d.y + stepSize / 2}
            style={style}
          />
        )}
        {showLine && i === nodes.length - 1 && (
          <line
            stroke="black"
            y1={0}
            y2={gridSize - stepSize / 2}
            x1={d.y + stepSize / 2}
            x2={d.y + stepSize / 2}
            style={style}
          />
        )}
        {showText && (
          <text x={0} y={d.y + stepSize / 5} {...textProps}>
            {d.id}
          </text>
        )}
        {showText && (
          <text
            transform={`translate(${d.y}) rotate(90) translate(0,${
              stepSize / 5
            })`}
            {...textProps}
            y={0}
          >
            {d.id}
          </text>
        )}
      </g>
    )
  }
}

export const radialRectNodeGenerator = (size, center, type) => {
  const radialArc = arc()
  const { angleRange = [0, 360] } = type
  const rangePct = angleRange.map((d) => d / 360)
  const rangeMod = rangePct[1] - rangePct[0]

  const adjustedPct =
    rangeMod < 1 ? scaleLinear().domain([0, 1]).range(rangePct) : (d) => d

  return ({ d, i, styleFn, renderMode, key, className }) => {
    if (!d) {
      return <g />
    }

    radialArc.innerRadius(d.y0 / 2).outerRadius(d.y1 / 2)

    return (
      <path key={key}
        transform={`translate(${center})`}

        d={radialArc({
          startAngle: adjustedPct(d.x0 / size[0]) * Math.PI * 2,
          endAngle: adjustedPct(d.x1 / size[0]) * Math.PI * 2
        })}
        style={styleFn(d, i)}
        className={className}
        aria-label={`Node ${d.id}`}
        tabIndex={-1}
      />
    )
  }
}

export const radialLabelGenerator = (node, nodei, nodeIDAccessor, size) => {
  const anglePct = (node.x1 + node.x0) / 2 / size[0]
  const nodeLabel = nodeIDAccessor(node, nodei)
  const labelRotate = anglePct > 0.5 ? anglePct * 360 + 90 : anglePct * 360 - 90

  return (
    <g transform={`rotate(${labelRotate})`}>
      {typeof nodeLabel === "string" ? (
        <text textAnchor="middle" y={5}>
          {nodeLabel}
        </text>
      ) : (
        nodeLabel
      )}
    </g>
  )
}

export const hierarchicalRectNodeGenerator = ({
  d,
  i,
  styleFn,
  renderMode,
  key,
  className
}) => {
  if (!d) {
    return <g />
  }
  //this is repetitious
  return (
    <rect key={key}
      transform={`translate(0,0)`}

      width={d.x1 - d.x0}
      height={d.y1 - d.y0}
      x={d.x0}
      y={d.y0}
      rx={0}
      ry={0}
      style={styleFn(d, i)}
      className={className}
      aria-label={`Node ${d.id}`}
      tabIndex={-1}
    />
  )
}
