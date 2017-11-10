import React from "react";
import DocumentComponent from "../layout/DocumentComponent";
import NegativeStackedRaw from "./NegativeStackedRaw";

const components = [];

components.push({
  name: "Negative Stacked Chart"
});

export default class NegativeStacked extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    const examples = [];

    const buttons = [];

    examples.push({
      name: "Basic",
      demo: NegativeStackedRaw,
      source: `
  `
    });

    return (
      <DocumentComponent
        name="Negative Stacked Chart"
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

NegativeStacked.title = "Negative Stacked Chart";
