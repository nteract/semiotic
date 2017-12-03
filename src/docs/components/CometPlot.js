import React from "react";
import DocumentComponent from "../layout/DocumentComponent";
import CometPlotRaw from "./CometPlotRaw";

const components = [];

components.push({
  name: "Comet Plot"
});

export default class CometPlotDocs extends React.Component {
  render() {
    const examples = [];
    examples.push({
      name: "Basic",
      demo: CometPlotRaw,
      source: ``
    });

    return (
      <DocumentComponent
        name="Comet Plot Plot"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>From Zan Armstrong</p>
      </DocumentComponent>
    );
  }
}

CometPlotDocs.title = "Comet Plot";
