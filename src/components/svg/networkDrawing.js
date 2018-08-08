import React from "react"

import { Mark } from "semiotic-mark"

import {
  d as glyphD /*, project as glyphProject, mutate as glyphMutate*/
} from "d3-glyphedge"

import { arc } from "d3-shape"
import { linearRibbon } from "./SvgHelper"
import { interpolateNumber } from "d3-interpolate"

import { scaleLinear } from "d3-scale"

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

const customEdgeHashD = {
  linearc: d => glyphD.lineArc(d),
  ribbon: d => glyphD.ribbon(d, d.width),
  arrowhead: d =>
    glyphD.arrowHead(d, d.target.nodeSize, d.width, d.width * 1.5),
  halfarrow: d =>
    glyphD.halfArrow(d, d.target.nodeSize, d.width, d.width * 1.5),
  nail: d => glyphD.nail(d, d.source.nodeSize),
  comet: d => glyphD.comet(d, d.target.nodeSize),
  taffy: d =>
    glyphD.taffy(
      d,
      d.source.nodeSize / 2,
      d.target.nodeSize / 2,
      (d.source.nodeSize + d.target.nodeSize) / 4
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

export const chordEdgeGenerator = size => ({
  d,
  i,
  styleFn,
  renderMode,
  key,
  className,
  baseMarkProps
}) => (
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

export const wordcloudNodeGenerator = ({
  d,
  i,
  styleFn,
  key,
  className,
  transform
}) => {
  const textStyle = styleFn(d, i)
  textStyle.fontSize = `${d.fontSize}px`
  textStyle.fontWeight = d.fontWeight
  textStyle.textAnchor = "middle"
  let textTransform, textY, textX
  textTransform = `scale(${d.scale})`

  if (!d.rotate) {
    textY = d.textHeight / 4
    textTransform = `scale(${d.scale})`
  } else {
    textTransform = `rotate(90) scale(${d.scale})`
    textY = d.textHeight / 4
  }

  return (
    <g key={key} transform={transform}>
      <text
        style={textStyle}
        y={textY}
        x={textX}
        transform={textTransform}
        className={`${className} wordcloud`}
        aria-label={d._NWFText}
        role="img"
        tabIndex={-1}
      >
        {d._NWFText}
      </text>
    </g>
  )
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

export const chordNodeGenerator = size => ({
  d,
  i,
  styleFn,
  renderMode,
  key,
  className,
  baseMarkProps
}) => (
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

export const radialRectNodeGenerator = (size, center, type) => {
  const radialArc = arc()
  const { angleRange = [0, 360] } = type
  const rangePct = angleRange.map(d => d / 360)
  const rangeMod = rangePct[1] - rangePct[0]

  const adjustedPct =
    rangeMod < 1
      ? scaleLinear()
          .domain([0, 1])
          .range(rangePct)
      : d => d

  return ({ d, i, styleFn, renderMode, key, className, baseMarkProps }) => {
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

const genericLineGenerator = d =>
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
  baseMarkProps
}) => {
  const markGenerator = customMark
  const renderedData = []

  if (customMark && canvasRenderFn) {
    console.error(
      "canvas rendering currently only supports generic circle nodes based on nodeSize"
    )
  }

  data.forEach((d, i) => {
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
  })
  return renderedData
}

export const drawEdges = ({
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
  networkType,
  direction
}) => {
  const data =
    networkType === "sankey"
      ? baseData.sort((a, b) => sankeyEdgeSort(a, b, direction))
      : baseData

  let dGenerator = genericLineGenerator
  const renderedData = []
  if (customMark) {
    data.forEach((d, i) => {
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
    })
  } else {
    if (type) {
      if (typeof type === "function") {
        dGenerator = type
      } else if (customEdgeHashD[type]) {
        dGenerator = d => customEdgeHashD[type](d)
      }
    }
    data.forEach((d, i) => {
      const renderedD = dGenerator(d)

      if (renderedD && canvasRenderFn && canvasRenderFn(d, i) === true) {
        const canvasNode = {
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
        canvasDrawing.push(canvasNode)
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
    })
  }

  return renderedData
}

export function topologicalSort(nodesArray, edgesArray) {
  // adapted from https://simplapi.wordpress.com/2015/08/19/detect-graph-cycle-in-javascript/
  const nodes = []
  const nodeHash = {}
  edgesArray.forEach(edge => {
    if (!edge.source.id || !edge.target.id) {
      return false
    }
    if (!nodeHash[edge.source.id]) {
      nodeHash[edge.source.id] = { _id: edge.source.id, links: [] }
      nodes.push(nodeHash[edge.source.id])
    }
    if (!nodeHash[edge.target.id]) {
      nodeHash[edge.target.id] = { _id: edge.target.id, links: [] }
      nodes.push(nodeHash[edge.target.id])
    }
    nodeHash[edge.source.id].links.push(edge.target.id)
  })

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
    S = nodes.filter(node => !hasIncomingEdge(nodes, node))

  let n = null

  while (S.length) {
    // Remove a node n from S
    n = S.pop()
    // Add n to tail of L
    L.push(n)

    let i = n.links.length
    while (i--) {
      // Getting the node associated to the current stored id in links
      const m = nodes[nodes.map(d => d._id).indexOf(n.links[i])]

      // Remove edge e from the graph
      n.links.pop()

      if (!hasIncomingEdge(nodes, m)) {
        S.push(m)
      }
    }
  }

  // If any of them still got links, there is cycle somewhere
  const nodeWithEdge = nodes.find(node => node.links.length !== 0)

  return nodeWithEdge ? null : L
}
const curvature = 0.5

export const ribbonLink = d => {
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
    .x(d => d.x)
    .y(d => d.y)
    .r(() => d.sankeyWidth / 2)

  return linkGenerator(testCoordinates)
}

export const areaLink = d => {
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
    .x(d => d.x)
    .y(d => d.y)
    .r(() => link.sankeyWidth / 2)

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
