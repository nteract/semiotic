import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { drawBody } from "./physicsBodyCanvas"
import { physicsBodySVG } from "./physicsBodySVG"
import { PhysicsPipelineStore } from "./PhysicsPipelineStore"
import { checkPhysicsConfig } from "../../charts/shared/diagnosePhysicsChecks"
import type { Diagnosis } from "../../charts/shared/diagnoseTypes"
import type { PhysicsBodyMark } from "./physicsBodyCanvas"
import type { Style } from "../types"

function body() {
  const store = new PhysicsPipelineStore({
    kernel: { gravity: { x: 0, y: 0 } }
  })
  store.enqueue({
    id: "a",
    x: 30,
    y: 40,
    mass: 1,
    shape: { type: "circle", radius: 12 },
    datum: { source: "p3" }
  })
  store.materializeDueSpawns()
  return { store, body: store.readBodies()[0] }
}

describe("physics mark parity", () => {
  it.each(["triangle", "hexagon", "faceted"] as PhysicsBodyMark[])(
    "shares exact polygon coordinates for %s",
    (mark) => {
      for (const radius of [6, 12]) {
        const fixture = body()
        const ctx = document.createElement("canvas").getContext("2d")!
        const move = vi.spyOn(ctx, "moveTo")
        const line = vi.spyOn(ctx, "lineTo")
        const style: Style = { mark, r: radius, fill: "#123456" }
        drawBody(ctx, fixture.body, style)
        const vertices = [move.mock.calls[0], ...line.mock.calls]
        const svg = renderToStaticMarkup(
          <>{physicsBodySVG(fixture.body, style, 0)}</>
        )
        expect(vertices).toHaveLength(mark === "triangle" ? 3 : 6)
        for (const [x, y] of vertices) expect(svg).toContain(`${x},${y}`)
        expect(fixture.store.hitTest(30, 40, 0)?.id).toBe("a")
        expect(fixture.store.readBodies()[0].shape).toEqual({
          type: "circle",
          radius: 12
        })
      }
    }
  )

  it("skips a halo when fill and stroke are none", () => {
    const fixture = body()
    const ctx = document.createElement("canvas").getContext("2d")!
    const stroke = vi.spyOn(ctx, "stroke")
    const fill = vi.spyOn(ctx, "fill")
    drawBody(ctx, fixture.body, {
      mark: "halo",
      r: 10,
      fill: "none",
      stroke: "none"
    })
    expect(fill).not.toHaveBeenCalled()
    expect(stroke).not.toHaveBeenCalled()
    expect(ctx.strokeStyle).not.toBe("none")
  })

  it("does not paint a halo whose stroke is none", () => {
    const fixture = body()
    const ctx = document.createElement("canvas").getContext("2d")!
    const stroke = vi.spyOn(ctx, "stroke")
    const fill = vi.spyOn(ctx, "fill")
    drawBody(ctx, fixture.body, {
      mark: "halo",
      r: 10,
      fill: "red",
      stroke: "none",
      strokeWidth: 2
    })
    expect(fill).toHaveBeenCalled()
    expect(stroke).not.toHaveBeenCalled()
  })

  it("paints an omitted halo stroke with the fill", () => {
    const fixture = body()
    const ctx = document.createElement("canvas").getContext("2d")!
    const stroke = vi.spyOn(ctx, "stroke")
    drawBody(ctx, fixture.body, {
      mark: "halo",
      r: 10,
      fill: "red",
      strokeWidth: 2
    })
    expect(stroke).toHaveBeenCalled()
    const svg = renderToStaticMarkup(
      <>
        {physicsBodySVG(fixture.body, {
          mark: "halo",
          r: 10,
          fill: "red",
          strokeWidth: 2
        }, 0)}
      </>
    )
    expect(svg).toContain('stroke="red"')
  })

  it("renders glyph callbacks with the original datum and diagnoses visual/collider mismatch", () => {
    const fixture = body()
    const glyph = {
      viewBox: [80, 40] as [number, number],
      parts: [{ d: "M0,0H80V40H0Z" }]
    }
    const callback = vi.fn(() => glyph)
    const svg = renderToStaticMarkup(
      <>
        {physicsBodySVG(fixture.body, { glyph: callback, fill: "#123456" }, 0)}
      </>
    )
    expect(callback).toHaveBeenCalledWith({ source: "p3" })
    expect(svg).toContain('d="M0,0H80V40H0Z"')
    expect(svg).toContain('fill="#123456"')
    const findings: Diagnosis[] = []
    checkPhysicsConfig(
      "EventDropChart",
      { frameProps: { bodyStyle: { glyph } } },
      findings
    )
    expect(findings).toContainEqual(
      expect.objectContaining({ code: "PHYSICS_GLYPH_ASPECT_RATIO" })
    )
  })
})
