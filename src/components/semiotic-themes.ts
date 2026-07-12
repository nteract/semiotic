/**
 * semiotic/themes — Named theme presets and serialization for Semiotic charts.
 *
 * Each theme provides light and dark mode variants as full SemioticTheme objects.
 * Use with ThemeProvider (from "semiotic/themes/react" or "semiotic"):
 * `<ThemeProvider theme={TUFTE_LIGHT} />` or by name `<ThemeProvider theme="tufte" />`.
 *
 * Also exports `themeToCSS()` and `themeToTokens()` for serialization.
 *
 * This entry is React-free (RSC/edge-safe) — it re-exports the theme core.
 * The `ThemeProvider`/`useTheme` React surface lives in "semiotic/themes/react".
 */

export * from "./semiotic-themes-core"
