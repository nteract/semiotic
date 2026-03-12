import { findNearestOrdinalNode } from "./OrdinalCanvasHitTester"
import type { OrdinalSceneNode, WedgeSceneNode, BoxplotSceneNode, ViolinSceneNode } from "./ordinalTypes"
import type { PointSceneNode, RectSceneNode } from "./types"

describe("OrdinalCanvasHitTester — findNearestOrdinalNode", () => {
  // ── Rect hit testing (bar chart bars) ────────────────────────────────

  describe("rect hit testing", () => {
    const rect: RectSceneNode = {
      type: "rect",
      x: 100,
      y: 50,
      w: 80,
      h: 200,
      style: { fill: "#007bff" },
      datum: { category: "A", value: 42 },
      group: "A"
    }

    it("hits inside a rect", () => {
      const result = findNearestOrdinalNode([rect], 140, 150)
      expect(result).not.toBeNull()
      expect(result!.datum.category).toBe("A")
      expect(result!.distance).toBe(0)
      expect(result!.category).toBe("A")
    })

    it("hits at the top-left corner (edge)", () => {
      const result = findNearestOrdinalNode([rect], 100, 50)
      expect(result).not.toBeNull()
    })

    it("hits at the bottom-right corner (edge)", () => {
      const result = findNearestOrdinalNode([rect], 180, 250)
      expect(result).not.toBeNull()
    })

    it("misses outside the rect", () => {
      const result = findNearestOrdinalNode([rect], 50, 50)
      expect(result).toBeNull()
    })

    it("misses below the rect", () => {
      const result = findNearestOrdinalNode([rect], 140, 260)
      expect(result).toBeNull()
    })

    it("misses to the right of the rect", () => {
      const result = findNearestOrdinalNode([rect], 190, 150)
      expect(result).toBeNull()
    })
  })

  // ── Point hit testing (swarm/dot plot) ───────────────────────────────

  describe("point hit testing", () => {
    const point: PointSceneNode = {
      type: "point",
      x: 200,
      y: 100,
      r: 8,
      style: { fill: "red" },
      datum: { id: "p1" }
    }

    it("hits inside a point", () => {
      const result = findNearestOrdinalNode([point], 203, 102)
      expect(result).not.toBeNull()
      expect(result!.datum.id).toBe("p1")
      expect(result!.distance).toBeCloseTo(Math.sqrt(9 + 4), 1)
    })

    it("hits at the center with distance 0", () => {
      const result = findNearestOrdinalNode([point], 200, 100)
      expect(result).not.toBeNull()
      expect(result!.distance).toBe(0)
    })

    it("uses minimum hit target of 5 for small points", () => {
      const tinyPoint: PointSceneNode = {
        type: "point",
        x: 50,
        y: 50,
        r: 2, // smaller than min hit target of 5
        style: { fill: "blue" },
        datum: { id: "tiny" }
      }
      // 4 px away — within the minimum hit target of 5
      const result = findNearestOrdinalNode([tinyPoint], 54, 50)
      expect(result).not.toBeNull()
    })

    it("misses outside point radius and maxDistance", () => {
      const result = findNearestOrdinalNode([point], 300, 300, 10)
      expect(result).toBeNull()
    })
  })

  // ── Wedge hit testing (pie/donut slices) ─────────────────────────────

  describe("wedge hit testing", () => {
    // A wedge covering 0 to PI/2 (first quadrant), centered at (200, 200)
    const wedge: WedgeSceneNode = {
      type: "wedge",
      cx: 200,
      cy: 200,
      innerRadius: 0,
      outerRadius: 100,
      startAngle: 0,
      endAngle: Math.PI / 2,
      style: { fill: "#4e79a7" },
      datum: { category: "slice1" },
      category: "slice1"
    }

    it("hits inside a pie wedge", () => {
      // Point at angle ~PI/4, radius ~50 (inside the wedge)
      const px = 200 + 50 * Math.cos(Math.PI / 4)
      const py = 200 + 50 * Math.sin(Math.PI / 4)
      const result = findNearestOrdinalNode([wedge], px, py)
      expect(result).not.toBeNull()
      expect(result!.category).toBe("slice1")
    })

    it("misses outside the outer radius", () => {
      // Point at angle PI/4 but radius 150 (beyond outer radius)
      const px = 200 + 150 * Math.cos(Math.PI / 4)
      const py = 200 + 150 * Math.sin(Math.PI / 4)
      const result = findNearestOrdinalNode([wedge], px, py)
      expect(result).toBeNull()
    })

    it("misses outside the angle range", () => {
      // Point at angle 3*PI/4 (outside the 0 to PI/2 wedge), radius 50
      const px = 200 + 50 * Math.cos(3 * Math.PI / 4)
      const py = 200 + 50 * Math.sin(3 * Math.PI / 4)
      const result = findNearestOrdinalNode([wedge], px, py)
      expect(result).toBeNull()
    })

    it("respects inner radius for donut slices", () => {
      const donutWedge: WedgeSceneNode = {
        type: "wedge",
        cx: 200,
        cy: 200,
        innerRadius: 50,
        outerRadius: 100,
        startAngle: 0,
        endAngle: Math.PI * 2, // full circle
        style: { fill: "#e15759" },
        datum: { category: "donut" },
        category: "donut"
      }

      // Point in the hole (radius 30 < innerRadius 50)
      const result = findNearestOrdinalNode([donutWedge], 230, 200)
      expect(result).toBeNull()

      // Point in the ring (radius 75, between 50 and 100)
      const result2 = findNearestOrdinalNode([donutWedge], 275, 200)
      expect(result2).not.toBeNull()
      expect(result2!.category).toBe("donut")
    })

    it("returns centroid position for tooltip", () => {
      const result = findNearestOrdinalNode([wedge], 200 + 50, 200 + 10)
      if (result) {
        // The returned x/y should be the centroid of the wedge
        const midAngle = (wedge.startAngle + wedge.endAngle) / 2
        const midRadius = (wedge.innerRadius + wedge.outerRadius) / 2
        expect(result.x).toBeCloseTo(200 + Math.cos(midAngle) * midRadius, 0)
        expect(result.y).toBeCloseTo(200 + Math.sin(midAngle) * midRadius, 0)
      }
    })
  })

  // ── Multiple overlapping elements ──────────────────────────────────

  describe("multiple overlapping elements", () => {
    it("returns the closest element among overlapping rects", () => {
      const rects: RectSceneNode[] = [
        {
          type: "rect", x: 90, y: 40, w: 100, h: 200,
          style: { fill: "#aaa" }, datum: { id: "big" }, group: "big"
        },
        {
          type: "rect", x: 130, y: 100, w: 30, h: 50,
          style: { fill: "#bbb" }, datum: { id: "small" }, group: "small"
        }
      ]

      // Point inside both rects — both have distance 0, so the first one wins
      // since the loop stops updating when distance is equal
      const result = findNearestOrdinalNode(rects, 140, 120)
      expect(result).not.toBeNull()
      // Both rects contain this point, first found wins (distance=0 for both)
      expect(result!.datum.id).toBe("big")
    })

    it("prefers the nearer point when two points overlap", () => {
      const points: PointSceneNode[] = [
        {
          type: "point", x: 100, y: 100, r: 10,
          style: { fill: "red" }, datum: { id: "far" }
        },
        {
          type: "point", x: 108, y: 100, r: 10,
          style: { fill: "blue" }, datum: { id: "near" }
        }
      ]

      // Point at (110, 100): distance to "far" = 10, distance to "near" = 2
      const result = findNearestOrdinalNode(points, 110, 100)
      expect(result).not.toBeNull()
      expect(result!.datum.id).toBe("near")
    })

    it("respects maxDistance: skips far elements", () => {
      const point: PointSceneNode = {
        type: "point", x: 100, y: 100, r: 5,
        style: { fill: "red" }, datum: { id: "only" }
      }
      // Distance is ~14, maxDistance is 10
      const result = findNearestOrdinalNode([point], 110, 110, 10)
      expect(result).toBeNull()
    })
  })

  // ── Boxplot hit testing ────────────────────────────────────────────

  describe("boxplot hit testing", () => {
    const boxplot: BoxplotSceneNode = {
      type: "boxplot",
      x: 150,
      y: 0,
      projection: "vertical",
      columnWidth: 40,
      minPos: 20,
      q1Pos: 60,
      medianPos: 100,
      q3Pos: 140,
      maxPos: 180,
      stats: { min: 1, q1: 3, median: 5, q3: 7, max: 9 },
      style: { fill: "#76b7b2" },
      datum: [{ v: 1 }, { v: 5 }, { v: 9 }],
      category: "group1"
    }

    it("hits inside a vertical boxplot", () => {
      // Within x range (130-170) and y range (20-180)
      const result = findNearestOrdinalNode([boxplot], 150, 100)
      expect(result).not.toBeNull()
      expect(result!.category).toBe("group1")
      expect(result!.stats).toBeDefined()
    })

    it("misses outside a boxplot", () => {
      const result = findNearestOrdinalNode([boxplot], 50, 100)
      expect(result).toBeNull()
    })
  })

  // ── Violin hit testing ────────────────────────────────────────────

  describe("violin hit testing", () => {
    const violin: ViolinSceneNode = {
      type: "violin",
      pathString: "M0,0 L10,0 L10,50 L0,50 Z",
      translateX: 100,
      translateY: 100,
      bounds: { x: 100, y: 100, width: 40, height: 200 },
      style: { fill: "#b07aa1" },
      datum: [{ v: 1 }, { v: 5 }],
      category: "v1"
    }

    it("hits inside a violin bounding box", () => {
      const result = findNearestOrdinalNode([violin], 120, 200)
      expect(result).not.toBeNull()
      expect(result!.category).toBe("v1")
    })

    it("misses outside a violin bounding box", () => {
      const result = findNearestOrdinalNode([violin], 50, 50)
      expect(result).toBeNull()
    })

    it("returns null when violin has no bounds", () => {
      const noBounds: ViolinSceneNode = {
        ...violin,
        bounds: undefined
      }
      const result = findNearestOrdinalNode([noBounds], 120, 200)
      expect(result).toBeNull()
    })
  })
})
