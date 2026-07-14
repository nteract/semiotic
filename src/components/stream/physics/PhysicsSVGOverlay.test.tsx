import * as React from "react"
import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import {
  PhysicsSVGOverlay,
  bodiesToAnnotationAnchors,
  buildPhysicsAnnotationContext,
  normalizePhysicsAnnotations
} from "./PhysicsSVGOverlay"
import type { PhysicsBodyState } from "./PhysicsKernel"

function body(
  id: string,
  x: number,
  y: number,
  radius = 5
): PhysicsBodyState {
  return {
    id,
    x,
    y,
    prevX: x,
    prevY: y,
    vx: 0,
    vy: 0,
    mass: 1,
    angle: 0,
    sleeping: false,
    shape: { type: "circle", radius }
  }
}

describe("normalizePhysicsAnnotations", () => {
  it("maps bodyId to pointId without clobbering existing pointId", () => {
    expect(
      normalizePhysicsAnnotations([
        { type: "label", bodyId: "b1", label: "From body" },
        { type: "label", pointId: "keep", bodyId: "ignored", label: "Keep" }
      ])
    ).toEqual([
      { type: "label", bodyId: "b1", pointId: "b1", label: "From body" },
      { type: "label", pointId: "keep", bodyId: "ignored", label: "Keep" }
    ])
  })

  it("returns undefined for empty input", () => {
    expect(normalizePhysicsAnnotations(undefined)).toBeUndefined()
    expect(normalizePhysicsAnnotations([])).toEqual([])
  })
})

describe("buildPhysicsAnnotationContext", () => {
  it("uses identity scales so pixel x/y are data coordinates", () => {
    const ctx = buildPhysicsAnnotationContext({
      width: 200,
      height: 100,
      pointNodes: [{ pointId: "a", x: 40, y: 20, r: 5 }]
    })
    expect(ctx.scales?.x?.(40)).toBe(40)
    expect(ctx.scales?.y?.(20)).toBe(20)
    expect(ctx.pointNodes?.[0]).toMatchObject({ pointId: "a", x: 40, y: 20 })
    expect(ctx.frameType).toBe("network")
  })
})

describe("bodiesToAnnotationAnchors", () => {
  it("projects live body centers and radii", () => {
    expect(bodiesToAnnotationAnchors([body("a", 12, 34, 7)])).toEqual([
      { pointId: "a", x: 12, y: 34, r: 7 }
    ])
  })
})

describe("PhysicsSVGOverlay", () => {
  it("always mounts an SVG shell for ChartContainer export even without chrome", () => {
    const { container } = render(
      <PhysicsSVGOverlay
        width={180}
        height={100}
        totalWidth={200}
        totalHeight={120}
        margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
      />
    )
    const svg = container.querySelector("svg.stream-physics-frame__overlay")
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute("width")).toBe("200")
    expect(svg?.getAttribute("height")).toBe("120")
  })

  it("renders title, legend swatches, and body-anchored labels", () => {
    render(
      <PhysicsSVGOverlay
        width={200}
        height={120}
        totalWidth={220}
        totalHeight={140}
        margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
        title="Overlay title"
        legend={{
          legendGroups: [
            {
              label: "Series",
              type: "fill",
              styleFn: (item) => ({ fill: item.color || "#4e79a7" }),
              items: [{ label: "Alpha", color: "#4e79a7" }]
            }
          ]
        }}
        pointNodes={[{ pointId: "core", x: 50, y: 40, r: 6 }]}
        annotations={[
          {
            type: "label",
            bodyId: "core",
            label: "Body note",
            dx: 10,
            dy: -12
          }
        ]}
      />
    )

    expect(screen.getByText("Overlay title")).toBeInTheDocument()
    expect(screen.getByText("Alpha")).toBeInTheDocument()
    expect(screen.getByText("Body note")).toBeInTheDocument()
  })

  it("honors x-threshold annotations in pixel space", () => {
    const { container } = render(
      <PhysicsSVGOverlay
        width={200}
        height={100}
        totalWidth={200}
        totalHeight={100}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        annotations={[
          {
            type: "x-threshold",
            x: 80,
            label: "Gate",
            color: "#f00"
          }
        ]}
      />
    )
    const line = container.querySelector("line")
    expect(line).not.toBeNull()
    expect(line?.getAttribute("x1")).toBe("80")
    expect(line?.getAttribute("x2")).toBe("80")
    expect(container.textContent).toMatch(/Gate/)
  })

  it("renders and observes body-anchored widget annotations", () => {
    const onAnnotationActivate = vi.fn()
    render(
      <PhysicsSVGOverlay
        width={200}
        height={100}
        totalWidth={200}
        totalHeight={100}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        pointNodes={[{ pointId: "mort", x: 80, y: 50, r: 8 }]}
        annotations={[{
          id: "mort-body",
          type: "widget",
          bodyId: "mort",
          content: <button>Wake Mort</button>
        }]}
        onAnnotationActivate={onAnnotationActivate}
      />
    )

    fireEvent.click(screen.getByRole("button"), { detail: 0 })
    expect(onAnnotationActivate).toHaveBeenCalledWith(expect.objectContaining({
      annotationId: "mort-body",
      inputType: "keyboard"
    }))
  })
})
