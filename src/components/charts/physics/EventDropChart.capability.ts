import type { ChartCapability } from "../../ai/chartCapabilityTypes"

function hasField(profile: Parameters<ChartCapability["buildProps"]>[0], field: string): boolean {
  return profile.data.some((datum) => datum && typeof datum === "object" && field in datum)
}

export const EventDropChartCapability: ChartCapability = {
  component: "EventDropChart",
  family: "realtime",
  importPath: "semiotic/physics",
  rubric: { familiarity: 2, accuracy: 3, precision: 2 },

  fits: (profile) => {
    const timeField = profile.primary.time ?? profile.primary.x
    if (!timeField) return "needs an event-time field"
    if (profile.rowCount < 3) return "needs multiple events to show arrival/window behavior"
    return null
  },

  intentScores: {
    "change-detection": 3,
    trend: 1,
    distribution: 1,
  },

  caveats: () => [
    "Use for event-time arrival stories, watermarks, and lateness; use a line or histogram for precise temporal values",
  ],

  buildProps: (profile) => {
    const timeField = profile.primary.time ?? profile.primary.x
    const arrivalField =
      (hasField(profile, "arrivalTime") && "arrivalTime") ||
      profile.candidates.time.find((candidate) => candidate.field !== timeField)?.field ||
      timeField
    return {
      data: profile.data,
      timeAccessor: timeField,
      arrivalAccessor: arrivalField,
      windows: { size: Math.max(1, Math.ceil(profile.rowCount / 8)) },
      watermark: { delay: 1 },
    }
  },
}
