import * as React from "react"
import { render, fireEvent, screen } from "@testing-library/react"
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
      render(
        <svg>
          <Axis {...axisProps} />
        </svg>
      )
    })

    it("with a className", () => {
      const { container } = render(
        <Axis {...axisProps} className="test-class" center />
      )
      expect(
        container.getElementsByClassName("axis test-class").length
      ).toEqual(1)
    })

    it("without an annotation brush", () => {
      const { container } = render(
        <Axis {...axisProps} className="test-class" center />
      )
      expect(
        container.getElementsByClassName("annotation-brush").length
      ).toEqual(0)
    })

    describe("with annotation brush area properly", () => {
      let clicked = false
      const testFuncStub = () => {
        clicked = true
      }

      it("oriented left", () => {
        const { container } = render(
          <svg>
            <Axis
              {...axisProps}
              annotationFunction={testFuncStub}
              orient={"left"}
            />
          </svg>
        )

        expect(
          container.getElementsByClassName("annotation-brush").length
        ).toEqual(1)

        // "cover" the onMouseMove callback simulation
        const annotationRect = container.querySelectorAll(
          "g.annotation-brush > rect"
        )[0]

        fireEvent.mouseMove(annotationRect)

        // "cover" the onMouseOut callback simulation
        fireEvent.mouseOut(container.querySelectorAll("g.annotation-brush")[0])

        fireEvent.click(
          container.querySelectorAll("g.annotation-brush > rect")[0]
        )
        expect(clicked).toEqual(true)

        const brush = container.querySelectorAll(".annotation-brush")[0]
        expect(brush).toHaveAttribute("transform", "translate(-50,0)")
      })

      it("oriented bottom + center", () => {
        const { container } = render(
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
        fireEvent.mouseMove(
          container.querySelectorAll(".annotation-brush > rect")[0]
        )

        // "cover" the onMouseOut callback simulation
        fireEvent.mouseOut(container.querySelectorAll("g.annotation-brush")[0])

        expect(
          container.querySelectorAll("g.annotation-brush")[0]
        ).toHaveAttribute("transform", `translate(0,${axisHeight})`)
      })

      it("oriented right + center", () => {
        const { container } = render(
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
        fireEvent.mouseMove(
          container.querySelectorAll("g.annotation-brush > rect")[0]
        )

        // "cover" the onMouseOut callback simulation
        fireEvent.mouseOut(
          container.querySelectorAll("g.annotation-brush > rect")[0]
        )
      })

      it("oriented top + center", () => {
        const { container } = render(
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
        fireEvent.mouseMove(
          container.querySelectorAll("g.annotation-brush > rect")[0]
        )

        // "cover" the onMouseOut callback simulation
        fireEvent.mouseOut(
          container.querySelectorAll("g.annotation-brush > rect")[0]
        )
      })
    })

    describe('handles "label" prop', () => {
      it('renders the "axis-title group element & shows "name" prop text', () => {
        const AXIS_NAME = "the axis name"
        render(
          <Axis
            {...axisProps}
            className="test-class"
            label={{ name: AXIS_NAME }}
            baseline={false}
          />
        )

        const labelG = screen.getByText(AXIS_NAME)
        expect(labelG).toBeTruthy()
      })

      describe("sets label text textAnchor attr", () => {
        it('defaults to "middle"', () => {
          const { container } = render(
            <Axis
              {...axisProps}
              className="test-class"
              label={{ name: "test label" }}
            />
          )

          const axisTitle = container.querySelectorAll("g.axis-title > text")[0]
          expect(axisTitle).toHaveAttribute("text-anchor", "middle")
        })
        it('sets to "end" when labelPosition.anchor is "start" and orient is "right"', () => {
          const { container } = render(
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
          const axisTitle = container.querySelectorAll("g.axis-title > text")[0]
          expect(axisTitle).toHaveAttribute("text-anchor", "end")
        })
        it('sets to "start" when labelPosition.anchor is "end" and orient is "right"', () => {
          const { container } = render(
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
          const axisTitle = container.querySelectorAll("g.axis-title > text")[0]
          expect(axisTitle).toHaveAttribute("text-anchor", "start")
        })
      })

      it("renders label component instead of label.name string", () => {
        const { container } = render(
          <Axis
            {...axisProps}
            className="test-class"
            label={<span className="tested-label-component"></span>}
          />
        )
        const labelComponent = container.querySelectorAll("span")[0]
        expect(labelComponent).toHaveAttribute(
          "class",
          "tested-label-component"
        )
      })
    })
  })

  describe("'helping' parts", () => {
    describe("<SummaryGraphic />", () => {
      it("nested g translates x to summaryWidth / 2 when decoratedSummaryType.type === boxplot & orient is left", () => {
        const SUM_WIDTH = 100
        const { container } = render(
          <SummaryGraphic
            translation={{ left: 10, right: 0, top: 10, bottom: 0 }}
            orient="left"
            decoratedSummaryType={{ type: "boxplot" }}
            summaryWidth={SUM_WIDTH}
            renderedSummary={{ marks: "test string here" }}
            points={<span id="test-points" />}
          />
        )
        const translatedNestedG = container.querySelectorAll("g > g")[0]
        //
        expect(translatedNestedG).toHaveAttribute(
          "transform",
          "translate(50,0)"
        )
      })

      it("nested g translates x to 0 when decoratedSummaryType.type === histogram", () => {
        const SUM_WIDTH = 100
        const { container } = render(
          <SummaryGraphic
            translation={{ left: 10, right: 0, top: 10, bottom: 0 }}
            orient="top"
            decoratedSummaryType={{ type: "histogram" }}
            summaryWidth={SUM_WIDTH}
            renderedSummary={{ marks: "test string here" }}
            points={<span id="test-points" />}
          />
        )
        const translatedNestedG = container.querySelectorAll("g > g")[0]
        expect(translatedNestedG).toHaveAttribute("transform", "translate(0,0)")
      })
      it("nested g translates y to summaryWidth / 2 when decoratedSummaryType.type === boxplot and orient = top", () => {
        const SUM_WIDTH = 100
        const { container } = render(
          <SummaryGraphic
            translation={{ left: 10, right: 0, top: 10, bottom: 0 }}
            orient="top"
            decoratedSummaryType={{ type: "boxplot" }}
            summaryWidth={SUM_WIDTH}
            renderedSummary={{ marks: "test string here" }}
            points={<span id="test-points" />}
          />
        )
        const translatedNestedG = container.querySelectorAll("g > g")[0]
        expect(translatedNestedG).toHaveAttribute(
          "transform",
          "translate(0,50)"
        )
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
      it("returns 30 as default when no axisNode.current", () => {
        const res = boundingBoxMax({ current: null }, "right")
        expect(res).toBe(30)
      })
      it("returns 55 when getBBox returns nothing found", () => {
        const x = document.createElement("svg")
        const y = document.createElement("rect")
        x.appendChild(y)
        y.setAttribute("class", "axis-label")
        const res = boundingBoxMax({ current: x }, "right")
        expect(res).toBe(55)
      })
    })
  })
})
