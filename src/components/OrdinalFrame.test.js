import React from "react"
import { mount, shallow } from "enzyme"
import OrdinalFrame from "./OrdinalFrame"

const someBarData = [
  { column: "a", cats: 15, dogs: 20 },
  { column: "a", cats: 20, dogs: 30 },
  { column: "b", cats: 30, dogs: 10 },
  { column: "c", cats: 100, dogs: 50 }
]

const stackedBarData = [
  { column: "a", species: "cat", value: 30 },
  { column: "a", species: "cat", value: 50 },
  { column: "b", species: "cat", value: 10 },
  { column: "c", species: "cat", value: 50 },
  { column: "a", species: "dog", value: 15 },
  { column: "a", species: "dog", value: 20 },
  { column: "b", species: "dog", value: 30 },
  { column: "c", species: "dog", value: 100 }
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

const stackedGeneratedHTMLAnnotation = {
  column: "b",
  value: 30,
  type: "frame-hover",
  rName: "dog"
}

const stackedHTMLAnnotation = {
  column: "c",
  type: "frame-hover",
  species: "dog"
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

  const mountedStacked = mount(
    <OrdinalFrame
      size={[500, 500]}
      data={stackedBarData}
      oAccessor="column"
      rAccessor="value"
      pieceIDAccessor="species"
      disableContext={true}
      projection="horizontal"
      annotations={[stackedHTMLAnnotation]}
    />
  )

  const stackedAnnotationPosition = mountedStacked
    .find("div.annotation.annotation-or-label")
    .getDOMNode().style

  it("properly positions a piece ID accessor annotation", () => {
    expect(stackedAnnotationPosition.left).toEqual("500px")
    expect(parseInt(stackedAnnotationPosition.top)).toEqual(416)
  })

  const mountedStackedGenerated = mount(
    <OrdinalFrame
      size={[500, 500]}
      data={someBarData}
      oAccessor="column"
      rAccessor={["cats", "dogs"]}
      disableContext={true}
      projection="horizontal"
      annotations={[stackedGeneratedHTMLAnnotation]}
      type="bar"
    />
  )

  const stackedGeneratedAnnotationPosition = mountedStackedGenerated
    .find("div.annotation.annotation-or-label")
    .getDOMNode().style

  it("properly positions a piece ID accessor annotation", () => {
    expect(stackedGeneratedAnnotationPosition.top).toEqual("250px")
    expect(parseInt(stackedGeneratedAnnotationPosition.left)).toEqual(100)
  })

  const mountedPixelColumnWidth = mount(
    <OrdinalFrame
      size={[500, 0]}
      pixelColumnWidth={30}
      data={someBarData}
      oAccessor="column"
      rAccessor="cats"
      disableContext={true}
      projection={"horizontal"}
      oPadding={5}
      type="bar"
    />
  )

  const svgHeight = mountedPixelColumnWidth
    .find("svg.visualization-layer")
    .props().height

  it("renders a zero height frame with mountedPixelColumnWidth", () => {
    expect(svgHeight).toEqual(90)
  })

  const mountedPixelColumnWidthWithMargin = mount(
    <OrdinalFrame
      size={[500, 0]}
      pixelColumnWidth={30}
      oPadding={5}
      data={someBarData}
      oAccessor="column"
      rAccessor="cats"
      disableContext={true}
      projection={"horizontal"}
      margin={30}
      type="bar"
    />
  )

  const firstColumnBar = mountedPixelColumnWidth.find("rect").first().props()

  const secondColumnBar = mountedPixelColumnWidthWithMargin
    .find("rect")
    .first()
    .props()

  it("renders an svg annotation", () => {
    expect(firstColumnBar.height).toEqual(25)
  })

  it("renders an svg annotation", () => {
    expect(secondColumnBar.height).toEqual(firstColumnBar.height)
  })

  //  const pieceTypes = ["bar", "point", "timeline", "swarm", "clusterbar"]
  const pieceTypes = [""]

  pieceTypes.forEach((pieceType) => {
    projections.forEach((projection, index) => {
      const mountedFrameWithAnnotation = mount(
        <OrdinalFrame
          data={someBarData}
          oAccessor="column"
          rAccessor="cats"
          disableContext={true}
          annotations={[htmlAnnotation, svgAnnotation]}
          projection={projection}
          type={pieceType}
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

      const x = xValues[index]
      const y = yValues[index]

      it(`${pieceType} + ${projection} html and svg annotations have the same x & y positions for each`, () => {
        expect(svgAnnotationOR.props().x).toEqual(x + xMods[index])
        expect(svgAnnotationOR.props().y).toEqual(y + yMods[index])
        expect(htmlAnnotationStyle.left).toEqual(`${x}px`)
        expect(htmlAnnotationStyle.top).toEqual(`${y}px`)
      })
    })
  })
})
