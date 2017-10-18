import React from "react";
import DocumentComponent from "../layout/DocumentComponent";
import BaseballMapRaw from "./BaseballMapRaw";
import Select from "material-ui/Select";
import { MenuItem } from "material-ui/Menu";
import { Mark } from "../../components";
import { scaleTime } from "d3-scale";
import Input, { InputLabel } from "material-ui/Input";
import { FormControl, FormHelperText } from "material-ui/Form";

const components = [];
const modes = {
  basic: {
    areas: undefined,
    annotations: [
      {
        type: "enclose",
        label: "Shortest distance home runs.",
        dy: -120,
        dx: -1,
        coordinates: [{ bx: 235, by: 250 }, { bx: 235, by: 275 }]
      }
    ]
  },
  sketchy: {
    customPointMark: d => <Mark markType="circle" r={6} />,
    pointRenderMode: "sketchy",
    areas: undefined
  },
  contourplot: {
    customPointMark: d => <Mark markType="circle" r={2} />,
    pointStyle: { fill: "black" },
    areaStyle: d => ({
      stroke: "none",
      fill: "#b3331d",
      opacity: 0.25
    }),
    areaType: "contour",
    areaRenderMode: "sketchy"
  },
  scatterplot: {
    xAccessor: d => d.exit_velocity,
    yAccessor: d => d.distance,
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
    areas: undefined
  },
  overtime: {
    xScaleType: scaleTime(),
    xAccessor: d => new Date(d.game_date),
    yAccessor: d => d.distance,
    customPointMark: d => <Mark markType="circle" r={4} />,
    xExtent: undefined,
    yExtent: undefined,
    axes: [
      { orient: "left", label: "Distance" },
      {
        orient: "top",
        ticks: 8,
        tickFormat: d => `${d.getMonth()}-${d.getDate()}`
      }
    ],
    margin: { left: 60, top: 25, bottom: 25, right: 25 },
    backgroundGraphics: undefined,
    areas: undefined
  }
};

components.push({
  name: "BaseballMap"
});

export default class BaseballMapDocs extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      mode: "basic"
    };
  }

  render() {
    const modeOptions = [
      "basic",
      "sketchy",
      "contourplot",
      "scatterplot",
      "overtime"
    ].map(d => (
      <MenuItem key={"mode-option-" + d} label={d} value={d}>
        {d}
      </MenuItem>
    ));

    const buttons = [
      <FormControl key="button-1-0-0">
        <InputLabel htmlFor="mode-input">Mode</InputLabel>
        <Select
          value={this.state.mode}
          onChange={e => this.setState({ mode: e.target.value })}
        >
          {modeOptions}
        </Select>
      </FormControl>
    ];

    const examples = [];
    examples.push({
      name: "Basic",
      demo: BaseballMapRaw(modes[this.state.mode]),
      source: `
      const mode = ${JSON.stringify(modes[this.state.mode])}

            <XYFrame
    size={[500, 500]}
    points={data}
    areas={[{ label: "stanton", coordinates: data }]}
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
    });

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
          actual coordinates and pass it to the areas function instead of using
          backgroundGraphics.
        </p>
      </DocumentComponent>
    );
  }
}

BaseballMapDocs.title = "Home Run Map";
