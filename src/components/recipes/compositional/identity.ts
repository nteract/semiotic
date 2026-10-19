import type { Diagnostic, EndpointRef, LocalEndpointRef } from "./types"

export const wholeNode: LocalEndpointRef = Object.freeze({ kind: "node" })

/** Collision-free identity, including IDs containing separators or quotes. */
export function compositionalEndpointKey(ref: EndpointRef): string {
  return JSON.stringify([
    ref.nodeId,
    ref.endpoint.kind,
    ref.endpoint.kind === "part" ? ref.endpoint.partId : null,
    ref.endpoint.portId ?? null
  ])
}

export function endpoint(
  nodeId: string,
  local: LocalEndpointRef = wholeNode
): EndpointRef {
  return { nodeId, endpoint: local }
}

export function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Canonical JSON with sorted object keys; arrays retain semantic order. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => compareIds(a, b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`
  return JSON.stringify(value) ?? "null"
}

export function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value)) freeze(child)
  }
  return value
}

export class CompositionalGraphError extends Error {
  constructor(public readonly diagnostics: readonly Diagnostic[]) {
    super(diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"))
    this.name = "CompositionalGraphError"
  }
}

export function fail(
  code: string,
  message: string,
  context: Partial<Diagnostic> = {}
): never {
  throw new CompositionalGraphError([
    { code, message, severity: "error", ...context }
  ])
}
