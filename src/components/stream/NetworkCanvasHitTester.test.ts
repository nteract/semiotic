import { findNearestNetworkNode } from "./NetworkCanvasHitTester"
import type {
  NetworkCircleNode,
  NetworkRectNode,
  NetworkArcNode,
  NetworkLineEdge,
  NetworkBezierEdge
} from "./networkTypes"

describe("NetworkCanvasHitTester — findNearestNetworkNode", () => {
  // ── Circle hit testing (force layout nodes) ──────────────────────────

  describe("circle hit testing", () => {
    const circle: NetworkCircleNode = {
      type: "circle",
      cx: 200,
      cy: 150,
      r: 10,
      style: { fill: "#4e79a7" },
      datum: { id: "nodeA" }
    }

    it("hits inside a circle node", () => {
      const result = findNearestNetworkNode([circle], [], 205, 150)
      expect(result).not.toBeNull()
      expect(result!.type).toBe("node")
      expect(result!.datum.id).toBe("nodeA")
      expect(result!.x).toBe(200)
      expect(result!.y).toBe(150)
    })

    it("hits at the center with distance 0", () => {
      const result = findNearestNetworkNode([circle], [], 200, 150)
      expect(result).not.toBeNull()
      expect(result!.distance).toBe(0)
    })

    it("hits within tolerance (r + 5)", () => {
      // Point 14px away — within tolerance of max(10,5) + 5 = 15
      const result = findNearestNetworkNode([circle], [], 214, 150)
      expect(result).not.toBeNull()
    })

    it("misses outside the tolerance radius", () => {
      // Point 35px away — beyond default 30px hit radius
      const result = findNearestNetworkNode([circle], [], 235, 150)
      expect(result).toBeNull()
    })

    it("prefers the closer circle when nodes overlap", () => {
      const c1: NetworkCircleNode = {
        type: "circle", cx: 100, cy: 100, r: 20,
        style: { fill: "red" }, datum: { id: "far" }
      }
      const c2: NetworkCircleNode = {
        type: "circle", cx: 115, cy: 100, r: 20,
        style: { fill: "blue" }, datum: { id: "near" }
      }
      // Point at (120, 100): closer to c2
      const result = findNearestNetworkNode([c1, c2], [], 120, 100)
      expect(result).not.toBeNull()
      expect(result!.datum.id).toBe("near")
    })
  })

  // ── Rect hit testing (sankey/treemap nodes) ──────────────────────────

  describe("rect hit testing", () => {
    const rect: NetworkRectNode = {
      type: "rect",
      x: 50,
      y: 100,
      w: 20,
      h: 80,
      style: { fill: "#f28e2b" },
      datum: { id: "sankeyNode" }
    }

    it("hits inside a rect node", () => {
      const result = findNearestNetworkNode([rect], [], 60, 140)
      expect(result).not.toBeNull()
      expect(result!.type).toBe("node")
      expect(result!.datum.id).toBe("sankeyNode")
      expect(result!.distance).toBe(0)
    })

    it("returns center of rect as hit position", () => {
      const result = findNearestNetworkNode([rect], [], 55, 120)
      expect(result).not.toBeNull()
      expect(result!.x).toBe(60) // 50 + 20/2
      expect(result!.y).toBe(140) // 100 + 80/2
    })

    it("hits at the corner (edge)", () => {
      const result = findNearestNetworkNode([rect], [], 50, 100)
      expect(result).not.toBeNull()
    })

    it("misses outside the rect", () => {
      const result = findNearestNetworkNode([rect], [], 40, 140)
      expect(result).toBeNull()
    })

    it("prefers the smallest rect for nested treemap cells", () => {
      const big: NetworkRectNode = {
        type: "rect", x: 0, y: 0, w: 200, h: 200,
        style: { fill: "#aaa" }, datum: { id: "parent" }
      }
      const small: NetworkRectNode = {
        type: "rect", x: 50, y: 50, w: 40, h: 40,
        style: { fill: "#bbb" }, datum: { id: "child" }
      }
      // Point inside both: should prefer smallest area
      const result = findNearestNetworkNode([big, small], [], 60, 60)
      expect(result).not.toBeNull()
      expect(result!.datum.id).toBe("child")
    })
  })

  // ── Arc hit testing (chord diagram) ──────────────────────────────────

  describe("arc hit testing", () => {
    // Arc from 0 to PI/2, innerR=80, outerR=100, centered at (300, 300)
    const arc: NetworkArcNode = {
      type: "arc",
      cx: 300,
      cy: 300,
      innerR: 80,
      outerR: 100,
      startAngle: 0,
      endAngle: Math.PI / 2,
      style: { fill: "#76b7b2" },
      datum: { id: "chordGroup" }
    }

    it("hits inside an arc (correct angle and radius)", () => {
      // Point at angle PI/4, radius 90 (between 80 and 100)
      const r = 90
      const angle = Math.PI / 4
      const px = 300 + r * Math.cos(angle)
      const py = 300 + r * Math.sin(angle)
      const result = findNearestNetworkNode([arc], [], px, py)
      expect(result).not.toBeNull()
      expect(result!.type).toBe("node")
      expect(result!.datum.id).toBe("chordGroup")
    })

    it("misses inside the inner radius", () => {
      // Point at angle PI/4, radius 50 (inside inner)
      const r = 50
      const angle = Math.PI / 4
      const px = 300 + r * Math.cos(angle)
      const py = 300 + r * Math.sin(angle)
      const result = findNearestNetworkNode([arc], [], px, py)
      expect(result).toBeNull()
    })

    it("misses outside the outer radius", () => {
      const r = 120
      const angle = Math.PI / 4
      const px = 300 + r * Math.cos(angle)
      const py = 300 + r * Math.sin(angle)
      const result = findNearestNetworkNode([arc], [], px, py)
      expect(result).toBeNull()
    })

    it("misses outside the angle range", () => {
      // Point at angle PI (outside 0 to PI/2), radius 90
      const r = 90
      const angle = Math.PI
      const px = 300 + r * Math.cos(angle)
      const py = 300 + r * Math.sin(angle)
      const result = findNearestNetworkNode([arc], [], px, py)
      expect(result).toBeNull()
    })

    it("returns midpoint of arc as hit position", () => {
      const r = 90
      const angle = Math.PI / 4
      const px = 300 + r * Math.cos(angle)
      const py = 300 + r * Math.sin(angle)
      const result = findNearestNetworkNode([arc], [], px, py)
      expect(result).not.toBeNull()
      // Should return midAngle, midRadius position
      const midAngle = (arc.startAngle + arc.endAngle) / 2
      const midR = (arc.innerR + arc.outerR) / 2
      expect(result!.x).toBeCloseTo(300 + midR * Math.cos(midAngle), 0)
      expect(result!.y).toBeCloseTo(300 + midR * Math.sin(midAngle), 0)
    })
  })

  // ── Edge hit testing ─────────────────────────────────────────────────

  describe("edge hit testing — lines", () => {
    const lineEdge: NetworkLineEdge = {
      type: "line",
      x1: 100,
      y1: 100,
      x2: 300,
      y2: 100,
      style: { stroke: "#999" },
      datum: { source: "A", target: "B" }
    }

    it("hits a line edge at its midpoint", () => {
      // Directly on the line
      const result = findNearestNetworkNode([], [lineEdge], 200, 100)
      expect(result).not.toBeNull()
      expect(result!.type).toBe("edge")
      expect(result!.distance).toBe(0)
    })

    it("hits a line edge within tolerance (5px)", () => {
      // 3px above the line
      const result = findNearestNetworkNode([], [lineEdge], 200, 97)
      expect(result).not.toBeNull()
      expect(result!.type).toBe("edge")
      expect(result!.distance).toBeCloseTo(3, 0)
    })

    it("misses a line edge beyond tolerance", () => {
      const result = findNearestNetworkNode([], [lineEdge], 200, 90)
      expect(result).toBeNull()
    })

    it("hits near the start of a line edge", () => {
      const result = findNearestNetworkNode([], [lineEdge], 102, 100)
      expect(result).not.toBeNull()
    })

    it("hits near the end of a line edge", () => {
      const result = findNearestNetworkNode([], [lineEdge], 298, 100)
      expect(result).not.toBeNull()
    })

    it("misses a line edge past its endpoints", () => {
      // Beyond the end of the segment
      const result = findNearestNetworkNode([], [lineEdge], 310, 100)
      expect(result).toBeNull()
    })

    it("handles diagonal line edges", () => {
      const diagonal: NetworkLineEdge = {
        type: "line",
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 100,
        style: { stroke: "#999" },
        datum: { source: "C", target: "D" }
      }
      // Point near the midpoint of the diagonal
      const result = findNearestNetworkNode([], [diagonal], 50, 50)
      expect(result).not.toBeNull()
      expect(result!.distance).toBeCloseTo(0, 0)
    })
  })

  describe("edge hit testing — bezier (ribbon/path)", () => {
    // Note: bezier and ribbon hit testing uses Path2D + canvas isPointInPath,
    // which depends on jsdom/canvas support. These tests verify the function
    // handles missing Path2D gracefully.

    // ── ProcessSankey body-hover regression ──────────────────────────────
    //
    // jsdom has no real canvas, and the "stub isPointInPath to return true"
    // approach only proves the wrapper code returns the right shape — it
    // says nothing about whether real geometry would hit. These tests swap
    // in a Path2D + ctx fake that DOES real ray-casting against the
    // emitted SVG path string, so the test exercises the same control
    // flow as a production browser. Used to repro the "tooltip only on
    // border, never on body" symptom in ProcessSankey bands/ribbons.
    function installGeometryFakes() {
      type Cmd = { kind: "M" | "L"; x: number; y: number }
      function parsePolygon(d: string): Cmd[] {
        const cmds: Cmd[] = []
        // Match `M x,y` or `L x,y` (the only commands buildBandPath emits).
        // Whitespace or comma separators. Z is ignored — ray-casting
        // treats the polygon as closed regardless.
        const re = /([ML])\s*(-?\d+(?:\.\d+)?)[\s,]+(-?\d+(?:\.\d+)?)/g
        let m: RegExpExecArray | null
        while ((m = re.exec(d)) !== null) {
          cmds.push({ kind: m[1] as "M" | "L", x: parseFloat(m[2]), y: parseFloat(m[3]) })
        }
        return cmds
      }
      function pointInPolygon(pts: Cmd[], x: number, y: number): boolean {
        // Standard even-odd ray cast.
        let inside = false
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const xi = pts[i].x, yi = pts[i].y
          const xj = pts[j].x, yj = pts[j].y
          const intersect = ((yi > y) !== (yj > y)) &&
            (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi)
          if (intersect) inside = !inside
        }
        return inside
      }
      function pointToSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
        const dx = bx - ax, dy = by - ay
        const l2 = dx * dx + dy * dy
        if (l2 === 0) return Math.hypot(px - ax, py - ay)
        let t = ((px - ax) * dx + (py - ay) * dy) / l2
        t = Math.max(0, Math.min(1, t))
        return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
      }
      function pointNearStroke(pts: Cmd[], x: number, y: number, lineWidth: number): boolean {
        const half = lineWidth / 2
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          if (pointToSegmentDist(x, y, pts[j].x, pts[j].y, pts[i].x, pts[i].y) <= half) return true
        }
        return false
      }
      class FakePath2D {
        _pts: Cmd[]
        constructor(d: string) { this._pts = parsePolygon(d) }
      }
      const g = globalThis as unknown as { Path2D?: typeof Path2D }
      const origPath2D = g.Path2D
      const origGetContext = HTMLCanvasElement.prototype.getContext
      g.Path2D = FakePath2D as unknown as typeof Path2D
      const stubCtx = {
        lineWidth: 1,
        isPointInPath(path: { _pts: Cmd[] }, x: number, y: number) { return pointInPolygon(path._pts, x, y) },
        isPointInStroke(path: { _pts: Cmd[] }, x: number, y: number) { return pointNearStroke(path._pts, x, y, this.lineWidth) },
      } as unknown as CanvasRenderingContext2D
      HTMLCanvasElement.prototype.getContext = function () { return stubCtx } as HTMLCanvasElement["getContext"]
      return () => {
        g.Path2D = origPath2D
        HTMLCanvasElement.prototype.getContext = origGetContext
      }
    }

    // A ProcessSankey-shaped band: closed polygon traced top→bottom→close.
    // Dimensions match what `buildBandPath` would emit for a 5-sample
    // band centered on y=100, spanning x∈[50,250], top/bot offsets ~20px.
    const PROCESS_SANKEY_BAND_PATH =
      "M50,80 L100,82 L150,75 L200,78 L250,80 " +
      "L250,120 L200,118 L150,125 L100,122 L50,120 Z"

    it("hits inside the body of a ProcessSankey band (regression)", async () => {
      const restore = installGeometryFakes()
      try {
        vi.resetModules()
        const { findNearestNetworkNode: hitTest } = await import("./NetworkCanvasHitTester")
        const band: NetworkBezierEdge = {
          type: "bezier",
          pathD: PROCESS_SANKEY_BAND_PATH,
          style: { fill: "#abc", fillOpacity: 0.86, stroke: "#abc", strokeWidth: 0.5 },
          datum: { __kind: "band", data: { id: "A" }, id: "A" } as unknown as Record<string, unknown>,
        }
        // (150, 100) is in the centre of the band, far from any edge — the
        // user's "body of the node" case. Must register as a body hit
        // (distance 0), not the stroke fallback (distance 4).
        const hit = hitTest([], [band], 150, 100)
        expect(hit).not.toBeNull()
        expect(hit!.type).toBe("edge")
        expect(hit!.distance).toBe(0)
        expect(hit!.x).toBe(150)
        expect(hit!.y).toBe(100)
      } finally {
        restore()
      }
    })

    it("hits the perimeter of a ProcessSankey band (border tolerance)", async () => {
      const restore = installGeometryFakes()
      try {
        vi.resetModules()
        const { findNearestNetworkNode: hitTest } = await import("./NetworkCanvasHitTester")
        const band: NetworkBezierEdge = {
          type: "bezier",
          pathD: PROCESS_SANKEY_BAND_PATH,
          style: { fill: "#abc", stroke: "#abc", strokeWidth: 0.5 },
          datum: { __kind: "band", data: { id: "A" }, id: "A" } as unknown as Record<string, unknown>,
        }
        // 3px above the top edge — outside the polygon, within stroke
        // tolerance (lineWidth 10 → 5px on each side).
        const hit = hitTest([], [band], 150, 72)
        expect(hit).not.toBeNull()
        expect(hit!.type).toBe("edge")
      } finally {
        restore()
      }
    })

    it("misses well outside the ProcessSankey band", async () => {
      const restore = installGeometryFakes()
      try {
        vi.resetModules()
        const { findNearestNetworkNode: hitTest } = await import("./NetworkCanvasHitTester")
        const band: NetworkBezierEdge = {
          type: "bezier",
          pathD: PROCESS_SANKEY_BAND_PATH,
          style: { fill: "#abc", stroke: "#abc", strokeWidth: 0.5 },
          datum: { __kind: "band", data: { id: "A" }, id: "A" } as unknown as Record<string, unknown>,
        }
        const hit = hitTest([], [band], 150, 200)
        expect(hit).toBeNull()
      } finally {
        restore()
      }
    })

    it("returns null for bezier edge without pathD", () => {
      const bezier: NetworkBezierEdge = {
        type: "bezier",
        pathD: "",
        style: { fill: "#ccc" },
        datum: { source: "X", target: "Y" }
      }
      const result = findNearestNetworkNode([], [bezier], 100, 100)
      expect(result).toBeNull()
    })

    // Regression: customNetworkLayout consumers (ProcessSankey) emit bezier
    // scene-edges whose datum lacks the d3-sankey-shape fields (source/target
    // as resolved node refs, y0/y1 numbers). The hit tester used to read
    // those fields to compute a ribbon-midpoint hit position, producing
    // `y: NaN` for any non-sankey datum. FlippingTooltip silently drops
    // non-finite positions, so tooltips never appeared on the band/ribbon
    // body — only on the stroke fallback band (which already returned px,py).
    // Lock in the contract that hit position is always the pointer position,
    // regardless of datum shape.
    it("returns finite (px, py) for bezier hits regardless of datum shape", async () => {
      // jsdom ships no Path2D and no real isPointInPath. Stub both with
      // a fake Path2D class that records its source and a stub context
      // whose isPointInPath returns true for our test path. Reset the
      // hit tester module's cached canvas/ctx by reimporting.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = globalThis as unknown as {
        Path2D?: typeof Path2D
        HTMLCanvasElement: typeof HTMLCanvasElement
      }
      const origPath2D = g.Path2D
      const origGetContext = HTMLCanvasElement.prototype.getContext
      g.Path2D = class FakePath2D {
        constructor(public d: string) {}
      } as unknown as typeof Path2D
      const stubCtx = {
        isPointInPath: () => true,
        isPointInStroke: () => false,
        lineWidth: 1,
      } as unknown as CanvasRenderingContext2D
      HTMLCanvasElement.prototype.getContext = function () {
        return stubCtx
      } as HTMLCanvasElement["getContext"]
      // Reimport with stubs in place so module-level `_hitCanvas`/`_hitCtx`
      // capture the stubbed factories.
      vi.resetModules()
      const { findNearestNetworkNode: hitTest } = await import("./NetworkCanvasHitTester")
      try {
        const processSankeyBezier: NetworkBezierEdge = {
          type: "bezier",
          pathD: "M0,0 L10,0 L10,10 L0,10 Z",
          style: { fill: "#ccc" },
          // ProcessSankey-style payload: no source/target node refs,
          // no y0/y1 numbers — just a marker, the user datum, and an id.
          datum: { __kind: "band", data: { id: "n1" }, id: "n1" } as unknown as Record<string, unknown>,
        }
        const result = hitTest([], [processSankeyBezier], 5, 5)
        expect(result).not.toBeNull()
        expect(result!.type).toBe("edge")
        expect(Number.isFinite(result!.x)).toBe(true)
        expect(Number.isFinite(result!.y)).toBe(true)
        expect(result!.x).toBe(5)
        expect(result!.y).toBe(5)
      } finally {
        g.Path2D = origPath2D
        HTMLCanvasElement.prototype.getContext = origGetContext
      }
    })
  })

  // ── Nodes take priority over edges ───────────────────────────────────

  describe("node vs edge priority", () => {
    it("prefers node hits over edge hits", () => {
      const circle: NetworkCircleNode = {
        type: "circle", cx: 200, cy: 100, r: 10,
        style: { fill: "red" }, datum: { id: "node1" }
      }
      const lineEdge: NetworkLineEdge = {
        type: "line", x1: 190, y1: 100, x2: 210, y2: 100,
        style: { stroke: "#999" }, datum: { source: "A", target: "B" }
      }
      // Both the circle and line overlap at (200, 100)
      const result = findNearestNetworkNode([circle], [lineEdge], 200, 100)
      expect(result).not.toBeNull()
      expect(result!.type).toBe("node")
    })
  })

})
