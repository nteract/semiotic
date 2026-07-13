import { schemeCategory10 } from "../charts/shared/colorPalettes"
import type {
  NetworkLayoutContext,
  NetworkLayoutResult
} from "./networkCustomLayout"
import {
  resolveCustomLayoutPalette,
  buildResolveColor
} from "./customLayoutPalette"
import {
  createCustomLayoutFailureDiagnostic,
  type CustomLayoutFailureDiagnostic
} from "./customLayoutFailure"
import type {
  NetworkPipelineConfig,
  RealtimeEdge,
  RealtimeNode
} from "./networkTypes"

interface NetworkCustomLayoutRunInput {
  config: NetworkPipelineConfig
  customLayout: NonNullable<NetworkPipelineConfig["customNetworkLayout"]>
  size: [number, number]
  nodes: RealtimeNode[]
  edges: RealtimeEdge[]
  previousResult: NetworkLayoutResult | null
  revision: number
}

export type NetworkCustomLayoutRunResult =
  | { kind: "success"; result: NetworkLayoutResult }
  | {
      kind: "failure"
      diagnostic: CustomLayoutFailureDiagnostic
      preservedLastGoodScene: boolean
    }

/** Runs user-provided network layout code behind the common failure boundary. */
export function runNetworkCustomLayout({
  config,
  customLayout,
  size,
  nodes,
  edges,
  previousResult,
  revision
}: NetworkCustomLayoutRunInput): NetworkCustomLayoutRunResult {
  const palette = resolveCustomLayoutPalette(
    config.colorScheme,
    config.themeCategorical,
    schemeCategory10 as readonly string[]
  )
  const context: NetworkLayoutContext = {
    nodes,
    edges,
    dimensions: {
      width: size[0],
      height: size[1],
      plot: { x: 0, y: 0, width: size[0], height: size[1] }
    },
    theme: {
      semantic: config.themeSemantic ?? {},
      categorical: [...palette]
    },
    resolveColor: buildResolveColor(palette, config.colorScheme),
    config: (config.layoutConfig ?? {}) as Record<string, unknown>,
    selection: config.layoutSelection ?? null
  }

  try {
    return { kind: "success", result: customLayout(context) }
  } catch (error) {
    const preservedLastGoodScene = previousResult !== null
    const diagnostic = createCustomLayoutFailureDiagnostic(
      "network",
      error,
      preservedLastGoodScene,
      revision
    )
    if (process.env.NODE_ENV !== "production") {
      console.error("[semiotic] customNetworkLayout threw:", error)
    }
    try {
      config.onLayoutError?.(diagnostic)
    } catch (callbackError) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[semiotic] onLayoutError threw:", callbackError)
      }
    }
    return { kind: "failure", diagnostic, preservedLastGoodScene }
  }
}
