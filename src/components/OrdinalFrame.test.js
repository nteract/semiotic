import React from "react"
import { render } from "@testing-library/react"
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
  const projections = ["vertical", "horizontal", "radial"]

  const xValues = [416, 88, 241]
  const yValues = [411, 416, 237]
  const yMods = [10, 0, 0]
  const xMods = [0, 10, 0]

  const singleAccessorORFrame = render(
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

  const stackedAnnotationPositionSingle =
    singleAccessorORFrame.container.querySelector(".annotation-or-label")
  /*

  it("properly positions a piece ID accessor annotation", () => {
    expect(stackedAnnotationPositionSingle).toHaveStyle("left: 500px")
    expect(stackedAnnotationPositionSingle).toHaveStyle("top: 416px")
  })
  const multiAccessorOFrame = render(
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

  const stackedAnnotationPositionMulti =
    multiAccessorOFrame.container.querySelector(".annotation-or-label")

  it("properly positions a piece ID accessor annotation with multiple R Accessors", () => {
    expect(stackedAnnotationPositionMulti).toHaveStyle("top: 250px")
    expect(stackedAnnotationPositionMulti).toHaveStyle("left: 100px")
  })
  */

  const renderedPixelColumnWidth = render(
    <OrdinalFrame
      size={[500, 0]}
      pixelColumnWidth={30}
      oPadding={5}
      data={someBarData}
      oAccessor="column"
      rAccessor="cats"
      disableContext={true}
      projection={"horizontal"}
      type="bar"
    />
  )

  const renderedPixelColumnWidthWithMargin = render(
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

  const firstColumnBar = renderedPixelColumnWidth.container
    .querySelector("rect")
    .getAttribute("height")

  const secondColumnBar = renderedPixelColumnWidthWithMargin.container
    .querySelector("rect")
    .getAttribute("height")

  it("renders the first bar at the correct height", () => {
    expect(firstColumnBar).toEqual("25")
  })

  it("second bar should be the same height", () => {
    expect(secondColumnBar).toEqual(firstColumnBar)
  })

  //  const pieceTypes = ["bar", "point", "timeline", "swarm", "clusterbar"]
  const pieceTypes = [""]

  pieceTypes.forEach((pieceType) => {
    projections.forEach((projection, index) => {
      const renderedFrameWithAnnotation = render(
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

      const svgAnnotationOR =
        renderedFrameWithAnnotation.container.querySelector(
          "text.annotation-or-label"
        )
      const htmlAnnotationOR =
        renderedFrameWithAnnotation.container.querySelector(
          "div.annotation-or-label"
        )

      it("renders an svg annotation", () => {
        expect(svgAnnotationOR)
      })
      it("renders an html annotation", () => {
        expect(renderedFrameWithAnnotation)
      })

      const htmlAnnotationStyle = htmlAnnotationOR.style

      const x = xValues[index]
      const y = yValues[index]

      it(`${pieceType} + ${projection} html and svg annotations have the same x & y positions for each`, () => {
        expect(parseInt(svgAnnotationOR.getAttribute("x"))).toEqual(
          x + xMods[index]
        )
        expect(parseInt(svgAnnotationOR.getAttribute("y"))).toEqual(
          y + yMods[index]
        )
        expect(htmlAnnotationStyle.left).toEqual(`${x}px`)
        expect(htmlAnnotationStyle.top).toEqual(`${y}px`)
      })
    })
  })
})
