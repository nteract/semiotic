import { findNearestOrdinalNode } from "./OrdinalCanvasHitTester"
import { quadtree } from "d3-quadtree"
import type {
  WedgeSceneNode,
  BoxplotSceneNode,
  ViolinSceneNode,
  ConnectorSceneNode,
  TrapezoidSceneNode
} from "./ordinalTypes"
import type { PointSceneNode, RectSceneNode } from "./types"
import { buildOrdinalPointSpatialIndex } from "./ordinalSpatialIndex"

describe("OrdinalCanvasHitTester — findNearestOrdinalNode", () => {
  it("keeps large-point hit geometry identical with and without a quadtree", () => {
    const point: PointSceneNode = {
      type: "point", x: 90, y: 0, r: 80,
      style: { fill: "green" }, datum: { id: "big" }
    }
    const qt = quadtree<PointSceneNode>()
      .x((d) => d.x)
      .y((d) => d.y)
      .add(point)
    expect(findNearestOrdinalNode([point], 50, 0, 30)?.datum?.id).toBe("big")
    expect(findNearestOrdinalNode([point], 50, 0, 30, qt, 80)?.datum?.id).toBe("big")
  })
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
      expect(result!.datum!.category).toBe("A")
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
      expect(result!.datum!.id).toBe("p1")
      expect(result!.distance).toBeCloseTo(Math.sqrt(9 + 4), 1)
    })

    it("hits at the center with distance 0", () => {
      const result = findNearestOrdinalNode([point], 200, 100)
      expect(result).not.toBeNull()
      expect(result!.distance).toBe(0)
    })

    it("uses minimum hit target of 12 for small points (Fitts's law)", () => {
      const tinyPoint: PointSceneNode = {
        type: "point",
        x: 50,
        y: 50,
        r: 2, // smaller than min hit target of 12
        style: { fill: "blue" },
        datum: { id: "tiny" }
      }
      // 11 px away — within the minimum hit target of 12
      const result = findNearestOrdinalNode([tinyPoint], 61, 50)
      expect(result).not.toBeNull()
    })

    it("misses outside point radius and maxDistance", () => {
      const result = findNearestOrdinalNode([point], 300, 300, 10)
      expect(result).toBeNull()
    })

    it("skips interactive:false points in linear and indexed hit paths", () => {
      const decorative: PointSceneNode = {
        ...point,
        style: { fill: "red", cursor: "pointer" },
        interactive: false
      }
      const qt = quadtree<PointSceneNode>()
        .x((node) => node.x)
        .y((node) => node.y)
        .add(decorative)

      expect(findNearestOrdinalNode([decorative], 200, 100)).toBeNull()
      expect(
        findNearestOrdinalNode([decorative], 200, 100, 30, qt, 8)
      ).toBeNull()
    })

    it("excludes interactive:false points from the retained ordinal index", () => {
      const decorative = Array.from({ length: 501 }, (_, index): PointSceneNode => ({
        type: "point",
        x: index,
        y: 0,
        r: 100,
        style: {},
        datum: { index },
        interactive: false
      }))
      const active: PointSceneNode = {
        type: "point", x: 0, y: 0, r: 4, style: {}, datum: { id: "active" }
      }
      const index = buildOrdinalPointSpatialIndex([...decorative, active])

      expect(index.quadtree).toBeNull()
      expect(index.maxRadius).toBe(4)
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

    it("skips non-interactive null-datum wedges", () => {
      const result = findNearestOrdinalNode([{ ...wedge, datum: null }], 240, 240)
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
      expect(result!.datum!.id).toBe("big")
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
      expect(result!.datum!.id).toBe("near")
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
      stats: { min: 1, q1: 3, median: 5, q3: 7, max: 9, n: 5, mean: 5 },
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

  describe("connector hit testing", () => {
    const connector: ConnectorSceneNode = {
      type: "connector",
      x1: 20,
      y1: 40,
      x2: 100,
      y2: 80,
      style: { stroke: "#999", strokeWidth: 4 },
      datum: { id: "connector" },
      group: "series-a"
    }

    it("hits the nearest point on a sloped connector using hover tolerance", () => {
      const result = findNearestOrdinalNode([connector], 62, 56, 6)
      expect(result).not.toBeNull()
      expect(result!.datum!.id).toBe("connector")
      expect(result!.category).toBe("series-a")
      expect(result!.x).toBeCloseTo(60)
      expect(result!.y).toBeCloseTo(60)
      expect(result!.distance).toBeCloseTo(Math.sqrt(20))
    })

    it("honors visible stroke width and misses beyond the requested radius", () => {
      const wide = { ...connector, style: { stroke: "#999", strokeWidth: 20 } }
      expect(findNearestOrdinalNode([wide], 60, 69, 0)).not.toBeNull()
      expect(findNearestOrdinalNode([connector], 60, 70, 5)).toBeNull()
      expect(
        findNearestOrdinalNode([{ ...connector, style: { strokeWidth: 0 } }], 60, 60)
      ).toBeNull()
    })

    it("hits the painted interior of a filled connector group behind pieces", () => {
      const segments: ConnectorSceneNode[] = [
        {
          type: "connector", x1: 20, y1: 20, x2: 100, y2: 20,
          style: { fill: "#999", cursor: "pointer" }, datum: { id: "a" }, group: "radar"
        },
        {
          type: "connector", x1: 100, y1: 20, x2: 60, y2: 90,
          style: { fill: "#999", cursor: "pointer" }, datum: { id: "b" }, group: "radar"
        }
      ]
      expect(findNearestOrdinalNode(segments, 60, 45, 0)?.datum?.id).toBe("a")

      const piece: RectSceneNode = {
        type: "rect", x: 50, y: 35, w: 20, h: 20,
        style: { fill: "red" }, datum: { id: "piece" }
      }
      expect(findNearestOrdinalNode([...segments, piece], 60, 45, 0)?.datum?.id)
        .toBe("piece")
      const pieceOnStroke = { ...piece, x: 50, y: 10, h: 20 }
      expect(findNearestOrdinalNode([...segments, pieceOnStroke], 60, 10, 0)?.datum?.id)
        .toBe("piece")
    })
  })

  describe("trapezoid hit testing", () => {
    const trapezoid: TrapezoidSceneNode = {
      type: "trapezoid",
      points: [[20, 20], [100, 20], [80, 80], [40, 80]],
      style: { fill: "#999" },
      datum: { id: "trapezoid" },
      category: "stage-two"
    }

    it("uses polygon geometry rather than the trapezoid bounding box", () => {
      const result = findNearestOrdinalNode([trapezoid], 60, 50)
      expect(result).not.toBeNull()
      expect(result!.datum!.id).toBe("trapezoid")
      expect(result!.category).toBe("stage-two")
      expect(result!.x).toBe(60)
      expect(result!.y).toBe(50)
      expect(findNearestOrdinalNode([trapezoid], 25, 75)).toBeNull()
    })

    it("includes the painted stroke outside the filled polygon", () => {
      const stroked = {
        ...trapezoid,
        style: { fill: "#999", stroke: "#000", strokeWidth: 8 }
      }
      expect(findNearestOrdinalNode([stroked], 60, 16)).not.toBeNull()
      expect(findNearestOrdinalNode([trapezoid], 60, 16)).toBeNull()
    })
  })
})
