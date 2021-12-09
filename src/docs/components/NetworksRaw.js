import * as React from "react"
import { NetworkFrame } from "../../components"
import data from "../sampledata/flare.json"
import {
  /*forceCenter,*/ forceSimulation,
  forceX,
  forceY,
  forceCollide,
  forceManyBody
} from "d3-force"
import roughjs from "roughjs/dist/rough.es5.umd.js"

const colors = ["#4d430c", "#b3331d", "#b6a756", "black"]

const customSimulation = forceSimulation().force(
  "charge",
  forceManyBody().distanceMax(500).strength(-100)
)

const bubbleSimulation = forceSimulation().force(
  "collide",
  forceCollide().radius((d) => d.r)
)

const bunchaNodes = [...Array(40)].map((d, i) => ({
  name: `Node ${i}`,
  color: "gold",
  r: Math.random() * 3 + 5
}))

const bunchaEdges = [...Array(20)].map(() => ({
  source: `Node ${parseInt(Math.random() * 40)}`,
  target: `Node ${parseInt(Math.random() * 40)}`,
  weight: 2
}))

const bunchaOtherNodes = [...Array(20)].map((d, i) => ({
  name: `Other Node ${i}`,
  r: Math.random() * 3 + 5,
  color: "brown"
}))

const bunchaOtherEdges = [...Array(20)].map(() => ({
  source: `Other Node ${parseInt(Math.random() * 20)}`,
  target: `Node ${parseInt(Math.random() * 40)}`,
  weight: 20
}))

const multiFociSimulation = forceSimulation()
  .force(
    "collide",
    forceCollide().radius((d) => d.r)
  )
  .force(
    "x",
    forceX((d) => d.fociX)
  )
  .force(
    "y",
    forceY((d) => d.fociY)
  )

const combinedFociNodes = [...Array(500)].map((d, i) => ({
  name: `Node ${i}`,
  r: Math.random() * 5 + (i % 4) * 2,
  fociX: (i % 2) * 200 + 150,
  fociY: Math.floor((i % 4) / 2) * 200 + 150,
  combinedY: (i % 4) * 75 + 150,
  color: colors[i % 4]
}))

const combinedFociSimulation = forceSimulation()
  .force(
    "collide",
    forceCollide().radius((d) => d.r)
  )
  .force(
    "y",
    forceY((d) => d.combinedY)
  )

const multiFociSimulationForCombined = forceSimulation()
  .force(
    "collide",
    forceCollide().radius((d) => d.r)
  )
  .force(
    "x",
    forceX((d) => d.fociX)
  )
  .force(
    "y",
    forceY((d) => d.fociY)
  )

const multiFociNodes = [...Array(500)].map((d, i) => ({
  name: `Node ${i}`,
  r: Math.random() * 5 + 5 - (i % 4),
  fociX: (i % 2) * 200 + 200,
  fociY: Math.floor((i % 4) / 2) * 200 + 200,
  color: colors[i % 4]
}))

export const changeEdges = (moreNodes) => {
  const finalNodes = !moreNodes
    ? bunchaNodes
    : [...bunchaNodes, ...bunchaOtherNodes]
  const finalEdges = !moreNodes
    ? bunchaEdges
    : [...bunchaEdges, ...bunchaOtherEdges]
  return (
    <div>
      <NetworkFrame
        nodes={finalNodes}
        edges={finalEdges}
        size={[700, 700]}
        networkType={{
          type: "force",
          fixExistingNodes: false
        }}
        edgeType="arrowhead"
        nodeSizeAccessor={(d) => d.r + 3}
        nodeStyle={() => ({ fill: "#fcc089", stroke: "#fcc089" })}
        edgeStyle={{ stroke: "#00b0b9", fill: "#00b0b9", strokeWidth: 2 }}
        nodeIDAccessor="name"
        sketchyRenderingEngine={roughjs}
        nodeRenderMode={{ renderMode: "sketchy", fillStyle: "solid" }}
        edgeRenderMode="sketchy"
      />
      <NetworkFrame
        nodes={finalNodes}
        edges={finalEdges}
        size={[700, 700]}
        networkType={{
          type: "force",
          fixExistingNodes: false
        }}
        edgeType="ribbon"
        nodeSizeAccessor={(d) => d.r + 3}
        nodeStyle={() => ({ fill: "#fcc089", stroke: "#fcc089" })}
        edgeStyle={{ stroke: "#00b0b9", fill: "#00b0b9", strokeWidth: 2 }}
        nodeIDAccessor="name"
        sketchyRenderingEngine={roughjs}
        nodeRenderMode={{ renderMode: "sketchy", fillStyle: "solid" }}
        edgeRenderMode="sketchy"
      />
    </div>
  )
}

export const basic = (
  <NetworkFrame
    edges={data}
    networkType={{
      type: "force",
      iterations: 1000,
      forceManyBody: -250,
      distanceMax: 500,
      edgeStrength: 2
    }}
    nodeSizeAccessor={2}
    edgeStyle={{ stroke: "darkred" }}
    nodeIDAccessor="name"
  />
)

export const withCustomSimulation = (
  <NetworkFrame
    edges={data}
    networkType={{
      type: "force",
      iterations: 500,
      simulation: customSimulation,
      edgeStrength: 2
    }}
    nodeSizeAccessor={2}
    edgeStyle={{ stroke: "darkred" }}
    nodeIDAccessor="name"
  />
)

export const bubbleChart = (
  <NetworkFrame
    nodes={bunchaNodes}
    size={[400, 900]}
    networkType={{
      type: "force",
      iterations: 400,
      simulation: bubbleSimulation,
      zoom: true
    }}
    nodeSizeAccessor={(d) => d.r}
    nodeStyle={{ stroke: "darkred" }}
    nodeIDAccessor="name"
  />
)

export const multiFoci = (
  <NetworkFrame
    nodes={multiFociNodes}
    networkType={{
      type: "force",
      iterations: 300,
      simulation: multiFociSimulation,
      zoom: false
    }}
    nodeSizeAccessor={(d) => d.r}
    nodeStyle={(d) => ({ stroke: "darkred", fill: d.color })}
    nodeIDAccessor="name"
  />
)

export const changeSimulationMode = (mode, changeModeFunction) => (
  <div>
    <button onClick={() => changeModeFunction()}>Change Modes</button>
    <NetworkFrame
      nodes={combinedFociNodes}
      networkType={{
        type: "force",
        iterations: 500,
        simulation:
          mode === "combined"
            ? combinedFociSimulation
            : multiFociSimulationForCombined,
        zoom: false
      }}
      nodeSizeAccessor={(d) => d.r}
      nodeStyle={(d) => ({ stroke: "darkred", fill: d.color })}
      nodeIDAccessor="name"
    />
  </div>
)
