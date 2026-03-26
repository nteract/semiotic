import React from "react"
import { LineChart, BarChart } from "semiotic"
import { diagnoseConfig } from "semiotic/utils"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const lineData = [
  { month: 1, revenue: 12000 },
  { month: 2, revenue: 18000 },
  { month: 3, revenue: 14000 },
  { month: 4, revenue: 22000 },
  { month: 5, revenue: 19000 },
  { month: 6, revenue: 27000 },
]

const barData = [
  { category: "Q1", revenue: 24000 },
  { category: "Q2", revenue: 31000 },
  { category: "Q3", revenue: 28000 },
  { category: "Q4", revenue: 36000 },
]

// ---------------------------------------------------------------------------
// DiagnoseConfig demo
// ---------------------------------------------------------------------------

function DiagnoseDemo() {
  const result = diagnoseConfig("LineChart", {
    data: [{ x: 1, y: 2 }],
    xAccessor: "x",
    yAccessor: "y",
    // No title, description, or summary — will trigger MISSING_DESCRIPTION
  })

  return (
    <div style={{
      background: "var(--surface-1)",
      borderRadius: 8,
      padding: 16,
      border: "1px solid var(--surface-3)",
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      lineHeight: 1.6,
    }}>
      <div style={{ marginBottom: 8, fontWeight: 600 }}>
        diagnoseConfig("LineChart", {"{"} data, xAccessor, yAccessor {"}"})
      </div>
      {result.diagnoses.map((d, i) => (
        <div key={i} style={{
          padding: "4px 8px",
          marginBottom: 4,
          borderRadius: 4,
          background: d.severity === "error" ? "rgba(220,53,69,0.1)" : "rgba(255,193,7,0.1)",
          color: d.severity === "error" ? "#dc3545" : "#856404",
        }}>
          <strong>[{d.code}]</strong> {d.message}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AccessibilityPage() {
  return (
    <PageLayout
      title="Accessibility"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Accessibility", path: "/features/accessibility" },
      ]}
      prevPage={{ title: "Composition", path: "/features/composition" }}
      nextPage={{ title: "Linked Charts", path: "/features/small-multiples" }}
    >
      <p>
        Semiotic renders charts on canvas for performance. Canvas-based rendering
        presents accessibility challenges because the visual output has no DOM
        structure for screen readers to traverse. This page documents what
        Semiotic provides and what you should add in your application.
      </p>

      <p>
        Semiotic's accessibility approach is informed by{" "}
        <a href="https://chartability.github.io/POUR-CAF/" target="_blank" rel="noopener noreferrer">
          Chartability
        </a>{" "}
        (Frank Elavsky's audit framework for data visualization accessibility)
        and aims to address its critical heuristics at the toolkit level.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Built-in Features */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="built-in">Built-in Accessibility Features</h2>

      <h3 id="aria-labels">ARIA Labels and Descriptions</h3>

      <p>
        Every chart renders its root container with <code>role="img"</code> and
        an <code>aria-label</code>. Use <code>title</code> for a brief label,{" "}
        <code>description</code> for a detailed aria-label override, and{" "}
        <code>summary</code> for a screen-reader-only note with trend information
        or key takeaways.
      </p>

      <LiveExample
        frameProps={{
          data: lineData,
          xAccessor: "month",
          yAccessor: "revenue",
          title: "Monthly Revenue Trend",
          description: "Line chart showing monthly revenue from January to June 2024",
          summary: "Revenue grew from $12,000 in January to $27,000 in June, with a brief dip in March to $14,000.",
          showGrid: true,
        }}
        type={LineChart}
        startHidden={false}
        overrideProps={{
          data: `[
  { month: 1, revenue: 12000 },
  { month: 2, revenue: 18000 },
  // ...
]`,
          title: '"Monthly Revenue Trend"',
          description: '"Line chart showing monthly revenue from January to June 2024"',
          summary: '"Revenue grew from $12,000 in January to $27,000 in June..."',
        }}
        hiddenProps={{}}
        title="Chart with Description and Summary"
      />

      <CodeBlock
        code={`// title → visible heading + fallback aria-label
// description → overrides aria-label with detailed text
// summary → screen-reader-only note (role="note")
<LineChart
  data={salesData}
  xAccessor="month"
  yAccessor="revenue"
  title="Monthly Revenue Trend"
  description="Line chart showing monthly revenue from January to June 2024"
  summary="Revenue grew steadily with a dip in March"
/>

// Works on all chart types
<BarChart title="Quarterly Sales"
  description="Bar chart comparing quarterly sales figures" ... />
<SankeyDiagram title="Budget Flow"
  summary="Engineering receives 45% of total budget" ... />`}
        language="jsx"
      />

      <h3 id="keyboard-navigation">Keyboard Navigation</h3>

      <p>
        All charts are focusable via <strong>Tab</strong>. Once focused, use
        arrow keys to navigate data — the tooltip follows keyboard focus, and
        a shape-appropriate dashed ring highlights the active element.
      </p>

      <p>
        Navigation is <strong>graph-based</strong>, not a flat list. In
        multi-series line charts, ArrowRight/Left moves along a series while
        ArrowUp/Down switches between series at the same x position. In
        stacked bar charts, ArrowRight/Left moves across categories and
        ArrowUp/Down moves between stacked segments. In network charts,
        ArrowRight/Left cycles through a node's neighbors and Enter follows
        the highlighted edge to that neighbor.
      </p>

      <CodeBlock
        code={`// Graph-based keyboard navigation — no props needed

// XY charts (line, area, scatter):
// ←/→ → move along series (x-axis order)
// ↑/↓ → switch between series at nearest x position

// Ordinal charts (bar, stacked bar):
// ←/→ → move within group (across categories)
// ↑/↓ → switch between groups (stack segments)

// Network charts (force, sankey, chord):
// ←/→ → cycle through neighbors
// ↑/↓ → cycle neighbors in reverse
// Enter → follow edge to highlighted neighbor

// Geo charts (choropleth, proportional symbol):
// ←/→/↑/↓ → spatial order (flat navigation)

// All chart types:
// PageDown/PageUp → skip by 10% of data points
// Home/End → jump to first/last point
// Escape → clear focus`}
        language="jsx"
      />

      <h3 id="data-table">Screen Reader Data Table</h3>

      <p>
        Every chart renders a visually-hidden data table (up to 500 rows)
        derived from the scene graph. This table is accessible to screen
        readers and provides a non-visual alternative to the chart. The table
        supports all scene node types: points, lines, areas, bars, wedges
        (pie/donut), circles (network nodes), arcs, candlesticks, heatmap
        cells, and geographic regions.
      </p>

      <p>
        The data table is on by default (<code>accessibleTable={"{true}"}</code>).
        When a chart receives keyboard focus, a <strong>"Skip to data table"</strong>{" "}
        link appears for screen readers and sighted keyboard users, allowing
        them to bypass navigating through every data point.
      </p>

      <CodeBlock
        code={`// Data table is on by default — disable if needed
<LineChart data={data} accessibleTable={false} />

// The skip link appears automatically when the chart is focused
// and accessibleTable is enabled (the default)`}
        language="jsx"
      />

      <h3 id="focus-ring">Focus Ring</h3>

      <p>
        When navigating with the keyboard, a dashed focus ring highlights the
        currently focused data element. The ring shape adapts to the element
        type — circles for points and network nodes, rectangles for bars and
        Sankey nodes. The focus color uses the{" "}
        <code>--semiotic-focus</code> CSS custom property (default: #005fcc).
      </p>

      <h3 id="aria-live">Live Announcements</h3>

      <p>
        When keyboard focus moves to a data point, an <code>aria-live="polite"</code>{" "}
        region announces the focused datum's values. This works automatically
        for all chart types — no configuration needed. Custom tooltips do
        not override the aria-live announcement.
      </p>

      <h3 id="reduced-motion">Reduced Motion</h3>

      <p>
        Semiotic automatically detects <code>prefers-reduced-motion: reduce</code>{" "}
        and fast-forwards data transitions to their final state (no animated
        interpolation), stops orbit animation ticking, and completes any
        in-progress layout transitions immediately. Pulse and decay visual
        encodings still render their static state but skip animated effects.
        No props needed — this is built into all four Stream Frames.
      </p>

      <CodeBlock
        code={`// Semiotic handles this automatically — no configuration needed.
// Transitions fast-forward to final state, orbit stops ticking.
// Pulse/decay encodings render statically (no animation).
//
// The hook is also available for your own UI:
import { useReducedMotion } from "semiotic"
const prefersReduced = useReducedMotion()`}
        language="jsx"
      />

      <h3 id="high-contrast">High Contrast Mode</h3>

      <p>
        When the operating system's high contrast or forced-colors mode is
        active, <code>ThemeProvider</code> automatically applies the{" "}
        <code>HIGH_CONTRAST_THEME</code> if no explicit theme is set. This
        ensures data marks have sufficient contrast and visibility without
        any configuration. When the user exits forced-colors mode, the theme
        reverts to the default.
      </p>

      <CodeBlock
        code={`import { ThemeProvider, HIGH_CONTRAST_THEME } from "semiotic"

// Automatic: ThemeProvider detects forced-colors and applies high-contrast
<ThemeProvider>
  <LineChart data={data} ... />
</ThemeProvider>

// Manual: explicitly set high-contrast theme
<ThemeProvider theme="high-contrast">
  <LineChart data={data} ... />
</ThemeProvider>

// Or apply directly via CSS custom properties:
// --semiotic-bg: #000; --semiotic-text: #fff; etc.`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Validation */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="validation">Accessibility Validation</h2>

      <p>
        <code>diagnoseConfig</code> includes accessibility-specific checks that
        warn when charts are missing accessible descriptions or have color
        contrast issues. Run it in development to catch issues early:
      </p>

      <DiagnoseDemo />

      <div style={{ marginTop: 16 }}>
        <CodeBlock
          code={`import { diagnoseConfig } from "semiotic/utils"

const result = diagnoseConfig("LineChart", {
  data: myData,
  xAccessor: "x",
  yAccessor: "y",
  // No title or description → MISSING_DESCRIPTION warning
})

// result.diagnoses includes:
// { code: "MISSING_DESCRIPTION",
//   message: "No title, description, or summary provided...",
//   severity: "warning",
//   fix: "Add a title=\\"...\\" prop..." }

// Accessibility checks included:
// - MISSING_DESCRIPTION — no title/description/summary
// - LOW_COLOR_CONTRAST — colors < 3:1 against background
// - LOW_ADJACENT_CONTRAST — adjacent categories hard to distinguish`}
          language="jsx"
        />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Best Practices */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="best-practices">Best Practices</h2>

      <h3 id="text-alternatives">Text Alternatives</h3>

      <p>
        Use the built-in <code>description</code> and <code>summary</code>{" "}
        props for programmatic accessibility. For visible text alternatives,
        wrap the chart in a <code>&lt;figure&gt;</code> with a{" "}
        <code>&lt;figcaption&gt;</code>:
      </p>

      <CodeBlock
        code={`<figure>
  <LineChart
    data={salesData}
    xAccessor="month"
    yAccessor="revenue"
    title="Monthly Revenue Trend"
    description="Line chart showing revenue growth from $12k to $27k"
    summary="Revenue grew 125% over 6 months with a brief dip in March"
  />
  <figcaption>
    Revenue grew from $12,000 in January to $27,000 in June,
    with a brief dip in March.
  </figcaption>
</figure>`}
        language="jsx"
      />

      <h3 id="color-contrast">Color and Contrast</h3>

      <p>
        Use colors with sufficient contrast ratios. Import the pre-tested
        color-blind safe palette for reliable accessibility:
      </p>

      <CodeBlock
        code={`import { COLOR_BLIND_SAFE_CATEGORICAL } from "semiotic"

// 8-color palette based on Wong 2011
<LineChart
  data={data}
  colorBy="region"
  colorScheme={COLOR_BLIND_SAFE_CATEGORICAL}
/>

// diagnoseConfig checks contrast automatically:
// LOW_COLOR_CONTRAST — color vs background < 3:1
// LOW_ADJACENT_CONTRAST — similar adjacent category colors`}
        language="jsx"
      />

      <h3 id="tooltip-accessibility">Accessible Tooltips</h3>

      <p>
        Semiotic's built-in aria-live region announces tooltip content
        automatically. When writing custom tooltip functions, you don't need
        to add your own aria attributes — the aria-live region handles it:
      </p>

      <CodeBlock
        code={`// The aria-live region announces data automatically
// Custom tooltip only needs to handle the visual:
<LineChart
  data={data}
  xAccessor="month"
  yAccessor="revenue"
  tooltip={(d) => (
    <div>
      <strong>{d.month}</strong>: \${d.revenue.toLocaleString()}
    </div>
  )}
/>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props Reference */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Accessibility Props Reference</h2>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--surface-3)" }}>
            <th style={{ textAlign: "left", padding: "8px 12px" }}>Prop</th>
            <th style={{ textAlign: "left", padding: "8px 12px" }}>Type</th>
            <th style={{ textAlign: "left", padding: "8px 12px" }}>Default</th>
            <th style={{ textAlign: "left", padding: "8px 12px" }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["title", "string | ReactNode", "-", "Visible heading; fallback aria-label when description is not set"],
            ["description", "string", "-", "Overrides the auto-generated aria-label with a detailed description"],
            ["summary", "string", "-", "Screen-reader-only note (role=\"note\") for trends or key takeaways"],
            ["accessibleTable", "boolean", "true", "Render a visually-hidden data table from the scene graph"],
          ].map(([prop, type, def, desc], i) => (
            <tr key={i} style={{ borderBottom: "1px solid var(--surface-3)" }}>
              <td style={{ padding: "8px 12px" }}><code>{prop}</code></td>
              <td style={{ padding: "8px 12px", fontSize: 12, fontFamily: "var(--font-mono)" }}>{type}</td>
              <td style={{ padding: "8px 12px" }}><code>{def}</code></td>
              <td style={{ padding: "8px 12px" }}>{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ----------------------------------------------------------------- */}
      {/* Limitations */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="limitations">Current Limitations</h2>

      <ul>
        <li>
          <strong>No per-element ARIA</strong> — individual bars, points, and
          line segments in the canvas do not have ARIA labels. The SVG overlay
          provides labels for text elements, and the data table provides a
          complete non-visual alternative.
        </li>
        <li>
          <strong>Brush/selection is mouse-only</strong> — LinkedCharts brush
          interactions and ScatterplotMatrix crossfilter do not yet have keyboard
          equivalents.
        </li>
        <li>
          <strong>Streaming charts</strong> — realtime charts continuously
          update their scene graph. Keyboard navigation works but the point
          list refreshes as new data arrives.
        </li>
        <li>
          <strong>Touch navigation</strong> — swipe gestures are not yet mapped
          to the navigation graph. Touch users can use the data table.
        </li>
      </ul>

      {/* ----------------------------------------------------------------- */}
      {/* Testing */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="testing">Testing Accessibility</h2>

      <ul>
        <li>
          <strong>Screen readers</strong>:{" "}
          <a href="https://webaim.org/articles/voiceover/" target="_blank" rel="noopener noreferrer">VoiceOver (Mac)</a>,{" "}
          <a href="https://webaim.org/articles/nvda/" target="_blank" rel="noopener noreferrer">NVDA (Windows)</a>
        </li>
        <li>
          <strong>Audit tools</strong>:{" "}
          aXe, Firefox Accessibility Inspector, Lighthouse
        </li>
        <li>
          <strong>Semiotic tools</strong>:{" "}
          <code>diagnoseConfig()</code> for static analysis,{" "}
          <code>npx semiotic-ai --doctor</code> for CLI validation
        </li>
        <li>
          <strong>Standards</strong>:{" "}
          <a href="https://www.w3.org/WAI/standards-guidelines/wcag/" target="_blank" rel="noopener noreferrer">WCAG 2.1</a>,{" "}
          <a href="https://chartability.github.io/POUR-CAF/" target="_blank" rel="noopener noreferrer">Chartability</a>,{" "}
          <a href="https://webaim.org/standards/wcag/checklist" target="_blank" rel="noopener noreferrer">WebAIM checklist</a>
        </li>
      </ul>

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/features/tooltips">Tooltips</Link> — custom tooltip
          rendering with accessible markup
        </li>
        <li>
          <Link to="/features/theming">Theming</Link> — dark mode, high-contrast,
          and color-blind safe themes
        </li>
        <li>
          <Link to="/features/realtime-encoding">Realtime Encoding</Link> —
          pulse and decay animation settings (respects reduced-motion)
        </li>
      </ul>
    </PageLayout>
  )
}
