import { afterEach, describe, expect, it } from "vitest"
import { scaleBand, scaleLinear } from "d3-scale"
import { fromGofishIR } from "./gofishIR"
import type { GofishRootIR } from "./gofishIR"
import { interpretToMarks } from "./gofishInterpreter"
import { bobaGeometryLambda, registerGofishLambda, unregisterGofishLambda } from "./gofishLambdas"
import type { BobaCellGeometry } from "./gofishLambdas"
import {
  bobaIR,
  bottleIR,
  flowerIR,
  gofishIRExamples,
  polarRibbonIR,
  pythonMemoryIR,
  titanicCircleTreemapIR,
} from "./gofishIRExamples"
import type { LayoutContext } from "../stream/customLayout"
import type { NetworkLayoutContext } from "../stream/networkCustomLayout"
import type { OrdinalLayoutContext } from "../stream/ordinalCustomLayout"
import type { Datum } from "../charts/shared/datumTypes"

const FRAME = { x: 0, y: 0, width: 400, height: 200 }
const colorById = (k: string) => `#${(Math.abs([...k].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % 0xffffff).toString(16).padStart(6, "0")}`

// A chart root for the interpreter (interpretToMarks takes a root, not a document).
function chartRoot(operators: unknown[], mark: unknown, rows: Datum[]): GofishRootIR {
  return { type: "chart", data: { type: "inline", rows }, operators, mark } as unknown as GofishRootIR
}

// ── The interpreter executes the grammar (not recognition) ──────────────────

describe("interpretGofishIR — operator execution", () => {
  const rows = [
    { c: "A", v: 10 },
    { c: "B", v: 20 },
    { c: "C", v: 5 },
  ]

  it("spread lays one value-scaled bar per group, left → right", () => {
    const { marks } = interpretToMarks(
      chartRoot([{ type: "spread", by: "c", dir: "x" }], { type: "rect", h: { type: "field", name: "v" }, fill: { type: "field", name: "c" } }, rows),
      FRAME,
      colorById
    )
    const rects = marks.filter((m) => m.kind === "rect") as Array<{ x: number; height: number }>
    expect(rects.length).toBe(3)
    expect(rects[0].x).toBeLessThan(rects[1].x)
    expect(rects[1].x).toBeLessThan(rects[2].x)
    // Heights scale with value: B (20) tallest, C (5) shortest.
    expect(rects[1].height).toBeGreaterThan(rects[0].height)
    expect(rects[0].height).toBeGreaterThan(rects[2].height)
  })

  it("stack accumulates segments along the stack axis", () => {
    const { marks } = interpretToMarks(
      chartRoot([{ type: "stack", by: "c", dir: "y" }], { type: "rect", h: { type: "field", name: "v" }, fill: { type: "field", name: "c" } }, rows),
      FRAME,
      colorById
    )
    const rects = (marks.filter((m) => m.kind === "rect") as Array<{ y: number; height: number }>).slice().sort((a, b) => a.y - b.y)
    expect(rects.length).toBe(3)
    expect(rects[1].y).toBeCloseTo(rects[0].y + rects[0].height, 0)
    expect(rects[2].y).toBeCloseTo(rects[1].y + rects[1].height, 0)
  })

  it("scatter positions one mark per datum by x", () => {
    const pts = [
      { x: 0, y: 1 },
      { x: 5, y: 2 },
      { x: 10, y: 3 },
    ]
    const { marks } = interpretToMarks(
      chartRoot([{ type: "scatter", x: { type: "field", name: "x" }, y: { type: "field", name: "y" } }], { type: "circle", r: 4 }, pts),
      FRAME,
      colorById
    )
    const circles = marks.filter((m) => m.kind === "circle") as Array<{ cx: number }>
    expect(circles.length).toBe(3)
    expect(circles[0].cx).toBeLessThan(circles[2].cx)
  })

  it("treemap allocates one region per group", () => {
    const { marks } = interpretToMarks(
      chartRoot([{ type: "treemap", by: "c", valueField: "v" }], { type: "rect", fill: { type: "field", name: "c" } }, rows),
      FRAME,
      colorById
    )
    expect(marks.filter((m) => m.kind === "rect").length).toBe(3)
  })

  it("polar coordinate transform remaps rects into annular wedge areas", () => {
    const mark = {
      type: "layer",
      __combinator: true,
      options: { coord: { type: "polar" } },
      children: [
        { type: "stack", __combinator: true, options: { dir: "x", by: "c" }, children: [{ type: "rect", h: { type: "field", name: "v" }, fill: { type: "field", name: "c" } }] },
      ],
    }
    const { marks } = interpretToMarks(chartRoot([], mark, rows), FRAME, colorById)
    // Wedges are data-bearing area scene nodes (sampled arcs), not path overlays.
    expect(marks.filter((m) => m.kind === "area").length).toBeGreaterThan(0)
  })

  it("warns on an unsupported operator instead of mis-rendering", () => {
    const { warnings } = interpretToMarks(chartRoot([{ type: "table" }], { type: "rect" }, rows), FRAME, colorById)
    expect(warnings.some((w) => w.toLowerCase().includes("unsupported"))).toBe(true)
  })
})

describe("interpretGofishIR — escape hatches are honored", () => {
  afterEach(() => {
    unregisterGofishLambda("testDerive")
    unregisterGofishLambda("testGlyph")
  })

  it("calls a registered `derive` lambda", () => {
    let called = 0
    registerGofishLambda("testDerive", {
      kind: "derive",
      fn: (rs) => {
        called += 1
        return rs.map((r) => ({ ...r, v: 99 }))
      },
    })
    const { marks } = interpretToMarks(
      chartRoot([{ type: "derive", lambdaId: "testDerive" }, { type: "spread", by: "c", dir: "x" }], { type: "rect", h: { type: "field", name: "v" } }, [{ c: "A", v: 1 }]),
      FRAME,
      colorById
    )
    expect(called).toBeGreaterThan(0)
    expect(marks.filter((m) => m.kind === "rect").length).toBe(1)
  })

  it("calls a registered `mark-fn` lambda and splices its primitives", () => {
    let called = 0
    registerGofishLambda("testGlyph", {
      kind: "mark-fn",
      fn: () => {
        called += 1
        return [{ kind: "polygon", points: [[0, 0], [1, 0], [0.5, 1]], fill: "#abc" }]
      },
    })
    const { marks } = interpretToMarks(chartRoot([], { type: "mark-fn", lambdaId: "testGlyph" }, [{ a: 1 }]), FRAME, colorById)
    expect(called).toBe(1)
    expect(marks.some((m) => m.kind === "path")).toBe(true)
  })

  it("warns (not throws) when a lambda id is unregistered", () => {
    const { warnings } = interpretToMarks(chartRoot([], { type: "mark-fn", lambdaId: "missing" }, [{ a: 1 }]), FRAME, colorById)
    expect(warnings.some((w) => w.includes("missing"))).toBe(true)
  })
})

// ── Unit-coord marks: literal fills, repeat, aspect-preserving fit ──────────

describe("interpretGofishIR — unit-coord marks", () => {
  const unitLayer = (children: unknown[], coord: Record<string, unknown> = {}): unknown => ({
    type: "layer",
    __combinator: true,
    options: { coord: { type: "unit", ...coord } },
    children,
  })

  it("paints fill:'none' literally rather than resolving a categorical color", () => {
    const { marks } = interpretToMarks(
      chartRoot(
        [],
        unitLayer([
          { type: "polygon", points: { type: "datum", datum: [[0, 0], [1, 0], [1, 1]] }, fill: "none", stroke: "#222" },
        ]),
        [{ a: 1 }]
      ),
      FRAME,
      colorById
    )
    const path = marks.find((m) => m.kind === "path")
    expect(path?.style?.fill).toBe("none")
  })

  it("repeat instantiates one mark per array element, not per parent datum", () => {
    const { marks } = interpretToMarks(
      chartRoot(
        [],
        unitLayer([
          {
            type: "circle",
            repeat: "items",
            cx: { type: "field", name: "x" },
            cy: { type: "field", name: "y" },
            r: { type: "field", name: "r" },
            fill: "#222",
            interactive: false,
          },
        ]),
        [{ items: [{ x: 0.2, y: 0.2, r: 0.05 }, { x: 0.8, y: 0.8, r: 0.05 }, { x: 0.5, y: 0.5, r: 0.05 }] }]
      ),
      FRAME,
      colorById
    )
    expect(marks.filter((m) => m.kind === "circle").length).toBe(3)
  })

  it("fit:'uniform' scales x and y by one factor (square stays square)", () => {
    const spec = (coord: Record<string, unknown>) =>
      interpretToMarks(
        chartRoot(
          [],
          unitLayer(
            [
              {
                type: "circle",
                repeat: "items",
                cx: { type: "field", name: "x" },
                cy: { type: "field", name: "y" },
                r: 0.02,
                fill: "#222",
                interactive: false,
              },
            ],
            coord
          ),
          [{ items: [{ x: 0.2, y: 0.2 }, { x: 0.7, y: 0.7 }] }]
        ),
        FRAME, // 400 × 200 — a 2:1 region exposes per-axis stretch
        colorById
      ).marks.filter((m) => m.kind === "circle") as Array<{ cx: number; cy: number }>

    const uniform = spec({ fit: "uniform" })
    expect(Math.abs(uniform[1].cx - uniform[0].cx)).toBeCloseTo(Math.abs(uniform[1].cy - uniform[0].cy), 5)

    // Default "fill" stretches each axis independently → dx ≠ dy in a 2:1 box.
    const fill = spec({})
    expect(Math.abs(fill[1].cx - fill[0].cx)).not.toBeCloseTo(Math.abs(fill[1].cy - fill[0].cy), 1)
  })
})

// ── Family routing (hybrid) ────────────────────────────────────────────────

describe("fromGofishIR — family routing", () => {
  it("routes the four free-coordinate charts to XY", () => {
    for (const ir of [flowerIR, bottleIR, polarRibbonIR, titanicCircleTreemapIR]) {
      const cfg = fromGofishIR(ir)
      expect(cfg.family).toBe("xy")
      expect(cfg.layout).toBeTypeOf("function")
    }
  })

  it("routes the boba volume signature to ordinal", () => {
    const cfg = fromGofishIR(bobaIR)
    expect(cfg.family).toBe("ordinal")
    expect(cfg.ordinalLayout).toBeTypeOf("function")
    expect(cfg.categoryAccessor).toBe("name")
    expect(cfg.data.length).toBe(4)
  })

  it("routes the memory diagram (arrow marks) to network", () => {
    const cfg = fromGofishIR(pythonMemoryIR)
    expect(cfg.family).toBe("network")
    expect(cfg.networkLayout).toBeTypeOf("function")
    expect(cfg.graph?.nodes.length).toBe(19)
  })
})

// ── Each example renders on its frame ───────────────────────────────────────

function makeXYCtx(data: Datum[]): LayoutContext {
  const x = scaleLinear().domain([0, 10]).range([0, 600])
  const y = scaleLinear().domain([0, 10]).range([400, 0])
  return {
    data,
    scales: { x, y } as unknown as LayoutContext["scales"],
    dimensions: { width: 600, height: 400, margin: { top: 0, right: 0, bottom: 0, left: 0 }, plot: { x: 0, y: 0, width: 600, height: 400 } },
    theme: { semantic: { primary: "#4e79a7" } as LayoutContext["theme"]["semantic"], categorical: ["#4e79a7", "#f28e2c", "#e15759", "#76b7b2"] },
    resolveColor: colorById,
    config: {},
  }
}

function makeOrdinalCtx(data: Datum[], categories: string[]): OrdinalLayoutContext {
  const o = scaleBand<string>().domain(categories).range([0, 800]).padding(0.2)
  const r = scaleLinear().domain([0, 600]).range([400, 0])
  return {
    data,
    scales: { o, r, projection: "vertical" } as unknown as OrdinalLayoutContext["scales"],
    dimensions: { width: 800, height: 430, margin: { top: 0, right: 0, bottom: 0, left: 0 }, plot: { x: 0, y: 0, width: 800, height: 430 } },
    theme: { semantic: { primary: "#4e79a7" } as OrdinalLayoutContext["theme"]["semantic"], categorical: ["#4e79a7", "#f28e2c"] },
    resolveColor: colorById,
    config: {},
  }
}

function makeNetworkCtx(nodes: Datum[], edges: Datum[], config: Record<string, unknown>): NetworkLayoutContext {
  return {
    nodes: nodes as unknown as NetworkLayoutContext["nodes"],
    edges: edges as unknown as NetworkLayoutContext["edges"],
    dimensions: { width: 880, height: 360, plot: { x: 0, y: 0, width: 880, height: 360 } },
    theme: { semantic: { primary: "#4e79a7" } as NetworkLayoutContext["theme"]["semantic"], categorical: ["#4e79a7", "#f28e2c"] },
    resolveColor: (k) => (k === "heap" ? "#59a14f" : "#4e79a7"),
    config,
    selection: null,
  }
}

describe("fromGofishIR — examples interpret to non-empty output", () => {
  it("XY examples emit marks (scene nodes and/or overlays)", () => {
    for (const ex of gofishIRExamples) {
      const cfg = fromGofishIR(ex.doc)
      if (cfg.family !== "xy") continue
      const result = cfg.layout!(makeXYCtx(cfg.data))
      const hasOutput = (result.nodes?.length ?? 0) > 0 || result.overlays != null
      expect(hasOutput, `${ex.key} should render something`).toBe(true)
    }
  })

  it("boba interprets to one hit rect per cup + cup overlays", () => {
    const cfg = fromGofishIR(bobaIR)
    const categories = cfg.data.map((d) => String(d.name))
    const result = cfg.ordinalLayout!(makeOrdinalCtx(cfg.data, categories))
    const rects = (result.nodes ?? []).filter((n) => n.type === "rect")
    expect(rects.length).toBe(4)
    expect(result.overlays).not.toBeNull()
    for (const node of rects) {
      expect(typeof node.datum?.name).toBe("string")
      expect(typeof node.datum?.teaVolume).toBe("number")
    }
  })

  it("the bottle renders an image silhouette + a fill clipped to it per bottle", () => {
    const cfg = fromGofishIR(bottleIR)
    const result = cfg.layout!(makeXYCtx(cfg.data))
    // The image + clipped fill are overlays; the hit target is a scene node.
    const rects = (result.nodes ?? []).filter((n) => n.type === "rect")
    expect(rects.length).toBe(bottleIR.root.type === "chart" ? cfg.data.length : 0)
    // Overlays carry the <image> bottles and the clipped <rect> fills.
    const overlayStr = JSON.stringify(result.overlays)
    expect(overlayStr).toContain("image")
    expect(overlayStr).toContain("clip")
  })

  it("XY interpreted layouts read the frame data so push/update state can replace inline IR rows", () => {
    const cfg = fromGofishIR(bottleIR)
    const result = cfg.layout!(makeXYCtx([{ id: "solo", category: "Solo", amount: 37 }]))
    const rects = (result.nodes ?? []).filter((n) => n.type === "rect")

    expect(rects.length).toBe(1)
    expect(rects[0].datum?.category).toBe("Solo")
    expect(rects[0].datum?.amount).toBe(37)
  })

  it("ordinal interpreted layouts read frame data and derive shared geometry before band grouping", () => {
    const cfg = fromGofishIR(bobaIR)
    const data = [
      { ...cfg.data[0], name: "Solo" },
      { ...cfg.data[1], name: "Double" },
    ]
    const result = cfg.ordinalLayout!(makeOrdinalCtx(data, ["Solo", "Double"]))
    const rects = (result.nodes ?? []).filter((n) => n.type === "rect")

    expect(rects.length).toBe(2)
    expect(rects.map((node) => node.datum?.name)).toEqual(["Solo", "Double"])
    const boxes = rects.map((node) => JSON.stringify((node.datum?._g as BobaCellGeometry | undefined)?.box))
    expect(new Set(boxes).size).toBe(1)
  })

  it("the memory diagram emits network scene nodes + edges", () => {
    const cfg = fromGofishIR(pythonMemoryIR)
    const result = cfg.networkLayout!(makeNetworkCtx(cfg.graph!.nodes, cfg.graph!.edges, cfg.layoutConfig))
    expect((result.sceneNodes ?? []).length).toBeGreaterThan(0)
    expect((result.sceneEdges ?? []).length).toBeGreaterThan(0)
  })
})

// ── bobaGeometry derive (the boba volume → drink-height escape hatch) ────────

describe("bobaGeometry derive", () => {
  const rows = bobaIR.root.type === "chart" && bobaIR.root.data?.type === "inline" ? bobaIR.root.data.rows : []

  it("packs pearls + ice + tea from the per-cup volumes", () => {
    const out = bobaGeometryLambda.fn(rows as Datum[]) as Array<Datum & { _g: BobaCellGeometry }>
    const byName = (name: string) => out.find((r) => r.name === name)!._g

    const classic = byName("Classic")
    expect(classic.pearls.length).toBeGreaterThan(0)
    expect(classic.ice.length).toBeGreaterThan(0)
    expect(classic.tea).not.toBeNull()
    expect(classic.totalVolume).toBe(classic.teaVolume + classic.bobaVolume + classic.iceVolume)

    // Composition reads from the data: Extra Boba stacks more pearls than Classic;
    // Light Ice carries fewer cubes than Classic.
    expect(byName("Extra Boba").numBobas).toBeGreaterThan(classic.numBobas)
    expect(byName("Light Ice").numIce).toBeLessThan(classic.numIce)
  })

  it("normalizes every cup against one shared box (so the menu shares a scale)", () => {
    const out = bobaGeometryLambda.fn(rows as Datum[]) as Array<Datum & { _g: BobaCellGeometry }>
    const boxes = new Set(out.map((r) => `${r._g.box[0].toFixed(6)},${r._g.box[1].toFixed(6)}`))
    expect(boxes.size).toBe(1)
    // Largest dimension across the menu normalizes to 1.
    expect(Math.max(...out[0]._g.box)).toBeCloseTo(1, 6)
  })

  it("bottom-aligns cups: every cup's lowest point lands at the shared box bottom", () => {
    const out = bobaGeometryLambda.fn(rows as Datum[]) as Array<Datum & { _g: BobaCellGeometry }>
    for (const r of out) {
      const g = r._g
      const cupBottom = Math.max(...g.cup.map((p) => p[1]))
      expect(cupBottom).toBeCloseTo(g.box[1], 5)
    }
  })
})
