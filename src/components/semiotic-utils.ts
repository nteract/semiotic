/**
 * semiotic/utils — Shared utilities and ThemeProvider.
 *
 * Lightweight entry point for consumers that need the theme system,
 * format utilities, or color constants without pulling in any chart
 * type bundles. Import from "semiotic/utils" instead of "semiotic"
 * to keep bundle size minimal.
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

// ── Format utilities ─────────────────────────────────────────────────────
export { adaptiveTimeTicks, smartTickFormat } from "./charts/shared/formatUtils"

// ── Pattern fills ────────────────────────────────────────────────────────
export { createHatchPattern } from "./charts/shared/hatchPattern"

// ── Validation ───────────────────────────────────────────────────────────
export { validateProps } from "./charts/shared/validateProps"
export { diagnoseConfig } from "./charts/shared/diagnoseConfig"

// ── Serialization ────────────────────────────────────────────────────────
export { toConfig, fromConfig, toURL, fromURL, copyConfig, configToJSX } from "./export/chartConfig"
export { exportChart } from "./export/exportChart"
