import type { SemanticViabilityCheck } from "./chartCapabilityTypes"

const registryKey = Symbol.for("semiotic.semantic-viability")
const registryHost = globalThis as unknown as Record<symbol, unknown>
const registeredChecks = (registryHost[registryKey] ??= new Map()) as Map<
  string,
  SemanticViabilityCheck | undefined
>

export function setRegisteredSemanticViability(
  component: string,
  check: SemanticViabilityCheck | undefined
): void {
  registeredChecks.set(component, check)
}

export function deleteRegisteredSemanticViability(component: string): void {
  registeredChecks.delete(component)
}

export function hasRegisteredSemanticViability(component: string): boolean {
  return registeredChecks.has(component)
}

export function getRegisteredSemanticViability(
  component: string
): SemanticViabilityCheck | undefined {
  return registeredChecks.get(component)
}
