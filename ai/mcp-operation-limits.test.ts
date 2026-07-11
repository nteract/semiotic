import {
  DEFAULT_MCP_MAX_CELLS,
  DEFAULT_MCP_MAX_NESTING_DEPTH,
  DEFAULT_MCP_MAX_ROWS,
  formatMcpOperationLimitError,
  inspectMcpOperationInput,
  resolveMcpOperationLimits,
} from "./mcp-operation-limits"

const generousLimits = {
  maxRows: 100,
  maxCells: 100,
  maxNestingDepth: 100,
}

describe("MCP operation limits", () => {
  it("uses positive environment overrides and keeps safe defaults for invalid values", () => {
    expect(resolveMcpOperationLimits({
      MCP_MAX_ROWS: "25",
      MCP_MAX_CELLS: "60",
      MCP_MAX_NESTING_DEPTH: "12",
    })).toEqual({ maxRows: 25, maxCells: 60, maxNestingDepth: 12 })

    expect(resolveMcpOperationLimits({
      MCP_MAX_ROWS: "0",
      MCP_MAX_CELLS: "not-a-number",
      MCP_MAX_NESTING_DEPTH: "-4",
    })).toEqual({
      maxRows: DEFAULT_MCP_MAX_ROWS,
      maxCells: DEFAULT_MCP_MAX_CELLS,
      maxNestingDepth: DEFAULT_MCP_MAX_NESTING_DEPTH,
    })
  })

  it("counts every collection entry, including nested chart collections", () => {
    const result = inspectMcpOperationInput({
      props: {
        data: [{ x: 1 }, { x: 2 }],
        annotations: [{ label: "first" }, { label: "second" }],
      },
    }, { ...generousLimits, maxRows: 3 })

    expect(result).toEqual({ ok: false, limit: "rows", observed: 4, maximum: 3 })
    expect(formatMcpOperationLimitError(result)).toContain("MCP_MAX_ROWS")
  })

  it("bounds object fields separately from collection length", () => {
    const result = inspectMcpOperationInput({
      props: { data: [{ a: 1, b: 2, c: 3 }] },
    }, { ...generousLimits, maxCells: 4 })

    expect(result).toEqual({ ok: false, limit: "cells", observed: 5, maximum: 4 })
    expect(formatMcpOperationLimitError(result)).toContain("MCP_MAX_CELLS")
  })

  it("uses an iterative nesting walk and rejects excessive depth", () => {
    const result = inspectMcpOperationInput({
      one: { two: { three: { four: {} } } },
    }, { ...generousLimits, maxNestingDepth: 3 })

    expect(result).toEqual({ ok: false, limit: "nestingDepth", observed: 4, maximum: 3 })
    expect(formatMcpOperationLimitError(result)).toContain("MCP_MAX_NESTING_DEPTH")
  })
})
