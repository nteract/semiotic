import { describe, it, expect } from "vitest"
import { packedClusterMatrix } from "./packedClusterMatrix"
import type { PackedClusterMatrixConfig } from "./packedClusterMatrix"
import { shade, makeShade, readField, dimFor, matchesHighlight, signatureKey, LayoutCache } from "./recipeUtils"
import { roundedEnclosure, boundsOf, bandLabel, markCallout } from "./recipeChrome"
import { legendGroupsFrom } from "./recipeLegend"
import { symbolPathString } from "../stream/symbolPath"
import { networkSceneNodeToSVG } from "../stream/SceneToSVG"
import type { ReactElement } from "react"
import type { NetworkLayoutContext, NetworkLayoutSelection } from "../stream/networkCustomLayout"
import type { RealtimeNode, NetworkSymbolNode } from "../stream/networkTypes"
import type { Datum } from "../charts/shared/datumTypes"

type FoundElement = { type: unknown; props: Record<string, unknown> }

/** Recursively collect React elements in a node tree matching a predicate. */
function findElements(
  node: unknown,
  pred: (el: FoundElement) => boolean,
  out: FoundElement[] = []
): FoundElement[] {
  if (Array.isArray(node)) {
    for (const c of node) findElements(c, pred, out)
    return out
  }
  if (node && typeof node === "object" && "type" in node) {
    const el = node as { type: unknown; props?: Record<string, unknown> }
    const found: FoundElement = { type: el.type, props: el.props ?? {} }
    if (pred(found)) out.push(found)
    if (el.props && "children" in el.props) findElements(el.props.children, pred, out)
  }
  return out
}

type Sat = {
  id: string
  region: string
  orbit: string
  mass: number
  category: string
  klass: string
  launch: string
  uk?: boolean
}

function nodesFrom(rows: Sat[]): RealtimeNode[] {
  // The frame hands recipes ingest-wrapped nodes: fields live on `node.data`.
  return rows.map((r) => ({ id: r.id, data: r as unknown as Datum })) as unknown as RealtimeNode[]
}

function makeCtx(
  config: PackedClusterMatrixConfig,
  nodes: RealtimeNode[],
  selection: NetworkLayoutSelection | null = null
): NetworkLayoutContext<PackedClusterMatrixConfig> {
  return {
    nodes,
    edges: [],
    dimensions: { width: 600, height: 400, plot: { x: 0, y: 0, width: 600, height: 400 } },
    theme: { semantic: { primary: "#4e79a7" }, categorical: ["#4e79a7", "#f28e2c", "#59a14f"] },
    resolveColor: (key: string) => {
      let h = 0
      for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
      return ["#4e79a7", "#f28e2c", "#59a14f"][Math.abs(h) % 3]
    },
    config,
    selection,
  }
}

const SAMPLE: Sat[] = [
  { id: "a1", region: "US", orbit: "LEO", mass: 200, category: "Comms", klass: "Biz", launch: "2019-01-01" },
  { id: "a2", region: "US", orbit: "LEO", mass: 1200, category: "Imaging", klass: "Defense", launch: "2010-01-01" },
  { id: "a3", region: "US", orbit: "GEO", mass: 4000, category: "Comms", klass: "Biz", launch: "2001-01-01" },
  { id: "b1", region: "EU", orbit: "LEO", mass: 300, category: "Research", klass: "Civil", launch: "2015-01-01" },
  { id: "b2", region: "EU", orbit: "GEO", mass: 2500, category: "Comms", klass: "Civil", launch: "2008-01-01" },
  { id: "c1", region: "China", orbit: "MEO", mass: 1500, category: "Navigation", klass: "Defense", launch: "2018-01-01" },
]

const baseConfig: PackedClusterMatrixConfig = {
  columnAccessor: "region",
  rowAccessor: "orbit",
  sizeAccessor: "mass",
  colorAccessor: "category",
  symbolAccessor: "klass",
  shadeAccessor: "launch",
  columnOrder: ["US", "EU", "China"],
  rowOrder: ["LEO", "MEO", "GEO"],
  symbolMap: { Biz: "circle", Civil: "star", Defense: "triangle" },
}

describe("packedClusterMatrix", () => {
  it("emits one symbol scene node per record", () => {
    const result = packedClusterMatrix(makeCtx(baseConfig, nodesFrom(SAMPLE)))
    const symbols = (result.sceneNodes ?? []).filter((n) => n.type === "symbol")
    expect(symbols).toHaveLength(SAMPLE.length)
  })

  it("positions every glyph inside the plot", () => {
    const result = packedClusterMatrix(makeCtx(baseConfig, nodesFrom(SAMPLE)))
    for (const n of (result.sceneNodes ?? []) as NetworkSymbolNode[]) {
      expect(n.cx).toBeGreaterThanOrEqual(0)
      expect(n.cx).toBeLessThanOrEqual(600)
      expect(n.cy).toBeGreaterThanOrEqual(0)
      expect(n.cy).toBeLessThanOrEqual(400)
      expect(n.size).toBeGreaterThan(0)
    }
  })

  it("maps the class field to glyph shape via symbolMap", () => {
    const result = packedClusterMatrix(makeCtx(baseConfig, nodesFrom(SAMPLE)))
    const byId = new Map(
      (result.sceneNodes ?? [])
        .filter((n): n is NetworkSymbolNode => n.type === "symbol")
        .map((n) => [n.id, n])
    )
    expect(byId.get("a1")?.symbolType).toBe("circle") // Biz
    expect(byId.get("b1")?.symbolType).toBe("star") // Civil
    expect(byId.get("a2")?.symbolType).toBe("triangle") // Defense
  })

  it("shades older launches lighter than newer within the same category", () => {
    const result = packedClusterMatrix(makeCtx(baseConfig, nodesFrom(SAMPLE)))
    const byId = new Map(
      (result.sceneNodes ?? [])
        .filter((n): n is NetworkSymbolNode => n.type === "symbol")
        .map((n) => [n.id, n])
    )
    // a1 (2019, Comms) vs a3 (2001, Comms): newer should be darker.
    const newer = lum(byId.get("a1")!.style.fill as string)
    const older = lum(byId.get("a3")!.style.fill as string)
    expect(older).toBeGreaterThan(newer)
  })

  it("dims glyphs that don't match a highlight", () => {
    const result = packedClusterMatrix(
      makeCtx({ ...baseConfig, highlight: { field: "category", value: "Comms" }, dimOpacity: 0.1 }, nodesFrom(SAMPLE))
    )
    const symbols = (result.sceneNodes ?? []).filter(
      (n): n is NetworkSymbolNode => n.type === "symbol"
    )
    const comms = symbols.filter((n) => (n.datum as Sat).category === "Comms")
    const other = symbols.filter((n) => (n.datum as Sat).category !== "Comms")
    expect(comms.every((n) => n.style.opacity === 1)).toBe(true)
    expect(other.every((n) => n.style.opacity === 0.1)).toBe(true)
  })

  it("highlights an exact region×orbit cell with a multi-field AND highlight", () => {
    const result = packedClusterMatrix(
      makeCtx(
        { ...baseConfig, highlight: [{ field: "region", value: "US" }, { field: "orbit", value: "LEO" }], dimOpacity: 0.1 },
        nodesFrom(SAMPLE)
      )
    )
    const symbols = (result.sceneNodes ?? []).filter((n): n is NetworkSymbolNode => n.type === "symbol")
    for (const n of symbols) {
      const d = n.datum as Sat
      const lit = d.region === "US" && d.orbit === "LEO"
      expect(n.style.opacity).toBe(lit ? 1 : 0.1)
    }
  })

  it("dims glyphs outside an active shared selection", () => {
    const selection: NetworkLayoutSelection = {
      isActive: true,
      predicate: (d) => (d as Sat).region === "US",
    }
    const result = packedClusterMatrix(makeCtx(baseConfig, nodesFrom(SAMPLE), selection))
    const symbols = (result.sceneNodes ?? []).filter(
      (n): n is NetworkSymbolNode => n.type === "symbol"
    )
    expect(symbols.filter((n) => (n.datum as Sat).region === "US").every((n) => n.style.opacity === 1)).toBe(true)
    expect(symbols.filter((n) => (n.datum as Sat).region !== "US").every((n) => (n.style.opacity ?? 1) < 1)).toBe(true)
  })

  it("draws a marker dot (in the overlay) for flagged records", () => {
    const flagged = SAMPLE.map((s) => (s.id === "b1" ? { ...s, uk: true } : s))
    const result = packedClusterMatrix(
      makeCtx({ ...baseConfig, markerAccessor: "uk", markerColor: "#fff" }, nodesFrom(flagged))
    )
    // Markers are decorative overlay circles (not scene nodes), so they don't
    // become separate hit/keyboard-nav targets over their own glyph.
    expect((result.sceneNodes ?? []).some((n) => n.type === "circle")).toBe(false)
    const markers = findElements(result.overlays, (el) => el.type === "circle" && el.props?.fill === "#fff")
    expect(markers).toHaveLength(1)
  })

  it("returns chrome overlays", () => {
    const result = packedClusterMatrix(makeCtx(baseConfig, nodesFrom(SAMPLE)))
    expect(result.overlays).toBeTruthy()
  })

  it("is deterministic across independent calls with the same data", () => {
    const a = packedClusterMatrix(makeCtx(baseConfig, nodesFrom(SAMPLE)))
    const b = packedClusterMatrix(makeCtx(baseConfig, nodesFrom(SAMPLE)))
    const pos = (r: typeof a) =>
      (r.sceneNodes ?? [])
        .filter((n): n is NetworkSymbolNode => n.type === "symbol")
        .map((n) => `${n.id}:${n.cx.toFixed(2)},${n.cy.toFixed(2)}`)
    expect(pos(a)).toEqual(pos(b))
  })

  it("falls back to a single default shape with no symbolAccessor", () => {
    const result = packedClusterMatrix(
      makeCtx({ columnAccessor: "region", rowAccessor: "orbit", defaultSymbol: "diamond" }, nodesFrom(SAMPLE))
    )
    const symbols = (result.sceneNodes ?? []).filter(
      (n): n is NetworkSymbolNode => n.type === "symbol"
    )
    expect(symbols.every((n) => n.symbolType === "diamond")).toBe(true)
  })

  it("handles empty data", () => {
    const result = packedClusterMatrix(makeCtx(baseConfig, []))
    expect(result.sceneNodes).toEqual([])
  })

  it("composite glyph: base circles + a stroked icon only for mapped values", () => {
    // iconAccessor → base mark is ALWAYS a circle; only values in iconMap get an
    // inner stroked icon (drawn in the overlay, not as a scene/hit node).
    const cfg: PackedClusterMatrixConfig = {
      columnAccessor: "region",
      rowAccessor: "orbit",
      sizeAccessor: "mass",
      iconAccessor: "klass",
      iconMap: { Civil: "star" },
      iconColor: "#fff",
      columnOrder: ["US", "EU", "China"],
      rowOrder: ["LEO", "MEO", "GEO"],
    }
    const result = packedClusterMatrix(makeCtx(cfg, nodesFrom(SAMPLE)))
    const symbols = (result.sceneNodes ?? []).filter((n): n is NetworkSymbolNode => n.type === "symbol")
    expect(symbols.every((n) => n.symbolType === "circle")).toBe(true)
    // Two Civil records (b1, b2) → two stroked icon paths in the overlay.
    const icons = findElements(
      result.overlays,
      (el) => el.type === "path" && el.props?.fill === "none" && el.props?.stroke === "#fff"
    )
    expect(icons).toHaveLength(SAMPLE.filter((s) => s.klass === "Civil").length)
  })

  it("banded mode draws one enclosure per row-band; stacked draws one per cell", () => {
    const enclosureCount = (cfg: PackedClusterMatrixConfig) => {
      const r = packedClusterMatrix(makeCtx(cfg, nodesFrom(SAMPLE)))
      return findElements(r.overlays, (el) => el.type === "rect" && el.props?.fill === "none").length
    }
    // SAMPLE: rows {LEO, MEO, GEO} = 3 bands; cells {US-LEO,US-GEO,EU-LEO,EU-GEO,China-MEO} = 5.
    expect(enclosureCount({ ...baseConfig, rowMode: "banded" })).toBe(3)
    expect(enclosureCount({ ...baseConfig, rowMode: "stacked" })).toBe(5)
  })

  it("renders a callout (ring + connector + label) to the matching mark", () => {
    const result = packedClusterMatrix(
      makeCtx({ ...baseConfig, callouts: [{ field: "id", value: "a1", label: "Probe A1" }] }, nodesFrom(SAMPLE))
    )
    const labels = findElements(result.overlays, (el) => el.type === "text")
    expect(labels.some((el) => el.props?.children === "Probe A1")).toBe(true)
  })
})

describe("recipeChrome kit", () => {
  it("roundedEnclosure returns a stroked, non-filled rect", () => {
    const el = roundedEnclosure({ x: 1, y: 2, width: 10, height: 20, stroke: "#fff" }) as {
      type: string
      props: Record<string, unknown>
    }
    expect(el.type).toBe("rect")
    expect(el.props.fill).toBe("none")
    expect(el.props.stroke).toBe("#fff")
    expect(el.props.width).toBe(10)
  })

  it("boundsOf computes a padded bounding box, null when empty", () => {
    expect(boundsOf([], 2)).toBeNull()
    const b = boundsOf([{ x: 10, y: 10, r: 2 }, { x: 20, y: 30, r: 4 }], 1)!
    expect(b.x).toBe(10 - 2 - 1)
    expect(b.y).toBe(10 - 2 - 1)
    expect(b.width).toBe(20 + 4 - (10 - 2) + 2)
  })

  it("bandLabel suppresses a label that would overflow maxWidth", () => {
    expect(bandLabel({ text: "x", x: 0, y: 0, maxWidth: 100 })).not.toBeNull()
    expect(bandLabel({ text: "a very long label that overflows", x: 0, y: 0, maxWidth: 20 })).toBeNull()
  })

  it("markCallout draws a connector path and a label, plus a ring when markRadius>0", () => {
    const el = markCallout({ markX: 50, markY: 50, labelX: 50, labelY: 100, label: "L", markRadius: 6 }) as {
      props: { children: unknown }
    }
    const kids = findElements(el, () => true)
    expect(kids.some((k) => k.type === "path")).toBe(true)
    expect(kids.some((k) => k.type === "circle")).toBe(true)
    expect(kids.some((k) => k.type === "text" && k.props?.children === "L")).toBe(true)
  })
})

describe("readField", () => {
  it("reads from node.data first, then the node, then the fallback", () => {
    expect(readField({ data: { a: 5 }, a: 9 }, "a", 0)).toBe(5)
    expect(readField({ a: 9 }, "a", 0)).toBe(9)
    expect(readField({ data: {} }, "missing", "fb")).toBe("fb")
    expect(readField(null, "a", "fb")).toBe("fb")
  })
})

describe("symbol marks are keyboard-navigable", () => {
  it("extractNetworkNavPoints includes symbol nodes", async () => {
    const { extractNetworkNavPoints } = await import("../stream/keyboardNav")
    const result = packedClusterMatrix(makeCtx(baseConfig, nodesFrom(SAMPLE)))
    const navPoints = extractNetworkNavPoints((result.sceneNodes ?? []) as never)
    // Every emitted glyph should yield a nav point (was 0 before symbol support).
    expect(navPoints.length).toBe(SAMPLE.length)
  })
})

describe("symbolPathString", () => {
  const names = ["circle", "square", "triangle", "diamond", "star", "cross", "wye", "chevron"]
  it("produces a non-empty path for every named shape", () => {
    for (const n of names) {
      const d = symbolPathString(n, 120)
      expect(typeof d).toBe("string")
      expect(d.length).toBeGreaterThan(0)
      expect(d.startsWith("M")).toBe(true)
    }
  })
  it("distinguishes shapes", () => {
    expect(symbolPathString("circle", 120)).not.toEqual(symbolPathString("triangle", 120))
    expect(symbolPathString("chevron", 120)).not.toEqual(symbolPathString("star", 120))
  })
  it("returns a custom path verbatim", () => {
    expect(symbolPathString("circle", 120, "M0,0L1,1Z")).toBe("M0,0L1,1Z")
  })
})

describe("networkSceneNodeToSVG (symbol)", () => {
  it("renders a symbol node as a translated path", () => {
    const node: NetworkSymbolNode = {
      type: "symbol",
      cx: 40,
      cy: 25,
      size: 120,
      symbolType: "star",
      style: { fill: "#7b52c9", opacity: 0.9 },
      datum: { id: "x" },
      id: "x",
    }
    const el = networkSceneNodeToSVG(node, 0) as { type: string; props: Record<string, unknown> }
    expect(el.type).toBe("path")
    expect(typeof el.props.d).toBe("string")
    expect((el.props.d as string).length).toBeGreaterThan(0)
    expect(el.props.transform).toContain("translate(40,25)")
    expect(el.props.fill).toBe("#7b52c9")
  })
})

describe("shade / makeShade", () => {
  it("lightens toward t=0 and darkens toward t=1", () => {
    const base = "#7b52c9"
    expect(lum(shade(base, 0))).toBeGreaterThan(lum(shade(base, 0.5)))
    expect(lum(shade(base, 0.5))).toBeGreaterThan(lum(shade(base, 1)))
  })
  it("makeShade is stable for repeated calls", () => {
    const f = makeShade("#33c08d")
    expect(f(0.3)).toBe(f(0.3))
  })
})

describe("dimFor / matchesHighlight", () => {
  const d = { region: "US", orbit: "LEO" } as unknown as Datum

  it("matchesHighlight: nullish highlight matches everything", () => {
    expect(matchesHighlight(d, null)).toBe(true)
    expect(matchesHighlight(d, undefined)).toBe(true)
    expect(matchesHighlight(d, { field: "region", value: null })).toBe(true)
  })

  it("matchesHighlight: single + AND-array constraints", () => {
    expect(matchesHighlight(d, { field: "region", value: "US" })).toBe(true)
    expect(matchesHighlight(d, { field: "region", value: "EU" })).toBe(false)
    expect(matchesHighlight(d, [{ field: "region", value: "US" }, { field: "orbit", value: "LEO" }])).toBe(true)
    expect(matchesHighlight(d, [{ field: "region", value: "US" }, { field: "orbit", value: "GEO" }])).toBe(false)
  })

  it("dimFor: no cue ⇒ everything at baseOpacity", () => {
    expect(dimFor(d, {})).toBe(1)
    expect(dimFor(d, { baseOpacity: 0.45 })).toBe(0.45)
  })

  it("dimFor: highlight lights matches, dims the rest", () => {
    expect(dimFor(d, { highlight: { field: "region", value: "US" }, dimOpacity: 0.1 })).toBe(1)
    expect(dimFor(d, { highlight: { field: "region", value: "EU" }, dimOpacity: 0.1 })).toBe(0.1)
  })

  it("dimFor: predicate composes with highlight (AND)", () => {
    // matches highlight but fails predicate ⇒ dimmed
    expect(
      dimFor(d, { highlight: { field: "region", value: "US" }, predicate: () => false, dimOpacity: 0.2 })
    ).toBe(0.2)
  })

  it("dimFor: brighten lifts the matched opacity, capped at 1", () => {
    // parallelCoordinates: base 0.45 + 0.4 brighten on a match
    expect(dimFor(d, { predicate: () => true, baseOpacity: 0.45, brighten: 0.4 })).toBeCloseTo(0.85)
    expect(dimFor(d, { predicate: () => true, baseOpacity: 0.8, brighten: 0.4 })).toBe(1)
    expect(dimFor(d, { predicate: () => false, baseOpacity: 0.45, dimOpacity: 0.08, brighten: 0.4 })).toBe(0.08)
  })
})

describe("signatureKey / LayoutCache", () => {
  it("signatureKey is order-sensitive and stable", () => {
    expect(signatureKey([1, "a", true])).toBe(signatureKey([1, "a", true]))
    expect(signatureKey([1, 2])).not.toBe(signatureKey([2, 1]))
  })

  it("LayoutCache.getOrCompute computes on miss, reuses on hit", () => {
    const cache = new LayoutCache<number>(3)
    let calls = 0
    const compute = () => { calls++; return 42 }
    expect(cache.getOrCompute("k", compute)).toBe(42)
    expect(cache.getOrCompute("k", compute)).toBe(42)
    expect(calls).toBe(1) // second call was a cache hit
  })

  it("LayoutCache evicts wholesale past maxSize (bounded)", () => {
    const cache = new LayoutCache<number>(2)
    cache.set("a", 1)
    cache.set("b", 2)
    expect(cache.size).toBe(2)
    cache.set("c", 3) // size 2 >= max 2 ⇒ clear, then set
    expect(cache.size).toBe(1)
    expect(cache.get("a")).toBeUndefined()
    expect(cache.get("c")).toBe(3)
  })
})

describe("legendGroupsFrom", () => {
  it("builds a fill color group from a colorMap", () => {
    const [g] = legendGroupsFrom({ colorMap: { A: "#f00", B: "#0f0" }, colorLabel: "Cat" })
    expect(g.label).toBe("Cat")
    expect(g.type).toBe("fill")
    expect(g.items.map((i) => i.label)).toEqual(["A", "B"])
    expect(g.styleFn(g.items[0], 0).fill).toBe("#f00")
  })

  it("builds a color group from keys + resolver, line type", () => {
    const [g] = legendGroupsFrom({ keys: ["x"], color: (k) => (k === "x" ? "#abc" : "#000"), colorType: "line" })
    expect(g.type).toBe("line")
    expect(g.items[0].color).toBe("#abc")
    expect(g.styleFn(g.items[0], 0).fill).toBe("none")
  })

  it("symbol group renders a glyph path via the function type", () => {
    const groups = legendGroupsFrom({ symbolMap: { Civil: "star", Defense: "triangle" }, symbolLabel: "Class" })
    const g = groups[0]
    expect(typeof g.type).toBe("function")
    const el = (g.type as (i: typeof g.items[0]) => ReactElement)(g.items[0]) as {
      type: string
      props: Record<string, unknown>
    }
    expect(el.type).toBe("path")
    expect(typeof el.props.d).toBe("string")
    expect((el.props.d as string).startsWith("M")).toBe(true)
  })

  it("size group renders sized circles from the radius scale", () => {
    const groups = legendGroupsFrom({ sizeStops: [10, 100], sizeRadius: (v) => Math.sqrt(v), sizeLabel: "Mass" })
    const g = groups[0]
    const el = (g.type as (i: typeof g.items[0]) => ReactElement)(g.items[1]) as {
      type: string
      props: Record<string, unknown>
    }
    expect(el.type).toBe("circle")
    expect(el.props.r).toBeCloseTo(10) // sqrt(100)
  })

  it("emits one group per provided channel in color → symbol → size order", () => {
    const groups = legendGroupsFrom({
      colorMap: { A: "#f00" },
      symbolMap: { S: "star" },
      sizeStops: [1],
      sizeRadius: () => 4,
    })
    expect(groups).toHaveLength(3)
    expect(groups[0].type).toBe("fill")
    expect(typeof groups[1].type).toBe("function")
    expect(typeof groups[2].type).toBe("function")
  })

  it("returns an empty array when no channel is provided", () => {
    expect(legendGroupsFrom({})).toEqual([])
  })
})

// Rough relative luminance of an "rgb(r, g, b)" / "#rrggbb" string.
function lum(color: string): number {
  let r = 0
  let g = 0
  let b = 0
  const m = color.match(/rgb\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i)
  if (m) {
    r = +m[1]
    g = +m[2]
    b = +m[3]
  } else if (color.startsWith("#") && color.length === 7) {
    r = parseInt(color.slice(1, 3), 16)
    g = parseInt(color.slice(3, 5), 16)
    b = parseInt(color.slice(5, 7), 16)
  }
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
