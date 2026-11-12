import { describe, expect, it } from "vitest"
import { packEnclose as upstreamPackEnclose } from "d3-hierarchy"
import { packEnclose, type EnclosingCircle } from "./d3-pack-enclose"

describe("standalone D3 circle enclosure", () => {
  const cases: EnclosingCircle[][] = [
    [],
    [{ x: 0, y: 0, r: 1 }],
    [{ x: 2, y: 3, r: 1 }, { x: 2, y: 3, r: 1 }],
    [{ x: 0, y: 0, r: 0 }, { x: 10, y: 0, r: 0 }, { x: 20, y: 0, r: 0 }],
    [{ x: 0, y: 0, r: 1 }, { x: 10, y: 0, r: 2 }, { x: 5, y: 10, r: 3 }],
    [{ x: 0, y: 0, r: 100 }, { x: 2, y: 3, r: 1 }]
  ]
  for (let seed = 1; seed <= 100; seed++) {
    let state = seed
    const random = () => (state = (1664525 * state + 1013904223) >>> 0) / 4294967296
    const scale = seed % 3 === 0 ? 1e6 : seed % 3 === 1 ? 1e-3 : 1
    cases.push(Array.from({ length: 2 + seed }, () => ({
      x: (random() - 0.5) * 100 * scale,
      y: (random() - 0.5) * 100 * scale,
      r: random() * 10 * scale
    })))
  }

  it.each(cases.map((circles, index) => ({ circles, index })))(
    "matches upstream geometry without mutating inputs (case $index)",
    ({ circles }) => {
      const original = structuredClone(circles)
      const enclosure = packEnclose(circles)
      expect(enclosure).toEqual(upstreamPackEnclose(circles))
      expect(packEnclose(new Set(circles))).toEqual(enclosure)
      expect(circles).toEqual(original)
      if (enclosure) {
        for (const circle of circles) {
          const distance = Math.hypot(circle.x - enclosure.x, circle.y - enclosure.y)
          expect(distance + circle.r).toBeLessThanOrEqual(
            enclosure.r + Math.max(1, enclosure.r) * 1e-8
          )
        }
      }
    }
  )
})
