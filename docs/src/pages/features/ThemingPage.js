import React, { useState } from "react"
import { BarChart, LineChart, ThemeProvider, LIGHT_THEME, DARK_THEME } from "semiotic"

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

// ---------------------------------------------------------------------------
// Props definitions
// ---------------------------------------------------------------------------

const themeProviderProps = [
  {
    name: "theme",
    type: '"light" | "dark" | Partial<SemioticTheme>',
    required: false,
    default: '"light"',
    description:
      'Pass "light" or "dark" for built-in presets, or a partial theme object to customize specific values. Partial objects are merged with the current theme.',
  },
  {
    name: "children",
    type: "ReactNode",
    required: true,
    default: null,
    description: "Any chart components to be themed.",
  },
]

const themeShapeProps = [
  {
    name: "mode",
    type: '"light" | "dark" | "auto"',
    required: false,
    default: '"light"',
    description: "The mode label for the current theme.",
  },
  {
    name: "colors.primary",
    type: "string",
    required: false,
    default: '"#00a2ce"',
    description: "Default chart color used when no colorBy is set.",
  },
  {
    name: "colors.categorical",
    type: "string[]",
    required: false,
    default: "d3 category10",
    description: "Array of colors used for categorical color scales.",
  },
  {
    name: "colors.sequential",
    type: "string",
    required: false,
    default: '"blues"',
    description: "Sequential color scheme name.",
  },
  {
    name: "colors.background",
    type: "string",
    required: false,
    default: '"transparent"',
    description: "Chart background color.",
  },
  {
    name: "colors.text",
    type: "string",
    required: false,
    default: '"#333"',
    description: "Primary text color for titles and axis labels.",
  },
  {
    name: "colors.textSecondary",
    type: "string",
    required: false,
    default: '"#666"',
    description: "Secondary text color for tick labels.",
  },
  {
    name: "colors.grid",
    type: "string",
    required: false,
    default: '"#e0e0e0"',
    description: "Grid line color.",
  },
  {
    name: "colors.border",
    type: "string",
    required: false,
    default: '"#ccc"',
    description: "Axis line / border color.",
  },
  {
    name: "typography.fontFamily",
    type: "string",
    required: false,
    default: '"sans-serif"',
    description: "Font family for all chart text.",
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
]

// ---------------------------------------------------------------------------
// Interactive demo component
// ---------------------------------------------------------------------------

function ThemeDemo() {
  const [mode, setMode] = useState("light")

  const themeValue = mode === "custom"
    ? {
        colors: {
          primary: "#e63946",
          background: "#f1faee",
          text: "#1d3557",
          textSecondary: "#457b9d",
          grid: "#a8dadc",
          border: "#457b9d",
        },
      }
    : mode

  return (
    <div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {["light", "dark", "custom"].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: "6px 16px",
              border: `2px solid ${mode === m ? "var(--accent, #6366f1)" : "var(--surface-3, #ccc)"}`,
              borderRadius: "6px",
              background: mode === m ? "var(--accent, #6366f1)" : "transparent",
              color: mode === m ? "#fff" : "var(--text-primary, #333)",
              cursor: "pointer",
              fontWeight: mode === m ? 600 : 400,
              textTransform: "capitalize",
            }}
          >
            {m}
          </button>
        ))}
      </div>

      <ThemeProvider theme={themeValue}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <BarChart
            data={barData}
            categoryAccessor="category"
            valueAccessor="value"
            title="Quarterly Revenue"
            categoryLabel="Quarter"
            valueLabel="Revenue ($K)"
            height={300}
            width={350}
          />
          <LineChart
            data={lineData}
            xAccessor="x"
            yAccessor="y"
            lineBy="id"
            title="Revenue vs Costs"
            xLabel="Month"
            yLabel="Amount ($K)"
            height={300}
            width={350}
          />
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
      title="Theming"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Theming", path: "/features/theming" },
      ]}
      prevPage={{ title: "Styling", path: "/features/styling" }}
      nextPage={{ title: "Legends", path: "/features/legends" }}
    >
      <p>
        The <code>ThemeProvider</code> component applies consistent colors,
        typography, and styling to all Semiotic charts it wraps. It ships with
        light and dark presets and supports fully custom theme objects.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        Wrap your charts with <code>ThemeProvider</code> and pass a theme preset
        or custom object:
      </p>

      <CodeBlock
        code={`import { ThemeProvider, BarChart } from "semiotic"

// Built-in preset
<ThemeProvider theme="dark">
  <BarChart data={data} categoryAccessor="name" valueAccessor="value" />
</ThemeProvider>

// Custom theme
<ThemeProvider theme={{
  colors: {
    primary: "#e63946",
    background: "#f1faee",
    text: "#1d3557",
  }
}}>
  <BarChart data={data} categoryAccessor="name" valueAccessor="value" />
</ThemeProvider>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Interactive Demo */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="interactive-demo">Interactive Demo</h2>

      <p>
        Toggle between the built-in presets and a custom theme to see how
        ThemeProvider affects charts:
      </p>

      <ThemeDemo />

      {/* ----------------------------------------------------------------- */}
      {/* Built-in Presets */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="presets">Built-in Presets</h2>

      <p>
        Semiotic ships with two theme presets. You can also import them directly
        to inspect or extend:
      </p>

      <CodeBlock
        code={`import { LIGHT_THEME, DARK_THEME } from "semiotic"

// Extend the dark theme with a custom primary color
<ThemeProvider theme={{
  ...DARK_THEME,
  colors: { ...DARK_THEME.colors, primary: "#ff6b6b" }
}}>
  {/* charts */}
</ThemeProvider>`}
        language="jsx"
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "16px" }}>
        <div>
          <h4 style={{ marginTop: 0 }}>Light (default)</h4>
          <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
            <tbody>
              <tr><td style={{ padding: "4px 8px", fontWeight: 600 }}>Primary</td><td><code>#00a2ce</code> <span style={{ display: "inline-block", width: 12, height: 12, background: "#00a2ce", borderRadius: 2, verticalAlign: "middle" }} /></td></tr>
              <tr><td style={{ padding: "4px 8px", fontWeight: 600 }}>Background</td><td><code>transparent</code></td></tr>
              <tr><td style={{ padding: "4px 8px", fontWeight: 600 }}>Text</td><td><code>#333</code></td></tr>
              <tr><td style={{ padding: "4px 8px", fontWeight: 600 }}>Grid</td><td><code>#e0e0e0</code></td></tr>
            </tbody>
          </table>
        </div>
        <div>
          <h4 style={{ marginTop: 0 }}>Dark</h4>
          <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
            <tbody>
              <tr><td style={{ padding: "4px 8px", fontWeight: 600 }}>Primary</td><td><code>#4fc3f7</code> <span style={{ display: "inline-block", width: 12, height: 12, background: "#4fc3f7", borderRadius: 2, verticalAlign: "middle" }} /></td></tr>
              <tr><td style={{ padding: "4px 8px", fontWeight: 600 }}>Background</td><td><code>#1a1a2e</code> <span style={{ display: "inline-block", width: 12, height: 12, background: "#1a1a2e", borderRadius: 2, verticalAlign: "middle", border: "1px solid #555" }} /></td></tr>
              <tr><td style={{ padding: "4px 8px", fontWeight: 600 }}>Text</td><td><code>#e0e0e0</code></td></tr>
              <tr><td style={{ padding: "4px 8px", fontWeight: 600 }}>Grid</td><td><code>#333</code></td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Custom Themes */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="custom-themes">Custom Themes</h2>

      <p>
        Pass a partial theme object and it will be deep-merged with the current
        theme. You only need to specify the properties you want to change:
      </p>

      <CodeBlock
        code={`// Only override colors — typography stays at defaults
<ThemeProvider theme={{
  colors: {
    primary: "#6366f1",
    categorical: ["#6366f1", "#ec4899", "#14b8a6", "#f59e0b"],
    background: "#fafafa",
    text: "#1e293b",
    textSecondary: "#64748b",
    grid: "#e2e8f0",
    border: "#cbd5e1",
  }
}}>
  {/* charts */}
</ThemeProvider>

// Only override typography
<ThemeProvider theme={{
  typography: {
    fontFamily: '"Inter", sans-serif',
    titleSize: 18,
    labelSize: 13,
    tickSize: 11,
  }
}}>
  {/* charts */}
</ThemeProvider>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* CSS Custom Properties */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="css-custom-properties">CSS Custom Properties</h2>

      <p>
        ThemeProvider injects CSS custom properties on a wrapper <code>div</code>,
        making it easy to style surrounding UI elements to match:
      </p>

      <CodeBlock
        code={`/* Available CSS custom properties */
--semiotic-bg          /* colors.background */
--semiotic-text        /* colors.text */
--semiotic-text-secondary  /* colors.textSecondary */
--semiotic-grid        /* colors.grid */
--semiotic-border      /* colors.border */
--semiotic-primary     /* colors.primary */
--semiotic-font-family /* typography.fontFamily */`}
        language="css"
      />

      <CodeBlock
        code={`/* Example: style a dashboard wrapper to match the theme */
.dashboard-panel {
  background: var(--semiotic-bg);
  color: var(--semiotic-text);
  font-family: var(--semiotic-font-family);
  border: 1px solid var(--semiotic-border);
}`}
        language="css"
      />

      {/* ----------------------------------------------------------------- */}
      {/* useTheme Hook */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="usetheme-hook">useTheme Hook</h2>

      <p>
        For custom components that need to read the current theme, use the{" "}
        <code>useTheme</code> hook. It returns the full{" "}
        <code>SemioticTheme</code> object:
      </p>

      <CodeBlock
        code={`import { useTheme } from "semiotic"

function ChartTitle({ text }) {
  const theme = useTheme()
  return (
    <h3 style={{
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.titleSize,
    }}>
      {text}
    </h3>
  )
}`}
        language="jsx"
      />

      <p>
        <strong>Note:</strong> <code>useTheme</code> must be called inside a{" "}
        <code>ThemeProvider</code>. Without a provider, it returns the default
        light theme.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <h3>ThemeProvider</h3>
      <PropTable componentName="ThemeProvider" props={themeProviderProps} />

      <h3 style={{ marginTop: "32px" }}>SemioticTheme Shape</h3>
      <PropTable componentName="SemioticTheme" props={themeShapeProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Theming vs Styling */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="theming-vs-styling">Theming vs Styling</h2>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--surface-3, #e0e0e0)" }}>
            <th style={{ textAlign: "left", padding: "8px" }}>Approach</th>
            <th style={{ textAlign: "left", padding: "8px" }}>Scope</th>
            <th style={{ textAlign: "left", padding: "8px" }}>Best for</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid var(--surface-3, #e0e0e0)" }}>
            <td style={{ padding: "8px" }}><code>ThemeProvider</code></td>
            <td style={{ padding: "8px" }}>All wrapped charts</td>
            <td style={{ padding: "8px" }}>Consistent brand colors, dark mode, typography</td>
          </tr>
          <tr style={{ borderBottom: "1px solid var(--surface-3, #e0e0e0)" }}>
            <td style={{ padding: "8px" }}><code>colorBy</code> / <code>colorScheme</code></td>
            <td style={{ padding: "8px" }}>Single chart</td>
            <td style={{ padding: "8px" }}>Data-driven color encoding per chart</td>
          </tr>
          <tr style={{ borderBottom: "1px solid var(--surface-3, #e0e0e0)" }}>
            <td style={{ padding: "8px" }}><code>frameProps.style</code></td>
            <td style={{ padding: "8px" }}>Individual marks</td>
            <td style={{ padding: "8px" }}>Fine-grained per-mark styling, patterns, sketchy rendering</td>
          </tr>
        </tbody>
      </table>

      <p style={{ marginTop: "16px" }}>
        These approaches compose — a ThemeProvider sets the base look, individual
        charts can override with <code>colorScheme</code>, and{" "}
        <code>frameProps</code> handles the edge cases.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/features/styling">Styling</Link> — per-mark styling,
          sketchy rendering, SVG patterns and gradients
        </li>
        <li>
          <Link to="/features/legends">Legends</Link> — automatic legends
          that respect theme colors
        </li>
        <li>
          <Link to="/features/small-multiples">Linked Charts</Link> — coordinated
          views that share a theme
        </li>
      </ul>
    </PageLayout>
  )
}
