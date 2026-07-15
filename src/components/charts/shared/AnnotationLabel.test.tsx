import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { AnnotationLabel, estimateLabelWidth } from "./AnnotationLabel"
import { resolveSvgFill, type HatchFill } from "./hatchFill"

const svg = (el: React.ReactElement) => renderToStaticMarkup(<svg>{el}</svg>)

describe("AnnotationLabel", () => {
  it("defaults to a stroke halo (paint-order:stroke)", () => {
    const out = svg(<AnnotationLabel x={10} y={10} text="Max · 15" fill="#d7263d" />)
    expect(out).toContain('paint-order="stroke"')
    expect(out).toContain('stroke-width="3"')
    expect(out).toContain('stroke="var(--semiotic-bg, #ffffff)"')
    expect(out).toContain("Max · 15")
    expect(out).not.toContain("<rect")
  })

  it('renders a bare <text> with no backdrop for background="none"', () => {
    const out = svg(<AnnotationLabel x={10} y={10} text="plain" fill="#333" background="none" />)
    expect(out).not.toContain("<rect")
    expect(out).not.toContain("paint-order")
  })

  it('renders a semitransparent box backdrop for background="box"', () => {
    const out = svg(<AnnotationLabel x={10} y={10} text="Fast-scaling · 10" fill="#0b6" background="box" />)
    expect(out).toContain("<rect")
    expect(out).toContain('fill-opacity="0.85"')
    expect(out).toContain("Fast-scaling · 10")
  })

  it("honors a custom box config (fill, opacity, radius)", () => {
    const out = svg(
      <AnnotationLabel
        x={10}
        y={10}
        text="x"
        fill="#000"
        background={{ type: "box", fill: "#123456", opacity: 0.5, radius: 8 }}
      />,
    )
    expect(out).toContain('fill="#123456"')
    expect(out).toContain('fill-opacity="0.5"')
    expect(out).toContain('rx="8"')
  })

  it("estimates a plausible label width", () => {
    expect(estimateLabelWidth("hello", 12)).toBeCloseTo(5 * 12 * 0.6)
  })
})

describe("resolveSvgFill", () => {
  it("passes a string color through unchanged with no def", () => {
    const r = resolveSvgFill("#abc", "n1")
    expect(r.fill).toBe("#abc")
    expect(r.def).toBeUndefined()
  })

  it("resolves a HatchFill to a url(#…) + a <pattern> def", () => {
    const hatch: HatchFill = { type: "hatch", background: "#ffd166", stroke: "#e0a92a" }
    const r = resolveSvgFill(hatch, "bar-3")
    expect(r.fill).toMatch(/^url\(#bar-3-hatch-/)
    expect(r.def).toBeDefined()
    const markup = renderToStaticMarkup(<svg><defs>{r.def}</defs></svg>)
    expect(markup).toContain("<pattern")
    expect(markup).toContain('fill="#ffd166"') // background rect
    expect(markup).toContain('stroke="#e0a92a"') // hatch lines
  })

  it("falls back to the provided color for a nullish fill", () => {
    expect(resolveSvgFill(undefined, "n2", "#999").fill).toBe("#999")
  })
})
