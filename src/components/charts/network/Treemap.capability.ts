import type { ChartCapability } from "../../ai/chartCapabilityTypes"
import type { Datum } from "../shared/datumTypes"

function countLeaves(node: Datum | undefined): number {
  if (!node || typeof node !== "object") return 0
  const children = (node as Record<string, unknown>).children
  if (Array.isArray(children) && children.length > 0) {
    return (children as Datum[]).reduce((sum, c) => sum + countLeaves(c), 0)
  }
  return 1
}

export const TreemapCapability: ChartCapability = {
  component: "Treemap",
  family: "hierarchy",
  importPath: "semiotic/network",
  rubric: { familiarity: 4, accuracy: 3, precision: 3 },

  fits: (profile) => {
    if (!profile.hasHierarchy || !profile.hierarchy) return "needs a hierarchical root with values"
    // Honor declared scale: at single-value scale, a hierarchy display
    // doesn't pay off regardless of how many leaves the structure has.
    // The scaledProfile path in suggestCharts feeds the declared row count
    // here so a "tiny" declaration yields the catalog to GaugeChart.
    if (profile.rowCount < 4) return "declared scale is too small to render a hierarchy meaningfully"
    return null
  },

  intentScores: {
    "hierarchy": 4,
    // Treemap is the part-to-whole chart for genuinely hierarchical data.
    // When the structure is hierarchical, push past Pie/Donut by half a point
    // — Pie compares well on familiarity but loses precision once any tier
    // of the hierarchy is multi-level.
    "part-to-whole": (p) => (p.hasHierarchy ? 5 : 4),
    "compare-categories": 3,
  },

  caveats: () => ["rectangle area comparisons are less precise than length — prefer a bar chart for ranking"],

  buildProps: (profile) => ({
    data: profile.hierarchy ?? { name: "root", children: [] },
    valueAccessor: "value",
  }),

  // Treemap legibility scales with leaf count, aspect ratio, AND declared
  // scale. Past the huge band the data is dense enough that aggregated
  // matrix / stacked views compete with hierarchical browsing — Shneiderman's
  // original guidance was browsing, not aggregation.
  scaleFit: (profile, effective) => {
    const leaves = countLeaves(profile.hierarchy)
    let delta = 0
    const caveats: string[] = []
    let reason: string | undefined

    if (leaves < 5) {
      delta -= 0.5
      caveats.push(`only ${leaves} leaves — treemap needs more cells to show structure`)
    } else if (leaves <= 100) {
      delta += 0.4
      reason = `${leaves} leaves is in the legible band for treemap`
    } else if (leaves > 500) {
      delta -= 0.7
      caveats.push(`${leaves} leaves — most tiles will be sub-pixel; prefer aggregation or zoomable treatment`)
    }

    if (effective.rowBand === "huge") {
      delta -= 0.5
      caveats.push("at huge declared scale a stacked or matrix view aggregates better than hierarchical browsing")
    }

    return { delta, reason, caveats }
  },
}
