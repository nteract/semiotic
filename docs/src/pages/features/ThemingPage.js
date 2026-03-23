import React, { useState } from "react"
import {
  BarChart,
  LineChart,
  Scatterplot,
  DonutChart,
  ThemeProvider,
  useTheme,
  LIGHT_THEME,
  DARK_THEME,
  HIGH_CONTRAST_THEME,
  THEME_PRESETS,
  themeToCSS,
} from "semiotic"

import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import PropTable from "../../components/PropTable"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const barData = [
  { category: "Q1", value: 120 },
  { category: "Q2", value: 180 },
  { category: "Q3", value: 95 },
  { category: "Q4", value: 210 },
  { category: "Q5", value: 155 },
]

const lineData = [
  {
    id: "Revenue",
    coordinates: [
      { x: 1, y: 12 },
      { x: 2, y: 18 },
      { x: 3, y: 14 },
      { x: 4, y: 22 },
      { x: 5, y: 19 },
      { x: 6, y: 27 },
    ],
  },
  {
    id: "Costs",
    coordinates: [
      { x: 1, y: 8 },
      { x: 2, y: 12 },
      { x: 3, y: 10 },
      { x: 4, y: 15 },
      { x: 5, y: 13 },
      { x: 6, y: 18 },
    ],
  },
]

const scatterData = Array.from({ length: 24 }, (_, i) => ({
  x: 10 + (i % 6) * 15 + Math.round(Math.random() * 8),
  y: 10 + Math.floor(i / 6) * 20 + Math.round(Math.random() * 15),
  group: ["Engineering", "Design", "Marketing", "Sales"][i % 4],
}))

const donutData = [
  { category: "Engineering", value: 35 },
  { category: "Design", value: 20 },
  { category: "Marketing", value: 25 },
  { category: "Sales", value: 20 },
]

// ---------------------------------------------------------------------------
// Preset names grouped for UI
// ---------------------------------------------------------------------------

const PRESET_GROUPS = {
  Base: ["light", "dark", "high-contrast"],
  Tufte: ["tufte", "tufte-dark"],
  Pastels: ["pastels", "pastels-dark"],
  "BI Tool": ["bi-tool", "bi-tool-dark"],
  Italian: ["italian", "italian-dark"],
  Journalist: ["journalist", "journalist-dark"],
  Playful: ["playful", "playful-dark"],
}

// ---------------------------------------------------------------------------
// Props definitions
// ---------------------------------------------------------------------------

const themeProviderProps = [
  {
    name: "theme",
    type: "ThemePresetName | Partial<SemioticTheme>",
    required: false,
    default: '"light"',
    description:
      'A named preset string or a partial theme object. Named presets: "light", "dark", "high-contrast", "tufte", "tufte-dark", "pastels", "pastels-dark", "bi-tool", "bi-tool-dark", "italian", "italian-dark", "journalist", "journalist-dark", "playful", "playful-dark". Partial objects are deep-merged with the active theme.',
  },
  {
    name: "children",
    type: "ReactNode",
    required: true,
    default: null,
    description: "Chart components to be themed.",
  },
]

const themeShapeProps = [
  {
    name: "mode",
    type: '"light" | "dark" | "auto"',
    required: false,
    default: '"light"',
    description: "Theme mode label. Used by some components for mode-aware defaults.",
  },
  {
    name: "colors.primary",
    type: "string",
    required: false,
    default: '"#00a2ce"',
    description: "Default chart accent color. Maps to --semiotic-primary.",
  },
  {
    name: "colors.categorical",
    type: "string[]",
    required: false,
    default: "d3 category10",
    description: "Categorical palette. Each chart's colorBy draws from this.",
  },
  {
    name: "colors.sequential",
    type: "string",
    required: false,
    default: '"blues"',
    description: "d3-scale-chromatic sequential scheme name (e.g. \"blues\", \"viridis\").",
  },
  {
    name: "colors.diverging",
    type: "string",
    required: false,
    default: "undefined",
    description: "d3-scale-chromatic diverging scheme name (e.g. \"RdBu\"). Maps to --semiotic-diverging.",
  },
  {
    name: "colors.background",
    type: "string",
    required: false,
    default: '"transparent"',
    description: "Chart background. Maps to --semiotic-bg.",
  },
  {
    name: "colors.text",
    type: "string",
    required: false,
    default: '"#333"',
    description: "Primary text color (titles, axis labels). Maps to --semiotic-text.",
  },
  {
    name: "colors.textSecondary",
    type: "string",
    required: false,
    default: '"#666"',
    description: "Secondary text color (tick labels). Maps to --semiotic-text-secondary.",
  },
  {
    name: "colors.grid",
    type: "string",
    required: false,
    default: '"#e0e0e0"',
    description: "Grid line color. Maps to --semiotic-grid.",
  },
  {
    name: "colors.border",
    type: "string",
    required: false,
    default: '"#ccc"',
    description: "Axis / card border color. Maps to --semiotic-border.",
  },
  {
    name: "colors.focus",
    type: "string",
    required: false,
    default: '"#005fcc"',
    description: "Focus ring color for keyboard navigation. Maps to --semiotic-focus.",
  },
  {
    name: "colors.selection",
    type: "string",
    required: false,
    default: "undefined",
    description: "Linked hover/brush highlight color. Maps to --semiotic-selection-color.",
  },
  {
    name: "colors.selectionOpacity",
    type: "number",
    required: false,
    default: "0.2",
    description: "Non-selected element opacity (0-1). Maps to --semiotic-selection-opacity.",
  },
  {
    name: "typography.fontFamily",
    type: "string",
    required: false,
    default: '"sans-serif"',
    description: "Font family for all chart text. Maps to --semiotic-font-family.",
  },
  {
    name: "typography.titleSize",
    type: "number",
    required: false,
    default: "16",
    description: "Font size (px) for chart titles.",
  },
  {
    name: "typography.labelSize",
    type: "number",
    required: false,
    default: "12",
    description: "Font size (px) for axis labels.",
  },
  {
    name: "typography.tickSize",
    type: "number",
    required: false,
    default: "10",
    description: "Font size (px) for tick labels.",
  },
  {
    name: "tooltip.background",
    type: "string",
    required: false,
    default: '"rgba(0,0,0,0.85)"',
    description: "Tooltip background. Maps to --semiotic-tooltip-bg.",
  },
  {
    name: "tooltip.text",
    type: "string",
    required: false,
    default: '"white"',
    description: "Tooltip text color. Maps to --semiotic-tooltip-text.",
  },
  {
    name: "tooltip.borderRadius",
    type: "string",
    required: false,
    default: '"6px"',
    description: "Tooltip corner radius. Maps to --semiotic-tooltip-radius.",
  },
  {
    name: "tooltip.shadow",
    type: "string",
    required: false,
    default: '"0 2px 8px rgba(0,0,0,0.15)"',
    description: "Tooltip box shadow. Maps to --semiotic-tooltip-shadow.",
  },
  {
    name: "borderRadius",
    type: "string",
    required: false,
    default: '"8px"',
    description: "Global border radius token. Maps to --semiotic-border-radius.",
  },
]

// ---------------------------------------------------------------------------
// Interactive preset demo
// ---------------------------------------------------------------------------

function PresetDemo() {
  const [preset, setPreset] = useState("light")
  const activeTheme = THEME_PRESETS[preset] || LIGHT_THEME
  const categorical = activeTheme.colors.categorical

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {Object.entries(PRESET_GROUPS).map(([group, names]) => (
          <div key={group} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)", width: 70, flexShrink: 0 }}>
              {group}
            </span>
            {names.map((name) => {
              const t = THEME_PRESETS[name]
              return (
                <button
                  key={name}
                  onClick={() => setPreset(name)}
                  style={{
                    padding: "4px 10px",
                    border: `2px solid ${preset === name ? "var(--accent, #6366f1)" : t.colors.border}`,
                    borderRadius: 6,
                    background: preset === name ? "var(--accent, #6366f1)" : t.colors.background,
                    color: preset === name ? "#fff" : t.colors.text,
                    cursor: "pointer",
                    fontWeight: preset === name ? 600 : 400,
                    fontSize: 12,
                    fontFamily: t.typography.fontFamily,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {name}
                  <span style={{ display: "flex", gap: 1 }}>
                    {t.colors.categorical.slice(0, 4).map((c, i) => (
                      <span key={i} style={{ width: 8, height: 8, borderRadius: 1, background: c, display: "inline-block" }} />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <ThemeProvider theme={preset}>
        <div
          style={{
            padding: 16,
            borderRadius: 8,
            background: activeTheme.colors.background,
            border: `1px solid ${activeTheme.colors.border}`,
            "--semiotic-bg": activeTheme.colors.background,
            "--semiotic-text": activeTheme.colors.text,
            "--semiotic-text-secondary": activeTheme.colors.textSecondary,
            "--semiotic-border": activeTheme.colors.border,
            "--semiotic-grid": activeTheme.colors.grid,
            "--semiotic-font-family": activeTheme.typography.fontFamily,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <BarChart
              key={preset + "-bar"}
              data={barData}
              categoryAccessor="category"
              valueAccessor="value"
              title="Quarterly Revenue"
              height={250}
              width={340}
              frameProps={{
                pieceStyle: () => ({ fill: categorical[0] || activeTheme.colors.primary }),
              }}
            />
            <LineChart
              key={preset + "-line"}
              data={lineData}
              xAccessor="x"
              yAccessor="y"
              lineBy="id"
              colorBy="id"
              colorScheme={categorical}
              title="Revenue vs Costs"
              height={250}
              width={340}
            />
            <Scatterplot
              key={preset + "-scatter"}
              data={scatterData}
              xAccessor="x"
              yAccessor="y"
              colorBy="group"
              colorScheme={categorical}
              title="Team Distribution"
              height={250}
              width={340}
            />
            <DonutChart
              key={preset + "-donut"}
              data={donutData}
              categoryAccessor="category"
              valueAccessor="value"
              colorBy="category"
              colorScheme={categorical}
              title="Department Split"
              height={250}
              width={340}
            />
          </div>
        </div>
      </ThemeProvider>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ThemingPage() {
  return (
    <PageLayout
      title="Theme Provider"
      breadcrumbs={[
        { label: "Theming", path: "/theming" },
        { label: "Theme Provider", path: "/theming/theme-provider" },
      ]}
      prevPage={{ title: "Styling", path: "/theming/styling" }}
      nextPage={{ title: "Theme Explorer", path: "/theming/theme-explorer" }}
    >
      <p>
        <code>ThemeProvider</code> applies consistent colors, typography,
        tooltips, and borders to every Semiotic chart it wraps. It ships with{" "}
        <strong>15 named presets</strong> covering light/dark variants of six
        distinct design vocabularies, plus a high-contrast accessibility preset.
        You can also pass a custom theme object.
      </p>

      {/* ================================================================= */}
      {/* Quick Start */}
      {/* ================================================================= */}
      <h2 id="quick-start">Quick Start</h2>

      <CodeBlock
        code={`import { ThemeProvider, BarChart } from "semiotic"

// Named preset — one line for brand-consistent charts
<ThemeProvider theme="tufte">
  <BarChart data={data} categoryAccessor="name" valueAccessor="value" />
</ThemeProvider>

// Custom theme object — only specify what you want to override
<ThemeProvider theme={{
  colors: {
    primary: "#e63946",
    categorical: ["#e63946", "#457b9d", "#a8dadc", "#1d3557"],
    background: "#f1faee",
    text: "#1d3557",
  },
  typography: { fontFamily: '"Inter", sans-serif' },
}}>
  <BarChart data={data} categoryAccessor="name" valueAccessor="value" />
</ThemeProvider>`}
        language="jsx"
      />

      {/* ================================================================= */}
      {/* Named Presets Demo */}
      {/* ================================================================= */}
      <h2 id="presets">15 Named Presets</h2>

      <p>
        Select a preset to see it applied to four chart types simultaneously.
        Each preset defines colors, typography, tooltips, and border radius:
      </p>

      <PresetDemo />

      <CodeBlock
        code={`// All 15 preset names:
// "light"           "dark"             "high-contrast"
// "tufte"           "tufte-dark"
// "pastels"         "pastels-dark"
// "bi-tool"         "bi-tool-dark"
// "italian"         "italian-dark"
// "journalist"      "journalist-dark"
// "playful"         "playful-dark"

// Import theme objects directly for inspection or extension
import { TUFTE_LIGHT, TUFTE_DARK, PASTELS_LIGHT } from "semiotic/themes"

<ThemeProvider theme={{
  ...TUFTE_LIGHT,
  colors: { ...TUFTE_LIGHT.colors, primary: "#cc0000" },
}}>
  {/* Tufte with a red accent */}
</ThemeProvider>`}
        language="jsx"
      />

      {/* ================================================================= */}
      {/* CSS Custom Properties */}
      {/* ================================================================= */}
      <h2 id="css-custom-properties">CSS Custom Properties</h2>

      <p>
        ThemeProvider sets CSS custom properties on a wrapper{" "}
        <code>div</code>, so surrounding UI can inherit the active theme.
        It also sets a <code>data-semiotic-theme</code> attribute when using
        a named preset, enabling CSS-only theme switching for SSR:
      </p>

      <CodeBlock
        code={`/* ThemeProvider emits all of these: */
--semiotic-bg                /* colors.background */
--semiotic-text              /* colors.text */
--semiotic-text-secondary    /* colors.textSecondary */
--semiotic-grid              /* colors.grid */
--semiotic-border            /* colors.border */
--semiotic-primary           /* colors.primary */
--semiotic-focus             /* colors.focus */
--semiotic-font-family       /* typography.fontFamily */
--semiotic-border-radius     /* borderRadius */
--semiotic-tooltip-bg        /* tooltip.background */
--semiotic-tooltip-text      /* tooltip.text */
--semiotic-tooltip-radius    /* tooltip.borderRadius */
--semiotic-tooltip-font-size /* tooltip.fontSize */
--semiotic-tooltip-shadow    /* tooltip.shadow */
--semiotic-selection-color   /* colors.selection */
--semiotic-selection-opacity /* colors.selectionOpacity */
--semiotic-diverging         /* colors.diverging */`}
        language="css"
      />

      <CodeBlock
        code={`/* Style surrounding UI to match the chart theme */
.dashboard-panel {
  background: var(--semiotic-bg);
  color: var(--semiotic-text);
  font-family: var(--semiotic-font-family);
  border: 1px solid var(--semiotic-border);
  border-radius: var(--semiotic-border-radius, 8px);
}

/* CSS-only theme switching without JS (SSR-friendly) */
[data-semiotic-theme="tufte"] .dashboard-panel {
  font-family: Georgia, serif;
}

/* Or use themeToCSS() to generate all vars at build time */`}
        language="css"
      />

      {/* ================================================================= */}
      {/* useTheme Hook */}
      {/* ================================================================= */}
      <h2 id="usetheme">useTheme Hook</h2>

      <p>
        Custom components can read the active theme with <code>useTheme()</code>,
        which returns the full <code>SemioticTheme</code> object:
      </p>

      <CodeBlock
        code={`import { useTheme } from "semiotic"

function DashboardHeader({ title, subtitle }) {
  const theme = useTheme()
  return (
    <div style={{
      background: theme.colors.background,
      borderBottom: \`1px solid \${theme.colors.border}\`,
      padding: "16px 24px",
      fontFamily: theme.typography.fontFamily,
    }}>
      <h2 style={{ color: theme.colors.text, fontSize: theme.typography.titleSize, margin: 0 }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{ color: theme.colors.textSecondary, fontSize: theme.typography.labelSize, margin: "4px 0 0" }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}`}
        language="jsx"
      />

      {/* ================================================================= */}
      {/* Theme Serialization */}
      {/* ================================================================= */}
      <h2 id="serialization">Theme Serialization</h2>

      <p>
        The <code>semiotic/themes</code> entry point exports utilities for
        converting themes to CSS or design tokens:
      </p>

      <CodeBlock
        code={`import {
  themeToCSS,
  themeToTokens,
  resolveThemePreset,
  THEME_PRESETS,
} from "semiotic/themes"

// Generate a CSS stylesheet for a theme
const css = themeToCSS(resolveThemePreset("tufte"), ".my-charts")
// .my-charts {
//   --semiotic-bg: #fffff8;
//   --semiotic-text: #111111;
//   ...
// }

// Generate design tokens (DTCG format, Style Dictionary compatible)
const tokens = themeToTokens(resolveThemePreset("tufte"))
// { semiotic: { bg: { $value: "#fffff8", $type: "color" }, ... } }

// Generate CSS for SSR with data-semiotic-theme attribute
const ssrCSS = Object.entries(THEME_PRESETS)
  .map(([name, theme]) =>
    themeToCSS(theme, \`[data-semiotic-theme="\${name}"]\`)
  )
  .join("\\n\\n")`}
        language="jsx"
      />

      {/* ================================================================= */}
      {/* CSS-only theming (no ThemeProvider) */}
      {/* ================================================================= */}
      <h2 id="css-only">CSS-Only Theming</h2>

      <p>
        You don't need <code>ThemeProvider</code> at all — Semiotic charts
        read <code>--semiotic-*</code> CSS custom properties from any ancestor
        element. Set them in your stylesheet or inline:
      </p>

      <CodeBlock
        code={`/* In your global CSS */
.brand-charts {
  --semiotic-bg: #1a1a2e;
  --semiotic-text: #ededed;
  --semiotic-text-secondary: #aaa;
  --semiotic-grid: #333;
  --semiotic-border: #555;
  --semiotic-font-family: Georgia, serif;
  --semiotic-tooltip-bg: #1a1a2e;
  --semiotic-tooltip-text: #ededed;
  --semiotic-tooltip-radius: 8px;
}

/* In JSX — no ThemeProvider needed */
<div className="brand-charts">
  <BarChart data={data} categoryAccessor="name" valueAccessor="value" />
  <LineChart data={lines} xAccessor="x" yAccessor="y" />
</div>`}
        language="css"
      />

      {/* ================================================================= */}
      {/* Accessibility */}
      {/* ================================================================= */}
      <h2 id="accessibility">Accessibility</h2>

      <p>
        The <code>"high-contrast"</code> preset uses the Wong 2011
        color-blind-safe palette (<code>COLOR_BLIND_SAFE_CATEGORICAL</code>),
        bold text, and high-contrast borders. Import the palette directly for
        custom themes:
      </p>

      <CodeBlock
        code={`import { COLOR_BLIND_SAFE_CATEGORICAL } from "semiotic"

// Use the 8-color CB-safe palette in a custom theme
<ThemeProvider theme={{
  colors: {
    categorical: COLOR_BLIND_SAFE_CATEGORICAL,
    text: "#000000",
    border: "#000000",
  },
}}>
  <BarChart data={data} categoryAccessor="group" valueAccessor="value" colorBy="group" />
</ThemeProvider>

// Or just use the high-contrast preset
<ThemeProvider theme="high-contrast">
  {/* charts */}
</ThemeProvider>`}
        language="jsx"
      />

      <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
        The <code>diagnoseConfig</code> utility also checks contrast ratios —
        run <code>npx semiotic-ai --doctor</code> to audit your chart configs.
      </p>

      {/* ================================================================= */}
      {/* Props */}
      {/* ================================================================= */}
      <h2 id="props">Props Reference</h2>

      <h3>ThemeProvider</h3>
      <PropTable componentName="ThemeProvider" props={themeProviderProps} />

      <h3 style={{ marginTop: 32 }}>SemioticTheme Shape</h3>
      <PropTable componentName="SemioticTheme" props={themeShapeProps} />

      {/* ================================================================= */}
      {/* Related */}
      {/* ================================================================= */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/theming/styling">Styling</Link> — per-mark styling,
          data-driven colors, SVG patterns
        </li>
        <li>
          <Link to="/theming/theme-explorer">Theme Explorer</Link> — interactive
          playground to customize and export themes
        </li>
        <li>
          <Link to="/features/legends">Legends</Link> — legends automatically
          respect theme colors and interactive state
        </li>
        <li>
          <Link to="/features/linked-charts">Linked Charts</Link> — coordinated
          views that share a theme
        </li>
        <li>
          <Link to="/recipes/benchmark-dashboard">Benchmark Dashboard</Link>{" "}
          — recipe with live theme switching across 4 views
        </li>
      </ul>
    </PageLayout>
  )
}
