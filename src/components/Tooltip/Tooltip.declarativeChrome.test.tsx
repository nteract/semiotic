import * as React from "react"
import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import {
  TooltipRoot,
  normalizeTooltip,
  resolveMultiCapableTooltip,
  type TooltipContentFn
} from "./Tooltip"
import { FlippingTooltip } from "./FlippingTooltip"
import { ThemeProvider } from "../ThemeProvider"

const placement = {
  x: 50,
  y: 50,
  containerWidth: 400,
  containerHeight: 300,
  margin: { left: 0, right: 0, top: 0, bottom: 0 }
}
const Inner = ({ label }: { label: string }) => (
  <div
    data-testid="consumer-surface"
    style={{ background: "navy", color: "white", padding: 12 }}
  >
    {label}
  </div>
)
const Outer = ({ label }: { label: string }) => <Inner label={label} />

function show(content: React.ReactNode, themeChrome?: "default" | "none") {
  return render(
    <ThemeProvider theme={{ tooltip: { chrome: themeChrome } }}>
      <FlippingTooltip {...placement}>{content}</FlippingTooltip>
    </ThemeProvider>
  )
}

it("declares custom chrome without changing the renderer, including nested consumer components", () => {
  const content = vi.fn((d) => <Outer label={d.name} />)
  const renderer = normalizeTooltip({
    content,
    chrome: "none"
  }) as TooltipContentFn
  const view = show(
    renderer({
      data: { name: "Requests" },
      x: 50,
      y: 50,
      __semioticHoverData: true
    })
  )
  expect(content).toHaveBeenCalledWith({ name: "Requests" })
  expect(Object.hasOwn(content, "ownsChrome")).toBe(false)
  const surface = view.getByTestId("consumer-surface")
  expect(surface.style.background).toBe("navy")
  for (const element of view.container.querySelectorAll<HTMLElement>(
    ".semiotic-tooltip, .stream-frame-tooltip"
  )) {
    expect(element.style.background).toBe("")
    expect(element.style.padding).toBe("")
    expect(element.style.boxShadow).toBe("")
  }
})

it("preserves raw datum and multi-series metadata for custom multi chrome", () => {
  const content = vi.fn((d) => <Outer label={String(d.allSeries[0].value)} />)
  const resolved = resolveMultiCapableTooltip({
    tooltip: { mode: "multi", content, chrome: "none" },
    defaultTooltipContent: () => null,
    multiDefaultContent: () => null
  })
  const view = show(
    resolved.tooltipContent({
      data: { name: "Requests" },
      xValue: 10,
      allSeries: [{ group: "a", value: 7 }],
      x: 50,
      y: 50,
      __semioticHoverData: true
    })
  )
  expect(view.getByTestId("consumer-surface").textContent).toBe("7")
  expect(content.mock.calls[0][0]).toMatchObject({
    name: "Requests",
    xValue: 10,
    allSeries: [{ group: "a", value: 7 }]
  })
  expect(
    view.container.querySelector<HTMLElement>(".semiotic-tooltip")?.style
      .background
  ).toBe("")
})

it.each([
  null,
  false,
  "",
  [],
  <>
    {null}
    {false}
  </>
])("suppresses empty declarative results", (empty) => {
  const renderer = normalizeTooltip({
    content: () => empty,
    chrome: "none"
  }) as TooltipContentFn
  const view = show(renderer({ name: "Requests" }))
  expect(view.container.querySelector(".stream-frame-tooltip")).toBeNull()
})

describe("theme tooltip chrome", () => {
  it.each(["normalized", "frame"])(
    "applies the theme policy to %s callbacks",
    (path) => {
      const content = (d: Record<string, unknown>) => (
        <Outer label={String(d.name)} />
      )
      const renderer =
        path === "normalized"
          ? (normalizeTooltip(content) as TooltipContentFn)
          : content
      const view = show(renderer({ name: "Requests" }), "none")
      expect(view.getByTestId("consumer-surface")).toBeDefined()
      for (const element of view.container.querySelectorAll<HTMLElement>(
        ".semiotic-tooltip, .stream-frame-tooltip"
      )) {
        expect(element.style.background).toBe("")
        expect(element.style.padding).toBe("")
      }
    }
  )

  it("lets a chart explicitly restore default chrome", () => {
    const renderer = normalizeTooltip({
      content: (d) => String(d.name),
      chrome: "default"
    }) as TooltipContentFn
    const view = show(renderer({ name: "Requests" }), "none")
    expect(
      view.container.querySelector<HTMLElement>(".semiotic-tooltip")?.style
        .background
    ).toContain("--semiotic-tooltip-bg")
  })

  it("applies the chart policy to field tooltip configs", () => {
    const renderer = normalizeTooltip({
      fields: ["name"],
      chrome: "none"
    }) as TooltipContentFn
    const view = show(renderer({ name: "Requests" }))
    expect(view.container.textContent).toContain("Requests")
    expect(
      view.container.querySelector<HTMLElement>(".semiotic-tooltip")?.style
        .padding
    ).toBe("")
  })
})

it("applies explicit policy to built-in multi roots", () => {
  const resolved = resolveMultiCapableTooltip({
    tooltip: { mode: "multi", chrome: "none" },
    defaultTooltipContent: () => null,
    multiDefaultContent: () => <TooltipRoot>Requests</TooltipRoot>
  })
  const view = show(resolved.tooltipContent({ name: "Requests" }))
  expect(view.container.textContent).toContain("Requests")
  expect(view.container.querySelectorAll(".semiotic-tooltip")).toHaveLength(1)
  expect(
    view.container.querySelector<HTMLElement>(".semiotic-tooltip")?.style
      .padding
  ).toBe("")
  expect(
    view.container.querySelector<HTMLElement>(".stream-frame-tooltip")?.style
      .padding
  ).toBe("")
})

it("suppresses an empty built-in multi result before applying chart policy", () => {
  const resolved = resolveMultiCapableTooltip({
    tooltip: { mode: "multi", chrome: "none" },
    defaultTooltipContent: () => null,
    multiDefaultContent: () => null
  })
  expect(resolved.tooltipContent({ name: "Requests" })).toBeNull()
})
