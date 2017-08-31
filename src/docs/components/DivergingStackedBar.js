import React from "react";
import DocumentComponent from "../layout/DocumentComponent";
import DivergingStackedBarRaw from "./DivergingStackedBarRaw";

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
      source: `
import { answers } from '../sampledata/questions'
import { ORFrame } from "../../components"

export default <ORFrame
                size={[ 700,500 ]}
                data={answers}
                type="bar"
                projection="horizontal"
                oAccessor={"question"}
                rAccessor={"percent"}
                style={d => ({ fill: d.color })}
                margin={{ top: 30, bottom: 0, left: 80, right: 50 }}
                oPadding={20}
                oLabel={true}
                axis={{ orient: "top", tickValues: [ -0.3, -0.15, 0, 0.2, 0.4, 0.6, 0.8, 1]}}
            />
      `
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
