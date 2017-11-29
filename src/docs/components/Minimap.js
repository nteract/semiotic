import React from "react";
import DocumentComponent from "../layout/DocumentComponent";
import MinimapRaw from "./MinimapRaw";
import { MenuItem } from "material-ui/Menu";
import Input, { InputLabel } from "material-ui/Input";
import { FormControl, FormHelperText } from "material-ui/Form";
import Select from "material-ui/Select";

const components = [];

components.push({
  name: "Minimap Basics"
});

export default class MinimapBasics extends React.Component {
  constructor(props) {
    super(props);
    this.state = { resetExtent: [0, 40], selectedExtent: [0, 40] };
    this.randomizeExtent = this.randomizeExtent.bind(this);
    this.changeExtent = this.changeExtent.bind(this);
  }
  randomizeExtent() {
    const randomStart = parseInt(Math.random() * 25);
    this.setState({ resetExtent: [randomStart, randomStart + 15] });
  }

  changeExtent(e) {
    this.setState({ selectedExtent: [Math.floor(e[0]), Math.ceil(e[1])] });
  }

  render() {
    const examples = [];

    const buttons = [
      <button key="buon" onClick={this.randomizeExtent}>
        Random Extent
      </button>
    ];

    examples.push({
      name: "Basic",
      demo: MinimapRaw(
        this.changeExtent,
        this.state.resetExtent,
        this.state.selectedExtent
      ),
      source: `import { MinimapXYFrame } from "../../components";
import { curveMonotoneX } from "d3-shape";

const dataSeeds = [20, 10, -10, -20];
const colors = [
  "4d430c",
  "#d38779",
  "#b3331d",
  "#00a2ce",
  "#007190",
  "#b6a756"
];

function generatePoints(start, number) {
  const arrayOfPoints = [];
  let currentValue = start;
  for (let x = 0; x <= number; x++) {
    arrayOfPoints.push({ step: x, value: currentValue });
    currentValue += Math.random() * 10 - 5;
  }
  return arrayOfPoints;
}

const generatedData = dataSeeds.map((s, i) => {
  return {
    label: colors[i],
    coordinates: generatePoints(s, 40)
  };
});

const lineStyle = {
  fill: "#007190",
  stroke: "#007190",
  strokeWidth: 1
};

const xyFrameSettings = {
  lines: generatedData,
  lineType: { type: "line", interpolator: curveMonotoneX },
  xAccessor: "step",
  yAccessor: "value",
  lineStyle: d => ({ fill: d.label, stroke: d.label, fillOpacity: 0.75 }),
  axes: [
    { orient: "left" },
    {
      orient: "bottom",
      ticks: 6
    }
  ]
};
//In your Component where you're creating the MinimapXYFrame
  constructor(props) {
    super(props);
    this.state = { resetExtent: [0, 40], selectedExtent: [0, 40] };
    this.randomizeExtent = this.randomizeExtent.bind(this);
    this.changeExtent = this.changeExtent.bind(this);
  }
  randomizeExtent() {
    const randomStart = parseInt(Math.random() * 25);
    this.setState({ resetExtent: [randomStart, randomStart + 15] });
  }

  changeExtent(e) {
    this.setState({ selectedExtent: [Math.floor(e[0]), Math.ceil(e[1])] });
  }
//
<MinimapXYFrame
    size={[700, 700]}
    {...xyFrameSettings}
    xExtent={selectedExtent}
    matte={true}
    margin={{ left: 50, top: 10, bottom: 50, right: 20 }}
    minimap={{
      margin: { top: 20, bottom: 35, left: 20, right: 20 },
      ...xyFrameSettings,
      brushEnd: brushFunction,
      yBrushable: false,
      xBrushExtent: extent,
      size: [700, 150]
    }}
  />
  `
    });

    return (
      <DocumentComponent
        name="Minimap"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          MinimapXYFrame allows you to conveniently instantiate a brushable
          region, typically referred to as a minimap, to let users brush to zoom
          in to a particular extent. Here's it's used to allow users to zoom to
          a particular part of a line chart. The minimap property in
          MinimapXYFrame takes an object with settings almost identical to
          XYFrame except it also includes properties for brush behavior and
          extent like brushEnd, yBrushable, xBrushable, xBrushExtent and the
          functions for brush, brushstart and brushEnd.
        </p>
        <p>
          You can programmatically change brush extent by sending a new
          xBrushExtent.
        </p>
      </DocumentComponent>
    );
  }
}

MinimapBasics.title = "Minimap Basics";
