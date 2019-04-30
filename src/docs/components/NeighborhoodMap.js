import * as React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import NeighborhoodMapRaw from "./NeighborhoodMapRaw"

const components = []

components.push({
  name: "NeighborhoodMap"
})

export default class NeighborhoodMapDocs extends React.Component {
  render() {
    const examples = []
    examples.push({
      name: "Basic",
      demo: NeighborhoodMapRaw,
      source: `
            <XYFrame
                areas={groupedData}
                lineDataAccessor={"data"}
                showLinePoints={true}
                xAccessor={"x"}
                yAccessor={"y"}
                areaStyle={d => ({ stroke: 'none', fill: d.parentSummary.color, opacity: 0.25 })}
                pointStyle={d => ({ stroke: colors[d.vertical_id%39], strokeOpacity: 0, fill: colors[d.vertical_id%39] })}
                customPointMark={() => <Mark markType='circle' r='1' />}
                canvasPoints={true}
                areaType={{
                type: "contour",
                thresholds: 4,
                bandwidth: 5,
                neighborhood: true
             }}
            />
      `
    })

    return (
      <DocumentComponent
        name="Neighborhood Map"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>
          A simple version of Hood Theory without the map background using the
          neighborhood feature of contour area types.
        </p>
      </DocumentComponent>
    )
  }
}

NeighborhoodMapDocs.title = "Neighborhood Map"
