import React from "react"
import { mount, shallow } from "enzyme"
import Axis from "./Axis"
import { scaleLinear } from "d3-scale"

const axisWidth = 100

const axisProps = {
  size: [axisWidth, 100],
  scale: scaleLinear()
    .domain([0, 100])
    .range([10, 100])
}

describe("Axis", () => {
  it("renders without crashing", () => {
    mount(<Axis {...axisProps} />)
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
    const testFuncStub = e => {
      console.log("e", e)
      clicked = true
    }
    const shallowAxisBrush = shallow(
      <Axis {...axisProps} annotationFunction={testFuncStub} orient={"left"} />
    )

    expect(shallowAxisBrush.find("g.annotation-brush").length).toEqual(1)

    shallowAxisBrush.find("g.annotation-brush > rect").simulate("click")
    expect(clicked).toEqual(true)

    console.log(
      "shallowAxisBrush.find(g.annotation-brush)",
      shallowAxisBrush.find("g.annotation-brush").props().transform
    )

    expect(
      shallowAxisBrush.find("g.annotation-brush").props().transform
    ).toEqual(`translate(-50,0)`)
  })
})
