import React from "react";
import DocumentComponent from "../layout/DocumentComponent";
import BulletChartRaw from "./BulletChartRaw";
const components = [];

components.push({
  name: "BulletChart"
});

export default class BulletChart extends React.Component {
  render() {
    const examples = [];
    examples.push({
      name: "Basic",
      demo: BulletChartRaw,
      source: `
      `
    });

    return (
      <DocumentComponent
        name="Bullet Chart"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>
          This demonstrates a custom type which runs all the piece rendering
          according to the very custom rules needed for this layout.
        </p>
      </DocumentComponent>
    );
  }
}

BulletChart.title = "Bullet Chart";
