import * as React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, render, renderHook, waitFor } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { scaleLinear } from "d3-scale"
import { clearCache, prepareWithSegments } from "@chenglou/pretext"
import Annotation from "../Annotation"
import { annotationLayout } from "../recipes/annotationLayout"
import { createDefaultAnnotationRules } from "../charts/shared/annotationRules"
import { renderStaticAnnotations } from "../server/staticAnnotations"
import { LIGHT_THEME } from "../store/themeCore"
import {
  createPretextNoteMeasurer,
  resolvePretextOptions
} from "./pretextAnnotationLayout"
import { usePretextAnnotations } from "./usePretextAnnotations"
import type { AnnotationNoteText } from "./annotationTextLayout"

// Deliberately return an over-wide line: verify our painted-width safeguard
// independently of Pretext's predictions. Real-engine coverage runs in browsers.
vi.mock("@chenglou/pretext", () => ({
  clearCache: vi.fn(),
  prepareWithSegments: vi.fn((text: string) => ({ text })),
  layoutWithLines: vi.fn((handle: { text: string }) => ({
    lines: [{ text: handle.text, width: 0 }]
  }))
}))

const raw = [
  {
    type: "callout",
    x: 160,
    y: 100,
    title: "Wide title",
    label: "WWWW iiiiii",
    wrap: 42
  }
]
const fontSet = Object.assign(new EventTarget(), {
  load: vi.fn(async () => [])
})
const originalFonts = Object.getOwnPropertyDescriptor(document, "fonts")

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: fontSet
  })
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () =>
      ({
        font: "12px Arial",
        measureText(text: string) {
          const units = Array.from(
            new Intl.Segmenter().segment(text),
            (g) => g.segment
          )
          const width = units.reduce(
            (sum, g) => sum + (g === "i" ? 2 : g === " " ? 3 : 10),
            0
          )
          return { width: width * (this.font.startsWith("700") ? 1.2 : 1) }
        }
      }) as CanvasRenderingContext2D
  )
})
afterEach(() => {
  vi.restoreAllMocks()
  if (originalFonts) Object.defineProperty(document, "fonts", originalFonts)
  else Reflect.deleteProperty(document, "fonts")
})

function measurer() {
  const measure = createPretextNoteMeasurer(
    resolvePretextOptions({ fontFamily: "Arial", lineHeight: 20 })
  )
  expect(measure).toBeTypeOf("function")
  return measure!
}

describe("optional Pretext note layout", () => {
  it("fits whole rendered runs, preserves graphemes, and measures title weight separately", () => {
    const measure = measurer()
    const layout = measure({ label: "👩🏽‍💻👩🏽‍💻👩🏽‍💻", title: "WWW", wrap: 25 })!
    expect(layout.labelLines).toEqual(["👩🏽‍💻👩🏽‍💻", "👩🏽‍💻"])
    expect(layout.titleLines).toEqual(["WW", "W"])
    expect(layout.width).toBe(24)
    expect(layout.height).toBe(82)
    expect(prepareWithSegments).toHaveBeenCalledWith("WWW", "700 12px Arial")
  })

  it("reuses preparation while widths change and materialized results while positions change", () => {
    const measure = measurer()
    const first = measure(raw[0])!
    const wider = measure({ ...raw[0], wrap: 100 })!
    expect(wider.labelLines.length).toBeLessThan(first.labelLines.length)
    expect(prepareWithSegments).toHaveBeenCalledTimes(2)
    expect(measure({ ...raw[0] })).toBe(first)
    expect(measure({ ...raw[0], noWrap: true })!.labelLines).toEqual([
      raw[0].label
    ])
  })

  it("bounds retained results and releases shared segment caches for changing notes", () => {
    const measure = measurer()
    const first = measure({ label: "note 0" })
    for (let i = 1; i < 260; i++) measure({ label: `note ${i}` })
    expect(clearCache).toHaveBeenCalled()
    expect(measure({ label: "note 0" })).not.toBe(first)
  })

  it.each(["label", "callout", "callout-circle", "callout-rect"])(
    "paints the same %s lines, font, and line height supplied to placement",
    (type) => {
      const measure = vi.fn(measurer())
      const annotations = [{ ...raw[0], type, _noteLayout: measure }]
      const context = {
        width: 320,
        height: 240,
        scales: { x: scaleLinear(), y: scaleLinear() },
        frameType: "xy" as const
      }
      const [placed] = annotationLayout({ annotations, context })
      expect(measure).toHaveBeenCalledWith(annotations[0])
      const rules = createDefaultAnnotationRules("xy")
      const { container } = render(<svg>{rules(placed, 0, context)}</svg>)
      const note = container.querySelector(".annotation-note")!
      const expected = measure(placed)!
      expect(note.getAttribute("font-family")).toBe("Arial")
      expect(note.getAttribute("font-size")).toBe("12")
      expect(
        Array.from(
          note.querySelectorAll(".annotation-note-label tspan"),
          (t) => t.textContent
        )
      ).toEqual(expected.labelLines)
      expect(note.querySelectorAll('tspan[dy="20"]').length).toBeGreaterThan(0)
    }
  )

  it("remeasures responsive copy instead of using cached lines from the original note", () => {
    const measure = vi.fn(measurer())
    const [placed] = annotationLayout({
      annotations: [{ ...raw[0], mobileText: "Short", _noteLayout: measure }],
      context: { width: 300, height: 240, scales: null, frameType: "xy" },
      mobile: true
    })
    expect(placed.label).toBe("Short")
    expect(measure.mock.calls.some(([note]) => note.label === "Short")).toBe(
      true
    )
    expect(measure(placed)!.labelLines.join("")).toBe("Short")
  })

  it("applies noWrap through the adapter while preserving the default flat-note behavior", () => {
    const annotation = {
      ...raw[0],
      noWrap: true,
      label: "Wide words and more words"
    }
    const rules = createDefaultAnnotationRules("xy")
    const context = {
      width: 320,
      height: 240,
      scales: { x: scaleLinear(), y: scaleLinear() },
      frameType: "xy" as const
    }
    const normal = render(<svg>{rules(annotation, 0, context)}</svg>)
    expect(
      normal.container.querySelectorAll(".annotation-note-label tspan").length
    ).toBeGreaterThan(1)
    normal.unmount()
    const measured = render(
      <svg>{rules({ ...annotation, _noteLayout: measurer() }, 0, context)}</svg>
    )
    expect(
      measured.container.querySelectorAll(".annotation-note-label tspan")
    ).toHaveLength(1)
  })

  it.each(["label", "callout", "callout-circle", "callout-rect", "bracket"])(
    "preserves measured %s notes in live and static rendering",
    (type) => {
      const _noteLayout = measurer()
      const annotation = { ...raw[0], type, width: 40, height: 20, _noteLayout }
      const output = renderStaticAnnotations({
        annotations: [annotation],
        scales: {},
        layout: { width: 320, height: 240 },
        theme: LIGHT_THEME
      })
      const markup = renderToString(<svg>{output}</svg>)
      expect(markup).toContain('data-text-layout="pretext"')
      expect(markup).toContain('font-family="Arial"')
      const rules = createDefaultAnnotationRules("xy")
      const live = renderToString(
        <svg>
          {rules(annotation, 0, {
            width: 320,
            height: 240,
            scales: { x: scaleLinear(), y: scaleLinear() },
            frameType: "xy"
          })}
        </svg>
      )
      expect(live).toContain('data-text-layout="pretext"')
      expect(live).toContain('font-family="Arial"')
    }
  )

  it("includes visible provenance when measuring the box before placement", () => {
    const measure = vi.fn(measurer())
    const [placed] = annotationLayout({
      annotations: [
        {
          ...raw[0],
          defensive: true,
          provenance: { source: "ai", confidence: 0.7 },
          _noteLayout: measure
        }
      ],
      context: { width: 320, height: 240, scales: null, frameType: "xy" }
    })
    expect(placed.label).toContain("70%")
    expect(measure.mock.calls[0][0].label).toBe(placed.label)
  })
})

describe("usePretextAnnotations", () => {
  it("does not measure during SSR or mutate its input", async () => {
    function ServerNote() {
      const [a] = usePretextAnnotations(raw)
      return <Annotation noteData={{ ...a, note: a }} />
    }
    expect(renderToString(<ServerNote />)).not.toContain(
      'data-text-layout="pretext"'
    )
    expect(prepareWithSegments).not.toHaveBeenCalled()
    const original = structuredClone(raw)
    const other = { type: "x-threshold", value: 20, label: "Threshold" }
    const { result } = renderHook(() => usePretextAnnotations([...raw, other]))
    await waitFor(() =>
      expect((result.current[0] as AnnotationNoteText)._noteLayout).toBeTypeOf(
        "function"
      )
    )
    expect(raw).toEqual(original)
    expect(result.current[1]).toBe(other)
  })

  it("waits for fonts, invalidates on load, and removes listeners on unmount", async () => {
    const remove = vi.spyOn(fontSet, "removeEventListener")
    let loaded!: () => void
    fontSet.load.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          loaded = () => resolve([])
        })
    )
    const { result, unmount } = renderHook(() => usePretextAnnotations(raw))
    expect(
      (result.current[0] as AnnotationNoteText)._noteLayout
    ).toBeUndefined()
    await act(async () => loaded())
    await waitFor(() =>
      expect((result.current[0] as AnnotationNoteText)._noteLayout).toBeTypeOf(
        "function"
      )
    )
    const initial = (result.current[0] as AnnotationNoteText)._noteLayout
    await act(async () => {
      fontSet.dispatchEvent(new Event("loadingdone"))
    })
    expect((result.current[0] as AnnotationNoteText)._noteLayout).not.toBe(
      initial
    )
    expect(prepareWithSegments).toHaveBeenCalledWith("M", "1px serif")
    unmount()
    expect(remove).toHaveBeenCalledWith("loadingdone", expect.any(Function))
  })

  it("supports disabling and changing typography without retaining the previous engine", async () => {
    const { result, rerender } = renderHook(
      ({ enabled, fontFamily }) =>
        usePretextAnnotations(raw, { enabled, fontFamily }),
      { initialProps: { enabled: true, fontFamily: "Arial" } }
    )
    await waitFor(() =>
      expect((result.current[0] as AnnotationNoteText)._noteLayout).toBeTypeOf(
        "function"
      )
    )
    rerender({ enabled: false, fontFamily: "Arial" })
    expect(result.current[0]).toBe(raw[0])
    rerender({ enabled: true, fontFamily: "Georgia" })
    await waitFor(() =>
      expect(
        (result.current[0] as AnnotationNoteText)._noteLayout?.(raw[0])
          ?.textProps.fontFamily
      ).toBe("Georgia")
    )
  })

  it("retains default rendering without segmentation support", () => {
    const segmenter = Object.getOwnPropertyDescriptor(Intl, "Segmenter")!
    Object.defineProperty(Intl, "Segmenter", {
      configurable: true,
      value: undefined
    })
    try {
      const { result } = renderHook(() => usePretextAnnotations(raw))
      expect(result.current[0]).toBe(raw[0])
      expect(prepareWithSegments).not.toHaveBeenCalled()
    } finally {
      Object.defineProperty(Intl, "Segmenter", segmenter)
    }
  })

  it("retains default rendering after a font-load failure", async () => {
    fontSet.load.mockRejectedValueOnce(new Error("Font unavailable"))
    const { result } = renderHook(() => usePretextAnnotations(raw))
    await act(async () => {})
    expect(result.current[0]).toBe(raw[0])
    expect(prepareWithSegments).not.toHaveBeenCalled()
  })

  it("returns to ordinary wrapping if canvas measurement becomes unavailable", async () => {
    const { result } = renderHook(() => usePretextAnnotations(raw))
    await waitFor(() =>
      expect((result.current[0] as AnnotationNoteText)._noteLayout).toBeTypeOf(
        "function"
      )
    )
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null)
    await act(async () => fontSet.dispatchEvent(new Event("loadingdone")))
    expect(result.current[0]).toBe(raw[0])
  })
})
