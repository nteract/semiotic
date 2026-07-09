import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const GauntletChartCapability: ChartCapability = {
  component: "GauntletChart",
  family: "realtime",
  importPath: "semiotic/physics",
  rubric: { familiarity: 2, accuracy: 2, precision: 2 },

  fits: (profile) => {
    if (profile.rowCount < 1) return "needs at least one project/plan row"
    // Gauntlet is process narrative; fit loosely when categorical + numeric exist
    const hasId = profile.data.some(
      (row) => row && typeof row === "object" && "id" in row
    )
    if (!profile.primary.category && !hasId) {
      return "needs project rows with stable ids (or a categorical identity field)"
    }
    return null
  },

  intentScores: {
    flow: 3,
    "change-detection": 2,
    "compare-categories": 1
  },

  caveats: () => [
    "GauntletChart is for compound plans degraded by timed gate effects (one core + property satellites). Use ProcessFlowChart for many independent work items with capacitated queues.",
    "Read viability, property inventory, and outcomes — not body trajectories."
  ],

  buildProps: (profile) => {
    const data = profile.data.map((row, index) => ({
      ...row,
      id: row?.id ?? `project-${index}`,
      positives: Array.isArray(row?.positives) ? row.positives : ["value"],
      negatives: Array.isArray(row?.negatives) ? row.negatives : ["cost"]
    }))
    return {
      data,
      idAccessor: "id",
      positiveAccessor: "positives",
      negativeAccessor: "negatives",
      positiveProperties: [
        { id: "value", label: "Value", short: "V", color: "#22c55e", buoyancy: 2, radius: 9 }
      ],
      negativeProperties: [
        { id: "cost", label: "Cost", short: "$", color: "#ef4444", load: 1.1, radius: 7 }
      ],
      gates: [
        { id: "review", label: "Review", x: 0.45 },
        { id: "approval", label: "Approval", x: 0.7 }
      ],
      showProjection: true,
      showChrome: true
    }
  }
}
