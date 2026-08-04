import { describe, expect, it } from "vitest"
import {
  computeFeederRibbonRunwayStarts,
  indexFeederVisualDepartures,
  projectFeederBandSamples,
} from "./ribbonRunway"

describe("computeFeederRibbonRunwayStarts", () => {
  it("borrows only declared runway from source-only nodes", () => {
    const starts = computeFeederRibbonRunwayStarts(
      [
        { id: "Feeder", xExtent: [0, 12] },
        { id: "Main", xExtent: [0, 12] },
        { id: "Sink", xExtent: [0, 12] },
      ],
      [
        { id: "first", source: "Feeder", target: "Main", startTime: 4 },
        { id: "second", source: "Feeder", target: "Main", startTime: 9 },
        { id: "internal", source: "Main", target: "Sink", startTime: 10 },
      ],
      [0, 12],
    )

    expect(starts.get("first")).toBe(0)
    expect(starts.get("second")).toBe(4)
    expect(starts.has("internal")).toBe(false)
  })

  it("does not predate edge-specific inventory arrival or the domain", () => {
    const starts = computeFeederRibbonRunwayStarts(
      [{ id: "Feeder", xExtent: [-10, 12] }, { id: "Main" }],
      [{
        id: "edge",
        source: "Feeder",
        target: "Main",
        startTime: 8,
        systemInTime: 3,
      }],
      [0, 12],
    )

    expect(starts.get("edge")).toBe(3)
  })

  it("requires an authored xExtent or systemInTime runway", () => {
    const starts = computeFeederRibbonRunwayStarts(
      [{ id: "Feeder" }, { id: "Main" }],
      [{ id: "edge", source: "Feeder", target: "Main", startTime: 8 }],
      [0, 12],
    )

    expect(starts.size).toBe(0)
  })

  it("does not pull system-time-only stock ahead of its rendered silhouette", () => {
    const starts = computeFeederRibbonRunwayStarts(
      [{ id: "Feeder" }, { id: "Main" }],
      [{ id: "edge", source: "Feeder", target: "Main", startTime: 8, systemInTime: 3 }],
      [0, 12],
    )

    expect(starts.get("edge")).toBe(7)
  })

  it("gives a shared departure batch one consistent visual floor", () => {
    const starts = computeFeederRibbonRunwayStarts(
      [{ id: "Feeder", xExtent: [1, 12] }, { id: "A" }, { id: "B" }],
      [
        { id: "a", source: "Feeder", target: "A", startTime: 8 },
        { id: "b", source: "Feeder", target: "B", startTime: 8 },
      ],
      [0, 12],
    )

    expect(starts.get("a")).toBe(1)
    expect(starts.get("b")).toBe(1)
  })

  it("uses one safe floor for a lockstep bonded feeder group", () => {
    const starts = computeFeederRibbonRunwayStarts(
      [
        { id: "A", group: "bond", xExtent: [0, 12] },
        { id: "B", group: "bond", xExtent: [2, 12] },
        { id: "Main" },
      ],
      [
        { id: "a", source: "A", target: "Main", startTime: 8 },
        { id: "b", source: "B", target: "Main", startTime: 8 },
      ],
      [0, 12],
    )

    expect(starts.get("a")).toBe(2)
    expect(starts.get("b")).toBe(2)
  })

  it("keeps sequential bonded feeder groups on their authored clock", () => {
    const starts = computeFeederRibbonRunwayStarts(
      [
        { id: "A", group: "bond", xExtent: [0, 12] },
        { id: "B", group: "bond", xExtent: [0, 12] },
        { id: "Main" },
      ],
      [
        { id: "a", source: "A", target: "Main", startTime: 8 },
        { id: "b", source: "B", target: "Main", startTime: 9 },
      ],
      [0, 12],
    )

    expect(starts.size).toBe(0)
  })

  it("projects sequential rendered mass changes without mutating logical samples", () => {
    const samples = [
      { t: 0, topMass: 2, botMass: 0 },
      { t: 8, topMass: 2, botMass: 0 },
      { t: 8, topMass: 1, botMass: 0 },
      { t: 12, topMass: 1, botMass: 0 },
      { t: 12, topMass: 0, botMass: 0 },
    ]
    const indexed = indexFeederVisualDepartures(
      [
        { id: "first", source: "Feeder", target: "A", startTime: 8 },
        { id: "second", source: "Feeder", target: "B", startTime: 12 },
      ],
      new Map([["first", 5], ["second", 9]]),
    )
    const projected = projectFeederBandSamples(samples, indexed.get("Feeder"))

    expect(projected.map((sample) => sample.t)).toEqual([0, 5, 5, 9, 9])
    expect(samples.map((sample) => sample.t)).toEqual([0, 8, 8, 12, 12])
    expect(projected.map((sample) => sample.topMass)).toEqual([2, 2, 1, 1, 0])
  })

  it("projects a lockstep group clock through every bonded member", () => {
    const indexed = indexFeederVisualDepartures(
      [{ id: "a", source: "A", target: "Main", startTime: 8 }],
      new Map([["a", 5]]),
      new Map([["A", "bond"], ["B", "bond"]]),
    )

    expect(indexed.get("A")?.get(8)).toBe(5)
    expect(indexed.get("B")?.get(8)).toBe(5)
  })
})
