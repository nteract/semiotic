import React from "react";
import DocumentComponent from "../layout/DocumentComponent";
import LineBrushRaw from "./LineBrushRaw";
import { data } from "../sampledata/apple_stock";

data.forEach(d => {
  d.date = new Date(d.date);
});
const components = [];

components.push({
  name: "Line Chart Brush"
});

export default class LineBrush extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedDataCountStart: 200,
      selectedDataCountDuring: 200,
      selectedDataCountEnd: 200,
      resetExtent: [new Date("1/2/1998"), new Date("1/2/2003")]
    };
    this.brushStart = this.brushStart.bind(this);
    this.brushDuring = this.brushDuring.bind(this);
    this.brushEnd = this.brushEnd.bind(this);
    this.randomizeExtent = this.randomizeExtent.bind(this);
  }

  randomizeExtent() {
    const randomYear = parseInt(Math.random() * 5) + 1997;
    this.setState({
      resetExtent: [
        new Date(`1/2/${randomYear}`),
        new Date(`1/2/${randomYear + 3}`)
      ]
    });
  }
  brushStart(e) {
    this.setState({
      selectedDataCountStart: data.filter(d => d.date >= e[0] && d.date <= e[1])
        .length
    });
  }
  brushDuring(e) {
    this.setState({
      selectedDataCountDuring: data.filter(
        d => d.date >= e[0] && d.date <= e[1]
      ).length
    });
  }
  brushEnd(e) {
    this.setState({
      selectedDataCountEnd: data.filter(d => d.date >= e[0] && d.date <= e[1])
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
          {LineBrushRaw(
            data,
            this.brushStart,
            this.brushDuring,
            this.brushEnd,
            this.state.resetExtent
          )}
          <h2>
            {this.state.selectedDataCountStart} Selected Points (Start Event)
          </h2>
          <h2>
            {this.state.selectedDataCountDuring} Selected Points (During Event)
          </h2>
          <h2>{this.state.selectedDataCountEnd} Selected Points (End Event)</h2>
        </div>
      ),
      source: `import React from "react";
import { XYFrame } from "../../components";
import { scaleTime } from "d3-scale";

const chartScale = scaleTime();
const lineStyle = {
  fill: "#007190",
  stroke: "#007190",
  strokeWidth: 1
};

      data = [
  {
    date: "1/2/2003",
    close: 14.8
  },
  {
    date: "12/31/2002",
    close: 14.32
  },
  {
    date: "12/30/2002",
    close: 14.07
  }...

data.forEach(d => {
  d.date = new Date(d.date);
});

  export default class LineBrush extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedDataCountStart: 200,
      selectedDataCountDuring: 200,
      selectedDataCountEnd: 200
    };
    this.brushStart = this.brushStart.bind(this);
    this.brushDuring = this.brushDuring.bind(this);
    this.brushEnd = this.brushEnd.bind(this);
  }

  brushStart(e) {
    this.setState({
      selectedDataCountStart: data.filter(d => d.date >= e[0] && d.date <= e[1])
        .length
    });
  }
  brushDuring(e) {
    this.setState({
      selectedDataCountDuring: data.filter(
        d => d.date >= e[0] && d.date <= e[1]
      ).length
    });
  }
  brushEnd(e) {
    this.setState({
      selectedDataCountEnd: data.filter(d => d.date >= e[0] && d.date <= e[1])
        .length
    });
  }

  render() {
    return <XYFrame
        size={[700, 200]}
        lines={[{ label: "Apple Stock", coordinates: data }]}
        xAccessor={d => d.date}
        yAccessor="close"
        xScaleType={chartScale}
        lineStyle={lineStyle}
        axes={[
          { orient: "left" },
          {
            orient: "bottom",
            ticks: 6,
            tickFormat: d => d.getFullYear()
          }
        ]}
        margin={{ left: 40, top: 0, bottom: 50, right: 20 }}
        interaction={{
          start: this.brushStart,
          during: this.brushDuring,
          end: this.brushEnd,
          brush: "xBrush",
          extent: [new Date("1/2/1997"), new Date("1/2/2003")]
        }}
      />
   };
}
  `
    });

    return (
      <DocumentComponent
        name="LineChart Brush"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          How to use the interactivity property of XYFrame to wire up a simple
          brush over your time series data.
        </p>
      </DocumentComponent>
    );
  }
}

LineBrush.title = "Line Chart Brush";
