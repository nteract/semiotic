import type { Datum } from "../charts/shared/datumTypes"
import type { SemioticTheme } from "./ThemeStore"

/**
 * Canonical CSS custom-property projection for a Semiotic theme.
 *
 * Both the React ThemeProvider and the string serializer consume this map so
 * a token cannot exist in one delivery path but silently disappear from the
 * other. Object insertion order is intentional: themeToCSS preserves it for
 * stable snapshots and generated stylesheets.
 */
export function themeToCSSVariables(
  theme: SemioticTheme
): Record<`--semiotic-${string}`, string> {
  const variables: Record<`--semiotic-${string}`, string> = {
    "--semiotic-bg": theme.colors.background,
    "--semiotic-text": theme.colors.text,
    "--semiotic-text-secondary": theme.colors.textSecondary,
    "--semiotic-grid": theme.colors.grid,
    "--semiotic-border": theme.colors.border,
    "--semiotic-cell-border": theme.colors.cellBorder || theme.colors.border,
    "--semiotic-primary": theme.colors.primary,
    "--semiotic-font-family": theme.typography.fontFamily,
    "--semiotic-secondary": theme.colors.secondary || theme.colors.primary,
    "--semiotic-surface": theme.colors.surface || theme.colors.background,
  }

  theme.colors.categorical.forEach((color, index) => {
    variables[`--semiotic-category-${index + 1}`] = color
  })

  if (theme.colors.focus) variables["--semiotic-focus"] = theme.colors.focus
  if (theme.colors.selection) {
    variables["--semiotic-selection-color"] = theme.colors.selection
  }
  if (theme.colors.selectionOpacity != null) {
    variables["--semiotic-selection-opacity"] = String(
      theme.colors.selectionOpacity
    )
  }
  if (theme.colors.diverging) {
    variables["--semiotic-diverging"] = theme.colors.diverging
  }
  if (theme.colors.annotation) {
    variables["--semiotic-annotation-color"] = theme.colors.annotation
  }
  if (theme.colors.success) {
    variables["--semiotic-success"] = theme.colors.success
  }
  if (theme.colors.danger) {
    variables["--semiotic-danger"] = theme.colors.danger
  }
  if (theme.colors.warning) {
    variables["--semiotic-warning"] = theme.colors.warning
  }
  if (theme.colors.error) variables["--semiotic-error"] = theme.colors.error
  if (theme.colors.info) variables["--semiotic-info"] = theme.colors.info

  if (theme.tooltip?.background) {
    variables["--semiotic-tooltip-bg"] = theme.tooltip.background
  }
  if (theme.tooltip?.text) {
    variables["--semiotic-tooltip-text"] = theme.tooltip.text
  }
  if (theme.tooltip?.borderRadius) {
    variables["--semiotic-tooltip-radius"] = theme.tooltip.borderRadius
  }
  if (theme.tooltip?.fontSize) {
    variables["--semiotic-tooltip-font-size"] = theme.tooltip.fontSize
  }
  if (theme.tooltip?.shadow) {
    variables["--semiotic-tooltip-shadow"] = theme.tooltip.shadow
  }
  if (theme.borderRadius) {
    variables["--semiotic-border-radius"] = theme.borderRadius
  }
  if (theme.typography.legendSize != null) {
    variables["--semiotic-legend-font-size"] =
      `${theme.typography.legendSize}px`
  }
  if (theme.typography.titleFontSize != null) {
    variables["--semiotic-title-font-size"] =
      `${theme.typography.titleFontSize}px`
  }
  if (theme.typography.tickFontFamily != null) {
    variables["--semiotic-tick-font-family"] =
      theme.typography.tickFontFamily
  }
  if (theme.typography.tickSize != null) {
    variables["--semiotic-tick-font-size"] = `${theme.typography.tickSize}px`
  }
  if (theme.typography.labelSize != null) {
    variables["--semiotic-axis-label-font-size"] =
      `${theme.typography.labelSize}px`
  }

  return variables
}

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
      ...(theme.typography.titleFontSize != null ? {
        "title-font-size": { $value: `${theme.typography.titleFontSize}px`, $type: "dimension" },
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
