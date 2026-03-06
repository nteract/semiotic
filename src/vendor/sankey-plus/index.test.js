import { sankeyCircular, sankeyJustify } from "./index.js"

/**
 * Tests for sankey-plus layout engine.
 * Focused on the circular link extent problem: when circular links form,
 * adjustGraphExtents() should NOT compress the main graph so aggressively
 * that nodes become an "ugly compressed burger."
 */

function makeGraph(nodes, links) {
  return {
    nodes: nodes.map((id, i) => ({ id, index: i })),
    links: links.map(([source, target, value]) => ({ source, target, value }))
  }
}

function runLayout(nodes, links, size = [600, 400]) {
  const graph = makeGraph(nodes, links)
  const sankey = sankeyCircular()
    .extent([[0, 0], [size[0], size[1]]])
    .nodeId(d => d.id)
    .nodeAlign(sankeyJustify)
    .nodeWidth(15)
    .nodePadding(10)
    .iterations(32)

  sankey.nodes(graph.nodes)
  sankey.links(graph.links)
  return sankey()
}

describe("sankey-plus layout", () => {

  test("basic acyclic layout produces valid node positions", () => {
    const result = runLayout(
      ["A", "B", "C"],
      [["A", "B", 10], ["B", "C", 10]]
    )

    expect(result.nodes.length).toBe(3)
    result.nodes.forEach(node => {
      expect(node.x0).toBeDefined()
      expect(node.x1).toBeGreaterThan(node.x0)
      expect(node.y0).toBeDefined()
      expect(node.y1).toBeGreaterThan(node.y0)
    })
  })

  test("circular links do not compress main graph below 50% of available space", () => {
    // This reproduces the bug: A→B→C→A cycle plus some extra nodes.
    // The cycle should NOT cause the non-circular nodes to be squeezed
    // into a tiny area.
    const result = runLayout(
      ["A", "B", "C", "D", "E"],
      [
        ["A", "B", 20],
        ["B", "C", 15],
        ["C", "A", 10],  // circular!
        ["A", "D", 10],
        ["D", "E", 10],
      ],
      [600, 400]
    )

    // The usable node area should be at least 50% of the original extent
    const nodeMinY = Math.min(...result.nodes.map(n => n.y0))
    const nodeMaxY = Math.max(...result.nodes.map(n => n.y1))
    const nodeYSpan = nodeMaxY - nodeMinY

    const nodeMinX = Math.min(...result.nodes.map(n => n.x0))
    const nodeMaxX = Math.max(...result.nodes.map(n => n.x1))
    const nodeXSpan = nodeMaxX - nodeMinX

    // Nodes should use at least 40% of the vertical space (400px → 160px min)
    expect(nodeYSpan).toBeGreaterThan(400 * 0.4)
    // Nodes should use at least 40% of the horizontal space (600px → 240px min)
    expect(nodeXSpan).toBeGreaterThan(600 * 0.4)
  })

  test("large cycle with high-value links does not overwhelm layout", () => {
    // A high-value cycle link creates wide arcs that push extent adjustment.
    // The cycle arc should be constrained, not given unlimited space.
    const result = runLayout(
      ["S1", "S2", "S3", "S4"],
      [
        ["S1", "S2", 50],
        ["S2", "S3", 40],
        ["S3", "S4", 30],
        ["S4", "S1", 100],  // big cycle link
      ],
      [800, 400]
    )

    const nodeMinY = Math.min(...result.nodes.map(n => n.y0))
    const nodeMaxY = Math.max(...result.nodes.map(n => n.y1))
    const nodeYSpan = nodeMaxY - nodeMinY

    // Even with a 100-value cycle link, nodes shouldn't be compressed to < 30% height
    expect(nodeYSpan).toBeGreaterThan(400 * 0.3)
  })

  test("nodes stay within original bounds after circular layout", () => {
    // The bug: adjustGraphExtents + second layout pass pushes nodes off-screen
    const result = runLayout(
      ["A", "B", "C", "D"],
      [
        ["A", "B", 30],
        ["B", "C", 25],
        ["C", "D", 20],
        ["D", "A", 15],  // cycle
      ],
      [600, 400]
    )

    result.nodes.forEach(node => {
      // Nodes must not be pushed above y=0 or below y=400
      expect(node.y0).toBeGreaterThanOrEqual(-10)
      expect(node.y1).toBeLessThanOrEqual(410)
      // Nodes must not be pushed left of x=0 or right of x=600
      expect(node.x0).toBeGreaterThanOrEqual(-10)
      expect(node.x1).toBeLessThanOrEqual(610)
    })
  })

  test("circular arc extent does not exceed 40% of chart height", () => {
    // Circular arcs should be compact — they convey connection, not magnitude.
    // A 100-value circular link should NOT produce a 200px tall arc.
    const result = runLayout(
      ["S1", "S2", "S3"],
      [
        ["S1", "S2", 50],
        ["S2", "S3", 40],
        ["S3", "S1", 100],  // big cycle
      ],
      [600, 400]
    )

    const circularLinks = result.links.filter(l => l.circular)
    expect(circularLinks.length).toBeGreaterThan(0)

    circularLinks.forEach(link => {
      if (link.circularPathData) {
        const arcExtent = Math.abs(link.circularPathData.verticalFullExtent)
        // The arc should not extend more than 40% of chart height beyond the graph
        expect(arcExtent).toBeLessThan(400 * 1.4)
      }
    })
  })

  test("multiple circular links produce compact arcs", () => {
    // Two cycles should not each claim huge space
    const result = runLayout(
      ["A", "B", "C", "D", "E"],
      [
        ["A", "B", 20],
        ["B", "C", 15],
        ["C", "A", 10],  // cycle 1
        ["C", "D", 15],
        ["D", "E", 10],
        ["E", "C", 8],   // cycle 2
      ],
      [600, 400]
    )

    const nodeMinY = Math.min(...result.nodes.map(n => n.y0))
    const nodeMaxY = Math.max(...result.nodes.map(n => n.y1))

    // Nodes should still use at least 40% of vertical space
    expect(nodeMaxY - nodeMinY).toBeGreaterThan(400 * 0.4)

    // No node should be off-screen
    result.nodes.forEach(node => {
      expect(node.y0).toBeGreaterThanOrEqual(-20)
      expect(node.y1).toBeLessThanOrEqual(420)
    })
  })

  test("high accumulated values from streaming still produce usable layout", () => {
    // Simulates what happens after 60+ seconds of streaming:
    // values accumulate to 500+ while the chart is only 400px tall.
    // The cycle link width becomes enormous, making arcs huge.
    const result = runLayout(
      ["API", "Auth", "Users", "Orders", "Payments", "DB"],
      [
        ["API", "Auth", 450],
        ["API", "Users", 320],
        ["API", "Orders", 680],
        ["Auth", "DB", 400],
        ["Users", "DB", 280],
        ["Orders", "Payments", 600],
        ["Orders", "DB", 500],
        ["Payments", "DB", 250],
        ["DB", "API", 180],  // cycle with accumulated value
      ],
      [750, 400]
    )

    const nodeMinY = Math.min(...result.nodes.map(n => n.y0))
    const nodeMaxY = Math.max(...result.nodes.map(n => n.y1))

    // Nodes should use meaningful vertical space
    expect(nodeMaxY - nodeMinY).toBeGreaterThan(400 * 0.3)

    // No node should be wildly off-screen
    result.nodes.forEach(node => {
      expect(node.y0).toBeGreaterThanOrEqual(-50)
      expect(node.y1).toBeLessThanOrEqual(450)
    })

    // Circular link arc should not extend more than 200px beyond chart bounds
    const circularLinks = result.links.filter(l => l.circular)
    circularLinks.forEach(link => {
      if (link.circularPathData) {
        if (link.circularLinkType === "bottom") {
          expect(link.circularPathData.verticalFullExtent).toBeLessThan(600)
        } else {
          expect(link.circularPathData.verticalFullExtent).toBeGreaterThan(-200)
        }
      }
    })
  })

  test("circular arc radius is capped to prevent oversized arcs", () => {
    // With ky scaling, link width can exceed chart dimensions.
    // The arc radius (which determines visual arc size) should be capped
    // even when the link value is large.
    const result = runLayout(
      ["A", "B", "C"],
      [
        ["A", "B", 10],
        ["B", "C", 10],
        ["C", "A", 10],
      ],
      [400, 300]
    )

    const circularLinks = result.links.filter(l => l.circular)
    expect(circularLinks.length).toBeGreaterThan(0)

    circularLinks.forEach(link => {
      if (link.circularPathData) {
        // Arc radius should be capped — not based on full link width
        expect(link.circularPathData.arcRadius).toBeLessThan(300 * 0.5)
        // _circularWidth should be capped to 15% of chart height
        expect(link._circularWidth).toBeLessThanOrEqual(300 * 0.15)
      }
    })
  })

  test("real streaming data: no nodes off-screen", () => {
    const result = runLayout(
      ["Store", "Serve", "Cache", "Ingest", "Validate", "Reject", "Process"],
      [
        ["Store", "Serve", Math.sqrt(582)],
        ["Cache", "Serve", Math.sqrt(302)],
        ["Ingest", "Validate", Math.sqrt(556)],
        ["Serve", "Ingest", Math.sqrt(200)],
        ["Validate", "Reject", Math.sqrt(170)],
        ["Process", "Cache", Math.sqrt(320)],
        ["Process", "Store", Math.sqrt(89)],
        ["Validate", "Process", Math.sqrt(134)],
      ],
      [700, 450]
    )

    result.nodes.forEach(node => {
      const label = node.id || node.index
      expect(node.y0).toBeGreaterThanOrEqual(0)
      expect(node.y1).toBeLessThanOrEqual(450)
      expect(node.x0).toBeGreaterThanOrEqual(0)
      expect(node.x1).toBeLessThanOrEqual(700)
    })
  })

  test("real streaming data: circular links stay within canvas", () => {
    const result = runLayout(
      ["Store", "Serve", "Cache", "Ingest", "Validate", "Reject", "Process"],
      [
        ["Store", "Serve", Math.sqrt(582)],
        ["Cache", "Serve", Math.sqrt(302)],
        ["Ingest", "Validate", Math.sqrt(556)],
        ["Serve", "Ingest", Math.sqrt(200)],
        ["Validate", "Reject", Math.sqrt(170)],
        ["Process", "Cache", Math.sqrt(320)],
        ["Process", "Store", Math.sqrt(89)],
        ["Validate", "Process", Math.sqrt(134)],
      ],
      [700, 450]
    )

    const circularLinks = result.links.filter(l => l.circular)

    circularLinks.forEach(link => {
      if (link.circularPathData) {
        const cpd = link.circularPathData
        // Vertical extent must be within canvas (with margin for arcs + chamfer)
        expect(cpd.verticalFullExtent).toBeGreaterThan(-60)
        expect(cpd.verticalFullExtent).toBeLessThan(510)
        // Horizontal extents must be reasonable
        expect(cpd.rightFullExtent).toBeLessThan(750)
        expect(cpd.leftFullExtent).toBeGreaterThan(-50)
      }
    })
  })

  test("real streaming data: edges connect to their nodes", () => {
    const result = runLayout(
      ["Store", "Serve", "Cache", "Ingest", "Validate", "Reject", "Process"],
      [
        ["Store", "Serve", Math.sqrt(582)],
        ["Cache", "Serve", Math.sqrt(302)],
        ["Ingest", "Validate", Math.sqrt(556)],
        ["Serve", "Ingest", Math.sqrt(200)],
        ["Validate", "Reject", Math.sqrt(170)],
        ["Process", "Cache", Math.sqrt(320)],
        ["Process", "Store", Math.sqrt(89)],
        ["Validate", "Process", Math.sqrt(134)],
      ],
      [700, 450]
    )

    // For non-circular links, y0 should be within source node's y range
    // and y1 should be within target node's y range
    result.links.forEach(link => {
      if (link.circular) return
      const src = typeof link.source === "object" ? link.source : null
      const tgt = typeof link.target === "object" ? link.target : null
      if (!src || !tgt) return

      expect(link.y0).toBeGreaterThanOrEqual(src.y0 - 1)
      expect(link.y0).toBeLessThanOrEqual(src.y1 + 1)
      expect(link.y1).toBeGreaterThanOrEqual(tgt.y0 - 1)
      expect(link.y1).toBeLessThanOrEqual(tgt.y1 + 1)
    })
  })

  test("self-linking node does not distort layout", () => {
    const result = runLayout(
      ["A", "B", "C"],
      [
        ["A", "B", 10],
        ["B", "C", 10],
        ["B", "B", 5],  // self-link
      ],
      [600, 400]
    )

    result.nodes.forEach(node => {
      expect(node.y1 - node.y0).toBeGreaterThan(0)
      expect(node.x1 - node.x0).toBe(15) // nodeWidth
    })
  })

  test("streaming scenario: accumulating edges with eventual cycle", () => {
    // Simulates the streaming demo where edges accumulate and
    // a cycle eventually forms
    const nodes = ["API", "Auth", "Users", "Orders", "DB"]
    const edges = [
      ["API", "Auth", 20],
      ["API", "Users", 15],
      ["API", "Orders", 30],
      ["Auth", "DB", 10],
      ["Users", "DB", 10],
      ["Orders", "DB", 25],
      ["DB", "API", 5],  // cycle back
    ]

    const result = runLayout(nodes, edges, [750, 400])

    const nodeMinY = Math.min(...result.nodes.map(n => n.y0))
    const nodeMaxY = Math.max(...result.nodes.map(n => n.y1))
    const nodeYSpan = nodeMaxY - nodeMinY

    const nodeMinX = Math.min(...result.nodes.map(n => n.x0))
    const nodeMaxX = Math.max(...result.nodes.map(n => n.x1))
    const nodeXSpan = nodeMaxX - nodeMinX

    // Core layout should remain usable
    expect(nodeYSpan).toBeGreaterThan(400 * 0.35)
    expect(nodeXSpan).toBeGreaterThan(750 * 0.35)

    // All nodes should be within original bounds (with some margin for cycles)
    result.nodes.forEach(node => {
      expect(node.x0).toBeGreaterThanOrEqual(-50)
      expect(node.x1).toBeLessThanOrEqual(800)
      expect(node.y0).toBeGreaterThanOrEqual(-100)
      expect(node.y1).toBeLessThanOrEqual(500)
    })
  })
})
