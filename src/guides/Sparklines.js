import React from "react"
import DocumentFrame from "../DocumentFrame"
import { SparkXYFrame, SparkOrdinalFrame, SparkNetworkFrame } from "semiotic"
import theme from "../theme"
import MarkdownText from "../MarkdownText"
import { curveMonotoneX } from "d3-shape"

const dataSeeds = [40, 40]

const stackedColors = {
  a: theme[1],
  b: theme[2],
  c: theme[3],
  d: theme[4]
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

const generatedData = dataSeeds.map((s, i) => {
  return {
    label: theme[i],
    coordinates: generatePoints(s, 40)
  }
})

const summarySample = [
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
  { s: "f", o: "a", v: 10 }
]

const negativeChart = {
  size: [100, 20],
  lines: generatedData,
  lineType: { type: "stackedarea", interpolator: curveMonotoneX },
  xAccessor: "step",
  yAccessor: "value",
  lineStyle: d => ({ fill: d.label, stroke: d.label, fillOpacity: 0.75 }),
  axes: [{ orient: "left" }]
}

const overrideProps = {
  lineType: `{ type: "stackedarea", interpolator: curveMonotoneX }`
}

export default function CreateALineChart() {
  return (
    <div>
      <MarkdownText
        text={`
Sparklines are made with the \`SparkXYFrame\`, \`SparkOrdinalFrame\` and \`SparkNetworkFrame\`. They create frames using spans instead of divs so they can be embedded in paragraphs based on the inherited \`line-height\` property.

`}
      />
      <p>
        When you insert small graphs into text, referred to as <b>sparklines</b>
        , they're typically small line charts like{" "}
        <SparkXYFrame
          {...negativeChart}
          lineRenderMode="sketchy"
          lineType="line"
          lines={[generatedData[0]]}
          hoverAnnotation={true}
        />
        . But let's say you're writing an essay and you want to discuss how two
        people have different friend networks. You could describe one as a
        "broker" and one as a "hub" or you could drop a network in your text
        like this for your hub friend{" "}
        <SparkNetworkFrame
          edges={[
            { source: "a", target: "b" },
            { source: "a", target: "c" },
            { source: "a", target: "d" },
            { source: "a", target: "g" },
            { source: "a", target: "h" },
            { source: "a", target: "i" },
            { source: "a", target: "j" }
          ]}
          edgeStyle={{ stroke: "black" }}
          nodeStyle={d => ({
            fill: d.id === "a" ? theme[1] : theme[0],
            stroke: d.id === "a" ? theme[1] : "none"
          })}
        />{" "}
        and for your broker friend:
        <SparkNetworkFrame
          edges={[
            { source: "a", target: "b" },
            { source: "a", target: "c" },
            { source: "a", target: "d" },
            { source: "d", target: "g" },
            { source: "g", target: "h" },
            { source: "g", target: "i" },
            { source: "g", target: "j" }
          ]}
          edgeStyle={{ stroke: "black" }}
          nodeStyle={d => ({
            fill: d.id === "d" ? theme[1] : theme[0],
            stroke: d.id === "d" ? theme[1] : "none"
          })}
        />
      </p>
      <p>
        Line charts may be typical, but that doesn't keep a sparkline from being
        a<SparkXYFrame {...negativeChart} renderKey={d => d.label} /> or maybe
        even a
        <SparkOrdinalFrame
          data={[8, 4, 12, 3, 4, 5, 6, 7]}
          style={{ fill: theme[2], stroke: "rgb(77, 67, 12)" }}
          type="bar"
        />{" "}
        , and naturally that means it could be a
        <SparkOrdinalFrame
          data={summarySample}
          style={d => ({ fill: stackedColors[d.o] })}
          oAccessor="s"
          rAccessor="v"
          type="bar"
          renderMode="sketchy"
          summaryRenderMode="sketchy"
        />
        , too. And though they're pretty complex shapes for such small area, a
        <SparkOrdinalFrame
          data={summarySample}
          oAccessor={d => (d.o === "a" ? "a" : "o")}
          rAccessor="v"
          oPadding={2}
          summaryStyle={{
            fill: theme[2],
            stroke: theme[2],
            fillOpacity: 0.9
          }}
          summaryType="boxplot"
          projection="horizontal"
        />{" "}
        or, you know, a{" "}
        <SparkOrdinalFrame
          data={summarySample}
          oAccessor="-"
          rAccessor="v"
          oPadding={3}
          renderMode="sketchy"
          summaryRenderMode="sketchy"
          summaryStyle={{
            fill: theme[2],
            stroke: theme[2],
            fillOpacity: 1
          }}
          summaryType={{ type: "violin", bins: 5 }}
          projection="horizontal"
        />
        , or a
        <SparkOrdinalFrame
          data={summarySample}
          oAccessor="-"
          rAccessor="v"
          oPadding={3}
          summaryStyle={{
            fill: theme[2],
            stroke: theme[2],
            fillOpacity: 0.5
          }}
          summaryType={{ type: "heatmap", bins: 5 }}
          projection="horizontal"
        />
        , or maybe a{" "}
        <SparkOrdinalFrame
          data={summarySample}
          // size={[50, 100]}
          oAccessor="-"
          rAccessor="v"
          oPadding={3}
          summaryStyle={{
            fill: theme[2],
            stroke: theme[2],
            fillOpacity: 0.5
          }}
          summaryType={{ type: "contour", bandwidth: 150, thresholds: 5 }}
          projection="horizontal"
        />
      </p>
      <p>
        All the network charts are also available like the
        <SparkNetworkFrame
          size={[100]}
          edges={[
            { source: "a", target: "b", value: 2 },
            { source: "a", target: "c", value: 2 },
            { source: "a", target: "d", value: 2 },
            { source: "c", target: "g", value: 2 },
            { source: "d", target: "g", value: 2 },
            { source: "g", target: "h", value: 2 },
            { source: "g", target: "i", value: 2 },
            { source: "g", target: "j", value: 2 }
          ]}
          edgeStyle={{ fill: "#007190" }}
          networkType={{ type: "sankey" }}
          nodeStyle={() => ({
            fill: theme[5],
            stroke: "black"
          })}
        />
        and the
        <SparkNetworkFrame
          size={60}
          edges={{
            id: "root",
            children: [
              {
                id: "a",
                children: [{ id: "aa" }, { id: "ab" }, { id: "ac" }]
              },
              { id: "b", children: [{ id: "ba" }, { id: "bb" }] },
              { id: "c", children: [{ id: "ca" }] }
            ]
          }}
          edgeStyle={{ stroke: "#007190" }}
          networkType={{ type: "dendrogram" }}
          margin={4}
          nodeStyle={() => ({
            fill: theme[5],
            stroke: "black"
          })}
        />{" "}
        or a{" "}
        <SparkNetworkFrame
          edges={[
            { source: "b", target: "b", weight: 5 },
            { source: "a", target: "c", weight: 2 },
            { source: "a", target: "d", weight: 2 },
            { source: "d", target: "b", weight: 5 },
            { source: "c", target: "a", weight: 4 },
            { source: "d", target: "a", weight: 2 },
            { source: "b", target: "d", weight: 4 }
          ]}
          edgeStyle={d => ({
            fill: stackedColors[d.source.id],
            opacity: 0.5
          })}
          networkType={{ type: "chord", padAngle: 0.3 }}
          nodeStyle={d => ({
            fill: stackedColors[d.id],
            stroke: "black"
          })}
        />
        .
      </p>
      <MarkdownText
        text={`
### Sparkline Code Example

`}
      />{" "}
      <DocumentFrame
        frameProps={{
          ...negativeChart,
          size: undefined,
          lines: generatedData[0]
        }}
        type={SparkXYFrame}
        overrideProps={overrideProps}
        pre={`import { curveMonotoneX } from "d3-shape"`}
        showExpanded
      />
      <MarkdownText
        text={`
### Sparkline with Defined Size

Sometimes the default size isn't the aspect ratio you need, you can still pass an explicit \`size={[100, 20]}\` prop to override the default size based on \`lineHeight\` 
`}
      />{" "}
      <DocumentFrame
        frameProps={{
          ...negativeChart,
          lines: generatedData[0]
        }}
        type={SparkXYFrame}
        overrideProps={overrideProps}
        pre={`import { curveMonotoneX } from "d3-shape"`}
        startHidden
      />
    </div>
  )
}
