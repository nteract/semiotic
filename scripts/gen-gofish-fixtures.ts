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
import {
  chart,
  spread,
  stack,
  treemap,
  layer,
  paint,
  rect,
  circle,
  petal,
  image,
  text,
  polar,
  field,
  v,
  group,
  scatter,
  stackX,
  selectAll,
  color,
  palette,
  area,
  clock,
  derive,
  Layer,
  Spread,
  Arrow,
  Constraint,
  ref
} from "gofish-graphics"
import type { DisplayList } from "gofish-ir"

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(
  __dirname,
  "../src/components/recipes/gofishDisplayListFixtures.generated.ts"
)

// ── Source data (small, deterministic — these ship inline in the fixtures) ──

// GoFish's own catch dataset (packages/gofish-graphics/src/data/catch.ts):
// six lakes A–F, five species each. Shared by the bars, flower, and polar
// ribbon — the three charts GoFish builds from this data — so they stay
// coherent and match the upstream examples (5 species → 5 petals / 5 ribbons).
const seafood = [
  { lake: "A", species: "Bass", count: 23 },
  { lake: "A", species: "Trout", count: 31 },
  { lake: "A", species: "Catfish", count: 29 },
  { lake: "A", species: "Perch", count: 12 },
  { lake: "A", species: "Salmon", count: 8 },
  { lake: "B", species: "Bass", count: 25 },
  { lake: "B", species: "Trout", count: 34 },
  { lake: "B", species: "Catfish", count: 41 },
  { lake: "B", species: "Perch", count: 21 },
  { lake: "B", species: "Salmon", count: 16 },
  { lake: "C", species: "Bass", count: 15 },
  { lake: "C", species: "Trout", count: 25 },
  { lake: "C", species: "Catfish", count: 31 },
  { lake: "C", species: "Perch", count: 22 },
  { lake: "C", species: "Salmon", count: 31 },
  { lake: "D", species: "Bass", count: 12 },
  { lake: "D", species: "Trout", count: 17 },
  { lake: "D", species: "Catfish", count: 23 },
  { lake: "D", species: "Perch", count: 23 },
  { lake: "D", species: "Salmon", count: 41 },
  { lake: "E", species: "Bass", count: 7 },
  { lake: "E", species: "Trout", count: 9 },
  { lake: "E", species: "Catfish", count: 13 },
  { lake: "E", species: "Perch", count: 20 },
  { lake: "E", species: "Salmon", count: 40 },
  { lake: "F", species: "Bass", count: 4 },
  { lake: "F", species: "Trout", count: 7 },
  { lake: "F", species: "Catfish", count: 9 },
  { lake: "F", species: "Perch", count: 21 },
  { lake: "F", species: "Salmon", count: 47 }
]

// X planting location per lake — the flower chart scatters each stem here, the
// way GoFish's example reads `catchLocations[lake].x` (the real coordinates).
const flowerLocations: Record<string, number> = {
  A: 5.26,
  B: 30.87,
  C: 50.01,
  D: 115.13,
  E: 133.05,
  F: 85.99
}

const projectStages = [
  { stage: "Planning", amount: 64 },
  { stage: "Design", amount: 82 },
  { stage: "Build", amount: 46 },
  { stage: "Review", amount: 71 },
  { stage: "Ship", amount: 55 }
]

// NOTE: the boba example is no longer baked here. It is hand-emitted as a
// DisplayList document in `gofishBobaHandwritten.ts` — proof the render IR is an
// open, host-emittable format, not something only GoFish can produce.

// A deterministic Titanic passenger sample (no RNG) for the fare circle treemap.
// Mirrors the real class shape: 1st class is fewer passengers at high fares and
// high survival; 3rd class is many passengers at low fares and low survival — so
// faceting by pclass yields a block of big circles, then medium, then a wide
// field of tiny ones, the way GoFish's example reads.
function titanicSample(): Array<{
  pclass: number
  fare: number
  survived: boolean
}> {
  const rows: Array<{ pclass: number; fare: number; survived: boolean }> = []
  const specs = [
    { pclass: 1, count: 60, base: 30, spread: 230, rate: 0.63 },
    { pclass: 2, count: 80, base: 12, spread: 65, rate: 0.47 },
    { pclass: 3, count: 160, base: 4, spread: 66, rate: 0.24 }
  ]
  for (const s of specs) {
    for (let i = 0; i < s.count; i++) {
      const tail = Math.pow(1 - i / s.count, 2)
      const fare = Math.round((s.base + tail * s.spread) * 10) / 10
      rows.push({
        pclass: s.pclass,
        fare,
        survived: ((i * 73 + s.pclass * 29) % 100) / 100 < s.rate
      })
    }
  }
  return rows
}

// An inline SVG data-URI bottle silhouette so the fixture needs no network.
// Filled (not outline-only): `paint({ blendMode: "color" })` desaturates this
// shape to supply luminosity, then tints it with the fill rect's hue — so the
// silhouette must have opaque body pixels for the liquid to read inside it.
const BOTTLE_HREF =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 100">' +
      '<path d="M15 4 h10 v14 q8 6 8 18 v52 q0 8 -8 8 h-10 q-8 0 -8 -8 v-52 q0 -12 8 -18 z" ' +
      'fill="#cfd8dd" stroke="#6b7e88" stroke-width="2"/></svg>'
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
    key: "flower",
    label: "Flower meadow",
    source: "https://gofish.graphics/js/examples/flower-chart.html",
    blurb:
      "GoFish's real flower chart, verbatim: a meadow where each lake is a green stem (a bar whose height is the lake's total catch) topped by a polar fan of petals, one per species, sized by count. It is layer([stems, flowers]) — the flowers selectAll the stems and stack a polar petal fan on each. The composition's root is a combinator (no ChartBuilder.toDisplayList), so it is baked through GoFish's mark-resolution contract; see gofish-displaylist-findings.md.",
    build: async () => {
      const FLOWER_RADIUS = 40
      // One row per species, tagged with its lake's planting x (the stem's location).
      const stemData = seafood.map((d) => ({
        ...d,
        x: flowerLocations[d.lake]
      }))
      const built = layer([
        // Stems: one thin green bar per lake, height = the lake's total catch
        // (one chart, so the count size channel auto-sums per lake and all stems
        // share the height scale). Named so the flowers can select them.
        chart(stemData)
          .flow(scatter({ by: "lake", x: "x" }))
          .mark(rect({ w: 4, h: "count", fill: color.green[5] }).name("stems")),
        // Flowers: each stem's "label". selectAll("stems") yields one ref per
        // lake (its datum is that lake's species rows); a polar petal fan is
        // stacked atop the stem via the spread + middle-alignment pattern.
        chart(selectAll("stems"))
          .flow(group({ by: "lake" }))
          .mark((d: any[]) =>
            spread({ dir: "y", alignment: "middle", spacing: -FLOWER_RADIUS }, [
              d[0],
              layer({ coord: polar() }, [
                stackX(
                  {
                    h: FLOWER_RADIUS,
                    spacing: 0,
                    alignment: "start",
                    sharedScale: true
                  },
                  (d[0].datum as { species: string; count: number }[]).map(
                    (r) =>
                      petal({ w: v(r.count), fill: v(r.species).lighten(0.5) })
                  )
                )
              ])
            ])
          )
      ])
      // The root is a layer([...]) combinator, which — unlike a ChartBuilder —
      // exposes no `.toDisplayList()`. Resolve it to a GoFishNode via GoFish's
      // mark contract ("call a mark with `undefined` to produce its node"), then
      // bake. This is the documented headless path for a combinator root; the
      // missing `.toDisplayList()` terminal is the one real gap (see findings doc).
      const node = await (
        built as unknown as (
          data?: unknown
        ) => Promise<{
          toDisplayList: (o: {
            w: number
            h: number
          }) => Promise<DisplayList.DisplayListDocument>
        }>
      )(undefined)
      return node.toDisplayList({ w: 520, h: 520 })
    }
  },
  {
    key: "polarribbon",
    label: "Polar ribbon chart",
    source: "https://gofish.graphics/js/examples/polar-ribbon-chart.html",
    blurb:
      "GoFish's polar ribbon chart, verbatim: the catch stacked radially per lake under a clock() projection, then a smooth area ribbon drawn across the lakes for each species (selectAll the bars, group by species). The wrap, the open gap, and the bumped ribbons are all baked into absolute-pixel paths; the radial bars keep their datum (hit targets), the ribbons are area chrome. Root is a layer({ coord: clock() }) combinator, baked through GoFish's mark-resolution contract — see gofish-displaylist-findings.md.",
    build: async () => {
      const built = layer({ coord: clock() }, [
        // Radial stacked bars: scatter the lakes around the full circle (x = lake,
        // width = 2π), pushed out to an inner radius (translate y), species
        // ordered by count then stacked up the radius. Named so the ribbons can
        // select them. (h/fill are string fields, as GoFish's example ships them.)
        chart(seafood)
          .flow(
            scatter({
              by: "lake",
              x: "lake",
              w: 2 * Math.PI,
              axes: { x: false, y: true }
            }).translate({ y: 50 }),
            derive((d: { count: number }[]) =>
              [...d].sort((a, b) => a.count - b.count)
            ),
            stack({ by: "species", dir: "y", label: false })
          )
          .mark(rect({ w: 0.1, h: "count", fill: "species" }).name("bars")),
        // Ribbons: selectAll the bars, group by species, and draw one smooth area
        // per species across the lakes — the bumped ribbons spiralling the center.
        chart(selectAll("bars"))
          .flow(group({ by: "species" }))
          .mark(area({ opacity: 0.8 }))
      ])
      // Same combinator-root bake path as the flower (the missing `.toDisplayList()`
      // terminal — see findings doc): resolve via the mark contract, then bake.
      const node = await (
        built as unknown as (
          data?: unknown
        ) => Promise<{
          toDisplayList: (o: {
            w: number
            h: number
          }) => Promise<DisplayList.DisplayListDocument>
        }>
      )(undefined)
      return node.toDisplayList({ w: 460, h: 460 })
    }
  },
  {
    key: "treemap",
    label: "Fare circle treemap",
    source:
      "https://gofish.graphics/js/examples/titanic-fare-circle-treemap.html",
    blurb:
      "GoFish's titanic fare circle treemap, verbatim: faceted by passenger class (facet by pclass, dir x), then a squarify-circle treemap per facet sizing each passenger by fare (sort desc, so fares run large→small) and colouring by survival. Three blocks — big first-class circles, then a field of tiny third-class ones. Every circle is a data node carrying its passenger; the facet labels/legend are chrome.",
    build: () =>
      chart(titanicSample(), { color: palette(["#2b8cbe", "#ff8408"]) })
        .facet({ by: "pclass", dir: "x" })
        .flow(
          treemap({
            h: "fare",
            valueField: "fare",
            paddingInner: 0,
            tile: "squarifyCircle",
            sort: "desc",
            flipY: true
          })
        )
        .mark(circle({ fill: "survived", stroke: "#ccc", strokeWidth: 1 }))
        .toDisplayList({ w: 1000, h: 320 })
  },
  {
    key: "bottle",
    label: "Bottle fill pictorial",
    source: "https://gofish.graphics/js/examples/bottle-fill-chart.html",
    blurb:
      "GoFish's real bottle-fill technique: a fill rect sized by amount is color-composited *inside* the bottle silhouette via paint({ blendMode: 'color' }), so the liquid reads as rising within the bottle (not a bar behind a picture). Bakes to a composite item; the adapter harvests the composite's datum so each bottle keeps hit-testing and tooltips.",
    build: () =>
      // GoFish's real spec. The trick is `image({ h: v(100) })`: v() places the
      // bottle's height in the *value scale's* space (a data value of 100), so
      // it shares one scale with the fill rect's `h: "amount"` string field.
      // The fill then resolves to amount/100 of the bottle height — a true
      // proportional liquid level — instead of the two living in different
      // coordinate frames. paint({ blendMode: "color" }) tints the silhouette.
      chart(projectStages, { axes: false })
        .flow(spread({ by: "stage", dir: "x", spacing: 40 }))
        .mark(
          layer([
            paint({ blendMode: "color" }, [
              image({ href: BOTTLE_HREF, h: v(100) }),
              rect({ w: 160, h: "amount", fill: "#3aa757" })
            ]),
            text({ text: field("stage"), fontSize: 13 })
          ])
        )
        .toDisplayList({ w: 560, h: 360 })
  },
  {
    key: "python",
    label: "Python memory diagram",
    source:
      "https://gofish.graphics/js/examples/python-tutor-memory-diagram.html",
    blurb:
      "A Python Tutor runtime memory diagram: a Global Frame of variables (c, d → pointers; x = 5) whose arrows fan into a heap of tuples, with tuple cells pointing on to further tuples. NOTE: GoFish's own example is not a portable spec — it relies on ~250 lines of unpublished story helpers (globalFrame/heap/tuple/Arrow). This is a best-effort reconstruction from GoFish primitives only (rect/text/Arrow/ref + .name()). It is also vertically flipped vs the live example: a free-space Layer baked through toDisplayList orients y-down differently than .render() (GoFish issue #143/#16). See gofish-displaylist-findings.md §6.",
    build: async () => {
      const FONT = "verdana, arial, helvetica, sans-serif"
      // A heap tuple cell: yellow box + index label (top-left) + value (centered),
      // named so pointer arrows can target it. (Local composition, not a GoFish
      // helper module — the real example's helpers are unpublished.)
      const cell = (id: string, idx: number, val: string | null) =>
        Layer([
          rect({
            h: 56,
            w: 64,
            fill: "#ffffc6",
            stroke: "gray",
            strokeWidth: 1
          }).name("box"),
          text({
            fontSize: 13,
            fontFamily: FONT,
            fill: "gray",
            text: String(idx)
          }).name("label"),
          val != null
            ? text({ fontSize: 22, fontFamily: FONT, text: val }).name("v")
            : text({
                fontSize: 22,
                fontFamily: FONT,
                fill: "none",
                text: ""
              }).name("v")
        ])
          .constrain(({ box, label, v }: Record<string, unknown>) => [
            Constraint.align({ x: "middle", y: "middle" }, [v, box]),
            Constraint.align({ x: "start", y: "start" }, [label, box])
          ])
          .name(id)
      const tuple = (tid: string, vals: (string | null)[]) =>
        Spread({ dir: "y", alignment: "start", spacing: 8 }, [
          text({ fontFamily: FONT, fontSize: 14, fill: "grey", text: "tuple" }),
          Spread(
            { dir: "x", spacing: 0 },
            vals.map((val, i) => cell(`${tid}-${i}`, i, val))
          )
        ]).name(tid)
      const vrow = (name: string, val: string | null) =>
        Spread({ dir: "x", alignment: "middle", spacing: 6 }, [
          text({ fontSize: 22, fontFamily: FONT, text: name }),
          Layer([
            rect({ h: 36, w: 36, fill: "#e2ebf6" }).name("box"),
            val != null
              ? text({ fontSize: 22, fontFamily: FONT, text: val })
              : text({ fontSize: 1, fontFamily: FONT, fill: "none", text: "" })
          ]).name(`${name}-box`)
        ])
      const frame = Layer([
        rect({ h: 240, w: 180, fill: "#e2ebf6" }).name("frameBg"),
        text({
          fontSize: 22,
          fontFamily: "Andale Mono, monospace",
          text: "Global Frame"
        }).name("flabel"),
        Spread({ dir: "y", alignment: "end", spacing: 12 }, [
          vrow("c", null),
          vrow("d", null),
          vrow("x", "5")
        ]).name("vars")
      ])
        .constrain(({ flabel, frameBg, vars }: Record<string, unknown>) => [
          Constraint.align({ x: "middle", y: "start" }, [flabel, frameBg]),
          Constraint.distribute({ dir: "y", spacing: 16 }, [flabel, vars])
        ])
        .name("frame")
      const heap = Spread({ dir: "y", alignment: "start", spacing: 40 }, [
        Spread({ dir: "x", alignment: "start", spacing: 60 }, [
          tuple("t0", ["12", null, "1", "0", null, null]),
          tuple("t2", ["3", "10", "7", "8", null])
        ]),
        Spread({ dir: "x", alignment: "start", spacing: 60 }, [
          tuple("t1", ["1", "4"]),
          tuple("t3", ["2", null]),
          tuple("t4", ["3"])
        ])
      ]).name("heap")
      const arrow = (from: string, to: string) =>
        Arrow({ stroke: "#1A5683", start: true, padStart: 0 }, [
          ref(from),
          ref(to)
        ])
      const built: unknown = Layer([
        Spread({ dir: "x", alignment: "start", spacing: 80 }, [frame, heap]),
        arrow("c-box", "t0-0"),
        arrow("d-box", "t1-0"),
        arrow("t0-1", "t1-0"),
        arrow("t0-4", "t2-0"),
        arrow("t0-5", "t3-0"),
        arrow("t2-4", "t4-0"),
        arrow("t3-1", "t4-0")
      ])
      // Combinator root → resolve to a GoFishNode, then bake. Capital `Layer`
      // resolves to a Promise (await it); lowercase `layer` is a callable mark
      // (call with undefined) — the resolution-inconsistency noted in the findings
      // doc, so handle both.
      type Bakeable = {
        toDisplayList: (o: {
          w: number
          h: number
        }) => Promise<DisplayList.DisplayListDocument>
      }
      const node =
        typeof built === "function"
          ? await (built as (d?: unknown) => Promise<Bakeable>)(undefined)
          : await (built as Promise<Bakeable>)
      return node.toDisplayList({ w: 1000, h: 460 })
    }
  }
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
  const baked: Array<{
    spec: FixtureSpec
    doc: DisplayList.DisplayListDocument
  }> = []
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
        `export const ${constName(spec.key)}: DisplayListDocument = ${JSON.stringify(doc)}\n`
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
            spec.source
          )}, blurb: ${JSON.stringify(spec.blurb)}, doc: ${constName(spec.key)} },`
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
