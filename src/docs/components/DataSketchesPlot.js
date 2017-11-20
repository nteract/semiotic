import React from "react";
import DocumentComponent from "../layout/DocumentComponent";
import DataSketchesPlotRaw from "./DataSketchesPlotRaw";

const components = [];

components.push({
  name: "DataSketchesPlot"
});

export default class DataSketchesPlotDocs extends React.Component {
  render() {
    const examples = [];
    examples.push({
      name: "Basic",
      demo: DataSketchesPlotRaw,
      source: `
      `
    });

    return (
      <DocumentComponent
        name="Dot Plot"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>
          <a target="_blank" href="http://www.datasketch.es/">
            Data Sketches by Shirley Wu & Nadieh Bremer
          </a>.
        </p>
      </DocumentComponent>
    );
  }
}

DataSketchesPlotDocs.title = "Dot Plot";
