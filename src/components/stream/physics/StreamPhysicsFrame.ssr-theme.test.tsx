import * as React from "react"
import { renderToString } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { DARK_THEME, ThemeProvider } from "../../ThemeProvider"
import {
  PhysicsPipelineStore,
  type PhysicsQueuedSpawn
} from "./PhysicsPipelineStore"
import { physicsCanvasThemeCSSValue } from "./PhysicsCanvasTheme"
import StreamPhysicsFrame from "./StreamPhysicsFrame"

const quietKernel = {
  gravity: { x: 0, y: 0 },
  velocityDamping: 1,
  sleepSpeed: 100,
  sleepAfter: 0.01
}

function circle(id: string): PhysicsQueuedSpawn {
  return {
    id,
    x: 30,
    y: 30,
    shape: { type: "circle", radius: 5 },
    mass: 1
  }
}

function parseSettledFrame(node: React.ReactNode): HTMLDivElement {
  const container = document.createElement("div")
  container.innerHTML = renderToString(node)
  return container
}

describe("StreamPhysicsFrame settled theme parity", () => {
  it("uses the canvas theme token chains in settled server rendering", () => {
    const container = parseSettledFrame(
      <ThemeProvider theme="dark">
        <StreamPhysicsFrame
          size={[200, 120]}
          config={{ fixedDt: 0.1, kernel: quietKernel }}
          initialSpawns={[circle("dark-surface")]}
        />
      </ThemeProvider>
    )

    expect(container.innerHTML).not.toContain("<canvas")
    const themeScope = container.querySelector<HTMLElement>(
      "[data-semiotic-theme-mode='dark']"
    )
    expect(themeScope?.style.getPropertyValue("--semiotic-bg")).toBe(
      DARK_THEME.colors.background
    )
    expect(themeScope?.style.getPropertyValue("--semiotic-primary")).toBe(
      DARK_THEME.colors.primary
    )
    expect(themeScope?.style.getPropertyValue("--semiotic-text")).toBe(
      DARK_THEME.colors.text
    )

    const svg = container.querySelector("svg.stream-physics-frame__svg")
    expect(svg?.querySelector(":scope > rect")).toHaveAttribute(
      "fill",
      physicsCanvasThemeCSSValue("background")
    )
    const body = svg?.querySelector("g[id$='-data-area'] circle")
    expect(body).toHaveAttribute("fill", physicsCanvasThemeCSSValue("primary"))
    expect(body).toHaveAttribute("stroke", physicsCanvasThemeCSSValue("text"))
  })

  it("preserves explicit and custom-graphics background precedence", () => {
    const explicit = parseSettledFrame(
      <StreamPhysicsFrame
        size={[200, 120]}
        background="#112233"
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        initialSpawns={[circle("explicit-surface")]}
      />
    )
    expect(
      explicit.querySelector("svg.stream-physics-frame__svg > rect")
    ).toHaveAttribute("fill", "#112233")

    const custom = parseSettledFrame(
      <StreamPhysicsFrame
        size={[200, 120]}
        background="#should-be-suppressed"
        backgroundGraphics={<g data-testid="settled-custom-background" />}
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        initialSpawns={[circle("custom-surface")]}
      />
    )
    const customSVG = custom.querySelector("svg.stream-physics-frame__svg")
    expect(customSVG?.querySelector(":scope > rect")).toBeNull()
    expect(
      customSVG?.querySelector("[data-testid='settled-custom-background']")
    ).not.toBeNull()
  })

  it("reuses the settled snapshot and full text fallback chain for selection", () => {
    const snapshotSpy = vi.spyOn(PhysicsPipelineStore.prototype, "snapshot")

    try {
      const container = parseSettledFrame(
        <div style={{ "--text-primary": "#eeeeee" } as React.CSSProperties}>
          <StreamPhysicsFrame
            size={[200, 120]}
            selection={{ isActive: true }}
            config={{ fixedDt: 0.1, kernel: quietKernel }}
            initialSpawns={[
              circle("selected-a"),
              { ...circle("selected-b"), x: 50 }
            ]}
          />
        </div>
      )

      const bodies = container.querySelectorAll(
        "svg.stream-physics-frame__svg g[id$='-data-area'] circle"
      )
      expect(bodies).toHaveLength(2)
      for (const body of bodies) {
        expect(body).toHaveAttribute(
          "stroke",
          physicsCanvasThemeCSSValue("text")
        )
      }
      expect(snapshotSpy).toHaveBeenCalledTimes(1)
    } finally {
      snapshotSpy.mockRestore()
    }
  })
})
