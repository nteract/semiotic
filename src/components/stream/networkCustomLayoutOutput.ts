import type { ReactNode } from "react"
import type {
  NetworkHtmlMark,
  NetworkLayoutResult
} from "./networkCustomLayout"

/** Mutable custom-layout output fields owned by NetworkPipelineStore. */
export interface NetworkCustomLayoutOutputTarget {
  customLayoutBackgrounds: ReactNode
  customLayoutOverlays: ReactNode
  customLayoutHtmlMarks: NetworkHtmlMark[]
  lastCustomLayoutResult: NetworkLayoutResult | null
}

/** Apply the non-scene output from one successful custom-layout result atomically. */
export function applyNetworkCustomLayoutOutput(
  target: NetworkCustomLayoutOutputTarget,
  result: NetworkLayoutResult
): void {
  target.customLayoutBackgrounds = result.backgrounds ?? null
  target.customLayoutOverlays = result.overlays ?? null
  target.customLayoutHtmlMarks = result.htmlMarks ?? []
  target.lastCustomLayoutResult = result
}

/** Clear every non-scene custom-layout output when its owning layout is gone. */
export function clearNetworkCustomLayoutOutput(
  target: NetworkCustomLayoutOutputTarget
): void {
  target.customLayoutBackgrounds = null
  target.customLayoutOverlays = null
  target.customLayoutHtmlMarks = []
  target.lastCustomLayoutResult = null
}
