import React from "react"
import { mount, shallow } from "enzyme"
import XYFrame from "./XYFrame"
import injectTapEventPlugin from "react-tap-event-plugin"
injectTapEventPlugin()

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

//Enzyme doesn't do well with context so disable it for now

describe("XYFrame", () => {
  it("renders points, lines, areas without crashing", () => {
    mount(
      <XYFrame
        points={somePointData}
        lines={[{ label: "points", coordinates: somePointData }]}
        areas={[{ label: "areas", coordinates: somePointData }]}
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
      areas={[{ label: "areas", coordinates: somePointData }]}
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
      areas={[{ label: "areas", coordinates: somePointData }]}
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
  it("renders areas in their own <g>", () => {
    expect(mountedFrame.find("g.areas").length).toEqual(1)
    expect(mountedFrame.find("g.xyframe-area").length).toEqual(1)
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
      areas={[{ label: "areas", coordinates: somePointData }]}
      xExtent={{
        onChange: d => {
          returnedExtent = d
        }
      }}
      xAccessor="day"
      yAccessor="value"
      disableContext={true}
      showLinePoints={true}
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
    ).toEqual(`translate(50,30)`)
  })
  it("renders two axis <g> elements, one for lines and one for labels", () => {
    expect(mountedFrameWithOptions.find("g.axis-tick-lines").length).toEqual(1)
    expect(mountedFrameWithOptions.find("g.axis-labels").length).toEqual(1)
  })
  it("renders a title <g>", () => {
    expect(mountedFrameWithOptions.find("g.frame-title").length).toEqual(1)
  })
})
