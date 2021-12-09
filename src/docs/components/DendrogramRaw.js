import * as React from "react"
import { NetworkFrame } from "../../components"
import { data } from "../sampledata/d3_api"
import { scaleLinear } from "d3-scale"
import roughjs from "roughjs/dist/rough.es5.umd.js"

const colors = ["#00a2ce", "#b6a756", "#4d430c", "#b3331d"]

const blockScale = scaleLinear().domain([1, 1000]).range([2, 8]).clamp(true)

//separation

/*
const data = {
  name: "d3",
  children: [
    { name: "Platform", leafColor: "red", blockCalls: 2 },
    { name: "Product", leafColor: "blue", blockCalls: 3 },
    { name: "Content", leafColor: "purple", blockCalls: 5 },
    { name: "Analytics", leafColor: "brown", blockCalls: 11 }
  ]
}
*/

export default ({
  annotation = "rectangle",
  type = "circlepack",
  projection
}) => {
  const hierarchicalChart = {
    title: "D3v3 API",
    size: [700, 700],
    edges: data,
    nodeStyle: (d) => ({
      fill: d.depth === 0 ? "none" : d.leafColor,
      stroke: "black",
      //      strokeOpacity: 0.25,
      //      fillOpacity: 0.25,
      strokeWidth: d.depth === 0 ? 4 : 1
    }),
    edgeStyle: (d) => ({
      fill: colors[d.source.depth],
      stroke: colors[d.source.depth],
      strokeWidth: 2,
      opacity: 1
    }),
    nodeLabels: (d) => {
      return d.depth < 1000 ? (
        <g />
      ) : (
        <g>
          <text fontSize="10px" y={-8} textAnchor="middle">
            {d.name}
          </text>
          <text fontSize="28px" fontWeight={900} y={20} textAnchor="middle">
            {d.blockCalls}k
          </text>
        </g>
      )
    },
    nodeIDAccessor: "hierarchicalID",
    hoverAnnotation: true,
    nodeSizeAccessor:
      type === "tree" && ((d) => blockScale(d.blockCalls || 10)),
    sketchyRenderingEngine: roughjs,
    nodeRenderMode: { renderMode: "sketchy", fillStyle: "solid" },
    edgeRenderMode: "sketchy",
    networkType: {
      zoom: false,
      type: type,
      projection: projection,
      nodePadding: 1,
      forceManyBody: -15,
      edgeStrength: 1.5,
      padding: type === "treemap" ? 3 : type === "circlepack" ? 2 : 0,
      hierarchySum: (d) => d.blockCalls
    },
    tooltipContent: (d) => {
      return d.edge ? (
        <div className="tooltip-content">
          <p>{d.edge.source.name}</p>
          <p>{d.edge.target.name}</p>
        </div>
      ) : (
        <div className="tooltip-content">
          {d.parent ? <p>{d.parent.data.name}</p> : undefined}
          <p>{d.data.name}</p>
        </div>
      )
    },
    //    filterRenderedNodes: d => d.depth !== 0,
    annotations: [
      {
        type: annotation,
        ids: [
          "identity",
          "linear",
          "pow",
          "category20",
          "category20",
          "log",
          "sqrt",
          "ordinal",
          "threshold",
          "quantize"
        ],
        label: "Scales",
        padding: 5,
        dy: 150,
        dx: 30
      },
      {
        type: annotation,
        ids: ["html", "json"],
        label: "xhr stuff",
        padding: 5,
        dy: -100,
        dx: 0
      }
    ],
    margin: 50,
    customClickBehavior: (d) => {
      console.info("clicked a node", d)
    },
    customHoverBehavior: (d) => {
      console.info("hovered a node", d)
    },
    customDoubleClickBehavior: (d) => {
      console.info("doubleclicked a node", d)
    }
  }
  return <NetworkFrame {...hierarchicalChart} />
}
