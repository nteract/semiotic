import * as React from "react"
import { cleanup, render } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { FlippingTooltip } from "./FlippingTooltip"
import { normalizeTooltip } from "./Tooltip"

afterEach(cleanup)

const position = {
  x: 250,
  y: 50,
  containerWidth: 400,
  containerHeight: 300,
  margin: { left: 20, top: 10, right: 10, bottom: 10 }
}
const empty: [string, React.ReactNode][] = [
  ["null", null],
  ["undefined", undefined],
  ["false", false],
  ["true", true],
  ["empty text", ""],
  ["whitespace", "  \n"],
  ["array", [null, false, ""]],
  [
    "fragment",
    <>
      {null}
      <>{false}</>
    </>
  ]
]

it.each(empty)(
  "does not paint empty chrome for %s frame content",
  (_name, content) => {
    const view = render(
      <FlippingTooltip {...position}>{content}</FlippingTooltip>
    )
    expect(view.container.firstChild).toBeNull()
  }
)

it.each(empty)("does not wrap a %s chart tooltip result", (_name, content) => {
  const tooltip = normalizeTooltip(() => content)
  expect(typeof tooltip).toBe("function")
  if (typeof tooltip !== "function")
    throw new Error("Expected a tooltip renderer")
  expect(tooltip({ value: 0 })).toBeNull()
})

it("keeps zero visible and measures when previously empty content appears", () => {
  const rect = vi
    .spyOn(HTMLElement.prototype, "getBoundingClientRect")
    .mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 180,
      bottom: 50,
      width: 180,
      height: 50,
      toJSON: () => ({})
    })
  try {
    const view = render(<FlippingTooltip {...position}>{null}</FlippingTooltip>)
    expect(rect).not.toHaveBeenCalled()
    view.rerender(<FlippingTooltip {...position}>{0}</FlippingTooltip>)
    expect(view.container.textContent).toBe("0")
    expect(rect).toHaveBeenCalledTimes(1)
    // 150px to the right cannot fit the measured 180px tooltip.
    const wrapper = view.container.firstChild as HTMLElement
    expect(Number.parseFloat(wrapper.style.left) + 180).toBeLessThan(
      position.margin.left + position.x
    )
    view.rerender(<FlippingTooltip {...position}>{false}</FlippingTooltip>)
    expect(view.container.firstChild).toBeNull()
    view.rerender(<FlippingTooltip {...position}>Restored</FlippingTooltip>)
    expect(rect).toHaveBeenCalledTimes(2)
    expect(view.container.textContent).toBe("Restored")
    const tooltip = normalizeTooltip(() => 0)
    if (typeof tooltip !== "function")
      throw new Error("Expected a tooltip renderer")
    expect(render(<>{tooltip({ value: 0 })}</>).container.textContent).toBe("0")
  } finally {
    rect.mockRestore()
  }
})
