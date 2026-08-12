import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { act, render } from "@testing-library/react"
import {
  geoSceneNodeToSVG,
  networkSceneEdgeToSVG,
  networkSceneNodeToSVG,
  ordinalSceneNodeToSVG,
  xySceneNodeToSVG
} from "./SceneToSVG"
import { renderSceneWithBackend } from "./renderBackend"
import {
  sceneHasAuthoredCursor,
  setCanvasMarkCursor,
  useCanvasMarkCursorCleanup
} from "./sceneCursor"

function svgMarkup(node: React.ReactNode): string {
  return renderToStaticMarkup(<svg>{node}</svg>)
}

describe("scene cursor presentation", () => {
  it("preserves cursor styles for XY, ordinal, geo, and network SVG marks", () => {
    const rendered = [
      xySceneNodeToSVG({
        type: "point",
        x: 10,
        y: 20,
        r: 3,
        style: { cursor: "crosshair" },
        datum: {}
      }, 0),
      ordinalSceneNodeToSVG({
        type: "rect",
        x: 1,
        y: 2,
        w: 10,
        h: 20,
        style: { cursor: "grab" },
        datum: {}
      }, 0),
      geoSceneNodeToSVG({
        type: "point",
        x: 10,
        y: 20,
        r: 3,
        style: { cursor: "zoom-in" },
        datum: {}
      }, 0),
      networkSceneNodeToSVG({
        type: "circle",
        cx: 10,
        cy: 20,
        r: 3,
        style: { cursor: "pointer" },
        datum: {}
      }, 0),
      networkSceneEdgeToSVG({
        type: "line",
        x1: 0,
        y1: 0,
        x2: 20,
        y2: 20,
        style: { cursor: "col-resize" },
        datum: {}
      }, 0)
    ]

    const html = svgMarkup(<>{rendered}</>)
    for (const cursor of ["crosshair", "grab", "zoom-in", "pointer", "col-resize"]) {
      expect(html).toContain(`data-semiotic-mark-cursor="${cursor}"`)
      expect(html).toContain(`style="cursor:${cursor}"`)
    }
  })

  it("does not synthesize activation semantics for cursor-styled SVG marks", () => {
    const html = svgMarkup(xySceneNodeToSVG({
      type: "point",
      x: 10,
      y: 20,
      r: 3,
      style: { cursor: "pointer" },
      datum: {}
    }, 0))

    expect(html).toContain('data-semiotic-mark-cursor="pointer"')
    expect(html).not.toContain('role="button"')
    expect(html).not.toContain("tabindex=")
    expect(html).not.toContain("onclick=")
  })

  it("lets an explicit custom-backend element cursor override inherited scene presentation", () => {
    const node = {
      type: "point",
      style: { cursor: "pointer" as const },
      datum: {}
    }
    const backend = {
      id: "cursor-backend",
      cacheKey: () => "cursor-backend",
      drawCanvas: () => true,
      renderStaticSVG: () => <circle style={{ cursor: "wait" }} />
    }
    const html = svgMarkup(renderSceneWithBackend({
      node,
      index: 0,
      renderMode: backend,
      fallback: () => null
    }))

    expect(html).toContain('style="cursor:pointer"')
    expect(html).toContain('<circle style="cursor:wait"')
  })

  it("uses the established top-path hit channel for area cursors in SVG/SSR", () => {
    const area = {
      type: "area" as const,
      topPath: [[10, 50], [50, 30], [90, 50]] as [number, number][],
      bottomPath: [[10, 100], [50, 100], [90, 100]] as [number, number][],
      style: { fill: "#4682b4", cursor: "pointer" as const },
      datum: [{ x: 1 }, { x: 5 }, { x: 9 }]
    }
    const html = svgMarkup(xySceneNodeToSVG(area, 0, undefined, 12))

    expect(html).toContain('data-semiotic-cursor-hit-target="area-top-path"')
    expect(html).toContain('data-semiotic-mark-cursor="pointer"')
    expect(html).toContain('stroke-width="24"')
    expect(html.match(/style="cursor:pointer"/g)).toHaveLength(1)
  })

  it("leaves canvas-only tolerance halos out of native SVG mark geometry", () => {
    const html = svgMarkup(xySceneNodeToSVG({
      type: "point",
      x: 10,
      y: 20,
      r: 3,
      style: { cursor: "pointer" },
      datum: {}
    }, 0))

    expect(html).toContain('data-semiotic-mark-cursor="pointer"')
    expect(html).not.toContain("data-semiotic-cursor-hit-target")
  })

  it("treats interactive:false as suppressing authored cursor presentation", () => {
    const decorativeArea = {
      type: "area" as const,
      topPath: [[10, 50], [50, 30], [90, 50]] as [number, number][],
      bottomPath: [[10, 100], [50, 100], [90, 100]] as [number, number][],
      style: { fill: "#4682b4", cursor: "pointer" as const },
      datum: [{ x: 1 }, { x: 5 }, { x: 9 }],
      interactive: false
    }

    const decorativePoint = {
      type: "point" as const,
      x: 10,
      y: 20,
      r: 3,
      style: { cursor: "crosshair" as const },
      datum: {},
      interactive: false
    }
    const decorativeEdge = {
      type: "line" as const,
      x1: 0,
      y1: 0,
      x2: 20,
      y2: 20,
      style: { cursor: "col-resize" as const },
      datum: {},
      interactive: false
    }

    expect(
      sceneHasAuthoredCursor([
        decorativeArea,
        decorativePoint,
        decorativeEdge
      ])
    ).toBe(false)
    const html = svgMarkup(<>
      {xySceneNodeToSVG(decorativeArea, 0)}
      {xySceneNodeToSVG(decorativePoint, 1)}
      {networkSceneEdgeToSVG(decorativeEdge, 0)}
    </>)
    expect(html).not.toContain("data-semiotic-mark-cursor")
    expect(html).not.toContain("cursor:")
  })

  it("sets and restores the actual retained-mark canvas cursor", () => {
    const canvas = document.createElement("canvas")
    setCanvasMarkCursor(canvas, "pointer")
    expect(canvas.style.cursor).toBe("pointer")
    setCanvasMarkCursor(canvas)
    expect(canvas.style.cursor).toBe("")
  })

  it("clears a canvas that mounted after the cleanup hook's first effect", () => {
    function LateCanvas({ show }: { show: boolean }) {
      const ref = React.useRef<HTMLCanvasElement | null>(null)
      useCanvasMarkCursorCleanup(ref)
      React.useEffect(() => {
        if (show) setCanvasMarkCursor(ref.current, "pointer")
      }, [show])
      return show ? <canvas ref={ref} /> : null
    }

    const view = render(<LateCanvas show={false} />)
    act(() => view.rerender(<LateCanvas show />))
    const canvas = view.container.querySelector("canvas")!
    expect(canvas.style.cursor).toBe("pointer")
    view.unmount()
    expect(canvas.style.cursor).toBe("")
  })
})
