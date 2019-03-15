import * as React from "react"
import { mount, shallow } from "enzyme"
import VisualizationLayer from "./VisualizationLayer"

const visualizationLayerWidth = 100
const visualizationLayerHeight = 200

const visualizationLayerProps = {
  size: [visualizationLayerWidth, visualizationLayerHeight]
}

function drawSomeRectangles({
  //  xScale,
  //  yScale,
  //  canvasDrawing,
  //  projectedCoordinateNames,
  //  renderKeyFn,
  //  baseMarkProps,
  data
}) {
  return data.map(d => (
    <rect
      key={`test-render-rect-${d}`}
      x={d * 10}
      y={d * 5}
      height={5}
      width={8}
    />
  ))
}

const simplePipeline = {
  rectangles: { data: [1, 2, 3, 4, 5], behavior: drawSomeRectangles }
}

describe("VisualizationLayer", () => {
  it("renders without crashing", () => {
    mount(<VisualizationLayer {...visualizationLayerProps} />)
  })
  const shallowVisualizationLayer = shallow(
    <VisualizationLayer
      {...visualizationLayerProps}
      renderPipeline={simplePipeline}
    />
  )

  it("draws things in the render pipeline according to behavior", () => {
    expect(shallowVisualizationLayer.find("rect").length).toEqual(5)
  })
})
