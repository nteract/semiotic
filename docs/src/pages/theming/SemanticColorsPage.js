import React from "react"
import {
  RealtimeHistogram,
  BarChart,
  StackedBarChart,
} from "semiotic"

import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const baseTime = new Date("2026-04-01T10:00:00Z").getTime()
const errorValues = [2, 4, 3, 6, 5, 7, 4, 8, 6, 5]
const warningValues = [9, 12, 15, 18, 14, 20, 17, 22, 19, 16]
const histogramData = Array.from({ length: 16 }, (_, idx) => [
  {
    timestamp: baseTime + idx * 60_000,
    value: errorValues[idx % errorValues.length],
    category: "errors",
  },
  {
    timestamp: baseTime + idx * 60_000,
    value: warningValues[idx % warningValues.length],
    category: "warnings",
  },
]).flat()

const statusBarData = [
  { category: "Service A", value: 98, status: "success" },
  { category: "Service B", value: 76, status: "warning" },
  { category: "Service C", value: 42, status: "danger" },
  { category: "Service D", value: 88, status: "success" },
  { category: "Service E", value: 65, status: "warning" },
]

// ---------------------------------------------------------------------------
// Swatch component — displays a single role with its computed CSS var
// ---------------------------------------------------------------------------

function Swatch({ role, label }) {
  const cssVar = `var(--semiotic-${role})`
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 12px",
        border: "1px solid var(--semiotic-border)",
        borderRadius: 6,
        minWidth: 180,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          background: cssVar,
          border: "1px solid var(--semiotic-border)",
          borderRadius: 4,
          flexShrink: 0,
        }}
      />
      <div style={{ fontSize: 13, display: "flex", flexDirection: "column" }}>
        <strong>{label}</strong>
        <code style={{ fontSize: 11, opacity: 0.7 }}>--semiotic-{role}</code>
      </div>
    </div>
  )
}

function RoleGrid() {
  const roles = [
    { role: "primary", label: "Primary" },
    { role: "secondary", label: "Secondary" },
    { role: "success", label: "Success" },
    { role: "danger", label: "Danger" },
    { role: "warning", label: "Warning" },
    { role: "error", label: "Error" },
    { role: "info", label: "Info" },
    { role: "text", label: "Text" },
    { role: "text-secondary", label: "Text secondary" },
    { role: "border", label: "Border" },
    { role: "grid", label: "Grid" },
    { role: "surface", label: "Surface" },
  ]
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 12,
        margin: "16px 0",
      }}
    >
      {roles.map((r) => (
        <Swatch key={r.role} role={r.role} label={r.label} />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SemanticColorsPage() {
  return (
    <PageLayout
      title="Semantic Colors"
      breadcrumbs={[
        { label: "Theming", path: "/theming" },
        { label: "Semantic Colors", path: "/theming/semantic-colors" },
      ]}
      prevPage={{ title: "Theme Provider", path: "/theming/theme-provider" }}
      nextPage={{ title: "Theme Explorer", path: "/theming/theme-explorer" }}
    >
      <p>
        Semiotic's theme layer owns four color dimensions. Three you already
        know — <strong>primary</strong>, <strong>categorical</strong>,{" "}
        <strong>sequential</strong>, <strong>diverging</strong>. The fourth is
        a set of <strong>semantic status roles</strong>: named colors for
        success, danger, warning, error, and info that any chart can pick up
        through the same theme plumbing.
      </p>

      <p>
        The goal is one vocabulary for designers. Instead of passing a custom
        color per chart, put the color on the theme once and every chart that
        needs "danger" gets the same red — in the same mode, overridable in
        the same way.
      </p>

      {/* ------------------------------------------------------------- */}
      <h2 id="four-dimensions">The four theme dimensions</h2>

      <p>
        Every <code>SemioticTheme</code> declares <code>colors</code> with
        four complementary kinds of value:
      </p>

      <ol>
        <li>
          <strong>Semantic scalars</strong> — single colors per semantic
          meaning: <code>primary</code>, <code>secondary</code>,{" "}
          <code>success</code>, <code>danger</code>, <code>warning</code>,{" "}
          <code>error</code>, <code>info</code>, plus UI roles like{" "}
          <code>text</code>, <code>border</code>, <code>grid</code>,{" "}
          <code>surface</code>.
        </li>
        <li>
          <strong>Categorical scale</strong> — array of distinct colors for
          unordered category encodings (<code>colors.categorical</code>).
        </li>
        <li>
          <strong>Sequential scale</strong> — named d3-scale-chromatic
          scheme for magnitude encodings: heatmap, choropleth, size
          (<code>colors.sequential</code>).
        </li>
        <li>
          <strong>Diverging scale</strong> — named d3-scale-chromatic scheme
          for midpoint encodings: likert, bivariate, ± deviation
          (<code>colors.diverging</code>).
        </li>
      </ol>

      <p>
        A designer customizes any of the four. An engineer doesn't choose
        per-chart colors for status; they just set the role on the theme and
        every chart downstream picks it up.
      </p>

      {/* ------------------------------------------------------------- */}
      <h2 id="semantic-roles">Semantic role vocabulary</h2>

      <p>
        Every preset defines these scalars. Use them when a color carries
        meaning beyond "n-th category."
      </p>

      <RoleGrid />

      <h3>When to reach for which</h3>

      <ul>
        <li>
          <strong>primary / secondary</strong> — Default fill or stroke when
          the chart has no color encoding. Also the accent color for
          interactive affordances like the linked-hover highlight.
        </li>
        <li>
          <strong>success, danger, warning, error, info</strong> — Status
          semantics. Use on waterfall positive/negative, swimlane state
          badges, alert-style annotations, threshold reference lines. The
          rule of thumb: if a non-designer would call it a "color for
          meaning," it belongs here.
        </li>
        <li>
          <strong>text / textSecondary</strong> — Axis labels, tick text,
          legend items, annotation text. <em>textSecondary</em> is lower
          emphasis — tick labels vs axis titles.
        </li>
        <li>
          <strong>border / grid</strong> — Chart chrome. Bar outlines,
          axis lines, gridlines, legend separators.
        </li>
        <li>
          <strong>surface</strong> — Elevated background (tooltip
          background, card backing, annotation callouts), distinct from
          the chart's main <code>background</code>.
        </li>
      </ul>

      {/* ------------------------------------------------------------- */}
      <h2 id="using-roles">Using roles on charts</h2>

      <p>
        Any chart prop that takes a color accepts a CSS variable. Pass{" "}
        <code>stroke="var(--semiotic-border)"</code> on a{" "}
        <code>RealtimeHistogram</code> and the stroke resolves to the
        active theme's border color — in light mode, dark mode, or any
        brand preset.
      </p>

      <div style={{ margin: "24px 0" }}>
        <RealtimeHistogram
          data={histogramData}
          binSize={60_000}
          timeAccessor="timestamp"
          valueAccessor="value"
          categoryAccessor="category"
          colors={{ errors: "var(--semiotic-danger)", warnings: "var(--semiotic-warning)" }}
          stroke="var(--semiotic-border)"
          strokeWidth={1}
          width={600}
          height={220}
          windowSize={histogramData.length}
        />
      </div>

      <CodeBlock
        code={`<RealtimeHistogram
  data={events}
  binSize={60_000}
  timeAccessor="timestamp"
  valueAccessor="value"
  categoryAccessor="category"
  colors={{
    errors: "var(--semiotic-danger)",    // Inherited from theme
    warnings: "var(--semiotic-warning)", // Inherited from theme
  }}
  stroke="var(--semiotic-border)"        // Separates stacked segments
  strokeWidth={1}
/>`}
      />

      <p>
        Because the category fills are CSS variables, flipping the ambient
        theme (light → dark) changes all three colors at once — no per-chart
        override required. The bars even look correct against every preset's
        background because <code>--semiotic-border</code> is defined relative
        to <code>--semiotic-bg</code> within each preset.
      </p>

      {/* ------------------------------------------------------------- */}
      <h2 id="cascade-override">CSS cascade override</h2>

      <p>
        The theme provider emits one CSS custom property per semantic role
        (<code>--semiotic-success</code>, <code>--semiotic-danger</code>,
        etc.) at its mount root. Any descendant DOM node can override a
        single role for its subtree without replacing the whole theme.
      </p>

      <p>
        <strong>Use case:</strong> "the charts in this compliance dashboard
        have a brand-specific red for 'critical' that's different from the
        rest of the app." You don't re-theme the app — you cascade-override
        the role.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          margin: "16px 0",
        }}
      >
        <div>
          <h4 style={{ marginTop: 0 }}>Default theme</h4>
          <BarChart
            data={statusBarData}
            categoryAccessor="category"
            valueAccessor="value"
            width={320}
            height={200}
            color="var(--semiotic-danger)"
            showLegend={false}
          />
        </div>

        <div style={{ "--semiotic-danger": "#4b0082" }}>
          <h4 style={{ marginTop: 0 }}>Scoped override (purple)</h4>
          <BarChart
            data={statusBarData}
            categoryAccessor="category"
            valueAccessor="value"
            width={320}
            height={200}
            color="var(--semiotic-danger)"
            showLegend={false}
          />
        </div>
      </div>

      <CodeBlock
        code={`{/* Anywhere in the component tree, scoped to this subtree */}
<div style={{ "--semiotic-danger": "#4b0082" }}>
  <BarChart color="var(--semiotic-danger)" ... />
  <Waterfall ... />  {/* Also picks up the override */}
</div>`}
      />

      <p>
        The chart renders on <code>&lt;canvas&gt;</code>, but the CSS cascade
        still reaches it — Semiotic reads each CSS variable via{" "}
        <code>getComputedStyle</code> on the canvas's DOM ancestor at paint
        time. The override is a zero-JS change: no <code>ThemeProvider</code>{" "}
        required, no prop drilling, standard cascade rules apply.
      </p>

      {/* ------------------------------------------------------------- */}
      <h2 id="scale-overrides">Overriding scales (nested ThemeProvider)</h2>

      <p>
        CSS custom properties handle scalars cleanly but don't ergonomically
        carry arrays like the categorical palette or sequential scheme name.
        For <em>scale</em> overrides — swapping the palette or scheme for a
        subtree — nest a <code>ThemeProvider</code> with just the values you
        want to change.
      </p>

      <CodeBlock
        code={`<ThemeProvider theme="light">
  {/* All charts below here use the light theme's categorical palette */}

  <ThemeProvider theme={{
    colors: {
      categorical: ["#5a189a", "#9d4edd", "#c77dff"],
    },
  }}>
    {/* Charts in here use the purple palette for categories,
        but inherit everything else from the parent light theme */}
    <BarChart colorBy="region" ... />
  </ThemeProvider>

</ThemeProvider>`}
      />

      <p>
        The inner provider shallow-merges onto the outer one — anything
        unspecified is inherited. Scoping is by React subtree (not CSS
        cascade), so the nested override only applies to descendants, not
        siblings.
      </p>

      <h3>When to use which override</h3>

      <ul>
        <li>
          <strong>Scalar role</strong> (single color) → CSS custom property
          on any DOM ancestor: <code>{`<div style={{ "--semiotic-danger": "#c00" }}>`}</code>.
        </li>
        <li>
          <strong>Palette or scale</strong> (array / named scheme) → nested
          <code>ThemeProvider</code> with a partial theme.
        </li>
        <li>
          <strong>Whole theme</strong> (dark mode for one section) → nested{" "}
          <code>ThemeProvider</code> with a full preset.
        </li>
      </ul>

      {/* ------------------------------------------------------------- */}
      <h2 id="status-semantics">Status semantics — worked examples</h2>

      <h3>Waterfall ±</h3>

      <p>
        Waterfall bars are intrinsically status-coded: positive = gain,
        negative = loss. Set the colors once on the theme and every
        waterfall in the app inherits the same semantics.
      </p>

      <CodeBlock
        code={`{/* Theme definition — done once for the whole app */}
<ThemeProvider theme={{
  ...LIGHT_THEME,
  colors: {
    ...LIGHT_THEME.colors,
    success: "#0b8457",   // Gains
    danger:  "#c23030",   // Losses
  },
}}>
  {/* Every waterfall downstream inherits both colors */}
  <Waterfall
    data={quarterly}
    categoryAccessor="quarter"
    valueAccessor="delta"
    positiveColor="var(--semiotic-success)"
    negativeColor="var(--semiotic-danger)"
  />
</ThemeProvider>`}
      />

      <h3>Stacked bars with status-driven categories</h3>

      <p>
        A stacked bar chart where the stack layers <em>are</em> statuses
        (errors / warnings / info) can be entirely theme-driven:
      </p>

      <div style={{ margin: "16px 0" }}>
        <StackedBarChart
          data={[
            { team: "Alpha", status: "ok", count: 42 },
            { team: "Alpha", status: "warning", count: 6 },
            { team: "Alpha", status: "error", count: 2 },
            { team: "Beta", status: "ok", count: 38 },
            { team: "Beta", status: "warning", count: 9 },
            { team: "Beta", status: "error", count: 4 },
            { team: "Gamma", status: "ok", count: 28 },
            { team: "Gamma", status: "warning", count: 3 },
            { team: "Gamma", status: "error", count: 1 },
          ]}
          categoryAccessor="team"
          stackBy="status"
          valueAccessor="count"
          width={520}
          height={220}
          colorScheme={[
            "var(--semiotic-success)",
            "var(--semiotic-warning)",
            "var(--semiotic-error)",
          ]}
        />
      </div>

      <CodeBlock
        code={`<StackedBarChart
  data={deployments}
  categoryAccessor="team"
  stackBy="status"
  valueAccessor="count"
  colorScheme={[
    "var(--semiotic-success)",
    "var(--semiotic-warning)",
    "var(--semiotic-error)",
  ]}
/>`}
      />

      <p>
        Flip the app to dark mode, swap to the Carbon theme, or have a
        compliance dashboard tweak a single role via CSS — the chart
        updates correctly in every case without code changes.
      </p>

      {/* ------------------------------------------------------------- */}
      <h2 id="css-var-reference">CSS variable reference</h2>

      <p>
        Every scalar role emitted by <code>ThemeProvider</code>. All are
        overridable by setting the same-named property on any ancestor DOM
        node.
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--semiotic-border)" }}>
            <th style={{ textAlign: "left", padding: "6px 8px" }}>CSS variable</th>
            <th style={{ textAlign: "left", padding: "6px 8px" }}>Theme field</th>
            <th style={{ textAlign: "left", padding: "6px 8px" }}>Typical use</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["--semiotic-primary", "colors.primary", "Default fill/stroke; accent"],
            ["--semiotic-secondary", "colors.secondary", "Secondary accent; often neutral gray"],
            ["--semiotic-success", "colors.success", "Positive status; gains"],
            ["--semiotic-danger", "colors.danger", "Negative status; losses"],
            ["--semiotic-warning", "colors.warning", "Cautionary states"],
            ["--semiotic-error", "colors.error", "Blocking errors"],
            ["--semiotic-info", "colors.info", "Informational callouts"],
            ["--semiotic-text", "colors.text", "Axis titles, legend labels"],
            ["--semiotic-text-secondary", "colors.textSecondary", "Tick labels, captions"],
            ["--semiotic-border", "colors.border", "Chart outlines, separators"],
            ["--semiotic-grid", "colors.grid", "Gridlines"],
            ["--semiotic-surface", "colors.surface", "Elevated fills (tooltip bg)"],
            ["--semiotic-bg", "colors.background", "Chart canvas background"],
            ["--semiotic-focus", "colors.focus", "Focus ring"],
            ["--semiotic-annotation-color", "colors.annotation", "Annotation markers/text"],
          ].map(([cssVar, themeField, useCase]) => (
            <tr key={cssVar} style={{ borderBottom: "1px solid var(--semiotic-border)" }}>
              <td style={{ padding: "6px 8px" }}>
                <code>{cssVar}</code>
              </td>
              <td style={{ padding: "6px 8px" }}>
                <code>{themeField}</code>
              </td>
              <td style={{ padding: "6px 8px" }}>{useCase}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ------------------------------------------------------------- */}
      <h2 id="how-it-works">How it works under the hood</h2>

      <p>
        Semiotic resolves theme colors through a layered pipeline. The layers
        are deliberate so that overrides compose predictably:
      </p>

      <ol>
        <li>
          <strong>Theme object</strong> is the source of truth —{" "}
          <code>SemioticTheme.colors</code> holds every scalar, palette,
          scheme.
        </li>
        <li>
          <strong>ThemeProvider emits CSS custom properties</strong> at its
          mount element for every scalar role.
        </li>
        <li>
          <strong>Scene builders receive concrete values</strong> via the
          rendering pipeline config (<code>pipelineConfig.themeSemantic</code>),
          so canvas rendering has concrete hex without DOM reads in the
          hot path.
        </li>
        <li>
          <strong>Canvas CSS-var reads</strong> (via{" "}
          <code>getComputedStyle</code>) happen only for values passed
          explicitly as <code>var(--...)</code> strings in chart props —
          so the cascade override works for user-supplied values without
          costing per-paint lookups for theme defaults.
        </li>
      </ol>

      <p>
        The upshot: a designer can set the theme once, override a single
        role with a CSS property, or swap a scale with a nested provider —
        each cleanly scoped, each without reaching for a per-chart override.
      </p>
    </PageLayout>
  )
}
