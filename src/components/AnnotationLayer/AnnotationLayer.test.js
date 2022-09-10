import React from "react"
import { mount } from "enzyme"
import AnnotationLayer, { processAnnotations } from "./AnnotationLayer"
import { TooltipProvider } from "./../store/TooltipStore"
import {
  marginOffsetFn,
  adjustedAnnotationKeyMapper,
  safeStringify,
  noteDataHeight,
  noteDataWidth,
  keyFromSVGAnnotations
} from "./helpers"
const svgAnnotationRule = (d, i) => (
  <g key={`annotation-${i}`}>
    <text>Just a blank</text>
  </g>
)
const htmlAnnotationRule = (d, i) => (
  <div key={`annotation-${i}`}> Just a blank</div>
)
const voronoiHover = () => {}

const annotations = [
  { type: "react-annotation", label: "first", x: 5, y: 5 },
  { type: "frame-hover", label: "hover" }
]

describe("AnnotationLayer", () => {
  const X_VAL = 12
  const Y_VAL = 15
  const LABEL = "qwer"
  const TITLE = "asdf"
  const ID = 1234

  const mockPropNoId = {
    props: {
      noteData: {
        x: X_VAL,
        y: Y_VAL,
        note: {
          label: LABEL,
          title: TITLE
        }
      }
    }
  }
  describe('helper functions', () => { 
    describe("marginOffsetFn", () => { 
      const mockAxisSettings = [
        {
          props: {
            orient: "left"
          }
        }
      ]
      it('returns marginOffset prop value when it is a number', () => { 
        const res = marginOffsetFn(null, null, 10)
        expect(res).toBe(10)
      })
      it('returns 50 when axisSettings[0].props.orient matches orient matches orient prop', () => {
        const res = marginOffsetFn("left", mockAxisSettings, {})
        expect(res).toBe(50)
      })
      it('returns 10 when above 2 scenarios don\'t happen', () => { 
        const res = marginOffsetFn("top", mockAxisSettings, {})
        expect(res).toBe(10)
      })
    })

    describe('adjustedAnnotationKeyMapper', () => { 
      it('returns empty string when !prop.props.noteData', () => { 
        const res = adjustedAnnotationKeyMapper({})
        expect(res).toBe("")
      })
      it('returns "x-y-label-title" when no id val in prop', () => { 
        const res = adjustedAnnotationKeyMapper(mockPropNoId)
        expect(res).toBe(`${X_VAL}-${Y_VAL}-${LABEL}=${TITLE}`)
      })
      it('returns "id-label-title" when no id in prop', () => {
        const thisTestObj = {
          ...mockPropNoId,
          props: {
            ...mockPropNoId.props,
            noteData: {
              ...mockPropNoId.props.noteData,
              id: ID
            }
          }
        }        
        const res = adjustedAnnotationKeyMapper(thisTestObj)
        expect(res).toBe(`${ID}-${LABEL}=${TITLE}`)
      })
    })

    describe("safeStringify", () => {
      const testOne = {
        type: "frame-hover",
        label: "hover",
        voronoiX: "a",
        voronoiY: "b",
        dx: "c",
        dy: "d",
        x: "e",
        y: "f",
        key: "g",
        hierarchicalID: "h",
        id: "i",
        name: "j"
      }

      it("returns quoted & dashed-string from input keys", () => {
        const res = safeStringify(testOne)
        expect(res).toBe('"a-b-c-d-e-f-hover-frame-hover-g-h-i-j"')
      })

      it('returns "..." when no expected keys are in input param', () => {
        const res = safeStringify({})
        expect(res).toBe('"..."')
      })

      it("returns v.column.x-v.column.y-v.column.name when v.column is an object", () => {
        const res = safeStringify({
          column: {
            x: "a",
            y: "b",
            name: "c"
          }
        })
        expect(res).toBe('"a-b-c"')
      })

      it('returns input with quotes when input is not an object', () => { 
        
        // string
        const res = safeStringify('test')
        expect(res).toBe('"test"')

        // number
        const numberRes = safeStringify(1234)
        expect(numberRes).toBe('1234')
      })

    })

    describe("noteDataWidth", () => {
      it('returns noteData.noteWidth value when it is a number', () => { 
        const noteData = { noteWidth: 0, note: {} }
        const resOne = noteDataWidth(noteData, 8)
        expect(resOne).toBe(0)

        const noteDataTwo = { noteWidth: 3000, note: {} }
        const resTwo = noteDataWidth(noteDataTwo, 8)
        expect(resTwo).toBe(3000)
      })

      it('returns length of note.label * charWidth when less than 120', () => { 
        const thisNoteData = { noteWidth: null, note: { label: 'this has 11' } }
        const resOne = noteDataWidth(thisNoteData, 8)
        expect(resOne).toBe(88)
      })

      it("returns 120 when length of note.label * charWidth is greater than than 120", () => {
        const thisNoteData = { noteWidth: null, note: { label: "this one has 15" } }
        const resOne = noteDataWidth(thisNoteData, 8)
        expect(resOne).toBe(120)
      })

      it("returns input wrap value when it is less than the internal calculated width", () => {
        const thisNoteData = {
          noteWidth: null,
          note: { wrap: 85, label: "this one has 15" }
        }
        const resOne = noteDataWidth(thisNoteData, 8)
        expect(resOne).toBe(85)
      })
    })

    describe("noteDataHeight", () => {
      it("returns noteData.noteHeight value when it is a number", () => {
        const noteData = { noteHeight: 0, note: {} }
        const resOne = noteDataHeight(noteData, 8)
        expect(resOne).toBe(0)

        const noteDataTwo = { noteHeight: 3000, note: {} }
        const resTwo = noteDataHeight(noteDataTwo, 8)
        expect(resTwo).toBe(3000)
      })

      it("returns default of 0", () => {
        const thisNoteData = { noteHeight: null, note: { wrap: null, label: '' } }
        const resOne = noteDataHeight(thisNoteData, 8, 20)
        expect(resOne).toBe(0)
      })

      it("returns 30 when noteData.note is a react element", () => {
        const Foo = () => <span/>
        const thisNoteData = {
          noteHeight: null,
          note: <Foo />
        }
        const resOne = noteDataHeight(thisNoteData, 8, 20)
        expect(resOne).toBe(30)
      })
    })

    describe("keyFromSVGAnnotations", () => { 
      it('returns input 2nd object + array stingified when first param is empty arr', () => { 
        const res = keyFromSVGAnnotations([], { layout: { type: undefined }, dataVersion: '' }, [400, 400])
        expect(res).toBe('{"layout":{},"dataVersion":""}400,400')
      })

      it("returns more complex parsing of input when first array has object", () => {
        const res = keyFromSVGAnnotations(
          [mockPropNoId],
          { layout: { type: undefined }, dataVersion: "" },
          [400, 400]
        )
        expect(res).toBe('12-15-qwer=asdf{"layout":{},"dataVersion":""}400,400')
      })
    })
  })

  it("renders without crashing", () => {
    mount(
      <TooltipProvider>
        <AnnotationLayer
          margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
          size={[400, 400]}
          useSpans={false}
          annotations={annotations}
          svgAnnotationRule={svgAnnotationRule}
          htmlAnnotationRule={htmlAnnotationRule}
          voronoiHover={voronoiHover}
        />
      </TooltipProvider>
    )
  })

  const mountedLayerWithOptions = mount(
    <TooltipProvider>
      <AnnotationLayer
        margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
        size={[400, 400]}
        useSpans={false}
        annotations={annotations}
        svgAnnotationRule={svgAnnotationRule}
        htmlAnnotationRule={htmlAnnotationRule}
        voronoiHover={voronoiHover}
      />
    </TooltipProvider>
  )
  it("creates a div and an SVG with annotations", () => {
    expect(mountedLayerWithOptions.find("svg").length).toEqual(1)
    //        expect(mountedLayerWithOptions.find("g.annotation").length).toEqual(1)
  })

  it("includes a legend with legendSettings prop", () => { 
    const mockLegendStyleFn = jest.fn()
    const mockClickFn = jest.fn()
    const tooltipElement = mount(
      <TooltipProvider>
        <AnnotationLayer
          margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
          size={[400, 400]}
          useSpans={false}
          annotations={annotations}
          svgAnnotationRule={svgAnnotationRule}
          htmlAnnotationRule={htmlAnnotationRule}
          voronoiHover={voronoiHover}
          legendSettings={{
            legendGroups: [
              {
                styleFn: mockLegendStyleFn,
                items: [annotations.map((d) => d.label)],
                label: "mock-legend-grp-label"
              }
            ],
            customClickBehavior: mockClickFn,
            title: "mock-legend",
            width: 300,
            height: 300,
            position: "left"
          }}
        />
      </TooltipProvider>
    )

    const legendElement = tooltipElement.find('Legend')
    expect(legendElement.length).toBe(1)
    
  })
})
