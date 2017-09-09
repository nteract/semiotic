import React from "react";
import DocumentComponent from "../layout/DocumentComponent";
import ViolinRaw from "./ViolinRaw";

const components = [];
// Add your component proptype data here
// multiple component proptype documentation supported

components.push({
  name: "Violin Chart"
});

export default class ViolinPlot extends React.Component {
  render() {
    const examples = [];
    examples.push({
      name: "Basic",
      demo: ViolinRaw,
      source: `
const summaryChart = {
    rAccessor: d => d.stepValue,
    oAccessor: d => d.stepName,
    summaryStyle: () => ({ fill: "red", fillOpacity: 0.5, stroke: "red", strokeOpacity: 0.75 }),
    style: () => ({ fill: "red", fillOpacity: 0.5, stroke: "red", strokeOpacity: 0.75 }),
    data: orframe_data,
    type: "none",
    summaryType: "violin",
    axis: { orient: 'left', tickFormat: degreeDiffFormat, label: "Monthly temperature" },
    oLabel: d => <text transform="rotate(45) translate(-20,0)">{d}</text>,
    margin: { left: 60, top: 35, bottom: 70, right: 30 },
    oPadding: 20
}
const axis = { orient: 'left', tickFormat: d => d, label: {
    name: "axis label",
    position: { anchor: "middle" },
    locationDistance: 40
} }

<ORFrame
    size={[ 700,500 ]}
    axis={axis}
    { ...summaryChart }
/>

      `
    });

    return (
      <DocumentComponent
        name="Violin"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>The Violin Plot.</p>
      </DocumentComponent>
    );
  }
}

ViolinPlot.title = "Violin";
