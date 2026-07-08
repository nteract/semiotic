import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const CollisionSwarmChartCapability: ChartCapability = {
  component: "CollisionSwarmChart",
  family: "distribution",
  importPath: "semiotic/physics",
  rubric: { familiarity: 2, accuracy: 4, precision: 3 },

  fits: (profile) => {
    const valueField = profile.primary.y ?? profile.primary.x
    if (!valueField) return "needs a numeric field for the swarm axis"
    if (profile.rowCount < 8) return "needs enough points for collision density to matter"
    if (profile.rowCount > 1200) return "too many points for browser collision relaxation"
    if ((profile.categoryCount ?? 0) > 12) return "too many group lanes for a physics swarm"
    return null
  },

  intentScores: {
    distribution: 3,
    "outlier-detection": 3,
    "compare-categories": 2,
  },

  caveats: () => [
    "CollisionSwarmChart makes overlap and settling visible; use SwarmPlot when a static distribution is enough",
  ],

  buildProps: (profile) => {
    const valueField = profile.primary.y ?? profile.primary.x
    const groupField =
      profile.primary.category && (profile.categoryCount ?? 0) <= 8
        ? profile.primary.category
        : undefined
    return {
      data: profile.data,
      xAccessor: valueField,
      ...(groupField ? { groupAccessor: groupField, colorBy: groupField } : {}),
      ...(profile.primary.size ? { radiusAccessor: profile.primary.size } : {}),
    }
  },
}
