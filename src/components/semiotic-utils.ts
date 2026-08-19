/**
 * semiotic/utils — Shared utilities, ThemeProvider, and data helpers.
 *
 * Import from "semiotic/utils" for the full utilities surface.
 */

export * from "./semiotic-utils-core"
// `resolveResponsiveDimension` deliberately comes from the React-free core
// entry above. Re-export the remaining React helpers explicitly: a second
// `export *` here makes the browser facade expose the same name from both
// sub-bundles, which webpack rightly reports as an ambiguous star export.
export {
  ThemeProvider,
  useTheme,
  useReducedMotion,
  useHighContrast,
  useResponsiveSize,
} from "./semiotic-utils-react"
