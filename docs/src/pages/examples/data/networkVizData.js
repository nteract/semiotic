// Data + analysis helpers for the "Drawing Networks" example — a transition
// of Elijah Meeks's 2015 network-visualization workshop and the "Introduction
// to Networks" toy onto Semiotic.
//
// The grounded dataset is the canonical Les Misérables co-occurrence network
// (downsampled in ./lesMiserables). The seeded force layout and spatial-problem
// detector are reused from the gestalt example so the two pieces stay in sync.

import { LESMIS_NODES, LESMIS_EDGES, CORE_IDS } from "./lesMiserables"
import { mulberry32, findProximityProblem } from "./gestaltData"

export { LESMIS_NODES, LESMIS_EDGES, CORE_IDS, findProximityProblem }

// ---------------------------------------------------------------------------
// Mid-century textbook palette
// ---------------------------------------------------------------------------
export const PAPER = "#f3ecda"
export const PAPER_DEEP = "#e9dfc6"
export const INK = "#2a241d"
export const INK_SOFT = "#6f6353"
export const OXBLOOD = "#8a2b22"
export const RULE = "#c8bb9c"

// Community / categorical colors — a restrained mid-century set.
export const COMMUNITY_COLORS = [
  "#8a2b22", // oxblood
  "#2f6d6a", // teal
  "#caa53d", // mustard
  "#3f5b86", // slate blue
  "#6b7233", // olive
  "#b5663b", // terracotta
  "#6b3f6b", // plum
  "#9a9384", // stone
]

export function groupColor(group) {
  const n = Number(group) || 0
  return COMMUNITY_COLORS[n % COMMUNITY_COLORS.length]
}

// ---------------------------------------------------------------------------
// Graph utilities
// ---------------------------------------------------------------------------
export function buildAdjacency(nodes, edges) {
  const adj = new Map(nodes.map((n) => [n.id, new Set()]))
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, new Set())
    if (!adj.has(e.target)) adj.set(e.target, new Set())
    adj.get(e.source).add(e.target)
    adj.get(e.target).add(e.source)
  }
  return adj
}

export function degreeMap(nodes, edges) {
  const deg = {}
  for (const n of nodes) deg[n.id] = 0
  for (const e of edges) {
    deg[e.source] = (deg[e.source] || 0) + 1
    deg[e.target] = (deg[e.target] || 0) + 1
  }
  return deg
}

function bfsDistances(adj, start) {
  const dist = { [start]: 0 }
  const queue = [start]
  let head = 0
  while (head < queue.length) {
    const cur = queue[head]
    head += 1
    for (const nb of adj.get(cur) || []) {
      if (dist[nb] === undefined) {
        dist[nb] = dist[cur] + 1
        queue.push(nb)
      }
    }
  }
  return dist
}

// Unweighted shortest path between two ids (BFS). Returns the path as an
// ordered list of ids, or [] if unreachable.
export function shortestPath(nodes, edges, a, b) {
  if (a == null || b == null || a === b) return a && a === b ? [a] : []
  const adj = buildAdjacency(nodes, edges)
  const prev = { [a]: null }
  const queue = [a]
  let head = 0
  while (head < queue.length) {
    const cur = queue[head]
    head += 1
    if (cur === b) break
    for (const nb of adj.get(cur) || []) {
      if (prev[nb] === undefined) {
        prev[nb] = cur
        queue.push(nb)
      }
    }
  }
  if (prev[b] === undefined) return []
  const path = []
  let cur = b
  while (cur != null) {
    path.unshift(cur)
    cur = prev[cur]
  }
  return path
}

// First- (and optionally second-) degree ego network of a node.
export function egoIds(nodes, edges, id, depth = 1) {
  if (id == null) return new Set()
  const adj = buildAdjacency(nodes, edges)
  const dist = bfsDistances(adj, id)
  const set = new Set()
  for (const k in dist) if (dist[k] <= depth) set.add(k)
  return set
}

// Brandes betweenness centrality (unweighted, undirected), normalized to 0–1.
export function betweenness(nodes, edges) {
  const adj = buildAdjacency(nodes, edges)
  const cb = {}
  for (const n of nodes) cb[n.id] = 0
  for (const s of nodes.map((n) => n.id)) {
    const stack = []
    const pred = {}
    const sigma = {}
    const dist = {}
    for (const n of nodes) {
      pred[n.id] = []
      sigma[n.id] = 0
      dist[n.id] = -1
    }
    sigma[s] = 1
    dist[s] = 0
    const queue = [s]
    let head = 0
    while (head < queue.length) {
      const v = queue[head]
      head += 1
      stack.push(v)
      for (const w of adj.get(v) || []) {
        if (dist[w] < 0) {
          dist[w] = dist[v] + 1
          queue.push(w)
        }
        if (dist[w] === dist[v] + 1) {
          sigma[w] += sigma[v]
          pred[w].push(v)
        }
      }
    }
    const delta = {}
    for (const n of nodes) delta[n.id] = 0
    while (stack.length) {
      const w = stack.pop()
      for (const v of pred[w]) {
        delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w])
      }
      if (w !== s) cb[w] += delta[w]
    }
  }
  let max = 0
  for (const id in cb) {
    cb[id] /= 2 // undirected
    if (cb[id] > max) max = cb[id]
  }
  for (const id in cb) cb[id] = max > 0 ? cb[id] / max : 0
  return cb
}

// Closeness centrality, normalized to 0–1.
export function closeness(nodes, edges) {
  const adj = buildAdjacency(nodes, edges)
  const out = {}
  let max = 0
  for (const n of nodes) {
    const dist = bfsDistances(adj, n.id)
    let sum = 0
    let reach = 0
    for (const k in dist) {
      sum += dist[k]
      reach += 1
    }
    const score = sum > 0 ? (reach - 1) / sum : 0
    out[n.id] = score
    if (score > max) max = score
  }
  for (const id in out) out[id] = max > 0 ? out[id] / max : 0
  return out
}

// Local clustering coefficient per node (0–1).
export function clustering(nodes, edges) {
  const adj = buildAdjacency(nodes, edges)
  const out = {}
  for (const n of nodes) {
    const nb = [...(adj.get(n.id) || [])]
    const k = nb.length
    if (k < 2) {
      out[n.id] = 0
      continue
    }
    let links = 0
    for (let i = 0; i < nb.length; i += 1) {
      for (let j = i + 1; j < nb.length; j += 1) {
        if (adj.get(nb[i])?.has(nb[j])) links += 1
      }
    }
    out[n.id] = (2 * links) / (k * (k - 1))
  }
  return out
}

export function centralityFor(metric, nodes, edges) {
  if (metric === "betweenness") return betweenness(nodes, edges)
  if (metric === "closeness") return closeness(nodes, edges)
  // degree, normalized
  const deg = degreeMap(nodes, edges)
  let max = 0
  for (const id in deg) if (deg[id] > max) max = deg[id]
  const out = {}
  for (const id in deg) out[id] = max > 0 ? deg[id] / max : 0
  return out
}

// ---------------------------------------------------------------------------
// Static layout helpers (return { id: {x, y} } in normalized 0–1 space)
// ---------------------------------------------------------------------------
export function arcLayout(ids) {
  const pos = {}
  const n = ids.length
  ids.forEach((id, i) => {
    pos[id] = { x: n > 1 ? 0.06 + (i / (n - 1)) * 0.88 : 0.5, y: 0.62 }
  })
  return pos
}

export function circularLayout(ids) {
  const pos = {}
  const n = ids.length
  ids.forEach((id, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2
    pos[id] = { x: 0.5 + Math.cos(a) * 0.42, y: 0.5 + Math.sin(a) * 0.42 }
  })
  return pos
}

// Order ids for arc/matrix: group then degree, so communities sit together
// and structure is visible.
export function orderedIds(nodes, edges) {
  const deg = degreeMap(nodes, edges)
  return nodes
    .slice()
    .sort((a, b) => (a.group - b.group) || (deg[b.id] - deg[a.id]))
    .map((n) => n.id)
}

// ---------------------------------------------------------------------------
// Subgraphs + aggregations
// ---------------------------------------------------------------------------
export function subgraph(ids) {
  const set = new Set(ids)
  const nodes = LESMIS_NODES.filter((n) => set.has(n.id))
  const edges = LESMIS_EDGES.filter((e) => set.has(e.source) && set.has(e.target))
  return { nodes, edges }
}

export function coreGraph() {
  return subgraph(CORE_IDS)
}

// Symmetric community-to-community co-occurrence, for a chord diagram.
export function communityChord(nodes, edges) {
  const groupOf = {}
  for (const n of nodes) groupOf[n.id] = n.group
  const groups = [...new Set(nodes.map((n) => n.group))].sort((a, b) => a - b)
  const flow = {}
  for (const e of edges) {
    const a = groupOf[e.source]
    const b = groupOf[e.target]
    const key = a <= b ? `${a}-${b}` : `${b}-${a}`
    flow[key] = (flow[key] || 0) + e.value
  }
  const chordNodes = groups.map((g) => ({ id: `Community ${g + 1}`, group: g }))
  const chordEdges = []
  for (const key in flow) {
    const [a, b] = key.split("-").map(Number)
    chordEdges.push({
      source: `Community ${a + 1}`,
      target: `Community ${b + 1}`,
      value: flow[key],
    })
  }
  return { nodes: chordNodes, edges: chordEdges }
}

// Bipartite "character → community" membership flow, for a sankey diagram.
export function membershipSankey(nodes, edges, topN = 14) {
  const deg = degreeMap(nodes, edges)
  const top = nodes
    .slice()
    .sort((a, b) => deg[b.id] - deg[a.id])
    .slice(0, topN)
  const groups = [...new Set(top.map((n) => n.group))].sort((a, b) => a - b)
  const sankeyNodes = [
    ...top.map((n) => ({ id: n.id, group: n.group })),
    ...groups.map((g) => ({ id: `Community ${g + 1}`, group: g })),
  ]
  const sankeyEdges = top.map((n) => ({
    source: n.id,
    target: `Community ${n.group + 1}`,
    value: deg[n.id],
    group: n.group,
  }))
  return { nodes: sankeyNodes, edges: sankeyEdges }
}

// ---------------------------------------------------------------------------
// Chapter 1 — a tiny hierarchy for the "network types" figure
// ---------------------------------------------------------------------------
export const TYPE_TREE = {
  id: "Company",
  children: [
    {
      id: "Design",
      children: [{ id: "Research" }, { id: "Product" }, { id: "Brand" }],
    },
    {
      id: "Engineering",
      children: [{ id: "Frontend" }, { id: "Backend" }, { id: "Data" }],
    },
    {
      id: "Operations",
      children: [{ id: "Finance" }, { id: "People" }],
    },
  ],
}

// ---------------------------------------------------------------------------
// Chapter 4 — a small directed, weighted network for edge encodings.
// Hand-placed so the encodings read clearly. Some pairs are reciprocal.
// ---------------------------------------------------------------------------
export const EDGE_DEMO_NODES = [
  { id: "Agnès", group: 0 },
  { id: "Bruno", group: 0 },
  { id: "Cosette", group: 0 },
  { id: "Dahlia", group: 1 },
  { id: "Émile", group: 1 },
  { id: "Félix", group: 1 },
  { id: "Gilles", group: 0 },
]

export const EDGE_DEMO_EDGES = [
  { source: "Agnès", target: "Bruno", value: 4 },
  { source: "Bruno", target: "Agnès", value: 2 },
  { source: "Bruno", target: "Cosette", value: 1 },
  { source: "Cosette", target: "Dahlia", value: 5 },
  { source: "Dahlia", target: "Émile", value: 3 },
  { source: "Émile", target: "Félix", value: 2 },
  { source: "Félix", target: "Émile", value: 2 },
  { source: "Félix", target: "Dahlia", value: 1 },
  { source: "Gilles", target: "Agnès", value: 1 },
  { source: "Cosette", target: "Émile", value: 2 },
]

export const EDGE_DEMO_LAYOUT = {
  "Agnès": { x: 0.16, y: 0.24 },
  "Bruno": { x: 0.14, y: 0.62 },
  "Cosette": { x: 0.40, y: 0.44 },
  "Dahlia": { x: 0.64, y: 0.28 },
  "Émile": { x: 0.70, y: 0.66 },
  "Félix": { x: 0.92, y: 0.5 },
  "Gilles": { x: 0.34, y: 0.86 },
}

// Mark each directed edge as reciprocal when the reverse edge also exists.
export function markReciprocity(edges) {
  const set = new Set(edges.map((e) => `${e.source}>${e.target}`))
  return edges.map((e) => ({
    ...e,
    reciprocal: set.has(`${e.target}>${e.source}`),
  }))
}

// ---------------------------------------------------------------------------
// Chapter 8 — sample graphs for the Network Toy
// ---------------------------------------------------------------------------
// A random graph with planted clusters, so communities are real and visible.
export function randomClustered(seed = 1, clusters = 4, perCluster = 6) {
  const rand = mulberry32(seed)
  const nodes = []
  const edges = []
  for (let c = 0; c < clusters; c += 1) {
    for (let i = 0; i < perCluster; i += 1) {
      nodes.push({ id: `${c}-${i}`, group: c })
    }
  }
  const idAt = (c, i) => `${c}-${i}`
  for (let c = 0; c < clusters; c += 1) {
    for (let i = 0; i < perCluster; i += 1) {
      for (let j = i + 1; j < perCluster; j += 1) {
        if (rand() < 0.45) edges.push({ source: idAt(c, i), target: idAt(c, j), value: 1 })
      }
    }
  }
  // a few inter-cluster bridges
  for (let c = 0; c < clusters; c += 1) {
    const d = (c + 1) % clusters
    edges.push({
      source: idAt(c, Math.floor(rand() * perCluster)),
      target: idAt(d, Math.floor(rand() * perCluster)),
      value: 1,
    })
  }
  return { nodes, edges, directed: false }
}

export const SAMPLE_GRAPHS = [
  { id: "lesmis", label: "Les Misérables", build: () => ({ nodes: LESMIS_NODES, edges: LESMIS_EDGES, directed: false }) },
  { id: "core", label: "Les Mis (core)", build: () => ({ ...coreGraph(), directed: false }) },
  { id: "random", label: "Random clusters", build: (seed) => randomClustered(seed) },
  { id: "story", label: "A small drama", build: () => ({ nodes: EDGE_DEMO_NODES, edges: EDGE_DEMO_EDGES, directed: true }) },
]
