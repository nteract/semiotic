import type { IntentId, IntentDescriptor } from "./intents"

interface IntentRegistryStore {
  intents: Map<IntentId, IntentDescriptor>
}

// `semiotic/ai` and `semiotic/ai/core` are intentionally independent entry
// bundles. Put the runtime extension point on the realm-global symbol registry
// so registering an intent through either public entry is immediately visible
// to the other (as recipe and numeric-contract registries already are).
const REGISTRY_KEY = Symbol.for("semiotic.intentRegistry")

export function intentRegistryStore(): IntentRegistryStore {
  const root = globalThis as typeof globalThis & {
    [REGISTRY_KEY]?: IntentRegistryStore
  }
  root[REGISTRY_KEY] ??= {
    intents: new Map(),
  }
  return root[REGISTRY_KEY]
}

function resolveComposedScore(
  id: IntentId,
  scores: Readonly<Partial<Record<IntentId, number>>>,
  visiting: Set<IntentId>,
): number | undefined {
  const direct = scores[id]
  if (Number.isFinite(direct)) return direct

  const descriptor = intentRegistryStore().intents.get(id)
  if (!descriptor?.composes?.length || visiting.has(id)) return undefined
  visiting.add(id)

  let weightedScore = 0
  let totalWeight = 0
  for (const child of descriptor.composes) {
    const weight = descriptor.weights?.[child] ?? 1
    if (!Number.isFinite(weight) || weight <= 0) continue
    const childScore = resolveComposedScore(child, scores, visiting) ?? 0
    weightedScore += childScore * weight
    totalWeight += weight
  }
  visiting.delete(id)
  return totalWeight > 0 ? weightedScore / totalWeight : undefined
}

/**
 * Materialize requested composed intent scores over a capability's existing
 * scores. Only requested ids are added: registering an intent cannot silently
 * change no-intent/default ranking by adding another value to its mean.
 */
export function expandComposedIntentScores(
  scores: Readonly<Partial<Record<IntentId, number>>>,
  requested: ReadonlyArray<IntentId>,
): Partial<Record<IntentId, number>> {
  const expanded: Partial<Record<IntentId, number>> = { ...scores }
  for (const intent of requested) {
    if (Number.isFinite(expanded[intent])) continue
    const composed = resolveComposedScore(intent, expanded, new Set())
    if (composed !== undefined) expanded[intent] = composed
  }
  return expanded
}

