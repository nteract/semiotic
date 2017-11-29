import React from "react";
import DocumentComponent from "../layout/DocumentComponent";
import SwarmBrushRaw from "./SwarmBrushRaw";

const components = [];

components.push({
  name: "Beeswarm Plot Brush"
});

const data = Array.from(Array(200), () => ({
  value: parseInt(Math.random() * 100)
}));

export default class SwarmBrush extends React.Component {
  constructor(props) {
    super(props);
    this.state = { selectedDataCount: 200, resetExtent: [0, 100] };
    this.brushEnd = this.brushEnd.bind(this);
    this.randomizeExtent = this.randomizeExtent.bind(this);
  }

  randomizeExtent() {
    const randomStart = parseInt(Math.random() * 50);
    this.setState({ resetExtent: [randomStart, randomStart + 50] });
  }

  brushEnd(e) {
    this.setState({
      selectedDataCount: data.filter(d => d.value >= e[0] && d.value <= e[1])
        .length
    });
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
      demo: (
        <div>
          {SwarmBrushRaw(data, this.brushEnd, this.state.resetExtent)}
          <h2>{this.state.selectedDataCount} Selected Points</h2>
        </div>
      ),
      source: `
    brushEnd(e) {
        this.setState({ selectedDataCount: data.filter(d => d.value >= e[0] && d.value <= e[1]).length })
    }

    <div>
    <ORFrame
        size={[ 700,200 ]}
        data={data}
        rAccessor={d => d.value}
        oAccessor={() => "singleColumn"}
        style={(d,i) => ({ fill: "#007190", stroke: "white", strokeWidth: 1 })}
        type={"swarm"}
        summaryType={"violin"}
        summaryStyle={(d,i) => ({ fill: "#007190", stroke: "white", strokeWidth: 1 })}
        projection={"horizontal"}
        axis={{ orient: 'left' }}
        rExtent={[0, 100]}
        margin={{ left: 20, top: 0, bottom: 50, right: 20 }}
        oPadding={0}
        interaction={{ columnsBrush: true, extent: { singleColumn: [ 0,100 ] }, end: event }}
    />
    <h2>{this.state.selectedDataCount} Selected Points</h2>
    </div>
      `
    });

    return (
      <DocumentComponent
        name="Swarm Brush"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          The parallel coordinates example is a very complex use of brushes and
          the minimap functionality is pretty magical, so here's an example of
          how to use an ORFrame's interaction property to define a brush so that
          you can select a few values in a beeswarm plot.
        </p>
      </DocumentComponent>
    );
  }
}

SwarmBrush.title = "Swarm Brush";
