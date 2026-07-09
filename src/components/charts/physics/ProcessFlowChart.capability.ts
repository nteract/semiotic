import type { ChartCapability } from "../../ai/chartCapabilityTypes"

function hasField(
  profile: Parameters<ChartCapability["buildProps"]>[0],
  field: string
): boolean {
  return profile.data.some(
    (datum) => datum && typeof datum === "object" && field in datum
  )
}

export const ProcessFlowChartCapability: ChartCapability = {
  component: "ProcessFlowChart",
  family: "realtime",
  importPath: "semiotic/physics",
  rubric: { familiarity: 2, accuracy: 3, precision: 2 },

  fits: (profile) => {
    if (profile.rowCount < 3) {
      return "needs multiple work items to show stage flow"
    }
    const stageField =
      (hasField(profile, "stage") && "stage") ||
      (hasField(profile, "status") && "status") ||
      profile.primary.category
    if (!stageField) {
      return "needs a categorical stage/status field"
    }
    return null
  },

  intentScores: {
    flow: 4,
    "change-detection": 3,
    "compare-categories": 2,
    rank: 1
  },

  caveats: () => [
    "Use for capacitated multi-body process stories (review queues, triage, merge pipelines); use a bar or Sankey for precise stage totals without motion",
    "Motion dramatizes backlog and capacity; settled stage counts and group completion are the readable chart"
  ],

  buildProps: (profile) => {
    const stageField =
      (hasField(profile, "stage") && "stage") ||
      (hasField(profile, "status") && "status") ||
      profile.primary.category ||
      "stage"
    const idField = hasField(profile, "id") ? "id" : undefined
    const groupField =
      (hasField(profile, "featureId") && "featureId") ||
      (hasField(profile, "group") && "group") ||
      profile.primary.series ||
      undefined

    const stageValues = new Set<string>()
    for (const row of profile.data) {
      if (!row || typeof row !== "object") continue
      const value = (row as Record<string, unknown>)[stageField]
      if (value != null && value !== "") stageValues.add(String(value))
    }
    const stageIds =
      stageValues.size > 0
        ? Array.from(stageValues)
        : ["coding", "review", "merged"]
    const stages = stageIds.map((id, index) => {
      const isLast = index === stageIds.length - 1
      const isMiddle = index === Math.floor(stageIds.length / 2)
      return {
        id,
        label: id,
        force: isLast ? 20 : 12,
        capacity: isMiddle
          ? { unitsPerSecond: Math.max(2, Math.round(profile.rowCount / 8)) }
          : undefined,
        pressure: isMiddle || undefined,
        absorb: isLast || undefined
      }
    })

    return {
      data: profile.data,
      ...(idField ? { idAccessor: idField } : {}),
      stageAccessor: stageField,
      ...(groupField ? { groupBy: groupField, groupCompletion: "allAbsorbed" } : {}),
      stages,
      showProjection: true,
      showChrome: true
    }
  }
}
