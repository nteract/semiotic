/**
 * Utilities React-only surface.
 */

export { ThemeProvider, useTheme } from "./ThemeProvider"
export { useReducedMotion, useHighContrast } from "./stream/useMediaPreferences"
export {
  useResponsiveSize,
  resolveResponsiveDimension,
} from "./stream/useResponsiveSize"
export type { ResponsiveSizeOptions } from "./stream/useResponsiveSize"
