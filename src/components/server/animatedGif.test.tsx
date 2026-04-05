// Polyfill TextEncoder/TextDecoder for react-dom/server in jsdom
import { TextEncoder, TextDecoder } from "util"
Object.assign(global, { TextEncoder, TextDecoder })

import { generateFrameSVGs, generateFrameSequence, renderToAnimatedGif } from "./animatedGif"

// ── Test data ────────────────────────────────────────────────────────

const lineData = Array.from({ length: 40 }, (_, i) => ({
  x: i,
  y: 50 + Math.sin(i * 0.3) * 30,
}))

const barData = Array.from({ length: 20 }, (_, i) => ({
  category: String.fromCharCode(65 + (i % 5)),
  value: 10 + (i % 5) * 8 + Math.floor(i / 5) * 3,
}))

const scatterData = Array.from({ length: 30 }, (_, i) => ({
  x: i * 3,
  y: 20 + Math.random() * 60,
}))

// ═══════════════════════════════════════════════════════════════════════
// generateFrameSVGs — Phase 1: Sliding window
// ═══════════════════════════════════════════════════════════════════════

describe("generateFrameSVGs", () => {
  describe("Phase 1: Sliding window", () => {
    it("generates multiple frames from line data", () => {
      const frames = generateFrameSVGs("line", lineData, {
        xAccessor: "x", yAccessor: "y", width: 400, height: 300,
      }, { transitionFrames: 0 })

      expect(frames.length).toBeGreaterThan(1)
      expect(frames.length).toBeLessThanOrEqual(lineData.length)
      frames.forEach(f => {
        expect(f).toContain("<svg")
        expect(f).toContain("</svg>")
      })
    })

    it("generates frames from scatter data", () => {
      const frames = generateFrameSVGs("scatter", scatterData, {
        xAccessor: "x", yAccessor: "y", width: 400, height: 300,
      }, { transitionFrames: 0 })

      expect(frames.length).toBeGreaterThan(1)
      // Later frames should have more circles
      const firstCircles = (frames[0].match(/<circle /g) || []).length
      const lastCircles = (frames[frames.length - 1].match(/<circle /g) || []).length
      expect(lastCircles).toBeGreaterThanOrEqual(firstCircles)
    })

    it("generates frames from bar data (ordinal)", () => {
      const frames = generateFrameSVGs("bar", barData, {
        oAccessor: "category", rAccessor: "value", width: 400, height: 300,
      }, { transitionFrames: 0 })

      expect(frames.length).toBeGreaterThan(1)
      frames.forEach(f => expect(f).toContain("<rect"))
    })

    it("returns empty array for empty data", () => {
      const frames = generateFrameSVGs("line", [], {
        xAccessor: "x", yAccessor: "y",
      })
      expect(frames).toEqual([])
    })

    it("respects custom stepSize", () => {
      const frames = generateFrameSVGs("line", lineData, {
        xAccessor: "x", yAccessor: "y", width: 400, height: 300,
      }, { stepSize: 10, transitionFrames: 0 })

      // 40 data points / 10 step = 4 data frames
      expect(frames.length).toBe(4)
    })

    it("respects custom frameCount", () => {
      const frames = generateFrameSVGs("line", lineData, {
        xAccessor: "x", yAccessor: "y", width: 400, height: 300,
      }, { frameCount: 5, transitionFrames: 0 })

      // Should produce approximately 5 frames
      expect(frames.length).toBeGreaterThanOrEqual(4)
      expect(frames.length).toBeLessThanOrEqual(6)
    })

    it("progressive frames show more data over time", () => {
      const frames = generateFrameSVGs("line", lineData, {
        xAccessor: "x", yAccessor: "y", width: 400, height: 300,
      }, { stepSize: 10, transitionFrames: 0 })

      // First frame SVG should be shorter (less data)
      expect(frames[0].length).toBeLessThan(frames[frames.length - 1].length)
    })

    it("applies windowSize to create sliding window effect", () => {
      const frames = generateFrameSVGs("line", lineData, {
        xAccessor: "x", yAccessor: "y", width: 400, height: 300,
      }, { windowSize: 10, stepSize: 5, transitionFrames: 0 })

      expect(frames.length).toBeGreaterThan(1)
    })
  })

  // ═════════════════════════════════════════════════════════════════════
  // Phase 2: Transition easing
  // ═════════════════════════════════════════════════════════════════════

  describe("Phase 2: Transition easing", () => {
    it("generates extra frames when transitionFrames > 0", () => {
      const noTransition = generateFrameSVGs("line", lineData, {
        xAccessor: "x", yAccessor: "y", width: 400, height: 300,
      }, { stepSize: 10, transitionFrames: 0 })

      const withTransition = generateFrameSVGs("line", lineData, {
        xAccessor: "x", yAccessor: "y", width: 400, height: 300,
      }, { stepSize: 10, transitionFrames: 4 })

      // With transitions should have more frames (base + interpolated)
      expect(withTransition.length).toBeGreaterThanOrEqual(noTransition.length)
    })

    it("transition frames are valid SVGs", () => {
      const frames = generateFrameSVGs("scatter", scatterData, {
        xAccessor: "x", yAccessor: "y", width: 400, height: 300,
      }, { stepSize: 8, transitionFrames: 3 })

      frames.forEach(f => {
        expect(f).toContain("<svg")
        expect(f).toContain("</svg>")
      })
    })
  })

  // ═════════════════════════════════════════════════════════════════════
  // Phase 3: Decay
  // ═════════════════════════════════════════════════════════════════════

  describe("Phase 3: Decay effects", () => {
    it("accepts decay config without errors", () => {
      const frames = generateFrameSVGs("scatter", scatterData, {
        xAccessor: "x", yAccessor: "y", width: 400, height: 300,
      }, {
        stepSize: 10,
        transitionFrames: 0,
        decay: { type: "linear", minOpacity: 0.1 },
      })

      expect(frames.length).toBeGreaterThan(0)
      frames.forEach(f => expect(f).toContain("<svg"))
    })

    it("accepts exponential decay", () => {
      const frames = generateFrameSVGs("line", lineData, {
        xAccessor: "x", yAccessor: "y", width: 400, height: 300,
      }, {
        stepSize: 10,
        transitionFrames: 0,
        decay: { type: "exponential", halfLife: 10 },
      })

      expect(frames.length).toBeGreaterThan(0)
    })

    it("accepts step decay", () => {
      const frames = generateFrameSVGs("line", lineData, {
        xAccessor: "x", yAccessor: "y", width: 400, height: 300,
      }, {
        stepSize: 10,
        transitionFrames: 0,
        decay: { type: "step" },
      })

      expect(frames.length).toBeGreaterThan(0)
    })
  })

  // ═════════════════════════════════════════════════════════════════════
  // Annotations in frames
  // ═════════════════════════════════════════════════════════════════════

  describe("Annotations in animated frames", () => {
    it("renders y-threshold annotation in every frame", () => {
      const frames = generateFrameSVGs("line", lineData, {
        xAccessor: "x", yAccessor: "y", width: 400, height: 300,
        annotations: [{ type: "y-threshold", value: 40, label: "SLA", color: "#e45050" }],
      }, {
        stepSize: 10, transitionFrames: 0,
        yExtent: [0, 80],
      })

      expect(frames.length).toBeGreaterThan(0)
      // Every frame should contain the threshold line and label
      frames.forEach(f => {
        expect(f).toContain("#e45050")
        expect(f).toContain("SLA")
        expect(f).toContain("6,4") // dash array
      })
    })
  })

  // ═════════════════════════════════════════════════════════════════════
  // Theme integration
  // ═════════════════════════════════════════════════════════════════════

  describe("Theme integration", () => {
    it("applies dark theme to frames", () => {
      const frames = generateFrameSVGs("line", lineData, {
        xAccessor: "x", yAccessor: "y", width: 400, height: 300,
        theme: "dark",
      }, { stepSize: 20, transitionFrames: 0 })

      expect(frames.length).toBeGreaterThan(0)
    })

    it("applies title to frames", () => {
      const frames = generateFrameSVGs("line", lineData, {
        xAccessor: "x", yAccessor: "y", width: 400, height: 300,
        title: "Revenue Trend",
      }, { stepSize: 20, transitionFrames: 0 })

      frames.forEach(f => expect(f).toContain("Revenue Trend"))
    })

    it("applies background color", () => {
      const frames = generateFrameSVGs("line", lineData, {
        xAccessor: "x", yAccessor: "y", width: 400, height: 300,
        background: "#1a1a2e",
      }, { stepSize: 20, transitionFrames: 0 })

      frames.forEach(f => expect(f).toContain("#1a1a2e"))
    })
  })

  // ═════════════════════════════════════════════════════════════════════
  // Chart type coverage
  // ═════════════════════════════════════════════════════════════════════

  describe("Chart type coverage", () => {
    it("generates frames for area charts", () => {
      const frames = generateFrameSVGs("area", lineData, {
        xAccessor: "x", yAccessor: "y", width: 400, height: 300,
      }, { transitionFrames: 0, stepSize: 10 })
      expect(frames.length).toBeGreaterThan(0)
    })

    it("generates frames for pie charts (ordinal radial)", () => {
      const pieData = [
        { category: "A", value: 30 }, { category: "B", value: 50 },
        { category: "C", value: 20 },
      ]
      const frames = generateFrameSVGs("pie", pieData, {
        oAccessor: "category", rAccessor: "value",
        projection: "radial", width: 300, height: 300,
      }, { transitionFrames: 0 })
      expect(frames.length).toBeGreaterThan(0)
      frames.forEach(f => expect(f).toContain("<path"))
    })

    it("generates frames for swarm charts", () => {
      const frames = generateFrameSVGs("swarm", barData, {
        oAccessor: "category", rAccessor: "value", width: 400, height: 300,
      }, { transitionFrames: 0, stepSize: 5 })
      expect(frames.length).toBeGreaterThan(0)
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
// generateFrameSequence — snapshot-based animation
// ═══════════════════════════════════════════════════════════════════════

describe("generateFrameSequence", () => {
  it("generates frames from ForceDirectedGraph snapshots", () => {
    const snapshots = [
      { nodes: [{ id: "A" }, { id: "B" }, { id: "C" }], edges: [{ source: "A", target: "B" }, { source: "B", target: "C" }] },
      { nodes: [{ id: "A" }, { id: "B" }, { id: "C" }], edges: [{ source: "A", target: "B" }] },
      { nodes: [{ id: "A" }, { id: "B" }], edges: [{ source: "A", target: "B" }] },
    ]
    const frames = generateFrameSequence("ForceDirectedGraph", snapshots, {
      width: 300, height: 200,
    })
    expect(frames).toHaveLength(3)
    frames.forEach(f => {
      expect(f).toContain("<svg")
      expect(f).toContain("<circle")
    })
    // First frame has 3 nodes, last has 2
    const firstCircles = (frames[0].match(/<circle /g) || []).length
    const lastCircles = (frames[2].match(/<circle /g) || []).length
    expect(firstCircles).toBeGreaterThan(lastCircles)
  })

  it("generates frames from SankeyDiagram snapshots", () => {
    const snapshots = [
      { edges: [{ source: "A", target: "B", value: 50 }, { source: "B", target: "C", value: 50 }] },
      { edges: [{ source: "A", target: "D", value: 50 }, { source: "D", target: "C", value: 50 }] },
    ]
    const frames = generateFrameSequence("SankeyDiagram", snapshots, {
      width: 400, height: 200,
    })
    expect(frames).toHaveLength(2)
    frames.forEach(f => {
      expect(f).toContain("<svg")
      expect(f).toContain("<rect") // sankey nodes
    })
  })

  it("applies theme from baseProps", () => {
    const snapshots = [
      { nodes: [{ id: "A" }, { id: "B" }], edges: [{ source: "A", target: "B" }] },
    ]
    const frames = generateFrameSequence("ForceDirectedGraph", snapshots, {
      width: 300, height: 200, theme: "dark",
    })
    expect(frames).toHaveLength(1)
    expect(frames[0]).toContain("<svg")
  })

  it("handles empty snapshots array", () => {
    const frames = generateFrameSequence("ForceDirectedGraph", [], {})
    expect(frames).toEqual([])
  })

  it("handles render errors gracefully", () => {
    const frames = generateFrameSequence("ForceDirectedGraph", [
      { nodes: [], edges: [] },
    ], { width: 200, height: 150 })
    expect(frames).toHaveLength(1)
    expect(frames[0]).toContain("<svg")
  })
})

// ═══════════════════════════════════════════════════════════════════════
// renderToAnimatedGif — integration (requires sharp + gifenc)
// ═══════════════════════════════════════════════════════════════════════

describe("renderToAnimatedGif", () => {
  it("produces a GIF buffer from line data", async () => {
    const gif = await renderToAnimatedGif("line", lineData, {
      xAccessor: "x", yAccessor: "y", width: 200, height: 150,
    }, { stepSize: 10, transitionFrames: 0, fps: 6 })

    expect(gif).toBeInstanceOf(Buffer)
    expect(gif.length).toBeGreaterThan(100)
    // GIF magic bytes
    expect(gif[0]).toBe(0x47) // G
    expect(gif[1]).toBe(0x49) // I
    expect(gif[2]).toBe(0x46) // F
  })

  it("produces a GIF buffer from bar data", async () => {
    const gif = await renderToAnimatedGif("bar", barData, {
      oAccessor: "category", rAccessor: "value", width: 200, height: 150,
    }, { stepSize: 5, transitionFrames: 0, fps: 6 })

    expect(gif).toBeInstanceOf(Buffer)
    expect(gif[0]).toBe(0x47)
  })

  it("produces a GIF with transitions", async () => {
    const gif = await renderToAnimatedGif("scatter", scatterData.slice(0, 15), {
      xAccessor: "x", yAccessor: "y", width: 200, height: 150,
    }, { stepSize: 5, transitionFrames: 2, fps: 6 })

    expect(gif).toBeInstanceOf(Buffer)
    expect(gif.length).toBeGreaterThan(100)
  })

  it("produces a GIF with decay", async () => {
    const gif = await renderToAnimatedGif("scatter", scatterData.slice(0, 15), {
      xAccessor: "x", yAccessor: "y", width: 200, height: 150,
    }, {
      stepSize: 5, transitionFrames: 0, fps: 6,
      decay: { type: "linear", minOpacity: 0.2 },
    })

    expect(gif).toBeInstanceOf(Buffer)
    expect(gif[0]).toBe(0x47)
  })

  it("produces a GIF with theme and background", async () => {
    const gif = await renderToAnimatedGif("line", lineData.slice(0, 20), {
      xAccessor: "x", yAccessor: "y", width: 200, height: 150,
      theme: "dark", title: "Trend",
    }, { stepSize: 5, transitionFrames: 0, fps: 6, background: "#1a1a2e" })

    expect(gif).toBeInstanceOf(Buffer)
    expect(gif.length).toBeGreaterThan(100)
  })

  it("throws on empty data", async () => {
    await expect(
      renderToAnimatedGif("line", [], { xAccessor: "x", yAccessor: "y" })
    ).rejects.toThrow(/No frames/)
  })

  it("respects scale option for higher resolution", async () => {
    const gif1x = await renderToAnimatedGif("line", lineData.slice(0, 10), {
      xAccessor: "x", yAccessor: "y", width: 100, height: 75,
    }, { stepSize: 5, transitionFrames: 0, fps: 4 })

    const gif2x = await renderToAnimatedGif("line", lineData.slice(0, 10), {
      xAccessor: "x", yAccessor: "y", width: 100, height: 75,
    }, { stepSize: 5, transitionFrames: 0, fps: 4, scale: 2 })

    // 2x should produce a larger file
    expect(gif2x.length).toBeGreaterThan(gif1x.length)
  })
})
