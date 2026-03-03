import React from "react"
import DocumentFrame from "../DocumentFrame"
import { StreamOrdinalFrame } from "semiotic"
import theme from "../theme"
import MarkdownText from "../MarkdownText"

const frameProps = {
  size: [700, 500],
  rAccessor: ["leads", "sales"],
  oAccessor: "month",
  chartType: "point",
  rExtent: [0, undefined],
  oLabel: true,
  margin: { top: 60, bottom: 50, left: 60, right: 60 },
  barPadding: 10,
  data: [
    { sales: 5, leads: 150, month: "Jan" },
    { sales: 7, leads: 100, month: "Feb" },
    { sales: 7, leads: 75, month: "Mar" },
    { sales: 4, leads: 50, month: "Apr" },
    { sales: 2, leads: 200, month: "May" },
    { sales: 3, leads: 175, month: "Jun" },
    { sales: 5, leads: 125, month: "Jul" }
  ],
  showAxes: true,
  connectorAccessor: d => {
    return d.rIndex !== 0 && d.rIndex
  },
  connectorStyle: { stroke: theme[1], strokeWidth: 3 },
  enableHover: true,
  title: "Sales vs Leads",
  pieceStyle: { fill: theme[0], opacity: 1, stroke: "white" },
  tooltipContent: d => {
    const bothValues = [
      <div style={{ color: theme[0] }} key={"1"}>
        Leads: {d.leads}
      </div>,
      <div style={{ color: theme[1] }} key="2">
        Sales: {d.sales}
      </div>
    ]
    const content = d.rIndex === 0 ? bothValues : bothValues.reverse()
    return (
      <div style={{ fontWeight: 900 }} className="tooltip-content">
        {content}
      </div>
    )
  }
}

const overrideProps = {
  tooltipContent: `d => {
    const bothValues = [
      <div style={{ color: theme[0] }} key={"1"}>
        Leads: {d.leads}
      </div>,
      <div style={{ color: theme[1] }} key="2">
        Sales: {d.sales}
      </div>
    ];
    const content = d.rIndex === 0 ? bothValues : bothValues.reverse();
    return (
      <div style={{ fontWeight: 900 }} className="tooltip-content">
        {content}
      </div>
    );
  }
  `
}

const BarLineChart = () => {
  return (
    <div>
      <MarkdownText
        text={`

This chart shows Sales vs Leads using points with connectors. Note that \`multiAxis\` is not yet supported in StreamOrdinalFrame, so both accessors share the same scale.

`}
      />
      <DocumentFrame
        frameProps={frameProps}
        overrideProps={overrideProps}
        type={StreamOrdinalFrame}
        useExpanded
      />
    </div>
  )
}

export default BarLineChart
