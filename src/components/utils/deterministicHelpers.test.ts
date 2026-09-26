import { describe, expect, it } from "vitest"
import { fnv1a32, hashUnit } from "./hash"
import { clamp } from "./clamp"
import { mulberry32 } from "../recipes/random"
import { seededRandom } from "../charts/physics/physicsChartShared"

describe("shared deterministic helpers (#1542)", () => {
  it.each([
    ["", 2166136261],
    ["a", 3826002220],
    ["hello", 1335831723],
    ["🌊", 3878647395],
    ["\0", 84696351],
    ["__proto__", 2238802877],
    ["café", 856211068],
    ["café", 1829333483]
  ] as const)("preserves UTF-16 FNV-1a for %j", (input, expected) => {
    expect(fnv1a32(input)).toBe(expected)
    expect(hashUnit(input)).toBe(expected / 4294967295)
  })

  it("continues an incremental fingerprint without adding separators", () => {
    expect(fnv1a32("lo", fnv1a32("hel"))).toBe(1335831723)
    expect(fnv1a32("", 0xffffffff)).toBe(0xffffffff)
  })

  it.each([
    [
      0,
      [
        0.26642920868471265, 0.0003297457005828619, 0.2232720274478197,
        0.1462021479383111
      ]
    ],
    [
      1,
      [
        0.6270739405881613, 0.002735721180215478, 0.5274470399599522,
        0.9810509674716741
      ]
    ],
    [
      -1,
      [
        0.8964226141106337, 0.189478256739676, 0.7156526781618595,
        0.9440599093213677
      ]
    ],
    [
      1234,
      [
        0.07329497812315822, 0.7034119898453355, 0.9028560190927237,
        0.9705493662040681
      ]
    ]
  ] as const)(
    "preserves recipe and physics random sequences for seed %s",
    (seed, expected) => {
      for (const factory of [mulberry32, seededRandom]) {
        const next = factory(seed)
        expect(Array.from({ length: expected.length }, next)).toEqual(expected)
      }
    }
  )

  it("preserves clamp boundaries and NaN propagation", () => {
    expect(clamp(-Infinity, 0, 10)).toBe(0)
    expect(clamp(Infinity, 0, 10)).toBe(10)
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(5, 10, 0)).toBe(10)
    expect(clamp(NaN, 0, 10)).toBeNaN()
    expect(clamp(5, NaN, 10)).toBeNaN()
    expect(clamp(5, 0, NaN)).toBeNaN()
  })
})
