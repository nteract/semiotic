import type { Datum } from "../../src/components/charts/shared/datumTypes"
import { readCircuitEdition } from "../../src/components/recipes/atlas/flowCircuitTape"
import { flowCircuitStory } from "../network-atlas/stories/flowCircuitStories"

const { circuit, observed } = flowCircuitStory("etl")

/** Authored chart inputs; Flow Circuit uses a real admitted edition. */
export const physicsDefinitionFixtures = {
  FlowCircuitChart: {
    circuit,
    edition: observed,
    reading: readCircuitEdition(observed, "observed-snapshot", 60),
    particleBudget: 0
  },
  GaltonBoardChart: {
    data: [
      { id: "a", value: 1 },
      { id: "b", value: 2 }
    ],
    valueAccessor: "value",
    bins: 3
  },
  EventDropChart: {
    data: [{ id: "a", time: 12, arrivalTime: 13 }],
    windows: { size: 10 }
  },
  UnitPileChart: {
    data: [{ id: "a", category: "A", value: 2 }],
    valueAccessor: "value"
  },
  CollisionSwarmChart: {
    data: [{ id: "a", x: 12, group: "A" }],
    xAccessor: "x",
    groupAccessor: "group"
  },
  PacketFlowChart: {
    nodes: [
      { id: "A", x: 0.1, y: 0.5 },
      { id: "B", x: 0.9, y: 0.5 }
    ],
    links: [{ id: "flow", source: "A", target: "B", value: 5 }]
  },
  ProcessFlowChart: {
    data: [{ id: "a", stage: "coding" }],
    stages: [
      { id: "coding", label: "Coding", force: 8 },
      { id: "done", label: "Done", absorb: true }
    ]
  },
  GauntletChart: {
    data: [{ id: "p", positives: ["value"], negatives: ["risk"] }],
    idAccessor: "id",
    positiveAccessor: "positives",
    negativeAccessor: "negatives",
    positiveProperties: [{ id: "value", label: "Value", short: "V" }],
    negativeProperties: [{ id: "risk", label: "Risk", short: "R" }]
  },
  CrucibleChart: {
    data: [{ id: "source", label: "Source", category: "input", amount: 2 }],
    phases: [{ id: "heat", label: "Heat", duration: 2, motion: "mix" }]
  },
  ChainReactionChart: {
    data: [
      { id: "a", label: "A", lane: "One", deps: [] },
      { id: "b", label: "B", lane: "Two", deps: ["a"] }
    ],
    taskIDAccessor: "id",
    labelAccessor: "label",
    laneAccessor: "lane",
    dependencyAccessor: "deps",
    mode: "snapshot",
    currentTime: 1
  }
} satisfies Record<string, Datum>
