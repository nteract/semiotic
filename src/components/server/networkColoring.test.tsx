// Polyfill TextEncoder/TextDecoder for react-dom/server in jsdom
import { TextEncoder, TextDecoder } from "util"
Object.assign(global, { TextEncoder, TextDecoder })

import { renderChart } from "./renderToStaticSVG"
import { generateFrameSequence } from "./animatedGif"

describe("Network node coloring via nodeStyle", () => {
  const groupColors = { broker: "#c8a8f0", teamA: "#a8c8f0", teamB: "#f0a8a8" }

  const nodes = [
    { id: "Lead", group: "broker" },
    { id: "Alice", group: "teamA" },
    { id: "Bob", group: "teamA" },
    { id: "Dave", group: "teamB" },
    { id: "Eve", group: "teamB" },
  ]

  const edges = [
    { source: "Lead", target: "Alice" },
    { source: "Lead", target: "Dave" },
    { source: "Alice", target: "Bob" },
    { source: "Dave", target: "Eve" },
  ]

  it("should color nodes by group when nodeStyle is provided", () => {
    const svg = renderChart("ForceDirectedGraph", {
      nodes,
      edges,
      width: 400,
      height: 300,
      nodeStyle: (d) => ({ fill: groupColors[d.data?.group] || "#888" }),
    })

    // Check that our specific colors appear in the SVG
    expect(svg).toContain("#c8a8f0") // broker purple
    expect(svg).toContain("#a8c8f0") // teamA blue
    expect(svg).toContain("#f0a8a8") // teamB red

    // Count occurrences - should be 1 purple, 2 blue, 2 red
    const purpleCount = (svg.match(/#c8a8f0/g) || []).length
    const blueCount = (svg.match(/#a8c8f0/g) || []).length
    const redCount = (svg.match(/#f0a8a8/g) || []).length

    expect(purpleCount).toBe(1)  // 1 broker node
    expect(blueCount).toBe(2)    // 2 teamA nodes
    expect(redCount).toBe(2)     // 2 teamB nodes
  })

  it("should respect pre-set x/y positions with iterations=0", () => {
    // Positions in inner-chart coordinates (margins are 20px default for network)
    const pinnedNodes = [
      { id: "A", group: "teamA", x: 50, y: 80 },
      { id: "B", group: "teamA", x: 100, y: 80 },
      { id: "C", group: "teamB", x: 300, y: 80 },
    ]
    const svg = renderChart("ForceDirectedGraph", {
      nodes: pinnedNodes,
      edges: [{ source: "A", target: "B" }, { source: "B", target: "C" }],
      width: 400, height: 200,
      iterations: 0,
      nodeStyle: (d) => ({ fill: groupColors[d.data?.group] || "#888" }),
    })

    const circles = [...svg.matchAll(/cx="([\d.]+)"/g)].map(m => parseFloat(m[1]))
    expect(circles.length).toBe(3)

    // Verify barbell ordering: A < B << C
    expect(circles[0]).toBeLessThan(circles[1])
    expect(circles[1]).toBeLessThan(circles[2])
    // B should be much closer to A than to C
    expect(circles[1] - circles[0]).toBeLessThan(circles[2] - circles[1])
  })

  it("should produce consistent positions across frame sequence snapshots", () => {
    const pinnedNodes = [
      { id: "A", group: "teamA", x: 80, y: 80 },
      { id: "B", group: "teamB", x: 250, y: 80 },
      { id: "Bridge", group: "broker", x: 165, y: 80 },
    ]
    const snapshots = [
      { nodes: pinnedNodes, edges: [{ source: "Bridge", target: "A" }, { source: "Bridge", target: "B" }] },
      { nodes: pinnedNodes, edges: [{ source: "Bridge", target: "A" }] }, // B link removed
      { nodes: pinnedNodes.filter(n => n.id !== "Bridge"), edges: [] },   // Bridge removed
    ]

    const frames = generateFrameSequence("ForceDirectedGraph", snapshots, {
      width: 400, height: 200, iterations: 0,
      nodeStyle: (d) => ({ fill: groupColors[d.data?.group] || "#888" }),
    })

    // Frame 0 and frame 1 should have A at the same position
    const getCxValues = (svg) => [...svg.matchAll(/cx="([\d.]+)"/g)].map(m => parseFloat(m[1]))
    const frame0cx = getCxValues(frames[0])
    const frame1cx = getCxValues(frames[1])

    // A is first node in both frames — positions should be very close
    // (small drift possible from force simulation clamping)
    expect(Math.abs(frame0cx[0] - frame1cx[0])).toBeLessThan(5)

    // Frame 2: Bridge gone, only A and B remain at their pinned positions
    const frame2cx = getCxValues(frames[2])
    expect(frame2cx.length).toBe(2) // only A and B
  })

  it("should color sankey nodes via nodeStyle", () => {
    const stageColors = {
      "Source": "#7b9ec4",
      "Middle": "#5ba8a0",
      "Sink": "#6aaf6a",
    }
    const svg = renderChart("SankeyDiagram", {
      edges: [
        { source: "Source", target: "Middle", value: 100 },
        { source: "Middle", target: "Sink", value: 100 },
      ],
      width: 400, height: 200,
      showLabels: true,
      nodeStyle: (d) => ({ fill: stageColors[d.data?.id] || "#888" }),
    })

    expect(svg).toContain("#7b9ec4") // source blue
    expect(svg).toContain("#5ba8a0") // middle teal
    expect(svg).toContain("#6aaf6a") // sink green
  })

  it("should use theme text color for force graph labels in dark mode", () => {
    const svg = renderChart("ForceDirectedGraph", {
      nodes: [{ id: "A" }, { id: "B" }],
      edges: [{ source: "A", target: "B" }],
      width: 300, height: 150,
      theme: "dark",
      showLabels: true,
    })

    // Labels should use dark theme text color, not #333
    expect(svg).toContain("#e0e0e0")
    expect(svg).not.toContain('fill="#333"')
  })

  it("should use theme text color for sankey labels in dark mode", () => {
    const svg = renderChart("SankeyDiagram", {
      edges: [{ source: "A", target: "B", value: 100 }],
      width: 300, height: 150,
      theme: "dark",
      showLabels: true,
    })

    // Dark theme text color is #e0e0e0, should NOT contain hardcoded #333
    expect(svg).toContain("#e0e0e0")
  })

  it("should maintain group colors across generateFrameSequence snapshots", () => {
    const allEdges = [
      { source: "Lead", target: "Alice" },
      { source: "Lead", target: "Dave" },
      { source: "Alice", target: "Bob" },
      { source: "Dave", target: "Eve" },
    ]

    const snapshots = [
      { nodes, edges: allEdges },
      { nodes, edges: allEdges.filter(e => !(e.source === "Lead" && e.target === "Dave")) },
      { nodes: nodes.filter(n => n.id !== "Lead"), edges: allEdges.filter(e => e.source !== "Lead" && e.target !== "Lead") },
    ]

    const frames = generateFrameSequence("ForceDirectedGraph", snapshots, {
      width: 400, height: 300,
      nodeStyle: (d) => ({ fill: groupColors[d.data?.group] || "#888" }),
    })

    expect(frames).toHaveLength(3)

    // Frame 0: all 5 nodes, all 3 colors present
    expect(frames[0]).toContain("#c8a8f0")
    expect(frames[0]).toContain("#a8c8f0")
    expect(frames[0]).toContain("#f0a8a8")

    // Frame 2: Lead removed, no purple
    expect(frames[2]).not.toContain("#c8a8f0")
    expect(frames[2]).toContain("#a8c8f0")
    expect(frames[2]).toContain("#f0a8a8")
  })
})
