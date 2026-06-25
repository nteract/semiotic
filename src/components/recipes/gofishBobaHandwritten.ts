import type { GofishDisplayItem, GofishDisplayListDocument } from "./gofishIR"

/**
 * A **hand-written** GoFish DisplayList document — emitted directly, with no
 * `gofish-graphics` dependency and no layout solve from GoFish.
 *
 * Every other gallery fixture is baked by running a real GoFish spec through
 * `toDisplayList` (see `gen-gofish-fixtures.ts`). This one is the counter-proof:
 * the DisplayList render IR is an **open, host-emittable format**. Anything that
 * can produce a conformant `gofish-display-list` document — a hand, a different
 * layout engine, an LLM, a future non-GoFish tool — lands on Semiotic's
 * custom-layout surface and inherits hit-testing, tooltips, `onObservation`,
 * SSR mark-count evidence, and keyboard a11y for free. The adapter does not care
 * that GoFish never ran.
 *
 * The chart is Krist Wongsuphasawat's "Boba Science" bubble-tea menu rendered as
 * pictorial cups: a trapezoid cup outline with a lid bar and a tilted straw, and
 * inside it the drink's volumes stacked bottom→top — tapioca pearls (packed dark
 * circles), milk tea (tan fill), and ice (pale cubes). Cup height tracks total
 * volume. All geometry is computed here in plain arithmetic and emitted as
 * `path` / `ellipse` / `rect` / `text` items. The three volume bands per drink
 * carry a `{ name, component, volume }` datum (data nodes / hit targets); the cup
 * outline, lid, straw, pearls, and labels are `overlay` chrome.
 */

interface Drink {
  name: string
  tapioca: number
  tea: number
  ice: number
}

const DRINKS: Drink[] = [
  { name: "Classic", tapioca: 95, tea: 470, ice: 60 },
  { name: "Extra Boba", tapioca: 240, tea: 360, ice: 45 },
  { name: "Light Ice", tapioca: 95, tea: 500, ice: 12 },
  { name: "Mega", tapioca: 150, tea: 660, ice: 120 },
]

const TEA = "#cda86a"
const PEARL = "#241a12"
const ICE = "#cfe6ee"
const ICE_TINT = "#dcebf1"
const STRAW = "#5b86b8"
const CUP = "#111111"

function buildBobaDisplayList(): GofishDisplayListDocument {
  const W = 1180
  const H = 820
  const scale = 0.62 // px per ml
  const baseline = H - 110 // cup bottoms
  const slot = W / DRINKS.length
  const wBottom = 150
  const wTop = 220 // trapezoid: wider at the rim
  const headroom = 70 // empty cup above the liquid

  const items: GofishDisplayItem[] = []

  DRINKS.forEach((d, i) => {
    const cx = slot * (i + 0.5)
    const tapH = d.tapioca * scale
    const teaH = d.tea * scale
    const iceH = d.ice * scale
    const cupH = tapH + teaH + iceH + headroom
    const topY = baseline - cupH
    // half-width of the cup at a height `y` measured up from the bottom
    const hw = (y: number) => (wBottom + (wTop - wBottom) * (y / cupH)) / 2
    // a liquid slab between two heights, following the cup's slope → a path
    const slab = (y0: number, y1: number, fill: string): GofishDisplayItem => {
      const wb = hw(y0)
      const wt = hw(y1)
      return {
        kind: "path",
        d: `M ${cx - wb} ${baseline - y0} L ${cx + wb} ${baseline - y0} L ${cx + wt} ${baseline - y1} L ${cx - wt} ${baseline - y1} Z`,
        style: { fill },
      }
    }

    // tea (the main volume) — a data node
    items.push({ ...slab(tapH, tapH + teaH, TEA), datum: [{ name: d.name, component: "tea", volume: d.tea }], role: "node", id: `${d.name}-tea` })
    // ice tint band behind the cubes — a data node
    items.push({ ...slab(tapH + teaH, tapH + teaH + iceH, ICE_TINT), datum: [{ name: d.name, component: "ice", volume: d.ice }], role: "node", id: `${d.name}-ice` })

    // tapioca pearls: rows of dark circles from the bottom up to tapH
    const pr = 13
    const rows = Math.max(1, Math.round(tapH / (pr * 2)))
    for (let r = 0; r < rows; r++) {
      const cy = baseline - (r * pr * 2 + pr)
      const halfw = hw(r * pr * 2 + pr) - 6
      const cols = Math.max(1, Math.floor((halfw * 2) / (pr * 2)))
      const span = cols * pr * 2
      for (let c = 0; c < cols; c++) {
        items.push({ kind: "ellipse", cx: cx - span / 2 + pr + c * pr * 2, cy, rx: pr, ry: pr, style: { fill: PEARL }, role: "overlay" })
      }
    }
    // transparent hit-rect over the pearl region — the tapioca data node
    items.push({ kind: "rect", x: cx - hw(0), y: baseline - tapH, w: hw(0) * 2, h: tapH, style: { fill: "rgba(0,0,0,0)" }, datum: [{ name: d.name, component: "tapioca", volume: d.tapioca }], role: "node", id: `${d.name}-tapioca` })

    // ice cubes: pale rounded squares scattered in the ice band
    const cube = 40
    const iceRows = Math.max(1, Math.round(iceH / (cube * 0.85)))
    for (let r = 0; r < iceRows; r++) {
      const yb = baseline - (tapH + teaH) - r * cube * 0.78 - cube / 2
      const halfw = hw(tapH + teaH + r * cube) - 10
      const cols = Math.max(1, Math.floor((halfw * 2) / cube))
      const span = cols * cube
      for (let c = 0; c < cols; c++) {
        items.push({ kind: "rect", x: cx - span / 2 + 4 + c * cube, y: yb - cube / 2, w: cube - 7, h: cube - 7, rx: 6, ry: 6, style: { fill: ICE, stroke: "#bcd9e3", strokeWidth: 1 }, role: "overlay" })
      }
    }

    // cup outline (trapezoid, stroke only so the contents show through)
    const wb0 = hw(0)
    const wt0 = hw(cupH)
    items.push({ kind: "path", d: `M ${cx - wb0} ${baseline} L ${cx + wb0} ${baseline} L ${cx + wt0} ${topY} L ${cx - wt0} ${topY} Z`, style: { fill: "none", stroke: CUP, strokeWidth: 4 }, role: "overlay" })
    // lid bar across the rim
    items.push({ kind: "rect", x: cx - wt0 - 10, y: topY - 4, w: (wt0 + 10) * 2, h: 8, style: { fill: CUP }, role: "overlay" })
    // straw — a tilted parallelogram path (the adapter ignores `rotate` on rect)
    const sw = 13
    const tTop = cx + 22
    const tBot = cx - 14
    const yTop = topY - 64
    const yBot = baseline - 24
    items.push({ kind: "path", d: `M ${tTop - sw} ${yTop} L ${tTop + sw} ${yTop} L ${tBot + sw} ${yBot} L ${tBot - sw} ${yBot} Z`, style: { fill: STRAW, opacity: 0.85 }, role: "overlay" })
    // label
    items.push({ kind: "text", x: cx, y: baseline + 40, text: d.name, fontSize: 26, fontFamily: "system-ui, sans-serif", textAnchor: "middle", style: { fill: "#444444" }, role: "overlay" })
  })

  return { irVersion: 0, ir: "gofish-display-list", viewport: { w: W, h: H }, items }
}

/** The hand-emitted boba DisplayList document (computed once, deterministic). */
export const bobaDisplayList: GofishDisplayListDocument = buildBobaDisplayList()
