import React from "react"
import { mount } from "enzyme"
import { scaleLinear } from "d3-scale"
import {
  svgXYAnnotation,
  basicReactAnnotation,
  svgXAnnotation,
  svgYAnnotation,
  svgBoundsAnnotation,
  svgLineAnnotation,
  svgAreaAnnotation,
  htmlTooltipAnnotation,
  svgRectEncloseAnnotation,
  svgEncloseAnnotation,
  svgHullEncloseAnnotation
} from "./xyframeRules"

describe("xyframeRules", () => {
  describe('svgXYAnnotation', () => {
    
    it("without d.type === xy, returns 1 Mark, skipping label", () => {
      const ThisRes = svgXYAnnotation({
        screenCoordinates: [
          [100, 100],
          [120, 80],
          [140, 40],
          [160, 120]
        ],
        d: {
          label: "test",
          className: "mock-class"
        },
        i: 1
      })
      const wrappedLine = mount(<svg>{ThisRes[0]}</svg>)
      const wrappedLabel = mount(<svg>{ThisRes[1]}</svg>)
      expect(wrappedLine.find('Mark').length).toBe(1)
      expect(wrappedLabel.find('Mark').length).toBe(0)
    })
    it("with d.type === xy, returns 2 Marks, including label", () => {
      const ThisRes = svgXYAnnotation({
        screenCoordinates: [
          [100, 100],
          [120, 80],
          [140, 40],
          [160, 120]
        ],
        d: {
          label: "test",
          className: "mock-class",
          type: 'xy'
        },
        i: 1
      })
      const wrappedLine = mount(<svg>{ThisRes[0]}</svg>)
      const wrappedLabel = mount(<svg>{ThisRes[1]}</svg>)
      expect(wrappedLine.length).toBe(1)
      expect(wrappedLabel.find("Mark").length).toBe(1)
    })
  })
  describe("basicReactAnnotation returns an annotation", () => {
    it("leveraging screenCoordinates prop without fixedY", () => {
      const ThisRes = basicReactAnnotation({
        screenCoordinates: [100, 100],
        d: {},
        i: 1
      })
      const wrapped = mount(<svg>{ThisRes}</svg>)
      const { noteData } = wrapped.find("SemioticAnnotation").props("noteData")

      expect(wrapped.length).toBe(1)
      expect(noteData.x).toBe(100)
      expect(noteData.y).toBe(100)
    })

    it("leveraging fixed coordinate props ", () => {
      const ThisRes = basicReactAnnotation({
        screenCoordinates: [100, 100],
        d: {
          fixedX: 200,
          fixedY: 200
        },
        i: 1
      })
      const wrapped = mount(<svg>{ThisRes}</svg>)
      const { noteData } = wrapped.find("SemioticAnnotation").props("noteData")

      expect(wrapped.length).toBe(1)
      expect(noteData.x).toBe(200)
      expect(noteData.y).toBe(200)
    })
  })
  describe("svgXAnnotation", () => {
    it("returns an Annotation", () => {
      const ThisRes = svgXAnnotation({
        screenCoordinates: [100, 100],
        d: {},
        i: 1,
        adjustedSize: [123, 234]
      })
      const wrapped = mount(<svg>{ThisRes}</svg>)
      const annotation = wrapped.find('SemioticAnnotation')
      expect(annotation.length).toBe(1)
    })
  })
  describe("svgYAnnotation", () => {
    it("returns an Annotation", () => {
      const ThisRes = svgYAnnotation({
        screenCoordinates: [100, 100],
        d: {},
        i: 1,
        adjustedSize: [123, 234],
        adjustedPosition: [234, 345]
      })
      const wrapped = mount(<svg>{ThisRes}</svg>)
      const annotation = wrapped.find("SemioticAnnotation")
      expect(annotation.length).toBe(1)
    })
  })
  describe('svgBoundsAnnotation', () => {
    const ThisRes = svgBoundsAnnotation({
      d: {
        coordinates: [
          { x: 100, y: 100 },
          { x: 120, y: 80 },
          { x: 140, y: 40 },
          { x: 160, y: 120 }
        ],
        className: "testing-for-dummies",
        bounds: [20, 200]
      },
      i: 1,
      xAccessor: [(d) => d.x],
      yAccessor: [(d) => d.y],
      xScale: scaleLinear(),
      yScale: scaleLinear(),
      adjustedSize: [100, 100]
    })
    const wrappedLine = mount(<svg>{ThisRes}</svg>)
    const annotation = wrappedLine.find('SemioticAnnotation')
    it("returns an annotation", () => {
      expect(annotation.length).toBe(1)
    })
  })
  describe("svgLineAnnotation", () => {
    const ThisRes = svgLineAnnotation({
      screenCoordinates: [
        [100, 100],
        [120, 80],
        [140, 40],
        [160, 120]
      ],
      d: {
        label: "test",
        className:'mock-class'
      },
      i: 1
    })
    const wrappedLine = mount(<svg>{ThisRes[0]}</svg>)
    const wrappedLabel = mount(<svg>{ThisRes[1]}</svg>)

    it("returns an array of Marks", () => {  
      expect(wrappedLine.length).toBe(1)
      expect(wrappedLabel.length).toBe(1)
    })

    it('Line is a Mark with passed className prop', () => { 
      const { className: itsClass } = wrappedLine.find('Mark').props('className')
      expect(itsClass).toBe(`annotation annotation-line mock-class `)
    })
    it("Label is a Mark with passed className prop", () => {
      const { className: itsClass } = wrappedLabel
        .find("Mark")
        .props("className")
      expect(itsClass).toBe(`annotation annotation-line-label mock-class `)
    })
  })
  describe('svgAreaAnnotation', () => {
    const ThisRes = svgAreaAnnotation({
      d: {
        coordinates: [
          { x: 100, y: 100 },
          { x: 120, y: 80 },
          { x: 140, y: 40 },
          { x: 160, y: 120 }
        ],
        className: 'testing-for-dummies'
      },
      i: 1,
      xAccessor: [(d) => d.x],
      yAccessor: [(d) => d.y],
      xScale: scaleLinear(),
      yScale: scaleLinear(),
      annotationLayer: {
        position: [10,10]
      }
    })
    const wrappedLine = mount(<svg>{ThisRes[0]}</svg>)
    const wrappedLabel = mount(<svg>{ThisRes[1]}</svg>)

    it("returns an array of Marks", () => {
      expect(wrappedLine.length).toBe(1)
      expect(wrappedLabel.length).toBe(1)
    })

    it("Line is a Mark with passed className prop", () => {
      const { className: itsClass } = wrappedLine
        .find("Mark")
        .props("className")
      expect(itsClass).toBe(`annotation annotation-area testing-for-dummies `)
    })
    it("Label is a Mark with passed className prop", () => {
      const { className: itsClass } = wrappedLabel
        .find("Mark")
        .props("className")
      expect(itsClass).toBe(`annotation annotation-area-label testing-for-dummies `)
    })
  })
  describe('htmlTooltipAnnotation', () => {
    it('returns a SpanOrDiv without useSpan prop, passing props', () => { 
      const ThisRes = htmlTooltipAnnotation({
        content: 'test',
        screenCoordinates: [867, 5309],
        i: 1,
        d: {
          className: 'geographemetry'
        }
      })

      const wrapped = mount(<svg>{ThisRes}</svg>)
      const elm = wrapped.find('SpanOrDiv')
      expect(wrapped.length).toBe(1)
      expect(elm.text()).toBe('test')

      const { className, style: { top, left }, span } = elm.props()
      expect(className).toBe(
        "annotation annotation-xy-label geographemetry "
      )
      expect(left).toBe("867px")
      expect(top).toBe("5309px")
      expect(span).toBe(undefined)
    })
    it("returns a SpanOrDiv with useSpan prop", () => {
      const WithSpan = htmlTooltipAnnotation({
        content: "test",
        screenCoordinates: [867, 5309],
        i: 1,
        d: {
          className: "geographemetry"
        },
        useSpans: true
      })

      const wrapped = mount(<svg>{WithSpan}</svg>)
      const elm = wrapped.find("SpanOrDiv")
      expect(wrapped.length).toBe(1)
      
      const { span } = elm.props()
      expect(span).toBe(true)
    })
  })
  describe('svgRectEncloseAnnotation', () => {
    it("renders a SemioticAnnotation", () => {
      const ThisRes = svgRectEncloseAnnotation({
        d: {},
        i: 1,
        screenCoordinates: [
          [100, 100],
          [120, 80],
          [140, 40],
          [160, 120]
        ]
      })
      const mounted = mount(<svg>{ThisRes}</svg>)
      const annotation = mounted.find("SemioticAnnotation")
      expect(annotation.length).toBe(1)
    })
  })
  describe('svgEncloseAnnotation', () => {
     it("renders a SemioticAnnotation", () => {
       const ThisRes = svgEncloseAnnotation({
         d: {},
         i: 1,
         screenCoordinates: [
           [100, 100],
           [120, 80],
           [140, 40],
           [160, 120]
         ]
       })
       const mounted = mount(<svg>{ThisRes}</svg>)
       const annotation = mounted.find("SemioticAnnotation")
       expect(annotation.length).toBe(1)
     })
  })
  describe('svgHullEncloseAnnotation', () => {
    const ThisRes = svgHullEncloseAnnotation({
      d: {},
      i: 1,
      screenCoordinates: [
        [100,100],
        [100,200],
        [150,150]
      ]
    })
    const wrappedLine = mount(<svg>{ThisRes}</svg>)
    const annotation = wrappedLine.find("SemioticAnnotation")
    it("returns an annotation", () => {
      expect(annotation.length).toBe(1)
    })
  })
})
