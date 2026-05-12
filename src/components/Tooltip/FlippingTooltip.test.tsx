/**
 * Regression coverage for the two defensive behaviors `FlippingTooltip`
 * applies on top of its flip-positioning logic:
 *
 *   1. Chrome auto-apply when user `tooltipContent` returns a node
 *      WITHOUT `.semiotic-tooltip` on its root.
 *   2. Non-finite position guard (returns null so React doesn't throw
 *      `'NaN' is an invalid value for the 'top' css style property`).
 *
 * Both fixes ship in `FlippingTooltip.tsx`; per-chart `tooltipContent`
 * implementations stay untouched.
 */
import * as React from "react"
import { render } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { FlippingTooltip } from "./FlippingTooltip"

const baseProps = {
  x: 100,
  y: 50,
  containerWidth: 400,
  containerHeight: 300,
  margin: { top: 10, right: 10, bottom: 10, left: 20 },
}

describe("FlippingTooltip — chrome auto-apply", () => {
  it("applies default chrome when the user content lacks .semiotic-tooltip", () => {
    // Mimics the ProcessSankey / earlier-DifferenceChart regression:
    // a tooltipContent function that returns a bare div with no
    // chrome class. The wrapper should paint the chrome instead.
    const { container } = render(
      <FlippingTooltip {...baseProps}>
        <div style={{ minWidth: 160 }}>Plain content</div>
      </FlippingTooltip>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toBeTruthy()
    expect(wrapper.className).toContain("semiotic-tooltip")
    // The chrome style is applied directly on the wrapper.
    const style = wrapper.style
    expect(style.background).toBeTruthy()
    // `padding` is set via the `padding` shorthand in defaultTooltipStyle;
    // jsdom expands it onto paddingTop. Either form is acceptable evidence.
    const hasPadding = style.padding !== "" || style.paddingTop !== ""
    expect(hasPadding).toBe(true)
  })

  it("does NOT double-apply chrome when the user content already has .semiotic-tooltip", () => {
    // The shared `Tooltip()` / `MultiLineTooltip()` / `buildDefaultTooltip()`
    // helpers wrap their output in `<div className="semiotic-tooltip">` —
    // those should pass through transparent so chrome doesn't pile up.
    const { container } = render(
      <FlippingTooltip {...baseProps}>
        <div className="semiotic-tooltip" style={{ background: "red", padding: 99 }}>
          Pre-styled
        </div>
      </FlippingTooltip>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toBeTruthy()
    // Wrapper should NOT have its own background since chrome is owned
    // by the inner element.
    expect(wrapper.style.background).toBe("")
  })

  it("detects .semiotic-tooltip even when other classes are present", () => {
    const { container } = render(
      <FlippingTooltip {...baseProps}>
        <div className="my-custom semiotic-tooltip extra">Pre-styled</div>
      </FlippingTooltip>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.background).toBe("")
  })

  it("respects an inline `background` style as chrome ownership (no double-wrap)", () => {
    // Regression: Landing-page gallery tooltips paint their own chrome
    // via `style={{ background: "white", padding: ... }}` without
    // adding the `.semiotic-tooltip` class. The auto-chrome path was
    // wrapping those in a dark `defaultTooltipStyle` outer box,
    // visible as a black strip around the user's tooltip.
    const { container } = render(
      <FlippingTooltip {...baseProps}>
        <div style={{ background: "white", padding: "8px 12px", color: "#333" }}>
          Custom-styled
        </div>
      </FlippingTooltip>
    )
    const wrapper = container.firstChild as HTMLElement
    // Wrapper should NOT have its own background — chrome ownership
    // detected via the inline style.
    expect(wrapper.style.background).toBe("")
  })

  it("respects an inline `backgroundColor` style as chrome ownership", () => {
    const { container } = render(
      <FlippingTooltip {...baseProps}>
        <div style={{ backgroundColor: "#222", color: "white", padding: 8 }}>
          Pre-styled via backgroundColor
        </div>
      </FlippingTooltip>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.background).toBe("")
  })

  it("still applies chrome when style is set but background is not", () => {
    // A user style with only padding / fontSize is still chrome-less;
    // wrap it. Pinning so the detection doesn't over-fire.
    const { container } = render(
      <FlippingTooltip {...baseProps}>
        <div style={{ padding: 8, fontSize: 12 }}>plain</div>
      </FlippingTooltip>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.background).toBeTruthy()
  })

  it("auto-applies chrome when content is a plain text node", () => {
    const { container } = render(
      <FlippingTooltip {...baseProps}>just a string</FlippingTooltip>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.background).toBeTruthy()
  })
})

describe("FlippingTooltip — non-finite position guard", () => {
  it("returns null when x is NaN", () => {
    const { container } = render(
      <FlippingTooltip {...baseProps} x={NaN}>
        <div>content</div>
      </FlippingTooltip>
    )
    expect(container.firstChild).toBeNull()
  })

  it("returns null when y is NaN", () => {
    const { container } = render(
      <FlippingTooltip {...baseProps} y={NaN}>
        <div>content</div>
      </FlippingTooltip>
    )
    expect(container.firstChild).toBeNull()
  })

  it("returns null when y is Infinity", () => {
    const { container } = render(
      <FlippingTooltip {...baseProps} y={Infinity}>
        <div>content</div>
      </FlippingTooltip>
    )
    expect(container.firstChild).toBeNull()
  })

  it("renders normally when both x and y are finite (regression for the guard not over-firing)", () => {
    const { container } = render(
      <FlippingTooltip {...baseProps} x={50} y={75}>
        <div>content</div>
      </FlippingTooltip>
    )
    expect(container.firstChild).not.toBeNull()
  })

  it("transitioning between finite ↔ NaN positions does not throw the React hook-order error", () => {
    // Regression: an earlier shape of this guard did `if (!finite)
    // return null` BEFORE the hooks, so when y oscillated between NaN
    // and a finite number across re-renders, React's static-hook-flag
    // check fired ("Expected static flag was missing"). The fix
    // routes the guard through a render-time decision so all hooks
    // run in stable order.
    const errors: unknown[] = []
    const origError = console.error
    console.error = (msg: unknown, ...rest: unknown[]) => {
      errors.push(msg)
      origError(msg, ...rest)
    }
    try {
      const { rerender, container } = render(
        <FlippingTooltip {...baseProps} x={50} y={75}>
          <div>content</div>
        </FlippingTooltip>
      )
      expect(container.firstChild).not.toBeNull()
      // Transition to NaN — bails out.
      rerender(
        <FlippingTooltip {...baseProps} x={50} y={NaN}>
          <div>content</div>
        </FlippingTooltip>
      )
      expect(container.firstChild).toBeNull()
      // Back to finite — re-renders.
      rerender(
        <FlippingTooltip {...baseProps} x={50} y={75}>
          <div>content</div>
        </FlippingTooltip>
      )
      expect(container.firstChild).not.toBeNull()
      // And back to NaN again.
      rerender(
        <FlippingTooltip {...baseProps} x={NaN} y={75}>
          <div>content</div>
        </FlippingTooltip>
      )
      expect(container.firstChild).toBeNull()
    } finally {
      console.error = origError
    }
    // No React hook-order or "static flag" complaints captured.
    const reactErrors = errors.filter(e => String(e).includes("static flag") || String(e).includes("hook"))
    expect(reactErrors).toEqual([])
  })
})
