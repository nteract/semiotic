import type { PhysicsBodyState, PhysicsColliderBodyFilter } from "./PhysicsKernel"

/** Read an own-property path without bringing the simulation into controllers. */
export function valueAtPath(source: unknown, path: string): unknown {
  if (!path) return undefined
  let current = source
  for (const part of path.split(".")) {
    if (current == null || typeof current !== "object") return undefined
    if (!Object.prototype.hasOwnProperty.call(current, part)) return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function valueIn(value: unknown, options: unknown[] | undefined): boolean {
  return Boolean(options?.some((candidate) => Object.is(value, candidate)))
}

/** Shared permeability rules for collisions, sensors, and process controllers. */
export function matchesPhysicsBodyFilter(
  body: PhysicsBodyState,
  filter: PhysicsColliderBodyFilter | undefined
): boolean {
  if (!filter) return true
  if (typeof filter === "function") return filter(body)
  const value = valueAtPath(body, filter.property)
  if ("equals" in filter && !Object.is(value, filter.equals)) return false
  if ("notEquals" in filter && Object.is(value, filter.notEquals)) return false
  if (filter.oneOf && !valueIn(value, filter.oneOf)) return false
  if (filter.notOneOf && valueIn(value, filter.notOneOf)) return false
  return true
}
