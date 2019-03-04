import React from "react"
import { NetworkFrame } from "../../components"
import data from "../sampledata/flare.json"
import {
  /*forceCenter,*/ forceSimulation,
  forceX,
  forceY,
  forceCollide,
  forceManyBody
} from "d3-force"
// import ProcessViz from "./ProcessViz"
/*
  <div>
    <ProcessViz frameSettings={regionatedLineChart} frameType="XYFrame" />
    <XYFrame {...regionatedLineChart} />
  </div>
*/

const colors = ["#4d430c", "#b3331d", "#b6a756", "black"]

const customSimulation = forceSimulation().force(
  "charge",
  forceManyBody()
    .distanceMax(500)
    .strength(-100)
)

const bubbleSimulation = forceSimulation().force(
  "collide",
  forceCollide().radius(d => d.r)
)

const bunchaNodes = [...Array(40)].map((d, i) => ({
  name: `Node ${i}`,
  r: Math.random() * 30 + 10
}))

const multiFociSimulation = forceSimulation()
  .force("collide", forceCollide().radius(d => d.r))
  .force("x", forceX(d => d.fociX))
  .force("y", forceY(d => d.fociY))

const combinedFociNodes = [...Array(500)].map((d, i) => ({
  name: `Node ${i}`,
  r: Math.random() * 5 + (i % 4) * 2,
  fociX: (i % 2) * 200 + 150,
  fociY: Math.floor((i % 4) / 2) * 200 + 150,
  combinedY: (i % 4) * 75 + 150,
  color: colors[i % 4]
}))

const combinedFociSimulation = forceSimulation()
  .force("collide", forceCollide().radius(d => d.r))
  .force("y", forceY(d => d.combinedY))

const multiFociSimulationForCombined = forceSimulation()
  .force("collide", forceCollide().radius(d => d.r))
  .force("x", forceX(d => d.fociX))
  .force("y", forceY(d => d.fociY))

const multiFociNodes = [...Array(500)].map((d, i) => ({
  name: `Node ${i}`,
  r: Math.random() * 5 + 5 - (i % 4),
  fociX: (i % 2) * 200 + 200,
  fociY: Math.floor((i % 4) / 2) * 200 + 200,
  color: colors[i % 4]
}))

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
    nodeSizeAccessor={d => d.r}
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
    nodeSizeAccessor={d => d.r}
    nodeStyle={d => ({ stroke: "darkred", fill: d.color })}
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
      nodeSizeAccessor={d => d.r}
      nodeStyle={d => ({ stroke: "darkred", fill: d.color })}
      nodeIDAccessor="name"
    />
  </div>
)
