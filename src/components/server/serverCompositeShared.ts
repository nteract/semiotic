import type { Datum } from "../charts/shared/datumTypes"
import type { RenderEvidence } from "./renderEvidence"
import type {
  ServerAccessor,
  ServerChartData,
  ServerColorScheme
} from "./serverChartConfigShared"

// Helpers shared by the composite server charts (MinimapChart and
// ScatterplotMatrix), which receive their props as one opaque payload.

export interface CompositePayload {
  data: ServerChartData
  colorBy: ServerAccessor | undefined
  colorScheme: ServerColorScheme
  common: Datum
  rest: Datum
}

export function readPayload(frameProps: Datum): CompositePayload {
  return frameProps.__composite as CompositePayload
}

export function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

export function placedSvg(svg: string, x: number, y: number, part: string): string {
  return svg.replace(
    /^<svg\b/,
    `<svg x="${x}" y="${y}" data-semiotic-composite-part="${part}"`
  )
}

export function mergedPartEvidence(
  parts: ReadonlyArray<RenderEvidence | undefined>,
  type: keyof RenderEvidence
): [number, number] | undefined {
  for (const part of parts) {
    const value = part?.[type]
    if (
      Array.isArray(value) &&
      value.length === 2 &&
      typeof value[0] === "number" &&
      typeof value[1] === "number"
    ) {
      return value as [number, number]
    }
  }
  return undefined
}
