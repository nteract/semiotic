import React, { useState, useMemo } from "react"
import {
  ThemeProvider,
  BarChart,
  LineChart,
  Scatterplot,
  DonutChart,
  LIGHT_THEME,
  DARK_THEME,
  HIGH_CONTRAST_THEME,
} from "semiotic"
import {
  THEME_PRESETS,
  themeToCSS,
  themeToTokens,
} from "semiotic"

import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
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

const scatterData = [
  { x: 10, y: 30, group: "A" },
  { x: 25, y: 60, group: "B" },
  { x: 40, y: 45, group: "A" },
  { x: 55, y: 80, group: "C" },
  { x: 70, y: 35, group: "B" },
  { x: 85, y: 65, group: "C" },
  { x: 15, y: 50, group: "A" },
  { x: 30, y: 70, group: "B" },
  { x: 60, y: 25, group: "C" },
  { x: 75, y: 55, group: "A" },
  { x: 45, y: 90, group: "B" },
  { x: 90, y: 40, group: "C" },
]

const donutData = [
  { category: "Engineering", value: 35 },
  { category: "Design", value: 20 },
  { category: "Marketing", value: 25 },
  { category: "Sales", value: 20 },
]

// ---------------------------------------------------------------------------
// Preset metadata for display
// ---------------------------------------------------------------------------

const PRESET_GROUPS = [
  {
    label: "Base",
    presets: ["light", "dark", "high-contrast"],
  },
  {
    label: "Tufte",
    presets: ["tufte", "tufte-dark"],
  },
  {
    label: "Pastels",
    presets: ["pastels", "pastels-dark"],
  },
  {
    label: "BI Tool",
    presets: ["bi-tool", "bi-tool-dark"],
  },
  {
    label: "Italian",
    presets: ["italian", "italian-dark"],
  },
  {
    label: "Journalist",
    presets: ["journalist", "journalist-dark"],
  },
  {
    label: "Playful",
    presets: ["playful", "playful-dark"],
  },
]

// ---------------------------------------------------------------------------
// CSS variable editor state
// ---------------------------------------------------------------------------

const EDITABLE_VARS = [
  { key: "background", cssVar: "--semiotic-bg", label: "Background", type: "color" },
  { key: "text", cssVar: "--semiotic-text", label: "Text", type: "color" },
  { key: "textSecondary", cssVar: "--semiotic-text-secondary", label: "Text Secondary", type: "color" },
  { key: "grid", cssVar: "--semiotic-grid", label: "Grid", type: "color" },
  { key: "border", cssVar: "--semiotic-border", label: "Border", type: "color" },
  { key: "primary", cssVar: "--semiotic-primary", label: "Primary", type: "color" },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ColorSwatch({ color, size = 16 }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        background: color,
        borderRadius: 3,
        verticalAlign: "middle",
        border: "1px solid rgba(128, 128, 128, 0.3)",
        marginRight: 6,
      }}
    />
  )
}

function CategoricalPalette({ colors }) {
  return (
    <div style={{ display: "flex", gap: 2, marginTop: 4 }}>
      {colors.map((c, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            width: 24,
            height: 14,
            background: c,
            borderRadius: 2,
            border: "1px solid rgba(128, 128, 128, 0.2)",
          }}
          title={c}
        />
      ))}
    </div>
  )
}

function PresetButton({ name, isActive, onClick }) {
  const theme = THEME_PRESETS[name]
  if (!theme) return null

  return (
    <button
      onClick={() => onClick(name)}
      style={{
        padding: "8px 12px",
        border: `2px solid ${isActive ? "var(--accent, #6366f1)" : "var(--surface-3, #ccc)"}`,
        borderRadius: 8,
        background: isActive ? "var(--accent, #6366f1)" : theme.colors.background,
        color: isActive ? "#fff" : theme.colors.text,
        cursor: "pointer",
        fontWeight: isActive ? 600 : 400,
        fontSize: 12,
        minWidth: 80,
        textAlign: "center",
        transition: "all 0.15s ease",
        fontFamily: theme.typography.fontFamily,
      }}
    >
      {name}
    </button>
  )
}

function VariableEditor({ theme, overrides, onOverride }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 12,
        marginTop: 12,
      }}
    >
      {EDITABLE_VARS.map((v) => {
        const currentValue = overrides[v.key] || theme.colors[v.key] || ""
        const isOverridden = v.key in overrides
        return (
          <div
            key={v.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 8px",
              borderRadius: 6,
              background: isOverridden
                ? "rgba(99, 102, 241, 0.08)"
                : "var(--surface-1, #f5f5f5)",
              border: isOverridden
                ? "1px solid var(--accent, #6366f1)"
                : "1px solid var(--surface-3, #e0e0e0)",
            }}
          >
            <input
              type="color"
              value={currentValue}
              onChange={(e) => onOverride(v.key, e.target.value)}
              style={{ width: 28, height: 28, border: "none", cursor: "pointer", padding: 0, background: "none" }}
              title={v.cssVar}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{v.label}</div>
              <div style={{ fontSize: 10, color: "var(--text-secondary, #666)", fontFamily: "monospace" }}>
                {v.cssVar}
              </div>
            </div>
            {isOverridden && (
              <button
                onClick={() => onOverride(v.key, null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  color: "var(--text-secondary, #999)",
                  padding: "2px 4px",
                }}
                title="Reset to theme default"
              >
                x
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function CategoricalEditor({ theme, overrides, onOverride }) {
  const cats = overrides.categorical || theme.colors.categorical || []
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Categorical Palette</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {cats.map((c, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input
              type="color"
              value={c}
              onChange={(e) => {
                const newCats = [...cats]
                newCats[i] = e.target.value
                onOverride("categorical", newCats)
              }}
              style={{ width: 28, height: 28, border: "none", cursor: "pointer", padding: 0, background: "none" }}
            />
            <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--text-secondary)" }}>{c}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FontEditor({ theme, overrides, onOverride }) {
  const families = [
    "sans-serif",
    "Inter, system-ui, sans-serif",
    "Georgia, 'Times New Roman', serif",
    "'Helvetica Neue', Helvetica, Arial, sans-serif",
    "'Segoe UI', -apple-system, sans-serif",
    "'Franklin Gothic Medium', 'Libre Franklin', sans-serif",
    "'Nunito', 'Poppins', system-ui, sans-serif",
    "'SF Mono', 'Fira Code', monospace",
  ]
  const current = overrides.fontFamily || theme.typography.fontFamily

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Font Family</div>
      <select
        value={current}
        onChange={(e) => onOverride("fontFamily", e.target.value)}
        style={{
          padding: "6px 10px",
          borderRadius: 6,
          border: "1px solid var(--surface-3, #ccc)",
          background: "var(--surface-1, #fff)",
          color: "var(--text-primary, #333)",
          fontSize: 13,
          fontFamily: current,
          width: "100%",
          maxWidth: 400,
        }}
      >
        {families.map((f) => (
          <option key={f} value={f} style={{ fontFamily: f }}>
            {f.split(",")[0].replace(/'/g, "")}
          </option>
        ))}
      </select>
    </div>
  )
}

export default function ThemeExplorerPage() {
  const [activePreset, setActivePreset] = useState("light")
  const [overrides, setOverrides] = useState({})
  const [showCode, setShowCode] = useState(false)
  const [codeFormat, setCodeFormat] = useState("css")

  const baseTheme = THEME_PRESETS[activePreset] || LIGHT_THEME

  const resolvedTheme = useMemo(() => {
    const colors = { ...baseTheme.colors }
    const typography = { ...baseTheme.typography }

    for (const v of EDITABLE_VARS) {
      if (overrides[v.key]) {
        colors[v.key] = overrides[v.key]
      }
    }
    if (overrides.categorical) {
      colors.categorical = overrides.categorical
    }
    if (overrides.fontFamily) {
      typography.fontFamily = overrides.fontFamily
    }

    return {
      ...baseTheme,
      colors,
      typography,
      tooltip: baseTheme.tooltip,
      borderRadius: baseTheme.borderRadius,
    }
  }, [baseTheme, overrides])

  const handleOverride = (key, value) => {
    if (value === null) {
      setOverrides((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    } else {
      setOverrides((prev) => ({ ...prev, [key]: value }))
    }
  }

  const handlePresetChange = (name) => {
    setActivePreset(name)
    setOverrides({})
  }

  const hasOverrides = Object.keys(overrides).length > 0

  const exportedCode = useMemo(() => {
    if (codeFormat === "css") {
      return themeToCSS(resolvedTheme, "[data-semiotic-theme=\"custom\"]")
    }
    if (codeFormat === "tokens") {
      return JSON.stringify(themeToTokens(resolvedTheme), null, 2)
    }
    // JSX format
    const overrideLines = []
    for (const v of EDITABLE_VARS) {
      if (overrides[v.key]) {
        overrideLines.push(`    ${v.key}: "${overrides[v.key]}",`)
      }
    }
    if (overrides.categorical) {
      overrideLines.push(`    categorical: ${JSON.stringify(overrides.categorical)},`)
    }

    if (!hasOverrides) {
      return `<ThemeProvider theme="${activePreset}">\n  {/* your charts */}\n</ThemeProvider>`
    }

    return `<ThemeProvider theme={{
  ...${activePreset.replace(/-/g, "_").toUpperCase()},
  colors: {
    ...${activePreset.replace(/-/g, "_").toUpperCase()}.colors,
${overrideLines.join("\n")}
  },${overrides.fontFamily ? `\n  typography: {\n    ...${activePreset.replace(/-/g, "_").toUpperCase()}.typography,\n    fontFamily: "${overrides.fontFamily}",\n  },` : ""}
}}>
  {/* your charts */}
</ThemeProvider>`
  }, [resolvedTheme, codeFormat, activePreset, overrides, hasOverrides])

  return (
    <PageLayout
      title="Theme Explorer"
      breadcrumbs={[
        { label: "Theming", path: "/theming" },
        { label: "Theme Explorer", path: "/theming/theme-explorer" },
      ]}
      prevPage={{ title: "Theme Provider", path: "/theming/theme-provider" }}
      nextPage={{ title: "Cookbook", path: "/cookbook" }}
    >
      <p>
        Interactively explore all 15 named theme presets, customize colors and
        typography, and export the result as CSS custom properties, design
        tokens, or JSX code.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Preset Selector */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="presets">Theme Presets</h2>

      <p>Select a preset as your starting point:</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {PRESET_GROUPS.map((group) => (
          <div key={group.label}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--text-secondary, #666)",
                marginBottom: 4,
              }}
            >
              {group.label}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {group.presets.map((name) => (
                <PresetButton
                  key={name}
                  name={name}
                  isActive={activePreset === name && !hasOverrides}
                  onClick={handlePresetChange}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Customization */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="customize">Customize</h2>

      <p>
        Edit individual tokens below. Changes override the active preset.
        {hasOverrides && (
          <>
            {" "}
            <button
              onClick={() => setOverrides({})}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent, #6366f1)",
                cursor: "pointer",
                textDecoration: "underline",
                fontSize: "inherit",
                padding: 0,
              }}
            >
              Reset all overrides
            </button>
          </>
        )}
      </p>

      <VariableEditor
        theme={baseTheme}
        overrides={overrides}
        onOverride={handleOverride}
      />

      <CategoricalEditor
        theme={baseTheme}
        overrides={overrides}
        onOverride={handleOverride}
      />

      <FontEditor
        theme={baseTheme}
        overrides={overrides}
        onOverride={handleOverride}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Live Preview */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="preview">Live Preview</h2>

      <ThemeProvider theme={resolvedTheme}>
        <div
          style={{
            padding: 20,
            borderRadius: 8,
            background: resolvedTheme.colors.background,
            border: `1px solid ${resolvedTheme.colors.border}`,
            "--semiotic-bg": resolvedTheme.colors.background,
            "--semiotic-text": resolvedTheme.colors.text,
            "--semiotic-text-secondary": resolvedTheme.colors.textSecondary,
            "--semiotic-border": resolvedTheme.colors.border,
            "--semiotic-grid": resolvedTheme.colors.grid,
            "--semiotic-font-family": resolvedTheme.typography.fontFamily,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            <BarChart
              data={barData}
              categoryAccessor="category"
              valueAccessor="value"
              title="Bar Chart"
              showGrid
              height={260}
              width={340}
              frameProps={{
                pieceStyle: () => ({ fill: resolvedTheme.colors.categorical[0] || resolvedTheme.colors.primary }),
              }}
            />
            <LineChart
              data={lineData}
              xAccessor="x"
              yAccessor="y"
              lineBy="id"
              colorBy="id"
              colorScheme={resolvedTheme.colors.categorical}
              title="Line Chart"
              showGrid
              height={260}
              width={340}
            />
            <Scatterplot
              data={scatterData}
              xAccessor="x"
              yAccessor="y"
              colorBy="group"
              colorScheme={resolvedTheme.colors.categorical}
              title="Scatterplot"
              showGrid
              height={260}
              width={340}
            />
            <DonutChart
              data={donutData}
              categoryAccessor="category"
              valueAccessor="value"
              colorBy="category"
              colorScheme={resolvedTheme.colors.categorical}
              title="Donut Chart"
              height={260}
              width={340}
            />
          </div>

          {/* Theme metadata */}
          <div
            style={{
              display: "flex",
              gap: 24,
              marginTop: 16,
              padding: "12px 16px",
              background: "rgba(128, 128, 128, 0.06)",
              borderRadius: 6,
              fontSize: 12,
              color: resolvedTheme.colors.textSecondary,
              fontFamily: resolvedTheme.typography.fontFamily,
            }}
          >
            <div>
              <strong style={{ color: resolvedTheme.colors.text }}>Preset:</strong>{" "}
              {activePreset}
              {hasOverrides ? " (customized)" : ""}
            </div>
            <div>
              <strong style={{ color: resolvedTheme.colors.text }}>Mode:</strong>{" "}
              {resolvedTheme.mode}
            </div>
            <div>
              <strong style={{ color: resolvedTheme.colors.text }}>Font:</strong>{" "}
              {resolvedTheme.typography.fontFamily.split(",")[0].replace(/'/g, "")}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <strong style={{ color: resolvedTheme.colors.text }}>Palette:</strong>
              {resolvedTheme.colors.categorical.map((c, i) => (
                <ColorSwatch key={i} color={c} size={12} />
              ))}
            </div>
          </div>
        </div>
      </ThemeProvider>

      {/* ----------------------------------------------------------------- */}
      {/* Export */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="export">Export</h2>

      <p>
        Copy the generated code to use your theme in your project:
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[
          { key: "jsx", label: "JSX" },
          { key: "css", label: "CSS" },
          { key: "tokens", label: "Design Tokens" },
        ].map((fmt) => (
          <button
            key={fmt.key}
            onClick={() => {
              setCodeFormat(fmt.key)
              setShowCode(true)
            }}
            style={{
              padding: "6px 14px",
              border: `2px solid ${codeFormat === fmt.key ? "var(--accent, #6366f1)" : "var(--surface-3, #ccc)"}`,
              borderRadius: 6,
              background: codeFormat === fmt.key ? "var(--accent, #6366f1)" : "transparent",
              color: codeFormat === fmt.key ? "#fff" : "var(--text-primary, #333)",
              cursor: "pointer",
              fontWeight: codeFormat === fmt.key ? 600 : 400,
              fontSize: 13,
            }}
          >
            {fmt.label}
          </button>
        ))}
      </div>

      <CodeBlock
        code={exportedCode}
        language={codeFormat === "tokens" ? "json" : codeFormat === "css" ? "css" : "jsx"}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Preset Gallery */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="gallery">Preset Gallery</h2>

      <p>
        Visual comparison of all 15 presets. Each card shows the theme's
        categorical palette, font stack, and key colors.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 16,
          marginTop: 16,
        }}
      >
        {Object.entries(THEME_PRESETS).map(([name, theme]) => (
          <div
            key={name}
            style={{
              padding: 16,
              borderRadius: 8,
              background: theme.colors.background,
              border: `1px solid ${theme.colors.border}`,
              cursor: "pointer",
              transition: "box-shadow 0.15s ease",
            }}
            onClick={() => handlePresetChange(name)}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: theme.colors.text,
                fontFamily: theme.typography.fontFamily,
                marginBottom: 8,
              }}
            >
              {name}
            </div>

            <CategoricalPalette colors={theme.colors.categorical} />

            <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
              {["primary", "text", "textSecondary", "grid", "border"].map(
                (key) => (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                      fontSize: 10,
                      color: theme.colors.textSecondary,
                    }}
                  >
                    <ColorSwatch color={theme.colors[key]} size={10} />
                    <span>{key}</span>
                  </div>
                )
              )}
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 10,
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.fontFamily,
              }}
            >
              {theme.typography.fontFamily.split(",")[0].replace(/'/g, "")}
            </div>
          </div>
        ))}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* SSR / data-semiotic-theme */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="ssr-theming">SSR Theme Switching</h2>

      <p>
        For server-side rendering or CSS-only theme switching, use the{" "}
        <code>data-semiotic-theme</code> attribute. ThemeProvider automatically
        sets this attribute on its wrapper <code>div</code>, making it available
        as a CSS selector.
      </p>

      <CodeBlock
        code={`/* Generated with themeToCSS() — include in your stylesheet */
${themeToCSS(THEME_PRESETS["tufte"], '[data-semiotic-theme="tufte"]')}

${themeToCSS(THEME_PRESETS["tufte-dark"], '[data-semiotic-theme="tufte-dark"]')}

/* Switch themes by changing the attribute — no JS needed after initial load */
<div data-semiotic-theme="tufte">
  <!-- charts inherit CSS custom properties from the attribute selector -->
</div>`}
        language="css"
      />

      <p>
        You can also generate CSS for all presets at build time:
      </p>

      <CodeBlock
        code={`import { THEME_PRESETS, themeToCSS } from "semiotic/themes"

// Generate CSS for all presets — useful for SSR stylesheets
const allCSS = Object.entries(THEME_PRESETS)
  .map(([name, theme]) =>
    themeToCSS(theme, \`[data-semiotic-theme="\${name}"]\`)
  )
  .join("\\n\\n")`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/theming/styling">Styling</Link> — per-mark styling,
          sketchy rendering, SVG patterns
        </li>
        <li>
          <Link to="/theming/theme-provider">Theme Provider</Link> — API
          reference and usage guide
        </li>
        <li>
          <Link to="/recipes/benchmark-dashboard">Benchmark Dashboard</Link>{" "}
          — recipe with live theme switching
        </li>
      </ul>
    </PageLayout>
  )
}
