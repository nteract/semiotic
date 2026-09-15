import type { NetworkPipelineConfig } from "./networkTypes"
import type { CustomLayoutSelection } from "./customLayoutSelection"
import { shallowEqualTwoLevel } from "./shallowEqual"

function layoutKey(
  config: NetworkPipelineConfig,
  size: [number, number],
  dataRevision: number,
  layoutVersion: number
) {
  return {
    // Compare these by identity, including layoutConfig. No graph traversal.
    // Explicit runLayout()/ref.relayout() advances layoutVersion.
    geometry: [
      dataRevision,
      layoutVersion,
      ...size,
      config.customNetworkLayout,
      config.layoutConfig
    ],
    // Theme resolution recreates small color bags on unrelated prop changes.
    colors: {
      semantic: config.themeSemantic,
      categorical: config.themeCategorical,
      colorScheme: config.colorScheme
    },
    selection: [
      config.layoutSelection?.isActive ?? false,
      config.layoutSelection?.predicate,
      config.layoutSelection != null
    ]
  }
}

type LayoutKey = ReturnType<typeof layoutKey>

/** One successful input state per store; failures remain retriable. */
export class NetworkCustomLayoutCache {
  private key: LayoutKey | null = null
  private pending: LayoutKey | null = null

  constructor(
    private restyle: (selection: CustomLayoutSelection | null) => void
  ) {}

  reuse(
    config: NetworkPipelineConfig,
    size: [number, number],
    dataRevision: number,
    layoutVersion: number,
    hasRestyle: boolean
  ): boolean {
    const key = layoutKey(config, size, dataRevision, layoutVersion)
    const sameSelection =
      this.key !== null &&
      shallowEqualTwoLevel(this.key.selection, key.selection)
    if (
      this.key &&
      shallowEqualTwoLevel(this.key.geometry, key.geometry) &&
      shallowEqualTwoLevel(this.key.colors, key.colors) &&
      (hasRestyle || sameSelection)
    ) {
      if (!sameSelection) this.restyle(config.layoutSelection ?? null)
      this.key = key
      return true
    }
    // Do not reuse a former success after an intervening failed attempt.
    this.key = null
    this.pending = key
    return false
  }

  commit(): void {
    this.key = this.pending
    this.pending = null
  }

  clear(): void {
    this.key = null
    this.pending = null
  }
}
