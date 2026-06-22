import { describe, expect, it, vi } from "vitest"
import { fromMermaid } from "./fromMermaid"

vi.spyOn(console, "warn").mockImplementation(() => {})

const byId = (result: ReturnType<typeof fromMermaid>) =>
  Object.fromEntries(result.nodes.map((n) => [n.id, n]))

describe("fromMermaid — parsing", () => {
  it("parses a simple graph TD into nodes, edges, and a layering", () => {
    const r = fromMermaid("graph TD\n  A --> B")
    expect(r.kind).toBe("flowchart")
    expect(r.direction).toBe("TD")
    expect(r.nodes.map((n) => n.id).sort()).toEqual(["A", "B"])
    expect(r.edges).toEqual([{ source: "A", target: "B" }])
    const nodes = byId(r)
    expect(nodes.A.layer).toBe(0)
    expect(nodes.B.layer).toBe(1)
  })

  it("reads the direction (LR)", () => {
    expect(fromMermaid("flowchart LR\n A-->B").direction).toBe("LR")
  })

  it("parses node shapes and labels", () => {
    const r = fromMermaid("graph TD\n A[Start] --> B{Decision}\n B --> C((Done))")
    const n = byId(r)
    expect(n.A).toMatchObject({ label: "Start", shape: "rect" })
    expect(n.B).toMatchObject({ label: "Decision", shape: "diamond" })
    expect(n.C).toMatchObject({ label: "Done", shape: "circle" })
  })

  it("captures pipe edge labels and mid-arrow text labels", () => {
    const pipe = fromMermaid("graph TD\n A -->|Yes| B")
    expect(pipe.edges[0]).toEqual({ source: "A", target: "B", label: "Yes" })
    const mid = fromMermaid("graph LR\n A -- ships --> B")
    expect(mid.edges[0]).toEqual({ source: "A", target: "B", label: "ships" })
  })

  it("handles an edge chain on one line", () => {
    const r = fromMermaid("graph TD\n A --> B --> C")
    expect(r.edges).toEqual([
      { source: "A", target: "B" },
      { source: "B", target: "C" },
    ])
    expect(byId(r).C.layer).toBe(2)
  })

  it("computes longest-path layers (a diamond reconverges at the deeper layer)", () => {
    // A→B→D and A→C→D plus a direct A→D shortcut. D's layer is the longest path (2).
    const r = fromMermaid("graph TD\n A-->B\n A-->C\n B-->D\n C-->D\n A-->D")
    const n = byId(r)
    expect(n.A.layer).toBe(0)
    expect(n.B.layer).toBe(1)
    expect(n.C.layer).toBe(1)
    expect(n.D.layer).toBe(2)
    // B and C share layer 1 → distinct rows
    expect(new Set([n.B.row, n.C.row]).size).toBe(2)
  })

  it("survives a cycle without crashing and warns", () => {
    const r = fromMermaid("graph TD\n A-->B\n B-->A")
    expect(r.nodes.map((n) => n.id).sort()).toEqual(["A", "B"])
    expect(r.warnings!.some((w) => /cycle/i.test(w))).toBe(true)
  })

  it("flattens subgraphs with a warning, keeping the nodes", () => {
    const r = fromMermaid("graph TD\n subgraph G\n A-->B\n end\n B-->C")
    expect(r.nodes.map((n) => n.id).sort()).toEqual(["A", "B", "C"])
    expect(r.warnings!.some((w) => /subgraph/i.test(w))).toBe(true)
  })
})

describe("fromMermaid — refuses non-flowchart diagrams (D7)", () => {
  it("declines a sequenceDiagram with a reason rather than mistranslating", () => {
    const r = fromMermaid("sequenceDiagram\n Alice->>John: Hello")
    expect(r.nodes).toEqual([])
    expect(r.edges).toEqual([])
    expect(r.warnings!.some((w) => /diagrams aren't supported/.test(w))).toBe(true)
  })

  it("declines a mindmap (deferred to beta)", () => {
    const r = fromMermaid("mindmap\n root\n  child")
    expect(r.nodes).toEqual([])
    expect(r.warnings!.some((w) => /aren't supported/.test(w))).toBe(true)
  })
})
