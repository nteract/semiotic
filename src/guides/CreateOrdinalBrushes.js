import React from "react";
import MarkdownText from "../MarkdownText";
import DocumentFrame from "../DocumentFrame";
import { OrdinalFrame } from "semiotic";
import theme from "../theme";

const data = Array.from(Array(200), () => ({
  value: parseInt(Math.random() * 100)
}));
const orFrameSettings = {
  size: [700, 200],
  rAccessor: d => d.value,
  oAccessor: () => "singleColumn",
  style: () => ({ fill: theme[0], stroke: "white", strokeWidth: 1 }),
  type: "swarm",
  summaryType: "violin",
  summaryStyle: () => ({
    fill: theme[0],
    fillOpacity: 0.3,
    stroke: "white",
    strokeWidth: 1
  }),
  projection: "horizontal",
  axis: { orient: "left" },
  rExtent: [0, 100],
  margin: { left: 20, top: 0, bottom: 50, right: 20 },
  oPadding: 0,
  data
};

export default class CreateXYBrushes extends React.Component {
  constructor(props) {
    super(props);
    // this.state = { extent: [0, 40], selectedExtent: [0, 40] };
    this.state = { selectedDataCount: 200, extent: [0, 100] };
    // this.randomizeExtent = this.randomizeExtent.bind(this);
    this.changeExtent = this.changeExtent.bind(this);
  }

  changeExtent(e) {
    this.setState({
      selectedDataCount: data.filter(d => d.value >= e[0] && d.value <= e[1])
        .length
    });
  }
  render() {
    const frameProps = {
      ...orFrameSettings,
      interaction: {
        columnsBrush: true,
        extent: { singleColumn: this.state.extent },
        end: this.changeExtent
      }
    };
    return (
      <div>
        <MarkdownText
          text={`
Test

    `}
        />
        <DocumentFrame
          frameProps={frameProps}
          type={OrdinalFrame}
          // overrideProps={overrideProps}
          useExpanded
        />
      </div>
    );
  }
}
