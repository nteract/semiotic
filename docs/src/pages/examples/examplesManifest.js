import { EXAMPLE_DEFINITIONS } from "./exampleDefinitions"

// The full example registry lives in exampleDefinitions. This module projects
// only the fields used by overview cards and example-to-example navigation.
export const EXAMPLE_FILTERS = {
  frames: [
    { id: "stream-physics", label: "Stream physics" },
    { id: "gauntlet", label: "Gauntlet" },
    { id: "xy", label: "XY" },
    { id: "ordinal", label: "Ordinal" },
    { id: "network", label: "Network" },
    { id: "geo", label: "Geographic" },
    { id: "custom", label: "Custom" },
  ],
  topics: [
    { id: "process", label: "Processes" },
    { id: "realtime", label: "Realtime" },
    { id: "uncertainty", label: "Uncertainty" },
    { id: "climate", label: "Climate" },
    { id: "civic", label: "Civic" },
    { id: "history", label: "History" },
    { id: "culture", label: "Culture" },
    { id: "geography", label: "Geography" },
    { id: "ai", label: "AI" },
    { id: "design", label: "Design" },
    { id: "accessibility", label: "Accessibility" },
  ],
}

export const EXAMPLES = EXAMPLE_DEFINITIONS.map((definition) => {
  const { id, sourceFile, isPilot, contract, ...example } = definition
  return example
})
