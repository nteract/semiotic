import React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import BaseballMapRaw from "./BaseballMapRaw"
import Mark from "../../components/Mark/Mark"
import { scaleTime } from "d3-scale"

const components = []
const modes = {
  basic: {
    summaries: undefined,
    annotations: [
      {
        type: "enclose",
        label: "Shortest distance home runs.",
        dy: -120,
        dx: -1,
        coordinates: [
          { bx: 235, by: 250 },
          { bx: 235, by: 275 }
        ]
      }
    ]
  },
  trendPoly: {
    summaryType: { type: "trendline", regressionType: "polynomial" },
    summaryStyle: { stroke: "red", fill: "none", strokeWidth: 2 }
  },
  trendLinear: {
    summaryType: { type: "trendline", regressionType: "linear" },
    summaryStyle: { stroke: "red", fill: "none", strokeWidth: 2 }
  },
  basic: {
    summaries: undefined,
    annotations: [
      {
        type: "enclose",
        label: "Shortest distance home runs.",
        dy: -120,
        dx: -1,
        coordinates: [
          { bx: 235, by: 250 },
          { bx: 235, by: 275 }
        ]
      }
    ]
  },
  sketchy: {
    customPointMark: () => <Mark markType="circle" r={6} />,
    pointRenderMode: "sketchy",
    summaries: undefined
  },
  contourplot: {
    customPointMark: () => <Mark markType="circle" r={2} />,
    pointStyle: { fill: "black" },
    summaryStyle: () => ({
      stroke: "none",
      fill: "#b3331d",
      opacity: 0.25
    }),
    summaryType: "contour",
    areaRenderMode: "sketchy"
  },
  scatterplot: {
    xAccessor: (d) => d.exit_velocity,
    yAccessor: (d) => d.distance,
    xExtent: undefined,
    yExtent: undefined,
    axes: [
      { orient: "left", label: "Distance" },
      {
        orient: "top",
        label: "Exit Velocity"
      }
    ],
    margin: { left: 60, top: 50, bottom: 25, right: 25 },
    backgroundGraphics: undefined,
    summaries: undefined
  },
  overtime: {
    xScaleType: scaleTime(),
    xAccessor: (d) => new Date(d.game_date),
    yAccessor: (d) => d.distance,
    customPointMark: () => <Mark markType="circle" r={4} />,
    xExtent: undefined,
    yExtent: undefined,
    axes: [
      { orient: "left", label: "Distance" },
      {
        orient: "top",
        ticks: 8,
        tickFormat: (d) => `${d.getMonth()}-${d.getDate()}`
      }
    ],
    margin: { left: 60, top: 25, bottom: 25, right: 25 },
    backgroundGraphics: undefined,
    summaries: undefined
  }
}

components.push({
  name: "BaseballMap"
})

export default class BaseballMapDocs extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      mode: "basic"
    }
  }

  render() {
    const modeOptions = [
      "basic",
      "sketchy",
      "contourplot",
      "scatterplot",
      "overtime",
      "trendPoly",
      "trendLinear"
    ].map((d) => (
      <option key={`mode-option-${d}`} label={d} value={d}>
        {d}
      </option>
    ))

    const buttons = [
      <form key="button-1-0-0">
        <label htmlFor="mode-input">Mode</label>
        <select
          value={this.state.mode}
          onChange={(e) => this.setState({ mode: e.target.value })}
        >
          {modeOptions}
        </select>
      </form>
    ]

    const examples = []
    examples.push({
      name: "Basic",
      demo: BaseballMapRaw(modes[this.state.mode]),
      source: `
      const mode = ${JSON.stringify(modes[this.state.mode])}

            <XYFrame
    size={[500, 500]}
    points={data}
    summaries={[{ label: "stanton", coordinates: data }]}
    xAccessor={d => d.bx}
    yAccessor={d => d.by}
    yExtent={[-50]}
    customPointMark={d => <Mark markType="circle" r={5} />}
    pointStyle={d => ({
      stroke: "black",
      fill: velocityScale(d.exit_velocity)
    })}
    hoverAnnotation={true}
    tooltipContent={d => (
      <div className="tooltip-content">
        <p>Date: {d.game_date}</p>
        <p>Distance: {d.distance}</p>
        <p>Velocity: {d.exit_velocity}</p>
      </div>
    )}
    margin={{ left: 25, right: 25, top: 25, bottom: 25 }}
    backgroundGraphics={fieldGraphic}

                {...mode}
             }}
            />
      `
    })

    return (
      <DocumentComponent
        name="Home Run Map"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          Giancarlo Stanton's home runs shown with his park outline based on{" "}
          <a href="https://github.com/darenwillman/baseball">
            Daren Willman's data and sports visualization work.
          </a>
        </p>
        <p>
          Switch modes to see how different XYFrame settings could display the
          data differently. Another approach could be to plot the park layout in
          actual coordinates and pass it to the summaries function instead of
          using backgroundGraphics.
        </p>
      </DocumentComponent>
    )
  }
}

BaseballMapDocs.title = "Home Run Map"
