// Data + small deterministic layout helpers for the chapterized
// "Gestalt of Data Visualization" example.
//
// This is a transition of Elijah Meeks's 2015 "Gestalt Principles for Data
// Visualization" essays (emeeks.github.io/gestaltdataviz) onto Semiotic
// charts. The originals demonstrated each principle with bespoke D3 circle
// and line tweens; here each principle is re-expressed through the Semiotic
// chart or feature where it actually lives.

// ---------------------------------------------------------------------------
// Bauhaus "Perception Lab" palette
// ---------------------------------------------------------------------------
export const PAPER = "#f1e7d2"
export const PAPER_DEEP = "#e7dabf"
export const INK = "#1a1610"
export const RED = "#df2b1f"
export const BLUE = "#2a4cad"
export const YELLOW = "#f3b724"
export const GRAY = "#b1a78f" // neutral / "deactivated"

// ===========================================================================
// CHAPTER I — Similarity, Proximity & Enclosure
// A grid of marks driven through four states by swapping Scatterplot props.
// ===========================================================================
export const GRID_COLS = 8
export const GRID_ROWS = 5
// Open a gap after the second column so the marks read as two clusters
// (10 on the left, 30 on the right) — the same split as the original.
export const PROXIMITY_GAP = 2.6

export function buildGestaltGrid() {
  const points = []
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      const active = col % 2 === 1
      points.push({
        id: `c-${row}-${col}`,
        col,
        row,
        gx: col, // grid x
        px: col < 2 ? col : col + PROXIMITY_GAP, // clustered x
        y: GRID_ROWS - 1 - row,
        group: active ? "active" : "calm",
        shape: active ? "square" : "circle",
      })
    }
  }
  return points
}

// Bounds (in data coordinates) of the two proximity clusters, used to draw
// the enclosure rectangles via the chart's resolved scales.
export const GRID_CLUSTERS = [
  { id: "left", x0: 0, x1: 1, y0: 0, y1: GRID_ROWS - 1 },
  {
    id: "right",
    x0: 2 + PROXIMITY_GAP,
    x1: GRID_COLS - 1 + PROXIMITY_GAP,
    y0: 0,
    y1: GRID_ROWS - 1,
  },
]

export const GRID_X_EXTENT = [-0.7, GRID_COLS - 1 + PROXIMITY_GAP + 0.7]
export const GRID_Y_EXTENT = [-0.7, GRID_ROWS - 0.3]

// ===========================================================================
// CHAPTER II — Common Fate, Parallelism & Connectedness
// ===========================================================================

// Parallelism / common fate: five series, three falling in lockstep and two
// rising in lockstep — shared slopes group them, just like a slopegraph.
export const SLOPE_SERIES = [
  { id: "Alpha", dir: "falling", start: 8.6, end: 3.1 },
  { id: "Beta", dir: "falling", start: 7.3, end: 1.9 },
  { id: "Gamma", dir: "falling", start: 6.0, end: 0.7 },
  { id: "Delta", dir: "rising", start: 2.1, end: 7.0 },
  { id: "Epsilon", dir: "rising", start: 3.2, end: 7.9 },
]

export function slopeLineData() {
  return SLOPE_SERIES.flatMap((s) => [
    { series: s.id, dir: s.dir, t: 0, value: s.start },
    { series: s.id, dir: s.dir, t: 1, value: s.end },
  ])
}

// Each series as a single point for the "common fate" animation. `phase`
// 0 → start, 1 → end. x is spread out so the two fates are visible as motion.
export function commonFatePoints(phase) {
  return SLOPE_SERIES.map((s, i) => ({
    id: s.id,
    dir: s.dir,
    x: i,
    value: phase === 1 ? s.end : s.start,
  }))
}

export const SLOPE_DIR_COLORS = { falling: BLUE, rising: RED }

// ===========================================================================
// CHAPTER II — Connectedness / networks / complex edges
// One small graph shown as bare dots, then straight edges, then curved edges.
// ===========================================================================
export const LINK_NODES = [
  "n0", "n1", "n2", "n3", "n4", "n5",
  "n6", "n7", "n8", "n9", "n10", "n11",
].map((id) => ({ id }))

export const LINK_EDGES = [
  { source: "n0", target: "n1" },
  { source: "n1", target: "n2" },
  { source: "n2", target: "n0" },
  { source: "n2", target: "n3" },
  { source: "n3", target: "n4" },
  { source: "n4", target: "n5" },
  { source: "n5", target: "n3" },
  { source: "n6", target: "n7" },
  { source: "n7", target: "n8" },
  { source: "n8", target: "n6" },
  { source: "n5", target: "n9" },
  { source: "n9", target: "n10" },
  { source: "n10", target: "n11" },
  { source: "n2", target: "n6" },
]

// A hand-tuned base layout (normalized 0–1) so the connectedness exhibit is
// stable and legible run to run.
export const LINK_LAYOUT = {
  n0: { x: 0.16, y: 0.26 },
  n1: { x: 0.10, y: 0.55 },
  n2: { x: 0.33, y: 0.42 },
  n3: { x: 0.40, y: 0.74 },
  n4: { x: 0.22, y: 0.86 },
  n5: { x: 0.55, y: 0.86 },
  n6: { x: 0.62, y: 0.30 },
  n7: { x: 0.84, y: 0.20 },
  n8: { x: 0.86, y: 0.47 },
  n9: { x: 0.74, y: 0.66 },
  n10: { x: 0.90, y: 0.78 },
  n11: { x: 0.72, y: 0.92 },
}

// ===========================================================================
// CHAPTER III — Proximity & Past Experience (network non-determinism)
// A fixed graph, re-laid-out by a seeded force simulation on every "Again".
// ===========================================================================
export const NET_NODES = Array.from({ length: 16 }, (_, i) => ({ id: `g${i}` }))

export const NET_EDGES = [
  // cluster A
  { source: "g0", target: "g1" },
  { source: "g1", target: "g2" },
  { source: "g2", target: "g3" },
  { source: "g3", target: "g0" },
  { source: "g1", target: "g4" },
  { source: "g4", target: "g5" },
  { source: "g0", target: "g13" },
  // cluster B
  { source: "g6", target: "g7" },
  { source: "g7", target: "g8" },
  { source: "g8", target: "g9" },
  { source: "g9", target: "g6" },
  { source: "g7", target: "g10" },
  { source: "g10", target: "g11" },
  { source: "g11", target: "g14" },
  // bridge between the two clusters
  { source: "g5", target: "g12" },
  { source: "g12", target: "g6" },
  // g15 is intentionally left disconnected — held on screen only by gravity
]

// Deterministic PRNG so layouts are reproducible per seed.
export function mulberry32(seed) {
  let a = seed >>> 0
  return function next() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A compact force simulation in a virtual 1000×1000 space, normalized to
// [0,1] at the end. Different seeds → different (mirrored / rotated /
// re-packed) layouts of the very same graph — the "past experience" problem.
const SIM_SIZE = 1000
const REPULSION = 5200
const LINK_DIST = 165
const LINK_STRENGTH = 0.045
const CENTER_STRENGTH = 0.018
const DAMP = 0.84
const SIM_ITERS = 260

export function layoutGraph(nodes, edges, seed) {
  const rand = mulberry32(seed)
  const pos = {}
  for (const n of nodes) {
    pos[n.id] = {
      x: 200 + rand() * 600,
      y: 200 + rand() * 600,
      vx: 0,
      vy: 0,
    }
  }
  const center = SIM_SIZE / 2
  for (let it = 0; it < SIM_ITERS; it += 1) {
    const alpha = 1 - it / SIM_ITERS
    // repulsion between every pair
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = pos[nodes[i].id]
        const b = pos[nodes[j].id]
        let dx = a.x - b.x
        let dy = a.y - b.y
        let d = Math.sqrt(dx * dx + dy * dy)
        if (d < 1) {
          d = 1
          dx = rand() - 0.5
          dy = rand() - 0.5
        }
        const rep = REPULSION / (d * d)
        const fx = (dx / d) * rep
        const fy = (dy / d) * rep
        a.vx += fx
        a.vy += fy
        b.vx -= fx
        b.vy -= fy
      }
    }
    // link springs
    for (const e of edges) {
      const a = pos[e.source]
      const b = pos[e.target]
      let dx = b.x - a.x
      let dy = b.y - a.y
      let d = Math.sqrt(dx * dx + dy * dy) || 1
      const f = (d - LINK_DIST) * LINK_STRENGTH
      const fx = (dx / d) * f
      const fy = (dy / d) * f
      a.vx += fx
      a.vy += fy
      b.vx -= fx
      b.vy -= fy
    }
    // gravity toward the center keeps disconnected pieces on screen
    for (const n of nodes) {
      const p = pos[n.id]
      p.vx += (center - p.x) * CENTER_STRENGTH
      p.vy += (center - p.y) * CENTER_STRENGTH
    }
    // integrate + cool
    for (const n of nodes) {
      const p = pos[n.id]
      p.x += p.vx * alpha
      p.y += p.vy * alpha
      p.vx *= DAMP
      p.vy *= DAMP
    }
  }
  // normalize to [0,1] over the actual bounding box, with a small inset
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of nodes) {
    const p = pos[n.id]
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1
  const inset = 0.06
  const out = {}
  for (const n of nodes) {
    const p = pos[n.id]
    out[n.id] = {
      x: inset + ((p.x - minX) / spanX) * (1 - 2 * inset),
      y: inset + ((p.y - minY) / spanY) * (1 - 2 * inset),
    }
  }
  return out
}

function buildAdjacency(nodes, edges) {
  const adj = new Map(nodes.map((n) => [n.id, new Set()]))
  for (const e of edges) {
    adj.get(e.source)?.add(e.target)
    adj.get(e.target)?.add(e.source)
  }
  return adj
}

// Breadth-first hop distance from one node to every other.
function bfs(adj, start) {
  const dist = { [start]: 0 }
  const queue = [start]
  while (queue.length) {
    const cur = queue.shift()
    for (const nb of adj.get(cur) || []) {
      if (dist[nb] === undefined) {
        dist[nb] = dist[cur] + 1
        queue.push(nb)
      }
    }
  }
  return dist
}

// Find the nodes that are displayed close together on screen yet are far
// apart (or disconnected) in the graph — the proximity problem. The search
// escalates the pixel threshold and relaxes the hop requirement until at
// least one offending pair turns up, mirroring the original's approach.
export function findProximityProblem(nodes, edges, pos) {
  const adj = buildAdjacency(nodes, edges)
  const dist = {}
  for (const n of nodes) dist[n.id] = bfs(adj, n.id)

  let minHops = 4
  let threshold = 0.08
  const problem = new Set()
  let guard = 0
  while (problem.size === 0 && guard < 40) {
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i].id
        const b = nodes[j].id
        const hops = dist[a][b] === undefined ? Infinity : dist[a][b]
        const dx = pos[a].x - pos[b].x
        const dy = pos[a].y - pos[b].y
        const screen = Math.sqrt(dx * dx + dy * dy)
        if (hops >= minHops && screen < threshold) {
          problem.add(a)
          problem.add(b)
        }
      }
    }
    if (problem.size === 0) {
      threshold += 0.02
      if (threshold > 0.2) {
        threshold = 0.08
        minHops = Math.max(2, minHops - 1)
      }
    }
    guard += 1
  }
  return { problemIds: problem, threshold, minHops }
}

// ===========================================================================
// CHAPTER IV — Figure/Ground & Metastability
// ===========================================================================

// The interlocking dual bar chart: five "vertical" bars rising from the
// bottom and five "horizontal" bars growing from the left tessellate one
// square — a bar chart, or two bar charts, depending on how you look at it.
export const FG_CELLS = 5

export function buildFigureGroundBars() {
  const bars = []
  for (let i = 1; i < FG_CELLS; i += 1) {
    bars.push({ id: `v${i}`, kind: "vertical", index: i, magnitude: i })
  }
  for (let j = 0; j < FG_CELLS; j += 1) {
    bars.push({ id: `h${j}`, kind: "horizontal", index: j, magnitude: FG_CELLS - j })
  }
  return bars
}

// Bush vs. Obama approval, first ~7 years of each administration, sampled
// from Gallup / the American Presidency Project at UCSB. x is the sample
// index in chronological order. The post-9/11 spike (bush 89) is intact.
export const APPROVAL = [
  { x: 0, bush: 57, obama: 66 },
  { x: 1, bush: 58, obama: 62 },
  { x: 2, bush: 53, obama: 62 },
  { x: 3, bush: 55, obama: 64 },
  { x: 4, bush: 55, obama: 60 },
  { x: 5, bush: 51, obama: 56 },
  { x: 6, bush: 89, obama: 52 },
  { x: 7, bush: 87, obama: 52 },
  { x: 8, bush: 83, obama: 50 },
  { x: 9, bush: 81, obama: 50 },
  { x: 10, bush: 79, obama: 49 },
  { x: 11, bush: 77, obama: 49 },
  { x: 12, bush: 70, obama: 51 },
  { x: 13, bush: 76, obama: 47 },
  { x: 14, bush: 69, obama: 45 },
  { x: 15, bush: 66, obama: 45 },
  { x: 16, bush: 68, obama: 46 },
  { x: 17, bush: 63, obama: 45 },
  { x: 18, bush: 64, obama: 48 },
  { x: 19, bush: 63, obama: 48 },
  { x: 20, bush: 60, obama: 48 },
  { x: 21, bush: 58, obama: 43 },
  { x: 22, bush: 71, obama: 50 },
  { x: 23, bush: 69, obama: 46 },
  { x: 24, bush: 66, obama: 41 },
  { x: 25, bush: 61, obama: 41 },
  { x: 26, bush: 60, obama: 43 },
  { x: 27, bush: 55, obama: 42 },
  { x: 28, bush: 51, obama: 45 },
  { x: 29, bush: 63, obama: 45 },
  { x: 30, bush: 49, obama: 46 },
  { x: 31, bush: 49, obama: 47 },
  { x: 32, bush: 52, obama: 45 },
  { x: 33, bush: 49, obama: 46 },
  { x: 34, bush: 48, obama: 49 },
  { x: 35, bush: 52, obama: 50 },
  { x: 36, bush: 48, obama: 51 },
  { x: 37, bush: 53, obama: 54 },
  { x: 38, bush: 52, obama: 51 },
  { x: 39, bush: 49, obama: 47 },
  { x: 40, bush: 52, obama: 51 },
  { x: 41, bush: 48, obama: 48 },
  { x: 42, bush: 48, obama: 46 },
  { x: 43, bush: 46, obama: 45 },
  { x: 44, bush: 45, obama: 45 },
  { x: 45, bush: 46, obama: 43 },
  { x: 46, bush: 39, obama: 41 },
  { x: 47, bush: 40, obama: 42 },
  { x: 48, bush: 42, obama: 42 },
  { x: 49, bush: 43, obama: 44 },
  { x: 50, bush: 38, obama: 44 },
  { x: 51, bush: 36, obama: 41 },
  { x: 52, bush: 36, obama: 41 },
  { x: 53, bush: 37, obama: 41 },
  { x: 54, bush: 39, obama: 41 },
  { x: 55, bush: 37, obama: 42 },
  { x: 56, bush: 35, obama: 45 },
  { x: 57, bush: 32, obama: 47 },
  { x: 58, bush: 34, obama: 45 },
]

// ===========================================================================
// CHAPTER V — Continuity & Closure (the canonical principles the originals
// did not cover, completing the set).
// ===========================================================================

// Continuity: a noisy upward trend. Bare points barely read; connect them and
// the eye follows the path; smooth it and continuity takes over completely.
export const CONTINUITY = [
  { x: 0, y: 12 },
  { x: 1, y: 18 },
  { x: 2, y: 15 },
  { x: 3, y: 24 },
  { x: 4, y: 21 },
  { x: 5, y: 30 },
  { x: 6, y: 28 },
  { x: 7, y: 37 },
  { x: 8, y: 34 },
  { x: 9, y: 45 },
  { x: 10, y: 42 },
  { x: 11, y: 52 },
]

// Two crossing series — the eye follows each continuous line straight through
// the intersection rather than bouncing off the corner.
export function crossingLines() {
  const up = []
  const down = []
  for (let x = 0; x <= 10; x += 1) {
    up.push({ series: "rising", x, y: 8 + x * 4 })
    down.push({ series: "falling", x, y: 52 - x * 4 })
  }
  return [...up, ...down]
}

// Closure: points sampled along a parabola with a deliberate gap in the
// middle. The eye completes the missing arc; Semiotic's regression overlay
// makes that inferred whole explicit.
export function closureCurve() {
  const pts = []
  for (let x = 0; x <= 20; x += 1) {
    if (x > 7 && x < 13) continue // omit the middle — leave it to be closed
    pts.push({ id: `p${x}`, x, y: 6 + 0.55 * (x - 10) * (x - 10) })
  }
  return pts
}
