import type { ChartCapability } from "../../ai/chartCapabilityTypes"

/**
 * ChainReactionChart is intentionally known to the AI surface but never selected
 * from a flat data profile. The chart's whole claim is about a specific
 * dependency topology — which task waits on which — and a profiler cannot
 * responsibly invent edges. A dependency chart with the wrong edges is worse
 * than no chart, so the graph must be authored.
 */
export const ChainReactionChartCapability: ChartCapability = {
  component: "ChainReactionChart",
  family: "hierarchy",
  importPath: "semiotic/physics",
  rubric: { familiarity: 2, accuracy: 4, precision: 3 },

  fits: () =>
    "requires an authored dependency graph (stable task ids plus an explicit array of prerequisite ids per task); edges cannot be inferred from flat data",

  intentScores: {
    flow: 3,
    hierarchy: 3,
    "change-detection": 3,
    "outlier-detection": 2
  },

  caveats: () => [
    "The settled projection is the chart: task state (completed / blocked / armed / waiting) plus each blocker's downstream reach. Ball motion shows prerequisites being delivered and never decides whether a task is done.",
    "Task completion is an explicit data event, not something the simulation discovers. Supply completionTimeAccessor or statusAccessor.",
    "Blocker amplification counts unfinished downstream tasks and affected lanes; it is a graph reachability result, not a schedule forecast."
  ],

  // Preserve the supplied rows only. In particular, do not synthesize a
  // dependency field or a lane assignment from field names.
  buildProps: (profile) => ({ data: profile.data })
}
