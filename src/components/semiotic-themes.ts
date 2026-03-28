/**
 * semiotic/themes — Named theme presets for Semiotic charts.
 *
 * Each theme provides light and dark mode variants as full SemioticTheme objects.
 * Use with ThemeProvider: `<ThemeProvider theme={TUFTE_LIGHT} />` or by name:
 * `<ThemeProvider theme="tufte" />` / `<ThemeProvider theme="tufte-dark" />`.
 *
 * Also exports `themeToCSS()` and `themeToTokens()` for serialization.
 */

import type { SemioticTheme } from "./store/ThemeStore"
import {
  LIGHT_THEME,
  DARK_THEME,
  HIGH_CONTRAST_THEME,
  COLOR_BLIND_SAFE_CATEGORICAL,
} from "./store/ThemeStore"

// ── Re-exports ────────────────────────────────────────────────────────────

export { LIGHT_THEME, DARK_THEME, HIGH_CONTRAST_THEME, COLOR_BLIND_SAFE_CATEGORICAL }
export type { SemioticTheme }


// ── Pastels ───────────────────────────────────────────────────────────────

export const PASTELS_LIGHT: SemioticTheme = {
  mode: "light",
  colors: {
    primary: "#c9a0dc",
    categorical: ["#f0a0c0", "#88d4ab", "#b0a0e8", "#f0c888"],
    sequential: "purples",
    background: "#fdf6f0",
    text: "#4a3728",
    textSecondary: "#8b7355",
    grid: "#e8d5c4",
    border: "#e8d5c4",
    focus: "#c9a0dc",
  },
  typography: {
    fontFamily: "Inter, system-ui, sans-serif",
    titleSize: 16,
    labelSize: 12,
    tickSize: 10,
  },
  tooltip: {
    background: "#fff5ee",
    text: "#4a3728",
    borderRadius: "8px",
    shadow: "0 2px 8px rgba(0, 0, 0, 0.12)",
  },
  borderRadius: "10px",
}

export const PASTELS_DARK: SemioticTheme = {
  mode: "dark",
  colors: {
    primary: "#c9a0dc",
    categorical: ["#f0a0c0", "#88d4ab", "#b0a0e8", "#f0c888"],
    sequential: "purples",
    background: "#1a1525",
    text: "#e8ddf0",
    textSecondary: "#a899c0",
    grid: "#3d3455",
    border: "#3d3455",
    focus: "#c9a0dc",
  },
  typography: {
    fontFamily: "Inter, system-ui, sans-serif",
    titleSize: 16,
    labelSize: 12,
    tickSize: 10,
  },
  tooltip: {
    background: "#251e35",
    text: "#e8ddf0",
    borderRadius: "8px",
    shadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
  },
  borderRadius: "10px",
}

// ── BI Tool ───────────────────────────────────────────────────────────────

export const BI_TOOL_LIGHT: SemioticTheme = {
  mode: "light",
  colors: {
    primary: "#2563eb",
    categorical: ["#2563eb", "#0d9488", "#ea580c", "#6b7280"],
    sequential: "blues",
    background: "#f5f6f8",
    text: "#2c3e50",
    textSecondary: "#7f8c9b",
    grid: "#d8dce3",
    border: "#d8dce3",
    focus: "#2563eb",
  },
  typography: {
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
    titleSize: 16,
    labelSize: 12,
    tickSize: 10,
  },
  tooltip: {
    background: "#ffffff",
    text: "#2c3e50",
    borderRadius: "6px",
    shadow: "0 2px 8px rgba(0, 0, 0, 0.12)",
  },
  borderRadius: "8px",
}

export const BI_TOOL_DARK: SemioticTheme = {
  mode: "dark",
  colors: {
    primary: "#3b82f6",
    categorical: ["#3b82f6", "#14b8a6", "#f97316", "#9ca3af"],
    sequential: "blues",
    background: "#111827",
    text: "#f3f4f6",
    textSecondary: "#9ca3af",
    grid: "#374151",
    border: "#374151",
    focus: "#3b82f6",
  },
  typography: {
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
    titleSize: 16,
    labelSize: 12,
    tickSize: 10,
  },
  tooltip: {
    background: "#1f2937",
    text: "#f3f4f6",
    borderRadius: "6px",
    shadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
  },
  borderRadius: "8px",
}

// ── Italian Designer ──────────────────────────────────────────────────────

export const ITALIAN_LIGHT: SemioticTheme = {
  mode: "light",
  colors: {
    primary: "#cc0000",
    categorical: ["#cc0000", "#333333", "#c8a415", "#4682b4"],
    sequential: "reds",
    background: "#fafafa",
    text: "#1a1a1a",
    textSecondary: "#666666",
    grid: "#e0e0e0",
    border: "#e0e0e0",
    focus: "#cc0000",
  },
  typography: {
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    titleSize: 16,
    labelSize: 12,
    tickSize: 10,
  },
  tooltip: {
    background: "#ffffff",
    text: "#1a1a1a",
    borderRadius: "2px",
    shadow: "0 2px 4px rgba(0, 0, 0, 0.15)",
  },
  borderRadius: "2px",
}

export const ITALIAN_DARK: SemioticTheme = {
  mode: "dark",
  colors: {
    primary: "#ff3333",
    categorical: ["#ff3333", "#aaaaaa", "#d4a843", "#6aa4d4"],
    sequential: "reds",
    background: "#0a0a0a",
    text: "#f5f5f5",
    textSecondary: "#aaaaaa",
    grid: "#333333",
    border: "#333333",
    focus: "#ff3333",
  },
  typography: {
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    titleSize: 16,
    labelSize: 12,
    tickSize: 10,
  },
  tooltip: {
    background: "#1a1a1a",
    text: "#f5f5f5",
    borderRadius: "2px",
    shadow: "0 2px 8px rgba(0, 0, 0, 0.5)",
  },
  borderRadius: "2px",
}

// ── Tufte ─────────────────────────────────────────────────────────────────

export const TUFTE_LIGHT: SemioticTheme = {
  mode: "light",
  colors: {
    primary: "#8b0000",
    categorical: ["#8b4513", "#556b2f", "#4a5568", "#800020"],
    sequential: "oranges",
    background: "#fffff8",
    text: "#111111",
    textSecondary: "#555555",
    grid: "#e0ddd0",
    border: "#e0ddd0",
    focus: "#8b0000",
  },
  typography: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    titleSize: 16,
    labelSize: 12,
    tickSize: 10,
  },
  tooltip: {
    background: "#fffff8",
    text: "#111111",
    borderRadius: "2px",
    shadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },
  borderRadius: "0px",
}

export const TUFTE_DARK: SemioticTheme = {
  mode: "dark",
  colors: {
    primary: "#c05050",
    categorical: ["#c08050", "#7a8b5a", "#8090a0", "#a05060"],
    sequential: "oranges",
    background: "#1c1b18",
    text: "#e8e4d8",
    textSecondary: "#a09880",
    grid: "#3d3c35",
    border: "#3d3c35",
    focus: "#c05050",
  },
  typography: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    titleSize: 16,
    labelSize: 12,
    tickSize: 10,
  },
  tooltip: {
    background: "#262520",
    text: "#e8e4d8",
    borderRadius: "2px",
    shadow: "0 2px 6px rgba(0, 0, 0, 0.4)",
  },
  borderRadius: "0px",
}

// ── Data Journalist ───────────────────────────────────────────────────────

export const JOURNALIST_LIGHT: SemioticTheme = {
  mode: "light",
  colors: {
    primary: "#e45050",
    categorical: ["#3a86c8", "#e45050", "#d4a843", "#888888"],
    sequential: "blues",
    background: "#ffffff",
    text: "#222222",
    textSecondary: "#666666",
    grid: "#d4d4d4",
    border: "#d4d4d4",
    focus: "#e45050",
  },
  typography: {
    fontFamily: "'Franklin Gothic Medium', 'Libre Franklin', Arial, sans-serif",
    titleSize: 16,
    labelSize: 12,
    tickSize: 10,
  },
  tooltip: {
    background: "#f8f8f8",
    text: "#222222",
    borderRadius: "4px",
    shadow: "0 2px 6px rgba(0, 0, 0, 0.12)",
  },
  borderRadius: "4px",
}

export const JOURNALIST_DARK: SemioticTheme = {
  mode: "dark",
  colors: {
    primary: "#ff6b6b",
    categorical: ["#5a9fd8", "#ff6b6b", "#e0c060", "#aaaaaa"],
    sequential: "blues",
    background: "#141414",
    text: "#ededed",
    textSecondary: "#a0a0a0",
    grid: "#383838",
    border: "#383838",
    focus: "#ff6b6b",
  },
  typography: {
    fontFamily: "'Franklin Gothic Medium', 'Libre Franklin', Arial, sans-serif",
    titleSize: 16,
    labelSize: 12,
    tickSize: 10,
  },
  tooltip: {
    background: "#1e1e1e",
    text: "#ededed",
    borderRadius: "4px",
    shadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
  },
  borderRadius: "4px",
}

// ── Playful ───────────────────────────────────────────────────────────────

export const PLAYFUL_LIGHT: SemioticTheme = {
  mode: "light",
  colors: {
    primary: "#8b5cf6",
    categorical: ["#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"],
    sequential: "viridis",
    background: "#fdf8ff",
    text: "#2d1b4e",
    textSecondary: "#7c5a9e",
    grid: "#e8d0f8",
    border: "#e8d0f8",
    focus: "#8b5cf6",
  },
  typography: {
    fontFamily: "'Nunito', 'Poppins', system-ui, sans-serif",
    titleSize: 16,
    labelSize: 12,
    tickSize: 10,
  },
  tooltip: {
    background: "#ffffff",
    text: "#2d1b4e",
    borderRadius: "12px",
    shadow: "0 4px 12px rgba(139, 92, 246, 0.15)",
  },
  borderRadius: "12px",
}

export const PLAYFUL_DARK: SemioticTheme = {
  mode: "dark",
  colors: {
    primary: "#a78bfa",
    categorical: ["#a78bfa", "#f472b6", "#22d3ee", "#a3e635"],
    sequential: "viridis",
    background: "#150a28",
    text: "#f0e8ff",
    textSecondary: "#b8a0d8",
    grid: "#3a2560",
    border: "#3a2560",
    focus: "#a78bfa",
  },
  typography: {
    fontFamily: "'Nunito', 'Poppins', system-ui, sans-serif",
    titleSize: 16,
    labelSize: 12,
    tickSize: 10,
  },
  tooltip: {
    background: "#1f1138",
    text: "#f0e8ff",
    borderRadius: "12px",
    shadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
  },
  borderRadius: "12px",
}

// ── IBM Carbon ──────────────────────────────────────────────────────────

/**
 * IBM Carbon Design System categorical palette (14 colors).
 * Full palette for data-dense visualizations; themes use the first 4.
 */
export const CARBON_CATEGORICAL_14: string[] = [
  "#6929c4", "#1192e8", "#005d5d", "#9f1853",
  "#fa4d56", "#570408", "#198038", "#002d9c",
  "#ee538b", "#b28600", "#009d9a", "#012749",
  "#8a3800", "#a56eff",
]

/**
 * IBM Carbon alert palette — danger, warning, success, info.
 */
export const CARBON_ALERT = {
  danger: "#da1e28",
  warning: "#f1c21b",
  success: "#24a148",
  info: "#0043ce",
} as const

export const CARBON_LIGHT: SemioticTheme = {
  mode: "light",
  colors: {
    primary: "#0f62fe",
    categorical: ["#6929c4", "#1192e8", "#005d5d", "#9f1853"],
    sequential: "blues",
    diverging: "RdBu",
    background: "#ffffff",
    text: "#161616",
    textSecondary: "#525252",
    grid: "#e0e0e0",
    border: "#e0e0e0",
    focus: "#0f62fe",
  },
  typography: {
    fontFamily: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
    titleSize: 16,
    labelSize: 12,
    tickSize: 10,
  },
  tooltip: {
    background: "#ffffff",
    text: "#161616",
    borderRadius: "2px",
    shadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
  },
  borderRadius: "0px",
}

export const CARBON_DARK: SemioticTheme = {
  mode: "dark",
  colors: {
    primary: "#4589ff",
    categorical: ["#a56eff", "#33b1ff", "#08bdba", "#ff7eb6"],
    sequential: "blues",
    diverging: "RdBu",
    background: "#161616",
    text: "#f4f4f4",
    textSecondary: "#a8a8a8",
    grid: "#393939",
    border: "#393939",
    focus: "#4589ff",
  },
  typography: {
    fontFamily: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
    titleSize: 16,
    labelSize: 12,
    tickSize: 10,
  },
  tooltip: {
    background: "#262626",
    text: "#f4f4f4",
    borderRadius: "2px",
    shadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
  },
  borderRadius: "0px",
}

// ── Named theme registry ──────────────────────────────────────────────────

/** All named theme presets, keyed by slug. */
export const THEME_PRESETS: Record<string, SemioticTheme> = {
  light: LIGHT_THEME,
  dark: DARK_THEME,
  "high-contrast": HIGH_CONTRAST_THEME,
  pastels: PASTELS_LIGHT,
  "pastels-dark": PASTELS_DARK,
  "bi-tool": BI_TOOL_LIGHT,
  "bi-tool-dark": BI_TOOL_DARK,
  italian: ITALIAN_LIGHT,
  "italian-dark": ITALIAN_DARK,
  tufte: TUFTE_LIGHT,
  "tufte-dark": TUFTE_DARK,
  journalist: JOURNALIST_LIGHT,
  "journalist-dark": JOURNALIST_DARK,
  playful: PLAYFUL_LIGHT,
  "playful-dark": PLAYFUL_DARK,
  carbon: CARBON_LIGHT,
  "carbon-dark": CARBON_DARK,
}

/** All valid named theme strings for ThemeProvider. */
export type ThemePresetName = keyof typeof THEME_PRESETS

/**
 * Resolve a theme preset name to a SemioticTheme object.
 * Returns undefined if the name is not recognized.
 */
export function resolveThemePreset(name: string): SemioticTheme | undefined {
  return THEME_PRESETS[name]
}

// ── Serialization utilities ───────────────────────────────────────────────

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
  const vars: string[] = []

  vars.push(`  --semiotic-bg: ${theme.colors.background};`)
  vars.push(`  --semiotic-text: ${theme.colors.text};`)
  vars.push(`  --semiotic-text-secondary: ${theme.colors.textSecondary};`)
  vars.push(`  --semiotic-grid: ${theme.colors.grid};`)
  vars.push(`  --semiotic-border: ${theme.colors.border};`)
  vars.push(`  --semiotic-primary: ${theme.colors.primary};`)
  vars.push(`  --semiotic-font-family: ${theme.typography.fontFamily};`)

  if (theme.colors.focus) {
    vars.push(`  --semiotic-focus: ${theme.colors.focus};`)
  }
  if (theme.colors.selection) {
    vars.push(`  --semiotic-selection-color: ${theme.colors.selection};`)
  }
  if (theme.colors.selectionOpacity != null) {
    vars.push(`  --semiotic-selection-opacity: ${theme.colors.selectionOpacity};`)
  }
  if (theme.colors.diverging) {
    vars.push(`  --semiotic-diverging: ${theme.colors.diverging};`)
  }
  if (theme.tooltip?.background) {
    vars.push(`  --semiotic-tooltip-bg: ${theme.tooltip.background};`)
  }
  if (theme.tooltip?.text) {
    vars.push(`  --semiotic-tooltip-text: ${theme.tooltip.text};`)
  }
  if (theme.tooltip?.borderRadius) {
    vars.push(`  --semiotic-tooltip-radius: ${theme.tooltip.borderRadius};`)
  }
  if (theme.tooltip?.fontSize) {
    vars.push(`  --semiotic-tooltip-font-size: ${theme.tooltip.fontSize};`)
  }
  if (theme.tooltip?.shadow) {
    vars.push(`  --semiotic-tooltip-shadow: ${theme.tooltip.shadow};`)
  }
  if (theme.borderRadius) {
    vars.push(`  --semiotic-border-radius: ${theme.borderRadius};`)
  }

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
export function themeToTokens(theme: SemioticTheme): Record<string, any> {
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
    },
  }
}
