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
    oPadding: 10
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
    margin={{ top: 75, bottom: 50, left: 50, right: 50 }}
    dynamicColumnWidth={d => max(d.map(p => p.stepValue))}
    annotations={[
      {
        type: "category",
        categories: ["January", "February", "March"],
        label: "Q1",
        position: "top",
        offset: 15,
        depth: 10,
        padding: 0
      },
      {
        type: "category",
        categories: ["April", "May", "June"],
        label: "Q2",
        position: "top",
        offset: 15,
        depth: 10,
        padding: 0
      },
      {
        type: "category",
        categories: ["July", "August", "September"],
        label: "Q3",
        position: "top",
        offset: 15,
        depth: 10,
        padding: 0
      },
      {
        type: "category",
        categories: ["October", "November", "December"],
        label: "Q4",
        position: "top",
        offset: 15,
        depth: 10,
        padding: 0
      },
      {
        type: "category",
        categories: [
          "July",
          "August",
          "September",
          "October",
          "November",
          "December"
        ],
        label: "Latter Half",
        position: "top",
        offset: 45,
        depth: 10,
        padding: 0
      }
    ]}
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
