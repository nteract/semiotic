/**
 * semiotic/utils — Shared utilities, ThemeProvider, and data helpers.
 *
 * Lightweight entry point for consumers that need the theme system,
 * format utilities, data transforms, or color constants without pulling
 * in any chart type bundles. Import from "semiotic/utils" instead of
 * "semiotic" to keep bundle size minimal.
 */

// ── Theme ────────────────────────────────────────────────────────────────
export { ThemeProvider, useTheme } from "./ThemeProvider"
export type { SemioticTheme } from "./store/ThemeStore"
export {
  LIGHT_THEME,
  DARK_THEME,
  HIGH_CONTRAST_THEME,
  COLOR_BLIND_SAFE_CATEGORICAL,
} from "./store/ThemeStore"
export {
  themeToCSS,
  themeToTokens,
  resolveThemePreset,
  THEME_PRESETS,
  CARBON_CATEGORICAL_14,
  CARBON_ALERT,
} from "./semiotic-themes"
export type { ThemePresetName } from "./semiotic-themes"

// ── Format utilities ─────────────────────────────────────────────────────
export { adaptiveTimeTicks, smartTickFormat } from "./charts/shared/formatUtils"

// ── Color manipulation ───────────────────────────────────────────────────
export { darkenColor, lightenColor } from "./charts/shared/colorManipulation"

// ── Pattern fills ────────────────────────────────────────────────────────
export { createHatchPattern } from "./charts/shared/hatchPattern"
export type { HatchPatternOptions } from "./charts/shared/hatchPattern"

// ── Validation ───────────────────────────────────────────────────────────
export { validateProps } from "./charts/shared/validateProps"
export { diagnoseConfig } from "./charts/shared/diagnoseConfig"

// ── Serialization ────────────────────────────────────────────────────────
export { toConfig, fromConfig, toURL, fromURL, copyConfig, configToJSX } from "./export/chartConfig"
export type { ChartConfig, ToConfigOptions, CopyFormat } from "./export/chartConfig"
export { serializeSelections, deserializeSelections } from "./export/selectionSerializer"
export type { SerializedSelections, SerializedSelection, SerializedFieldSelection } from "./export/selectionSerializer"
export { exportChart } from "./export/exportChart"

// ── Vega-Lite translator ─────────────────────────────────────────────────
export { fromVegaLite } from "./data/fromVegaLite"
export type { VegaLiteSpec, VegaLiteEncoding } from "./data/fromVegaLite"

// ── Data structures ──────────────────────────────────────────────────────
export { RingBuffer } from "./realtime/RingBuffer"
export { IncrementalExtent } from "./realtime/IncrementalExtent"

// ── Tooltip utilities ────────────────────────────────────────────────────
export { normalizeTooltip } from "./Tooltip/Tooltip"

// ── Accessibility hooks ─────────────────────────────────────────────────
export { useReducedMotion, useHighContrast } from "./stream/useMediaPreferences"
