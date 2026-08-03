import { describe, expect, it } from "vitest"
import {
  validateProcessSankey,
  partitionProcessSankeyIssues,
  applyProcessSankeyValidationPolicy,
  PROCESS_SANKEY_VALIDATION_POLICY,
  type ProcessSankeyUsageMode,
} from "./validation"
import type { ProcessSankeyEdge, ProcessSankeyNode } from "./processSankeyTypes"

const nodes: ProcessSankeyNode[] = [
  { id: "A" },
  { id: "A" }, // duplicate
  { id: "B" },
]
const edges: ProcessSankeyEdge[] = [
  {
    id: "e1",
    source: "A",
    target: "B",
    value: 2,
    startTime: 0,
    endTime: 10,
    systemInTime: Number.NaN,
  },
]

describe("ProcessSankey validation policy (M6)", () => {
  it("documents the mode matrix", () => {
    expect(PROCESS_SANKEY_VALIDATION_POLICY).toEqual({
      static: { duplicateIds: "fatal", invalidSystemTime: "warn" },
      mcp: { duplicateIds: "fatal", invalidSystemTime: "warn" },
      push: { duplicateIds: "warn", invalidSystemTime: "strip" },
    })
  })

  for (const mode of ["static", "mcp"] as ProcessSankeyUsageMode[]) {
    it(`${mode}: duplicate ids are fatal`, () => {
      const issues = validateProcessSankey(nodes, edges, [0, 100], { usageMode: mode })
      const { fatal, warnings } = partitionProcessSankeyIssues(issues)
      expect(fatal.some((i) => i.kind === "duplicate-node")).toBe(true)
      expect(warnings.some((i) => i.kind === "invalid-system-time")).toBe(true)
    })
  }

  it("push: duplicate ids warn and invalid system times are strip-eligible", () => {
    const issues = validateProcessSankey(nodes, edges, [0, 100], { usageMode: "push" })
    const { fatal, warnings } = partitionProcessSankeyIssues(issues)
    expect(fatal.some((i) => i.kind === "duplicate-node")).toBe(false)
    expect(warnings.some((i) => i.kind === "duplicate-node")).toBe(true)
    expect(warnings.some((i) => i.kind === "invalid-system-time")).toBe(true)

    const cleaned = applyProcessSankeyValidationPolicy(edges, issues, "push")
    expect(cleaned[0].systemInTime).toBeUndefined()
    // Original unmutated
    expect(edges[0].systemInTime).toBeNaN()
  })

  it("static: does not strip invalid system times", () => {
    const issues = validateProcessSankey(nodes, edges, [0, 100], { usageMode: "static" })
    const cleaned = applyProcessSankeyValidationPolicy(edges, issues, "static")
    expect(cleaned[0].systemInTime).toBeNaN()
  })
})
