import React from "react"
import { OrdinalFrame, NetworkFrame, XYFrame } from "../../components"

import DocumentComponent from "../layout/DocumentComponent"
import AnnotationCallout from "react-annotation/lib/Types/AnnotationCallout"

const components = []
const sharedProps = {
  size: [200, 200]
}

const dataSeeds = [50, 40, 30, 10]

function generatePoints(start, number) {
  const arrayOfPoints = []
  let currentValue = start
  for (let x = 0; x <= number; x++) {
    arrayOfPoints.push({ step: x, value: currentValue })
    currentValue += Math.random() * 10 - 5
  }
  return arrayOfPoints
}

const generatedData = dataSeeds.map((s, i) => {
  return {
    label: `line ${i}`,
    coordinates: generatePoints(s, 40)
  }
})

const charts = (
  <div>
    <div style={{ display: "inline-block", width: "200px", height: "200px" }}>
      <XYFrame
        {...sharedProps}
        title="Your Line Chart"
        lines={generatedData}
        xAccessor="step"
        yAccessor="value"
        axes={[{ orient: "left" }, { orient: "bottom" }]}
        margin={{ top: 50, bottom: 30, left: 50, right: 10 }}
      />
    </div>
    <div style={{ display: "inline-block", width: "200px", height: "200px" }}>
      <NetworkFrame
        {...sharedProps}
        title="Your Network Chart"
        edges={{
          id: "root",
          children: [
            {
              id: "a",
              children: [{ id: "aa" }, { id: "ab" }, { id: "ac" }]
            },
            { id: "b", children: [{ id: "ba" }, { id: "bb" }] },
            { id: "c", children: [{ id: "ca" }] }
          ]
        }}
        networkType={{ type: "force" }}
        nodeSizeAccessor={d => d.degree * 5}
        margin={{ top: 50, left: 5, right: 5, bottom: 5 }}
      />
    </div>
    <div style={{ display: "inline-block", width: "200px", height: "200px" }}>
      <OrdinalFrame
        {...sharedProps}
        oPadding={5}
        title="Your Bar Chart"
        type="bar"
        data={[10, 5, 18, 6, 20]}
        axis={{ orient: "left" }}
        oLabel={true}
        margin={{ top: 50, bottom: 20, left: 50, right: 10 }}
        annotations={[
          {
            type: AnnotationCallout,
            label: "A note about this point",
            value: 6,
            renderKey: 3,
            dx: 50,
            dy: -50
          }
        ]}
      />
    </div>
  </div>
)

components.push({
  name: "Styling Your Charts"
})

export default class CreatingBarChart extends React.Component {
  render() {
    const examples = []

    examples.push({
      name: "Plain",
      demo: (
        <div className="style-example style-example-plain">
          <p>Academic</p>
          {charts}
        </div>
      ),
      source: ``
    })

    examples.push({
      name: "Minimal",
      demo: (
        <div className="style-example style-example-minimal">
          <p>Academic</p>
          {charts}
        </div>
      ),
      source: ``
    })

    examples.push({
      name: "Dark",
      demo: (
        <div className="style-example style-example-dark">
          <p>Academic</p>
          {charts}
        </div>
      ),
      source: ``
    })

    return (
      <DocumentComponent
        name="Styling Your Charts"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>
          By default Semiotic has no built-in styles and you need to use CSS or
          inline styling to make your charts beautiful. But here are a few
          themes you can use by taking the CSS and putting it into your project.
        </p>
      </DocumentComponent>
    )
  }
}

CreatingBarChart.title = "Styling Your Charts"
