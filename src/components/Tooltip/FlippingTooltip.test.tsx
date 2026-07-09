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
import { defaultTooltipStyle } from "./Tooltip"

// The string `FlippingTooltip` assigns to `wrapper.style.background`
// when it auto-applies chrome. jsdom keeps `var(...)` declarations
// verbatim on inline `style.background`, so this is the literal value
// the assertions below pin against — matching it proves the wrapper
// painted the canonical chrome rather than letting through whatever
// the user inlined.
const EXPECTED_CHROME_BACKGROUND = String(defaultTooltipStyle.background)

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
    expect(wrapper.className).toContain("semiotic-tooltip")
    // Chrome background pinned to the canonical value from
    // `defaultTooltipStyle` — proves the wrapper painted the right
    // chrome and not just any non-empty background string.
    expect(wrapper.style.background).toBe(EXPECTED_CHROME_BACKGROUND)
    // `padding` is set via the `padding` shorthand in defaultTooltipStyle;
    // jsdom expands it onto paddingTop. Either form is acceptable evidence.
    const style = wrapper.style
    const hasPadding = style.padding !== "" || style.paddingTop !== ""
    expect(hasPadding).toBe(true)
  })

  it("does NOT double-apply chrome when content has an inline background", () => {
    // Shared helpers that truly own chrome pass an opaque background
    // (often via defaultTooltipStyle). Class alone is not enough.
    const { container } = render(
      <FlippingTooltip {...baseProps}>
        <div className="semiotic-tooltip" style={{ background: "red", padding: 99 }}>
          Pre-styled
        </div>
      </FlippingTooltip>
    )
    const wrapper = container.firstChild as HTMLElement
    // Wrapper should NOT have its own background since chrome is owned
    // by the inner element; the user's "background: red" stays on the
    // inner div alone, with no double-wrap from defaultTooltipStyle.
    expect(wrapper.style.background).toBe("")
  })

  it("applies chrome when content only has .semiotic-tooltip class (no background)", () => {
    // Regression: Gauntlet / merge-pressure / custom tooltips return
    // `<div className="semiotic-tooltip">` without a fill. Class alone
    // must NOT suppress auto-chrome or the tooltip is transparent.
    const { container } = render(
      <FlippingTooltip {...baseProps}>
        <div className="my-custom semiotic-tooltip extra">Class only</div>
      </FlippingTooltip>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.background).toBe(EXPECTED_CHROME_BACKGROUND)
  })

  it("treats transparent background as missing chrome", () => {
    const { container } = render(
      <FlippingTooltip {...baseProps}>
        <div className="semiotic-tooltip" style={{ background: "transparent" }}>
          Transparent
        </div>
      </FlippingTooltip>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.background).toBe(EXPECTED_CHROME_BACKGROUND)
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
    // A user div with only padding / fontSize (no class, no background)
    // is still chrome-less; wrap it. Pinning so the detection doesn't
    // over-fire on style-only declarations.
    const { container } = render(
      <FlippingTooltip {...baseProps}>
        <div style={{ padding: 8, fontSize: 12 }}>plain</div>
      </FlippingTooltip>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.background).toBe(EXPECTED_CHROME_BACKGROUND)
  })

  it("does not treat className alone as chrome ownership", () => {
    // Classed custom tooltip content is often just internal layout.
    // Requiring explicit chrome ownership prevents transparent boxes
    // when a callback returns a classed div without background styles.
    const { container } = render(
      <FlippingTooltip {...baseProps}>
        <div className="tooltip-content">Classed content</div>
      </FlippingTooltip>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.background).toBe(EXPECTED_CHROME_BACKGROUND)
  })

  it("respects explicit CSS-class chrome ownership", () => {
    const { container } = render(
      <FlippingTooltip {...baseProps}>
        <div className="tooltip-content" data-semiotic-tooltip-chrome>
          CSS-styled
        </div>
      </FlippingTooltip>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.background).toBe("")
  })

  it("empty className is not enough to claim chrome", () => {
    // `className=""` carries no intent — wrap it.
    const { container } = render(
      <FlippingTooltip {...baseProps}>
        <div className="">no real class</div>
      </FlippingTooltip>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.background).toBe(EXPECTED_CHROME_BACKGROUND)
  })

  it("auto-applies chrome when content is a plain text node", () => {
    const { container } = render(
      <FlippingTooltip {...baseProps}>just a string</FlippingTooltip>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.background).toBe(EXPECTED_CHROME_BACKGROUND)
  })

  it("respects a component-level `ownsChrome` flag (DefaultNetworkTooltip pattern)", () => {
    // Regression: the inline prop checks below only see the React
    // element's props at JSX time, not its rendered output. The
    // Default*Tooltip components paint chrome internally via the
    // semiotic-tooltip className. Without the flag, FlippingTooltip
    // would double-wrap them — visible on a Carbon-light theme as
    // a white box around the tooltip.
    function ChromedTooltip() {
      return <div className="semiotic-tooltip" style={{ background: "white" }}>chrome</div>
    }
    ;(ChromedTooltip as unknown as { ownsChrome: boolean }).ownsChrome = true

    const { container } = render(
      <FlippingTooltip {...baseProps}>
        <ChromedTooltip />
      </FlippingTooltip>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.background).toBe("")
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
    // Pin the actual positioned wrapper rather than just "something
    // rendered": x=50 + margin.left=20 → left=70px, y=75 +
    // margin.top=10 → top=85px. If the guard incorrectly fired here
    // the wrapper would be null; if positioning regressed, these
    // values would shift.
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.left).toBe("70px")
    expect(wrapper.style.top).toBe("85px")
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
      // Same position pinning as the standalone finite-render test:
      // x=50 + margin.left=20 → 70px; y=75 + margin.top=10 → 85px.
      expect((container.firstChild as HTMLElement)?.style.top).toBe("85px")
      // Transition to NaN — bails out.
      rerender(
        <FlippingTooltip {...baseProps} x={50} y={NaN}>
          <div>content</div>
        </FlippingTooltip>
      )
      expect(container.firstChild).toBeNull()
      // Back to finite — re-renders at the same position.
      rerender(
        <FlippingTooltip {...baseProps} x={50} y={75}>
          <div>content</div>
        </FlippingTooltip>
      )
      expect((container.firstChild as HTMLElement)?.style.top).toBe("85px")
      // And back to NaN again — bails again, no hook-order complaint.
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
