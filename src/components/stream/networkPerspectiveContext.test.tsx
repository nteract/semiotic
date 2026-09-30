// @vitest-environment node
import { describe, expect, it, vi } from "vitest"
import * as React from "react"
import * as ReactDOMServer from "react-dom/server"
import { NetworkPerspectiveLayer } from "./networkPerspectiveContext"
import { NetworkPerspectiveGround } from "./networkPerspectivePlacement"
import { buildNetworkPerspectiveFrame } from "./networkPerspective"
import { NetworkPerspectiveState } from "./networkPerspectiveState"

const frame = buildNetworkPerspectiveFrame("isometric", [0.8, 0.4, -0.8, 0.4, 100, 20], 0.9)

describe("NetworkPerspectiveGround", () => {
  it("renders children untouched on a flat chart", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <svg><NetworkPerspectiveGround><rect width={4} height={4} /></NetworkPerspectiveGround></svg>
    )
    expect(html).toBe('<svg><rect width="4" height="4"></rect></svg>')
  })

  it("maps children onto the projected ground, lifted by z", () => {
    const render = (z?: number) =>
      ReactDOMServer.renderToStaticMarkup(
        <svg>
          <NetworkPerspectiveLayer frame={frame}>
            <NetworkPerspectiveGround z={z}><rect width={4} height={4} /></NetworkPerspectiveGround>
          </NetworkPerspectiveLayer>
        </svg>
      )
    expect(render()).toContain('data-perspective="ground" transform="matrix(0.8 0.4 -0.8 0.4 100 20)"')
    // 10 layout px up is 9 screen px (lift 0.9).
    expect(render(10)).toContain('transform="matrix(0.8 0.4 -0.8 0.4 100 11)"')
    // A matching point projects to the same place the frame does.
    const [, y] = frame.project(0, 0, 10)
    expect(y).toBeCloseTo(11, 9)
  })
})

describe("flat decoration warning", () => {
  it("warns once when a projected layout leaves decorations in plot space", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const state = new NetworkPerspectiveState()
    state.warnFlatDecorations({ backgrounds: null, overlays: [false, null] })
    expect(warn).not.toHaveBeenCalled()
    state.warnFlatDecorations({ backgrounds: "x", perspective: "ground" })
    state.warnFlatDecorations({ overlays: "x", perspective: "manual" })
    expect(warn).not.toHaveBeenCalled()
    state.warnFlatDecorations({ overlays: ["x"] })
    state.warnFlatDecorations({ backgrounds: "y" })
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0][0])).toContain('perspective: "ground"')
    warn.mockRestore()
  })
})

describe("invisible pieces have no walls", () => {
  const faces = [{ pathD: "M0 0L10 0L10 4L0 4Z", shade: -0.2 }]
  const rect = (fill: string, extra: Record<string, unknown> = {}) => ({
    type: "rect" as const, x: 0, y: 0, w: 10, h: 10, pathD: "M0 0L10 0L10 10Z", faces,
    style: { fill, ...extra }, datum: null
  })

  it("SVG skips walls for transparent, none, zero-alpha and zero-opacity fills", async () => {
    const { networkSceneNodeToSVG } = await import("./SceneToSVG")
    const walls = (node: ReturnType<typeof rect>) =>
      (ReactDOMServer.renderToStaticMarkup(<svg>{networkSceneNodeToSVG(node as never, 0)}</svg>).match(/<path/g) ?? []).length - 1
    for (const fill of ["transparent", "none", "rgba(0,0,0,0)", "#0000", "#11223300"]) {
      expect(walls(rect(fill)), fill).toBe(0)
    }
    expect(walls(rect("#123456", { fillOpacity: 0 }))).toBe(0)
    expect(walls(rect("#123456", { opacity: 0 }))).toBe(0)
    expect(walls(rect("#123456"))).toBe(1)
    expect(walls(rect("rgba(0,0,0,0.5)"))).toBe(1)
  })

  it("canvas skips walls for invisible fills", async () => {
    const { paintPerspectiveFaces } = await import("./renderers/networkPerspectivePaint")
    const fills: unknown[] = []
    const ctx = {
      globalAlpha: 1,
      _fill: "#000000",
      get fillStyle() { return this._fill },
      set fillStyle(v: string) {
        if (v === "transparent") this._fill = "rgba(0, 0, 0, 0)"
        else if (/^(#|rgb)/.test(v)) this._fill = v
      },
      fill: () => fills.push(ctx._fill)
    }
    ;(globalThis as { Path2D?: unknown }).Path2D ??= class { constructor(public d: string) {} }
    for (const fill of ["transparent", "none", "rgba(0, 0, 0, 0)"]) {
      paintPerspectiveFaces(ctx as never, { fill }, faces, "#007bff")
    }
    paintPerspectiveFaces(ctx as never, { fill: "#123456", fillOpacity: 0 }, faces, "#007bff")
    expect(fills).toHaveLength(0)
    paintPerspectiveFaces(ctx as never, { fill: "#123456" }, faces, "#007bff")
    expect(fills).toHaveLength(1)
  })
})
