import React from "react"
import DocumentFrame from "../DocumentFrame"
import { XYFrame, DividedLine } from "semiotic"
import { scaleTime } from "d3-scale"
import theme from "../theme"
import { AnnotationXYThreshold } from "react-annotation"

const chartAxes = [
  { orient: "left", tickFormat: (d) => `$${d}` },
  { orient: "bottom", ticks: 6, tickFormat: (d) => d.getFullYear() },
]

const thresholdLine = ({ d, i, xScale, yScale }) => {
  return (
    <DividedLine
      key={`threshold-${i}`}
      data={[d]}
      parameters={(p) => {
        if (p.close > 100) {
          return { stroke: theme[0], fill: "none" }
        }
        return { stroke: theme[2], fill: "none" }
      }}
      customAccessors={{ x: (d) => xScale(d.x), y: (d) => yScale(d.y) }}
      lineDataAccessor={(d) => d.data}
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
    color: theme[5],
  },
  {
    type: "x",
    date: "7/9/1997",
    note: {
      label: "Steve Jobs Returns",
      align: "middle",
      lineType: null,
      wrap: 100,
    },
    color: theme[9],
    dy: -10,
    dx: 0,
    connector: { end: "none" },
  },
  {
    type: "x",
    date: "8/15/1998",
    note: { label: "iMac Release", align: "middle", lineType: null, wrap: 50 },
    color: theme[9],
    dy: -10,
    dx: 0,
    connector: { end: "none" },
  },
  {
    type: "x",
    date: "10/23/2001",
    note: { label: "iPod Release", align: "middle", lineType: null, wrap: 50 },
    color: theme[9],
    dy: -10,
    dx: 0,
    connector: { end: "none" },
  },
  {
    type: AnnotationXYThreshold,
    note: {
      label: "Above $100",
      lineType: null,
      orientation: "topBottom",
      align: "middle",
    },
    color: theme[0],
    date: "7/1/1999",
    close: 100,
    subject: {
      x1: 250,
      x2: 400,
    },
    dx: 0,
    dy: -20,
  },
  {
    type: "enclose",
    note: {
      label: "Stock Split 2:1",
      orientation: "leftRight",
      align: "middle",
      lineType: null,
      wrap: 50,
    },
    dy: 0,
    dx: 80,
    color: theme[1],
    connector: { end: "none" },
    coordinates: [
      {
        date: "6/21/2000",
        close: 55.62,
      },
      {
        date: "6/20/2000",
        close: 101.25,
      },
    ],
  },
]

const frameProps = {
  size: [700, 300],
  xScaleType: scaleTime(),
  xAccessor: (d) => new Date(d.date),
  yAccessor: "close",
  yExtent: [0],
  customLineMark: thresholdLine,
  axes: chartAxes,
  annotations: annotations,
  margin: { top: 50, left: 40, right: 20, bottom: 40 },
  hoverAnnotation: true,
  tooltipContent: (d) => (
    <div className="tooltip-content">
      <p>Date: {d.date}</p>
      <p>Closing Price: ${d.close}</p>
    </div>
  ),
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
  )`,
  annotations: `[
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
  ]`,
}

export class AnnotationsDocumentFrame extends React.Component {
  constructor(props) {
    super(props)

    import("../../public/data/applestock.json").then((data) => {
      this.setState({
        ...frameProps,
        lines: [{ label: "Apple Stock", coordinates: data }],
      })
    })
  }

  render() {
    return (
      <DocumentFrame
        frameProps={this.state || {}}
        overrideProps={overrideProps}
        type={XYFrame}
        pre={`import { scaleTime } from "d3-scale"
import { DividedLine } from "semiotic"
import { AnnotationXYThreshold } from "react-annotation"
      `}
      />
    )
  }
}
