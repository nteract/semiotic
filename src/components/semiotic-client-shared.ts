/**
 * Internal ESM anchor for React utilities that must share the same module
 * instance as chart-family bundles. Public facades are emitted as tiny
 * pass-through modules by the build.
 */

export { ThemeProvider, useTheme } from "./ThemeProvider"
export { useReducedMotion, useHighContrast } from "./stream/useMediaPreferences"
export { useCustomLayoutSelection } from "./stream/customLayoutSelection"
export { useObservationSelector } from "./store/ObservationStore"
export { useSelectionSelector } from "./store/SelectionStore"
