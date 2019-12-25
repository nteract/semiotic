import * as React from "react"
import { mount, shallow } from "enzyme"
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
    mount(
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
  const wrapper = shallow(
    <XYFrame
      points={somePointData}
      lines={[
        { label: "points", coordinates: somePointData },
        { label: "otherpoints", coordinates: someOtherPointData }
      ]}
      summaries={[{ label: "summaries", coordinates: somePointData }]}
      xExtent={{
        onChange: d => {
          returnedExtent = d
        }
      }}
      xAccessor="day"
      yAccessor="value"
      disableContext={true}
    />
  )

  it("renders a <Frame>", () => {
    expect(wrapper.find("Frame").length).toEqual(1)
  })
  it("returns the calculated extent", () => {
    expect(returnedExtent[0]).toEqual(1)
    expect(returnedExtent[1]).toEqual(4)
  })

  const mountedFrame = mount(
    <XYFrame
      points={somePointData}
      lines={[
        { label: "points", coordinates: somePointData },
        { label: "otherpoints", coordinates: someOtherPointData }
      ]}
      summaries={[{ label: "summaries", coordinates: somePointData }]}
      xExtent={{
        onChange: d => {
          returnedExtent = d
        }
      }}
      xAccessor="day"
      yAccessor="value"
      disableContext={true}
    />
  )

  it("renders points in their own <g>", () => {
    expect(mountedFrame.find("g.points").length).toEqual(1)
    expect(mountedFrame.find("g.frame-piece").length).toEqual(4)
  })
  it("renders lines in their own <g>", () => {
    expect(mountedFrame.find("g.lines").length).toEqual(1)
    expect(mountedFrame.find("g.xyframe-line").length).toEqual(2)
  })
  it("renders summaries in their own <g>", () => {
    expect(mountedFrame.find("g.summaries").length).toEqual(1)
    expect(mountedFrame.find("g.xyframe-summary").length).toEqual(1)
  })
  it("doesn't render an interaction layer", () => {
    expect(mountedFrame.find("div.interaction-layer").length).toEqual(0)
  })
  it("doesn't offset because there shouldn't be a margin", () => {
    expect(mountedFrame.find("g.data-visualization").length).toEqual(1)
    expect(mountedFrame.find("g.data-visualization").props().transform).toEqual(
      `translate(0,0)`
    )
  })
  it("doesn't render any axis <g> elements", () => {
    expect(mountedFrame.find("g.axis").length).toEqual(0)
  })

  const mountedFrameWithOptions = mount(
    <XYFrame
      title={"test title"}
      points={somePointData}
      lines={[
        { label: "points", coordinates: somePointData },
        { label: "otherpoints", coordinates: someOtherPointData }
      ]}
      summaries={[{ label: "summaries", coordinates: somePointData }]}
      xExtent={{
        onChange: d => {
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
    expect(mountedFrameWithOptions.find("g.frame-piece").length).toEqual(16)
  })
  it("hoverAnnotation turns on interaction layer and only has regions for non-overlapping points", () => {
    expect(
      mountedFrameWithOptions.find("div.interaction-layer").length
    ).toEqual(1)
    expect(
      mountedFrameWithOptions.find("g.interaction-regions > path").length
    ).toEqual(8)
  })

  it("axes and title cause a default margin that offsets the data-visualization container", () => {
    expect(
      mountedFrameWithOptions.find("g.data-visualization").props().transform
    ).toEqual(`translate(50,40)`)
  })
  it("renders two axis <g> elements, one for lines and one for labels", () => {
    expect(mountedFrameWithOptions.find("g.axis-tick-lines").length).toEqual(1)
    expect(mountedFrameWithOptions.find("g.axis-labels").length).toEqual(1)
  })
  it("renders a title <g>", () => {
    expect(mountedFrameWithOptions.find("g.frame-title").length).toEqual(1)
  })

  const mountedFrameWithAnnotation = mount(
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
    expect(mountedFrameWithAnnotation.find("g.annotation.xy").length).toEqual(1)
  })
  it("renders an html annotation", () => {
    expect(
      mountedFrameWithAnnotation.find("div.annotation.annotation-xy-label")
        .length
    ).toEqual(1)
  })

  const svgAnnotationXY = mountedFrameWithAnnotation.find(
    "g.annotation.xy > circle"
  )

  const htmlAnnotationStyle = mountedFrameWithAnnotation
    .find("div.annotation.annotation-xy-label")
    .getDOMNode().style

  const x = 333.3333333333333
  const y = 295.7142857142857

  it("html and svg annotations have the same x & y positions for each", () => {
    expect(svgAnnotationXY.props().cx).toEqual(x)
    expect(svgAnnotationXY.props().cy).toEqual(y)
    expect(htmlAnnotationStyle.left).toEqual(`${x}px`)
    expect(htmlAnnotationStyle.top).toEqual(`${y}px`)
  })
})
