/**
 * Generate demo GIFs for the docs site Export & Embed page.
 *
 * Run: npx tsx scripts/generate-demo-gifs.ts
 * Output: docs/public/assets/gifs/
 *
 * Called during website:build or manually.
 */

import * as fs from "fs"
import * as path from "path"
import { renderToAnimatedGif } from "../src/components/server/animatedGif"
import { generateFrameSequence } from "../src/components/server/animatedGif"

const OUT = path.resolve(__dirname, "../docs/public/assets/gifs")
fs.mkdirSync(OUT, { recursive: true })

// ── Incident replay data ─────────────────────────────────────────────

function buildIncidentData() {
  const points: { x: number; y: number }[] = []
  for (let t = 0; t < 30; t++) {
    let latency: number
    if (t < 15) {
      latency = 120 + (Math.sin(t * 0.7) * 8) + (Math.cos(t * 1.3) * 5)
    } else if (t < 20) {
      const wobble = Math.sin(t * 1.8) * (12 + (t - 15) * 6)
      latency = 130 + wobble + (t - 15) * 4
    } else if (t < 25) {
      const amplitude = 20 + (t - 20) * 12
      latency = 150 + (t - 20) * 15 + Math.sin(t * 2.2) * amplitude
    } else {
      latency = 200 + (t - 25) * 25 + Math.sin(t * 3) * 30
    }
    points.push({ x: t, y: Math.round(Math.max(80, latency)) })
  }
  return points
}

// ── Network fragmentation data ───────────────────────────────────────

const networkNodes = [
  { id: "Lead", group: "broker", x: 200, y: 130 },
  { id: "Alice", group: "teamA", x: 70, y: 80 },
  { id: "Bob", group: "teamA", x: 50, y: 150 },
  { id: "Carol", group: "teamA", x: 110, y: 170 },
  { id: "Dave", group: "teamB", x: 290, y: 70 },
  { id: "Eve", group: "teamB", x: 340, y: 130 },
  { id: "Frank", group: "teamB", x: 310, y: 190 },
  { id: "Grace", group: "teamB", x: 260, y: 180 },
]

const allNetworkEdges = [
  { source: "Lead", target: "Alice" },
  { source: "Lead", target: "Dave" },
  { source: "Alice", target: "Bob" },
  { source: "Bob", target: "Carol" },
  { source: "Alice", target: "Carol" },
  { source: "Dave", target: "Eve" },
  { source: "Eve", target: "Frank" },
  { source: "Frank", target: "Grace" },
  { source: "Dave", target: "Grace" },
]

function buildNetworkSnapshots() {
  const allNodes = networkNodes
  const steady = { nodes: allNodes, edges: allNetworkEdges }
  const noBridgeB = { nodes: allNodes, edges: allNetworkEdges.filter(e => !(e.source === "Lead" && e.target === "Dave")) }
  const noBridges = { nodes: allNodes, edges: noBridgeB.edges.filter(e => !(e.source === "Lead" && e.target === "Alice")) }
  const noLead = { nodes: allNodes.filter(n => n.id !== "Lead"), edges: noBridges.edges }
  return [steady, steady, steady, noBridgeB, noBridges, noBridges, noLead, noLead, noLead, noLead]
}

// ── Sankey failover data ─────────────────────────────────────────────

function sankeyFrame(tB: number, bB: number) {
  const edges: { source: string; target: string; value: number }[] = [
    { source: "Clickstream", target: "Kafka", value: 200 },
    { source: "Logs", target: "Kafka", value: 150 },
    { source: "Metrics", target: "Kafka", value: 100 },
    { source: "Kafka", target: "Transform-A", value: 250 },
    { source: "Transform-A", target: "Warehouse", value: 200 },
    { source: "Transform-A", target: "Dashboard", value: 50 },
  ]
  if (tB > 0) {
    edges.push({ source: "Kafka", target: "Transform-B", value: tB })
    edges.push({ source: "Transform-B", target: "Warehouse", value: Math.round(tB * 0.75) })
    edges.push({ source: "Transform-B", target: "Dashboard", value: Math.round(tB * 0.25) })
  }
  if (bB > 0) {
    edges.push({ source: "Kafka", target: "Backup-B", value: bB })
    edges.push({ source: "Backup-B", target: "Warehouse", value: Math.round(bB * 0.75) })
    edges.push({ source: "Backup-B", target: "Dashboard", value: Math.round(bB * 0.25) })
  }
  return { edges }
}

const SANKEY_COLORS: Record<string, string> = {
  "Clickstream": "#7b9ec4", "Logs": "#7b9ec4", "Metrics": "#7b9ec4",
  "Kafka": "#5ba8a0",
  "Transform-A": "#d4a24e", "Transform-B": "#d4a24e",
  "Backup-B": "#d47050",
  "Warehouse": "#6aaf6a", "Dashboard": "#6aaf6a",
}

// ── Generate GIFs ────────────────────────────────────────────────────

async function main() {
  const t0 = Date.now()

  // 1. Incident replay
  console.log("Generating incident-replay.gif...")
  const incidentGif = await renderToAnimatedGif("line", buildIncidentData(), {
    xAccessor: "x", yAccessor: "y",
    theme: "dark", title: "API Latency — Incident Replay",
    width: 440, height: 260, background: "#1a1a2e",
    annotations: [{ type: "y-threshold", value: 200, label: "SLA: 200ms", color: "#e45050" }],
  }, {
    fps: 8, stepSize: 1,
    xExtent: [0, 29] as [number, number], yExtent: [60, 350] as [number, number],
    transitionFrames: 0, loop: true,
  })
  fs.writeFileSync(path.join(OUT, "incident-replay.gif"), incidentGif)
  console.log(`  ${(incidentGif.length / 1024).toFixed(0)} KB`)

  // 2. Network fragmentation — use generateFrameSequence + renderToAnimatedGif on the SVGs
  console.log("Generating network-fragmentation.gif...")
  const groupColors: Record<string, string> = { broker: "#c8a8f0", teamA: "#a8c8f0", teamB: "#f0a8a8" }
  const networkSvgs = generateFrameSequence("ForceDirectedGraph", buildNetworkSnapshots(), {
    width: 400, height: 280, theme: "dark", background: "#1a1a2e",
    showLabels: true, nodeLabel: "id", iterations: 0,
    nodeStyle: (d: any) => ({ fill: groupColors[d.data?.group] || "#888" }),
  })
  // Encode SVG frames to GIF manually using sharp + gifenc
  const sharp = require("sharp")
  const { GIFEncoder, quantize, applyPalette } = require("gifenc")
  const networkEncoder = GIFEncoder()
  for (const svg of networkSvgs) {
    const pixels = await sharp(Buffer.from(svg), { density: 144 })
      .resize(400, 280).ensureAlpha().raw().toBuffer()
    const palette = quantize(new Uint8Array(pixels), 256)
    const indexed = applyPalette(new Uint8Array(pixels), palette)
    networkEncoder.writeFrame(indexed, 400, 280, { palette, delay: 400, repeat: 0 })
  }
  networkEncoder.finish()
  const networkGif = Buffer.from(networkEncoder.bytes())
  fs.writeFileSync(path.join(OUT, "network-fragmentation.gif"), networkGif)
  console.log(`  ${(networkGif.length / 1024).toFixed(0)} KB`)

  // 3. Sankey failover
  console.log("Generating sankey-failover.gif...")
  const sankeySnapshots = [
    sankeyFrame(200, 0), sankeyFrame(195, 0), sankeyFrame(180, 0),
    sankeyFrame(160, 20), sankeyFrame(150, 30), sankeyFrame(140, 40),
    sankeyFrame(120, 60), sankeyFrame(80, 100), sankeyFrame(40, 150),
    sankeyFrame(15, 185), sankeyFrame(0, 200), sankeyFrame(0, 200), sankeyFrame(0, 200),
  ]
  const sankeySvgs = generateFrameSequence("SankeyDiagram", sankeySnapshots, {
    width: 520, height: 300, theme: "light",
    showLabels: true, nodeLabel: "id",
    margin: { top: 20, right: 45, bottom: 20, left: 45 },
    nodeStyle: (d: any) => ({ fill: SANKEY_COLORS[d.data?.id] || "#888" }),
  })
  const sankeyEncoder = GIFEncoder()
  for (const svg of sankeySvgs) {
    const pixels = await sharp(Buffer.from(svg), { density: 144 })
      .resize(520, 300).ensureAlpha().raw().toBuffer()
    const palette = quantize(new Uint8Array(pixels), 256)
    const indexed = applyPalette(new Uint8Array(pixels), palette)
    sankeyEncoder.writeFrame(indexed, 520, 300, { palette, delay: 400, repeat: 0 })
  }
  sankeyEncoder.finish()
  const sankeyGif = Buffer.from(sankeyEncoder.bytes())
  fs.writeFileSync(path.join(OUT, "sankey-failover.gif"), sankeyGif)
  console.log(`  ${(sankeyGif.length / 1024).toFixed(0)} KB`)

  const elapsed = Date.now() - t0
  console.log(`\nDone. 3 GIFs generated in ${elapsed}ms`)
}

main().catch(e => { console.error(e); process.exit(1) })
