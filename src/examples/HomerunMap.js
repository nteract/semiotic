import React from "react"
import DocumentFrame from "../DocumentFrame"
import { XYFrame } from "semiotic"
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
  points: data,
  annotations: [
    {
      type: "enclose",
      dy: -120,
      dx: -1,
      note: {
        padding: 10,
        align: "middle",
        lineType: null,
        label: "Shortest distance home runs."
      },
      connector: { end: "dot" },
      coordinates: [{ bx: 235, by: 250 }, { bx: 235, by: 275 }]
    }
  ],
  xAccessor: "bx",
  yAccessor: "by",
  yExtent: [-50],
  pointStyle: d => ({
    fill: velocityScale(d.exit_velocity),
    r: 6
  }),
  // summaries: [{ label: "stanton", coordinates: data }],
  hoverAnnotation: true,
  tooltipContent: d => (
    <div className="tooltip-content">
      <p>Date: {d.game_date}</p>
      <p>Distance: {d.distance}</p>
      <p>Velocity: {d.exit_velocity}</p>
    </div>
  ),
  margin: { left: 25, right: 25, top: 25, bottom: 25 },
  backgroundGraphics: fieldGraphic
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
        <path
          className="st4"
          d="M126.1,220.6c-16.4,0-25.5-9.7-25.5-9.7l-0.2-3.6l-14.7-17.6h-3.8l-19.6-33.3l-26.5-45.7l-1.3-3.8 c0,0-1.8-12.1,4-19.9c7.6-10.3,55.4-45.1,76.2-48c0,0,10.9-3.6,23.2-0.4c12.4,3.1,65.2,37.9,70.7,43.7c5,5.3,9.8,19.2,4.5,32.6 c-5.4,13.4-18.1,29.6-19.3,34.5c-1.2,4.9-21.9,39.2-24.4,40.2c-2.5,1-3.6,0-3.6,0l-14.9,17.1l0.2,4 C151,210.6,142.5,220.6,126.1,220.6z"
        />
        <path
          id="Infield_sand_1_"
          className="st5"
          d="M165.4,168c-0.2,0.2-7-30.8-40.3-30.5c-35.7,0.2-39.8,28-40.3,30.7l0,0l10.7,10.9 l0.3,3.1l4.2,3.9l2.5,0.1l17.2,15.5c-0.7,1-1.2,2.3-1.1,3.7c0,1.3,0.4,2.4,1.1,3.4c0,0,0,0,0,0.1c1.2,1.8,3.4,3,5.8,3 c3.8,0,6.8-3,6.8-6.6c0-1.5,0.1-1.9-0.8-3l16.2-16l3.1-0.8l3.6-3.6l0.8-3.5l10.2-10.2l0,0L165.4,168z M130.8,199.3 c-0.2-0.1-4-0.1-5.4-0.1c-1.6,0-4.9,0-4.9,0l-19.7-19.1l3.8-3.6c2.1-2.1,0.1-4.8,0.1-4.8l17.9-17.3l5.4,0l17.2,17.3 c0,0-2,2.1,1.4,5.4l0,0l3,2.9L130.8,199.3z"
        />
      </g>
      <g id="Pitchers_mound">
        <ellipse
          transform="matrix(0.7071 -0.7071 0.7071 0.7071 -88.7986 140.5403)"
          className="st8"
          cx="125.2"
          cy="177.5"
          rx="3.8"
          ry="3.8"
        />
      </g>
      <g id="Bases_and_chalk_lines-ALL">
        <g>
          <path className="st9" d="M15.6,93.6" />
          <path className="st9" d="M125.2,204.3" />
          <path className="st9" d="M232,94.3" />
        </g>
        <rect x="123.2" y="176.7" className="st10" width="4" height="1.6" />
        <rect
          x="98.4"
          y="174.6"
          transform="matrix(0.7073 -0.7069 0.7069 0.7073 -95.2212 122.1912)"
          className="st10"
          width="3"
          height="3"
        />
  
        <rect
          x="148.9"
          y="174.6"
          transform="matrix(0.7073 -0.7069 0.7069 0.7073 -80.4458 157.8735)"
          className="st10"
          width="3"
          height="3"
        />
        <rect
          x="123.7"
          y="149.3"
          transform="matrix(0.707 -0.7073 0.7073 0.707 -70.0001 132.7314)"
          className="st10"
          width="3"
          height="3"
        />
        <polygon
          className="st10"
          points="126.7,201.9 125.2,203.4 123.7,201.9 123.7,200.4 126.7,200.4 	"
        />
        <polyline className="st11" points="234.6,94.3 125.2,203.5 17.9,96.2 	" />
      </g>
    </g>
  )`,
  tooltipContent: `d => (
    <div className="tooltip-content">
      <p>Date: {d.game_date}</p>
      <p>Distance: {d.distance}</p>
      <p>Velocity: {d.exit_velocity}</p>
    </div>
  )`,
  annotations: `[
    {
      type: "enclose",
      dy: -120,
      dx: -1,
      note: {
        padding: 10,
        align: "middle",
        lineType: null,
        label: "Shortest distance home runs."
      },
      connector: { end: "dot" },
      coordinates: [{ bx: 235, by: 250 }, { bx: 235, by: 275 }]
    }
  ]`
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
        type={XYFrame}
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
