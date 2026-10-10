import type { Datum } from "../charts/shared/datumTypes"
import type { SemioticTheme } from "./themeCore"
import { themeToCSSVariables } from "./themeCSSVariables"
import { assertSafeThemeSelector } from "./safeThemeCSS"

export { themeToCSSVariables } from "./themeCSSVariables"

/**
 * Convert a SemioticTheme to a CSS custom properties string.
 * Useful for SSR or generating stylesheet content.
 *
 * @param theme - A SemioticTheme object
 * @param selector - CSS selector to scope the variables (default: `:root`)
 * @returns CSS string with custom properties
 * @throws TypeError for CSS declaration/HTML breakouts or resource-loading values.
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
  assertSafeThemeSelector(selector)
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
      mode: { $value: theme.mode, $type: "string" },
      bg: { $value: theme.colors.background, $type: "color" },
      text: { $value: theme.colors.text, $type: "color" },
      "text-secondary": { $value: theme.colors.textSecondary, $type: "color" },
      grid: { $value: theme.colors.grid, $type: "color" },
      border: { $value: theme.colors.border, $type: "color" },
      primary: { $value: theme.colors.primary, $type: "color" },
      ...(theme.colors.focus != null
        ? { focus: { $value: theme.colors.focus, $type: "color" } }
        : {}),
      ...(theme.colors.cellBorder != null
        ? { "cell-border": { $value: theme.colors.cellBorder, $type: "color" } }
        : {}),
      "font-family": {
        $value: theme.typography.fontFamily,
        $type: "fontFamily"
      },
      "title-size": {
        $value: `${theme.typography.titleSize}px`,
        $type: "dimension"
      },
      ...(theme.borderRadius != null
        ? {
            "border-radius": { $value: theme.borderRadius, $type: "dimension" }
          }
        : {}),
      ...(theme.tooltip != null
        ? {
            tooltip: {
              ...(theme.tooltip.background != null
                ? { bg: { $value: theme.tooltip.background, $type: "color" } }
                : {}),
              ...(theme.tooltip.text != null
                ? { text: { $value: theme.tooltip.text, $type: "color" } }
                : {}),
              ...(theme.tooltip.borderRadius != null
                ? {
                    radius: {
                      $value: theme.tooltip.borderRadius,
                      $type: "dimension"
                    }
                  }
                : {}),
              ...(theme.tooltip.fontSize != null
                ? {
                    "font-size": {
                      $value: theme.tooltip.fontSize,
                      $type: "dimension"
                    }
                  }
                : {}),
              ...(theme.tooltip.shadow != null
                ? { shadow: { $value: theme.tooltip.shadow, $type: "shadow" } }
                : {}),
              ...(theme.tooltip.chrome != null
                ? { chrome: { $value: theme.tooltip.chrome, $type: "string" } }
                : {})
            }
          }
        : {}),
      ...(theme.colors.selection != null ||
      theme.colors.selectionOpacity != null
        ? {
            selection: {
              ...(theme.colors.selection != null
                ? { color: { $value: theme.colors.selection, $type: "color" } }
                : {}),
              ...(theme.colors.selectionOpacity != null
                ? {
                    opacity: {
                      $value: theme.colors.selectionOpacity,
                      $type: "number"
                    }
                  }
                : {})
            }
          }
        : {}),
      ...(theme.accessibility != null
        ? {
            accessibility: Object.fromEntries(
              Object.entries(theme.accessibility).map(([key, value]) => [
                key,
                { $value: value, $type: "boolean" }
              ])
            )
          }
        : {}),
      categorical: {
        $value: [...theme.colors.categorical],
        $type: "color",
        $description: "Categorical color palette"
      },
      sequential: {
        $value: theme.colors.sequential,
        $type: "string",
        $description: "d3-scale-chromatic sequential scheme name"
      },
      ...(theme.aesthetics
        ? {
            aesthetics: {
              ...(theme.aesthetics.name
                ? {
                    profile: {
                      $value: theme.aesthetics.name,
                      $type: "string"
                    }
                  }
                : {}),
              ...(theme.aesthetics.minimumScore != null
                ? {
                    "minimum-score": {
                      $value: theme.aesthetics.minimumScore,
                      $type: "number"
                    }
                  }
                : {}),
              weights: Object.fromEntries(
                Object.entries(theme.aesthetics.weights ?? {}).map(
                  ([id, weight]) => [id, { $value: weight, $type: "number" }]
                )
              ),
              thresholds: Object.fromEntries(
                Object.entries(theme.aesthetics.thresholds ?? {}).map(
                  ([id, value]) => [id, { $value: value, $type: "number" }]
                )
              ),
              rationales: Object.fromEntries(
                Object.entries(theme.aesthetics.rationales ?? {}).map(
                  ([id, rationale]) => [
                    id,
                    { $value: rationale, $type: "string" }
                  ]
                )
              )
            }
          }
        : {}),
      ...(theme.colors.diverging
        ? {
            diverging: {
              $value: theme.colors.diverging,
              $type: "string",
              $description: "d3-scale-chromatic diverging scheme name"
            }
          }
        : {}),
      ...(theme.colors.annotation
        ? {
            "annotation-color": {
              $value: theme.colors.annotation,
              $type: "color"
            }
          }
        : {}),
      ...(theme.typography.legendSize != null
        ? {
            "legend-font-size": {
              $value: `${theme.typography.legendSize}px`,
              $type: "dimension"
            }
          }
        : {}),
      ...(theme.typography.legendFontFamily != null
        ? {
            "legend-font-family": {
              $value: theme.typography.legendFontFamily,
              $type: "fontFamily"
            }
          }
        : {}),
      ...(theme.typography.legendFontWeight != null
        ? {
            "legend-font-weight": {
              $value: theme.typography.legendFontWeight,
              $type: "fontWeight"
            }
          }
        : {}),
      ...(theme.typography.titleFontSize != null
        ? {
            "title-font-size": {
              $value: `${theme.typography.titleFontSize}px`,
              $type: "dimension"
            }
          }
        : {}),
      ...(theme.typography.titleFontFamily != null
        ? {
            "title-font-family": {
              $value: theme.typography.titleFontFamily,
              $type: "fontFamily"
            }
          }
        : {}),
      ...(theme.typography.titleFontWeight != null
        ? {
            "title-font-weight": {
              $value: theme.typography.titleFontWeight,
              $type: "fontWeight"
            }
          }
        : {}),
      ...(theme.typography.tickFontFamily != null
        ? {
            "tick-font-family": {
              $value: theme.typography.tickFontFamily,
              $type: "fontFamily"
            }
          }
        : {}),
      ...(theme.typography.tickSize != null
        ? {
            "tick-font-size": {
              $value: `${theme.typography.tickSize}px`,
              $type: "dimension"
            }
          }
        : {}),
      ...(theme.typography.labelSize != null
        ? {
            "axis-label-font-size": {
              $value: `${theme.typography.labelSize}px`,
              $type: "dimension"
            }
          }
        : {}),
      // Optional tokens describe authored values; CSS owns paint fallbacks.
      ...(theme.colors.secondary != null
        ? { secondary: { $value: theme.colors.secondary, $type: "color" } }
        : {}),
      ...(theme.colors.surface != null
        ? { surface: { $value: theme.colors.surface, $type: "color" } }
        : {}),
      // Status roles — emitted only when declared; no documented fallback.
      ...(theme.colors.success
        ? { success: { $value: theme.colors.success, $type: "color" } }
        : {}),
      ...(theme.colors.danger
        ? { danger: { $value: theme.colors.danger, $type: "color" } }
        : {}),
      ...(theme.colors.warning
        ? { warning: { $value: theme.colors.warning, $type: "color" } }
        : {}),
      ...(theme.colors.error
        ? { error: { $value: theme.colors.error, $type: "color" } }
        : {}),
      ...(theme.colors.info
        ? { info: { $value: theme.colors.info, $type: "color" } }
        : {})
    }
  }
}
