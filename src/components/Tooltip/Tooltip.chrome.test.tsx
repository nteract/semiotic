import * as React from "react"
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  TooltipRoot,
  hasOwnTooltipChrome,
  markTooltipChrome,
  normalizeTooltip,
  resolveTooltipContent,
  resolveMultiCapableTooltip,
  type TooltipContentFn
} from "./Tooltip"
import { FlippingTooltip } from "./FlippingTooltip"

afterEach(cleanup)

const position = {
  x: 50,
  y: 50,
  containerWidth: 400,
  containerHeight: 300,
  margin: { left: 0, top: 0, right: 0, bottom: 0 }
}
const ChartTooltip = markTooltipChrome(function ChartTooltip({
  label
}: {
  label: string
}) {
  const id = React.useId()
  return (
    <TooltipRoot id={id} style={{ background: "navy" }}>
      {label}
    </TooltipRoot>
  )
})
// Neither wrapper needs to know about Semiotic's ownership protocol.
const Inner = ({ label }: { label: string }) => <ChartTooltip label={label} />
const Outer = ({ label }: { label: string }) => <Inner label={label} />

function renderTooltip(renderer: TooltipContentFn) {
  return render(
    <FlippingTooltip
      {...position}
      contentOwnsChrome={hasOwnTooltipChrome(renderer)}
    >
      {renderer({ label: "Revenue: $42" })}
    </FlippingTooltip>
  )
}

describe("renderer chrome ownership", () => {
  it("marks the original renderer without executing it", () => {
    const renderer = vi.fn(() => <Outer label="Owned" />)
    expect(markTooltipChrome(renderer)).toBe(renderer)
    expect(hasOwnTooltipChrome(renderer)).toBe(true)
    expect(renderer).not.toHaveBeenCalled()
    expect(hasOwnTooltipChrome(<Outer label="Owned" />)).toBe(false)
  })

  it.each(["frame", "chart", "multi", "single hover", "multi hover"])(
    "keeps one surface through nested wrappers for %s callbacks",
    (path) => {
      const renderer = markTooltipChrome((datum: Record<string, unknown>) => (
        <Outer label={String(datum.label)} />
      ))
      let resolved: TooltipContentFn
      if (path === "chart" || path === "multi") {
        const normalized = normalizeTooltip(
          path === "multi" ? { mode: "multi", content: renderer } : renderer
        )
        if (typeof normalized !== "function")
          throw new Error("Expected renderer")
        resolved = normalized
      } else if (path === "single hover" || path === "multi hover") {
        const resolve =
          path === "single hover"
            ? resolveTooltipContent
            : resolveMultiCapableTooltip
        resolved = resolve({
          tooltip: renderer,
          customFunctionContext: "hover",
          defaultTooltipContent: () => "default"
        }).tooltipContent
      } else {
        resolved = renderer as TooltipContentFn
      }
      expect(hasOwnTooltipChrome(resolved)).toBe(true)
      const view = renderTooltip(resolved)
      expect(view.container.textContent).toBe("Revenue: $42")
      expect(view.container.querySelectorAll(".semiotic-tooltip")).toHaveLength(
        1
      )
      const wrapper = view.container.firstChild as HTMLElement
      expect(wrapper.style.background).toBe("")
      expect(
        view.container.querySelector<HTMLElement>(".semiotic-tooltip")!.style
          .background
      ).toBe("navy")
    }
  )

  it.each(["frame", "chart"])(
    "retains fallback chrome for an unmarked plain %s renderer",
    (path) => {
      const renderer: TooltipContentFn = (d) => d.label
      const normalized =
        path === "chart" ? normalizeTooltip(renderer) : renderer
      if (typeof normalized !== "function") throw new Error("Expected renderer")
      const view = renderTooltip(normalized)
      expect(view.container.textContent).toBe("Revenue: $42")
      expect(view.container.querySelectorAll(".semiotic-tooltip")).toHaveLength(
        1
      )
      expect(
        view.container.querySelector<HTMLElement>(".semiotic-tooltip")!.style
          .background
      ).toContain("--semiotic-tooltip-bg")
    }
  )
})
