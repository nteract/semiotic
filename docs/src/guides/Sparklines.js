import React from "react"
import DocumentFrame from "../DocumentFrame"
import { StreamXYFrame, StreamOrdinalFrame, StreamNetworkFrame } from "semiotic"
import theme from "../theme"
import MarkdownText from "../MarkdownText"


const dataSeeds = [40, 40]

export const stackedColors = {
  a: theme[1],
  b: theme[2],
  c: theme[3],
  d: theme[4],
}

function generatePoints(start, number) {
  const arrayOfPoints = []
  let currentValue = start
  for (let x = 0; x <= number; x++) {
    arrayOfPoints.push({ step: x, value: currentValue })
    currentValue += Math.random() * 10 - 5
  }
  return arrayOfPoints
}

export const generatedData = dataSeeds.map((s, i) => {
  return {
    label: theme[i],
    coordinates: generatePoints(s, 40),
  }
})

export const summarySample = [
  { s: "a", o: "a", v: 8 },
  { s: "a", o: "b", v: 4 },
  { s: "a", o: "c", v: 12 },
  { s: "b", o: "a", v: 3 },
  { s: "b", o: "b", v: 4 },
  { s: "b", o: "c", v: 5 },
  { s: "c", o: "a", v: 6 },
  { s: "c", o: "b", v: 7 },
  { s: "c", o: "c", v: 3 },
  { s: "d", o: "a", v: 11 },
  { s: "d", o: "b", v: 8 },
  { s: "d", o: "c", v: 13 },
  { s: "e", o: "a", v: 6 },
  { s: "e", o: "b", v: 7 },
  { s: "e", o: "c", v: 8 },
  { s: "f", o: "a", v: 10 },
]

export const negativeChart = {
  size: [100, 20],
  data: generatedData,
  chartType: "stackedarea",
  curve: "monotoneX",
  lineDataAccessor: "coordinates",
  xAccessor: "step",
  yAccessor: "value",
  lineStyle: (d) => ({ fill: d.label, stroke: d.label, fillOpacity: 0.75 }),
  showAxes: true,
}

export const overrideProps = {
  chartType: `"stackedarea"`,
  curve: `"monotoneX"`,
}

export function SparkXYExample1() {
  return (
    <StreamXYFrame
      {...negativeChart}
      lineRenderMode="sketchy"
      chartType="line"
      data={[generatedData[0]]}
      enableHover={true}
    />
  )
}

export function SparkNetworkExample1() {
  return (
    <StreamNetworkFrame
      size={[40, 20]}
      edges={[
        { source: "a", target: "b" },
        { source: "a", target: "c" },
        { source: "a", target: "d" },
        { source: "a", target: "g" },
        { source: "a", target: "h" },
        { source: "a", target: "i" },
        { source: "a", target: "j" },
      ]}
      edgeStyle={{ stroke: "black" }}
      nodeStyle={(d) => ({
        fill: d.id === "a" ? theme[1] : theme[0],
        stroke: d.id === "a" ? theme[1] : "none",
      })}
    />
  )
}

export function SparkNetworkExample2() {
  return (
    <StreamNetworkFrame
      size={[60, 20]}
      edges={[
        { source: "a", target: "b" },
        { source: "a", target: "c" },
        { source: "a", target: "d" },
        { source: "d", target: "g" },
        { source: "g", target: "h" },
        { source: "g", target: "i" },
        { source: "g", target: "j" },
      ]}
      edgeStyle={{ stroke: "black" }}
      nodeStyle={(d) => ({
        fill: d.id === "d" ? theme[1] : theme[0],
        stroke: d.id === "d" ? theme[1] : "none",
      })}
    />
  )
}

export function SparkXYExample2() {
  return <StreamXYFrame {...negativeChart} renderKey={(d) => d.label} />
}

export function SparkOrdinalExample1() {
  return (
    <StreamOrdinalFrame
      data={[8, 4, 12, 3, 4, 5, 6, 7]}
      style={{ fill: theme[2], stroke: "rgb(77, 67, 12)" }}
      type="bar"
    />
  )
}

export function SparkOrdinalExample2() {
  return (
    <StreamOrdinalFrame
      data={summarySample}
      style={(d) => ({ fill: stackedColors[d.o] })}
      oAccessor="s"
      rAccessor="v"
      type="bar"
      renderMode="sketchy"
      summaryRenderMode="sketchy"
    />
  )
}

export function SparkOrdinalExample3() {
  return (
    <StreamOrdinalFrame
      data={summarySample}
      oAccessor={(d) => (d.o === "a" ? "a" : "o")}
      rAccessor="v"
      oPadding={2}
      summaryStyle={{ fill: theme[2], stroke: theme[2], fillOpacity: 0.9 }}
      summaryType="boxplot"
      projection="horizontal"
    />
  )
}

export function SparkOrdinalExample4() {
  return (
    <StreamOrdinalFrame
      size={[50, 100]}
      data={summarySample}
      oAccessor="-"
      rAccessor="v"
      oPadding={3}
      renderMode="sketchy"
      summaryRenderMode="sketchy"
      summaryStyle={{ fill: theme[2], stroke: theme[2], fillOpacity: 1 }}
      summaryType={{ type: "violin", bins: 5 }}
      projection="horizontal"
    />
  )
}

export function SparkOrdinalExample5() {
  return (
    <StreamOrdinalFrame
      size={[50, 100]}
      data={summarySample}
      oAccessor="-"
      rAccessor="v"
      oPadding={3}
      summaryStyle={{
        fill: theme[2],
        stroke: theme[2],
        fillOpacity: 0.5,
      }}
      summaryType={{ type: "heatmap", bins: 5 }}
      projection="horizontal"
    />
  )
}

export function SparkOrdinalExample6() {
  return (
    <StreamOrdinalFrame
      data={summarySample}
      size={[50, 100]}
      oAccessor="-"
      rAccessor="v"
      oPadding={3}
      summaryStyle={{
        fill: theme[2],
        stroke: theme[2],
        fillOpacity: 0.5,
      }}
      summaryType={{ type: "contour", bandwidth: 150, thresholds: 5 }}
      projection="horizontal"
    />
  )
}

export function SparkNetworkExample3() {
  return (
    <StreamNetworkFrame
      size={[100]}
      edges={[
        { source: "a", target: "b", value: 2 },
        { source: "a", target: "c", value: 2 },
        { source: "a", target: "d", value: 2 },
        { source: "c", target: "g", value: 2 },
        { source: "d", target: "g", value: 2 },
        { source: "g", target: "h", value: 2 },
        { source: "g", target: "i", value: 2 },
        { source: "g", target: "j", value: 2 },
      ]}
      edgeStyle={{ fill: "#007190" }}
      networkType={{ type: "sankey" }}
      nodeStyle={() => ({
        fill: theme[5],
        stroke: "black",
      })}
    />
  )
}

export function SparkNetworkExample4() {
  return (
    <StreamNetworkFrame
      size={60}
      edges={{
        id: "root",
        children: [
          {
            id: "a",
            children: [{ id: "aa" }, { id: "ab" }, { id: "ac" }],
          },
          { id: "b", children: [{ id: "ba" }, { id: "bb" }] },
          { id: "c", children: [{ id: "ca" }] },
        ],
      }}
      edgeStyle={{ stroke: "#007190" }}
      networkType={{ type: "dendrogram" }}
      margin={4}
      nodeStyle={() => ({
        fill: theme[5],
        stroke: "black",
      })}
    />
  )
}

export function SparkNetworkExample5() {
  return (
    <StreamNetworkFrame
      edges={[
        { source: "b", target: "b", weight: 5 },
        { source: "a", target: "c", weight: 2 },
        { source: "a", target: "d", weight: 2 },
        { source: "d", target: "b", weight: 5 },
        { source: "c", target: "a", weight: 4 },
        { source: "d", target: "a", weight: 2 },
        { source: "b", target: "d", weight: 4 },
      ]}
      edgeStyle={(d) => ({
        fill: stackedColors[d.source.id],
        opacity: 0.5,
      })}
      networkType={{ type: "chord", padAngle: 0.3 }}
      nodeStyle={(d) => ({
        fill: stackedColors[d.id],
        stroke: "black",
      })}
    />
  )
}
