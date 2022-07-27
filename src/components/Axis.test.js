import * as React from "react"
import { mount, shallow } from "enzyme"
import Axis from "./Axis"
import { scaleLinear } from "d3-scale"

const axisWidth = 100
const axisHeight = 200

const axisProps = {
  size: [axisWidth, axisHeight],
  scale: scaleLinear().domain([0, 100]).range([10, 100])
}

describe("Axis", () => {
  it("renders without crashing", () => {
    mount(
      <svg>
        <Axis {...axisProps} />
      </svg>
    )
  })
  const shallowAxis = shallow(<Axis {...axisProps} className="test-class" />)

  it("renders with a className", () => {
    expect(shallowAxis.find("g.test-class").length).toEqual(2)
  })

  it("renders without an annotation brush", () => {
    expect(shallowAxis.find("g.annotation-brush").length).toEqual(0)
  })

  it("renders with annotation brush area properly", () => {
    let clicked = false
    const testFuncStub = () => {
      clicked = true
    }
    const shallowAxisBrushLeft = mount(
      <svg>
        <Axis
          {...axisProps}
          annotationFunction={testFuncStub}
          orient={"left"}
        />
      </svg>
    )

    expect(shallowAxisBrushLeft.find("g.annotation-brush").length).toEqual(1)

    shallowAxisBrushLeft.find("g.annotation-brush > rect").simulate("click")
    expect(clicked).toEqual(true)

    expect(
      shallowAxisBrushLeft.find("g.annotation-brush").props().transform
    ).toEqual(`translate(-50,0)`)

    const shallowAxisBrushBottom = mount(
      <svg>
        <Axis
          {...axisProps}
          annotationFunction={testFuncStub}
          orient={"bottom"}
        />
      </svg>
    )
    expect(
      shallowAxisBrushBottom.find("g.annotation-brush").props().transform
    ).toEqual(`translate(0,${axisHeight})`)
  })
})
