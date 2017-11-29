import React from "react";
import DocumentComponent from "../layout/DocumentComponent";
import DivergingStackedBarRaw from "./DivergingStackedBarRaw";
import { answers } from "../sampledata/questions";

const components = [];

components.push({
  name: "Diverging Stacked Bar Chart"
});

export default class DivergingStackedBar extends React.Component {
  render() {
    const examples = [];
    examples.push({
      name: "Basic",
      demo: DivergingStackedBarRaw,
      source: `const answers = const answers = [
  {"question":"Question 1", "type":"disagree", "color":"#d38779", "value":-294, "percent":-0.09},
  {"question":"Question 1", "type":"stronglydisagree", "color":"#b3331d", "value":-24, "percent":-0.007},
  {"question":"Question 1", "type":"agree", "color":"#00a2ce", "value":1927, "percent":0.59}
]
import { ORFrame } from 'semiotic'

export default <ORFrame
    size={[700, 500]}
    data={answers}
    type="bar"
    projection="horizontal"
    oAccessor={"question"}
    rAccessor={"percent"}
    style={d => ({ fill: d.color })}
    margin={{ top: 30, bottom: 0, left: 80, right: 50 }}
    oPadding={20}
    oLabel={(d, column, i) => (
      <g>
        <rect
          width={620}
          height={50}
          y={-25}
          style={{
            fill: i % 2 === 0 ? "grey" : "white",
            stroke: "none",
            opacity: 0.1
          }}
        />
        <text x={-5} y={5} textAnchor="end">
          {d}
        </text>
      </g>
    )}
    pixelColumnWidth={50}
    axis={{
      orient: "top",
      tickValues: [-0.3, -0.15, 0, 0.2, 0.4, 0.6, 0.8, 1]
    }}
  />
/>`
    });

    return (
      <DocumentComponent
        name="Diverging Stacked Bar"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>
          Diverging bar charts are made via negative piece value. They will also
          naturally make negative stacked bar charts.
        </p>
      </DocumentComponent>
    );
  }
}

DivergingStackedBar.title = "Diverging Stacked Bar";
