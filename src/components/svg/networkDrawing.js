import React from "react"

import { Mark } from "semiotic-mark"

import {
  d as glyphD /*, project as glyphProject, mutate as glyphMutate*/
} from "d3-glyphedge"

import { arc } from "d3-shape"

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
  renderKeyFn,
  styleFn,
  classFn,
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
    />
  )
}

export const chordEdgeGenerator = size => ({
  d,
  i,
  renderKeyFn,
  styleFn,
  classFn,
  renderMode,
  key,
  className,
  transform,
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
  />
)

export const wordcloudNodeGenerator = ({
  d,
  i,
  renderKeyFn,
  styleFn,
  classFn,
  renderMode,
  key,
  className,
  transform,
  baseMarkProps
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
      >
        {d._NWFText}
      </text>
    </g>
  )
}

export const sankeyNodeGenerator = ({
  d,
  i,
  renderKeyFn,
  styleFn,
  classFn,
  renderMode,
  key,
  className,
  transform,
  baseMarkProps
}) => (
  <Mark
    {...baseMarkProps}
    renderMode={renderMode ? renderMode(d, i) : undefined}
    key={key}
    className={className}
    transform={transform}
    markType="rect"
    height={d.height}
    width={d.width}
    x={-d.width / 2}
    y={-d.height / 2}
    rx={0}
    ry={0}
    style={styleFn(d)}
  />
)

export const chordNodeGenerator = size => ({
  d,
  i,
  renderKeyFn,
  styleFn,
  classFn,
  renderMode,
  key,
  className,
  transform,
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
  />
)

export const radialRectNodeGenerator = (size, center) => {
  const radialArc = arc()
  return ({
    d,
    i,
    renderKeyFn,
    styleFn,
    classFn,
    renderMode,
    key,
    className,
    transform,
    baseMarkProps
  }) => {
    radialArc.innerRadius(d.y0 / 2).outerRadius(d.y1 / 2)

    return (
      <Mark
        {...baseMarkProps}
        key={key}
        transform={`translate(${center})`}
        markType="path"
        d={radialArc({
          startAngle: d.x0 / size[0] * Math.PI * 2,
          endAngle: d.x1 / size[0] * Math.PI * 2
        })}
        style={styleFn(d, i)}
        renderMode={renderMode ? renderMode(d, i) : undefined}
        className={className}
      />
    )
  }
}

export const hierarchicalRectNodeGenerator = ({
  d,
  i,
  renderKeyFn,
  styleFn,
  classFn,
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
  const markGenerator = customMark || circleNodeGenerator
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
  data,
  renderKeyFn,
  customMark,
  styleFn,
  classFn,
  renderMode,
  canvasRenderFn,
  canvasDrawing,
  type,
  baseMarkProps
}) => {
  let dGenerator = genericLineGenerator
  const renderedData = []
  if (customMark) {
    data.forEach((d, i) => {
      renderedData.push(
        customMark({
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
      )
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
      if (canvasRenderFn && canvasRenderFn(d, i) === true) {
        const canvasNode = {
          baseClass: "frame-piece",
          tx: d.x,
          ty: d.y,
          d,
          i,
          markProps: { markType: "path", d: dGenerator(d) },
          styleFn,
          renderFn: renderMode,
          classFn
        }
        canvasDrawing.push(canvasNode)
      } else {
        renderedData.push(
          <Mark
            {...baseMarkProps}
            key={renderKeyFn ? renderKeyFn(d, i) : `edge-${i}`}
            markType="path"
            renderMode={renderMode ? renderMode(d, i) : undefined}
            className={`${classFn(d)} edge`}
            d={dGenerator(d)}
            style={styleFn(d, i)}
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
  function hasIncomingEdge(list, node, arrayI) {
    for (let i = 0, l = list.length; i < l; ++i) {
      if (list[i].links.indexOf(node._id) !== -1) {
        return true
      }
    }
    return false
  }

  // Kahn Algorithm
  let L = [],
    S = nodes.filter((node, arrayI) => !hasIncomingEdge(nodes, node, arrayI)),
    n = null

  while (S.length) {
    // Remove a node n from S
    n = S.pop()
    // Add n to tail of L
    L.push(n)

    let i = n.links.length
    while (i--) {
      // Getting the node associated to the current stored id in links
      let m = nodes[nodes.map(d => d._id).indexOf(n.links[i])]

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
