import type { SemanticViabilityCheck } from "./chartCapabilityTypes"

const registryKey = Symbol.for("semiotic.semantic-viability")
const registryHost = globalThis as unknown as Record<symbol, unknown>
function registeredChecks(): Map<string, SemanticViabilityCheck | undefined> | undefined {
  return registryHost[registryKey] as Map<string, SemanticViabilityCheck | undefined> | undefined
}

export function setRegisteredSemanticViability(
  component: string,
  check: SemanticViabilityCheck | undefined
): void {
  const checks = registeredChecks() ?? (registryHost[registryKey] = new Map()) as Map<string, SemanticViabilityCheck | undefined>
  checks.set(component, check)
}

export function deleteRegisteredSemanticViability(component: string): void {
  registeredChecks()?.delete(component)
}

export function hasRegisteredSemanticViability(component: string): boolean {
  return registeredChecks()?.has(component) ?? false
}

export function getRegisteredSemanticViability(
  component: string
): SemanticViabilityCheck | undefined {
  return registeredChecks()?.get(component)
}
