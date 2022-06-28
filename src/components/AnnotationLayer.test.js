import React from "react"
import { mount } from "enzyme"
import AnnotationLayer from "./AnnotationLayer"
import { TooltipProvider } from "./store/TooltipStore"

const svgAnnotationRule = (d, i) => (
  <g key={`annotation-${i}`}>
    <text>Just a blank</text>
  </g>
)
const htmlAnnotationRule = (d, i) => (
  <div key={`annotation-${i}`}> Just a blank</div>
)
const voronoiHover = () => {}

const annotations = [
  { type: "react-annotation", label: "first", x: 5, y: 5 },
  { type: "frame-hover", label: "hover" }
]

describe("AnnotationLayer", () => {
  it("renders without crashing", () => {
    mount(
      <TooltipProvider>
        <AnnotationLayer
          margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
          size={[400, 400]}
          useSpans={false}
          annotations={annotations}
          svgAnnotationRule={svgAnnotationRule}
          htmlAnnotationRule={htmlAnnotationRule}
          voronoiHover={voronoiHover}
        />
      </TooltipProvider>
    )
  })

  const mountedLayerWithOptions = mount(
    <TooltipProvider>
      <AnnotationLayer
        margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
        size={[400, 400]}
        useSpans={false}
        annotations={annotations}
        svgAnnotationRule={svgAnnotationRule}
        htmlAnnotationRule={htmlAnnotationRule}
        voronoiHover={voronoiHover}
      />
    </TooltipProvider>
  )
  it("creates a div and an SVG with annotations", () => {
    expect(mountedLayerWithOptions.find("svg").length).toEqual(1)
    //        expect(mountedLayerWithOptions.find("g.annotation").length).toEqual(1)
  })
})
