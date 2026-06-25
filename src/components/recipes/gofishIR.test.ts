import { describe, expect, it } from "vitest"
import { fromGofishIR, unstable_fromGofishIR } from "./gofishIR"
import type { GofishDisplayListDocument } from "./gofishIR"
import {
  bobaIR,
  bottleIR,
  flowerIR,
  gofishIRExamples,
  pythonIR,
  treemapIR
} from "./gofishIRExamples"
import type { NetworkLayoutContext } from "../stream/networkCustomLayout"
import type { Datum } from "../charts/shared/datumTypes"

// A minimal NetworkLayoutContext. The adapter's layout ignores ctx.nodes/edges
// (it reads the baked document from the closure or ctx.config.displayList).
function makeCtx(config: Record<string, unknown> = {}): NetworkLayoutContext {
  return {
    nodes: [] as unknown as NetworkLayoutContext["nodes"],
    edges: [] as unknown as NetworkLayoutContext["edges"],
    dimensions: {
      width: 640,
      height: 460,
      plot: { x: 0, y: 0, width: 640, height: 460 }
    },
    theme: {
      semantic: {
        primary: "#4e79a7"
      } as NetworkLayoutContext["theme"]["semantic"],
      categorical: ["#4e79a7"]
    },
    resolveColor: (k) => k,
    config,
    selection: null
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
    const band = nodes.find(
      (n) => (n.datum as Datum | null)?.component === "tapioca"
    )
    expect(typeof (band?.datum as Datum).volume).toBe("number")
    expect(typeof (band?.datum as Datum).name).toBe("string")
  })

  it("treats the python memory diagram's datum-less marks (cells, pointer arrows) as overlay chrome, not hit targets", () => {
    const cfg = unstable_fromGofishIR(pythonIR)
    const result = cfg.networkLayout(makeCtx())
    // The pointer arrows render as paths in the overlay…
    expect(overlayString(result.overlays)).toContain('"path"')
    // …and because the diagram is built from literal values (no data-bound marks),
    // nothing carries a datum, so the role+datum contract yields zero hit targets
    // even though many items are tagged role:"node".
    const nodes = result.sceneNodes ?? []
    expect(nodes.length).toBe(cfg.nodes.length)
    expect(nodes.length).toBe(0)
  })
})

// ── Robustness ────────────────────────────────────────────────────────────

describe("unstable_fromGofishIR — guards", () => {
  it("warns (not throws) when handed something other than a display list", () => {
    const frontend = {
      irVersion: 0,
      ir: "gofish-frontend",
      viewport: { w: 1, h: 1 },
      items: []
    } as unknown as GofishDisplayListDocument
    const cfg = unstable_fromGofishIR(frontend)
    expect(cfg.warnings?.some((w) => w.includes("gofish-display-list"))).toBe(
      true
    )
  })

  it("warns on an unexpected irVersion", () => {
    const future = {
      irVersion: 1,
      ir: "gofish-display-list",
      viewport: { w: 1, h: 1 },
      items: []
    } as unknown as GofishDisplayListDocument
    const cfg = unstable_fromGofishIR(future)
    expect(cfg.warnings?.some((w) => w.includes("irVersion"))).toBe(true)
  })

  it("handles an empty display list without throwing", () => {
    const empty: GofishDisplayListDocument = {
      irVersion: 0,
      ir: "gofish-display-list",
      viewport: { w: 10, h: 10 },
      items: []
    }
    const cfg = unstable_fromGofishIR(empty)
    expect(cfg.nodes).toEqual([])
    expect(cfg.warnings?.some((w) => w.includes("no items"))).toBe(true)
    const result = cfg.networkLayout(makeCtx())
    expect(result.sceneNodes ?? []).toEqual([])
  })
})
