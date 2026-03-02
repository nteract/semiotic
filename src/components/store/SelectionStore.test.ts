import { buildPredicate, type Selection, type SelectionClause } from "./SelectionStore"

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
