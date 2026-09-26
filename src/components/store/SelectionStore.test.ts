import {
  buildPredicate,
  type Selection,
  type SelectionClause
} from "./SelectionStore"
import {
  attachSelectionProvenance,
  getSelectionProvenance
} from "./selectionProvenance"

function makeSelection(
  resolution: "union" | "intersect" | "crossfilter",
  clauses: SelectionClause[]
): Selection {
  const clauseMap = new Map<string, SelectionClause>()
  for (const c of clauses) {
    clauseMap.set(c.clientId, c)
  }
  return { name: "test", resolution, clauses: clauseMap }
}

describe("SelectionStore — buildPredicate", () => {
  // ── Point selections ───────────────────────────────────────────────────

  describe("point selections", () => {
    const clause: SelectionClause = {
      clientId: "client-1",
      type: "point",
      fields: {
        category: { type: "point", values: new Set(["A", "B"]) }
      }
    }

    it("matches datums with matching values", () => {
      const sel = makeSelection("union", [clause])
      const pred = buildPredicate(sel)
      expect(pred({ category: "A" })).toBe(true)
      expect(pred({ category: "B" })).toBe(true)
    })

    it("rejects datums without matching values", () => {
      const sel = makeSelection("union", [clause])
      const pred = buildPredicate(sel)
      expect(pred({ category: "C" })).toBe(false)
      expect(pred({ category: undefined })).toBe(false)
    })

    it("matches Dates by timestamp without coercing other point values", () => {
      const date = new Date("2026-01-01T00:00:00Z")
      const invalidDate = new Date(NaN)
      const object = { value: 1 }
      const pred = buildPredicate(
        makeSelection("union", [
          {
            clientId: "dates",
            type: "point",
            fields: {
              value: {
                type: "point",
                values: new Set([date, invalidDate, "1", null, object])
              }
            }
          }
        ])
      )

      expect(pred({ value: new Date("2025-12-31T16:00:00-08:00") })).toBe(true)
      expect(pred({ value: new Date("2026-01-02T00:00:00Z") })).toBe(false)
      expect(pred({ value: date.getTime() })).toBe(false)
      expect(pred({ value: date.toISOString() })).toBe(false)
      expect(pred({ value: invalidDate })).toBe(false)
      expect(pred({ value: new Date(NaN) })).toBe(false)
      expect(pred({ value: "1" })).toBe(true)
      expect(pred({ value: 1 })).toBe(false)
      expect(pred({ value: null })).toBe(true)
      expect(pred({ value: object })).toBe(true)
      expect(pred({ value: { value: 1 } })).toBe(false)
    })

    it("matches a derived mark through its non-enumerable raw-row provenance", () => {
      const sel = makeSelection("union", [clause])
      const pred = buildPredicate(sel)
      const aggregate = attachSelectionProvenance({ binStart: 0, total: 12 }, [
        { category: "A", value: 5 },
        { category: "C", value: 7 }
      ])

      expect(pred(aggregate)).toBe(true)
      expect(getSelectionProvenance(aggregate)).toHaveLength(2)
      expect(Object.keys(aggregate)).toEqual(["binStart", "total"])
    })
  })

  // ── Interval selections ────────────────────────────────────────────────

  describe("interval selections", () => {
    const clause: SelectionClause = {
      clientId: "client-1",
      type: "interval",
      fields: {
        x: { type: "interval", range: [10, 50] },
        y: { type: "interval", range: [0, 100] }
      }
    }

    it("matches datums within range", () => {
      const sel = makeSelection("union", [clause])
      const pred = buildPredicate(sel)
      expect(pred({ x: 25, y: 50 })).toBe(true)
      expect(pred({ x: 10, y: 0 })).toBe(true) // inclusive
      expect(pred({ x: 50, y: 100 })).toBe(true) // inclusive
    })

    it("rejects datums outside range", () => {
      const sel = makeSelection("union", [clause])
      const pred = buildPredicate(sel)
      expect(pred({ x: 5, y: 50 })).toBe(false) // x out
      expect(pred({ x: 25, y: 150 })).toBe(false) // y out
    })

    it("selects only finite numbers and valid Dates in an inclusive interval", () => {
      const pred = buildPredicate(
        makeSelection("union", [
          {
            clientId: "brush",
            type: "interval",
            fields: { value: { type: "interval", range: [-5, 5] } }
          }
        ])
      )

      for (const value of [-5, 0, 5, new Date(-5), new Date(0), new Date(5)]) {
        expect(pred({ value })).toBe(true)
      }
      for (const value of [
        null,
        undefined,
        "",
        "0",
        [],
        [0],
        false,
        true,
        {},
        { valueOf: () => 0 },
        NaN,
        Infinity,
        -Infinity,
        new Date(NaN),
        -6,
        6,
        new Date(6)
      ]) {
        expect(pred({ value }), String(value)).toBe(false)
      }
      expect(pred({})).toBe(false)
    })

    it.each<[number, number]>([
      [NaN, 5],
      [-5, NaN],
      [5, -5]
    ])("does not match an invalid interval [%s, %s]", (lo, hi) => {
      const pred = buildPredicate(
        makeSelection("union", [
          {
            clientId: "brush",
            type: "interval",
            fields: { value: { type: "interval", range: [lo, hi] } }
          }
        ])
      )
      expect(pred({ value: 0 })).toBe(false)
      expect(pred({ value: new Date(0) })).toBe(false)
    })

    it("permits unbounded numeric intervals without selecting non-finite data", () => {
      const pred = buildPredicate(
        makeSelection("union", [
          {
            clientId: "brush",
            type: "interval",
            fields: {
              value: { type: "interval", range: [-Infinity, Infinity] }
            }
          }
        ])
      )
      expect(pred({ value: -1e100 })).toBe(true)
      expect(pred({ value: 1e100 })).toBe(true)
      expect(pred({ value: Infinity })).toBe(false)
      expect(pred({ value: -Infinity })).toBe(false)
    })
  })

  // ── Union resolution ──────────────────────────────────────────────────

  describe("union resolution", () => {
    it("matches if ANY clause matches", () => {
      const c1: SelectionClause = {
        clientId: "c1",
        type: "point",
        fields: { cat: { type: "point", values: new Set(["A"]) } }
      }
      const c2: SelectionClause = {
        clientId: "c2",
        type: "point",
        fields: { cat: { type: "point", values: new Set(["B"]) } }
      }
      const sel = makeSelection("union", [c1, c2])
      const pred = buildPredicate(sel)

      expect(pred({ cat: "A" })).toBe(true)
      expect(pred({ cat: "B" })).toBe(true)
      expect(pred({ cat: "C" })).toBe(false)
    })
  })

  // ── Intersect resolution ──────────────────────────────────────────────

  describe("intersect resolution", () => {
    it("matches only if ALL clauses match", () => {
      const c1: SelectionClause = {
        clientId: "c1",
        type: "interval",
        fields: { x: { type: "interval", range: [0, 50] } }
      }
      const c2: SelectionClause = {
        clientId: "c2",
        type: "interval",
        fields: { y: { type: "interval", range: [10, 30] } }
      }
      const sel = makeSelection("intersect", [c1, c2])
      const pred = buildPredicate(sel)

      expect(pred({ x: 25, y: 20 })).toBe(true) // both match
      expect(pred({ x: 25, y: 50 })).toBe(false) // y out
      expect(pred({ x: 75, y: 20 })).toBe(false) // x out
    })

    it.each(["intersect", "crossfilter"] as const)(
      "requires every %s clause to match the same provenance row",
      (resolution) => {
        const xClause: SelectionClause = {
          clientId: "x-chart",
          type: "interval",
          fields: { x: { type: "interval", range: [0, 10] } }
        }
        const yClause: SelectionClause = {
          clientId: "y-chart",
          type: "interval",
          fields: { y: { type: "interval", range: [0, 10] } }
        }
        const pred = buildPredicate(
          makeSelection(resolution, [xClause, yClause]),
          "third-chart"
        )
        const splitMatch = attachSelectionProvenance(
          { binStart: 0, total: 2 },
          [
            { x: 1, y: 100 },
            { x: 100, y: 1 }
          ]
        )
        const sameRowMatch = attachSelectionProvenance(
          { binStart: 0, total: 2 },
          [
            { x: 1, y: 1 },
            { x: 100, y: 100 }
          ]
        )

        expect(pred(splitMatch)).toBe(false)
        expect(pred(sameRowMatch)).toBe(true)
      }
    )
  })

  // ── Crossfilter resolution ────────────────────────────────────────────

  describe("crossfilter resolution", () => {
    const c1: SelectionClause = {
      clientId: "chart-1",
      type: "interval",
      fields: { x: { type: "interval", range: [0, 50] } }
    }
    const c2: SelectionClause = {
      clientId: "chart-2",
      type: "interval",
      fields: { y: { type: "interval", range: [10, 30] } }
    }

    it.each(["chart-3", "observer", undefined])(
      "intersects all other clauses for client %s",
      (clientId) => {
        const c3: SelectionClause = {
          clientId: "chart-3",
          type: "point",
          fields: { category: { type: "point", values: new Set(["A"]) } }
        }
        const pred = buildPredicate(
          makeSelection("crossfilter", [c1, c2, c3]),
          clientId
        )

        expect(pred({ x: 25, y: 20, category: "A" })).toBe(true)
        expect(pred({ x: 75, y: 20, category: "A" })).toBe(false)
        expect(pred({ x: 25, y: 50, category: "A" })).toBe(false)
        expect(pred({ x: 25, y: 20, category: "B" })).toBe(
          clientId === "chart-3"
        )
      }
    )

    it("excludes requesting client's own clause", () => {
      const sel = makeSelection("crossfilter", [c1, c2])

      // chart-1 requests: only chart-2's clause applies
      const pred1 = buildPredicate(sel, "chart-1")
      expect(pred1({ x: 100, y: 20 })).toBe(true) // x ignored, y matches
      expect(pred1({ x: 25, y: 50 })).toBe(false) // y out of range

      // chart-2 requests: only chart-1's clause applies
      const pred2 = buildPredicate(sel, "chart-2")
      expect(pred2({ x: 25, y: 999 })).toBe(true) // y ignored, x matches
      expect(pred2({ x: 75, y: 20 })).toBe(false) // x out of range
    })

    it("returns () => true when only the requesting client has a clause", () => {
      const sel = makeSelection("crossfilter", [c1])
      const pred = buildPredicate(sel, "chart-1")
      expect(pred({ x: 999, y: 999 })).toBe(true)
    })
  })

  // ── Empty selection ───────────────────────────────────────────────────

  describe("empty selection", () => {
    it("returns () => true when no clauses exist", () => {
      const sel = makeSelection("union", [])
      const pred = buildPredicate(sel)
      expect(pred({ anything: true })).toBe(true)
    })
  })

  // ── Multi-field clause ────────────────────────────────────────────────

  describe("multi-field clause", () => {
    it("requires ALL fields in a single clause to match", () => {
      const clause: SelectionClause = {
        clientId: "c1",
        type: "interval",
        fields: {
          x: { type: "interval", range: [0, 10] },
          y: { type: "interval", range: [0, 10] }
        }
      }
      const sel = makeSelection("union", [clause])
      const pred = buildPredicate(sel)

      expect(pred({ x: 5, y: 5 })).toBe(true)
      expect(pred({ x: 5, y: 15 })).toBe(false) // y out
      expect(pred({ x: 15, y: 5 })).toBe(false) // x out
    })
  })
})
