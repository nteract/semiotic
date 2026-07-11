/**
 * Operation-level limits for the hosted MCP service.
 *
 * The HTTP body cap protects transport memory, but a small JSON payload can
 * still describe enough rows, fields, or nesting to make profiling/layout
 * expensive. Keep this dependency-free and iterative: it runs before the MCP
 * server is constructed, so it must not depend on a chart/runtime module.
 */

export const DEFAULT_MCP_MAX_ROWS = 10_000
export const DEFAULT_MCP_MAX_CELLS = 100_000
export const DEFAULT_MCP_MAX_NESTING_DEPTH = 64

export type McpOperationLimits = {
  maxRows: number
  maxCells: number
  maxNestingDepth: number
}

export type McpOperationLimitName = "rows" | "cells" | "nestingDepth"

export type McpOperationLimitResult =
  | {
      ok: true
      rows: number
      cells: number
      nestingDepth: number
    }
  | {
      ok: false
      limit: McpOperationLimitName
      observed: number
      maximum: number
    }

type LimitEnvironment = Record<string, string | undefined>

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

/** Resolve limits once at service startup, with safe defaults for hosted use. */
export function resolveMcpOperationLimits(
  env: LimitEnvironment = process.env,
): McpOperationLimits {
  return {
    maxRows: positiveInteger(env.MCP_MAX_ROWS, DEFAULT_MCP_MAX_ROWS),
    maxCells: positiveInteger(env.MCP_MAX_CELLS, DEFAULT_MCP_MAX_CELLS),
    maxNestingDepth: positiveInteger(
      env.MCP_MAX_NESTING_DEPTH,
      DEFAULT_MCP_MAX_NESTING_DEPTH,
    ),
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object"
}

/**
 * Count all collection entries and object fields in one tool's arguments.
 *
 * JSON cannot contain reference cycles, but a WeakSet keeps this safe for
 * direct callers/tests too. Arrays count toward the row budget regardless of
 * their property name, which also bounds annotations, network edges, nested
 * hierarchy children, and any future data-bearing prop rather than only the
 * current `data` spelling.
 */
export function inspectMcpOperationInput(
  input: unknown,
  limits: McpOperationLimits,
): McpOperationLimitResult {
  let rows = 0
  let cells = 0
  let nestingDepth = 0
  const seen = new WeakSet<object>()
  const stack: Array<{ value: unknown; depth: number }> = [{ value: input, depth: 0 }]

  while (stack.length > 0) {
    const current = stack.pop()!
    const { value, depth } = current
    if (!isObject(value) || seen.has(value)) continue

    seen.add(value)
    nestingDepth = Math.max(nestingDepth, depth)
    if (nestingDepth > limits.maxNestingDepth) {
      return {
        ok: false,
        limit: "nestingDepth",
        observed: nestingDepth,
        maximum: limits.maxNestingDepth,
      }
    }

    if (Array.isArray(value)) {
      rows += value.length
      if (rows > limits.maxRows) {
        return { ok: false, limit: "rows", observed: rows, maximum: limits.maxRows }
      }
      for (let index = value.length - 1; index >= 0; index--) {
        stack.push({ value: value[index], depth: depth + 1 })
      }
      continue
    }

    const keys = Object.keys(value)
    cells += keys.length
    if (cells > limits.maxCells) {
      return { ok: false, limit: "cells", observed: cells, maximum: limits.maxCells }
    }
    for (let index = keys.length - 1; index >= 0; index--) {
      stack.push({ value: value[keys[index]], depth: depth + 1 })
    }
  }

  return { ok: true, rows, cells, nestingDepth }
}

/** Stable, user-visible error text for an operation rejected before dispatch. */
export function formatMcpOperationLimitError(result: McpOperationLimitResult): string {
  if (result.ok) return ""

  switch (result.limit) {
    case "rows":
      return `Tool arguments exceed the collection-entry limit (${result.observed} > ${result.maximum}; set MCP_MAX_ROWS to adjust).`
    case "cells":
      return `Tool arguments exceed the object-field limit (${result.observed} > ${result.maximum}; set MCP_MAX_CELLS to adjust).`
    case "nestingDepth":
      return `Tool arguments exceed the nesting-depth limit (${result.observed} > ${result.maximum}; set MCP_MAX_NESTING_DEPTH to adjust).`
  }
}
