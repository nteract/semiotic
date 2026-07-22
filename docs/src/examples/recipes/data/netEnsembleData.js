// Seeded generator for an ensemble of small, mostly-disconnected workflow DAGs.
// Think: every repo in an org contributes a tiny task/CI dependency graph. Across
// the org you get hundreds of little graphs — a "bag of nets" — and the question
// is not "how are they connected" (they mostly aren't) but "what shapes recur?".

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FAMILY_LABEL = {
  chain: "chain",
  diamond: "diamond",
  funnel: "fan-in funnel",
  fork: "fan-out fork",
  tree: "branching tree",
  pair: "pair",
  isolate: "isolate",
  oddball: "bespoke",
}

// Build one component of a given family. Returns { nodes, edges } with globally
// unique ids (prefixed by the component key).
function buildComponent(key, family, rnd) {
  const nodes = []
  const edges = []
  const n = (i, extra = {}) => {
    const id = `${key}:${i}`
    nodes.push({ id, label: `${key}·${i}`, family: FAMILY_LABEL[family], ...extra })
    return id
  }
  const e = (s, t) => edges.push({ source: s, target: t })

  switch (family) {
    case "chain": {
      const len = 3 // fixed so all chains share one motif class
      let prev = n(0)
      for (let i = 1; i < len; i += 1) {
        const cur = n(i)
        e(prev, cur)
        prev = cur
      }
      break
    }
    case "diamond": {
      const a = n(0)
      const b = n(1)
      const c = n(2)
      const d = n(3)
      e(a, b)
      e(a, c)
      e(b, d)
      e(c, d)
      break
    }
    case "funnel": {
      // Three sources → one sink (directed: 1 sink). Fixed size ⟹ one motif.
      const sink = n(0)
      for (let i = 0; i < 3; i += 1) e(n(i + 1), sink)
      break
    }
    case "fork": {
      // One source → two sinks (NOT directed: 2 sinks). Fixed size ⟹ one motif.
      const src = n(0)
      for (let i = 0; i < 2; i += 1) e(src, n(i + 1))
      break
    }
    case "tree": {
      // Root → 2 children, each → 2 leaves (4 sinks: branching).
      const root = n(0)
      const l = n(1)
      const r = n(2)
      e(root, l)
      e(root, r)
      e(l, n(3))
      e(l, n(4))
      e(r, n(5))
      e(r, n(6))
      break
    }
    case "pair": {
      e(n(0), n(1))
      break
    }
    case "isolate": {
      n(0)
      break
    }
    case "oddball": {
      // An irregular directed mesh — its own motif class.
      const a = n(0)
      const b = n(1)
      const c = n(2)
      const d = n(3)
      const f = n(4)
      e(a, b)
      e(a, c)
      e(b, d)
      e(c, d)
      e(d, f)
      e(c, f)
      break
    }
    default:
      n(0)
  }
  return { nodes, edges }
}

// The org-wide plan: how many of each family. A realistic long tail — lots of
// simple chains, a solid block of diamonds/funnels, fewer risky branching shapes.
const PLAN = [
  ["diamond", 5],
  ["chain", 5],
  ["funnel", 4],
  ["fork", 4],
  ["pair", 3],
  ["tree", 3],
]

export function generateEnsemble(seed = 7) {
  const rnd = mulberry32(seed)
  const nodes = []
  const edges = []
  let idx = 0
  for (const [family, count] of PLAN) {
    for (let c = 0; c < count; c += 1) {
      const key = `${family[0]}${idx}`
      idx += 1
      const comp = buildComponent(key, family, rnd)
      nodes.push(...comp.nodes)
      edges.push(...comp.edges)
    }
  }
  return { nodes, edges }
}

export const ensemble = generateEnsemble(7)
