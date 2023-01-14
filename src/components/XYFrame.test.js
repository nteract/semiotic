import * as React from "react"
import { render, screen } from "@testing-library/react"
import XYFrame from "./XYFrame"

const somePointData = [
  { day: 1, date: "2017-01-01", value: 180 },
  { day: 2, date: "2017-02-01", value: 80 },
  { day: 3, date: "2017-03-14", value: 0 },
  { day: 4, date: "2017-06-20", value: 20 }
]

const someOtherPointData = [
  { day: 1, date: "2017-01-01", value: 280 },
  { day: 2, date: "2017-02-01", value: 0 },
  { day: 3, date: "2017-03-14", value: 50 },
  { day: 4, date: "2017-06-20", value: 50 }
]

const htmlAnnotation = {
  day: 3,
  value: 100,
  type: "frame-hover"
}

const svgAnnotation = {
  day: 3,
  value: 100,
  type: "xy"
}

//Enzyme doesn't do well with context so disable it for now

describe("XYFrame", () => {
  it("renders points, lines, summaries without crashing", () => {
    render(
      <XYFrame
        points={somePointData}
        lines={[{ label: "points", coordinates: somePointData }]}
        summaries={[{ label: "summaries", coordinates: somePointData }]}
        xAccessor="day"
        yAccessor="value"
        disableContext={true}
      />
    )
  })

  let returnedExtent
  render(
    <XYFrame
      points={somePointData}
      lines={[
        { label: "points", coordinates: somePointData },
        { label: "otherpoints", coordinates: someOtherPointData }
      ]}
      summaries={[{ label: "summaries", coordinates: somePointData }]}
      xExtent={{
        onChange: (d) => {
          returnedExtent = d
        }
      }}
      xAccessor="day"
      yAccessor="value"
      disableContext={true}
    />
  )

  it("returns the calculated extent", () => {
    expect(returnedExtent[0]).toEqual(1)
    expect(returnedExtent[1]).toEqual(4)
  })

  const anXYFrame = (
    <XYFrame
      points={somePointData}
      lines={[
        { label: "points", coordinates: somePointData },
        { label: "otherpoints", coordinates: someOtherPointData }
      ]}
      summaries={[{ label: "summaries", coordinates: somePointData }]}
      xExtent={{
        onChange: (d) => {
          returnedExtent = d
        }
      }}
      xAccessor="day"
      yAccessor="value"
      disableContext={true}
    />
  )

  it("renders points in their own <g>", () => {
    render(anXYFrame)
    expect(screen.getByTestId("points"))
    expect(screen.getAllByTestId("frame-piece").length).toEqual(4)
  })
  it("renders lines in their own <g>", () => {
    render(anXYFrame)
    expect(screen.getByTestId("lines"))
    expect(screen.getAllByTestId("xyframe-line").length).toEqual(2)
  })
  it("renders summaries in their own <g>", () => {
    render(anXYFrame)
    expect(screen.getAllByTestId("xyframe-summary").length).toEqual(1)
  })
  it("doesn't render an interaction layer", () => {
    const xyFrame = render(anXYFrame)

    expect(xyFrame.container.querySelector(".interaction-layer")).toBeNull()
  })
  it("doesn't offset because there shouldn't be a margin", () => {
    const xyFrame = render(anXYFrame)
    expect(
      xyFrame.container
        .querySelector(".data-visualization")
        .getAttribute("transform")
    ).toBe("translate(0,0)")
  })
  /*
  it("doesn't render any axis <g> elements", () => {
    expect(screen.container.querySelectorAll("g.axis").length).toEqual(0)
  })
  */

  const anotherXYFrame = (
    <XYFrame
      title={"test title"}
      points={somePointData}
      lines={[
        { label: "points", coordinates: somePointData },
        { label: "otherpoints", coordinates: someOtherPointData }
      ]}
      summaries={[{ label: "summaries", coordinates: somePointData }]}
      xExtent={{
        onChange: (d) => {
          returnedExtent = d
        }
      }}
      xAccessor="day"
      yAccessor="value"
      disableContext={true}
      showLinePoints={true}
      showSummaryPoints={true}
      hoverAnnotation={true}
      axes={[{ orient: "left" }, { orient: "bottom" }]}
    />
  )

  it("showLinePoints exposes more points", () => {
    const xyFrame = render(anotherXYFrame)
    expect(
      xyFrame.container.querySelectorAll(".points .frame-piece").length
    ).toEqual(32)
  })
  it("hoverAnnotation turns on interaction layer and only has regions for non-overlapping points", () => {
    const xyFrame = render(anotherXYFrame)
    expect(
      xyFrame.container.querySelectorAll(".interaction-layer g > path").length
    ).toEqual(8)
  })

  it("axes and title cause a default margin that offsets the data-visualization container", () => {
    const xyFrame = render(anotherXYFrame)
    expect(
      xyFrame.container
        .querySelector(".data-visualization")
        .getAttribute("transform")
    ).toBe("translate(50,40)")
  })
  /*
  it("renders two axis <g> elements, one for lines and one for labels", () => {
    expect(screen.container.querySelectorAll("g.axis-tick-lines"))
    expect(screen.container.querySelectorAll("g.axis-labels"))
  })
  it("renders a title <g>", () => {
    expect(screen.container.querySelectorAll("g.frame-title"))
  })
  */

  const xyFrameRender = render(
    <XYFrame
      title={"test title"}
      points={somePointData}
      lines={[
        { label: "points", coordinates: somePointData },
        { label: "otherpoints", coordinates: someOtherPointData }
      ]}
      xAccessor="day"
      yAccessor="value"
      disableContext={true}
      annotations={[htmlAnnotation, svgAnnotation]}
    />
  )
  it("renders an svg annotation", () => {
    expect(xyFrameRender.container.querySelectorAll("g.annotation.xy"))
  })
  it("renders an html annotation", () => {
    expect(
      xyFrameRender.container.querySelectorAll(
        "div.annotation.annotation-xy-label"
      )
    )
  })

  const svgAnnotationXY = xyFrameRender.container.querySelector(
    "g.annotation.xy > circle"
  )

  const htmlAnnotationStyle = xyFrameRender.container.querySelector(
    "div.annotation.annotation-xy-label"
  ).style

  const x = 333
  const y = 295

  const htmlX = parseInt(htmlAnnotationStyle.left.split("px")[0])
  const htmlY = parseInt(htmlAnnotationStyle.top.split("px")[0])

  const svgX = Math.floor(svgAnnotationXY.getAttribute("cx"))
  const svgY = Math.floor(svgAnnotationXY.getAttribute("cy"))

  it("html and svg annotations have the same x & y positions for each", () => {
    expect(svgX).toEqual(x)
    expect(svgY).toEqual(y)
    expect(htmlX).toEqual(x)
    expect(htmlY).toEqual(y)
  })
})
