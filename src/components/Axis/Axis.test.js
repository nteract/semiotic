import * as React from "react"
import { mount, shallow } from "enzyme"
import Axis, { marginalPointMapper, formatValue, boundingBoxMax } from "./Axis"
import { scaleLinear } from "d3-scale"
import SummaryGraphic from "./summaryGraphic"

const axisWidth = 100
const axisHeight = 200

const axisProps = {
  size: [axisWidth, axisHeight],
  scale: scaleLinear().domain([0, 100]).range([10, 100])
}

describe("<Axis />", () => {
  describe("renders", () => {
    it("without crashing, including center prop", () => {
      mount(
        <svg>
          <Axis {...axisProps} />
        </svg>
      )
    })

    const shallowAxis = shallow(
      <Axis {...axisProps} className="test-class" center />
    )

    it("with a className", () => {
      expect(shallowAxis.find("g.test-class").length).toEqual(2)
    })

    it("without an annotation brush", () => {
      expect(shallowAxis.find("g.annotation-brush").length).toEqual(0)
    })

    describe("with annotation brush area properly", () => {
      let clicked = false
      const testFuncStub = () => {
        clicked = true
      }

      it("oriented left", () => {
        const shallowAxisBrushLeft = mount(
          <svg>
            <Axis
              {...axisProps}
              annotationFunction={testFuncStub}
              orient={"left"}
            />
          </svg>
        )

        expect(shallowAxisBrushLeft.find("g.annotation-brush").length).toEqual(
          1
        )

        // "cover" the onMouseMove callback simulation
        shallowAxisBrushLeft
          .find("g.annotation-brush > rect")
          .simulate("mousemove")

        // "cover" the onMouseOut callback simulation
        shallowAxisBrushLeft
          .find("g.annotation-brush > rect")
          .simulate("mouseout")

        shallowAxisBrushLeft.find("g.annotation-brush > rect").simulate("click")
        expect(clicked).toEqual(true)

        expect(
          shallowAxisBrushLeft.find("g.annotation-brush").props().transform
        ).toEqual(`translate(-50,0)`)
      })

      it("oriented bottom + center", () => {
        const shallowAxisBrushBottom = mount(
          <svg>
            <Axis
              {...axisProps}
              annotationFunction={testFuncStub}
              orient={"bottom"}
              center
            />
          </svg>
        )

        // "cover" the onMouseMove callback simulation
        shallowAxisBrushBottom
          .find("g.annotation-brush > rect")
          .simulate("mousemove")

        // "cover" the onMouseOut callback simulation
        shallowAxisBrushBottom
          .find("g.annotation-brush > rect")
          .simulate("mouseout")

        expect(
          shallowAxisBrushBottom.find("g.annotation-brush").props().transform
        ).toEqual(`translate(0,${axisHeight})`)
      })

      it("oriented right + center", () => {
        const rightOriented = mount(
          <svg>
            <Axis
              {...axisProps}
              annotationFunction={testFuncStub}
              orient={"right"}
              center
            />
          </svg>
        )

        // "cover" the onMouseMove callback simulation
        rightOriented.find("g.annotation-brush > rect").simulate("mousemove")

        // "cover" the onMouseOut callback simulation
        rightOriented.find("g.annotation-brush > rect").simulate("mouseout")
      })

      it("oriented top + center", () => {
        const rightOriented = mount(
          <svg>
            <Axis
              {...axisProps}
              annotationFunction={testFuncStub}
              orient={"top"}
              center
            />
          </svg>
        )

        // "cover" the onMouseMove callback simulation
        rightOriented.find("g.annotation-brush > rect").simulate("mousemove")

        // "cover" the onMouseOut callback simulation
        rightOriented.find("g.annotation-brush > rect").simulate("mouseout")
      })
    })

    describe('handles "label" prop', () => {
      it('renders the "axis-title group element & shows "name" prop text', () => {
        const AXIS_NAME = "the axis name"
        const axisWithLabel = mount(
          <Axis
            {...axisProps}
            className="test-class"
            label={{ name: AXIS_NAME }}
            baseline={false}
          />
        )

        const labelG = axisWithLabel.find("g.axis-title")
        expect(labelG.length).toBe(1)

        const labelText = labelG.childAt(0).text()
        expect(labelText).toBe(AXIS_NAME)
      })

      describe("sets label text textAnchor attr", () => {
        it('defaults to "middle"', () => {
          const axisWithLabel = mount(
            <Axis
              {...axisProps}
              className="test-class"
              label={{ name: "test label" }}
            />
          )
          const middleAncorElement = axisWithLabel.find('[textAnchor="middle"]')
          expect(middleAncorElement.length).toBe(1)
        })
        it('sets to "end" when labelPosition.anchor is "start" and orient is "right"', () => {
          const axisWithLabel = mount(
            <Axis
              {...axisProps}
              className="test-class"
              orient="right"
              label={{
                name: "test label",
                position: { anchor: "start" },
                locationDistance: 5
              }}
              margin={{
                laft: 10,
                right: 10,
                top: 10,
                botto: 0
              }}
              size={[100, 200]}
            />
          )
          const endAnchorElement = axisWithLabel.find('[textAnchor="end"]')
          expect(endAnchorElement.length).toBe(1)
        })
        it('sets to "start" when labelPosition.anchor is "end" and orient is "right"', () => {
          const axisWithLabel = mount(
            <Axis
              {...axisProps}
              className="test-class"
              orient="right"
              label={{
                name: "test label",
                position: { anchor: "end" },
                locationDistance: 5
              }}
              margin={{
                laft: 10,
                right: 10,
                top: 10,
                botto: 0
              }}
              size={[100, 200]}
            />
          )
          const startAnchorElement = axisWithLabel.find(
            'g.axis-title > [textAnchor="start"]'
          )
          expect(startAnchorElement.length).toBe(1)
        })
      })

      it("renders label component instead of label.name string", () => {
        const axisWithLabel = mount(
          <Axis
            {...axisProps}
            className="test-class"
            label={<span className="tested-label-component"></span>}
          />
        )
        const labelComponent = axisWithLabel.find(".tested-label-component")
        const defaultLabelElement = axisWithLabel.find('[textAnchor="middle"]')
        expect(labelComponent.length).toBe(1)
        expect(defaultLabelElement.length).toBe(0)
      })
    })
  })

  describe("'helping' parts", () => {
    describe("<SummaryGraphic />", () => {
      it("nested g translates x to summaryWidth / 2 when decoratedSummaryType.type === boxplot & orient is left", () => {
        const SUM_WIDTH = 100
        const sg = mount(
          <SummaryGraphic
            translation={{ left: 10, right: 0, top: 10, bottom: 0 }}
            orient="left"
            decoratedSummaryType={{ type: "boxplot" }}
            summaryWidth={SUM_WIDTH}
            renderedSummary={{ marks: "test string here" }}
            points={<span id="test-points" />}
          />
        )
        const translatedNestedG = sg.find('[transform="translate(50,0)"]')
        expect(translatedNestedG.length).toBe(1)
      })

      it("nested g translates x to 0 when decoratedSummaryType.type === histogram", () => {
        const SUM_WIDTH = 100
        const sg = mount(
          <SummaryGraphic
            translation={{ left: 10, right: 0, top: 10, bottom: 0 }}
            orient="top"
            decoratedSummaryType={{ type: "histogram" }}
            summaryWidth={SUM_WIDTH}
            renderedSummary={{ marks: "test string here" }}
            points={<span id="test-points" />}
          />
        )
        const translatedNestedG = sg.find('[transform="translate(0,0)"]')
        expect(translatedNestedG.length).toBe(1)
      })
      it("nested g translates y to summaryWidth / 2 when decoratedSummaryType.type === boxplot and orient = top", () => {
        const SUM_WIDTH = 100
        const sg = mount(
          <SummaryGraphic
            translation={{ left: 10, right: 0, top: 10, bottom: 0 }}
            orient="top"
            decoratedSummaryType={{ type: "boxplot" }}
            summaryWidth={SUM_WIDTH}
            renderedSummary={{ marks: "test string here" }}
            points={<span id="test-points" />}
          />
        )
        const translatedNestedG = sg.find('[transform="translate(0,50)"]')
        expect(translatedNestedG.length).toBe(1)
      })
    })

    describe("marginalPointMapper", () => {
      const TEST_ROOT_OBJ = {
        width: 100,
        data: [
          {
            xy: {
              x: 50,
              y: 150
            }
          }
        ]
      }
      const testArr = [
        {
          inp: {
            ...TEST_ROOT_OBJ,
            orient: "left"
          },
          outp: [[100, 150]]
        },
        {
          inp: {
            ...TEST_ROOT_OBJ,
            orient: "right"
          },
          outp: [[100, 150]]
        },
        {
          inp: {
            ...TEST_ROOT_OBJ,
            orient: "bottom"
          },
          outp: [[50, 200]]
        },
        {
          inp: {
            ...TEST_ROOT_OBJ,
            orient: "top"
          },
          outp: [[50, 200]]
        }
      ]

      testArr.forEach(({ inp, outp }) => {
        it(`returns ${outp} from input`, () => {
          const res = marginalPointMapper(inp.orient, inp.width, inp.data)
          expect(res.toString()).toBe(outp.toString())
        })
      })
    })

    describe("formatValue", () => {
      it("calls props.tickFormat when available", () => {
        const mockTickFormat = jest.fn().mockReturnValue("test return")
        const result = formatValue("test", { tickFormat: mockTickFormat })
        expect(mockTickFormat).toHaveBeenCalledTimes(1)
        expect(mockTickFormat).toHaveBeenCalledWith("test")
        expect(result).toBe("test return")
      })
      it("calls value.toString when available", () => {
        const result = formatValue([1, 2, 3], {})
        expect(result).toBe([1, 2, 3].toString())
      })
    })

    describe("boundingBoxMax", () => { 
      it('returns 30 as default when no axisNode.current', () => {
        const res = boundingBoxMax({ current: null }, 'right')
        expect(res).toBe(30)
      })
      it("returns 55 when getBBox returns nothing found", () => {
        const x = document.createElement('svg')
        const y = document.createElement("rect")
        x.appendChild(y)
        y.setAttribute('class', 'axis-label')
        const res = boundingBoxMax({ current:  x }, "right")
        expect(res).toBe(55)
      })
    })
  })
})
