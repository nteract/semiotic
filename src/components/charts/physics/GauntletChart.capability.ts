import type { ChartCapability } from "../../ai/chartCapabilityTypes"

function propertyIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(id => typeof id === "string" && id.trim()) : []
}

export const GauntletChartCapability: ChartCapability = {
  component: "GauntletChart",
  family: "realtime",
  importPath: "semiotic/physics",
  rubric: { familiarity: 2, accuracy: 2, precision: 2 },

  fits: (profile) => {
    if (!profile.data.some(row => propertyIds(row?.positives).length || propertyIds(row?.negatives).length)) {
      return "needs project rows with positive or negative property IDs"
    }
    if (!profile.primary.category && !profile.data.some(row => row?.id != null)) {
      return "needs a project ID or categorical identity field"
    }
    return null
  },

  intentScores: {
    flow: 3,
    "change-detection": 2,
    "compare-categories": 1
  },

  caveats: () => [
    "Use ProcessFlowChart for items without attached properties.",
    "Compare viability, property inventory, and outcomes. Body trajectories illustrate the simulation."
  ],

  buildProps: (profile) => {
    const data = profile.data.map((row, index) => ({
      ...row,
      id: row?.id ?? `project-${index}`,
      positives: propertyIds(row?.positives),
      negatives: propertyIds(row?.negatives)
    }))
    const definitions = (key: "positives" | "negatives") =>
      Array.from(new Set(data.flatMap(row => row[key])), id => ({ id }))
    return {
      data,
      idAccessor: "id",
      positiveAccessor: "positives",
      negativeAccessor: "negatives",
      positiveProperties: definitions("positives"),
      negativeProperties: definitions("negatives"),
      gates: [
        { id: "review", label: "Review" },
        { id: "approval", label: "Approval" }
      ],
      showProjection: true,
      showChrome: true
    }
  }
}
