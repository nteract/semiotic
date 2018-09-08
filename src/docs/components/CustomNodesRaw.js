import React from "react"
import { NetworkFrame } from "../../components"
//import ProcessViz from "./ProcessViz"
import dagre from "dagre"

export default ({ direction, ranker, parallelEdges }) => {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: direction, ranker })
  g.setDefaultEdgeLabel(() => ({}))

  g.setNode("spongebob", { label: "Mr. Squarepants", width: 44, height: 35 })
  g.setNode("swilliams", { label: "Saul Williams", width: 60, height: 35 })
  g.setNode("bpitt", { label: "Brad Pitt", width: 108, height: 35 })
  g.setNode("hford", { label: "Harrison Ford", width: 68, height: 35 })
  g.setNode("lwilson", { label: "Luke Wilson", width: 44, height: 35 })
  g.setNode("kbacon", { label: "Kevin Bacon", width: 101, height: 35 })
  g.setNode("f", { label: "Kevin Bacon", width: 210, height: 40 })
  g.setNode("ff", { label: "Kevin Bacon", width: 110, height: 40 })
  g.setNode("fff", { label: "Kevin Bacon", width: 121, height: 35 })
  g.setNode("ffff", { label: "Kevin Bacon", width: 151, height: 45 })

  g.setEdge("swilliams", "kbacon", {
    color: "#b3331d",
    weight: 3
  })
  g.setEdge("bpitt", "kbacon", {
    color: "#b3331d",
    weight: 3
  })
  g.setEdge("hford", "lwilson", {
    color: "#007190",
    weight: 2
  })
  g.setEdge("lwilson", "kbacon", {
    color: "#007190",
    weight: 1
  })
  g.setEdge("f", "lwilson", {
    color: "#007190",
    weight: 3
  })
  g.setEdge("ff", "f", {
    color: "#007190",
    weight: 5
  })
  g.setEdge("fff", "ff", {
    color: "#b3331d",
    weight: 4
  })
  g.setEdge("fff", "hford", {
    color: "#b3331d",
    weight: 3
  })
  g.setEdge("ff", "kbacon", {
    color: "#b3331d",
    weight: 3
  })

  dagre.layout(g)

  const parallelG = new dagre.graphlib.Graph()
  parallelG.setGraph({ rankdir: direction, ranker })
  parallelG.setDefaultEdgeLabel(() => ({}))

  parallelG.setNode("spongebob", {
    label: "Mr. Squarepants",
    width: 44,
    height: 35
  })
  parallelG.setNode("swilliams", {
    label: "Saul Williams",
    width: 60,
    height: 35
  })
  parallelG.setNode("bpitt", { label: "Brad Pitt", width: 108, height: 35 })
  parallelG.setNode("hford", { label: "Harrison Ford", width: 68, height: 35 })
  parallelG.setNode("lwilson", { label: "Luke Wilson", width: 44, height: 35 })
  parallelG.setNode("kbacon", { label: "Kevin Bacon", width: 101, height: 35 })
  parallelG.setNode("f", { label: "Kevin Bacon", width: 210, height: 40 })
  parallelG.setNode("ff", { label: "Kevin Bacon", width: 110, height: 40 })
  parallelG.setNode("fff", { label: "Kevin Bacon", width: 121, height: 35 })
  parallelG.setNode("ffff", { label: "Kevin Bacon", width: 151, height: 45 })

  parallelG.setEdge("swilliams", "kbacon", {
    color: "#b3331d",
    weight: 3,
    parallelEdges: [
      { color: "#b3331d", weight: 10 },
      { color: "#007190", weight: 2 }
    ]
  })
  parallelG.setEdge("bpitt", "kbacon", {
    color: "#b3331d",
    weight: 3,
    parallelEdges: [
      { color: "#b3331d", weight: 5 },
      { color: "#007190", weight: 5 }
    ]
  })
  parallelG.setEdge("hford", "lwilson", {
    color: "#b3331d",
    weight: 3,
    parallelEdges: [
      { color: "#b3331d", weight: 10 },
      { color: "#007190", weight: 3 }
    ]
  })
  parallelG.setEdge("lwilson", "kbacon", {
    color: "#b3331d",
    weight: 3,
    parallelEdges: [{ color: "#b3331d", weight: 10 }]
  })
  parallelG.setEdge("f", "lwilson", {
    color: "#b3331d",
    weight: 3,
    parallelEdges: [
      { color: "#b3331d", weight: 2 },
      { color: "#007190", weight: 6 }
    ]
  })
  parallelG.setEdge("ff", "f", {
    color: "#b3331d",
    weight: 3,
    parallelEdges: [
      { color: "#b3331d", weight: 10 },
      { color: "#007190", weight: 5 },
      { color: "#4d430c", weight: 3 }
    ]
  })
  parallelG.setEdge("fff", "ff", {
    color: "#b3331d",
    weight: 3,
    parallelEdges: [
      { color: "#b3331d", weight: 3 },
      { color: "#007190", weight: 3 },
      { color: "#4d430c", weight: 3 }
    ]
  })
  parallelG.setEdge("fff", "hford", {
    color: "#b3331d",
    weight: 3,
    parallelEdges: [
      { color: "#b3331d", weight: 2 },
      { color: "#007190", weight: 1 },
      { color: "#4d430c", weight: 1 }
    ]
  })
  parallelG.setEdge("ff", "kbacon", {
    color: "#b3331d",
    weight: 3,
    label: "problemEdge",
    parallelEdges: [
      { color: "#b3331d", weight: 5 },
      { color: "#b3331d", weight: 5 },
      { color: "#b3331d", weight: 5 }
    ]
  })

  dagre.layout(parallelG)

  /*
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
  } */
  return (
    <div>
      <NetworkFrame
        size={[700, 500]}
        graph={parallelEdges ? parallelG : g}
        networkType={{ type: "dagre", dagreGraph: g, zoom: true }}
        nodeStyle={{ fill: "#b6a756", stroke: "black" }}
        edgeStyle={d => ({
          stroke: parallelEdges ? "black" : d.color,
          fill: parallelEdges ? d.color || "black" : "none",
          fillOpacity: 0.5,
          strokeWidth: parallelEdges ? 0.5 : d.weight
        })}
        margin={10}
        hoverAnnotation={true}
        tooltipContent={d => {
          return <div className="tooltip-content">{d.id}</div>
        }}
        annotations={[
          {
            type: "enclose-hull",
            ids: ["lwilson", "f"],
            color: "red",
            label: "Hull 3"
          },
          {
            type: "enclose-hull",
            ids: ["fff", "ff"],
            color: "blue",
            label: "Hull 2",
            buffer: 20
          }
        ]}
      />
    </div>
  )
}
