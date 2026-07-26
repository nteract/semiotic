import bimodalFixture from "../../public/talk-demo-fixtures/bimodal-latency.json"

export { bimodalFixture }

export const BIMODAL_PROPOSAL_ID = "RidgelinePlot:bimodal-talk-fixture"

// Deliberately hand-written external-model output. `source: "model"` records
// proposal provenance; the fixture does not call a model or network service.
export const matchesBimodalFixture = (profile) =>
  profile.primary.category === bimodalFixture.categoryAccessor &&
  profile.primary.y === bimodalFixture.valueAccessor &&
  profile.data.length === bimodalFixture.data.length &&
  profile.data.every(
    (row, index) =>
      row[bimodalFixture.categoryAccessor] ===
        bimodalFixture.data[index][bimodalFixture.categoryAccessor] &&
      row[bimodalFixture.valueAccessor] ===
        bimodalFixture.data[index][bimodalFixture.valueAccessor]
  )

export const proposeBimodalRidgeline = (component, _capability, context) => {
  if (
    component !== "BoxPlot" ||
    !matchesBimodalFixture(context.profile) ||
    bimodalFixture.modelAssessment.shape !== "bimodal"
  ) {
    return []
  }
  return [
    {
      id: BIMODAL_PROPOSAL_ID,
      baseComponent: "RidgelinePlot",
      label: "Reveal the separated modes",
      source: "model",
      intentDeltas: { distribution: 1 },
      rubricDeltas: { familiarity: -1 },
      rationale: bimodalFixture.modelAssessment.rationale,
      tags: ["distribution", "bimodal", "talk-fixture"],
      buildProps: () => ({
        data: bimodalFixture.data,
        categoryAccessor: bimodalFixture.categoryAccessor,
        valueAccessor: bimodalFixture.valueAccessor,
        bins: 40,
        amplitude: 1.5,
      }),
    },
  ]
}
