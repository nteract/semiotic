/**
 * Mermaid → Semiotic graph (alpha).
 *
 * Mermaid is the dominant text-to-graph language across GitHub, Notion, and LLM
 * output — but it renders as flat, hard-to-style, non-interactive, *inaccessible*
 * SVG. This adapter parses Mermaid `graph`/`flowchart` syntax into a topology
 * Semiotic can render with hover, isolation, theme tokens, keyboard navigation,
 * and an accessible navigation tree.
 *
 * The gofish lesson applies hard (D7): **reconstruct the diagram's semantics,
 * not its pixels.** A Mermaid flowchart is a DAG, not a force graph, so this
 * adapter doesn't just emit nodes/edges — it computes a layered layout
 * (longest-path layering) and stamps each node with `layer`/`row` coordinates,
 * ready for the `lineageDagLayout` recipe via `NetworkCustomChart`. The raw
 * topology is also returned, so a consumer who wants a force layout
 * (`ForceDirectedGraph`) can use it directly.
 *
 * Scope (alpha): `graph`/`flowchart` with TD/TB/BT/LR/RL direction, node shapes,
 * and labeled edges. Other Mermaid diagram types (sequence, class, state, er,
 * gantt, pie, mindmap, …) are declined with a reason rather than mistranslated.
 *
 * Pure, dependency-free: a small dedicated parser, never a Mermaid runtime dep.
 */

export type MermaidDirection = "TD" | "TB" | "BT" | "LR" | "RL"

export type MermaidNodeShape =
  | "rect"
  | "round"
  | "stadium"
  | "subroutine"
  | "cylinder"
  | "circle"
  | "diamond"
  | "hexagon"
  | "flag"

export interface MermaidNode {
  id: string
  label: string
  shape: MermaidNodeShape
  /** Longest-path layer (0 = a source with no incoming edges). */
  layer: number
  /** Order within the layer (insertion order). */
  row: number
}

export interface MermaidEdge {
  source: string
  target: string
  label?: string
}

export interface MermaidResult {
  kind: "flowchart"
  direction: MermaidDirection
  nodes: MermaidNode[]
  edges: MermaidEdge[]
  warnings?: string[]
}

// ── Diagram-type guard ───────────────────────────────────────────────────────

const NON_FLOWCHART = new Set([
  "sequencediagram",
  "classdiagram",
  "statediagram",
  "statediagram-v2",
  "erdiagram",
  "gantt",
  "pie",
  "journey",
  "gitgraph",
  "mindmap",
  "timeline",
  "quadrantchart",
  "requirementdiagram",
  "c4context",
  "sankey-beta",
  "block-beta",
  "xychart-beta",
])

const DIRECTIONS = new Set(["TD", "TB", "BT", "LR", "RL"])

// ── Link / node grammar ──────────────────────────────────────────────────────

// Link operators, longest first so e.g. "-.->" wins over "---".
const LINK_RE = /(<-->|-\.->|-\.-|-->|--x|--o|---|==>|===)/

/** Shape wrappers, longest/most-specific first. Each: [open, close, shape]. */
const SHAPES: Array<[string, string, MermaidNodeShape]> = [
  ["((", "))", "circle"],
  ["([", "])", "stadium"],
  ["[[", "]]", "subroutine"],
  ["[(", ")]", "cylinder"],
  ["{{", "}}", "hexagon"],
  ["[", "]", "rect"],
  ["(", ")", "round"],
  ["{", "}", "diamond"],
  [">", "]", "flag"],
]

function stripQuotes(s: string): string {
  const t = s.trim()
  if (t.length >= 2 && ((t[0] === '"' && t.endsWith('"')) || (t[0] === "'" && t.endsWith("'")))) {
    return t.slice(1, -1)
  }
  return t
}

interface ParsedNode {
  id: string
  label?: string
  shape?: MermaidNodeShape
}

/** Parse a node token like `A[Label]` / `B{D}` / bare `A`. Returns null if not a node. */
function parseNodeToken(tokenRaw: string): ParsedNode | null {
  const token = tokenRaw.trim()
  if (!token) return null
  const idMatch = token.match(/^([A-Za-z0-9_][\w-]*)/)
  if (!idMatch) return null
  const id = idMatch[1]
  const rest = token.slice(id.length).trim()
  if (!rest) return { id }
  for (const [open, close, shape] of SHAPES) {
    if (rest.startsWith(open) && rest.endsWith(close) && rest.length >= open.length + close.length) {
      const label = stripQuotes(rest.slice(open.length, rest.length - close.length))
      return { id, label, shape }
    }
  }
  // Unrecognized trailing syntax — treat the id alone as the node.
  return { id }
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function fromMermaid(text: string): MermaidResult {
  const warnings: string[] = []
  const empty = (): MermaidResult => ({
    kind: "flowchart",
    direction: "TD",
    nodes: [],
    edges: [],
    ...(warnings.length ? { warnings } : {}),
  })

  if (typeof text !== "string" || !text.trim()) {
    warnings.push("Empty Mermaid input.")
    return empty()
  }

  // Strip %% comments and blank lines.
  const lines = text
    .split("\n")
    .map((l) => l.replace(/%%.*$/, "").trim())
    .filter((l) => l.length > 0)

  if (lines.length === 0) {
    warnings.push("No content after stripping comments.")
    return empty()
  }

  // Header: `graph TD` / `flowchart LR`, or a refused diagram type.
  const header = lines[0]
  const headerKeyword = header.split(/\s+/)[0].toLowerCase()
  if (headerKeyword !== "graph" && headerKeyword !== "flowchart") {
    if (NON_FLOWCHART.has(headerKeyword)) {
      warnings.push(
        `Mermaid "${header.split(/\s+/)[0]}" diagrams aren't supported — only graph/flowchart compile to a Semiotic graph. ` +
          "Other diagram types are declined rather than mistranslated.",
      )
    } else {
      warnings.push(
        `Expected a "graph" or "flowchart" header; got "${header}". Treating remaining lines as flowchart edges.`,
      )
    }
    if (NON_FLOWCHART.has(headerKeyword)) return empty()
  }

  let direction: MermaidDirection = "TD"
  const dirToken = header.split(/\s+/)[1]?.toUpperCase()
  if (dirToken && DIRECTIONS.has(dirToken)) direction = dirToken as MermaidDirection

  // Body lines (skip the header if it was a real graph/flowchart header).
  const bodyStart = headerKeyword === "graph" || headerKeyword === "flowchart" ? 1 : 0

  const nodeMap = new Map<string, MermaidNode>()
  const edges: MermaidEdge[] = []
  let insertionOrder = 0

  const ensureNode = (parsed: ParsedNode): void => {
    const existing = nodeMap.get(parsed.id)
    if (!existing) {
      nodeMap.set(parsed.id, {
        id: parsed.id,
        label: parsed.label ?? parsed.id,
        shape: parsed.shape ?? "rect",
        layer: 0,
        row: insertionOrder++,
      })
    } else if (parsed.label && existing.label === existing.id) {
      // A later definition supplies the label/shape for a node first seen bare.
      existing.label = parsed.label
      if (parsed.shape) existing.shape = parsed.shape
    }
  }

  // Normalize mid-arrow text labels (`A -- text --> B`) to pipe form (`A -->|text| B`).
  const normalizeLabels = (line: string): string =>
    line
      .replace(/--\s+([^->|]+?)\s+-->/g, "-->|$1|")
      .replace(/-\.\s+([^->|]+?)\s+\.->/g, "-.->|$1|")
      .replace(/==\s+([^=>|]+?)\s+==>/g, "==>|$1|")

  for (let li = bodyStart; li < lines.length; li++) {
    const raw = normalizeLabels(lines[li])
    // Skip directives we don't model (subgraph, classDef, style, click, etc.).
    if (/^(subgraph|end|classDef|class|style|click|linkStyle|direction)\b/.test(raw)) {
      if (/^subgraph\b/.test(raw)) warnings.push("`subgraph` grouping is flattened; nodes are kept, the grouping is dropped.")
      continue
    }

    if (!LINK_RE.test(raw)) {
      // A standalone node definition line.
      const node = parseNodeToken(raw)
      if (node) ensureNode(node)
      continue
    }

    // Split into [nodePart, link, nodePart, link, …] preserving link tokens.
    const parts = raw.split(LINK_RE)
    // parts: even indices = node parts, odd indices = link operators.
    let prev: ParsedNode | null = null
    for (let p = 0; p < parts.length; p += 2) {
      let nodePart = parts[p].trim()
      let edgeLabel: string | undefined
      // A leading `|label|` belongs to the link that precedes this node part.
      const pipe = nodePart.match(/^\|([^|]*)\|\s*(.*)$/)
      if (pipe) {
        edgeLabel = stripQuotes(pipe[1])
        nodePart = pipe[2].trim()
      }
      // Multiple targets via `A & B`: take the first; warn on the rest.
      if (nodePart.includes("&")) {
        warnings.push('Multiple nodes joined with "&" — only the first is linked in this alpha.')
        nodePart = nodePart.split("&")[0].trim()
      }
      const node = parseNodeToken(nodePart)
      if (!node) {
        prev = null
        continue
      }
      ensureNode(node)
      if (prev) {
        edges.push({ source: prev.id, target: node.id, ...(edgeLabel ? { label: edgeLabel } : {}) })
      }
      prev = node
    }
  }

  if (nodeMap.size === 0) {
    warnings.push("No nodes found.")
    return empty()
  }

  layerGraph(nodeMap, edges, warnings)

  return {
    kind: "flowchart",
    direction,
    nodes: [...nodeMap.values()],
    edges,
    ...(warnings.length ? { warnings } : {}),
  }
}

// ── Longest-path layering (Kahn topological order) ───────────────────────────

function layerGraph(
  nodeMap: Map<string, MermaidNode>,
  edges: MermaidEdge[],
  warnings: string[],
): void {
  const adjacency = new Map<string, string[]>()
  const indegree = new Map<string, number>()
  for (const id of nodeMap.keys()) {
    adjacency.set(id, [])
    indegree.set(id, 0)
  }
  for (const e of edges) {
    if (e.source === e.target) continue // self-loop: ignore for layering
    if (!nodeMap.has(e.source) || !nodeMap.has(e.target)) continue
    adjacency.get(e.source)!.push(e.target)
    indegree.set(e.target, (indegree.get(e.target) || 0) + 1)
  }

  // Kahn's algorithm; relax layer = max(incoming) + 1 in topological order.
  const queue: string[] = []
  for (const [id, deg] of indegree) if (deg === 0) queue.push(id)

  let processed = 0
  while (queue.length > 0) {
    const u = queue.shift()!
    processed++
    const lu = nodeMap.get(u)!.layer
    for (const v of adjacency.get(u)!) {
      const node = nodeMap.get(v)!
      if (lu + 1 > node.layer) node.layer = lu + 1
      const d = (indegree.get(v) || 0) - 1
      indegree.set(v, d)
      if (d === 0) queue.push(v)
    }
  }

  if (processed < nodeMap.size) {
    // A cycle prevented a full topological order; the unprocessed nodes keep
    // their best-effort layer. Mermaid flowcharts may legitimately cycle.
    warnings.push("Graph contains a cycle; layering is best-effort (not a strict DAG).")
  }

  // Assign rows: order within each layer by insertion order (the node's initial row).
  const byLayer = new Map<number, MermaidNode[]>()
  for (const node of nodeMap.values()) {
    const list = byLayer.get(node.layer) || []
    list.push(node)
    byLayer.set(node.layer, list)
  }
  for (const list of byLayer.values()) {
    list.sort((a, b) => a.row - b.row)
    list.forEach((node, i) => {
      node.row = i
    })
  }
}
