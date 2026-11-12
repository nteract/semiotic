import { describe, expect, it } from "vitest"
import {
  renderChart,
  renderChartWithEvidence,
  renderDashboard
} from "./renderToStaticSVG"
import { scopeSvgIdentifiers } from "../shared/svgIdentifiers"
import {
  parseSvg,
  svgReferenceFailures,
  svgStructureFailures
} from "../../test-utils/svgStructure"
import {
  referenceOverlay,
  structureProps,
  svgStructureFixtures
} from "../../test-utils/svgStructureFixtures"

describe("scoped SVG composition structure", () => {
  for (const fixture of svgStructureFixtures) {
    it(`${fixture.family}: marks, axes, grid, legend and annotations share the intended layers`, () => {
      for (const chrome of [true, false]) {
        const { svg, evidence } = renderChartWithEvidence(
          fixture.component,
          structureProps(fixture, chrome)
        )
        const root = parseSvg(svg)
        expect(evidence.status).toBe("ok")
        expect(evidence.empty).toBe(false)
        expect(evidence.warnings).toEqual([])
        expect(evidence.annotationCount).toBe(chrome ? 1 : 0)
        expect(svgStructureFailures(root, fixture, chrome)).toEqual([])
        expect(
          svgStructureFailures(
            parseSvg(scopeSvgIdentifiers(svg, "renamed")),
            fixture,
            chrome
          )
        ).toEqual([])
        expect(svgReferenceFailures([root])).toEqual([])
        expect(root.querySelector("title")?.textContent).toBe(
          `${fixture.family} composition`
        )
        expect(root.querySelector("desc")?.textContent).toBe(
          `Two views of ${fixture.family} data`
        )
      }
      const absent = parseSvg(
        renderChart(fixture.component, {
          ...structureProps(fixture, false),
          annotations: undefined
        })
      )
      expect(absent.querySelector(".semiotic-annotations")).toBeNull()
    })

    it.each(["inline", "dashboard"])(
      `${fixture.family}: %s charts keep every reference local even with identical inputs`,
      (mode) => {
        const charts = ["first", "second"].map((chartId) => ({
          component: fixture.component,
          props: {
            ...structureProps(fixture),
            chartId,
            frameProps: {
              ...(fixture.props.frameProps as object),
              foregroundGraphics: referenceOverlay("#f00")
            }
          }
        }))
        // Dashboard assigns per-cell prefixes even for repeated identical inputs.
        const svg =
          mode === "dashboard"
            ? renderDashboard([charts[0], charts[0]], {
                title: "Repeated charts",
                subtitle: "Local references"
              })
            : `<svg xmlns="http://www.w3.org/2000/svg">${charts.map((chart) => renderChart(chart.component, chart.props)).join("")}</svg>`
        for (const output of [
          svg,
          scopeSvgIdentifiers(svg, "changed-prefix")
        ]) {
          const document = parseSvg(output)
          const roots = [
            ...document.querySelectorAll(`.stream-${fixture.family}-frame`)
          ]
          expect(roots).toHaveLength(2)
          expect(svgReferenceFailures([document, ...roots])).toEqual([])
          for (const root of roots) {
            expect(root.querySelectorAll("use")).toHaveLength(2)
            expect(root.querySelector("[aria-describedby]")).not.toBeNull()
            expect(root.querySelector("clipPath")).not.toBeNull()
            expect(root.querySelector("linearGradient stop")).not.toBeNull()
            expect(
              root.querySelector(".semiotic-annotations")?.textContent
            ).toContain(fixture.annotations[0])
          }
        }
      }
    )
  }

  it.each(svgStructureFixtures.filter((f) => f.axes.length > 0))(
    "$family: axes and grid can be disabled independently",
    (fixture) => {
      for (const showAxes of [false, true]) {
        const root = parseSvg(
          renderChart(fixture.component, {
            ...structureProps(fixture),
            showAxes,
            showGrid: !showAxes
          })
        )
        expect(!!root.querySelector(".stream-axes, .ordinal-axes")).toBe(
          showAxes
        )
        expect(!!root.querySelector(".semiotic-grid")).toBe(!showAxes)
        expect(
          root
            .querySelector('[id$="-data-area"]')!
            .querySelectorAll(fixture.marks.selector)
        ).toHaveLength(fixture.marks.count)
      }
    }
  )

  it("XY marks use a real gradient and plot clip; annotations and legends remain unclipped", () => {
    const root = parseSvg(
      renderChart("LineChart", structureProps(svgStructureFixtures[0]))
    )
    const clipped = root.querySelector("g[clip-path]")!
    expect(clipped.querySelector("path[fill^='url(']")).not.toBeNull()
    expect(
      root.querySelectorAll("linearGradient stop").length
    ).toBeGreaterThanOrEqual(2)
    const clip = root.querySelector("clipPath rect")!
    expect(Number(clip.getAttribute("width"))).toBeGreaterThan(0)
    expect(Number(clip.getAttribute("height"))).toBeGreaterThan(0)
    expect(clipped.contains(root.querySelector(".semiotic-annotations"))).toBe(
      false
    )
    expect(clipped.contains(root.querySelector(".semiotic-legend"))).toBe(false)
  })
})

describe("SVG assertions reject controlled regressions", () => {
  const fixture = svgStructureFixtures[0]
  const output = () => renderChart(fixture.component, structureProps(fixture))

  it.each([
    [".semiotic-annotations", "annotation visibility"],
    [".semiotic-legend", "legend visibility"],
    [".stream-axes", "axes visibility"],
    [".semiotic-grid", "grid visibility"],
    ["g[clip-path] path", "data marks"]
  ])("rejects missing %s", (selector, message) => {
    const root = parseSvg(output())
    root.querySelector(selector)!.remove()
    expect(svgStructureFailures(root, fixture)).toContain(message)
  })

  it("rejects lost annotation content, misplaced chrome and chrome enabled against instructions", () => {
    const root = parseSvg(output())
    root.querySelector(".semiotic-annotations")!.textContent = "Wrong text"
    const grid = root.querySelector(".semiotic-grid")!
    root.append(grid)
    expect(svgStructureFailures(root, fixture)).toEqual(
      expect.arrayContaining([
        "annotation text: Capacity",
        "axes/grid must share plot coordinates",
        "grid paint order"
      ])
    )
    expect(svgStructureFailures(root, fixture, false)).toEqual(
      expect.arrayContaining([
        "axes visibility",
        "grid visibility",
        "legend visibility",
        "annotation visibility"
      ])
    )
  })

  it.each(["linearGradient", "clipPath", "title", "desc"])(
    "rejects a missing %s target including root ARIA references",
    (selector) => {
      const root = parseSvg(output())
      const target = root.querySelector(selector)!
      const id = target.id
      target.remove()
      expect(
        svgReferenceFailures([root]).some(
          (message) =>
            message.includes(`unresolved`) && message.endsWith(`#${id}`)
        )
      ).toBe(true)
    }
  )

  it("rejects duplicate IDs and cross-chart links even when a target exists in the document", () => {
    const root = parseSvg(
      `<svg xmlns="http://www.w3.org/2000/svg">${output()}${scopeSvgIdentifiers(output(), "second")}</svg>`
    )
    const charts = [...root.children]
    expect(svgReferenceFailures(charts)).toEqual([])
    const foreignId = charts[1].querySelector("linearGradient")!.id
    charts[0]
      .querySelector("path[fill^='url(']")!
      .setAttribute("fill", `url('#${foreignId}')`)
    expect(svgReferenceFailures(charts)).toContain(
      `Chart 0: cross-chart fill #${foreignId}`
    )
    charts[0].querySelector("clipPath")!.id = foreignId
    expect(svgReferenceFailures(charts)).toContain(`Duplicate ID: ${foreignId}`)
  })

  it.each(["href", "xlink:href", "aria-describedby", "style", "stylesheet"])(
    "rejects broken authored %s references",
    (attribute) => {
      const props = structureProps(fixture)
      const root = parseSvg(
        renderChart(fixture.component, {
          ...props,
          frameProps: {
            ...(fixture.props.frameProps as object),
            foregroundGraphics: referenceOverlay("#f00")
          }
        })
      )
      expect(svgReferenceFailures([root])).toEqual([])
      if (attribute === "stylesheet")
        root.querySelector("style")!.textContent =
          ".reference-swatch { fill: url( '#missing' ) }"
      else if (attribute === "style")
        root
          .querySelector(".reference-swatch")!
          .setAttribute("style", 'fill: url("#missing")')
      else if (attribute === "aria-describedby")
        root.setAttribute(attribute, "missing")
      else root.querySelector("use")!.setAttribute(attribute, "#missing")
      expect(svgReferenceFailures([root])).toContain(
        `Chart 0: unresolved ${attribute} #missing`
      )
    }
  )

  it("does not mistake colors, external URLs, comments or text for ID references", () => {
    const root = parseSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" aria-label="url(#text)"><style>/* url(#comment) */ text { fill: #fff; content: "url(#string)"; background: url(other.svg#paint) }</style><text>url(#text)</text><use href="other.svg#symbol"/></svg>'
    )
    expect(svgReferenceFailures([root])).toEqual([])
  })

  it("rejects malformed SVG and a non-SVG root", () => {
    expect(() => parseSvg("<svg><path>")).toThrow("Invalid SVG")
    expect(() => parseSvg("<html/>")).toThrow("Invalid SVG")
  })
})
