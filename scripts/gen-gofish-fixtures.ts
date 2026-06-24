/**
 * Generate the GoFish DisplayList fixtures that drive the experimental
 * `unstable_fromGofishIR` adapter and its gallery page.
 *
 * GoFish's `toDisplayList({ w, h })` is the post-layout *render IR*: a flat,
 * viewport-baked list of positioned primitives in absolute pixels (the
 * coordinate transforms are already folded in — a polar petal arrives as a
 * `path`). It is the integration point Josh Pollock shipped for this adapter,
 * the analogue of running a chart to SVG but stopping one stage earlier.
 *
 * Because the display list is *per-frame* (size-dependent, async, not
 * cacheable), we cannot author it by hand. This script authors real
 * `gofish-graphics` specs, bakes each one through `toDisplayList`, and writes
 * the resulting documents to a checked-in module so the adapter tests and the
 * docs gallery stay deterministic and do not depend on the nightly at runtime.
 *
 * Run: `node --experimental-strip-types scripts/gen-gofish-fixtures.ts --write`
 * Dry run (summary only): `node --experimental-strip-types scripts/gen-gofish-fixtures.ts`
 * (gofish-graphics ships ESM-only `exports`, which tsx's CJS resolver rejects,
 *  so this script runs through Node's native type stripping rather than tsx.)
 */
import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { chart, spread, stack, treemap, layer, rect, ellipse, petal, image, text, line, polar, field } from "gofish-graphics"
import type { DisplayList } from "gofish-ir"

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, "../src/components/recipes/gofishDisplayListFixtures.generated.ts")

// ── Source data (small, deterministic — these ship inline in the fixtures) ──

const seafood = [
  { lake: "Erie", species: "Walleye", count: 48 },
  { lake: "Erie", species: "Perch", count: 31 },
  { lake: "Erie", species: "Trout", count: 16 },
  { lake: "Huron", species: "Walleye", count: 26 },
  { lake: "Huron", species: "Perch", count: 18 },
  { lake: "Huron", species: "Trout", count: 35 },
  { lake: "Michigan", species: "Walleye", count: 18 },
  { lake: "Michigan", species: "Perch", count: 42 },
  { lake: "Michigan", species: "Trout", count: 27 },
  { lake: "Ontario", species: "Walleye", count: 22 },
  { lake: "Ontario", species: "Perch", count: 21 },
  { lake: "Ontario", species: "Trout", count: 43 },
]

const projectStages = [
  { stage: "Planning", amount: 64 },
  { stage: "Design", amount: 82 },
  { stage: "Build", amount: 46 },
  { stage: "Review", amount: 71 },
  { stage: "Ship", amount: 55 },
]

// Bubble-tea menu (Krist Wongsuphasawat's "Boba Science"): each drink's
// tea + tapioca + ice volumes (ml). Flattened into stacked component rows so a
// drink reads bottom-up as tapioca → tea → ice — the volumes that "add up to a
// drink height". GoFish solves the stack; each band carries its drink + volume.
const bobaDrinks = [
  { name: "Classic", teaVolume: 470, bobaVolume: 95, iceVolume: 60 },
  { name: "Extra Boba", teaVolume: 360, bobaVolume: 240, iceVolume: 45 },
  { name: "Light Ice", teaVolume: 500, bobaVolume: 95, iceVolume: 12 },
  { name: "Mega", teaVolume: 660, bobaVolume: 150, iceVolume: 120 },
]
// Stack order is bottom → top: tapioca pearls settle, tea fills, ice floats.
const bobaComponents = bobaDrinks.flatMap((d) => [
  { name: d.name, component: "tapioca", volume: d.bobaVolume },
  { name: d.name, component: "tea", volume: d.teaVolume },
  { name: d.name, component: "ice", volume: d.iceVolume },
])

// A Python Tutor-style heap: a chain of linked tuple cells. Each cell holds a
// value and (conceptually) points at the next — the linked-list spine GoFish
// stitches together with a connector. The stack frame's variable bindings sit
// to the side.
const heapCells = [
  { addr: "0x1a", value: "12", note: "head" },
  { addr: "0x2b", value: "99", note: "" },
  { addr: "0x3c", value: "7", note: "" },
  { addr: "0x4d", value: "4", note: "" },
  { addr: "0x5e", value: "0", note: "tail" },
]

// A deterministic Titanic-style passenger sample (no RNG) for the circle treemap.
function titanicSample(): Array<{ pclass: number; fare: number; survived: boolean }> {
  const rows: Array<{ pclass: number; fare: number; survived: boolean }> = []
  const specs = [
    { pclass: 1, count: 22, base: 60, spread: 90, rate: 0.64 },
    { pclass: 2, count: 22, base: 18, spread: 40, rate: 0.46 },
    { pclass: 3, count: 30, base: 7, spread: 22, rate: 0.25 },
  ]
  for (const s of specs) {
    for (let i = 0; i < s.count; i++) {
      const tail = Math.pow(1 - i / s.count, 2)
      const fare = Math.round((s.base + tail * s.spread) * 10) / 10
      rows.push({ pclass: s.pclass, fare, survived: ((i * 73 + s.pclass * 29) % 100) / 100 < s.rate })
    }
  }
  return rows
}

// An inline SVG data-URI bottle silhouette so the fixture needs no network.
const BOTTLE_HREF =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 100">' +
      '<path d="M15 4 h10 v14 q8 6 8 18 v52 q0 8 -8 8 h-10 q-8 0 -8 -8 v-52 q0 -12 8 -18 z" ' +
      'fill="none" stroke="#6b7e88" stroke-width="2"/></svg>',
  )

// ── Specs ───────────────────────────────────────────────────────────────────

interface FixtureSpec {
  key: string
  label: string
  source: string
  blurb: string
  build: () => Promise<DisplayList.DisplayListDocument>
}

const SPECS: FixtureSpec[] = [
  {
    key: "bars",
    label: "Grouped catch bars",
    source: "https://gofish.graphics/js/examples/bar-chart.html",
    blurb:
      "spread by lake, stack by species. The simplest lowering: each bar is a rect node carrying its row; axis ticks arrive as overlay text.",
    build: () =>
      chart(seafood)
        .flow(spread({ by: "lake", dir: "x", spacing: 26 }), stack({ dir: "y", by: "species" }))
        .mark(rect({ w: 34, h: field("count"), fill: field("species") }))
        .toDisplayList({ w: 640, h: 380 }),
  },
  {
    key: "flower",
    label: "Polar petal flower",
    source: "https://gofish.graphics/js/examples/flower-chart.html",
    blurb:
      "A polar coordinate transform folded into the geometry: one petal per catch fanned around the circle, sized by count. Every petal arrives as an absolute-pixel path — no transform left to compose on our side.",
    build: () =>
      // Fan one petal per row around the full circle (spread by a per-row index),
      // sized by count. A narrow petal width keeps the blooms distinct.
      chart(
        seafood.map((d, i) => ({ ...d, idx: i })),
        { coord: polar() },
      )
        .flow(spread({ by: "idx", dir: "x" }))
        .mark(petal({ h: field("count"), w: 12, fill: field("species") }))
        .toDisplayList({ w: 520, h: 520 }),
  },
  {
    key: "treemap",
    label: "Fare circle treemap",
    source: "https://gofish.graphics/js/examples/titanic-fare-circle-treemap.html",
    blurb:
      "A squarify-circle treemap: one inscribed-circle ellipse per passenger, fare-sized, coloured by survival. Each ellipse is a data-bearing node.",
    build: () =>
      chart(titanicSample())
        .flow(treemap({ valueField: "fare", paddingInner: 1.5, tile: "squarifyCircle" }))
        .mark(ellipse({ fill: field("survived") }))
        .toDisplayList({ w: 520, h: 520 }),
  },
  {
    key: "bottle",
    label: "Bottle fill pictorial",
    source: "https://gofish.graphics/js/examples/bottle-fill-chart.html",
    blurb:
      "A pictorial mark per stage: a bottle image (overlay chrome) over a fill rect sized by amount (a data node) and a percent label.",
    build: () =>
      chart(projectStages)
        .flow(spread({ by: "stage", dir: "x", spacing: 36 }))
        .mark(
          layer([
            rect({ w: 30, h: field("amount"), fill: "#4e79a7", opacity: 0.5 }),
            image({ href: BOTTLE_HREF, w: 40, h: 100 }),
            text({ text: field("stage"), fontSize: 11 }),
          ]),
        )
        .toDisplayList({ w: 560, h: 320 }),
  },
  {
    key: "boba",
    label: "Boba volume cups",
    source: "https://observablehq.com/@kristw/boba-science",
    blurb:
      "A bubble-tea menu: each drink's tea + tapioca + ice volumes stacked into one cup, tapioca settling at the base. GoFish solves the stack; each band is a data node carrying its drink and volume.",
    build: () =>
      chart(bobaComponents)
        .flow(
          spread({ by: "name", dir: "x", spacing: 40 }),
          stack({ dir: "y", by: "component" }),
        )
        .mark(rect({ w: 52, h: field("volume"), fill: field("component"), rx: 6 }))
        .toDisplayList({ w: 560, h: 360 }),
  },
  {
    key: "python",
    label: "Python memory (linked heap)",
    source: "https://gofish.graphics/js/examples/python-tutor-memory-diagram.html",
    blurb:
      "A Python Tutor-style heap: a chain of linked tuple cells GoFish stitches together with a connector — the linked-list spine. Each value cell is a data node; the connector is overlay chrome.",
    build: () =>
      chart(heapCells)
        .flow(spread({ dir: "x", spacing: 44 }))
        .mark(layer([rect({ w: 52, h: 44, fill: "#eaf2fb", stroke: "#1A5683", rx: 4 }), text({ text: field("value"), fontSize: 15 })]))
        .connect(line({ stroke: "#1A5683", strokeWidth: 2 }))
        .toDisplayList({ w: 520, h: 220 }),
  },
]

// ── Bake + summarise ──────────────────────────────────────────────────────

function summarise(doc: DisplayList.DisplayListDocument) {
  const kinds: Record<string, number> = {}
  const roles: Record<string, number> = {}
  for (const it of doc.items) {
    kinds[it.kind] = (kinds[it.kind] ?? 0) + 1
    roles[it.role ?? "node"] = (roles[it.role ?? "node"] ?? 0) + 1
  }
  return { viewport: doc.viewport, items: doc.items.length, kinds, roles }
}

async function main() {
  const write = process.argv.includes("--write")
  const baked: Array<{ spec: FixtureSpec; doc: DisplayList.DisplayListDocument }> = []
  for (const spec of SPECS) {
    const doc = await spec.build()
    baked.push({ spec, doc })
    console.log(spec.key.padEnd(9), JSON.stringify(summarise(doc)))
  }
  if (!write) {
    console.log("\n(dry run — pass --write to emit the fixtures module)")
    return
  }

  const constName = (key: string) => `${key}DisplayList`
  const body = baked
    .map(
      ({ spec, doc }) =>
        `/**\n * ${spec.label} — ${spec.blurb}\n * Source: ${spec.source}\n */\n` +
        `export const ${constName(spec.key)}: DisplayListDocument = ${JSON.stringify(doc)}\n`,
    )
    .join("\n")

  const manifest =
    `export interface GofishDisplayListExample {\n` +
    `  key: ${baked.map(({ spec }) => `"${spec.key}"`).join(" | ")}\n` +
    `  label: string\n  source: string\n  blurb: string\n  doc: DisplayListDocument\n}\n\n` +
    `/** All baked gallery fixtures, in display order. */\n` +
    `export const gofishDisplayListExamples: readonly GofishDisplayListExample[] = [\n` +
    baked
      .map(
        ({ spec }) =>
          `  { key: "${spec.key}", label: ${JSON.stringify(spec.label)}, source: ${JSON.stringify(
            spec.source,
          )}, blurb: ${JSON.stringify(spec.blurb)}, doc: ${constName(spec.key)} },`,
      )
      .join("\n") +
    `\n]\n`

  const header =
    `/* eslint-disable */\n` +
    `// @generated by scripts/gen-gofish-fixtures.ts — DO NOT EDIT BY HAND.\n` +
    `// Regenerate with: node --experimental-strip-types scripts/gen-gofish-fixtures.ts --write\n` +
    `//\n` +
    `// These are real GoFish DisplayList documents — the output of\n` +
    `// gofish-graphics' toDisplayList({ w, h }) layout pass, baked at the\n` +
    `// viewport noted in each document. They stand in for what a host would get\n` +
    `// by calling \`await spec.toDisplayList({ w, h })\` at runtime.\n` +
    `import type { DisplayList } from "gofish-ir"\n\n` +
    `type DisplayListDocument = DisplayList.DisplayListDocument\n\n`

  writeFileSync(OUT, header + body + "\n" + manifest)
  console.log(`\nWrote ${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
