import React from "react"
import { mount, shallow } from "enzyme"
import OrdinalFrame from "./OrdinalFrame"

const someBarData = [
  { column: "a", cats: 15 },
  { column: "a", cats: 20 },
  { column: "b", cats: 30 },
  { column: "c", cats: 100 }
]

const htmlAnnotation = {
  column: "b",
  value: 30,
  type: "frame-hover"
}

const svgAnnotation = {
  column: "b",
  value: 30,
  type: "or"
}

describe("OrdinalFrame", () => {
  it("renders", () => {
    mount(
      <OrdinalFrame
        data={someBarData}
        oAccessor="column"
        rAccessor="cats"
        disableContext={true}
      />
    )
  })

  it("renders a <Frame>", () => {
    const wrapper = shallow(
      <OrdinalFrame
        data={someBarData}
        oAccessor="column"
        rAccessor="cats"
        disableContext={true}
      />
    )
    expect(wrapper.find("Frame").length).toEqual(1)
  })

  const projections = ["vertical", "horizontal", "radial"]

  const xValues = [250, 88.23529411764706, 250]
  const yValues = [411.7647058823529, 250, 265]
  const yMods = [10, 0, 0]
  const xMods = [0, 10, 0]

  projections.forEach((projection, index) => {
    const mountedFrameWithAnnotation = mount(
      <OrdinalFrame
        data={someBarData}
        oAccessor="column"
        rAccessor="cats"
        disableContext={true}
        annotations={[htmlAnnotation, svgAnnotation]}
        projection={projection}
      />
    )

    const svgAnnotationOR = mountedFrameWithAnnotation.find(
      "g.annotation-or-label > text"
    )

    it("renders an svg annotation", () => {
      expect(svgAnnotationOR.length).toEqual(1)
    })
    it("renders an html annotation", () => {
      expect(
        mountedFrameWithAnnotation.find("div.annotation.annotation-or-label")
          .length
      ).toEqual(1)
    })

    const htmlAnnotationStyle = mountedFrameWithAnnotation
      .find("div.annotation.annotation-or-label")
      .getDOMNode().style

    console.info("svgAnnotationOR", projection, svgAnnotationOR)
    console.info("htmlAnnotationStyle", projection, htmlAnnotationStyle)

    const x = xValues[index]
    const y = yValues[index]

    it(`${projection} html and svg annotations have the same x & y positions for each`, () => {
      expect(svgAnnotationOR.props().x).toEqual(x + xMods[index])
      expect(svgAnnotationOR.props().y).toEqual(y + yMods[index])
      expect(htmlAnnotationStyle.left).toEqual(`${x}px`)
      expect(htmlAnnotationStyle.top).toEqual(`${y}px`)
    })
  })
})
