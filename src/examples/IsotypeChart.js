import React from "react"
import DocumentFrame from "../DocumentFrame"
import { OrdinalFrame } from "semiotic"
import theme from "../theme"
import MarkdownText from "../MarkdownText"
import AnnotationCalloutElbow from "react-annotation/lib/Types/AnnotationCalloutElbow"

// const ROOT = process.env.PUBLIC_URL;

const vizzers = [
  { type: "journalist", writeviz: 1, number: 9 },
  { type: "journalist", writeviz: 0.95, number: 9 },
  { type: "journalist", writeviz: 0.9, number: 8 },
  { type: "journalist", writeviz: 0.85, number: 8 },
  { type: "journalist", writeviz: 0.8, number: 8 },
  { type: "journalist", writeviz: 0.75, number: 7 },
  { type: "journalist", writeviz: 0.7, number: 7 },
  { type: "journalist", writeviz: 0.65, number: 6 },
  { type: "journalist", writeviz: 0.6, number: 5 },
  { type: "journalist", writeviz: 0.55, number: 5 },
  { type: "journalist", writeviz: 0.45, number: 4 },
  { type: "journalist", writeviz: 0.4, number: 3 },
  { type: "journalist", writeviz: 0.35, number: 3 },
  { type: "journalist", writeviz: 0.3, number: 2 },
  { type: "journalist", writeviz: 0.25, number: 1 },
  { type: "viz", writeviz: 0.25, number: 1 },
  { type: "journalist", writeviz: 0.2, number: 2 },
  { type: "journalist", writeviz: 0.15, number: 2 },
  { type: "journalist", writeviz: 0.1, number: 2 },
  { type: "journalist", writeviz: 0.05, number: 1 },
  { type: "journalist", writeviz: 0, number: 1 },
  { type: "none", writeviz: -0.05, number: 0 },
  { type: "journalist", writeviz: -0.1, number: 1 },
  { type: "none", writeviz: -0.15, number: 0 },
  { type: "none", writeviz: -0.2, number: 0 },
  { type: "viz", writeviz: -0.25, number: 1 },
  { type: "none", writeviz: -0.3, number: 0 },
  { type: "viz", writeviz: -0.35, number: 1 },
  { type: "journalist", writeviz: -0.4, number: 1 },
  { type: "journalist", writeviz: -0.45, number: 1 },
  { type: "none", writeviz: -0.5, number: 0 },
  { type: "viz", writeviz: -0.55, number: 1 },
  { type: "none", writeviz: -0.6, number: 0 },
  { type: "viz", writeviz: -0.65, number: 1 },
  { type: "viz", writeviz: -0.7, number: 1 },
  { type: "viz", writeviz: -0.75, number: 2 },
  { type: "viz", writeviz: -0.8, number: 2 },
  { type: "viz", writeviz: -0.85, number: 2 },
  { type: "viz", writeviz: -0.9, number: 2 },
  { type: "viz", writeviz: -0.95, number: 1 }
]

const rosto =
  "M 9.1224266,3.3361224 C 8.2810363,3.2943324 7.4365263,3.4028924 6.6380563,3.6876824 4.1694463,3.6296224 1.9665163,5.3650424 0.91344627,7.5119024 -1.3227637,11.795842 2.5514463,17.764562 8.1907863,16.545112 11.620097,16.132302 15.547317,14.037072 16.173217,10.334172 16.380807,6.5289124 12.768497,3.5172224 9.1224266,3.3361224 Z M 9.3528966,19.855652 C 8.8890366,19.840732 8.4082066,19.917662 7.9173563,20.105652 5.1205063,21.551132 3.7183663,24.679342 2.7943063,27.543152 2.3207563,29.861872 0.86862627,32.037502 1.3646163,34.488462 1.6304963,37.604102 8.0443063,38.953312 8.0443063,38.953312 8.0443063,38.953312 14.670637,39.650602 16.495477,36.334172 17.161197,31.945522 16.344137,27.232262 14.009147,23.424012 13.065617,21.690222 11.362967,19.920312 9.3528966,19.855652 Z"

const iconHash = {
  viz: rosto,
  journalist: rosto,
  none: "M0,0"
}
const colorHash = {
  journalist: theme[2],
  viz: theme[1]
}

const frameProps = {
  size: [700, 368],
  data: vizzers,
  type: {
    type: "bar",
    icon: d => iconHash[d.type],
    iconPadding: 2,
    resize: "fixed"
  },
  projection: "vertical",
  oAccessor: "writeviz",
  sortO: (a, b) => parseFloat(a) - parseFloat(b),
  rAccessor: "number",
  style: d => ({
    fill: colorHash[d.type],
    stroke: colorHash[d.type],
    fillOpacity: 1,
    strokeWidth: 1.5
  }),
  margin: { top: 60, bottom: 70, left: 10, right: 80 },
  oPadding: 2,
  annotations: [
    {
      writeviz: 0.25,
      number: 2,
      dx: -0.01,
      dy: -50,
      color: theme[1],
      type: AnnotationCalloutElbow,
      note: { title: "Data viz peep who discovered her love for writing" }
    }
  ],
  hoverAnnotation: true,
  renderMode: "sketchy",
  foregroundGraphics: (
    <g>
      <g transform="translate(20,165)">
        <rect fill={theme[1]} x={-10} y={-10} width={93} height={55} />
        <text fontWeight="700" fill="white" x={5} y={15}>
          DATA VIZ
        </text>
        <text fontWeight="700" fill="white" x={5} y={30}>
          EXPERTS
        </text>
      </g>
      <g transform="translate(505,10)">
        <rect fill={theme[2]} x={-10} y={-10} width={123} height={40} />
        <text fontWeight="700" fill="white" x={5} y={15}>
          JOURNALISTS
        </text>
      </g>
      <g transform="translate(0,300)">
        <line strokeWidth={2} stroke={"darkgray"} x1={10} x2={620} />
      </g>
      <g fill="darkgray" transform="translate(5,305)">
        <text fontWeight="700" x={5} y={15}>
          CREATE MORE
        </text>
        <text fontWeight="700" x={5} y={30}>
          DATA VIZ EACH DAY
        </text>
      </g>
      <g fill="darkgray" textAnchor="end" transform="translate(615,305)">
        <text fontWeight="700" x={5} y={15}>
          WRITE MORE
        </text>
        <text fontWeight="700" x={5} y={30}>
          EACH DAY
        </text>
      </g>
    </g>
  )
}

const overrideProps = {
  type: `{
    type: "bar",
    icon: d => iconHash[d.type],
    iconPadding: 2,
    resize: "fixed"
  }`,
  foregroundGraphics: `(
    <g>
      <g transform="translate(20,165)">
        <rect fill={theme[1]} x={-10} y={-10} width={93} height={55} />
        <text fontWeight="700" fill="white" x={5} y={15}>
          DATA VIZ
        </text>
        <text fontWeight="700" fill="white" x={5} y={30}>
          EXPERTS
        </text>
      </g>
      <g transform="translate(505,10)">
        <rect fill={theme[2]} x={-10} y={-10} width={123} height={40} />
        <text fontWeight="700" fill="white" x={5} y={15}>
          JOURNALISTS
        </text>
      </g>
      <g transform="translate(0,300)">
        <line strokeWidth={2} stroke={"darkgray"} x1={10} x2={620} />
      </g>
      <g fill="darkgray" transform="translate(5,305)">
        <text fontWeight="700" x={5} y={15}>
          CREATE MORE
        </text>
        <text fontWeight="700" x={5} y={30}>
          DATA VIZ EACH DAY
        </text>
      </g>
      <g fill="darkgray" textAnchor="end" transform="translate(615,305)">
        <text fontWeight="700" x={5} y={15}>
          WRITE MORE
        </text>
        <text fontWeight="700" x={5} y={30}>
          EACH DAY
        </text>
      </g>
    </g>
  )`,
  annotations: `[
    {
      writeviz: 0.25,
      number: 2,
      dx: -0.01,
      dy: -50,
      color: theme[1],
      type: AnnotationCalloutElbow,
      note: { title: "Data viz peep who discovered her love for writing" }
    }
  ]`
}

export default function SwarmPlot() {
  return (
    <div>
      <MarkdownText
        text={`

Vertical ISOTYPE chart. Currently, there's no sizing mechanism that maintains whole shapes, which improves ISOTYPE charts, so the designer is forced to tweak the size and margins to ensure whole shapes like this one. As demonstrated here, renderMode is honored by icon shapes.

Based on a [beautiful icon chart by Lisa Charlotte Rost](https://lisacharlotterost.github.io/2017/10/24/Frustrating-Data-Vis/). I called her little icons Rostos in her honor.
`}
      />
      <DocumentFrame
        frameProps={frameProps}
        overrideProps={overrideProps}
        pre={`import AnnotationCalloutElbow from "react-annotation/lib/Types/AnnotationCalloutElbow"
const colorHash = {
  journalist: theme[2],
  viz: theme[1]
}
const iconHash = ${JSON.stringify(iconHash)}`}
        type={OrdinalFrame}
        useExpanded
      />
    </div>
  )
}
