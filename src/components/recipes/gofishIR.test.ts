import { describe, expect, it } from "vitest"
import { fromGofishIR, unstable_fromGofishIR } from "./gofishIR"
import type { GofishDisplayListDocument } from "./gofishIR"
import { barsIR, bobaIR, bottleIR, flowerIR, gofishIRExamples, pythonIR, treemapIR } from "./gofishIRExamples"
import type { NetworkLayoutContext } from "../stream/networkCustomLayout"
import type { Datum } from "../charts/shared/datumTypes"

// A minimal NetworkLayoutContext. The adapter's layout ignores ctx.nodes/edges
// (it reads the baked document from the closure or ctx.config.displayList).
function makeCtx(config: Record<string, unknown> = {}): NetworkLayoutContext {
  return {
    nodes: [] as unknown as NetworkLayoutContext["nodes"],
    edges: [] as unknown as NetworkLayoutContext["edges"],
    dimensions: { width: 640, height: 460, plot: { x: 0, y: 0, width: 640, height: 460 } },
    theme: { semantic: { primary: "#4e79a7" } as NetworkLayoutContext["theme"]["semantic"], categorical: ["#4e79a7"] },
    resolveColor: (k) => k,
    config,
    selection: null,
  }
}

const overlayString = (overlays: unknown) => JSON.stringify(overlays)

// ── It always produces a scale-free network config ──────────────────────────

describe("unstable_fromGofishIR — config shape", () => {
  it("routes every baked display list to the network family and surfaces the baked viewport", () => {
    for (const ex of gofishIRExamples) {
      const cfg = unstable_fromGofishIR(ex.doc)
      expect(cfg.family, ex.key).toBe("network")
      expect(cfg.networkLayout, ex.key).toBeTypeOf("function")
      expect(cfg.edges, ex.key).toEqual([])
      expect(cfg.width, ex.key).toBe(ex.doc.viewport.w)
      expect(cfg.height, ex.key).toBe(ex.doc.viewport.h)
      expect(cfg.layoutConfig.displayList, ex.key).toBe(ex.doc)
    }
  })

  it("keeps the deprecated alias pointing at the same entry", () => {
    expect(fromGofishIR).toBe(unstable_fromGofishIR)
  })
})

// ── role drives the node/overlay split ───────────────────────────────────────

describe("unstable_fromGofishIR — role-driven mapping", () => {
  it("emits one transparent hit-rect scene node per role:node item carrying a datum", () => {
    const cfg = unstable_fromGofishIR(barsIR)
    const result = cfg.networkLayout(makeCtx())
    const nodes = result.sceneNodes ?? []

    // One hit node per data-bearing item; equals the extracted node rows.
    expect(nodes.length).toBeGreaterThan(0)
    expect(nodes.length).toBe(cfg.nodes.length)

    for (const node of nodes) {
      expect(node.type).toBe("rect")
      // transparent hit target, not painted chrome
      expect(node.style.fill).toBe("rgba(0,0,0,0)")
      expect(node.datum).toBeTruthy()
    }
    // The bars carry their source rows through as provenance.
    const species = nodes.map((n) => (n.datum as Datum | null)?.species)
    expect(species).toContain("Walleye")
  })

  it("does not make a hit target out of chrome (legend swatches / axis ticks carry no datum)", () => {
    // The bars fixture bakes a legend (rect swatch + text label, no datum). The
    // node count must be strictly fewer than the total baked item count.
    const cfg = unstable_fromGofishIR(barsIR)
    expect(cfg.nodes.length).toBeLessThan(barsIR.items.length)
  })

  it("renders the full ordered item list into one SVG overlay layer, every kind verbatim", () => {
    const cfg = unstable_fromGofishIR(flowerIR)
    const result = cfg.networkLayout(makeCtx())
    expect(result.overlays).not.toBeNull()
    // The polar transform is already folded into absolute-pixel paths.
    expect(overlayString(result.overlays)).toContain('"path"')
    // Warped petals are the data-bearing marks → hit nodes.
    expect((result.sceneNodes ?? []).length).toBeGreaterThan(0)
  })

  it("carries non-rect geometry (treemap circles) through as ellipse overlays + ellipse-derived hit boxes", () => {
    const cfg = unstable_fromGofishIR(treemapIR)
    const result = cfg.networkLayout(makeCtx())
    expect(overlayString(result.overlays)).toContain('"ellipse"')
    // Each passenger circle becomes a data-bearing node with a positive hit box.
    const nodes = result.sceneNodes ?? []
    expect(nodes.length).toBeGreaterThan(10)
    for (const n of nodes) {
      expect(n.type === "rect" && n.w > 0 && n.h > 0).toBe(true)
    }
  })

  it("preserves image marks in the overlay (pictorial bottle silhouettes)", () => {
    const cfg = unstable_fromGofishIR(bottleIR)
    const result = cfg.networkLayout(makeCtx())
    expect(overlayString(result.overlays)).toContain('"image"')
    expect((result.sceneNodes ?? []).length).toBeGreaterThan(0)
  })

  it("carries per-band provenance for the boba stacked-volume cups", () => {
    const cfg = unstable_fromGofishIR(bobaIR)
    const result = cfg.networkLayout(makeCtx())
    const nodes = result.sceneNodes ?? []
    expect(nodes.length).toBeGreaterThan(0)
    // every band knows its drink + component + volume
    const components = nodes.map((n) => (n.datum as Datum | null)?.component)
    expect(components).toContain("tapioca")
    expect(components).toContain("tea")
    const band = nodes.find((n) => (n.datum as Datum | null)?.component === "tapioca")
    expect(typeof (band?.datum as Datum).volume).toBe("number")
    expect(typeof (band?.datum as Datum).name).toBe("string")
  })

  it("treats the python heap connector (a datum-less path) as overlay chrome, not a hit target", () => {
    const cfg = unstable_fromGofishIR(pythonIR)
    const result = cfg.networkLayout(makeCtx())
    // The linked-list connector renders as a path in the overlay…
    expect(overlayString(result.overlays)).toContain('"path"')
    // …but only the value cells (which carry a datum) become hit targets.
    const nodes = result.sceneNodes ?? []
    expect(nodes.length).toBe(cfg.nodes.length)
    for (const n of nodes) expect(n.datum).toBeTruthy()
    // the cells carry their heap value
    expect(nodes.some((n) => (n.datum as Datum | null)?.value !== undefined)).toBe(true)
  })
})

// ── The cheap re-layout path: swap the document via layoutConfig ─────────────

describe("unstable_fromGofishIR — document override via layoutConfig", () => {
  it("reads ctx.config.displayList when present, falling back to the captured document", () => {
    const cfg = unstable_fromGofishIR(barsIR)
    const swapped: GofishDisplayListDocument = {
      irVersion: 0,
      ir: "gofish-display-list",
      viewport: { w: 100, h: 100 },
      items: [{ kind: "rect", x: 5, y: 5, w: 20, h: 30, style: { fill: "#abc" }, datum: { only: 1 }, role: "node" }],
    }
    // closure default → bars
    expect((cfg.networkLayout(makeCtx()).sceneNodes ?? []).length).toBe(cfg.nodes.length)
    // config override → the single swapped node
    const overridden = cfg.networkLayout(makeCtx({ displayList: swapped })).sceneNodes ?? []
    expect(overridden.length).toBe(1)
    expect((overridden[0].datum as Datum).only).toBe(1)
  })
})

// ── Robustness ────────────────────────────────────────────────────────────

describe("unstable_fromGofishIR — guards", () => {
  it("warns (not throws) when handed something other than a display list", () => {
    const frontend = { irVersion: 0, ir: "gofish-frontend", viewport: { w: 1, h: 1 }, items: [] } as unknown as GofishDisplayListDocument
    const cfg = unstable_fromGofishIR(frontend)
    expect(cfg.warnings?.some((w) => w.includes("gofish-display-list"))).toBe(true)
  })

  it("warns on an unexpected irVersion", () => {
    const future = { irVersion: 1, ir: "gofish-display-list", viewport: { w: 1, h: 1 }, items: [] } as unknown as GofishDisplayListDocument
    const cfg = unstable_fromGofishIR(future)
    expect(cfg.warnings?.some((w) => w.includes("irVersion"))).toBe(true)
  })

  it("handles an empty display list without throwing", () => {
    const empty: GofishDisplayListDocument = { irVersion: 0, ir: "gofish-display-list", viewport: { w: 10, h: 10 }, items: [] }
    const cfg = unstable_fromGofishIR(empty)
    expect(cfg.nodes).toEqual([])
    expect(cfg.warnings?.some((w) => w.includes("no items"))).toBe(true)
    const result = cfg.networkLayout(makeCtx())
    expect(result.sceneNodes ?? []).toEqual([])
  })
})
