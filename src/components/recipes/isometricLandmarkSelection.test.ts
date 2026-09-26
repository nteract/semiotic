import { describe, expect, it } from "vitest"
import { selectIsometricLandmarks } from "semiotic/recipes"

const config = { center: { lon: 0, lat: 0 }, gridSize: 3, gridRadiusKm: 75 }
const city = {
  id: "corner",
  name: "Corner City",
  kind: "city",
  lon: 0.5,
  lat: 0.5
}
const monument = {
  id: "middle",
  name: "Middle Monument",
  kind: "monument",
  lon: 0,
  lat: 0
}

describe("isometric landmark geographic membership", () => {
  it("retains a corner city and a center monument in their cells regardless of input order", () => {
    const expected = selectIsometricLandmarks([monument, city], config)
    expect(selectIsometricLandmarks([city, monument], config)).toEqual(expected)
    expect(expected[2].landmark?.id).toBe("corner")
    expect(expected[4].landmark?.id).toBe("middle")
    expect(
      expected.flatMap((tile) => tile.landmarks.map((point) => point.id)).sort()
    ).toEqual(["corner", "middle"])
  })

  it("leaves the middle empty when all candidates belong elsewhere", () => {
    const tiles = selectIsometricLandmarks([city], config)
    expect(tiles[4].landmark).toBeNull()
    expect(tiles[2].landmark?.id).toBe("corner")
  })

  it("moves only an explicit in-range centerId and retains the middle's other features", () => {
    const tiles = selectIsometricLandmarks([city, monument], {
      ...config,
      centerId: "corner"
    })
    expect(tiles[4].landmarks.map((point) => point.id)).toEqual([
      "corner",
      "middle"
    ])
    expect(tiles[2].landmarks).toEqual([])
    for (const centerId of ["missing", "outside"]) {
      const fallback = selectIsometricLandmarks(
        [city, monument, { ...city, id: "outside", lon: 10 }],
        { ...config, centerId }
      )
      expect(fallback[4].landmark?.id).toBe("middle")
      expect(fallback[2].landmark?.id).toBe("corner")
      expect(fallback.flatMap((tile) => tile.landmarks)).toHaveLength(2)
    }
  })

  it("prefers a middle-cell city, after explicit candidate priority", () => {
    const middleCity = { ...city, lon: 0.1, lat: 0.1 }
    for (const points of [
      [monument, middleCity],
      [middleCity, monument]
    ]) {
      expect(selectIsometricLandmarks(points, config)[4].landmark?.id).toBe(
        "corner"
      )
      expect(
        selectIsometricLandmarks(points, {
          ...config,
          candidatePriorityAccessor: (datum) =>
            datum.kind === "monument" ? -1 : 0
        })[4].landmark?.id
      ).toBe("middle")
    }
  })

  it("breaks equal name and distance ties by id in center and outer cells", () => {
    const points = [
      { ...monument, id: "b" },
      { ...monument, id: "a" },
      { ...city, id: "d" },
      { ...city, id: "c" }
    ]
    const first = selectIsometricLandmarks(points, config)
    expect(selectIsometricLandmarks([...points].reverse(), config)).toEqual(
      first
    )
    expect(first[4].landmarks.map((point) => point.id)).toEqual(["a", "b"])
    expect(first[2].landmarks.map((point) => point.id)).toEqual(["c", "d"])
  })

  it("reserves the actual center kind for diversity, including non-city overrides", () => {
    const tiles = selectIsometricLandmarks(
      [monument, { ...city, id: "a", kind: "monument" }, { ...city, id: "b" }],
      { ...config, centerId: "middle" }
    )
    expect(tiles[2].landmark?.id).toBe("b")
  })

  it("counts the center once when balancing cells visited after it", () => {
    const tiles = selectIsometricLandmarks(
      [
        monument,
        { ...monument, id: "near", lon: 0.45, lat: -0.45 },
        { ...city, id: "far", lon: 0.67, lat: -0.67 }
      ],
      config
    )
    expect(tiles[8].landmark?.id).toBe("near")
  })

  it("uses locale-independent name ordering and ignores nonfinite priorities", () => {
    const tiles = selectIsometricLandmarks(
      [
        { ...monument, id: "accent", name: "ä", priority: Infinity },
        { ...monument, id: "ascii", name: "z", priority: NaN }
      ],
      { ...config, candidatePriorityAccessor: "priority" }
    )
    expect(tiles[4].landmarks.map((point) => point.id)).toEqual([
      "ascii",
      "accent"
    ])
  })

  it("ignores invalid or out-of-range coordinates and preserves an empty grid", () => {
    const empty = selectIsometricLandmarks([], config)
    expect(empty).toHaveLength(9)
    expect(
      empty.every(
        (tile) => tile.landmark === null && tile.landmarks.length === 0
      )
    ).toBe(true)
    expect(
      selectIsometricLandmarks(
        [
          { ...city, lon: NaN },
          { ...city, lat: Infinity },
          { ...city, lon: 10 }
        ],
        config
      )
    ).toEqual(empty)
  })
})
