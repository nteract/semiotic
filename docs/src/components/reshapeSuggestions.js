// Generative reshape suggestions — the "your flat table could become this" layer.
//
// suggestCharts() is reactive: it only proposes charts the *current* data shape
// already fits, which is why Semiotic's distinctive flow / temporal / hierarchy
// charts never surface for a flat table (they gate on {nodes, edges} or
// temporal structure the recommender can't see). This module is generative: from
// a flat table's field profile it proposes (transform → distinctive chart → why)
// candidates — "pivot these two columns into flows and a Sankey shows where
// volume moves." It sells the charts that justify Semiotic, by telling you the
// reshape that unlocks them.
//
// Pure and heuristic — driven entirely by the ChartDataProfile's field
// candidates + field names. No rendering, no library calls.

const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()
const uniq = (arr) => [...new Set(arr)]

const TIME_RE = /(^|_)(time|date|ts|timestamp|month|year|week|day|quarter|when|start|end)($|_)/i
const STAGE_RE = /(step|stage|phase|funnel|level|milestone)/i
const GEO_RE = /(region|country|countries|state|province|city|cities|nation|lat|lon|lng|geo|place|territory)/i

function fieldNames(profile) {
  if (profile?.fields && typeof profile.fields === "object") return Object.keys(profile.fields)
  const sample = profile?.sample?.[0] || profile?.data?.[0]
  return sample ? Object.keys(sample) : []
}
const cand = (profile, role) => (profile?.candidates?.[role] || []).map((c) => c.field)

/**
 * @param {object} profile  ChartDataProfile from profileData(data)
 * @param {object} [opts]
 * @param {Set<string>} [opts.exclude]  components already directly suggested (skip)
 * @param {number} [opts.max]           cap (default 6)
 * @returns {Array<{component, family, transform, why, path}>}
 */
export function suggestReshapes(profile, opts = {}) {
  const exclude = opts.exclude || new Set()
  const max = opts.max ?? 6
  if (!profile) return []

  const all = fieldNames(profile)
  const cats = uniq(cand(profile, "category"))
  const timeish = uniq([...cand(profile, "time"), ...all.filter((f) => TIME_RE.test(f))]).filter((f) => !cats.includes(f))
  // Measures: numeric fields that are neither a category nor a time field — a
  // timestamp is not a sensible flow weight.
  const nums = uniq([...cand(profile, "y"), ...cand(profile, "size")]).filter(
    (f) => !cats.includes(f) && !timeish.includes(f),
  )
  const stageish = all.filter((f) => STAGE_RE.test(f))
  const geoish = all.filter((f) => GEO_RE.test(f))

  const a = cats[0]
  const b = cats[1]
  const measure = nums[0] || "count"
  const out = []
  const add = (component, family, transform, why) => {
    if (exclude.has(component)) return
    if (out.some((c) => c.component === component)) return
    out.push({ component, family, transform, why, path: `/charts/${kebab(component)}` })
  }

  // ── Two relational dimensions: flows + hierarchy ──────────────────────────
  if (cats.length >= 2) {
    add(
      "SankeyDiagram",
      "flow",
      `Aggregate ${a} → ${b} weighted by ${measure} into a {nodes, edges} flow.`,
      "Proportional flow ribbons between groups — see where the volume actually moves. Few tools render weighted multi-stage flows.",
    )
    // Temporal flow when a time-like field is present.
    if (timeish.length >= 1) {
      add(
        "ProcessSankey",
        "flow",
        `Turn ${a} → ${b} into events stamped with ${timeish[0]} (start/end) on a real time axis.`,
        "A sankey on an actual time axis — flows that begin, end, and even cycle. A temporal flow view almost nothing else can draw.",
      )
    }
    add(
      "ChordDiagram",
      "flow",
      `If ${a} and ${b} are the same set of entities, sum ${measure} between every pair.`,
      "A circular matrix of who-relates-to-whom — compact and legible for dense mutual relationships.",
    )
    add(
      "Treemap",
      "hierarchy",
      `Nest ${b} within ${a}, summing ${measure} — a two-level hierarchy.`,
      "Nested part-to-whole: every level's share visible at once. CirclePack and TreeDiagram show the same nesting differently.",
    )
  }

  // ── Sequential stages → funnel (only when a stage-like field exists) ──────
  if (stageish.length >= 1) {
    add(
      "FunnelChart",
      "flow",
      `Order ${stageish[0]} as sequential stages by ${measure}.`,
      "Stage-to-stage drop-off — exactly where you're losing people between steps.",
    )
  }

  // ── Geographic field → maps ───────────────────────────────────────────────
  if (geoish.length >= 1) {
    add(
      "ChoroplethMap",
      "geo",
      `Join ${geoish[0]} to a base geography (GeoJSON).`,
      "The data placed in space — regional patterns that only a map reveals. ProportionalSymbolMap sizes points instead of shading regions.",
    )
  }

  return out.slice(0, max)
}

export default suggestReshapes
