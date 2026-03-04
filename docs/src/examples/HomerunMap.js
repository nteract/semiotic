import React from "react"
import DocumentFrame from "../DocumentFrame"
import { StreamXYFrame } from "semiotic"
import theme from "../theme"
import MarkdownText from "../MarkdownText"

import { data, fieldGraphic } from "./stanton"
import { extent } from "d3-array"
import { scaleLinear } from "d3-scale"

const velocityExtent = extent(data.map(d => d.exit_velocity))

const velocityScale = scaleLinear()
  .domain(velocityExtent)
  .range([theme[2], theme[1]])

const frameProps = {
  chartType: "scatter",
  data: data,
  xAccessor: "bx",
  yAccessor: "by",
  size: [500, 500],
  yExtent: [-50],
  pointStyle: d => ({
    fill: velocityScale(d.exit_velocity),
    r: 6
  }),
  enableHover: true,
  tooltipContent: d => {
    const datum = d.data || {}
    return (
      <div className="tooltip-content">
        <p>Date: {datum.game_date}</p>
        <p>Distance: {datum.distance}</p>
        <p>Velocity: {datum.exit_velocity}</p>
      </div>
    )
  },
  margin: { left: 25, right: 25, top: 25, bottom: 25 },
  showAxes: false,
  backgroundGraphics: fieldGraphic,
  pulse: { duration: 600, color: "rgba(255,255,255,0.5)", glowRadius: 5 }
}

const overrideProps = {
  backgroundGraphics: `(
    <g transform={"translate(50,50) scale(1.85)"}>
      <g id="_KC_-_7">
        <g id="Compass_copy_5" />
        <path
          className="st3"
          d="M126.2,229.4c-18.1,0-28.1-10.7-28.1-10.7l-0.2-3.9l-16.3-19.5h-4.2l-21.6-36.7L27,108.6l-1.5-4.2 c0,0-2-13.3,4.4-21.9c8.4-11.3,60.8-49,83.7-52.2c0,0,12-3.9,25.6-0.5c13.6,3.4,71.5,41.2,77.5,47.6c5.5,5.8,10.8,21.2,4.9,36 s-19.7,32-21,37.4c-1.3,5.4-24.1,43.2-26.9,44.3c-2.8,1.1-3.9,0-3.9,0L153.5,214l0.2,4.4C153.6,218.5,144.3,229.4,126.2,229.4z"
        />
        ...
      </g>
    </g>
  )`,
  tooltipContent: `d => {
    const datum = d.data || {}
    return (
      <div className="tooltip-content">
        <p>Date: {datum.game_date}</p>
        <p>Distance: {datum.distance}</p>
        <p>Velocity: {datum.exit_velocity}</p>
      </div>
    )
  }`
}

const HomerunMap = () => {
  return (
    <div>
      <MarkdownText
        text={`
Giancarlo Stanton's home runs shown with a baseball park outline based on [Daren Willman](https://github.com/darenwillman/baseball)'s data and sports visualization work.

`}
      />

      <DocumentFrame
        frameProps={frameProps}
        type={StreamXYFrame}
        overrideProps={overrideProps}
        pre={`
import { scaleLinear } from 'd3-scale'

const velocityScale = scaleLinear()
    .domain([95.1, 118.2])
    .range([theme[2], theme[1]])
        `}
        useExpanded
      />
    </div>
  )
}

export default HomerunMap
