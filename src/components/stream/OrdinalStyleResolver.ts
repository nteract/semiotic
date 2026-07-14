import type { Datum } from "../charts/shared/datumTypes"
import { STREAMING_PALETTE } from "../charts/shared/colorUtils"
import type { OrdinalPipelineConfig } from "./ordinalTypes"
import type { Style } from "./types"

/** Resolves ordinal mark styles while retaining stable category colors. */
export class OrdinalStyleResolver {
  private colorSchemeMap = new Map<string, string>()
  private colorSchemeIndex = 0

  resetColors(): void {
    this.colorSchemeMap.clear()
    this.colorSchemeIndex = 0
  }

  resolvePieceStyle(
    config: OrdinalPipelineConfig,
    datum: Datum,
    category?: string
  ): Style {
    if (typeof config.pieceStyle === "function") {
      const style = config.pieceStyle(datum, category)
      if (style && !style.fill && category) {
        return { ...style, fill: this.getColorFromScheme(config, category) }
      }
      return style
    }
    if (config.pieceStyle && typeof config.pieceStyle === "object") {
      return config.pieceStyle as Style
    }
    if (config.barColors && category) {
      return { fill: config.barColors[category] || "#007bff" }
    }
    return { fill: category ? this.getColorFromScheme(config, category) : "#007bff" }
  }

  resolveSummaryStyle(
    config: OrdinalPipelineConfig,
    datum: Datum,
    category?: string
  ): Style {
    if (typeof config.summaryStyle === "function") {
      return config.summaryStyle(datum, category)
    }
    if (config.summaryStyle && typeof config.summaryStyle === "object") {
      return config.summaryStyle as Style
    }
    return {
      fill: "#007bff",
      fillOpacity: 0.6,
      stroke: "#007bff",
      strokeWidth: 1
    }
  }

  private getColorFromScheme(
    config: OrdinalPipelineConfig,
    key: string
  ): string {
    const existing = this.colorSchemeMap.get(key)
    if (existing) return existing

    const palette = Array.isArray(config.colorScheme)
      ? config.colorScheme
      : config.themeCategorical || STREAMING_PALETTE
    const color = palette[this.colorSchemeIndex % palette.length]
    this.colorSchemeIndex++
    this.colorSchemeMap.set(key, color)
    return color
  }
}
