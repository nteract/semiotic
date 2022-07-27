import * as React from "react"

import { Mark } from "semiotic-mark"

import {
  d as glyphD /*, project as glyphProject, mutate as glyphMutate*/
} from "d3-glyphedge"

import {
  arc,
  curveMonotoneX,
  curveMonotoneY,
  curveBasis,
  line,
  linkHorizontal,
  linkVertical,
  linkRadial
} from "d3-shape"
import { linearRibbon } from "./SvgHelper"
import { interpolateNumber } from "d3-interpolate"

import { scaleLinear } from "d3-scale"

import { arcTweener } from "./SvgHelper"

const horizontalDagreLineGenerator = line()
  .curve(curveMonotoneX)
  .x((d) => d.x)
  .y((d) => d.y)

const verticalDagreLineGenerator = line()
  .curve(curveMonotoneY)
  .x((d) => d.x)
  .y((d) => d.y)

function sankeyEdgeSort(a, b, direction) {
  if (a.circular && !b.circular) return -1
  if (b.circular && !a.circular) return 1
  const first = direction === "down" ? "y" : "x"
  const second = direction === "down" ? "x" : "y"

  return a.source[first] === b.source[first]
    ? a.sankeyWidth === b.sankeyWidth
      ? a.source[second] - b.source[second]
      : b.sankeyWidth - a.sankeyWidth
    : a.source[first] - b.source[first]
}

const sigmoidLinks = {
  horizontal: linkHorizontal()
    .x((d) => d.x)
    .y((d) => d.y),
  vertical: linkVertical()
    .x((d) => d.x)
    .y((d) => d.y),
  radial: glyphD.lineArc
}

const customEdgeHashD = {
  curve: (d, projection = "vertical") => sigmoidLinks[projection](d),
  linearc: (d) => glyphD.lineArc(d),
  ribbon: (d) => glyphD.ribbon(d, d.width),
  arrowhead: (d) =>
    glyphD.arrowHead(d, d.target.nodeSize, d.width, d.width * 1.5),
  halfarrow: (d) =>
    glyphD.halfArrow(d, d.target.nodeSize, d.width, d.width * 1.5),
  nail: (d) => glyphD.nail(d, d.source.nodeSize),
  comet: (d) => glyphD.comet(d, d.target.nodeSize),
  taffy: (d) =>
    glyphD.taffy(
      d,
      d.source.nodeSize / 2,
      d.target.nodeSize / 2,
      (d.source.nodeSize + d.target.nodeSize) / 4
    )
}

export const radialCurveGenerator = (size) => {
  const radialCurve = linkRadial()
    .angle((d) => (d.x / size[0]) * Math.PI * 2)
    .radius((d) => d.y)

  return ({ d, i, styleFn, renderMode, key, className, baseMarkProps }) => (
    <Mark
      {...baseMarkProps}
      key={key}
      transform={`translate(${50},${size[1] / 2 - 50})`}
      markType="path"
      d={radialCurve(d)}
      style={styleFn(d, i)}
      renderMode={renderMode ? renderMode(d, i) : undefined}
      className={className}
      aria-label={`Node ${d.id}`}
      tabIndex={-1}
    />
  )
}

export const circleNodeGenerator = ({
  d,
  i,
  styleFn,
  renderMode,
  key,
  className,
  transform,
  baseMarkProps
}) => {
  //this is repetitious

  return (
    <Mark
      {...baseMarkProps}
      key={key}
      transform={transform}
      markType="rect"
      width={d.nodeSize * 2}
      height={d.nodeSize * 2}
      ry={d.nodeSize * 2}
      rx={d.nodeSize * 2}
      x={-d.nodeSize}
      y={-d.nodeSize}
      style={styleFn(d, i)}
      renderMode={renderMode ? renderMode(d, i) : undefined}
      className={className}
      aria-label={`Node ${d.id}`}
      tabIndex={-1}
    />
  )
}

const gridProps = (gridSize) => {
  return {
    x: -gridSize / 2,
    y: -gridSize / 2,
    width: gridSize,
    height: gridSize
  }
}

export const matrixEdgeGenerator =
  (size, nodes) =>
  ({ d, i, styleFn, renderMode, key, className, baseMarkProps }) => {
    const gridSize = Math.min(...size) / nodes.length

    return (
      <g key={key}>
        <Mark
          {...baseMarkProps}
          renderMode={renderMode ? renderMode(d, i) : undefined}
          key={key}
          className={className}
          simpleInterpolate={true}
          transform={`translate(${d.source.y},${d.target.y})`}
          markType="rect"
          style={styleFn(d, i)}
          aria-label={`Connection from ${d.source.id} to ${d.target.id}`}
          tabIndex={-1}
          {...gridProps(gridSize)}
        />
      </g>
    )
  }

export const arcEdgeGenerator = (size) => {
  const yAdjust = size[1] / size[0]
  function arcDiagramArc(d) {
    const draw = line().curve(curveBasis)
    const midX = (d.source.x + d.target.x) / 2
    const midY = d.source.x - d.target.x
    return draw([
      [d.source.x, 0],
      [midX, midY * yAdjust],
      [d.target.x, 0]
    ])
  }

  return ({ d, i, styleFn, renderMode, key, className, baseMarkProps }) => {
    return (
      <Mark
        {...baseMarkProps}
        renderMode={renderMode ? renderMode(d, i) : undefined}
        key={key}
        className={className}
        simpleInterpolate={true}
        markType="path"
        transform={`translate(0,${size[1] / 2})`}
        d={arcDiagramArc(d)}
        style={styleFn(d, i)}
        aria-label={`Connection from ${d.source.id} to ${d.target.id}`}
        tabIndex={-1}
      />
    )
  }
}

export const chordEdgeGenerator =
  (size) =>
  ({ d, i, styleFn, renderMode, key, className, baseMarkProps }) =>
    (
      <Mark
        {...baseMarkProps}
        renderMode={renderMode ? renderMode(d, i) : undefined}
        key={key}
        className={className}
        simpleInterpolate={true}
        transform={`translate(${size[0] / 2},${size[1] / 2})`}
        markType="path"
        d={d.d}
        style={styleFn(d, i)}
        aria-label={`Connection from ${d.source.id} to ${d.target.id}`}
        tabIndex={-1}
      />
    )

export const dagreEdgeGenerator = (direction) => {
  const dagreLineGenerator =
    direction === "LR" || direction === "RL"
      ? horizontalDagreLineGenerator
      : verticalDagreLineGenerator
  return ({ d, i, styleFn, renderMode, key, className, baseMarkProps }) => {
    if (d.ribbon || d.parallelEdges) {
      const ribbonGenerator = linearRibbon()

      ribbonGenerator.x((p) => p.x)
      ribbonGenerator.y((p) => p.y)
      ribbonGenerator.r(() => d.weight || 1)

      if (d.parallelEdges) {
        const sortedParallelEdges = d.parallelEdges.sort(
          (a, b) => b.weight - a.weight
        )
        return (
          <g key={`${key}`}>
            {ribbonGenerator({
              points: d.points,
              multiple: d.parallelEdges
            }).map((ribbonD, ribbonI) => (
              <Mark
                {...baseMarkProps}
                renderMode={renderMode ? renderMode(d, i) : undefined}
                key={`${key}-${ribbonI}`}
                className={className}
                simpleInterpolate={true}
                markType="path"
                d={ribbonD}
                style={styleFn(sortedParallelEdges[ribbonI], i)}
                aria-label={`Connection from ${d.source.id} to ${d.target.id}`}
                tabIndex={-1}
              />
            ))}
          </g>
        )
      }

      return (
        <Mark
          {...baseMarkProps}
          renderMode={renderMode ? renderMode(d, i) : undefined}
          key={key}
          className={className}
          simpleInterpolate={true}
          markType="path"
          d={ribbonGenerator(d.points)}
          style={styleFn(d, i)}
          aria-label={`Connection from ${d.source.id} to ${d.target.id}`}
          tabIndex={-1}
        />
      )
    }

    return (
      <Mark
        {...baseMarkProps}
        renderMode={renderMode ? renderMode(d, i) : undefined}
        key={key}
        className={className}
        simpleInterpolate={true}
        markType="path"
        d={dagreLineGenerator(d.points)}
        style={styleFn(d, i)}
        aria-label={`Connection from ${d.source.id} to ${d.target.id}`}
        tabIndex={-1}
      />
    )
  }
}

export const sankeyNodeGenerator = ({
  d,
  i,
  styleFn,
  renderMode,
  key,
  className,
  transform,
  baseMarkProps
}) => {
  const height = d.direction !== "down" ? d.height : d.width
  const width = d.direction !== "down" ? d.width : d.height

  if (!d) {
    return <g />
  }

  return (
    <Mark
      {...baseMarkProps}
      renderMode={renderMode ? renderMode(d, i) : undefined}
      key={key}
      className={className}
      transform={transform}
      markType="rect"
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
  ({ d, i, styleFn, renderMode, key, className, baseMarkProps }) => {
    if (!d) {
      return <g />
    }

    return (
      <Mark
        {...baseMarkProps}
        renderMode={renderMode ? renderMode(d, i) : undefined}
        key={key}
        className={className}
        transform={`translate(${size[0] / 2},${size[1] / 2})`}
        markType="path"
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

  return ({ d, i, styleFn, renderMode, key, className, baseMarkProps }) => {
    if (!d) {
      return <g />
    }

    const showText = stepSize > 6
    const showLine = stepSize > 3
    const showRect = stepSize > 0.5

    const textProps = {
      textAnchor: "end",
      fontSize: `${stepSize / 2}px`
    }
    const style = styleFn(d, i)
    const renderModeValue = renderMode ? renderMode(d, i) : undefined

    return (
      <g key={key} className={className}>
        {showRect && (
          <Mark
            markType="rect"
            x={stepSize / 2}
            y={d.y - stepSize / 2}
            width={gridSize - stepSize}
            height={stepSize}
            style={{ ...style, stroke: "none" }}
            renderMode={renderModeValue}
            forceUpdate={true}
            baseMarkProps={baseMarkProps}
          />
        )}
        {showRect && (
          <Mark
            markType="rect"
            y={stepSize / 2}
            x={d.y - stepSize / 2}
            height={gridSize - stepSize}
            width={stepSize}
            style={{ ...style, stroke: "none" }}
            renderMode={renderModeValue}
            forceUpdate={true}
            baseMarkProps={baseMarkProps}
          />
        )}
        {showLine && (
          <Mark
            markType="line"
            stroke="black"
            x1={0}
            x2={gridSize - stepSize / 2}
            y1={d.y - stepSize / 2}
            y2={d.y - stepSize / 2}
            style={style}
            renderMode={renderModeValue}
            forceUpdate={true}
            baseMarkProps={baseMarkProps}
          />
        )}
        {showLine && (
          <Mark
            markType="line"
            stroke="black"
            y1={0}
            y2={gridSize - stepSize / 2}
            x1={d.y - stepSize / 2}
            x2={d.y - stepSize / 2}
            style={style}
            renderMode={renderModeValue}
            forceUpdate={true}
            baseMarkProps={baseMarkProps}
          />
        )}
        {showLine && i === nodes.length - 1 && (
          <Mark
            markType="line"
            stroke="black"
            x1={0}
            x2={gridSize - stepSize / 2}
            y1={d.y + stepSize / 2}
            y2={d.y + stepSize / 2}
            style={style}
            renderMode={renderModeValue}
            forceUpdate={true}
            baseMarkProps={baseMarkProps}
          />
        )}
        {showLine && i === nodes.length - 1 && (
          <Mark
            markType="line"
            stroke="black"
            y1={0}
            y2={gridSize - stepSize / 2}
            x1={d.y + stepSize / 2}
            x2={d.y + stepSize / 2}
            style={style}
            renderMode={renderModeValue}
            forceUpdate={true}
            baseMarkProps={baseMarkProps}
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

  return ({ d, i, styleFn, renderMode, key, className, baseMarkProps }) => {
    if (!d) {
      return <g />
    }

    radialArc.innerRadius(d.y0 / 2).outerRadius(d.y1 / 2)

    return (
      <Mark
        {...baseMarkProps}
        key={key}
        transform={`translate(${center})`}
        markType="path"
        d={radialArc({
          startAngle: adjustedPct(d.x0 / size[0]) * Math.PI * 2,
          endAngle: adjustedPct(d.x1 / size[0]) * Math.PI * 2
        })}
        customTween={{
          fn: arcTweener,
          props: {
            startAngle: adjustedPct(d.x0 / size[0]) * Math.PI * 2,
            endAngle: adjustedPct(d.x1 / size[0]) * Math.PI * 2,
            innerRadius: d.y0 / 2,
            outerRadius: d.y1 / 2
          }
        }}
        style={styleFn(d, i)}
        renderMode={renderMode ? renderMode(d, i) : undefined}
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
  className,
  baseMarkProps
}) => {
  if (!d) {
    return <g />
  }
  //this is repetitious
  return (
    <Mark
      {...baseMarkProps}
      key={key}
      transform={`translate(0,0)`}
      markType="rect"
      width={d.x1 - d.x0}
      height={d.y1 - d.y0}
      x={d.x0}
      y={d.y0}
      rx={0}
      ry={0}
      style={styleFn(d, i)}
      renderMode={renderMode ? renderMode(d, i) : undefined}
      className={className}
      aria-label={`Node ${d.id}`}
      tabIndex={-1}
    />
  )
}

const genericLineGenerator = (d) =>
  `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`

export const drawNodes = ({
  data,
  renderKeyFn,
  customMark,
  styleFn,
  classFn,
  renderMode,
  canvasDrawing,
  canvasRenderFn,
  baseMarkProps,
  networkSettings
}) => {
  const markGenerator = customMark
  const renderedData = []

  if (networkSettings.type === "matrix" && canvasRenderFn) {
    return
  }

  if (networkSettings) {
    let i = 0
    for (const d of data) {
      if (canvasRenderFn && canvasRenderFn(d, i) === true) {
        const canvasNode = {
          baseClass: "frame-piece",
          tx: d.x,
          ty: d.y,
          d,
          i,
          markProps: { markType: "circle", r: d.nodeSize },
          styleFn,
          renderFn: renderMode,
          classFn
        }
        canvasDrawing.push(canvasNode)
      } else {
        // CUSTOM MARK IMPLEMENTATION
        renderedData.push(
          markGenerator({
            d,
            i,
            renderKeyFn,
            styleFn,
            classFn,
            renderMode,
            key: renderKeyFn ? renderKeyFn(d, i) : d.id || `node-${i}`,
            className: `node ${classFn(d, i)}`,
            transform: `translate(${d.x},${d.y})`,
            baseMarkProps
          })
        )
      }
      i++
    }
  }
  return renderedData
}

export const drawEdges = (settings) => {
  const {
    data: baseData,
    renderKeyFn,
    customMark,
    styleFn,
    classFn,
    renderMode,
    canvasRenderFn,
    canvasDrawing,
    type,
    baseMarkProps,
    networkSettings,
    projection,
    numberOfNodes,
    size
  } = settings

  const {
    type: networkType,
    direction,
    edgeSort = sankeyEdgeSort
  } = networkSettings
  const data =
    networkType === "sankey"
      ? baseData.sort((a, b) => edgeSort(a, b, direction))
      : baseData

  let dGenerator = genericLineGenerator
  const renderedData = []
  if (canvasRenderFn && networkSettings.type === "matrix") {
    let i = 0
    const gridSize = Math.floor(Math.min(...size) / numberOfNodes)
    for (const d of data) {
      const canvasEdge = {
        baseClass: "frame-piece",
        tx: d.source.y,
        ty: d.target.y,
        d,
        i,
        markProps: { markType: "rect", ...gridProps(gridSize) },
        styleFn,
        renderFn: renderMode,
        classFn
      }
      canvasDrawing.push(canvasEdge)
      i++
    }
  } else if (customMark) {
    // CUSTOM MARK IMPLEMENTATION
    let i = 0
    for (const d of data) {
      const renderedCustomMark = customMark({
        d,
        i,
        renderKeyFn,
        styleFn,
        classFn,
        renderMode,
        key: renderKeyFn ? renderKeyFn(d, i) : `edge-${i}`,
        className: `${classFn(d, i)} edge`,
        transform: `translate(${d.x},${d.y})`,
        baseMarkProps
      })
      if (
        renderedCustomMark &&
        renderedCustomMark.props &&
        (renderedCustomMark.props.markType !== "path" ||
          renderedCustomMark.props.d)
      ) {
        renderedData.push(renderedCustomMark)
      }
      i++
    }
  } else {
    if (type) {
      if (typeof type === "function") {
        dGenerator = type
      } else if (customEdgeHashD[type]) {
        dGenerator = (d) => customEdgeHashD[type](d, projection)
      }
    }
    let i = 0
    for (const d of data) {
      const renderedD = dGenerator(d)

      if (renderedD && canvasRenderFn && canvasRenderFn(d, i) === true) {
        const canvasEdge = {
          baseClass: "frame-piece",
          tx: d.x,
          ty: d.y,
          d,
          i,
          markProps: { markType: "path", d: renderedD },
          styleFn,
          renderFn: renderMode,
          classFn
        }
        canvasDrawing.push(canvasEdge)
      } else if (renderedD) {
        renderedData.push(
          <Mark
            {...baseMarkProps}
            key={renderKeyFn ? renderKeyFn(d, i) : `edge-${i}`}
            markType="path"
            renderMode={renderMode ? renderMode(d, i) : undefined}
            className={`${classFn(d)} edge`}
            d={renderedD}
            style={styleFn(d, i)}
            tabIndex={-1}
            role="img"
            aria-label={`connection from ${d.source.id} to ${d.target.id}`}
          />
        )
      }
    }
  }

  return renderedData
}

export function topologicalSort(nodesArray, edgesArray) {
  // adapted from https://simplapi.wordpress.com/2015/08/19/detect-graph-cycle-in-javascript/
  const nodes = []
  const nodeMap = new Map()
  for (const edge of edgesArray) {
    if (!edge.source.id || !edge.target.id) {
      return false
    }
    if (!nodeMap.has(edge.source.id)) {
      const newNode = { _id: edge.source.id, links: [] }
      nodeMap.set(edge.source.id, newNode)
      nodes.push(newNode)
    }
    if (!nodeMap.has(edge.target.id)) {
      const newNode = { _id: edge.target.id, links: [] }
      nodeMap.set(edge.target.id, newNode)
      nodes.push(newNode)
    }
    nodeMap.get(edge.source.id).links.push(edge.target.id)
  }

  // Test if a node got any icoming edge
  function hasIncomingEdge(list, node) {
    for (let i = 0, l = list.length; i < l; ++i) {
      if (list[i].links.indexOf(node._id) !== -1) {
        return true
      }
    }
    return false
  }

  // Kahn Algorithm
  const L = [],
    S = nodes.filter((node) => !hasIncomingEdge(nodes, node))

  let n = null

  while (S.length) {
    // Remove a node n from S
    n = S.pop()
    // Add n to tail of L
    L.push(n)

    let i = n.links.length
    while (i--) {
      // Getting the node associated to the current stored id in links
      const m = nodes[nodes.map((d) => d._id).indexOf(n.links[i])]

      // Remove edge e from the graph
      n.links.pop()

      if (!hasIncomingEdge(nodes, m)) {
        S.push(m)
      }
    }
  }

  // If any of them still got links, there is cycle somewhere
  const nodeWithEdge = nodes.find((node) => node.links.length !== 0)

  return nodeWithEdge ? null : L
}
const curvature = 0.5

export const ribbonLink = (d) => {
  const diff =
    d.direction === "down"
      ? Math.abs(d.target.y - d.source.y)
      : Math.abs(d.source.x - d.target.x)
  // const halfWidth = d.width / 2
  const testCoordinates =
    d.direction === "down"
      ? [
          {
            x: d.y0,
            y: d.source.y
          },
          {
            x: d.y0,
            y: d.source.y + diff / 3
          },
          {
            x: d.y1,
            y: d.target.y - diff / 3
          },
          {
            x: d.y1,
            y: d.target.y
          }
        ]
      : [
          {
            x: d.source.x0,
            y: d.y0
          },
          {
            x: d.source.x0 + diff / 3,
            y: d.y0
          },
          {
            x: d.target.x0 - diff / 3,
            y: d.y1
          },
          {
            x: d.target.x0,
            y: d.y1
          }
        ]

  const linkGenerator = linearRibbon()

  linkGenerator.x((d) => d.x)
  linkGenerator.y((d) => d.y)
  linkGenerator.r(() => d.sankeyWidth / 2)

  return linkGenerator(testCoordinates)
}

export const areaLink = (d) => {
  let x0, x1, x2, x3, y0, y1, xi, y2, y3

  if (d.direction === "down") {
    x0 = d.y0 - d.sankeyWidth / 2
    x1 = d.y1 - d.sankeyWidth / 2
    x2 = d.y1 + d.sankeyWidth / 2
    x3 = d.y0 + d.sankeyWidth / 2
    y0 = d.source.y1
    y1 = d.target.y0
    xi = interpolateNumber(y0, y1)
    y2 = xi(curvature)
    y3 = xi(1 - curvature)

    return `M${x0},${y0}C${x0},${y2} ${x1},${y3} ${x1},${y1}L${x2},${y1}C${x2},${y3} ${x3},${y2} ${x3},${y0}Z`
  }
  ;(x0 = d.source.x1), // eslint-disable-line no-sequences
    (x1 = d.target.x0),
    (xi = interpolateNumber(x0, x1)),
    (x2 = xi(curvature)),
    (x3 = xi(1 - curvature)),
    (y0 = d.y0 - d.sankeyWidth / 2),
    (y1 = d.y1 - d.sankeyWidth / 2),
    (y2 = d.y1 + d.sankeyWidth / 2),
    (y3 = d.y0 + d.sankeyWidth / 2)

  return `M${x0},${y0}C${x2},${y0} ${x3},${y1} ${x1},${y1}L${x1},${y2}C${x3},${y2} ${x2},${y3} ${x0},${y3}Z`
}

export function circularAreaLink(link) {
  const linkGenerator = linearRibbon()

  linkGenerator.x((d) => d.x)
  linkGenerator.y((d) => d.y)
  linkGenerator.r(() => link.sankeyWidth / 2)

  const xyForLink =
    link.direction === "down"
      ? [
          {
            x: link.circularPathData.sourceY,
            y: link.circularPathData.sourceX
          },
          {
            x: link.circularPathData.sourceY,
            y: link.circularPathData.leftFullExtent
          },
          {
            x: link.circularPathData.verticalFullExtent,
            y: link.circularPathData.leftFullExtent
          },
          {
            x: link.circularPathData.verticalFullExtent,
            y: link.circularPathData.rightFullExtent
          },
          {
            x: link.circularPathData.targetY,
            y: link.circularPathData.rightFullExtent
          },
          {
            x: link.circularPathData.targetY,
            y: link.circularPathData.targetX
          }
        ]
      : [
          {
            x: link.circularPathData.sourceX,
            y: link.circularPathData.sourceY
          },
          {
            x: link.circularPathData.leftFullExtent,
            y: link.circularPathData.sourceY
          },
          {
            x: link.circularPathData.leftFullExtent,
            y: link.circularPathData.verticalFullExtent
          },
          {
            x: link.circularPathData.rightFullExtent,
            y: link.circularPathData.verticalFullExtent
          },
          {
            x: link.circularPathData.rightFullExtent,
            y: link.circularPathData.targetY
          },
          {
            x: link.circularPathData.targetX,
            y: link.circularPathData.targetY
          }
        ]

  return linkGenerator(xyForLink)
}

const hierarchyDecorator = (hierarchy, hashEntries, nodeIDAccessor, nodes) => {
  if (hierarchy.children) {
    for (const child of hierarchy.children) {
      const theseEntries = hashEntries.filter((entry) => entry[1] === child.id)

      for (const entry of theseEntries) {
        const idNode =
          nodes.find((node) => nodeIDAccessor(node) === entry[0]) || {}

        const newNode = {
          id: entry[0],
          ...idNode,
          children: [],
          childMap: {}
        }

        child.childMap.set(entry[0], newNode)
        child.children.push(newNode)
      }
      if (child.children.length > 0) {
        hierarchyDecorator(child, hashEntries, nodeIDAccessor, nodes)
      }
    }
  }
}

export const softStack = (
  edges,
  nodes,
  sourceAccessor,
  targetAccessor,
  nodeIDAccessor
) => {
  let hierarchy = { id: "root-generated", children: [], childMap: new Map() }
  const discoveredHierarchyMap = new Map()
  const targetToSourceMap = new Map()
  let hasLogicalRoot = true
  let isHierarchical = true

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i]

    const source = sourceAccessor(edge)
    const target = targetAccessor(edge)
    const sourceID =
      typeof source === "object" ? nodeIDAccessor(source) : source
    const targetID =
      typeof target === "object" ? nodeIDAccessor(target) : target

    targetToSourceMap.set(targetID, sourceID)

    if (!discoveredHierarchyMap.has(sourceID)) {
      discoveredHierarchyMap.set(sourceID, targetID)
    } else {
      isHierarchical = false
      break
    }
  }

  if (isHierarchical) {
    const hashEntries: Array<string[]> = []
    for (const entry of discoveredHierarchyMap) {
      hashEntries.push(entry)
      const target = entry[1]
      if (!discoveredHierarchyMap.has(target)) {
        discoveredHierarchyMap.set(target, "root-generated")
        const idNode =
          nodes.find((node) => nodeIDAccessor(node) === target) || {}

        const newNode = {
          id: target,
          ...idNode,
          children: [],
          childMap: new Map()
        }
        hierarchy.childMap.set(target, newNode)
        hierarchy.children.push(newNode)
      }
    }

    hierarchyDecorator(hierarchy, hashEntries, nodeIDAccessor, nodes)

    nodes.forEach((node) => {
      const nodeID = nodeIDAccessor(node)
      if (
        !discoveredHierarchyMap.has(nodeID) &&
        !targetToSourceMap.has(nodeID)
      ) {
        hierarchy.children.push({
          id: nodeID,
          ...node,
          children: [],
          childMap: new Map()
        })
      }
    })

    if (hierarchy.children.length === 1) {
      hierarchy = hierarchy.children[0]
      hasLogicalRoot = false
    }

    return { hierarchy, isHierarchical: true, hasLogicalRoot }
  }

  return { hierarchy: {}, isHierarchical: false, hasLogicalRoot: false }
}
