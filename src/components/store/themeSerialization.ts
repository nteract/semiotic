import type { Datum } from "../charts/shared/datumTypes"
import type { SemioticTheme } from "./themeCore"
import { themeToCSSVariables } from "./themeCSSVariables"

export { themeToCSSVariables } from "./themeCSSVariables"

/**
 * Convert a SemioticTheme to a CSS custom properties string.
 * Useful for SSR or generating stylesheet content.
 *
 * @param theme - A SemioticTheme object
 * @param selector - CSS selector to scope the variables (default: `:root`)
 * @returns CSS string with custom properties
 *
 * @example
 * ```ts
 * const css = themeToCSS(TUFTE_LIGHT, ".my-charts")
 * // .my-charts {
 * //   --semiotic-bg: #fffff8;
 * //   --semiotic-text: #111111;
 * //   ...
 * // }
 * ```
 */
export function themeToCSS(theme: SemioticTheme, selector = ":root"): string {
  const vars = Object.entries(themeToCSSVariables(theme)).map(
    ([name, value]) => `  ${name}: ${value};`
  )
  return `${selector} {\n${vars.join("\n")}\n}`
}

/**
 * Convert a SemioticTheme to a design tokens JSON object.
 * Compatible with Style Dictionary / Design Token Community Group format.
 *
 * @example
 * ```ts
 * const tokens = themeToTokens(TUFTE_LIGHT)
 * // { semiotic: { bg: { $value: "#fffff8", $type: "color" }, ... } }
 * ```
 */
export function themeToTokens(theme: SemioticTheme): Datum {
  return {
    semiotic: {
      bg: { $value: theme.colors.background, $type: "color" },
      text: { $value: theme.colors.text, $type: "color" },
      "text-secondary": { $value: theme.colors.textSecondary, $type: "color" },
      grid: { $value: theme.colors.grid, $type: "color" },
      border: { $value: theme.colors.border, $type: "color" },
      primary: { $value: theme.colors.primary, $type: "color" },
      focus: { $value: theme.colors.focus || theme.colors.primary, $type: "color" },
      "font-family": { $value: theme.typography.fontFamily, $type: "fontFamily" },
      "border-radius": { $value: theme.borderRadius || "8px", $type: "dimension" },
      tooltip: {
        bg: { $value: theme.tooltip?.background || theme.colors.background, $type: "color" },
        text: { $value: theme.tooltip?.text || theme.colors.text, $type: "color" },
        radius: { $value: theme.tooltip?.borderRadius || "6px", $type: "dimension" },
        "font-size": { $value: theme.tooltip?.fontSize || "14px", $type: "dimension" },
        shadow: { $value: theme.tooltip?.shadow || "0 2px 8px rgba(0,0,0,0.15)", $type: "shadow" },
      },
      selection: {
        color: { $value: theme.colors.selection || theme.colors.primary, $type: "color" },
        opacity: { $value: theme.colors.selectionOpacity ?? 0.2, $type: "number" },
      },
      categorical: {
        $value: theme.colors.categorical,
        $type: "color",
        $description: "Categorical color palette",
      },
      sequential: {
        $value: theme.colors.sequential,
        $type: "string",
        $description: "d3-scale-chromatic sequential scheme name",
      },
      ...(theme.aesthetics
        ? {
            aesthetics: {
              ...(theme.aesthetics.name
                ? {
                    profile: {
                      $value: theme.aesthetics.name,
                      $type: "string",
                    },
                  }
                : {}),
              ...(theme.aesthetics.minimumScore != null
                ? {
                    "minimum-score": {
                      $value: theme.aesthetics.minimumScore,
                      $type: "number",
                    },
                  }
                : {}),
              weights: Object.fromEntries(
                Object.entries(theme.aesthetics.weights ?? {}).map(([id, weight]) => [
                  id,
                  { $value: weight, $type: "number" },
                ]),
              ),
              thresholds: Object.fromEntries(
                Object.entries(theme.aesthetics.thresholds ?? {}).map(([id, value]) => [
                  id,
                  { $value: value, $type: "number" },
                ]),
              ),
              rationales: Object.fromEntries(
                Object.entries(theme.aesthetics.rationales ?? {}).map(([id, rationale]) => [
                  id,
                  { $value: rationale, $type: "string" },
                ]),
              ),
            },
          }
        : {}),
      ...(theme.colors.diverging ? {
        diverging: {
          $value: theme.colors.diverging,
          $type: "string",
          $description: "d3-scale-chromatic diverging scheme name",
        },
      } : {}),
      ...(theme.colors.annotation ? {
        "annotation-color": { $value: theme.colors.annotation, $type: "color" },
      } : {}),
      ...(theme.typography.legendSize != null ? {
        "legend-font-size": { $value: `${theme.typography.legendSize}px`, $type: "dimension" },
      } : {}),
      ...(theme.typography.legendFontFamily != null ? {
        "legend-font-family": { $value: theme.typography.legendFontFamily, $type: "fontFamily" },
      } : {}),
      ...(theme.typography.legendFontWeight != null ? {
        "legend-font-weight": { $value: theme.typography.legendFontWeight, $type: "fontWeight" },
      } : {}),
      // titleSize is required and is the established fallback for the newer
      // titleFontSize control. Serialize the effective value so a preset with
      // no explicit override retains its visible title treatment on import.
      "title-font-size": {
        $value: `${theme.typography.titleFontSize ?? theme.typography.titleSize}px`,
        $type: "dimension",
      },
      ...(theme.typography.titleFontFamily != null ? {
        "title-font-family": { $value: theme.typography.titleFontFamily, $type: "fontFamily" },
      } : {}),
      ...(theme.typography.titleFontWeight != null ? {
        "title-font-weight": { $value: theme.typography.titleFontWeight, $type: "fontWeight" },
      } : {}),
      ...(theme.typography.tickFontFamily != null ? {
        "tick-font-family": { $value: theme.typography.tickFontFamily, $type: "fontFamily" },
      } : {}),
      ...(theme.typography.tickSize != null ? {
        "tick-font-size": { $value: `${theme.typography.tickSize}px`, $type: "dimension" },
      } : {}),
      ...(theme.typography.labelSize != null ? {
        "axis-label-font-size": { $value: `${theme.typography.labelSize}px`, $type: "dimension" },
      } : {}),
      // secondary/surface mirror the documented-fallback semantics in
      // themeToCSS + ThemeProvider — always emitted so DTCG token consumers
      // see the same canonical values as CSS-var consumers.
      secondary: { $value: theme.colors.secondary || theme.colors.primary, $type: "color" },
      surface: { $value: theme.colors.surface || theme.colors.background, $type: "color" },
      // Status roles — emitted only when declared; no documented fallback.
      ...(theme.colors.success ? { success: { $value: theme.colors.success, $type: "color" } } : {}),
      ...(theme.colors.danger ? { danger: { $value: theme.colors.danger, $type: "color" } } : {}),
      ...(theme.colors.warning ? { warning: { $value: theme.colors.warning, $type: "color" } } : {}),
      ...(theme.colors.error ? { error: { $value: theme.colors.error, $type: "color" } } : {}),
      ...(theme.colors.info ? { info: { $value: theme.colors.info, $type: "color" } } : {}),
    },
  }
}
