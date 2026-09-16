import { describe, expect, it } from "vitest"
import { scaleLinear, scaleLog, scaleSymlog } from "d3-scale"
import { placeLabels, type LabelCandidate } from "./labelPlacement"
import { cacheLabelMeasurer } from "./labelMeasurement"

const candidate = (id: string, y: number, height = 12): LabelCandidate => ({
  id,
  anchor: { x: 200, y },
  measurement: { width: 30, height, ascent: 9, source: "measured" }
})
const bounds = { x: 206, y: 0, width: 60, height: 100 }

describe("endpoint rail placement", () => {
  it("is invariant to proportional changes of units", () => {
    const results = [1e-6, 1, 1e9].map((magnitude) => {
      const y = scaleLinear().domain([0, magnitude]).range([100, 0])
      return placeLabels(
        [0.95, 0.94, 0.93].map((v, i) =>
          candidate(String(i), y(v * magnitude))
        ),
        bounds
      )
    })
    for (const result of results)
      result.dispositions.forEach((d, i) => {
        expect(d.box!.y).toBeCloseTo(results[0].dispositions[i].box!.y, 8)
      })
  })

  it("packs both directions, is stable under input permutations, and preserves separated anchors", () => {
    const labels = [candidate("c", 50), candidate("b", 50), candidate("a", 50)]
    const result = placeLabels(labels, bounds)
    const reversed = placeLabels([...labels].reverse(), bounds)
    expect(
      [...result.dispositions].sort((a, b) => a.id.localeCompare(b.id))
    ).toEqual(
      [...reversed.dispositions].sort((a, b) => a.id.localeCompare(b.id))
    )
    expect(result.dispositions.find((d) => d.id === "a")!.box!.y).toBe(30)
    expect(result.dispositions.find((d) => d.id === "c")!.box!.y).toBe(58)
    const separated = placeLabels(
      [candidate("a", 20), candidate("b", 80)],
      bounds
    )
    expect(separated.dispositions.map((d) => d.offset!.y)).toEqual([0, 0])
    expect(
      result.evidence.findings.find((f) => f.code === "TIED_ENDPOINTS")!.count
    ).toBe(2)
  })

  it.each([
    scaleLinear().domain([0, 100]).range([0, 100]),
    scaleLog().domain([1, 100]).range([100, 0]),
    scaleSymlog().domain([-100, 100]).range([100, 0])
  ])("respects bounds with reversed and nonlinear projections", (scale) => {
    const result = placeLabels(
      [1, 1.01, 1.02, 99].map((v, i) => candidate(String(i), scale(v))),
      bounds
    )
    const boxes = result.dispositions
      .map((d) => d.box!)
      .sort((a, b) => a.y - b.y)
    boxes.forEach((box, i) => {
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.y + box.height).toBeLessThanOrEqual(100)
      if (i)
        expect(
          box.y - boxes[i - 1].y - boxes[i - 1].height
        ).toBeGreaterThanOrEqual(2 - 1e-8)
    })
  })

  it("accounts for every impossible fit and invalid projection, with bounded samples", () => {
    const labels = Array.from({ length: 100 }, (_, i) =>
      candidate(String(i).padStart(3, "0"), 50)
    )
    labels.push(candidate("invalid", NaN))
    const { dispositions, evidence } = placeLabels(labels, bounds)
    expect(dispositions).toHaveLength(101)
    expect(evidence.requested).toBe(evidence.rendered + evidence.omitted)
    expect(evidence.displaced).toBeLessThanOrEqual(evidence.rendered)
    expect(
      dispositions.filter((d) => d.status === "omitted").every((d) => d.reason)
    ).toBe(true)
    expect(evidence.omittedIds).toHaveLength(20)
    expect(
      evidence.findings.find((f) => f.code === "INVALID_PROJECTION")!.labelIds
    ).toEqual(["invalid"])
    expect(
      evidence.findings.every(
        (f) => f.labelIds.length <= 20 && f.remedy.length > 10
      )
    ).toBe(true)
  })

  it("never claims measured completeness from estimated text", () => {
    const label = candidate("a", 50)
    label.measurement.source = "estimated"
    expect(placeLabels([label], bounds).evidence.status).toBe("incomplete")
  })

  it("includes font identity, version, size, weight and text in cache keys", () => {
    let calls = 0
    const measure = cacheLabelMeasurer(() => {
      calls++
      return candidate("a", 0).measurement
    })
    const font = { family: "Arial", version: 1, size: 11, weight: 400 }
    measure("A", font)
    measure("A", font)
    for (const change of [
      { family: "serif" },
      { version: 2 },
      { size: 12 },
      { weight: 700 }
    ])
      measure("A", { ...font, ...change })
    measure("B", font)
    expect(calls).toBe(6)
  })
})
