import React from "react"
import { mount } from "enzyme"
import {
  svgEncloseRule,
  svgHighlightRule,
  svgHullEncloseRule,
  svgNodeRule,
  svgReactAnnotationRule,
  svgRectEncloseRule,
  htmlFrameHoverRule
} from "./networkframeRules"
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

  describe("svgNodeRule", () => {
    it('returns null with no "d" param', () => {
      expect(svgNodeRule({})).toBe(null)
    })
    describe("returns defaults", () => {
      const mockNodeSizeAccessor = () => 12

      const DefaultReturn = svgNodeRule({
        d: {},
        i: 1,
        nodeSizeAccessor: mockNodeSizeAccessor
      })

      const mounted = mount(<svg>{DefaultReturn}</svg>)
      it("mounts", () => {
        expect(mounted.length).toBe(1)
      })
      describe("passes noteData Props:", () => {
        const {
          dx,
          dy,
          connector: { end }
        } = mounted.find("SemioticAnnotation").prop("noteData")
        it("dx & dy as -25", () => {
          expect(dx).toBe(-25)
          expect(dy).toBe(-25)
        })
        it('connector.end as "arrow"', () => {
          expect(end).toBe("arrow")
        })
      })
    })
  })

  describe("svgReactAnnotationRule", () => {
    it("returns null without expected props", () => {
      const res = svgReactAnnotationRule({
        d: { id: 13 },
        projectedNodes: [],
        nodeIDAccessor: () => 12
      })
      expect(res).toBe(null)
    })
    it("passes x, y, and id vals to the noteData prop from 'd' arg", () => {
      const ThisResult = svgReactAnnotationRule({
        d: { id: 13, x: 12, y: 12 },
        projectedNodes: [],
        nodeIDAccessor: () => 12
      })
      const mounted = mount(<svg>{ThisResult}</svg>)
      const {
        noteData: { id, x, y }
      } = mounted.find("SemioticAnnotation").props("noteData")

      expect(id).toBe(13)
      expect(x).toBe(12)
      expect(y).toBe(12)
    })
    it("passes x, y, and id vals to the noteData prop from 'projectedNodes' arg", () => {
      const ThisResult = svgReactAnnotationRule({
        d: { id: 13 },
        projectedNodes: [
          {
            id: 13,
            x: 123,
            y: 234
          }
        ],
        nodeIDAccessor: (d) => d.id
      })
      const mounted = mount(<svg>{ThisResult}</svg>)
      const {
        noteData: { id, x, y }
      } = mounted.find("SemioticAnnotation").props("noteData")

      expect(id).toBe(13)
      expect(x).toBe(123)
      expect(y).toBe(234)
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
        const mounted = mount(<svg>{HoverRuleRes}</svg>)
        const tooltip = mounted.find("div.tooltip-content")
        const degreeText = tooltip.find("p").at(1).text()
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
        const mounted = mount(<svg>{HoverRuleRes}</svg>)
        const tooltip = mounted.find("div.tooltip-content")
        const degreeParagraph = tooltip.find("p").at(1)
        expect(degreeParagraph.length).toBe(0)
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
          const mounted = mount(<svg>{HoverRuleRes}</svg>)
          const resultOfParamFn = mounted.find("span#mock-tooltip-content")
          expect(mounted.length).toBe(1)
          expect(resultOfParamFn.length).toBe(1)
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
        const mounted = mount(<svg>{HoverRuleRes}</svg>)
        expect(mounted.length).toBe(1)
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
        const mounted = mount(<svg>{HoverRuleRes}</svg>)
        expect(mounted.length).toBe(1)
      })
    })
  })

  describe("svgEncloseRule", () => {
    const returnVal = (d) => d
    const returnId = d => d.id
    it("returns null when no projected nods match d.ids", () => {
      const res = svgEncloseRule({
        d: {
          ids: [2, 3, 4]
        },
        projectedNodes: [5, 6, 7],
        nodeIDAccessor: returnVal
      })
      expect(res).toBe(null)
    })
    describe("renders", () => {
      const projectedNodes = [
        {
          x: 10,
          y: 10,
          id: 2
        },
        {
          x: 20,
          y: 20,
          id: 3
        },        
        {
          x: 30,
          y: 30,
          id: 4
        }
      ]

      const ThisElement = svgEncloseRule({
        projectedNodes,
        d: {
          ids: [2, 3, 4]
        },
        nodeIDAccessor: returnId,
        nodeSizeAccessor: returnId
      })

      const mounted = mount(<svg>{ThisElement}</svg>)

      it("returns an Annotation", () => { 
        expect(mounted.find('SemioticAnnotation').length).toBe(1)
      })
    })
  })

  describe("svgRectEncloseRule", () => { 
    const returnVal = (d) => d
    const returnId = (d) => d.id

    it("returns null when no projected nods match d.ids", () => {
      const res = svgRectEncloseRule({
        d: {
          ids: [2, 3, 4]
        },
        projectedNodes: [5, 6, 7],
        nodeIDAccessor: returnVal
      })
      expect(res).toBe(null)
    })

    describe("renders", () => {
      const projectedNodes = [
        {
          x: 10,
          y: 10,
          id: 2
        },
        {
          x: 20,
          y: 20,
          id: 3
        },        
        {
          x: 30,
          y: 30,
          id: 4
        }
      ]

      it("returns an Annotation", () => {
        const ThisElement = svgRectEncloseRule({
          projectedNodes,
          d: {
            ids: [2, 3, 4]
          },
          nodeIDAccessor: returnId,
          nodeSizeAccessor: returnId
        })

        const mounted = mount(<svg>{ThisElement}</svg>)
        expect(mounted.find("SemioticAnnotation").length).toBe(1)
      })

      it("adjusts whe  selectedNodes have 'shapeNode' prop", () => {
        const ThisElement = svgRectEncloseRule({
          projectedNodes: projectedNodes.map((d, idx) => { 
            d.shapeNode = true
            d.x0 = d.x + idx
            d.x1 = d.x + idx
            d.y0 = d.y + idx
            d.y1 = d.y + idx
            return d
          }),
          d: {
            ids: [2, 3, 4]
          },
          nodeIDAccessor: returnId,
          nodeSizeAccessor: returnId
        })

        const mounted = mount(<svg>{ThisElement}</svg>)
        expect(mounted.find("SemioticAnnotation").length).toBe(1)
      })
    })
  })

  describe("svgHullEncloseRule", () => {
    const returnVal = (d) => d
    const returnId = (d) => d.id

    it("returns null when no projected nods match d.ids", () => {
      const res = svgHullEncloseRule({
        d: {
          ids: [2, 3, 4]
        },
        projectedNodes: [5, 6, 7],
        nodeIDAccessor: returnVal
      })
      expect(res).toBe(null)
    })

    describe("renders", () => {
      const projectedNodes = [
        {
          x: 10,
          y: 10,
          id: 2
        },
        {
          x: 20,
          y: 20,
          id: 3
        },        
        {
          x: 30,
          y: 30,
          id: 4
        }
      ]

      it("returns an Annotation", () => {
        const ThisElement = svgHullEncloseRule({
          projectedNodes,
          d: {
            ids: [2, 3, 4]
          },
          nodeIDAccessor: returnId,
          nodeSizeAccessor: returnId
        })

        const mounted = mount(<svg>{ThisElement}</svg>)
        expect(mounted.find("SemioticAnnotation").length).toBe(1)
      })

      it("adjusts whe  selectedNodes have 'shapeNode' prop", () => {
        const ThisElement = svgHullEncloseRule({
          projectedNodes: projectedNodes.map((d, idx) => {
            d.shapeNode = true
            d.x0 = d.x + idx
            d.x1 = d.x + idx
            d.y0 = d.y + idx
            d.y1 = d.y + idx
            return d
          }),
          d: {
            ids: [2, 3, 4]
          },
          nodeIDAccessor: returnId,
          nodeSizeAccessor: returnId
        })

        const mounted = mount(<svg>{ThisElement}</svg>)
        expect(mounted.find("SemioticAnnotation").length).toBe(1)
      })
    })
  })
})
