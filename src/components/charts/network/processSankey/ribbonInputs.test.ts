import { describe, expect, it } from "vitest"
import { buildRibbonGeometry } from "../../../geometry/ribbonGeometry"
import {
  computeProcessSankeyRibbonInputs,
  synchronizeProcessSankeyFeederBatches,
} from "./ribbonInputs"

const sourceAttachment = {
  side: "top" as const,
  time: 96,
  sideMassBefore: 1,
  sideMassAfter: 0,
  kind: "out" as const,
  value: 1,
}

const targetAttachment = {
  side: "top" as const,
  time: 100,
  sideMassBefore: 0,
  sideMassAfter: 1,
  kind: "in" as const,
  value: 1,
}

type Point = { x: number; y: number }

function endpointRadius(p0: Point, p1: Point, p2: Point): number {
  const dx = 3 * (p1.x - p0.x)
  const dy = 3 * (p1.y - p0.y)
  const ddx = 6 * (p2.x - 2 * p1.x + p0.x)
  const ddy = 6 * (p2.y - 2 * p1.y + p0.y)
  const cross = Math.abs(dx * ddy - dy * ddx)
  return cross === 0 ? Infinity : Math.pow(dx * dx + dy * dy, 1.5) / cross
}

function minimumEndpointRadius(geometry: ReturnType<typeof computeProcessSankeyRibbonInputs>): number {
  const points = buildRibbonGeometry(geometry).bezier.points
  if (!points) throw new Error("Expected a cubic-bezier point cache")
  return Math.min(
    endpointRadius(points[0], points[1], points[2]),
    endpointRadius(points[3], points[2], points[1]),
  )
}

describe("computeProcessSankeyRibbonInputs", () => {
  it("uses each attachment's movable side boundary", () => {
    const geometry = computeProcessSankeyRibbonInputs(
      {
        side: "bot",
        time: 10,
        sideMassBefore: 13,
        sideMassAfter: 0,
        kind: "out",
        value: 13,
        boundaryOffset: -13,
      },
      100,
      {
        side: "top",
        time: 20,
        sideMassBefore: 0,
        sideMassAfter: 13,
        kind: "in",
        value: 13,
      },
      200,
      2,
      (time) => time,
      "both",
      null,
    )

    expect(geometry).toMatchObject({
      sx: 10,
      sTop: 74,
      sBot: 100,
      tx: 20,
      tTop: 174,
      tBot: 200,
    })
  })

  it("uses an adaptive feeder run to keep both endpoint bends at least eight pixels wide", () => {
    const exact = computeProcessSankeyRibbonInputs(
      sourceAttachment,
      0,
      targetAttachment,
      300,
      1,
      (time) => time,
      "both",
      [0, 100],
    )
    const smoothed = computeProcessSankeyRibbonInputs(
      sourceAttachment,
      0,
      targetAttachment,
      300,
      1,
      (time) => time,
      "both",
      [0, 100],
      { minRun: "auto", sourceRunwayStart: 0 },
    )

    // A four-pixel run across 300 lane pixels has a 0.02px endpoint radius.
    expect(minimumEndpointRadius(exact)).toBeCloseTo(0.02, 8)
    // R = .375D²/L for the symmetric bump cubic, so R=8 requires D=80.
    expect(smoothed.sx).toBeCloseTo(20, 8)
    expect(smoothed.tx).toBe(100)
    expect(minimumEndpointRadius(smoothed)).toBeGreaterThanOrEqual(8 - 1e-8)
    expect(smoothed).toMatchObject({
      sTop: exact.sTop,
      sBot: exact.sBot,
      tTop: exact.tTop,
      tBot: exact.tBot,
    })
  })

  it("clamps an adaptive run to the proven feeder runway", () => {
    const smoothed = computeProcessSankeyRibbonInputs(
      sourceAttachment,
      0,
      targetAttachment,
      300,
      1,
      (time) => time,
      "both",
      [0, 100],
      { minRun: "auto", sourceRunwayStart: 90 },
    )

    expect(smoothed.sx).toBe(90)
    expect(smoothed.tx).toBe(100)
    expect(minimumEndpointRadius(smoothed)).toBeCloseTo(0.125, 8)
  })

  it("preserves exact attachment timing unless a feeder runway is explicitly supplied", () => {
    const defaultGeometry = computeProcessSankeyRibbonInputs(
      sourceAttachment,
      0,
      targetAttachment,
      300,
      1,
      (time) => time,
      "both",
      [0, 100],
    )
    const noRunway = computeProcessSankeyRibbonInputs(
      sourceAttachment,
      0,
      targetAttachment,
      300,
      1,
      (time) => time,
      "both",
      [0, 100],
      { minRun: 80 },
    )
    const disabled = computeProcessSankeyRibbonInputs(
      sourceAttachment,
      0,
      targetAttachment,
      300,
      1,
      (time) => time,
      "both",
      [0, 100],
      { minRun: 0, sourceRunwayStart: 0 },
    )

    expect(defaultGeometry.sx).toBe(96)
    expect(noRunway).toEqual(defaultGeometry)
    expect(disabled).toEqual(defaultGeometry)
  })

  it("treats a numeric minimum as total run without changing same-lane or already-long ribbons", () => {
    const fixedRun = computeProcessSankeyRibbonInputs(
      sourceAttachment,
      0,
      targetAttachment,
      300,
      1,
      (time) => time,
      "both",
      [0, 100],
      { minRun: 40, sourceRunwayStart: 0 },
    )
    const sameLane = computeProcessSankeyRibbonInputs(
      sourceAttachment,
      100,
      targetAttachment,
      100,
      1,
      (time) => time,
      "both",
      [0, 100],
      { minRun: 80, sourceRunwayStart: 0 },
    )
    const longSource = { ...sourceAttachment, time: 10 }
    const alreadyLong = computeProcessSankeyRibbonInputs(
      longSource,
      0,
      targetAttachment,
      300,
      1,
      (time) => time,
      "both",
      [0, 100],
      { minRun: 80, sourceRunwayStart: 0 },
    )

    expect(fixedRun.sx).toBe(60)
    expect(fixedRun.tx - fixedRun.sx).toBe(40)
    expect(sameLane.sx).toBe(96)
    expect(alreadyLong.sx).toBe(10)
    expect(alreadyLong.tx - alreadyLong.sx).toBe(90)
  })

  it("caps an automatic run at 144 pixels", () => {
    const hugeLaneShift = computeProcessSankeyRibbonInputs(
      sourceAttachment,
      0,
      targetAttachment,
      10_000,
      1,
      (time) => time * 2,
      "both",
      [0, 100],
      { minRun: "auto", sourceRunwayStart: 0 },
    )

    expect(hugeLaneShift.tx).toBe(200)
    expect(hugeLaneShift.sx).toBe(56)
    expect(hugeLaneShift.tx - hugeLaneShift.sx).toBe(144)
  })

  it("gives a same-time feeder batch one safe visual departure", () => {
    const edges = [
      { id: "far", source: "Feeder", startTime: 96 },
      { id: "near", source: "Feeder", startTime: 96 },
    ]
    const inputs = new Map([
      ["far", { sx: 20, sTop: 0, sBot: 1, tx: 100, tTop: 0, tBot: 1, cp1X: 60, cp2X: 60 }],
      ["near", { sx: 80, sTop: 1, sBot: 2, tx: 100, tTop: 1, tBot: 2, cp1X: 90, cp2X: 90 }],
    ])
    const synchronized = synchronizeProcessSankeyFeederBatches(
      edges,
      inputs,
      new Map([["far", 0], ["near", 30]]),
      (time) => time,
      "both",
    )

    expect(synchronized.get("far")?.sx).toBe(30)
    expect(synchronized.get("near")?.sx).toBe(30)
    expect(synchronized.get("far")?.cp1X).toBe(65)
    expect(synchronized.get("near")?.cp1X).toBe(65)
  })

  it("keeps a whole departure batch exact if any slice lacks proven runway", () => {
    const edges = [
      { id: "proven", source: "Feeder", startTime: 96 },
      { id: "unproven", source: "Feeder", startTime: 96 },
    ]
    const inputs = new Map([
      ["proven", { sx: 20, sTop: 0, sBot: 1, tx: 100, tTop: 0, tBot: 1, cp1X: 60, cp2X: 60 }],
      ["unproven", { sx: 96, sTop: 1, sBot: 2, tx: 100, tTop: 1, tBot: 2, cp1X: 98, cp2X: 98 }],
    ])
    const synchronized = synchronizeProcessSankeyFeederBatches(
      edges,
      inputs,
      new Map([["proven", 0]]),
      (time) => time,
      "both",
    )

    expect(synchronized.get("proven")?.sx).toBe(96)
    expect(synchronized.get("unproven")?.sx).toBe(96)
  })

  it("synchronizes lockstep departures across separate members of one group", () => {
    const edges = [
      { id: "a", source: "A", startTime: 96 },
      { id: "b", source: "B", startTime: 96 },
    ]
    const inputs = new Map([
      ["a", { sx: 20, sTop: 0, sBot: 1, tx: 100, tTop: 0, tBot: 1, cp1X: 60, cp2X: 60 }],
      ["b", { sx: 70, sTop: 1, sBot: 2, tx: 100, tTop: 1, tBot: 2, cp1X: 85, cp2X: 85 }],
    ])
    const synchronized = synchronizeProcessSankeyFeederBatches(
      edges,
      inputs,
      new Map([["a", 0], ["b", 0]]),
      (time) => time,
      "both",
      new Map([["A", "founding"], ["B", "founding"]]),
    )

    expect(synchronized.get("a")?.sx).toBe(20)
    expect(synchronized.get("b")?.sx).toBe(20)
  })
})
