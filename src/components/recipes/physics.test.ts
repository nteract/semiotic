import { describe, expect, it } from "vitest"
import type { PhysicsSedimentBinSnapshot } from "../stream/physics/PhysicsSediment"
import {
  arrivalReplay,
  collidersFromScales,
  galtonPegs,
  sedimentBake,
  spawnFromTokens,
} from "./physics"
import { generateTokens, layoutTokenGrid } from "./tokenEncoding"

const plot = { x: 10, y: 20, width: 300, height: 180 }

function sedimentBin(
  id: string,
  count: number,
  total: number
): PhysicsSedimentBinSnapshot {
  const stats = (mean: number) => ({
    count,
    total,
    mean,
    min: mean,
    max: mean,
    variance: 0,
  })
  return {
    id,
    label: id.toUpperCase(),
    count,
    total,
    bodyIds: [],
    x: stats(0),
    y: stats(0),
    value: stats(total),
  }
}

describe("physics recipes", () => {
  it("builds plot, bin, and band colliders from chart scales", () => {
    const bandScale = ((value: string) =>
      ({ a: 10, b: 110, c: 210 })[value]) as ((value: string) => number) & {
      bandwidth: () => number
    }
    bandScale.bandwidth = () => 80

    const colliders = collidersFromScales({
      plot,
      idPrefix: "demo",
      bounds: { includeCeiling: true, wallThickness: 12 },
      xBins: {
        count: 3,
        domainStart: 0,
        domainStep: 1,
        xScale: (value) => 10 + value * 100,
        includeBoundaryWalls: false,
      },
      xBands: {
        values: ["a", "b", "c"],
        scale: bandScale,
        includeInteriorWalls: false,
      },
    })

    expect(colliders.map((collider) => collider.id)).toEqual([
      "demo-floor",
      "demo-ceiling",
      "demo-left-wall",
      "demo-right-wall",
      "demo-xbin-wall-1",
      "demo-xbin-wall-2",
      "demo-xband-wall-0",
      "demo-xband-wall-5",
    ])
    expect(colliders.find((collider) => collider.id === "demo-floor")?.shape).toMatchObject({
      type: "aabb",
      x: 160,
      y: 206,
    })
  })

  it("creates deterministic Galton peg collider grids", () => {
    const pegs = galtonPegs({
      plot,
      rows: 3,
      columns: 4,
      pegRadius: 2,
      yStart: 40,
      yEnd: 100,
    })

    expect(pegs).toHaveLength(11)
    expect(pegs[0]).toMatchObject({
      id: "galton-peg-0-0",
      shape: { type: "aabb", x: 47.5, y: 40, width: 4, height: 4 },
    })
    expect(pegs[4]).toMatchObject({
      id: "galton-peg-1-0",
      shape: { type: "aabb", x: 85, y: 70 },
    })
  })

  it("turns positioned visual tokens into deterministic physics spawns", () => {
    const tokenSet = generateTokens(35, {
      tokenType: "dot",
      tokenSemantics: "unitized-measure",
      countStrategy: "unitized",
      unitValue: 10,
    })
    const tokens = layoutTokenGrid(tokenSet, {
      x: 20,
      y: 30,
      columns: 4,
      cellWidth: 10,
      cellHeight: 10,
      gutter: 0,
    })

    const spawns = spawnFromTokens(tokens, {
      idPrefix: "case",
      radius: (token) => 4 + token.fraction,
      jitter: { x: 2, y: 0 },
      seed: 4,
      vy: 12,
    })

    expect(spawns).toHaveLength(4)
    expect(spawns[0].id).toBe("case-0")
    expect(spawns[0].shape).toEqual({ type: "circle", radius: 5 })
    expect(spawns[0].vy).toBe(12)
    expect(spawns[0].x).toBeCloseTo(25.847)
    expect(spawns[3].shape).toEqual({ type: "circle", radius: 4.5 })
  })

  it("bakes sediment columns into static collider surfaces", () => {
    const result = sedimentBake(
      [sedimentBin("a", 4, 12), sedimentBin("b", 2, 6)],
      {
        baselineY: 100,
        binWidth: 20,
        maxHeight: 40,
        value: "total",
      }
    )

    expect(result.columns.map((column) => column.height)).toEqual([40, 20])
    expect(result.colliders).toEqual([
      {
        id: "sediment-a",
        shape: { type: "aabb", x: 10, y: 60.5, width: 20, height: 1 },
        restitution: 0.05,
        friction: 0.2,
      },
      {
        id: "sediment-b",
        shape: { type: "aabb", x: 32, y: 80.5, width: 20, height: 1 },
        restitution: 0.05,
        friction: 0.2,
      },
    ])
  })

  it("prepares arrival-spaced spawns and pacing for custom charts", () => {
    const replay = arrivalReplay(
      [
        { id: "late", x: 0, y: 0, shape: { type: "circle", radius: 3 }, datum: { arrivalTime: 14 } },
        { id: "first", x: 0, y: 0, shape: { type: "circle", radius: 3 }, datum: { arrivalTime: 10 } },
      ],
      { timeScale: 0.5 }
    )

    expect(replay.initialSpawns.map((spawn) => [spawn.id, spawn.spawnAt])).toEqual([
      ["first", 0],
      ["late", 4],
    ])
    expect(replay.initialSpawnPacing).toEqual({
      pacing: "arrival",
      startAt: 0,
      timeAccessor: "spawnAt",
      timeScale: 0.5,
    })
  })
})
