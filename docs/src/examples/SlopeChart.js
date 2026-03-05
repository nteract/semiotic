import React from "react"
import DocumentFrame from "../DocumentFrame"
import { StreamOrdinalFrame } from "semiotic"
import theme from "../theme"
import MarkdownText from "../MarkdownText"

const frameProps = {
  size: [540, 450],
  oAccessor: "year",
  rAccessor: "value",
  rExtent: [0, undefined],
  margin: { left: 40, top: 50, bottom: 75, right: 160 },
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
  showAxes: true,
  pieceStyle: d => ({
    fill: d.color,
    stroke: "white",
    strokeOpacity: 0.5
  }),
  connectorStyle: d => ({
    stroke: d.color,
    strokeWidth: 2,
    opacity: 0.5
  }),
  oLabel: true,
  chartType: "point",
  connectorAccessor: d => d.name,
  tooltipContent: d => {
    const datum = d.data || d
    return (
      <div style={{ padding: "4px 8px", fontSize: 13 }}>
        <strong>{datum.name}</strong>
        <div>{datum.year}: {Number(datum.value).toFixed(1)}%</div>
      </div>
    )
  },
  foregroundGraphics: [
    <g transform="translate(400, 73)" key="legend">
      <text key={1} fill={theme[0]}>
        New York
      </text>
      <text key={2} y={20} fill={theme[1]}>
        Las Vegas
      </text>
      <text key={3} y={40} fill={theme[2]}>
        San Diego
      </text>
      <text key={4} y={60} fill={theme[3]}>
        Denver
      </text>
      <text key={5} y={80} fill={theme[4]}>
        Oakland
      </text>
    </g>
  ]
}

const overrideProps = {
  tooltipContent: `d => {
    const datum = d.data || d
    return (
      <div style={{ padding: "4px 8px", fontSize: 13 }}>
        <strong>{datum.name}</strong>
        <div>{datum.year}: {Number(datum.value).toFixed(1)}%</div>
      </div>
    )
  }`,
  foregroundGraphics: ` [
    <g transform="translate(400, 73)" key="legend">
      <text key={1} fill={theme[0]}>
        New York
      </text>
      <text key={2} y={20} fill={theme[1]}>
        Las Vegas
      </text>
      <text key={3} y={40} fill={theme[2]}>
        San Diego
      </text>
      <text key={4} y={60} fill={theme[3]}>
        Denver
      </text>
      <text key={5} y={80} fill={theme[4]}>
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

A slope chart is a common way to show change between two points in time. This data is from [Big Cities Health Coalition](https://bchi.bigcitieshealth.org/indicators/1827/searches/22971).

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
