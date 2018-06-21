import React from "react"
import { NetworkFrame } from "../../components"
import ProcessViz from "./ProcessViz"
import { line, curveStepAfter } from "d3-shape"

// Do a dataviz survey-based example
// split by gender for custom nodes
// hierarchy by age groups, time in industry buckets, design/data

const nodes = [
  { x: 0, y: 0, depth: 0, idKey: "node-0" },
  { x: -490, y: 70, depth: 1, idKey: "node-1" },
  { x: -450, y: 70, depth: 1, idKey: "node-2" },
  { x: -410, y: 70, depth: 1, idKey: "node-3" },
  { x: -230, y: 70, depth: 1, idKey: "node-4" },
  { x: -90, y: 70, depth: 1, idKey: "node-5" },
  { x: 150, y: 70, depth: 1, idKey: "node-6" },
  { x: 450, y: 70, depth: 1, idKey: "node-7" },
  { x: 490, y: 70, depth: 1, idKey: "node-8" },
  { x: -450, y: 140, depth: 2, idKey: "node-9" },
  { x: -410, y: 140, depth: 2, idKey: "node-10" },
  { x: -370, y: 140, depth: 2, idKey: "node-11" },
  { x: -290, y: 140, depth: 2, idKey: "node-12" },
  { x: -250, y: 140, depth: 2, idKey: "node-13" },
  { x: -170, y: 140, depth: 2, idKey: "node-14" },
  { x: -90, y: 140, depth: 2, idKey: "node-15" },
  { x: 50, y: 140, depth: 2, idKey: "node-16" },
  { x: 210, y: 140, depth: 2, idKey: "node-17" },
  { x: 250, y: 140, depth: 2, idKey: "node-18" },
  { x: 330, y: 140, depth: 2, idKey: "node-19" },
  { x: 450, y: 140, depth: 2, idKey: "node-20" },
  { x: 510, y: 140, depth: 2, idKey: "node-21" },
  { x: 570, y: 140, depth: 2, idKey: "node-22" },
  { x: -410, y: 210, depth: 3, idKey: "node-23" },
  { x: -250, y: 210, depth: 3, idKey: "node-24" },
  { x: -170, y: 210, depth: 3, idKey: "node-25" },
  { x: -90, y: 210, depth: 3, idKey: "node-26" },
  { x: -10, y: 210, depth: 3, idKey: "node-27" },
  { x: 30, y: 210, depth: 3, idKey: "node-28" },
  { x: 70, y: 210, depth: 3, idKey: "node-29" },
  { x: 110, y: 210, depth: 3, idKey: "node-30" },
  { x: 190, y: 210, depth: 3, idKey: "node-31" },
  { x: 230, y: 210, depth: 3, idKey: "node-32" },
  { x: 310, y: 210, depth: 3, idKey: "node-33" },
  { x: 350, y: 210, depth: 3, idKey: "node-34" },
  { x: 430, y: 210, depth: 3, idKey: "node-35" },
  { x: 470, y: 210, depth: 3, idKey: "node-36" },
  { x: 550, y: 210, depth: 3, idKey: "node-37" },
  { x: 590, y: 210, depth: 3, idKey: "node-38" }
]

const edges = [
  { source: "node-0", target: "node-1" },
  { source: "node-0", target: "node-2" },
  { source: "node-0", target: "node-3" },
  { source: "node-0", target: "node-4" },
  { source: "node-0", target: "node-5" },
  { source: "node-0", target: "node-6" },
  { source: "node-0", target: "node-7" },
  { source: "node-0", target: "node-8" },
  { source: "node-3", target: "node-9" },
  { source: "node-3", target: "node-10" },
  { source: "node-3", target: "node-11" },
  { source: "node-4", target: "node-12" },
  { source: "node-4", target: "node-13" },
  { source: "node-4", target: "node-14" },
  { source: "node-5", target: "node-15" },
  { source: "node-6", target: "node-16" },
  { source: "node-6", target: "node-17" },
  { source: "node-6", target: "node-18" },
  { source: "node-7", target: "node-19" },
  { source: "node-7", target: "node-20" },
  { source: "node-7", target: "node-21" },
  { source: "node-7", target: "node-22" },
  { source: "node-10", target: "node-23" },
  { source: "node-13", target: "node-24" },
  { source: "node-14", target: "node-25" },
  { source: "node-15", target: "node-26" },
  { source: "node-16", target: "node-27" },
  { source: "node-16", target: "node-28" },
  { source: "node-16", target: "node-29" },
  { source: "node-16", target: "node-30" },
  { source: "node-17", target: "node-31" },
  { source: "node-17", target: "node-32" },
  { source: "node-19", target: "node-33" },
  { source: "node-19", target: "node-34" },
  { source: "node-20", target: "node-35" },
  { source: "node-20", target: "node-36" },
  { source: "node-22", target: "node-37" },
  { source: "node-22", target: "node-38" }
]

//const colors = ["#00a2ce", "#b6a756", "#4d430c", "#b3331d"]

const nodeColors = { safe: "black" }

export const edgeLine = line()
  .x(d => d[0])
  .y(d => d[1])
  .curve(curveStepAfter)

const cornerEdge = (d, i, flipped_tree, offset) => {
  const directedCoordinates =
    flipped_tree === 1
      ? [[d.target.x, d.target.y - offset], [d.source.x, d.source.y]]
      : [[d.source.x, d.source.y + offset], [d.target.x, d.target.y]]
  return (
    <path
      markType="path"
      key={`corner-edge-${i}`}
      style={{
        stroke: "red",
        strokeWidth: 6,
        fill: "none",
        strokeLinecap: "round"
      }}
      d={edgeLine(directedCoordinates)}
    />
  )
}

const BarbellNode = ({
  d,
  nodeColors,
  nodeSize,
  flipped_tree,
  bar = true,
  barOffset = 0
}) => {
  const sizeScale = () => 10
  let minChildX = d.x
  let maxChildX = d.x
  if (d.children) {
    minChildX = Math.min(...d.children.map(d => d.x))
    maxChildX = Math.max(...d.children.map(d => d.x))
  }

  return (
    <g transform={`translate(0,${d.y})`}>
      {bar &&
        d.children &&
        barOffset !== 0 && (
          <line
            x1={d.x}
            x2={d.x}
            y1={0}
            y2={barOffset}
            stroke={nodeColors[d.idKey]}
            strokeWidth={6}
            strokeLinecap="round"
          />
        )}
      {bar &&
        (d.children && (bar === "required" || d.children.length > 1)) && (
          <line
            transform={`translate(${-nodeSize / 2},0)`}
            x1={flipped_tree === 1 && bar !== "required" ? d.x : minChildX}
            x2={
              flipped_tree === 1 && bar !== "required"
                ? d.x
                : maxChildX + nodeSize * (d.data.cumulative_prob_raw.length - 1)
            }
            y1={barOffset}
            y2={barOffset}
            stroke={nodeColors[d.idKey]}
            strokeWidth="8px"
            strokeLinecap="round"
          />
        )}
      {[5, 7].map(
        (p, q) =>
          p === 0 ? (
            <g />
          ) : (
            <g transform={`translate(${d.x - nodeSize / 2 + q * nodeSize},0)`}>
              <circle
                key={`cell-${q}`}
                fill={nodeColors[d.idKey]}
                stroke="white"
                strokeWidth={1}
                r={sizeScale(p)}
              />
              <text textAnchor="middle" y={3}>
                {p}%
              </text>
            </g>
          )
      )}
    </g>
  )
}

export default ({ direction = "down" }) => {
  const customNodeSettings = {
    size: [700, 400],
    nodeIDAccessor: "idKey",
    nodeSizeAccessor: 20,
    networkType: {
      type: "force",
      iterations: 0,
      direction
    },
    margin: { top: 0, bottom: 0, right: 5, left: 140 },
    responsiveWidth: true,
    edges,
    nodes,
    customEdgeIcon: ({ d, i }) => cornerEdge(d, i, 0, 30),
    customNodeIcon: ({ d }) =>
      BarbellNode({
        d,
        nodeSize: 1,
        nodeColors,
        flipped_tree: 0,
        largeCircle: true,
        barOffset: 30
      })
  }
  return (
    <div>
      <ProcessViz frameSettings={customNodeSettings} frameType="NetworkFrame" />
      <iframe
        title="dendrogram-video"
        width="560"
        height="315"
        src="https://www.youtube.com/embed/diE5ywpQNjU"
        frameBorder="0"
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
      <NetworkFrame {...customNodeSettings} />
    </div>
  )
}
