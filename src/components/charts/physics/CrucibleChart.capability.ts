import type { ChartCapability } from "../../ai/chartCapabilityTypes"

/**
 * CrucibleChart is intentionally known to the AI surface but never selected
 * from a flat data profile. A valid chart needs an authored treatment program,
 * declared products, and explicit destinations that dataset profiling cannot
 * responsibly invent.
 */
export const CrucibleChartCapability: ChartCapability = {
  component: "CrucibleChart",
  family: "flow",
  importPath: "semiotic/physics",
  rubric: { familiarity: 1, accuracy: 4, precision: 3 },

  fits: () =>
    "requires authored phases, product molds, events, and outlets; these cannot be inferred from flat data",

  intentScores: {
    flow: 4,
    "change-detection": 3,
    "compare-categories": 1
  },

  caveats: () => [
    "CrucibleChart presents an authored treatment and its accounting; collisions never discover products, affinity, failure, or causality.",
    "Supply stable source ids plus explicit phases, products, events, and reason-labelled outlets. Use the settled projection for the exact reading.",
    "buildCrucibleProductEvents can serialize an explicit form → contribute → complete lifecycle, but the caller must still author every member, relation, event position, and outlet."
  ],

  // Preserve the supplied charge only. In particular, do not synthesize a
  // runnable-looking event tape or product assignment from field names.
  buildProps: (profile) => ({ data: profile.data })
}
