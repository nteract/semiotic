import React from "react"
import { mount } from "enzyme"
import {
  desaturationLayer,
  rectangleEnclosure,
  circleEnclosure,
  hullEnclosure
} from "./baseRules"

const style = { fill: "white", fillOpacity: 0.1 }
const size = [400, 400]
const i = 0
const key = "desat-key"

describe("annotationRules", () => {
  describe("desaturationLayer", () => {
    const LightDesaturation = desaturationLayer({
      style,
      size,
      i,
      key
    })

    it("renders a desaturation layer without crashing", () => {
      mount(<svg>{LightDesaturation}</svg>)
    })

    const mountedDesat = mount(<svg>{LightDesaturation}</svg>)

    it("desaturation layer creates a proper rectangle", () => {
      expect(mountedDesat.find("rect").length).toEqual(1)
      //Desaturation Layer has a 10px overflow
      expect(mountedDesat.find("rect").props().width).toEqual(410)
    })

    it("sets default fill, fillOpacity, and key when not provided", () => {
      const LightDesaturation = desaturationLayer({
        size,
        i
      })
      const mounted = mount(<svg>{LightDesaturation}</svg>)
      const {
        style: { fill, fillOpacity }
      } = mounted.find("rect").props()
      expect(fill).toBe("white")
      expect(fillOpacity).toBe(0.5)
    })

    //   it('')
  })

  describe("rectangleEnclosure", () => {
    describe("renders defaults, no 'd' prop values", () => {
      const mockBBNodes = [
        {
          x0: 10,
          x1: 100,
          y0: 10,
          y1: 100
        }
      ]

      const EnclosedRectangle = rectangleEnclosure({
        bboxNodes: mockBBNodes,
        d: {},
        i: 1
      })

      const mounted = mount(<svg>{EnclosedRectangle}</svg>)
      it("an annotation", () => {
        const foundAnnotation = mounted.find("Annotation")
        expect(foundAnnotation.length).toBe(1)
      })
      it("passes noteVals: {dx: -25, dy: -25}", () => {
        const { dx, dy } = mounted.find("SemioticAnnotation").prop("noteData")
        expect(dx).toBe(-25)
        expect(dy).toBe(-25)
      })
    })
  })

  describe("circleEnclosure", () => {
    describe("renders defaults", () => {
      const EnclosedCircle = circleEnclosure({
        d: {},
        i: 1,
        circle: {
          x: 50,
          y: 50,
          r: 15
        }
      })

      const mounted = mount(<svg>{EnclosedCircle}</svg>)

      it("an annotation", () => {
        const foundAnnotation = mounted.find("Annotation")
        expect(foundAnnotation.length).toBe(1)
      })
      it.only("passes noteVals: {dx: 0, dy: 0, padding: 2}", () => {
        const {
          noteData: {
            dx,
            dy,
            subject: { radiusPadding }
          }
        } = mounted.find("SemioticAnnotation").props()
          
        expect(dx).toBe(0)
        expect(dy).toBe(0)
        expect(radiusPadding).toBe(2)
      })
    })

    describe("with d.rp = 'top' and rd = 10", () => {
      const EnclosedCircle = circleEnclosure({
        d: {
          radiusPadding: 5,
          rp: "top",
          rd: 10
        },
        i: 1,
        circle: {
          x: 100,
          y: 100,
          r: 25
        }
      })

      const mounted = mount(<svg>{EnclosedCircle}</svg>)
      it("passes noteVals: {dx: 0, dy: -25}", () => {
        const { dx, dy } = mounted.find("SemioticAnnotation").prop("noteData")
        expect(dx).toBe(0)
        expect(dy).toBe(-35)
      })
    })

    describe("with d.rp = 'bottom' and rd = 10", () => {
      const EnclosedCircle = circleEnclosure({
        d: {
          radiusPadding: 5,
          rp: "bottom",
          rd: 10
        },
        i: 1,
        circle: {
          x: 100,
          y: 100,
          r: 25
        }
      })

      const mounted = mount(<svg>{EnclosedCircle}</svg>)
      it("passes noteVals: {dx: 0, dy: 35}", () => {
        const { dx, dy } = mounted.find("SemioticAnnotation").prop("noteData")
        expect(dx).toBe(0)
        expect(dy).toBe(35)
      })
    })

    describe("with d.rp = 'left' and rd = 10", () => {
      const EnclosedCircle = circleEnclosure({
        d: {
          radiusPadding: 5,
          rp: "left",
          rd: 10
        },
        i: 1,
        circle: {
          x: 100,
          y: 100,
          r: 25
        }
      })

      const mounted = mount(<svg>{EnclosedCircle}</svg>)
      it("passes noteVals: {dx: -35, dy: 0}", () => {
        const { dx, dy } = mounted.find("SemioticAnnotation").prop("noteData")
        expect(dx).toBe(-35)
        expect(dy).toBe(0)
      })
    })

    describe("with d.rp = 'right' and rd = 10", () => {
      const EnclosedCircle = circleEnclosure({
        d: {
          radiusPadding: 5,
          rp: "right",
          rd: 10
        },
        i: 1,
        circle: {
          x: 100,
          y: 100,
          r: 25
        }
      })

      const mounted = mount(<svg>{EnclosedCircle}</svg>)
      it("passes noteVals: {dx: 35, dy: 0}", () => {
        const { dx, dy } = mounted.find("SemioticAnnotation").prop("noteData")
        expect(dx).toBe(35)
        expect(dy).toBe(0)
      })
    })

    describe("hullEnclosure", () => {
      describe("renders defaults", () => {
        const EnclosedHull = hullEnclosure({
          points: [
            [10, 10],
            [20, 20],
            [10, 30]
          ],
          d: {},
          i: 1
        })
        const mounted = mount(<svg>{EnclosedHull}</svg>)

        it("an annotation", () => {
          const foundAnnotation = mounted.find("Annotation")
          expect(foundAnnotation.length).toBe(1)
        })

        it("passes noteData: { dx: -25, dy: -25 }", () => {
          const noteData = mounted.find("SemioticAnnotation").prop("noteData")

          const { dx, dy } = noteData

          expect(dx).toBe(-25)
          expect(dy).toBe(-25)
        })
      })
    })
  })
})
