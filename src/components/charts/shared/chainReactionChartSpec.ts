import type { ChartPropSpec } from "./chartSpecCore"

/** Accessor grammar kept separate from the physics registry's chart metadata. */
export const CHAIN_REACTION_ACCESSOR_PROPS: Record<string, ChartPropSpec> = {
  taskIDAccessor: {
    type: ["string", "function"],
    description:
      "Stable task id. Dependency arrays reference these resolved ids."
  },
  labelAccessor: {
    type: ["string", "function"],
    description: "Human-readable task name used in labels and the data table."
  },
  laneAccessor: {
    type: ["string", "function"],
    description:
      "Workstream the task belongs to. Lanes become the chart's columns."
  },
  dependencyAccessor: {
    type: ["string", "function"],
    description:
      "Array of prerequisite task ids. Edges are never inferred; a task with the wrong prerequisites reads as a different claim."
  },
  startAccessor: {
    type: ["string", "function"],
    description: "Planned start time (number or Date)."
  },
  endAccessor: {
    type: ["string", "function"],
    description: "Planned end time (number or Date)."
  },
  progressAccessor: {
    type: ["string", "function"],
    description: "Fractional completion 0–1, shown on the task body."
  },
  statusAccessor: {
    type: ["string", "function"],
    description:
      "Authored task status (done / blocked / waiting / active). Completion is an explicit data event, never something the simulation discovers."
  },
  completionTimeAccessor: {
    type: ["string", "function"],
    description:
      "When the task actually completed. Drives replay ordering against currentTime."
  },
  blockerAccessor: {
    type: ["string", "function"],
    description:
      "Reason this task is blocked. A blocked task never arms its downstream dependents."
  },
  milestoneAccessor: {
    type: ["string", "function"],
    description: "Marks a task as a milestone for emphasis."
  }
}
