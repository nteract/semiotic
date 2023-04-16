import React from "react"
import { render, screen } from "@testing-library/react"
import { svgHighlightRule, htmlFrameHoverRule } from "./networkframeRules"
describe("networkframeRules", () => {
  describe("svgHighlightRule", () => {
    describe("handles defaults", () => {
      const d = {
        x: 20,
        y: 20
      }

      // const mockMarkFn = jest.fn().mockImplementation(d => d)
      const mockStyleFn = jest.fn()
      const networkFrameRender = {
        nodes: {
          customMark: (d) => d,
          styleFn: mockStyleFn
        }
      }

      it("d.x, d.y,  transform and key", () => {
        const {
          d: { x, y },
          transform,
          key
        } = svgHighlightRule({
          d,
          i: 1,
          networkFrameRender
        })
        expect(x).toBe(20)
        expect(y).toBe(20)
        expect(transform).toBe(`translate(20,20)`)
        expect(key).toBe("highlight-1")
      })
    })
  })

  describe("htmlFrameHoverRule", () => {
    it('returns null when no "d" prop & no matching nodes in params', () => {
      const res = htmlFrameHoverRule({
        d: {
          x: undefined,
          id: 12
        },
        nodes: [],
        nodeIDAccessor: () => 14
      })
      expect(res).toBe(null)
    })

    describe("with d param populated,", () => {
      it('without d.edge, includes "Degree: " paragraph', () => {
        const HoverRuleRes = htmlFrameHoverRule({
          d: {
            x: 20,
            y: 20,
            id: 12,
            degree: 23
          },
          nodes: [],
          nodeIDAccessor: () => 14
        })
        const renderedTooltip = render(
          <div data-testid="network-tooltip-container">{HoverRuleRes}</div>
        )

        const degreeText = renderedTooltip.container
          .querySelectorAll("p")
          .item(1).innerHTML

        expect(degreeText).toBe("Degree: 23")
      })
      it('with d.edge, does not include "Degree: " paragraph', () => {
        const HoverRuleRes = htmlFrameHoverRule({
          d: {
            x: 20,
            y: 20,
            id: 12,
            edge: {
              target: {
                id: 13
              },
              source: {
                id: 12
              }
            }
          },
          nodes: [],
          nodeIDAccessor: () => 14
        })
        const renderedTooltip = render(
          <div data-testid="network-tooltip-container">{HoverRuleRes}</div>
        )
        const degreeParagraph = renderedTooltip.container.querySelectorAll("p")
        expect(degreeParagraph.length).toBe(1)
      })

      describe('with d.type as "frame-hover" and tooltipContent fn param', () => {
        it("without 'optimizeCustomTooltipPosition', calls 'tooltipContent' fn", () => {
          const HoverRuleRes = htmlFrameHoverRule({
            d: {
              x: 20,
              y: 20,
              id: 12,
              degree: 23,
              type: "frame-hover"
            },
            nodes: [],
            nodeIDAccessor: () => 14,
            tooltipContent: () => <span id="mock-tooltip-content" />
          })
          const rendered = render(<div>{HoverRuleRes}</div>)
          const resultOfParamFn = rendered.container.querySelector(
            "span#mock-tooltip-content"
          )
          expect(resultOfParamFn)
        })
      })
    })

    describe("without d.x or d.y params populated", () => {
      it('AND d.edge populated, leverages "nodeIDAccessor" successfully', () => {
        const mockD = {
          id: 12,
          degree: 23,
          source: 12,
          edge: 12,
          target: 12
        }
        const HoverRuleRes = htmlFrameHoverRule({
          d: mockD,
          edges: [
            {
              source: 12,
              target: 12
            }
          ],
          nodes: [],
          nodeIDAccessor: (d) => d
        })
        const rendered = render(<div>{HoverRuleRes}</div>)
        expect(rendered)
      })

      it("and without d.edge populated, leverages nodes array successfully", () => {
        const mockD = {
          id: 12,
          degree: 23,
          source: 12,
          target: 12
        }
        const HoverRuleRes = htmlFrameHoverRule({
          d: mockD,
          edges: [
            {
              source: 12,
              target: 12
            }
          ],
          nodes: [
            {
              source: 12,
              target: 12
            }
          ],
          nodeIDAccessor: (d) => d
        })
        const rendered = render(<div>{HoverRuleRes}</div>)
        expect(rendered)
      })
    })
  })
})
