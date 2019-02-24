import React from "react"
import MarkdownPage from "../MarkdownPage"
import MarkdownText from "../MarkdownText"
import DocumentFrame from "../DocumentFrame"
import { XYFrame, DividedLine } from "semiotic"
import { scaleTime } from "d3-scale"
import theme from "../theme"
import { AnnotationXYThreshold } from "react-annotation"

const ROOT = process.env.PUBLIC_URL

const chartAxes = [
  { orient: "left", tickFormat: d => `$${d}` },
  { orient: "bottom", ticks: 6, tickFormat: d => d.getFullYear() }
]

const thresholdLine = ({ d, i, xScale, yScale }) => {
  return (
    <DividedLine
      key={`threshold-${i}`}
      data={[d]}
      parameters={p => {
        if (p.close > 100) {
          return { stroke: theme[0], fill: "none" }
        }
        return { stroke: theme[2], fill: "none" }
      }}
      customAccessors={{ x: d => xScale(d.x), y: d => yScale(d.y) }}
      lineDataAccessor={d => d.data}
    />
  )
}

const annotations = [
  {
    className: "dot-com-bubble",
    type: "bounds",
    bounds: [{ date: new Date("1/2/1997") }, { date: new Date("1/2/2001") }],
    label: "The dot-com bubble",
    dx: 250,
    color: theme[5]
  },
  {
    type: "x",
    date: "7/9/1997",
    note: {
      label: "Steve Jobs Returns",
      align: "middle",
      lineType: null,
      wrap: 100
    },
    color: theme[9],
    dy: -10,
    dx: 0,
    connector: { end: "none" }
  },
  {
    type: "x",
    date: "8/15/1998",
    note: { label: "iMac Release", align: "middle", lineType: null, wrap: 50 },
    color: theme[9],
    dy: -10,
    dx: 0,
    connector: { end: "none" }
  },
  {
    type: "x",
    date: "10/23/2001",
    note: { label: "iPod Release", align: "middle", lineType: null, wrap: 50 },
    color: theme[9],
    dy: -10,
    dx: 0,
    connector: { end: "none" }
  },
  {
    type: AnnotationXYThreshold,
    note: {
      label: "Above $100",
      lineType: null,
      orientation: "topBottom",
      align: "middle"
    },
    color: theme[0],
    date: "7/1/1999",
    close: 100,
    subject: {
      x1: 250,
      x2: 400
    },
    dx: 0,
    dy: -20
  },
  {
    type: "enclose",
    note: {
      label: "Stock Split 2:1",
      orientation: "leftRight",
      align: "middle",
      lineType: null,
      wrap: 50
    },
    dy: 0,
    dx: 80,
    color: theme[1],
    connector: { end: "none" },
    coordinates: [
      {
        date: "6/21/2000",
        close: 55.62
      },
      {
        date: "6/20/2000",
        close: 101.25
      }
    ]
  }
]

const frameProps = {
  size: [700, 300],
  xScaleType: scaleTime(),
  xAccessor: d => new Date(d.date),
  yAccessor: "close",
  yExtent: [0],
  customLineMark: thresholdLine,
  axes: chartAxes,
  annotations: annotations,
  margin: { top: 50, left: 40, right: 20, bottom: 40 },
  hoverAnnotation: true,
  tooltipContent: d => (
    <div className="tooltip-content">
      <p>Date: {d.date}</p>
      <p>Closing Price: ${d.close}</p>
    </div>
  )
}

const overrideProps = {
  xScaleType: "scaleTime()",
  customLineMark: `({ d, i, xScale, yScale }) => {
    return (
      <DividedLine
        key={\`threshold-\${i}\`}
        data={[d]}
        parameters={p => {
          if (p.close > 100) {
            return { stroke: theme[0], fill: "none" }
          }
          return { stroke: theme[2], fill: "none" }
        }}
        customAccessors={{ x: d => xScale(d.x), y: d => yScale(d.y) }}
        lineDataAccessor={d => d.data}
      />
    )
  }`,
  tooltipContent: `d => (
    <div className="tooltip-content">
      <p>Date: {d.date}</p>
      <p>Closing Price: \${d.close}</p>
    </div>
  )`
}

export default class Annotations extends React.Component {
  constructor(props) {
    super(props)

    fetch(`${ROOT}/data/applestock.json`)
      .then(response => response.json())
      .then(data => {
        this.setState({
          ...frameProps,
          lines: [{ label: "Apple Stock", coordinates: data }]
        })
      })
  }
  render() {
    if (!this.state) return <p>Loading...</p>

    return (
      <div>
        <MarkdownText
          text={`
All frames have annotation capabilities that let you easily deploy [react-annotations](https://react-annotation.susielu.com/). There is also built-in support for automatic label adjustment using [labella.js](http://twitter.github.io/labella.js/).

All frames takes a prop \`annotations\` which is an array of annotation objects:

\`\`\`jsx
<XYFrame annotations={[{ type: "react-annotation", label: "a note" }]} />
\`\`\`

This array of annotations is sent to **both** an:

- \`svgAnnotationRules\` function which renders in an SVG layer
- \`htmlAnnotationRules\` function which renders in an HTML layer

This allows for the creation of graphical elements in both SVG & HTML for the same annotation type.

There are built-in annotation types handled in the default \`htmlAnnotationRules\` and \`svgAnnotationRules\` functions on all frames that let you simply pass an array of settings to the \`annotations\` prop without having to write custom rendering functions.

Otherwise, you can pass your own \`htmlAnnotationRules\` and \`svgAnnotationRules\` to create completely [custom rendering logic](#custom-annotation-rules) based on the annotation type.

## Built-in Annotation Types

Each of the following options is a type of annotation that can be passed to the \`annotations\` prop:

\`\`\`jsx
<XYFrame annotations={[{ type: "react-annotation", label: "a note" }, {type: "highlight"}}]]} />

\`\`\`       

A detailed example of a single chart with annotations and rich information display. It leverages the DividedLine component and built-in annotation handling to reproduce [Susie Lu's Apple stock chart](https://bl.ocks.org/susielu/23dc3082669ee026c552b85081d90976).

It also uses a custom x scale using xScaleType to pass a scale built with D3's scaleTime, as well as tooltip processing rules using tooltipContent.
    `}
        />
        <DocumentFrame
          frameProps={this.state || {}}
          overrideProps={overrideProps}
          type={XYFrame}
          pre={`import { scaleTime } from "d3-scale"`}
          useExpanded
        />
        <MarkdownPage filename="annotations" />
      </div>
    )
  }
}
