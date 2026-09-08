import { fireEvent, render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { GradientLegend } from "./GradientLegend"
import { renderStaticGradientLegend } from "./server/staticLegend"
import { DARK_THEME } from "./store/themeCore"

describe("gradient legend numeric labels", () => {
  it("reuses gradient stops during interaction and refreshes them when the scale changes", () => {
    const colorFn = vi.fn((value: number) =>
      value < 0.5 ? "#123456" : "#abcdef"
    )
    const props = {
      config: { domain: [0, 1] as [number, number], colorFn },
      customClickBehavior: () => {}
    }
    const { container, rerender } = render(
      <svg>
        <GradientLegend {...props} />
      </svg>
    )
    const samples = colorFn.mock.calls.length
    expect(samples).toBeGreaterThan(2)
    expect(container.querySelector("stop")).toHaveAttribute(
      "stop-color",
      "#abcdef"
    )
    fireEvent.focus(container.querySelector('[role="option"]')!)
    expect(colorFn).toHaveBeenCalledTimes(samples)
    rerender(
      <svg>
        <GradientLegend {...props} orientation="horizontal" />
      </svg>
    )
    expect(colorFn).toHaveBeenCalledTimes(samples * 2)
    expect(container.querySelector("stop")).toHaveAttribute(
      "stop-color",
      "#123456"
    )
    rerender(
      <svg>
        <GradientLegend
          {...props}
          orientation="horizontal"
          config={{ colorFn, domain: [1, 2] }}
        />
      </svg>
    )
    expect(colorFn).toHaveBeenCalledTimes(samples * 3)
    expect(container.querySelector("stop")).toHaveAttribute(
      "stop-color",
      "#abcdef"
    )
  })

  it.each(["horizontal", "vertical"] as const)(
    "distinguishes small %s endpoints in live and static legends",
    (orientation) => {
      const config = {
        domain: [0.001, 0.004] as [number, number],
        colorFn: () => "#123456"
      }
      const live = render(
        <svg>
          <GradientLegend
            config={config}
            orientation={orientation}
            customClickBehavior={() => {}}
          />
        </svg>
      ).container
      const exported = render(
        <svg>
          {renderStaticGradientLegend({
            gradient: config,
            theme: DARK_THEME,
            position: orientation === "horizontal" ? "bottom" : "right",
            totalWidth: 600,
            totalHeight: 400,
            margin: { top: 30, right: 120, bottom: 80, left: 50 }
          })}
        </svg>
      ).container
      for (const container of [live, exported]) {
        const labels = Array.from(
          container.querySelectorAll("text"),
          (node) => node.textContent
        )
        expect(labels).toContain("0.001")
        expect(labels).toContain("0.004")
      }
      const bins = Array.from(
        live.querySelectorAll('[role="option"]'),
        (node) => node.getAttribute("aria-label")
      )
      expect(bins).toHaveLength(5)
      expect(new Set(bins).size).toBe(5)
      expect(bins).not.toContain("0 – 0")
    }
  )
})
