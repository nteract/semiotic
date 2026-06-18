import type { GofishIRDocument } from "./gofishIR"

/**
 * Canonical GoFish Frontend IR documents for the five gallery charts the
 * `gofish.tsx` recipes reproduce. These are the JSON artifacts a GoFish
 * `to_ir` / serialization-frontend pass emits (see the `gofish-ir` package):
 * `data → operators → mark` trees with lowercase `type` tags, the
 * `__combinator` flag on combinator-form marks, and tagged `{type:"field"}`
 * channel accessors.
 *
 * They are the single source of truth for `/features/gofish-layouts`: the page
 * runs each through `unstable_fromGofishIR` to obtain a Semiotic custom layout, its
 * accessor `layoutConfig`, and the inline data. They double as the adapter's
 * test fixtures, so they must stay faithful to the upstream GoFish examples
 * they mirror:
 *
 * - flower            → stories/lowlevel/FlowerChart.stories.tsx
 * - bottle            → stories/piccl/Bottle.stories.tsx
 * - polar ribbon      → src/tests/fishPolarRibbonChart.ts
 * - circle treemap    → stories/lowlevel/CircleTreemap.stories.tsx (Titanic fields)
 * - memory diagram    → stories/bluefish/PythonTutor/PythonTutor.stories.tsx
 */

const seafoodRows = [
  { lake: "Erie", species: "Walleye", count: 48, x: 0 },
  { lake: "Erie", species: "Perch", count: 31, x: 0 },
  { lake: "Erie", species: "Trout", count: 16, x: 0 },
  { lake: "Huron", species: "Walleye", count: 26, x: 1 },
  { lake: "Huron", species: "Perch", count: 18, x: 1 },
  { lake: "Huron", species: "Trout", count: 35, x: 1 },
  { lake: "Michigan", species: "Walleye", count: 18, x: 2 },
  { lake: "Michigan", species: "Perch", count: 42, x: 2 },
  { lake: "Michigan", species: "Trout", count: 27, x: 2 },
  { lake: "Ontario", species: "Walleye", count: 22, x: 3 },
  { lake: "Ontario", species: "Perch", count: 21, x: 3 },
  { lake: "Ontario", species: "Trout", count: 43, x: 3 },
  { lake: "Superior", species: "Walleye", count: 14, x: 4 },
  { lake: "Superior", species: "Perch", count: 24, x: 4 },
  { lake: "Superior", species: "Trout", count: 57, x: 4 }
]

const bottleRows = [
  { id: "planning", category: "Planning", amount: 64 },
  { id: "design", category: "Design", amount: 82 },
  { id: "build", category: "Build", amount: 46 },
  { id: "review", category: "Review", amount: 71 },
  { id: "ship", category: "Ship", amount: 55 }
]

/** The Python Tutor heap/stack snapshot, inlined as a single IR data row. */
export const pythonTutorDiagramRow = {
  kind: "memory-snapshot",
  stack: [
    { name: "c", value: { pointer: 0 } },
    { name: "d", value: { pointer: 1 } },
    { name: "x", value: "5" }
  ],
  heap: [
    {
      values: ["12", { pointer: 1 }, "1", "0", { pointer: 2 }, { pointer: 3 }]
    },
    { values: ["1", "4"] },
    { values: ["3", "10", "7", "8", { pointer: 4 }] },
    { values: ["2", { pointer: 4 }] },
    { values: ["3"] }
  ],
  heapArrangement: [
    [0, null, 3, null],
    [null, 1, 2, 4]
  ]
}

/**
 * Deterministic Titanic passenger sample (no RNG), mirroring the docs page so
 * the IR document is self-contained. Kept modest per class so the inline rows
 * stay reasonable to ship and display.
 */
export function buildTitanicSampleRows(): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = []
  const classSpecs = [
    { pclass: 1, count: 90, fareBase: 24, fareSpread: 126, survivalRate: 0.64 },
    { pclass: 2, count: 60, fareBase: 10, fareSpread: 56, survivalRate: 0.46 },
    { pclass: 3, count: 150, fareBase: 4, fareSpread: 26, survivalRate: 0.25 }
  ]
  for (const spec of classSpecs) {
    for (let i = 0; i < spec.count; i++) {
      const wave = Math.sin(i * 1.7 + spec.pclass) * 0.5 + 0.5
      const tail = Math.pow(1 - i / spec.count, 2.15)
      const jitter = ((i * 37) % 23) / 23
      const fare =
        Math.round(
          (spec.fareBase +
            tail * spec.fareSpread +
            wave * spec.fareSpread * 0.08 +
            jitter * spec.fareSpread * 0.05) *
            10
        ) / 10
      rows.push({
        name: `class-${spec.pclass}-${i}`,
        pclass: spec.pclass,
        survived: ((i * 73 + spec.pclass * 29) % 100) / 100 < spec.survivalRate,
        fare
      })
    }
  }
  return rows
}

const field = (name: string) => ({ type: "field" as const, name })

// ── Flower ───────────────────────────────────────────────────────────────

/**
 * A meadow: one green stem per lake (a `scatter` placing each lake's bar at its
 * x), topped by a polar fan of species petals. Single-chart form so the
 * interpreter renders it directly: `scatter(by:lake)` → per lake a `layer` of
 * a stem `rect` (height = summed catch) and a `polar` `stack` of `petal`s
 * around the angle axis.
 */
export const flowerIR: GofishIRDocument = {
  irVersion: 0,
  ir: "gofish-frontend",
  root: {
    type: "chart",
    data: { type: "inline", rows: seafoodRows },
    operators: [{ type: "scatter", by: "lake", x: field("x") }],
    mark: {
      type: "layer",
      __combinator: true,
      children: [
        {
          type: "rect",
          origin: { name: "stem" },
          w: 5,
          h: field("count"),
          fill: "#2f8f46"
        },
        {
          type: "layer",
          __combinator: true,
          options: { coord: { type: "polar" } },
          children: [
            {
              type: "stack",
              __combinator: true,
              options: { dir: "x", by: "species", spacing: 0 },
              children: [
                { type: "petal", h: field("count"), fill: field("species") }
              ]
            }
          ]
        }
      ]
    }
  }
}

// ── Bottle fill ────────────────────────────────────────────────────────────

/**
 * A row of pictorial bottles, one per category, each filled to its `amount`
 * percentage. Grammar-first with one `derive`: `bottleGeometry` emits the
 * per-bottle normalized geometry under `_b`; the marks render it with the
 * reusable `image` + clip primitives — an `image` of the bottle silhouette, a
 * green fill `rect` clipped to that silhouette, a fill line, a percentage
 * label, a category label, and a transparent hit rect carrying the datum.
 */
export const bottleIR: GofishIRDocument = {
  irVersion: 0,
  ir: "gofish-frontend",
  root: {
    type: "chart",
    data: { type: "inline", rows: bottleRows },
    options: { axes: false },
    operators: [
      { type: "spread", by: "category", dir: "x", spacing: 20 },
      { type: "derive", lambdaId: "bottleGeometry" }
    ],
    mark: {
      type: "layer",
      __combinator: true,
      options: { coord: { type: "unit" } },
      children: [
        {
          type: "image",
          origin: { name: "bottle" },
          href: field("_b.imageHref"),
          x: 0,
          y: 0,
          w: 1,
          h: 1
        },
        {
          type: "rect",
          origin: { name: "fill" },
          x: field("_b.fill.x"),
          y: field("_b.fill.y"),
          w: field("_b.fill.w"),
          h: field("_b.fill.h"),
          fill: field("_b.fillFill"),
          opacity: 0.82,
          clip: field("_b.silhouette"),
          interactive: false
        },
        {
          type: "line",
          origin: { name: "fillLine" },
          x1: field("_b.fillLine.x1"),
          x2: field("_b.fillLine.x2"),
          y1: field("_b.fillLine.y"),
          y2: field("_b.fillLine.y"),
          stroke: "#6b7e88",
          strokeWidth: 1
        },
        {
          type: "text",
          origin: { name: "pct" },
          text: field("_b.pct.text"),
          x: field("_b.pct.x"),
          y: field("_b.pct.y"),
          textAnchor: "start",
          fontSize: 11
        },
        {
          type: "text",
          origin: { name: "label" },
          text: field("_b.label.text"),
          x: field("_b.label.x"),
          y: field("_b.label.y"),
          textAnchor: "middle",
          fontSize: 11
        },
        {
          type: "rect",
          origin: { name: "hit" },
          x: 0,
          y: 0,
          w: 1,
          h: 1,
          fill: "rgba(0,0,0,0)"
        }
      ]
    }
  }
}

// ── Polar ribbon ─────────────────────────────────────────────────────────

/**
 * Stacked species bars laid out radially per lake (polar coord), with one
 * cross-lake ribbon per species connecting the matching segments.
 */
export const polarRibbonIR: GofishIRDocument = {
  irVersion: 0,
  ir: "gofish-frontend",
  root: {
    type: "chart",
    data: { type: "inline", rows: seafoodRows },
    mark: {
      type: "layer",
      __combinator: true,
      options: { coord: { type: "polar", innerRadius: 0.22 } },
      children: [
        // Lakes spread around the angle axis (one thin radial spoke each); within
        // a spoke the species stack outward in radius on a shared scale, so a
        // bigger-catch lake reaches farther out.
        {
          type: "spread",
          __combinator: true,
          options: { dir: "x", by: "lake" },
          children: [
            {
              type: "stack",
              __combinator: true,
              options: { dir: "y", by: "species", sort: "asc" },
              children: [
                {
                  type: "rect",
                  w: 0.34,
                  h: field("count"),
                  fill: field("species")
                }
              ]
            }
          ]
        },
        // One smooth ribbon per species, stitched across the lake sectors.
        {
          type: "connect",
          __combinator: true,
          options: { by: "species", opacity: 0.28 },
          children: [{ type: "ref", selection: "species" }]
        }
      ]
    }
  }
}

// ── Titanic circle treemap ─────────────────────────────────────────────────

/**
 * A bar chart that's treemap-filled and circle-filled: a `spread` lays one
 * equal-width bar per passenger class whose HEIGHT encodes the class's total
 * fare (`sizeBy`), and that bar rectangle becomes a squarified `treemap` of its
 * passengers — every fare-sized cell rendered as an inscribed circle coloured
 * by survival.
 */
export const titanicCircleTreemapIR: GofishIRDocument = {
  irVersion: 0,
  ir: "gofish-frontend",
  root: {
    type: "chart",
    data: { type: "inline", rows: buildTitanicSampleRows() },
    mark: {
      type: "spread",
      __combinator: true,
      options: { by: "pclass", dir: "x", sizeBy: "fare", spacing: 18 },
      children: [
        {
          type: "treemap",
          __combinator: true,
          options: { valueField: "fare", paddingInner: 1.5 },
          children: [{ type: "circle", fill: field("survived") }],
        },
      ],
    },
  },
}

// ── Python Tutor memory diagram ─────────────────────────────────────────────

/**
 * A Python Tutor runtime memory diagram: a global frame of variable bindings
 * whose pointers arrow into a heap of linked tuples. Encoded as a `layer` of a
 * `spread` (frame + heap) plus `arrow` connectors over `ref`s; the snapshot
 * itself travels as a single inline data row consumed by the network recipe.
 */
export const pythonMemoryIR: GofishIRDocument = {
  irVersion: 0,
  ir: "gofish-frontend",
  root: {
    type: "chart",
    data: { type: "inline", rows: [pythonTutorDiagramRow] },
    mark: {
      type: "layer",
      __combinator: true,
      children: [
        {
          type: "spread",
          __combinator: true,
          options: { dir: "x", alignment: "start", spacing: 100 },
          children: [
            { type: "rect", origin: { name: "globalFrame" } },
            { type: "rect", origin: { name: "heap" } }
          ]
        },
        {
          type: "arrow",
          __combinator: true,
          options: { stroke: "#1A5683" },
          children: [
            { type: "ref", selection: "globalFrame" },
            { type: "ref", selection: "heap" }
          ]
        }
      ]
    }
  }
}

// ── Boba (bubble tea) cups ───────────────────────────────────────────────

/**
 * A boba-shop menu: four bubble-tea drinks spread along the category axis, each
 * fully data-driven. Per drink, the tea + tapioca + ice volumes (plus the
 * cup-size parameters) add up to a total volume that determines the drink
 * height; the pearls stack at the bottom and the ice floats at the surface — so
 * "Extra Boba" grows a taller pearl bed, "Light Ice" reads as mostly tea, and
 * "Mega" is a bigger cup of everything.
 *
 * Grammar-first, per the "follow the spec as far as it can" rule: the cup, tea,
 * straw, and lid are real `polygon`/`line` marks and the pearls/ice are real
 * `circle`/`rect` marks. The one genuinely non-grammar step — the
 * frustum-volume → drink-height solve and tapioca/ice packing — lives in a
 * single `derive` lambda (`bobaGeometry`) that emits each cup's geometry the
 * marks read (`_g.*`) plus a shared `_g.box` aspect for the `uniform` unit fit,
 * so the cups sit on one shelf with aligned straws. Derived from Krist
 * Wongsuphasawat's "Boba Science" notebook. Routed to the ordinal frame.
 */
export const bobaIR: GofishIRDocument = {
  irVersion: 0,
  ir: "gofish-frontend",
  root: {
    type: "chart",
    data: {
      type: "inline",
      rows: [
        {
          name: "Classic",
          teaVolume: 470,
          bobaVolume: 95,
          iceVolume: 60,
          cupHeight: 15.5,
          cupTopRadius: 4.75,
          cupBottomRadius: 3.75,
          bobaRadius: 0.6
        },
        {
          name: "Extra Boba",
          teaVolume: 360,
          bobaVolume: 240,
          iceVolume: 45,
          cupHeight: 15.5,
          cupTopRadius: 4.75,
          cupBottomRadius: 3.75,
          bobaRadius: 0.6
        },
        {
          name: "Light Ice",
          teaVolume: 500,
          bobaVolume: 95,
          iceVolume: 12,
          cupHeight: 15.5,
          cupTopRadius: 4.75,
          cupBottomRadius: 3.75,
          bobaRadius: 0.6
        },
        {
          name: "Mega",
          teaVolume: 660,
          bobaVolume: 150,
          iceVolume: 120,
          cupHeight: 18,
          cupTopRadius: 5.6,
          cupBottomRadius: 4.4,
          bobaRadius: 0.6
        }
      ]
    },
    operators: [
      { type: "spread", by: "name", dir: "x", spacing: 24 },
      { type: "derive", lambdaId: "bobaGeometry" }
    ],
    mark: {
      type: "layer",
      __combinator: true,
      // `uniform` fit reads the shared content box so every cup scales by one
      // factor; `anchorY: "end"` bottom-aligns them onto a shared shelf.
      options: { coord: { type: "unit", fit: "uniform", boxField: "_g.box", anchorY: "end" } },
      children: [
        {
          type: "polygon",
          origin: { name: "tea" },
          points: field("_g.tea"),
          fill: field("teaFill")
        },
        {
          type: "circle",
          origin: { name: "pearl" },
          repeat: "_g.pearls",
          cx: field("x"),
          cy: field("y"),
          r: field("r"),
          fill: field("fill"),
          opacity: 0.85,
          interactive: false
        },
        {
          type: "rect",
          origin: { name: "ice" },
          repeat: "_g.ice",
          x: field("x"),
          y: field("y"),
          w: field("w"),
          h: field("w"),
          rotate: field("rot"),
          fill: field("fill"),
          opacity: 0.85,
          interactive: false
        },
        {
          type: "polygon",
          origin: { name: "cup" },
          points: field("_g.cup"),
          fill: "none",
          stroke: field("cupStroke"),
          strokeWidth: 2.5
        },
        {
          type: "line",
          origin: { name: "lid" },
          x1: field("_g.lid.x1"),
          x2: field("_g.lid.x2"),
          y1: field("_g.lid.y"),
          y2: field("_g.lid.y"),
          stroke: field("lidFill"),
          strokeWidth: 4
        },
        {
          type: "polygon",
          origin: { name: "straw" },
          points: field("_g.straw"),
          fill: field("strawFill"),
          stroke: field("cupStroke"),
          strokeWidth: 1,
          opacity: 0.85
        }
      ]
    }
  }
}

export interface GofishIRExample {
  key: "flower" | "bottle" | "polar" | "titanic" | "python" | "boba"
  label: string
  doc: GofishIRDocument
  source: string
}

/** All five examples, in gallery order. */
export const gofishIRExamples: readonly GofishIRExample[] = [
  {
    key: "flower",
    label: "Flower chart",
    doc: flowerIR,
    source: "https://gofish.graphics/js/examples/flower-chart.html"
  },
  {
    key: "bottle",
    label: "Bottle fill",
    doc: bottleIR,
    source: "https://gofish.graphics/js/examples/bottle-fill-chart.html"
  },
  {
    key: "polar",
    label: "Polar ribbon",
    doc: polarRibbonIR,
    source: "https://gofish.graphics/js/examples/polar-ribbon-chart.html"
  },
  {
    key: "titanic",
    label: "Fare circle treemap",
    doc: titanicCircleTreemapIR,
    source:
      "https://gofish.graphics/js/examples/titanic-fare-circle-treemap.html"
  },
  {
    key: "python",
    label: "Python memory",
    doc: pythonMemoryIR,
    source:
      "https://gofish.graphics/js/examples/python-tutor-memory-diagram.html"
  },
  {
    key: "boba",
    label: "Boba cups",
    doc: bobaIR,
    source: "https://observablehq.com/@kristw/boba-science"
  }
]
