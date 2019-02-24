import React from "react"
import DocumentFrame from "../DocumentFrame"
import { OrdinalFrame } from "semiotic"
import theme from "../theme"
import MarkdownText from "../MarkdownText"

// const ROOT = process.env.PUBLIC_URL;

const frameProps = {
  size: [500, 450],
  // projection: "horizontal",
  oAccessor: "year",
  rAccessor: "value",
  rExtent: [0],
  margin: { left: 40, top: 50, bottom: 75, right: 120 },
  title: "% of Adults Who Binge Drink",
  data: [
    { name: "New York", color: theme[0], year: 2011, value: 17.9 },
    { name: "Las Vegas", color: theme[1], year: 2011, value: 18.7 },
    { name: "San Diego", color: theme[2], year: 2011, value: 18.9 },
    { name: "Denver", color: theme[3], year: 2011, value: 27.4 },
    { name: "Oakland", color: theme[4], year: 2011, value: 30.5 },
    { name: "New York", color: theme[0], year: 2015, value: 17.2 },
    { name: "Las Vegas", color: theme[1], year: 2015, value: 13.9 },
    { name: "San Diego", color: theme[2], year: 2015, value: 16.1 },
    { name: "Denver", color: theme[3], year: 2015, value: 26.6 },
    { name: "Oakland", color: theme[4], year: 2015, value: 37.2 }
  ],
  axis: [
    {
      tickFormat: d => `${d}%`,
      baseline: false,
      label: { name: "Adults Who Binge Drink" }
    },
    { tickFormat: d => `${d}%`, baseline: false, orient: "right" }
  ],
  style: d => ({
    fill: d.color,
    stroke: "white",
    strokeOpacity: 0.5
  }),
  connectorStyle: d => {
    return {
      fill: d.source.color,
      stroke: d.source.color,
      strokeOpacity: 0.5,
      fillOpacity: 0.5
    }
  },
  oLabel: true,
  type: { type: "point", r: () => 5 },
  connectorType: d => d.name,
  foregroundGraphics: [
    <g transform="translate(440, 73)" key="legend">
      <text key={1} fill={theme[0]}>
        New York
      </text>
      <text key={1} y={20} fill={theme[1]}>
        Las Vegas
      </text>
      <text key={1} y={40} fill={theme[2]}>
        San Diego
      </text>
      <text key={1} y={60} fill={theme[3]}>
        Denver
      </text>
      <text key={1} y={80} fill={theme[4]}>
        Oakland
      </text>
    </g>
  ]
}

const overrideProps = {
  title: `(
    <text textAnchor="middle">
      Weekly(1-52) Box Office Totals from <tspan fill={
        theme[0]}
      >2016</tspan> -
      mid <tspan fill={theme[2]}>2017</tspan>
    </text>
  )`,
  tooltipContent: `d => (
    <div>
      {d.date} - {Math.round(d.total / 1000000)}m
    </div>
  )
  `,
  foregroundGraphics: ` [
    <g transform="translate(440, 73)" key="legend">
      <text key={1} fill={theme[0]}>
        New York
      </text>
      <text key={1} y={20} fill={theme[1]}>
        Las Vegas
      </text>
      <text key={1} y={40} fill={theme[2]}>
        San Diego
      </text>
      <text key={1} y={60} fill={theme[3]}>
        Denver
      </text>
      <text key={1} y={80} fill={theme[4]}>
        Oakland
      </text>
    </g>
  ]`
}

export default function SwarmPlot() {
  return (
    <div>
      <MarkdownText
        text={`

A way to show change between two points in time. 

`}
      />
      <DocumentFrame
        frameProps={frameProps}
        overrideProps={overrideProps}
        type={OrdinalFrame}
        useExpanded
      />
    </div>
  )
}
