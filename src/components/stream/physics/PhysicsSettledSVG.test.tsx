import { describe, expect, it } from "vitest"
import { buildPhysicsSettledProjection } from "./PhysicsAccessibility"
import type { PhysicsBodyState } from "./PhysicsKernel"
import { PhysicsPipelineStore } from "./PhysicsPipelineStore"
import { renderPhysicsSettledSVG } from "./PhysicsSettledSVG"

function circle(id: string, x: number, y: number, windowIndex = 0) {
  return {
    id,
    x,
    y,
    shape: { type: "circle" as const, radius: 4 },
    mass: 1,
    datum: { id, label: id, windowIndex }
  }
}

function box(id: string, x: number, y: number, windowIndex = 1) {
  return {
    id,
    x,
    y,
    shape: { type: "aabb" as const, width: 10, height: 12 },
    mass: 1,
    datum: { id, label: id, windowIndex }
  }
}

function windowContainerId(body: PhysicsBodyState): string | undefined {
  const datum = body.datum as { windowIndex?: number } | undefined
  return datum?.windowIndex == null ? undefined : `window-${datum.windowIndex}`
}

describe("physics settled SVG renderer", () => {
  it("renders a settled physics scene to standalone SVG with evidence", () => {
    const store = new PhysicsPipelineStore({
      fixedDt: 1 / 60,
      kernel: {
        seed: 17,
        gravity: { x: 0, y: 0 },
        sleepSpeed: 100,
        sleepAfter: 0.01
      }
    })
    store.spawnNow(circle("event-a", 24, 32, 0))
    store.spawnNow(box("event-b", 60, 70, 1))

    const projectionRows = buildPhysicsSettledProjection(
      [
        { id: "window-0", label: "0-12s" },
        {
          id: "window-1",
          label: "12-24s",
          secondary: 1,
          secondaryLabel: "late"
        }
      ],
      {
        bodies: store.readBodies(),
        getContainerId: windowContainerId
      }
    )

    const result = renderPhysicsSettledSVG(store, {
      width: 160,
      height: 120,
      title: "Settled EventDrop",
      description: "Events settled into two event-time windows.",
      background: "#ffffff",
      idPrefix: "event drop",
      projectionRows,
      bodyStyle: (body) => ({
        fill: body.shape.type === "circle" ? "#2563eb" : "#dc2626"
      }),
      getBodyLabel: (body) => `Rendered ${body.id}`
    })

    expect(result.svg).toContain("<svg")
    expect(result.svg).toContain('role="img"')
    expect(result.svg).toContain(
      'aria-labelledby="event_drop-title event_drop-desc"'
    )
    expect(result.svg).toContain("<title")
    expect(result.svg).toContain("Settled EventDrop")
    expect(result.svg).toContain("<desc")
    expect(result.svg).toContain("Events settled into two event-time windows.")
    expect(result.svg).toContain("<circle")
    expect(result.svg).toContain('cx="24"')
    expect(result.svg).toContain("<rect")
    expect(result.svg).toContain('x="55"')
    expect(result.svg).toContain('fill="#2563eb"')
    expect(result.svg).toContain('fill="#dc2626"')
    expect(result.svg).not.toContain('transform="translate(0,0)"')
    const document = new DOMParser().parseFromString(
      result.svg,
      "image/svg+xml"
    )
    const svg = document.documentElement
    const background = svg.querySelector('rect[fill="#ffffff"]')
    const dataArea = svg.querySelector('g[id="event_drop-data-area"]')
    expect(background?.parentElement).toBe(svg)
    expect(dataArea?.hasAttribute("transform")).toBe(false)
    expect(result.scene.sceneNodes.map((node) => node.type)).toEqual([
      "point",
      "rect"
    ])
    expect(result.scene.sceneNodes[0]).toMatchObject({
      accessibility: { label: "Rendered event-a" }
    })
    expect(result.evidence).toMatchObject({
      bodyCount: 2,
      sleepingCount: 2,
      settled: true,
      seed: 17,
      binCounts: [
        { id: "window-0", label: "0-12s", count: 1 },
        {
          id: "window-1",
          label: "12-24s",
          count: 1,
          secondary: 1,
          secondaryLabel: "late"
        }
      ]
    })
    expect(result.evidence.stepsRun).toBeGreaterThan(0)
  })

  it("resolves graphics callbacks around the settled body layer", () => {
    const store = new PhysicsPipelineStore({
      fixedDt: 1 / 60,
      kernel: {
        seed: 23,
        gravity: { x: 0, y: 0 },
        sleepSpeed: 100,
        sleepAfter: 0.01
      }
    })
    store.spawnNow(circle("layered-body", 40, 50))

    const contexts: Array<{
      size: number[]
      margin: { top: number; right: number; bottom: number; left: number }
    }> = []
    const result = renderPhysicsSettledSVG(store, {
      width: 180,
      height: 100,
      idPrefix: "layer order",
      margin: { top: 7, left: 11 },
      backgroundGraphicsBackdrop: "#f8fafc",
      backgroundGraphics: (context) => {
        contexts.push(context)
        return <circle data-testid="settled-background" cx={4} cy={5} r={2} />
      },
      foregroundGraphics: (context) => {
        contexts.push(context)
        return <circle data-testid="settled-foreground" cx={6} cy={7} r={2} />
      }
    })

    expect(contexts).toEqual([
      {
        size: [180, 100],
        margin: { top: 7, right: 0, bottom: 0, left: 11 }
      },
      {
        size: [180, 100],
        margin: { top: 7, right: 0, bottom: 0, left: 11 }
      }
    ])
    const backgroundIndex = result.svg.indexOf(
      'data-testid="settled-background"'
    )
    const bodyIndex = result.svg.indexOf('id="layer_order-data-area"')
    const foregroundIndex = result.svg.indexOf(
      'data-testid="settled-foreground"'
    )
    expect(backgroundIndex).toBeGreaterThan(-1)
    expect(bodyIndex).toBeGreaterThan(backgroundIndex)
    expect(foregroundIndex).toBeGreaterThan(bodyIndex)

    const document = new DOMParser().parseFromString(
      result.svg,
      "image/svg+xml"
    )
    const svg = document.documentElement
    const backdrop = svg.querySelector("rect.stream-frame-background__backdrop")
    const background = svg.querySelector('[data-testid="settled-background"]')
    const dataArea = svg.querySelector('g[id="layer_order-data-area"]')
    const foreground = svg.querySelector('[data-testid="settled-foreground"]')
    expect(backdrop?.parentElement).toBe(svg)
    expect(background?.parentElement?.getAttribute("transform")).toBe(
      "translate(11,7)"
    )
    expect(background?.parentElement?.parentElement).toBe(svg)
    expect(dataArea?.getAttribute("transform")).toBe("translate(11,7)")
    expect(dataArea?.parentElement).toBe(svg)
    expect(foreground?.parentElement).toBe(svg)
  })

  it("can explicitly own a backdrop beneath custom background graphics", () => {
    const store = new PhysicsPipelineStore({ fixedDt: 1 / 60 })
    store.spawnNow(circle("backdrop-body", 20, 20))

    const result = renderPhysicsSettledSVG(store, {
      width: 120,
      height: 80,
      background: "#should-remain-suppressed",
      backgroundGraphicsBackdrop: "var(--semiotic-bg, transparent)",
      backgroundGraphics: <g data-testid="custom-background" />
    })

    const backdropIndex = result.svg.indexOf(
      'class="stream-frame-background__backdrop"'
    )
    const backgroundIndex = result.svg.indexOf(
      'data-testid="custom-background"'
    )
    expect(backdropIndex).toBeGreaterThan(-1)
    expect(result.svg).toContain('width="120" height="80"')
    expect(result.svg).toContain('fill="var(--semiotic-bg, transparent)"')
    expect(backgroundIndex).toBeGreaterThan(backdropIndex)
    expect(result.svg).not.toContain("#should-remain-suppressed")
  })

  it("passes the sanitized idPrefix through to renderBodySVG", () => {
    // A custom renderBodySVG emitting `<defs>` (a filter, a gradient) needs
    // this prefix to namespace its own ids — otherwise two settled-physics
    // SVGs embedded in one document can collide on document-global SVG ids.
    const store = new PhysicsPipelineStore({ fixedDt: 1 / 60 })
    store.spawnNow(circle("custom-body", 20, 20))

    const receivedPrefixes: string[] = []
    renderPhysicsSettledSVG(store, {
      width: 100,
      height: 100,
      idPrefix: "chart one!",
      renderBodySVG: (_body, _style, index, idPrefix) => {
        receivedPrefixes.push(idPrefix)
        return (
          <g
            data-testid={`custom-${index}`}
            id={`${idPrefix}-custom-${index}`}
          />
        )
      }
    })

    expect(receivedPrefixes).toEqual(["chart_one_"])
  })

  it("wraps custom body SVG output with the authored body cursor", () => {
    const store = new PhysicsPipelineStore({ fixedDt: 1 / 60 })
    store.spawnNow(circle("cursor-body", 20, 20))

    const result = renderPhysicsSettledSVG(store, {
      width: 100,
      height: 100,
      bodyStyle: { cursor: "pointer" },
      renderBodySVG: () => (
        <path data-testid="custom-cursor-body" d="M0 0h8v8z" />
      )
    })

    expect(result.svg).toContain('data-semiotic-mark-cursor="pointer"')
    expect(result.svg).toContain('style="cursor:pointer"')
    expect(result.svg).toContain('data-testid="custom-cursor-body"')
  })

  it("falls back to the default body SVG when a custom renderer returns null", () => {
    const store = new PhysicsPipelineStore({ fixedDt: 1 / 60 })
    store.spawnNow(circle("fallback-body", 20, 20))

    const result = renderPhysicsSettledSVG(store, {
      width: 100,
      height: 100,
      renderBodySVG: () => null
    })

    expect(result.svg).toContain("<circle")
    expect(result.svg).toContain('cx="20"')
  })
})
