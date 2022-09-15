import React from "react"
import { mount } from "enzyme"
import { scaleLinear } from "d3-scale"
import {
  svgXYAnnotation,
  basicReactAnnotation,
  htmlTooltipAnnotation,
  pointsAlong,
  svgXAnnotation,
  svgYAnnotation,
  svgAreaAnnotation,
  svgBoundsAnnotation,
  svgEncloseAnnotation,
  svgHighlight,
  svgHullEncloseAnnotation,
  svgLineAnnotation,
  svgRectEncloseAnnotation
} from "./xyframeRules"

describe("xyframeRules", () => {
  describe("svgXYAnnotation", () => {
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
      expect(wrappedLine.find("Mark").length).toBe(1)
      expect(wrappedLabel.find("Mark").length).toBe(0)
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
          type: "xy"
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
      const annotation = wrapped.find("SemioticAnnotation")
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
  describe("svgBoundsAnnotation", () => {
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
    const annotation = wrappedLine.find("SemioticAnnotation")
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
        className: "mock-class"
      },
      i: 1
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
      expect(itsClass).toBe(`annotation annotation-line mock-class `)
    })
    it("Label is a Mark with passed className prop", () => {
      const { className: itsClass } = wrappedLabel
        .find("Mark")
        .props("className")
      expect(itsClass).toBe(`annotation annotation-line-label mock-class `)
    })
  })
  describe("svgAreaAnnotation", () => {
    const ThisRes = svgAreaAnnotation({
      d: {
        coordinates: [
          { x: 100, y: 100 },
          { x: 120, y: 80 },
          { x: 140, y: 40 },
          { x: 160, y: 120 }
        ],
        className: "testing-for-dummies"
      },
      i: 1,
      xAccessor: [(d) => d.x],
      yAccessor: [(d) => d.y],
      xScale: scaleLinear(),
      yScale: scaleLinear(),
      annotationLayer: {
        position: [10, 10]
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
      expect(itsClass).toBe(
        `annotation annotation-area-label testing-for-dummies `
      )
    })
  })
  describe("htmlTooltipAnnotation", () => {
    it("returns a SpanOrDiv without useSpan prop, passing props", () => {
      const ThisRes = htmlTooltipAnnotation({
        content: "test",
        screenCoordinates: [867, 5309],
        i: 1,
        d: {
          className: "geographemetry"
        }
      })

      const wrapped = mount(<svg>{ThisRes}</svg>)
      const elm = wrapped.find("SpanOrDiv")
      expect(wrapped.length).toBe(1)
      expect(elm.text()).toBe("test")

      const {
        className,
        style: { top, left },
        span
      } = elm.props()
      expect(className).toBe("annotation annotation-xy-label geographemetry ")
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
  describe("svgRectEncloseAnnotation", () => {
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
  describe("svgEncloseAnnotation", () => {
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
  describe("svgHullEncloseAnnotation", () => {
    const ThisRes = svgHullEncloseAnnotation({
      d: {},
      i: 1,
      screenCoordinates: [
        [100, 100],
        [100, 200],
        [150, 150]
      ]
    })
    const wrappedLine = mount(<svg>{ThisRes}</svg>)
    const annotation = wrappedLine.find("SemioticAnnotation")
    it("returns an annotation", () => {
      expect(annotation.length).toBe(1)
    })
  })
  describe("pointsAlong", () => {
    it("returns null with no meaningful data in params", () => {
      const middleMandFn = pointsAlong("x")
      const withX = middleMandFn({
        d: {},
        lines: [],
        points: [],
        xScale: scaleLinear().domain([0, 100]).range([0, 100]),
        yScale: scaleLinear().domain([0, 100]).range([0, 100]),
        pointScale: scaleLinear()
      })
      expect(withX).toBe(null)
    })

    it("returns an array list of circles from lines prop", () => {
      const middleMandFn = pointsAlong("x")
      const ThisArray = middleMandFn({
        d: {
          x: 50,
          threshold: 88,
          r: () => 4,
          styleFn: () => ({ fill: 'skyblue' })
        },
        lines: [
          { data: [{ x: 10, y: 10 }] },
          { data: [{ x: 20, y: 20 }] },
          { data: [{ x: 30, y: 30 }] },
          { data: [{ x: 40, y: 40 }] },
          { data: [{ x: 50, y: 50 }] }
        ],
        points: [],
        xScale: scaleLinear(),
        yScale: scaleLinear(),
        pointScale: scaleLinear()
      })
      const arrayOfCircles = mount(<svg>{ThisArray}</svg>).find('circle')
      expect(arrayOfCircles.length).toBe(5)
    })

    it("returns an array list of circles from points prop", () => {
      const middleMandFn = pointsAlong("x")
      const ThisArray = middleMandFn({
        d: {
          x: 50,
          threshold: 88,
          r: () => 4,
          styleFn: () => ({ fill: "skyblue" })
        },
        points: [
          { x: 10, y: 10 },
          { x: 20, y: 20 },
          { x: 30, y: 30 }, 
          { x: 40, y: 40 },
          { x: 50, y: 50 }
        ],
        lines: [],
        xScale: scaleLinear(),
        yScale: scaleLinear(),
        pointScale: scaleLinear()
      })
      const arrayOfCircles = mount(<svg>{ThisArray}</svg>).find("circle")
      expect(arrayOfCircles.length).toBe(5)
    })
  })
  describe("svgHighlight", () => { 
    describe('renders', () => { 
      it("from summaries", () => {
        const ThisResult = svgHighlight({
          d: {
            id: 123
          },
          i: 2,
          points: {
            data: []
          },
          lines: {
            data: [],
            type: {
              curve: "linear"
            }
          },
          summaries: {
            data: [
              {
                id: 123,
                coordinates: [25, 25]
              }
            ]
          },
          idAccessor: (d) => d.id,
          xScale: scaleLinear(),
          yScale: scaleLinear(),
          xyFrameRender: {
            summaries: {
              styleFn: () => ({ stroke: "black" })
            }
          }
        })
        const { d : mountedPathDAttr } = mount(<svg>{ThisResult}</svg>).find('path').props()
        
        expect(mountedPathDAttr).toBe(`M25L25`)
      })

      it("from lines", () => {
        const ThisResult = svgHighlight({
          d: {
            id: 123
          },
          i: 2,
          points: {
            data: []
          },
          summaries: {
            data: []
          },
          lines: {
            styleFn: () => ``,
            type: {
              curve: "linear"
            },
            data: [{
              id: 123,
              x: 25,
              y: 25,
              yBottom: 5,
              yTop: 5,
              data: [25, 25]
            }]
          },
          idAccessor: (d) => d.id,
          xScale: scaleLinear().domain([0, 100]).range([0, 100]),
          yScale: scaleLinear().domain([0, 100]).range([0, 100]),
          xyFrameRender: {
            lines: {
              styleFn: () => ``
            }
          }
        })
        const path = mount(<svg>{ThisResult}</svg>).find('path')
        expect(path.length).toBe(1)
      })
    })

    it("from points", () => {
        const ThisResult = svgHighlight({
          d: {
            id: 123
          },
          i: 2,
          lines: {
            type: {
              curve: 'linear'
            },
            data: []
          },
          summaries: {
            data: []
          },
          points: {
            styleFn: () => ``,
            type: {
              curve: "linear"
            },
            data: [{
              id: 123
            }]
          },
          idAccessor: (d) => d.id,
          xScale: scaleLinear().domain([0, 100]).range([0, 100]),
          yScale: scaleLinear().domain([0, 100]).range([0, 100]),
          xyFrameRender: {
            points: {
              styleFn: () => ``
            }
          }
        })
        const mounted = mount(<svg>{ThisResult}</svg>)
        console.log('mounted.debug()')
        console.log(mounted.debug())
        
        expect(mounted.length).toBe(1)
      })
    })
  // })
})
